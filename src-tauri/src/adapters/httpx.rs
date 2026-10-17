use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::DiscoveredEndpoint;
use chrono::Utc;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;
use uuid::Uuid;

pub struct HttpxAdapter {
    bin_dir: PathBuf,
}

impl HttpxAdapter {
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
            self.bin_dir.join("httpx.exe"),
            self.bin_dir.join("httpx"),
            PathBuf::from(r"tools\bin\httpx.exe"),
            PathBuf::from("/usr/local/bin/httpx"),
            PathBuf::from("/usr/bin/httpx"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("httpx.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("httpx");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for HttpxAdapter {
    fn id(&self) -> &str {
        "httpx"
    }

    fn name(&self) -> &str {
        "ProjectDiscovery httpx"
    }

    fn default_version(&self) -> &str {
        "1.12.0"
    }

    fn category(&self) -> &str {
        "Service & Tech Prober"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::HttpProbing,
            ToolCapability::TechDetection,
            ToolCapability::DnsDiscovery,
            ToolCapability::PassiveAudit,
        ]
    }

    fn description(&self) -> &str {
        "Fast and versatile HTTP toolkit that allows running multiple probes. Automatically analyzes status codes, titles, web servers, tech stacks, and redirect chains."
    }

    fn documentation_url(&self) -> &str {
        "https://docs.projectdiscovery.io/tools/httpx"
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
                        message: "httpx executable was not found in tools/bin, custom path, or system PATH.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("-version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string()
                        + &String::from_utf8_lossy(&output.stderr);
                    let version_line = out_str
                        .lines()
                        .find(|l| l.to_lowercase().contains("httpx") || l.contains("v1"))
                        .unwrap_or("httpx v1.x detected")
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
            let exe_path = exe.ok_or_else(|| "httpx executable not found".to_string())?;

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "-u",
                &input.target_url,
                "-status-code",
                "-title",
                "-tech-detect",
                "-web-server",
                "-json",
                "-no-color",
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch httpx process: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            let mut logs = Vec::new();
            let mut endpoints = Vec::new();
            let mut artifacts = HashMap::new();

            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if trimmed.starts_with('{') {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                        let url = val["url"].as_str().unwrap_or(&input.target_url).to_string();
                        let status_code = val["status_code"].as_u64().unwrap_or(200) as u16;
                        let title = val["title"].as_str().unwrap_or("").to_string();
                        let webserver = val["webserver"].as_str().unwrap_or("").to_string();
                        let content_type = val["content_type"].as_str().map(|s| s.to_string());

                        let techs = val["tech"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|t| t.as_str())
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            })
                            .unwrap_or_default();

                        logs.push(format!(
                            "[+] Probed: {} | Status: {} | Server: {} | Tech: [{}]",
                            url, status_code, webserver, techs
                        ));

                        endpoints.push(DiscoveredEndpoint {
                            id: Uuid::new_v4().to_string(),
                            target_id: input.target_id.clone(),
                            url: url.clone(),
                            method: "GET".to_string(),
                            status_code,
                            content_type,
                            source: "httpx".to_string(),
                            discovered_at: Utc::now().to_rfc3339(),
                        });

                        artifacts.insert("status_code".to_string(), status_code.to_string());
                        artifacts.insert("title".to_string(), title);
                        artifacts.insert("webserver".to_string(), webserver);
                        artifacts.insert("tech_stack".to_string(), techs);
                        artifacts.insert("active_url".to_string(), url);
                        continue;
                    }
                }

                logs.push(trimmed.to_string());
            }

            for line in stderr.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    logs.push(format!("[httpx] {}", trimmed));
                }
            }

            artifacts.insert("endpoints_discovered".to_string(), endpoints.len().to_string());

            Ok(AdapterOutput {
                tool_id: "httpx".to_string(),
                target_url: input.target_url,
                status: "Success".to_string(),
                logs,
                findings: Vec::new(),
                endpoints,
                artifacts,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
