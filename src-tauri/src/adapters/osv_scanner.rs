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

pub struct OsvScannerAdapter {
    bin_dir: PathBuf,
}

impl OsvScannerAdapter {
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
            self.bin_dir.join("osv-scanner.exe"),
            self.bin_dir.join("osv-scanner"),
            PathBuf::from(r"tools\bin\osv-scanner.exe"),
            PathBuf::from("/usr/local/bin/osv-scanner"),
            PathBuf::from("/usr/bin/osv-scanner"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("osv-scanner.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("osv-scanner");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for OsvScannerAdapter {
    fn id(&self) -> &str {
        "osv_scanner"
    }

    fn name(&self) -> &str {
        "Google OSV-Scanner"
    }

    fn default_version(&self) -> &str {
        "2.7.0"
    }

    fn category(&self) -> &str {
        "Software Composition Analysis (SCA)"
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
        "Google's vulnerability scanner for dependencies. Queries the open-source vulnerabilities database (OSV.dev) to detect CVEs across lockfiles (package-lock.json, Cargo.lock, requirements.txt, go.sum, etc.)."
    }

    fn documentation_url(&self) -> &str {
        "https://google.github.io/osv-scanner/"
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
                        message: "OSV-Scanner executable was not found in tools/bin or system PATH.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("--version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("osv-scanner v2.x").trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "OSV-Scanner binary not found".to_string())?;

            let scan_target = input
                .parameters
                .get("scan_path")
                .cloned()
                .unwrap_or_else(|| ".".to_string());

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "--format",
                "json",
                "-r",
                &scan_target,
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch OSV-Scanner: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] OSV-Scanner scanning dependency manifests in: {}", scan_target));

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(results) = val["results"].as_array() {
                    for r in results {
                        if let Some(packages) = r["packages"].as_array() {
                            for pkg in packages {
                                let pkg_name = pkg["package"]["name"].as_str().unwrap_or("package");
                                let pkg_ver = pkg["package"]["version"].as_str().unwrap_or("unknown");
                                if let Some(vulns) = pkg["vulnerabilities"].as_array() {
                                    for v in vulns {
                                        let vuln_id = v["id"].as_str().unwrap_or("VULN-ID");
                                        let summary = v["summary"].as_str().unwrap_or("Known Dependency Vulnerability");
                                        let details = v["details"].as_str().unwrap_or("");

                                        findings.push(Finding::new(
                                            input.target_id.clone(),
                                            format!("{}: {} ({})", vuln_id, pkg_name, pkg_ver),
                                            FindingSeverity::High,
                                            90,
                                            format!("{}@{}", pkg_name, pkg_ver),
                                            format!("Summary: {}\nDetails: {}", summary, details.chars().take(400).collect::<String>()),
                                            "osv_scanner".to_string(),
                                            "2.7.0".to_string(),
                                            Some("CWE-1395".to_string()),
                                            format!("Upgrade {} to a patched release as recommended by OSV advisory {}.", pkg_name, vuln_id),
                                        ));
                                    }
                                }
                            }
                        }
                    }
                }
            }

            logs.push(format!("[+] OSV-Scanner identified {} vulnerable package(s).", findings.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("vulnerabilities_found".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "osv_scanner".to_string(),
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
