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

pub struct SemgrepAdapter;

impl SemgrepAdapter {
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

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("semgrep.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("semgrep");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for SemgrepAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for SemgrepAdapter {
    fn id(&self) -> &str {
        "semgrep"
    }

    fn name(&self) -> &str {
        "Semgrep SAST Code Analyzer"
    }

    fn default_version(&self) -> &str {
        "1.90.0"
    }

    fn category(&self) -> &str {
        "Static Application Security Testing"
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
        "Fast, open-source static analysis engine for finding security bugs, hardcoded secrets, and enforcing code standards in Web and API source repositories."
    }

    fn documentation_url(&self) -> &str {
        "https://semgrep.dev/docs/"
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
                        message: "Semgrep binary is not currently installed on host. Install via `pip install semgrep` or configure custom path.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("--version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("Semgrep detected").trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "Semgrep binary not found".to_string())?;

            let scan_target = input
                .parameters
                .get("scan_path")
                .cloned()
                .unwrap_or_else(|| ".".to_string());

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "scan",
                "--config",
                "auto",
                "--json",
                "--quiet",
                &scan_target,
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Semgrep process: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] Semgrep scanning target path: {}", scan_target));

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(results) = val["results"].as_array() {
                    for r in results {
                        let check_id = r["check_id"].as_str().unwrap_or("semgrep-rule").to_string();
                        let path = r["path"].as_str().unwrap_or(&scan_target).to_string();
                        let message = r["extra"]["message"].as_str().unwrap_or("").to_string();
                        let sev_str = r["extra"]["severity"].as_str().unwrap_or("INFO");
                        let severity = match sev_str.to_uppercase().as_str() {
                            "ERROR" => FindingSeverity::High,
                            "WARNING" => FindingSeverity::Medium,
                            _ => FindingSeverity::Low,
                        };
                        let cwe = r["extra"]["metadata"]["cwe"][0].as_str().map(|s| s.to_string());

                        findings.push(Finding::new(
                            input.target_id.clone(),
                            check_id,
                            severity,
                            95,
                            path,
                            message,
                            "semgrep".to_string(),
                            "1.90.0".to_string(),
                            cwe,
                            "Refactor code to remediate SAST detection.".to_string(),
                        ));
                    }
                }
            }

            logs.push(format!("[+] Semgrep completed with {} findings.", findings.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "semgrep".to_string(),
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
