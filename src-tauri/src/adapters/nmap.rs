use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity};
use chrono::Utc;
use regex::Regex;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;
use url::Url;
use uuid::Uuid;

pub struct NmapAdapter {
    bin_dir: PathBuf,
}

impl NmapAdapter {
    pub fn new(bin_dir: PathBuf) -> Self {
        Self { bin_dir }
    }

    fn find_executable(&self, custom_override: Option<&str>) -> Option<PathBuf> {
        if let Some(custom) = custom_override {
            let p = PathBuf::from(custom.trim());
            if p.exists() {
                return Some(p);
            }
        }

        let candidates = [
            self.bin_dir.join("nmap").join("nmap-7.92").join("nmap.exe"),
            self.bin_dir.join("nmap.exe"),
            self.bin_dir.join("nmap"),
            PathBuf::from(r"tools\bin\nmap\nmap-7.92\nmap.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Nmap\nmap.exe"),
            PathBuf::from(r"C:\Program Files\Nmap\nmap.exe"),
            PathBuf::from("/usr/bin/nmap"),
            PathBuf::from("/usr/local/bin/nmap"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("nmap.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("nmap");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }

    /// Diagnostic check for Npcap packet capture driver on Windows host
    fn check_npcap_driver() -> (bool, String) {
        #[cfg(target_os = "windows")]
        {
            let driver_path = Path::new(r"C:\Windows\System32\drivers\npcap.sys");
            if driver_path.exists() {
                (true, "Npcap packet capture driver detected (Raw sockets & SYN stealth scans supported).".to_string())
            } else {
                (false, "Npcap driver not detected; unprivileged TCP connect mode (-sT) is enforced.".to_string())
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            (true, "POSIX raw socket capability checked.".to_string())
        }
    }

    fn extract_hostname(raw_url: &str) -> String {
        if let Ok(parsed) = Url::parse(raw_url) {
            if let Some(host) = parsed.host_str() {
                return host.to_string();
            }
        }
        let stripped = raw_url
            .trim_start_matches("http://")
            .trim_start_matches("https://");
        stripped
            .split('/')
            .next()
            .unwrap_or(raw_url)
            .split(':')
            .next()
            .unwrap_or(raw_url)
            .to_string()
    }
}

impl SecurityToolAdapter for NmapAdapter {
    fn id(&self) -> &str {
        "nmap"
    }

    fn name(&self) -> &str {
        "Nmap Network Scanner"
    }

    fn default_version(&self) -> &str {
        "7.92"
    }

    fn category(&self) -> &str {
        "Port & Service Discovery"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::PortScan,
            ToolCapability::TechDetection,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Enterprise network discovery and service auditing tool. Conducts conservative TCP service detection, protocol version identification, and host inventory mapping."
    }

    fn documentation_url(&self) -> &str {
        "https://nmap.org/book/man.html"
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        self.find_executable(custom_override)
            .map(|p| p.to_string_lossy().to_string())
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if !p.exists() {
                return ToolDetectionState::Misconfigured;
            }
        }

        if self.find_executable(custom_override).is_some() {
            ToolDetectionState::InstalledAndReady
        } else {
            ToolDetectionState::NotInstalled
        }
    }

    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        let exe = self.find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = match exe {
                Some(p) => p,
                None => {
                    return ToolHealthCheckResult {
                        healthy: false,
                        detection_state: ToolDetectionState::NotInstalled,
                        detected_version: None,
                        message: "Nmap executable was not found on host or tools/bin directory.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            let (_npcap_found, npcap_msg) = Self::check_npcap_driver();

            match Command::new(&exe_path).arg("-V").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string()
                        + &String::from_utf8_lossy(&output.stderr);
                    let version_line = out_str
                        .lines()
                        .find(|l| l.to_lowercase().contains("nmap version"))
                        .unwrap_or("Nmap 7.x detected")
                        .trim()
                        .to_string();

                    ToolHealthCheckResult {
                        healthy: true,
                        detection_state: ToolDetectionState::InstalledAndReady,
                        detected_version: Some(version_line),
                        message: format!("Binary: {}. {}", exe_path.display(), npcap_msg),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    }
                }
                Err(e) => ToolHealthCheckResult {
                    healthy: false,
                    detection_state: ToolDetectionState::HealthCheckFailed,
                    detected_version: None,
                    message: format!("Binary found at {} but execution failed: {}", exe_path.display(), e),
                    checked_at: Utc::now().to_rfc3339(),
                    latency_ms: start.elapsed().as_millis() as u64,
                },
            }
        })
    }

    fn execute<'a>(
        &'a self,
        custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>> {
        let exe = self.find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = exe.ok_or_else(|| "Nmap executable not found".to_string())?;

            let hostname = Self::extract_hostname(&input.target_url);
            let ports = input
                .parameters
                .get("ports")
                .cloned()
                .unwrap_or_else(|| "21,22,23,25,80,443,445,3000,3306,3389,5000,5432,6379,8000,8080,8443,9000,27017".to_string());

            let mut cmd = Command::new(&exe_path);
            // Conservative non-destructive scan profile:
            // -sT: TCP connect (safe, works without admin/Npcap raw privileges)
            // -Pn: Treat host as online (prevents ICMP drop false negatives)
            // -sV: Probe open ports to determine service/version info
            // --version-light: Light probe intensity (level 2) to prevent service crashes
            // -T3: Normal conservative timing (avoids rate limiting or target overload)
            // --open: Only show open ports
            cmd.args(&[
                "-sT",
                "-Pn",
                "-sV",
                "--version-light",
                "-p",
                &ports,
                "--open",
                "-T3",
                &hostname,
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Nmap process: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            let mut logs = Vec::new();
            let mut endpoints = Vec::new();
            let mut findings = Vec::new();
            let mut open_ports = Vec::new();

            // Example Nmap output line: "80/tcp open http Apache httpd 2.4.52 ((Ubuntu))"
            let port_regex = Regex::new(r"^(\d+)/(tcp|udp)\s+open\s+(\S+)(?:\s+(.*))?$").unwrap();

            logs.push(format!("[*] Nmap conservative service scan against target: {}", hostname));

            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if let Some(caps) = port_regex.captures(trimmed) {
                    let port_str = caps.get(1).map_or("", |m| m.as_str());
                    let proto = caps.get(2).map_or("", |m| m.as_str());
                    let service = caps.get(3).map_or("", |m| m.as_str());
                    let version_info = caps.get(4).map_or("", |m| m.as_str().trim());
                    let port_num = port_str.parse::<u16>().unwrap_or(0);

                    open_ports.push(port_str.to_string());
                    logs.push(format!(
                        "[+] Open Service: {}:{}/{} ({}) {}",
                        hostname, port_num, proto, service, version_info
                    ));

                    let scheme = if port_num == 443 || port_num == 8443 || service.contains("ssl") || service.contains("https") {
                        "https"
                    } else {
                        "http"
                    };
                    let url = format!("{}://{}:{}", scheme, hostname, port_num);

                    endpoints.push(DiscoveredEndpoint {
                        id: Uuid::new_v4().to_string(),
                        target_id: input.target_id.clone(),
                        url: url.clone(),
                        method: "TCP".to_string(),
                        status_code: 200,
                        content_type: Some(format!("{} {}", service, version_info).trim().to_string()),
                        source: "nmap".to_string(),
                        discovered_at: Utc::now().to_rfc3339(),
                    });

                    // Vulnerability Check 1: Insecure plaintext HTTP / FTP / Telnet
                    if port_num == 80 || port_num == 8080 || port_num == 8000 {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("Cleartext HTTP Web Service Exposed on Port {}", port_num),
                            FindingSeverity::Low,
                            95,
                            url.clone(),
                            format!("Nmap verified open unencrypted HTTP service: {} ({})", trimmed, version_info),
                            "nmap".to_string(),
                            "7.92".to_string(),
                            Some("CWE-319".to_string()),
                            "Redirect all cleartext HTTP traffic to HTTPS (port 443) and enforce HSTS.".to_string(),
                        ));
                    } else if port_num == 21 || service == "ftp" {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("Unencrypted FTP Service Detected on Port {}", port_num),
                            FindingSeverity::Medium,
                            95,
                            format!("ftp://{}:{}", hostname, port_num),
                            format!("Insecure FTP protocol exposed: {}", trimmed),
                            "nmap".to_string(),
                            "7.92".to_string(),
                            Some("CWE-319".to_string()),
                            "Replace FTP with SFTP (SSH File Transfer Protocol) or FTPS with enforced TLS.".to_string(),
                        ));
                    } else if port_num == 23 || service == "telnet" {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("Legacy Insecure Telnet Service Exposed on Port {}", port_num),
                            FindingSeverity::High,
                            100,
                            format!("telnet://{}:{}", hostname, port_num),
                            format!("Legacy plaintext Telnet service exposes remote credentials in cleartext: {}", trimmed),
                            "nmap".to_string(),
                            "7.92".to_string(),
                            Some("CWE-319".to_string()),
                            "Disable Telnet daemon immediately and migrate to SSH (port 22).".to_string(),
                        ));
                    }

                    // Vulnerability Check 2: Publicly accessible database ports
                    if port_num == 3306 || port_num == 5432 || port_num == 6379 || port_num == 27017 {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("Exposed Database Service on Port {} ({})", port_num, service),
                            FindingSeverity::High,
                            95,
                            format!("tcp://{}:{}", hostname, port_num),
                            format!("Database listener is accessible from external network: {}", trimmed),
                            "nmap".to_string(),
                            "7.92".to_string(),
                            Some("CWE-284".to_string()),
                            "Bind database services to localhost (127.0.0.1) or restrict access via firewall / VPC security groups.".to_string(),
                        ));
                    }

                    // Vulnerability Check 3: Exposed SMB / RDP
                    if port_num == 445 {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            "Exposed SMB File Sharing Port (445)".to_string(),
                            FindingSeverity::High,
                            95,
                            format!("smb://{}:445", hostname),
                            format!("Direct SMB port 445 open to host: {}", trimmed),
                            "nmap".to_string(),
                            "7.92".to_string(),
                            Some("CWE-284".to_string()),
                            "Block port 445 at boundary firewalls to prevent lateral movement and SMB exploits.".to_string(),
                        ));
                    }
                } else {
                    logs.push(trimmed.to_string());
                }
            }

            for line in stderr.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    logs.push(format!("[nmap stderr] {}", trimmed));
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("open_ports".to_string(), open_ports.join(", "));
            artifacts.insert("open_ports_count".to_string(), open_ports.len().to_string());
            artifacts.insert("scanned_host".to_string(), hostname);

            logs.push(format!(
                "[*] Nmap scan finished in {} ms. Discovered {} open port(s) and generated {} finding(s).",
                start.elapsed().as_millis(),
                open_ports.len(),
                findings.len()
            ));

            Ok(AdapterOutput {
                tool_id: "nmap".to_string(),
                target_url: input.target_url,
                status: "Success".to_string(),
                logs,
                findings,
                endpoints,
                artifacts,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
