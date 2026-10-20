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

pub struct SqlmapAdapter;

impl SqlmapAdapter {
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
                let direct = dir.join("sqlmap.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let py = dir.join("sqlmap.py");
                if py.exists() {
                    return Some(py);
                }
                let unix = dir.join("sqlmap");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for SqlmapAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for SqlmapAdapter {
    fn id(&self) -> &str {
        "sqlmap"
    }

    fn name(&self) -> &str {
        "sqlmap Injection Auditor"
    }

    fn default_version(&self) -> &str {
        "1.8.0"
    }

    fn category(&self) -> &str {
        "Injection Testing & Database Security"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::InjectionTesting,
            ToolCapability::VulnScan,
            ToolCapability::PassiveAudit,
        ]
    }

    fn description(&self) -> &str {
        "Automated tool that detects and tests SQL injection flaws in web applications and database backends with strictly bounded rate limits."
    }

    fn documentation_url(&self) -> &str {
        "https://sqlmap.org"
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
                        message: "sqlmap binary is not currently installed on host. Install via `pip install sqlmap` or configure custom path.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("--version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("sqlmap detected").trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "sqlmap binary not found".to_string())?;

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "-u",
                &input.target_url,
                "--batch",
                "--level=1",
                "--risk=1",
                "--technique=B",
                "--threads=1",
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch sqlmap process: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] sqlmap safe injection audit against: {}", input.target_url));

            let mut is_injection_confirmed = false;
            let mut detected_technique = String::new();

            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                
                // Exclude tool banners, usage text, and generic probe progress messages
                let is_banner_or_probe = trimmed.starts_with("sqlmap/")
                    || trimmed.starts_with("[*] starting")
                    || trimmed.contains("automatic SQL injection")
                    || trimmed.contains("testing connection")
                    || trimmed.contains("testing '")
                    || trimmed.contains("testing for SQL injection");

                if !is_banner_or_probe {
                    if trimmed.contains("is vulnerable")
                        || trimmed.contains("identified the following injection point")
                        || trimmed.contains("back-end DBMS is")
                    {
                        is_injection_confirmed = true;
                        detected_technique = trimmed.to_string();
                    }
                }
                logs.push(trimmed.to_string());
            }

            if is_injection_confirmed {
                let mut finding = Finding::new(
                    input.target_id.clone(),
                    "Confirmed SQL Injection (sqlmap verified)".to_string(),
                    FindingSeverity::Critical,
                    95,
                    input.target_url.clone(),
                    if detected_technique.is_empty() {
                        "Target endpoint is confirmed vulnerable to SQL injection by sqlmap active probe.".to_string()
                    } else {
                        format!("sqlmap verified injection point: {}", detected_technique)
                    },
                    "sqlmap".to_string(),
                    "1.8.0".to_string(),
                    Some("CWE-89".to_string()),
                    "Use parameterized queries (prepared statements) or ORM to eliminate SQL injection.".to_string(),
                );
                finding.verification_status = "Confirmed".to_string();
                finding.provenance_kind = "ExternalTool".to_string();
                finding.detection_method = "sqlmap-active-probe".to_string();
                findings.push(finding);
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "sqlmap".to_string(),
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
