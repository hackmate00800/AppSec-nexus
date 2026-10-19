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

pub struct SchemathesisAdapter;

impl SchemathesisAdapter {
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
            candidates.push(PathBuf::from(&appdata).join(r"Python\Python314\Scripts\schemathesis.exe"));
            candidates.push(PathBuf::from(&appdata).join(r"Python\Python313\Scripts\schemathesis.exe"));
            candidates.push(PathBuf::from(&appdata).join(r"Python\Python312\Scripts\schemathesis.exe"));
            candidates.push(PathBuf::from(&appdata).join(r"Python\Scripts\schemathesis.exe"));
        }
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            candidates.push(PathBuf::from(&localappdata).join(r"Programs\Python\Python314\Scripts\schemathesis.exe"));
            candidates.push(PathBuf::from(&localappdata).join(r"Programs\Python\Python313\Scripts\schemathesis.exe"));
        }
        candidates.push(PathBuf::from(r"C:\Python314\Scripts\schemathesis.exe"));

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("schemathesis.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("schemathesis");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for SchemathesisAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for SchemathesisAdapter {
    fn id(&self) -> &str {
        "schemathesis"
    }

    fn name(&self) -> &str {
        "Schemathesis API Fuzzer"
    }

    fn default_version(&self) -> &str {
        "4.32.0"
    }

    fn category(&self) -> &str {
        "API Security & Schema Testing"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::VulnScan,
            ToolCapability::HttpProbing,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Modern property-based testing and fuzzing tool for Web APIs. Validates OpenAPI/Swagger and GraphQL specifications against unexpected payloads, crashes, and status code discrepancies."
    }

    fn documentation_url(&self) -> &str {
        "https://schemathesis.readthedocs.io/"
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
                        message: "Schemathesis executable was not found. Install via `pip install schemathesis`.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            let mut cmd = Command::new(&exe_path);
            cmd.arg("--version");
            if let Some(parent) = exe_path.parent() {
                let cur = std::env::var("PATH").unwrap_or_default();
                cmd.env("PATH", format!("{};{}", parent.display(), cur));
            }

            match cmd.output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("schemathesis v4.x").trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "Schemathesis binary not found".to_string())?;

            let spec_path = input
                .parameters
                .get("schema_url")
                .cloned()
                .unwrap_or_else(|| {
                    if input.target_url.ends_with(".json") || input.target_url.ends_with(".yaml") {
                        input.target_url.clone()
                    } else {
                        format!("{}/openapi.json", input.target_url.trim_end_matches('/'))
                    }
                });

            let mut cmd = Command::new(&exe_path);
            if let Some(parent) = exe_path.parent() {
                let cur = std::env::var("PATH").unwrap_or_default();
                cmd.env("PATH", format!("{};{}", parent.display(), cur));
            }
            cmd.args(&[
                "run",
                &spec_path,
                "--checks",
                "all",
                "--max-response-time",
                "5000",
                "--report",
                "junit",
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Schemathesis: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] Schemathesis testing API schema at: {}", spec_path));

            // Parse output lines for failures or exceptions
            for line in stdout.lines().chain(stderr.lines()) {
                let trimmed = line.trim();
                if trimmed.contains("FAILED") || trimmed.contains("Server error") || trimmed.contains("500 Internal") {
                    logs.push(format!("[!] {}", trimmed));
                    findings.push(Finding::new(
                        input.target_id.clone(),
                        format!("API Schema Non-Conformance / Server Error: {}", trimmed),
                        FindingSeverity::Medium,
                        80,
                        spec_path.clone(),
                        format!("Schemathesis test revealed an unhandled server response or schema violation: {}", trimmed),
                        "schemathesis".to_string(),
                        "4.32.0".to_string(),
                        Some("CWE-20".to_string()),
                        "Validate all request inputs against strict OpenAPI schema constraints and handle error conditions cleanly without 500 crashes.".to_string(),
                    ));
                }
            }

            logs.push(format!("[+] Schemathesis finished. Identified {} finding(s).", findings.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "schemathesis".to_string(),
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
