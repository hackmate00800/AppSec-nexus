use crate::models::{Finding, FindingSeverity, ScanResult, ToolInfo};
use regex::Regex;
use std::path::PathBuf;
use std::time::Instant;
use tokio::process::Command;
use uuid::Uuid;

pub struct ToolManager {
    bin_dir: PathBuf,
}

impl ToolManager {
    pub fn new(bin_dir: PathBuf) -> Self {
        Self { bin_dir }
    }

    pub fn find_tool_executable(&self, base_name: &str) -> Option<PathBuf> {
        let candidates = [
            self.bin_dir.join(base_name),
            self.bin_dir.join(format!("{}.exe", base_name)),
            PathBuf::from(format!("/usr/local/bin/{}", base_name)),
            PathBuf::from(format!("/usr/bin/{}", base_name)),
            PathBuf::from(format!("/bin/{}", base_name)),
        ];
        for candidate in &candidates {
            if candidate.exists() {
                return Some(candidate.clone());
            }
        }
        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join(base_name);
                if direct.exists() {
                    return Some(direct);
                }
                #[cfg(target_os = "windows")]
                {
                    let with_exe = dir.join(format!("{}.exe", base_name));
                    if with_exe.exists() {
                        return Some(with_exe);
                    }
                }
            }
        }
        None
    }

    pub fn get_available_tools(&self) -> Vec<ToolInfo> {
        let mut list = Vec::new();

        // 1. First-Party Baseline Scanner
        list.push(ToolInfo {
            id: "baseline".to_string(),
            name: "Native Baseline Security Checks".to_string(),
            version: "1.0.0".to_string(),
            category: "Passive / Headers / Cookies".to_string(),
            is_available: true,
            path: "internal://rust".to_string(),
            description: "Built-in Rust scanner checking CSP, CORS, HSTS, cookie flags, and robots.txt."
                .to_string(),
        });

        // 2. Nuclei
        let nuclei_path = self.find_tool_executable("nuclei");
        list.push(ToolInfo {
            id: "nuclei".to_string(),
            name: "ProjectDiscovery Nuclei".to_string(),
            version: "3.11.1".to_string(),
            category: "Vulnerability Scanner".to_string(),
            is_available: nuclei_path.is_some(),
            path: nuclei_path.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| "nuclei".to_string()),
            description: "Fast template-based vulnerability scanner for CVEs, exposures, and misconfigurations."
                .to_string(),
        });

        // 3. httpx
        let httpx_path = self.find_tool_executable("httpx");
        list.push(ToolInfo {
            id: "httpx".to_string(),
            name: "ProjectDiscovery httpx".to_string(),
            version: "1.12.0".to_string(),
            category: "Service & Tech Prober".to_string(),
            is_available: httpx_path.is_some(),
            path: httpx_path.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| "httpx".to_string()),
            description: "Fast multi-purpose HTTP prober for service reachability, TLS, and tech detection."
                .to_string(),
        });

        // 4. Nmap
        let nmap_path = self.find_nmap_path();
        list.push(ToolInfo {
            id: "nmap".to_string(),
            name: "Nmap Network Scanner".to_string(),
            version: "7.92".to_string(),
            category: "Port & Service Discovery".to_string(),
            is_available: nmap_path.is_some(),
            path: nmap_path.unwrap_or_default(),
            description: "Network discovery and service version audit for open ports."
                .to_string(),
        });

        // 5. Ollama Local AI Engine
        let ollama_path = Self::find_ollama_path();
        list.push(ToolInfo {
            id: "ollama".to_string(),
            name: "Ollama Local AI Engine".to_string(),
            version: "0.5.12".to_string(),
            category: "Local LLM / Privacy AI".to_string(),
            is_available: ollama_path.is_some(),
            path: ollama_path.unwrap_or_else(|| "ollama".to_string()),
            description: "Offline privacy-first AI runtime for vulnerability explanation and remediation without cloud leaks."
                .to_string(),
        });

        list
    }

    fn find_ollama_path() -> Option<String> {
        // 1. Check WinGet package path
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let winget_path = PathBuf::from(&local_appdata)
                .join("Microsoft")
                .join("WinGet")
                .join("Packages");
            if winget_path.exists() {
                if let Ok(entries) = std::fs::read_dir(&winget_path) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.contains("Ollama") {
                            let exe = entry.path().join("ollama.exe");
                            if exe.exists() {
                                return Some(exe.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
        // 2. Check standard Linux/Unix binary paths
        let unix_candidates = [
            PathBuf::from("/usr/local/bin/ollama"),
            PathBuf::from("/usr/bin/ollama"),
            PathBuf::from("/bin/ollama"),
        ];
        for candidate in &unix_candidates {
            if candidate.exists() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
        // 3. Check PATH environment
        if let Ok(path) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path) {
                let candidate = dir.join("ollama");
                if candidate.exists() {
                    return Some(candidate.to_string_lossy().to_string());
                }
                #[cfg(target_os = "windows")]
                {
                    let cand_exe = dir.join("ollama.exe");
                    if cand_exe.exists() {
                        return Some(cand_exe.to_string_lossy().to_string());
                    }
                }
            }
        }
        // 4. Check active Ollama server TCP port 11434
        if std::net::TcpStream::connect_timeout(
            &std::net::SocketAddr::from(([127, 0, 0, 1], 11434)),
            std::time::Duration::from_millis(300),
        ).is_ok() {
            return Some("http://127.0.0.1:11434 (Active Server)".to_string());
        }
        None
    }

    fn find_nmap_path(&self) -> Option<String> {
        if let Some(p) = self.find_tool_executable("nmap") {
            return Some(p.to_string_lossy().to_string());
        }
        let candidates = [
            self.bin_dir.join("nmap").join("nmap-7.92").join("nmap.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Nmap\nmap.exe"),
            PathBuf::from(r"C:\Program Files\Nmap\nmap.exe"),
            PathBuf::from("/usr/bin/nmap"),
            PathBuf::from("/usr/local/bin/nmap"),
        ];
        for candidate in &candidates {
            if candidate.exists() {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
        None
    }

    pub fn sanitize_log(input: &str) -> String {
        let auth_regex =
            Regex::new(r"(?i)(authorization:\s*bearer\s+|token=)[a-zA-Z0-9_\-\.]{8,}").unwrap();
        let cookie_regex =
            Regex::new(r"(?i)(cookie:\s*.*?(?:session|token|auth)=)[^;\s]+").unwrap();

        let s1 = auth_regex.replace_all(input, "$1***REDACTED***");
        let s2 = cookie_regex.replace_all(&s1, "$1***REDACTED***");
        s2.to_string()
    }

    pub async fn run_httpx(&self, target_url: &str) -> Result<ScanResult, String> {
        let start = Instant::now();
        let httpx_path = self
            .find_tool_executable("httpx")
            .ok_or_else(|| "httpx binary not found in tools/bin or system PATH".to_string())?;

        let output = Command::new(&httpx_path)
            .args(&[
                "-u",
                target_url,
                "-status-code",
                "-title",
                "-tech-detect",
                "-no-color",
            ])
            .output()
            .await
            .map_err(|e| format!("Failed to execute httpx: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        let mut logs = Vec::new();
        for line in stdout.lines() {
            if !line.trim().is_empty() {
                logs.push(Self::sanitize_log(line));
            }
        }
        for line in stderr.lines() {
            if !line.trim().is_empty() {
                logs.push(Self::sanitize_log(line));
            }
        }

        Ok(ScanResult {
            scan_id: Uuid::new_v4().to_string(),
            target_url: target_url.to_string(),
            tool: "httpx".to_string(),
            status: "Completed".to_string(),
            logs,
            findings_count: 0,
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    pub async fn run_nuclei(
        &self,
        target_id: &str,
        target_url: &str,
    ) -> Result<(ScanResult, Vec<Finding>), String> {
        let start = Instant::now();
        let nuclei_path = self
            .find_tool_executable("nuclei")
            .ok_or_else(|| "nuclei binary not found in tools/bin or system PATH".to_string())?;

        // Run with safe tags by default (misconfig, exposure, info)
        let output = Command::new(&nuclei_path)
            .args(&[
                "-u",
                target_url,
                "-tags",
                "misconfig,exposure,ssl,tech",
                "-jsonl",
                "-no-color",
                "-rate-limit",
                "50",
            ])
            .output()
            .await
            .map_err(|e| format!("Failed to execute nuclei: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut logs = Vec::new();
        let mut findings = Vec::new();

        for line in stdout.lines() {
            if line.trim().starts_with('{') {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                    let title = val["info"]["name"]
                        .as_str()
                        .unwrap_or("Nuclei Detection")
                        .to_string();
                    let sev_str = val["info"]["severity"].as_str().unwrap_or("info");
                    let severity = match sev_str.to_lowercase().as_str() {
                        "critical" => FindingSeverity::Critical,
                        "high" => FindingSeverity::High,
                        "medium" => FindingSeverity::Medium,
                        "low" => FindingSeverity::Low,
                        _ => FindingSeverity::Info,
                    };
                    let matched = val["matched-at"].as_str().unwrap_or(target_url).to_string();
                    let desc = val["info"]["description"].as_str().unwrap_or("");
                    let cwe = val["info"]["classification"]["cwe-id"][0]
                        .as_str()
                        .map(|s| s.to_string());

                    findings.push(Finding::new(
                        target_id.to_string(),
                        title,
                        severity,
                        90,
                        matched,
                        format!("Nuclei template match. {}", desc),
                        "Nuclei".to_string(),
                        "3.11.1".to_string(),
                        cwe,
                        "Review template match and apply vendor patch or configuration fix.".to_string(),
                    ));
                }
            }
            logs.push(Self::sanitize_log(line));
        }

        Ok((
            ScanResult {
                scan_id: Uuid::new_v4().to_string(),
                target_url: target_url.to_string(),
                tool: "Nuclei".to_string(),
                status: "Completed".to_string(),
                logs,
                findings_count: findings.len(),
                duration_ms: start.elapsed().as_millis() as u64,
            },
            findings,
        ))
    }

    pub async fn run_nmap(
        &self,
        target_id: &str,
        target_host: &str,
    ) -> Result<(ScanResult, Vec<Finding>), String> {
        let start = Instant::now();
        let nmap_path = self
            .find_nmap_path()
            .ok_or_else(|| "Nmap binary not found in tools/bin".to_string())?;

        // Extract host if full URL passed
        let host = if let Ok(parsed) = url::Url::parse(target_host) {
            parsed.host_str().unwrap_or(target_host).to_string()
        } else {
            target_host.to_string()
        };

        let output = Command::new(&nmap_path)
            .args(&["-sV", "-T4", "-F", "-Pn", &host])
            .output()
            .await
            .map_err(|e| format!("Failed to execute nmap: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut logs = Vec::new();
        let mut findings = Vec::new();

        let port_line_regex = Regex::new(r"^(\d+)/(tcp|udp)\s+(\w+)\s+(.*)$").unwrap();

        for line in stdout.lines() {
            let sanitized = Self::sanitize_log(line);
            if let Some(caps) = port_line_regex.captures(line.trim()) {
                let port = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                let proto = caps.get(2).map(|m| m.as_str()).unwrap_or("");
                let state = caps.get(3).map(|m| m.as_str()).unwrap_or("");
                let service = caps.get(4).map(|m| m.as_str()).unwrap_or("");

                if state == "open" {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        format!("Open Network Port: {}/{} ({})", port, proto, service),
                        if port == "21" || port == "23" || port == "445" || port == "3389" {
                            FindingSeverity::Medium
                        } else {
                            FindingSeverity::Info
                        },
                        100,
                        format!("{}:{}", host, port),
                        format!("Nmap detected open service: {}/{} is {} running {}", port, proto, state, service),
                        "Nmap".to_string(),
                        "7.92".to_string(),
                        Some("CWE-200".to_string()),
                        "Close unneeded network ports or restrict access with firewall rules.".to_string(),
                    ));
                }
            }
            logs.push(sanitized);
        }

        Ok((
            ScanResult {
                scan_id: Uuid::new_v4().to_string(),
                target_url: target_host.to_string(),
                tool: "Nmap".to_string(),
                status: "Completed".to_string(),
                logs,
                findings_count: findings.len(),
                duration_ms: start.elapsed().as_millis() as u64,
            },
            findings,
        ))
    }
}
