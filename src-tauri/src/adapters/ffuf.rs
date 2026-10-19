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

pub struct FfufAdapter {
    bin_dir: PathBuf,
}

impl FfufAdapter {
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

        let mut candidates = vec![
            self.bin_dir.join("ffuf.exe"),
            self.bin_dir.join("ffuf"),
            PathBuf::from(r"tools\bin\ffuf.exe"),
        ];

        // Check WinGet packages directory
        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let winget_dir = PathBuf::from(&local_appdata).join(r"Microsoft\WinGet\Packages");
            if winget_dir.exists() {
                if let Ok(entries) = std::fs::read_dir(&winget_dir) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.starts_with("ffuf.ffuf") {
                            candidates.push(entry.path().join("ffuf.exe"));
                        }
                    }
                }
            }
            candidates.push(PathBuf::from(&local_appdata).join(r"Microsoft\WinGet\Links\ffuf.exe"));
        }

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("ffuf.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("ffuf");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for FfufAdapter {
    fn id(&self) -> &str {
        "ffuf"
    }

    fn name(&self) -> &str {
        "ffuf Web Fuzzer"
    }

    fn default_version(&self) -> &str {
        "2.3.0"
    }

    fn category(&self) -> &str {
        "Content & Parameter Discovery"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::HttpProbing,
            ToolCapability::Crawling,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Fast web fuzzer written in Go. Discovers hidden directories, files, parameters, and virtual hosts with wordlist-driven permutations."
    }

    fn documentation_url(&self) -> &str {
        "https://github.com/ffuf/ffuf"
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
                        message: "ffuf binary not found in WinGet, tools/bin, or PATH.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("-V").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string()
                        + &String::from_utf8_lossy(&output.stderr);
                    let version_line = out_str.lines().next().unwrap_or("ffuf v2.x").trim().to_string();

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
            let exe_path = exe.ok_or_else(|| "ffuf binary not found".to_string())?;

            let target_url = if input.target_url.ends_with('/') {
                format!("{}FUZZ", input.target_url)
            } else {
                format!("{}/FUZZ", input.target_url)
            };

            // Built-in safe wordlist written to temp
            let temp_wordlist = std::env::temp_dir().join("appsec_ffuf_quick.txt");
            let quick_words = "api\nadmin\nlogin\nv1\nv2\ndocs\nhealth\nstatus\nenv\nconfig\nmetrics\n.git\nswagger\nopenapi.json\n";
            let _ = tokio::fs::write(&temp_wordlist, quick_words).await;

            let mut cmd = Command::new(&exe_path);
            cmd.args(&[
                "-u",
                &target_url,
                "-w",
                &temp_wordlist.to_string_lossy(),
                "-mc",
                "200,204,301,302,307,401,403",
                "-s",
                "-json",
            ]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Failed to launch ffuf: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut logs = Vec::new();
            let mut endpoints = Vec::new();
            let mut findings = Vec::new();

            logs.push(format!("[*] ffuf probing target: {}", input.target_url));

            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(results) = val["results"].as_array() {
                    for r in results {
                        let url = r["url"].as_str().unwrap_or("").to_string();
                        let status = r["status"].as_u64().unwrap_or(200) as u16;

                        if !url.is_empty() {
                            endpoints.push(DiscoveredEndpoint {
                                id: uuid::Uuid::new_v4().to_string(),
                                target_id: input.target_id.clone(),
                                url: url.clone(),
                                method: "GET".to_string(),
                                status_code: status,
                                content_type: None,
                                source: "ffuf".to_string(),
                                discovered_at: Utc::now().to_rfc3339(),
                            });

                            if status == 200 && (url.contains(".env") || url.contains(".git") || url.contains("config")) {
                                findings.push(Finding::new(
                                    input.target_id.clone(),
                                    format!("Exposed Configuration or Sensitive Resource: {}", url),
                                    FindingSeverity::High,
                                    85,
                                    url,
                                    format!("ffuf content discovery found sensitive resource responding with HTTP 200."),
                                    "ffuf".to_string(),
                                    "2.3.0".to_string(),
                                    Some("CWE-200".to_string()),
                                    "Restrict web access to environment, source code, and configuration assets.".to_string(),
                                ));
                            }
                        }
                    }
                }
            }

            logs.push(format!("[+] ffuf identified {} responsive resource(s).", endpoints.len()));

            let mut artifacts = HashMap::new();
            artifacts.insert("endpoints_discovered".to_string(), endpoints.len().to_string());

            Ok(AdapterOutput {
                tool_id: "ffuf".to_string(),
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
