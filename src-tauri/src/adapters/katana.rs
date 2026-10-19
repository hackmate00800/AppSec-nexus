use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity};
use chrono::Utc;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;

pub struct KatanaAdapter {
    bin_dir: PathBuf,
}

impl KatanaAdapter {
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
            self.bin_dir.join("katana.exe"),
            self.bin_dir.join("katana"),
            PathBuf::from(r"tools\bin\katana.exe"),
            PathBuf::from("/usr/local/bin/katana"),
            PathBuf::from("/usr/bin/katana"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("katana.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("katana");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for KatanaAdapter {
    fn id(&self) -> &str {
        "katana"
    }

    fn name(&self) -> &str {
        "ProjectDiscovery Katana Crawler"
    }

    fn default_version(&self) -> &str {
        "1.8.0"
    }

    fn category(&self) -> &str {
        "Web Crawling & Endpoint Discovery"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::Crawling,
            ToolCapability::HttpProbing,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Next-generation crawling and spidering framework. Discovers endpoints, parameters, API routes, and hidden assets across modern web and single-page applications."
    }

    fn documentation_url(&self) -> &str {
        "https://docs.projectdiscovery.io/tools/katana"
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
                        message: "Katana executable was not found in tools/bin or system PATH.".to_string(),
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
                        .find(|l| l.to_lowercase().contains("version") || l.contains("v1"))
                        .unwrap_or("Katana v1.8.0")
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
            let exe_path = exe.ok_or_else(|| "Katana binary not found".to_string())?;

            let depth = input.parameters.get("depth").cloned().unwrap_or_else(|| "2".to_string());
            let concurrency = input.parameters.get("concurrency").cloned().unwrap_or_else(|| "10".to_string());

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "-u",
                &input.target_url,
                "-depth",
                &depth,
                "-concurrency",
                &concurrency,
                "-silent",
                "-jsonl",
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Katana: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut endpoints = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] Katana crawling target: {}", input.target_url));

            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    let ep_url = val["request"]["endpoint"]
                        .as_str()
                        .or_else(|| val["endpoint"].as_str())
                        .unwrap_or(trimmed);
                    let method = val["request"]["method"].as_str().unwrap_or("GET");
                    let status = val["response"]["status_code"].as_u64().unwrap_or(200) as u16;

                    endpoints.push(DiscoveredEndpoint {
                        id: uuid::Uuid::new_v4().to_string(),
                        target_id: input.target_id.clone(),
                        url: ep_url.to_string(),
                        method: method.to_string(),
                        status_code: status,
                        content_type: None,
                        source: "katana".to_string(),
                        discovered_at: Utc::now().to_rfc3339(),
                    });

                    // Flag potential sensitive paths
                    let lower = ep_url.to_lowercase();
                    if lower.contains("/admin")
                        || lower.contains("/api/v")
                        || lower.contains("/.env")
                        || lower.contains("/config")
                        || lower.contains("/actuator")
                    {
                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("Potentially Sensitive Endpoint Discovered: {}", ep_url),
                            FindingSeverity::Low,
                            75,
                            ep_url.to_string(),
                            format!("Katana crawler discovered interesting endpoint with HTTP status {}.", status),
                            "katana".to_string(),
                            "1.8.0".to_string(),
                            Some("CWE-200".to_string()),
                            "Review endpoint authorization and ensure sensitive administrative paths are restricted.".to_string(),
                        ));
                    }
                } else if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
                    endpoints.push(DiscoveredEndpoint {
                        id: uuid::Uuid::new_v4().to_string(),
                        target_id: input.target_id.clone(),
                        url: trimmed.to_string(),
                        method: "GET".to_string(),
                        status_code: 200,
                        content_type: None,
                        source: "katana".to_string(),
                        discovered_at: Utc::now().to_rfc3339(),
                    });
                }
            }

            logs.push(format!("[+] Katana discovered {} endpoint(s).", endpoints.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("endpoints_discovered".to_string(), endpoints.len().to_string());

            Ok(AdapterOutput {
                tool_id: "katana".to_string(),
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
