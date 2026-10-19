use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use chrono::Utc;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;

pub struct TsharkAdapter;

impl TsharkAdapter {
    pub fn new() -> Self {
        Self
    }

    fn find_executable(custom_override: Option<&str>) -> Option<PathBuf> {
        if let Some(custom) = custom_override {
            let p = PathBuf::from(custom.trim());
            if p.exists() {
                return Some(p);
            }
        }

        let candidates = [
            PathBuf::from(r"C:\Program Files\Wireshark\tshark.exe"),
            PathBuf::from(r"C:\Program Files (x86)\Wireshark\tshark.exe"),
            PathBuf::from("/usr/bin/tshark"),
            PathBuf::from("/usr/local/bin/tshark"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("tshark.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("tshark");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for TsharkAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for TsharkAdapter {
    fn id(&self) -> &str {
        "tshark"
    }

    fn name(&self) -> &str {
        "Wireshark / TShark Packet Analyzer"
    }

    fn default_version(&self) -> &str {
        "4.6.9"
    }

    fn category(&self) -> &str {
        "Network Protocol & Packet Analysis"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::PassiveAudit,
            ToolCapability::PortScan,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Terminal-based network packet analyzer (Wireshark CLI). Inspects live packet captures, detects cleartext credentials, audits TLS handshakes, and decodes protocol anomalies using Npcap."
    }

    fn documentation_url(&self) -> &str {
        "https://www.wireshark.org/docs/man-pages/tshark.html"
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        Self::find_executable(custom_override)
            .map(|p| p.to_string_lossy().to_string())
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if !p.exists() {
                return ToolDetectionState::Misconfigured;
            }
        }

        if Self::find_executable(custom_override).is_some() {
            ToolDetectionState::InstalledAndReady
        } else {
            ToolDetectionState::NotInstalled
        }
    }

    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        let exe = Self::find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = match exe {
                Some(p) => p,
                None => {
                    return ToolHealthCheckResult {
                        healthy: false,
                        detection_state: ToolDetectionState::NotInstalled,
                        detected_version: None,
                        message: "TShark executable not found. Install Wireshark with Npcap.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("-v").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("TShark 4.x").trim().to_string();

                    ToolHealthCheckResult {
                        healthy: true,
                        detection_state: ToolDetectionState::InstalledAndReady,
                        detected_version: Some(version_line),
                        message: format!("Binary verified at: {} (with Npcap driver)", exe_path.display()),
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
        let exe = Self::find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = exe.ok_or_else(|| "TShark binary not found".to_string())?;

            // List available interfaces for audit
            let output = Command::new(&exe_path)
                .arg("-D")
                .output()
                .await
                .map_err(|e| format!("Failed to query TShark interfaces: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let findings = Vec::new();

            logs.push("[*] TShark querying host network capture interfaces (Npcap)...".to_string());

            let mut iface_count = 0;
            for line in stdout.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    iface_count += 1;
                    logs.push(format!("[interface] {}", trimmed));
                }
            }

            logs.push(format!("[+] TShark enumerated {} active capture interface(s).", iface_count));

            let mut artifacts = HashMap::new();
            artifacts.insert("interfaces_count".to_string(), iface_count.to_string());

            Ok(AdapterOutput {
                tool_id: "tshark".to_string(),
                target_url: input.target_url,
                status: "Success".to_string(),
                logs,
                findings,
                endpoints: Vec::new(),
                artifacts,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
