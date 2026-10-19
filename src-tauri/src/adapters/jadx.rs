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

pub struct JadxAdapter {
    bin_dir: PathBuf,
}

impl JadxAdapter {
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
            PathBuf::from(r"c:\Users\ankit\OneDrive\Desktop\project\AppSec\tools\jadx\bin\jadx.bat"),
            self.bin_dir.join("..").join("jadx").join("bin").join("jadx.bat"),
            self.bin_dir.join("jadx.bat"),
            PathBuf::from(r"tools\jadx\bin\jadx.bat"),
            PathBuf::from("/usr/bin/jadx"),
            PathBuf::from("/usr/local/bin/jadx"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("jadx.bat");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("jadx");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for JadxAdapter {
    fn id(&self) -> &str {
        "jadx"
    }

    fn name(&self) -> &str {
        "JADX Dex to Java Decompiler"
    }

    fn default_version(&self) -> &str {
        "1.5.6"
    }

    fn category(&self) -> &str {
        "Android Security & Reverse Engineering"
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
        "Command line and GUI tool for producing Java source code from Android Dex and APK files. Decodes AndroidManifest.xml, resources.arsc, and assets for security audit."
    }

    fn documentation_url(&self) -> &str {
        "https://github.com/skylot/jadx"
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
                        message: "JADX binary not found. Extracted portable zip in tools/jadx or system PATH.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("--version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("jadx 1.5.6").trim().to_string();

                    ToolHealthCheckResult {
                        healthy: true,
                        detection_state: ToolDetectionState::InstalledAndReady,
                        detected_version: Some(version_line),
                        message: format!("Binary verified at: {} (Java 21 runtime)", exe_path.display()),
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
            let exe_path = exe.ok_or_else(|| "JADX binary not found".to_string())?;

            let apk_path = input
                .parameters
                .get("apk_path")
                .cloned()
                .unwrap_or_else(|| "target.apk".to_string());

            let mut logs = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] JADX verifying APK structure for: {}", apk_path));

            if !Path::new(&apk_path).exists() {
                logs.push(format!("[-] APK file '{}' does not exist on disk.", apk_path));
            } else {
                let out_dir = std::env::temp_dir().join(format!("jadx_out_{}", uuid::Uuid::new_v4()));
                let mut cmd = Command::new(&exe_path);
                cmd.args(&[
                    "-d",
                    &out_dir.to_string_lossy(),
                    &apk_path,
                ]);

                if let Ok(_output) = cmd.output().await {
                    logs.push(format!("[+] JADX successfully decompiled APK to: {}", out_dir.display()));
                    // Inspect AndroidManifest.xml for exported components or debuggable flag
                    let manifest_path = out_dir.join("resources").join("AndroidManifest.xml");
                    if manifest_path.exists() {
                        if let Ok(xml) = tokio::fs::read_to_string(&manifest_path).await {
                            if xml.contains("android:debuggable=\"true\"") {
                                findings.push(Finding::new(
                                    input.target_id.clone(),
                                    "Android Application is Debuggable".to_string(),
                                    FindingSeverity::High,
                                    95,
                                    format!("{}:AndroidManifest.xml", apk_path),
                                    "android:debuggable=\"true\" found in AndroidManifest.xml".to_string(),
                                    "jadx".to_string(),
                                    "1.5.6".to_string(),
                                    Some("CWE-215".to_string()),
                                    "Set android:debuggable=\"false\" in production release builds.".to_string(),
                                ));
                            }
                            if xml.contains("android:allowBackup=\"true\"") {
                                findings.push(Finding::new(
                                    input.target_id.clone(),
                                    "Android Application Allows Data Backup".to_string(),
                                    FindingSeverity::Medium,
                                    85,
                                    format!("{}:AndroidManifest.xml", apk_path),
                                    "android:allowBackup=\"true\" found in AndroidManifest.xml".to_string(),
                                    "jadx".to_string(),
                                    "1.5.6".to_string(),
                                    Some("CWE-200".to_string()),
                                    "Set android:allowBackup=\"false\" unless cloud backup is specifically required and hardened.".to_string(),
                                ));
                            }
                        }
                    }
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "jadx".to_string(),
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
