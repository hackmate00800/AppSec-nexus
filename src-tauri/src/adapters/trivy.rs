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

pub struct TrivyAdapter;

impl TrivyAdapter {
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
            PathBuf::from(r"tools\bin\trivy.exe"),
            PathBuf::from(r"tools\bin\trivy"),
        ];

        // WinGet package directory
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let winget_dir = PathBuf::from(&local_appdata).join(r"Microsoft\WinGet\Packages");
            if winget_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(&winget_dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.starts_with("AquaSecurity.Trivy") {
                            candidates.push(entry.path().join("trivy.exe"));
                        }
                    }
                }
            }
            candidates.push(PathBuf::from(&local_appdata).join(r"Microsoft\WinGet\Links\trivy.exe"));
        }

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("trivy.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("trivy");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for TrivyAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for TrivyAdapter {
    fn id(&self) -> &str {
        "trivy"
    }

    fn name(&self) -> &str {
        "AquaSecurity Trivy Scanner"
    }

    fn default_version(&self) -> &str {
        "0.76.0"
    }

    fn category(&self) -> &str {
        "Multi-Target Vulnerability & Config Scanner"
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
        "Comprehensive security scanner for container images, file systems, Git repositories, virtual machine images, and Kubernetes configurations."
    }

    fn documentation_url(&self) -> &str {
        "https://trivy.dev/"
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
                        message: "Trivy binary was not found in WinGet or system PATH.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("--version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("trivy v0.x").trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "Trivy binary not found".to_string())?;

            let scan_target = input
                .parameters
                .get("scan_path")
                .cloned()
                .unwrap_or_else(|| ".".to_string());

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "fs",
                "--format",
                "json",
                "--quiet",
                &scan_target,
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch Trivy: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] Trivy scanning filesystem target: {}", scan_target));

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(results) = val["Results"].as_array() {
                    for r in results {
                        let target = r["Target"].as_str().unwrap_or(&scan_target);
                        if let Some(vulns) = r["Vulnerabilities"].as_array() {
                            for v in vulns {
                                let vuln_id = v["VulnerabilityID"].as_str().unwrap_or("CVE-UNKNOWN");
                                let pkg = v["PkgName"].as_str().unwrap_or("pkg");
                                let installed_ver = v["InstalledVersion"].as_str().unwrap_or("v");
                                let fixed_ver = v["FixedVersion"].as_str().unwrap_or("N/A");
                                let title = v["Title"].as_str().unwrap_or(vuln_id);
                                let sev_str = v["Severity"].as_str().unwrap_or("MEDIUM");
                                let severity = match sev_str.to_uppercase().as_str() {
                                    "CRITICAL" => FindingSeverity::Critical,
                                    "HIGH" => FindingSeverity::High,
                                    "MEDIUM" => FindingSeverity::Medium,
                                    _ => FindingSeverity::Low,
                                };

                                findings.push(Finding::new(
                                    input.target_id.clone(),
                                    format!("{}: {} in {} ({})", vuln_id, title, pkg, target),
                                    severity,
                                    90,
                                    format!("{} ({})", target, pkg),
                                    format!("Vulnerability ID: {}\nPackage: {} (Version: {})\nFixed Version: {}\nDescription: {}", vuln_id, pkg, installed_ver, fixed_ver, v["Description"].as_str().unwrap_or("")),
                                    "trivy".to_string(),
                                    "0.76.0".to_string(),
                                    Some("CWE-1395".to_string()),
                                    format!("Upgrade package '{}' to version '{}' or later.", pkg, fixed_ver),
                                ));
                            }
                        }
                    }
                }
            }

            logs.push(format!("[+] Trivy completed. Found {} vulnerability item(s).", findings.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("vulnerabilities_found".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "trivy".to_string(),
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
