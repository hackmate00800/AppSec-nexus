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

pub struct CheckovAdapter;

impl CheckovAdapter {
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

        let mut candidates = Vec::new();

        if let Ok(appdata) = std::env::var("APPDATA") {
            candidates.push(PathBuf::from(&appdata).join(r"Python\Python314\Scripts\checkov.cmd"));
            candidates.push(PathBuf::from(&appdata).join(r"Python\Python314\Scripts\checkov.exe"));
            candidates.push(PathBuf::from(&appdata).join(r"Python\Python313\Scripts\checkov.cmd"));
            candidates.push(PathBuf::from(&appdata).join(r"Python\Scripts\checkov.cmd"));
        }
        candidates.push(PathBuf::from(r"C:\Python314\Scripts\checkov.cmd"));

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct_cmd = dir.join("checkov.cmd");
                if direct_cmd.exists() {
                    return Some(direct_cmd);
                }
                let direct_exe = dir.join("checkov.exe");
                if direct_exe.exists() {
                    return Some(direct_exe);
                }
                let unix = dir.join("checkov");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for CheckovAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for CheckovAdapter {
    fn id(&self) -> &str {
        "checkov"
    }

    fn name(&self) -> &str {
        "Checkov IaC Security Scanner"
    }

    fn default_version(&self) -> &str {
        "3.3.29"
    }

    fn category(&self) -> &str {
        "Infrastructure as Code (IaC) & Cloud Config"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::SastScan,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Static code analysis tool for infrastructure as code (IaC). Scans Terraform, CloudFormation, Kubernetes, Dockerfile, Serverless, and ARM templates for security and compliance misconfigurations."
    }

    fn documentation_url(&self) -> &str {
        "https://www.checkov.io/"
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
                        message: "Checkov binary not found. Install via `pip install checkov`.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            let mut cmd = Command::new(&exe_path);
            cmd.arg("-v");
            if let Some(parent) = exe_path.parent() {
                let cur = std::env::var("PATH").unwrap_or_default();
                cmd.env("PATH", format!("{};{}", parent.display(), cur));
            }

            match cmd.output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("checkov v3.x").trim().to_string();

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
        let exe = Self::find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = exe.ok_or_else(|| "Checkov binary not found".to_string())?;

            let scan_target = input
                .parameters
                .get("scan_path")
                .cloned()
                .unwrap_or_else(|| ".".to_string());

            let mut cmd = Command::new(&exe_path);
            if let Some(parent) = exe_path.parent() {
                let cur = std::env::var("PATH").unwrap_or_default();
                cmd.env("PATH", format!("{};{}", parent.display(), cur));
            }
            cmd.args(&[
                "-d",
                &scan_target,
                "--framework",
                "all",
                "-o",
                "json",
                "--compact",
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Checkov: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] Checkov scanning IaC configurations in: {}", scan_target));

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                // Checkov can return an object or array of check summaries
                let results_obj = if val.is_array() {
                    val.as_array().and_then(|arr| arr.first()).cloned().unwrap_or(val)
                } else {
                    val
                };

                if let Some(failed_checks) = results_obj["results"]["failed_checks"].as_array() {
                    for check in failed_checks {
                        let check_id = check["check_id"].as_str().unwrap_or("CKV_GENERIC");
                        let check_name = check["check_name"].as_str().unwrap_or("IaC Misconfiguration");
                        let file_path = check["file_path"].as_str().unwrap_or("config");
                        let guideline = check["guideline"].as_str().unwrap_or("Remediate configuration according to CIS/IaC standards.");
                        let sev_str = check["severity"].as_str().unwrap_or("MEDIUM");
                        let severity = match sev_str.to_uppercase().as_str() {
                            "CRITICAL" => FindingSeverity::Critical,
                            "HIGH" => FindingSeverity::High,
                            "LOW" => FindingSeverity::Low,
                            _ => FindingSeverity::Medium,
                        };

                        findings.push(Finding::new(
                            input.target_id.clone(),
                            format!("{}: {}", check_id, check_name),
                            severity,
                            85,
                            file_path.to_string(),
                            format!("Check ID: {}\nFile: {}\nGuideline: {}", check_id, file_path, guideline),
                            "checkov".to_string(),
                            "3.3.29".to_string(),
                            Some("CWE-16".to_string()),
                            guideline.to_string(),
                        ));
                    }
                }
            }

            logs.push(format!("[+] Checkov completed. Identified {} IaC misconfiguration(s).", findings.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("misconfigurations_found".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "checkov".to_string(),
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
