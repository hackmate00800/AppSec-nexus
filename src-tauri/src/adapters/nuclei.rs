use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::{Finding, FindingSeverity};
use chrono::Utc;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;

pub struct NucleiAdapter {
    bin_dir: PathBuf,
}

impl NucleiAdapter {
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
            self.bin_dir.join("nuclei.exe"),
            self.bin_dir.join("nuclei"),
            PathBuf::from(r"tools\bin\nuclei.exe"),
            PathBuf::from("/usr/local/bin/nuclei"),
            PathBuf::from("/usr/bin/nuclei"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("nuclei.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("nuclei");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for NucleiAdapter {
    fn id(&self) -> &str {
        "nuclei"
    }

    fn name(&self) -> &str {
        "ProjectDiscovery Nuclei"
    }

    fn default_version(&self) -> &str {
        "3.11.1"
    }

    fn category(&self) -> &str {
        "Vulnerability Scanner"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::VulnScan,
            ToolCapability::TechDetection,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Fast, customizable vulnerability scanner powered by YAML DSL templates. Validates known CVEs, misconfigurations, default credentials, exposed panels, and SSL/TLS hygiene."
    }

    fn documentation_url(&self) -> &str {
        "https://docs.projectdiscovery.io/tools/nuclei"
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
                        message: "Nuclei executable was not found in tools/bin, custom path, or system PATH.".to_string(),
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
                        .find(|l| l.to_lowercase().contains("nuclei") || l.contains("v3"))
                        .unwrap_or("Nuclei v3.x detected")
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
            let exe_path = exe.ok_or_else(|| "Nuclei executable not found".to_string())?;

            let tags = input
                .parameters
                .get("tags")
                .cloned()
                .unwrap_or_else(|| "misconfig,exposure,ssl,tech".to_string());

            let rate_limit = input
                .parameters
                .get("rate_limit")
                .cloned()
                .unwrap_or_else(|| "50".to_string());

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "-u",
                &input.target_url,
                "-tags",
                &tags,
                "-jsonl",
                "-no-color",
                "-rate-limit",
                &rate_limit,
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Nuclei process: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            let mut logs = Vec::new();
            let mut findings = Vec::new();
            let mut critical_count = 0;
            let mut high_count = 0;
            let mut medium_count = 0;

            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }

                if trimmed.starts_with('{') {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                        let title = val["info"]["name"]
                            .as_str()
                            .unwrap_or("Nuclei Security Finding")
                            .to_string();

                        let sev_str = val["info"]["severity"].as_str().unwrap_or("info");
                        let severity = match sev_str.to_lowercase().as_str() {
                            "critical" => {
                                critical_count += 1;
                                FindingSeverity::Critical
                            }
                            "high" => {
                                high_count += 1;
                                FindingSeverity::High
                            }
                            "medium" => {
                                medium_count += 1;
                                FindingSeverity::Medium
                            }
                            "low" => FindingSeverity::Low,
                            _ => FindingSeverity::Info,
                        };

                        let matched_at = val["matched-at"]
                            .as_str()
                            .unwrap_or(&input.target_url)
                            .to_string();
                        let desc = val["info"]["description"].as_str().unwrap_or("");
                        let template_id = val["template-id"].as_str().unwrap_or("nuclei-template");
                        let extracted = val["extracted-results"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str())
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            })
                            .unwrap_or_default();

                        let evidence = format!(
                            "Template: {}\nMatched: {}\nDescription: {}\nExtracted: {}",
                            template_id, matched_at, desc, extracted
                        );

                        let cwe = val["info"]["classification"]["cwe-id"][0]
                            .as_str()
                            .map(|s| s.to_string());

                        let remediation = val["info"]["remediation"]
                            .as_str()
                            .unwrap_or(
                                "Review template findings and apply vendor-recommended security patch or configuration update."
                            )
                            .to_string();

                        let finding = Finding::new(
                            input.target_id.clone(),
                            title.clone(),
                            severity.clone(),
                            90,
                            matched_at,
                            evidence,
                            "nuclei".to_string(),
                            "3.11.1".to_string(),
                            cwe,
                            remediation,
                        );

                        logs.push(format!("[+] [{:?}] {}", severity, title));
                        findings.push(finding);
                        continue;
                    }
                }

                logs.push(trimmed.to_string());
            }

            for line in stderr.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    logs.push(format!("[nuclei] {}", trimmed));
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());
            artifacts.insert("critical_count".to_string(), critical_count.to_string());
            artifacts.insert("high_count".to_string(), high_count.to_string());
            artifacts.insert("medium_count".to_string(), medium_count.to_string());

            Ok(AdapterOutput {
                tool_id: "nuclei".to_string(),
                target_url: input.target_url,
                status: if output.status.success() {
                    "Success".to_string()
                } else {
                    "CompletedWithWarnings".to_string()
                },
                logs,
                findings,
                endpoints: Vec::new(),
                artifacts,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
