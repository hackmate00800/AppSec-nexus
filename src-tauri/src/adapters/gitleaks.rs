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

pub struct GitleaksAdapter;

impl GitleaksAdapter {
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

        let mut candidates = vec![
            PathBuf::from(r"tools\bin\gitleaks.exe"),
            PathBuf::from(r"tools\bin\gitleaks"),
        ];

        // WinGet package location
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let winget_dir = PathBuf::from(&local_appdata).join(r"Microsoft\WinGet\Packages");
            if winget_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(&winget_dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.starts_with("Gitleaks.Gitleaks") {
                            candidates.push(entry.path().join("gitleaks.exe"));
                        }
                    }
                }
            }
            candidates.push(PathBuf::from(&local_appdata).join(r"Microsoft\WinGet\Links\gitleaks.exe"));
        }

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("gitleaks.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("gitleaks");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for GitleaksAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for GitleaksAdapter {
    fn id(&self) -> &str {
        "gitleaks"
    }

    fn name(&self) -> &str {
        "Gitleaks Secret Scanner"
    }

    fn default_version(&self) -> &str {
        "8.30.1"
    }

    fn category(&self) -> &str {
        "Secrets & Credential Detection"
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
        "High-performance secret scanner for Git repositories, directories, and files. Detects hardcoded passwords, API tokens, private keys, and cloud credentials before they leak."
    }

    fn documentation_url(&self) -> &str {
        "https://github.com/gitleaks/gitleaks"
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
                        message: "Gitleaks binary not found in WinGet or system PATH.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "Gitleaks binary not found".to_string())?;

            let scan_target = input
                .parameters
                .get("scan_path")
                .cloned()
                .unwrap_or_else(|| ".".to_string());

            let temp_report = std::env::temp_dir().join(format!("gitleaks_report_{}.json", uuid::Uuid::new_v4()));

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "detect",
                "--source",
                &scan_target,
                "--report-format",
                "json",
                "--report-path",
                &temp_report.to_string_lossy(),
                "--no-banner",
            ]);

            let _output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Gitleaks: {}", e))?;

            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] Gitleaks scanning source path: {}", scan_target));

            if temp_report.exists() {
                if let Ok(content) = tokio::fs::read_to_string(&temp_report).await {
                    if let Ok(items) = serde_json::from_str::<Vec<serde_json::Value>>(&content) {
                        for item in items {
                            let rule = item["RuleID"].as_str().unwrap_or("generic-secret").to_string();
                            let file = item["File"].as_str().unwrap_or("unknown").to_string();
                            let line = item["StartLine"].as_u64().unwrap_or(1);
                            let secret_preview = item["Match"].as_str().unwrap_or("<redacted>");

                            findings.push(Finding::new(
                                input.target_id.clone(),
                                format!("Hardcoded Secret Detected: {} in {}", rule, file),
                                FindingSeverity::High,
                                95,
                                format!("{}:{}", file, line),
                                format!("Rule: {}\nMatch: {}\nLine: {}", rule, secret_preview, line),
                                "gitleaks".to_string(),
                                "8.30.1".to_string(),
                                Some("CWE-798".to_string()),
                                "Revoke the exposed secret immediately, rotate credentials, and store secrets in an environment variable or vault.".to_string(),
                            ));
                        }
                    }
                }
                let _ = tokio::fs::remove_file(&temp_report).await;
            }

            logs.push(format!("[+] Gitleaks completed. Identified {} secret(s).", findings.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("secrets_found".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "gitleaks".to_string(),
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
