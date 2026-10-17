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

    fn extract_hostname(raw_url: &str) -> String {
        if let Ok(parsed) = Url::parse(raw_url) {
            if let Some(host) = parsed.host_str() {
                return host.to_string();
            }
        }
        let stripped = raw_url
            .trim_start_matches("http://")
            .trim_start_matches("https://");
        stripped.split('/').next().unwrap_or(raw_url).split(':').next().unwrap_or(raw_url).to_string()
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
        ]
    }

    fn description(&self) -> &str {
        "Network discovery and service vulnerability auditing tool. Discovers open ports, running services, protocol versions, and defensive perimeter posture."
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
                        message: "Nmap executable was not found on host.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

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
                        message: format!("Binary verified at: {}", exe_path.display()),
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
                .unwrap_or_else(|| "80,443,8080,8443,3000,5000,8000,9000".to_string());

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "-sT",
                "-Pn",
                "-p",
                &ports,
                "--open",
                "-T4",
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

            let port_regex = Regex::new(r"(\d+)/(tcp|udp)\s+open\s+(\S+)").unwrap();

            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if let Some(caps) = port_regex.captures(trimmed) {
                    let port_str = caps.get(1).map_or("", |m| m.as_str());
                    let proto = caps.get(2).map_or("", |m| m.as_str());
                    let service = caps.get(3).map_or("", |m| m.as_str());
                    let port_num = port_str.parse::<u16>().unwrap_or(0);

                    open_ports.push(port_str.to_string());
                    logs.push(format!("[+] Open Port Detected: {}:{}/{} ({})", hostname, port_num, proto, service));

                    let scheme = if port_num == 443 || port_num == 8443 { "https" } else { "http" };
                    let url = format!("{}://{}:{}", scheme, hostname, port_num);

                    endpoints.push(DiscoveredEndpoint {
                        id: Uuid::new_v4().to_string(),
                        target_id: input.target_id.clone(),
                        url: url.clone(),
                        method: "TCP".to_string(),
                        status_code: 200,
                        content_type: Some(service.to_string()),
                        source: "nmap".to_string(),
                        discovered_at: Utc::now().to_rfc3339(),
                    });

                    if port_num == 80 || port_num == 8080 {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("Cleartext HTTP Service on Port {}", port_num),
                            FindingSeverity::Low,
                            95,
                            url,
                            format!("Nmap probe verified open plaintext service: {}", trimmed),
                            "nmap".to_string(),
                            "7.92".to_string(),
                            Some("CWE-319".to_string()),
                            "Enforce TLS 1.3 encryption and redirect all unencrypted traffic to HTTPS.".to_string(),
                        ));
                    }
                } else {
                    logs.push(trimmed.to_string());
                }
            }

            for line in stderr.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    logs.push(format!("[nmap] {}", trimmed));
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("open_ports".to_string(), open_ports.join(", "));
            artifacts.insert("open_ports_count".to_string(), open_ports.len().to_string());
            artifacts.insert("scanned_host".to_string(), hostname);

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
