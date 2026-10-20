use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity};
use chrono::Utc;
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;
use uuid::Uuid;

pub struct ZapAdapter {
    bin_dir: PathBuf,
}

impl ZapAdapter {
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
            self.bin_dir.join("zap.bat"),
            self.bin_dir.join("ZAP.exe"),
            PathBuf::from(r"C:\Program Files\OWASP\Zed Attack Proxy\ZAP.exe"),
            PathBuf::from(r"C:\Program Files (x86)\OWASP\Zed Attack Proxy\ZAP.exe"),
            PathBuf::from(r"C:\Program Files\OWASP\Zed Attack Proxy\zap.bat"),
            PathBuf::from("/usr/bin/zaproxy"),
            PathBuf::from("/usr/local/bin/zap.sh"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                for exe in &["zap.bat", "ZAP.exe", "zap.sh", "zaproxy"] {
                    let direct = dir.join(exe);
                    if direct.exists() {
                        return Some(direct);
                    }
                }
            }
        }

        None
    }

    async fn probe_api(api_url: &str) -> Option<String> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(1500))
            .build()
            .ok()?;

        let endpoint = format!("{}/JSON/core/view/version/", api_url.trim_end_matches('/'));
        let resp = client.get(&endpoint).send().await.ok()?;
        if resp.status().is_success() {
            let val = resp.json::<Value>().await.ok()?;
            return val["version"].as_str().map(|s| s.to_string());
        }
        None
    }

    fn map_zap_alert_to_finding(target_id: &str, alert: &Value) -> Finding {
        let name = alert["alert"].as_str().unwrap_or("ZAP Security Alert").to_string();
        let risk = alert["risk"].as_str().unwrap_or("Low");
        let severity = match risk.to_lowercase().as_str() {
            "high" | "3" => FindingSeverity::High,
            "medium" | "2" => FindingSeverity::Medium,
            "low" | "1" => FindingSeverity::Low,
            _ => FindingSeverity::Info,
        };

        let confidence_str = alert["confidence"].as_str().unwrap_or("Medium");
        let confidence = match confidence_str.to_lowercase().as_str() {
            "high" | "3" => 95,
            "medium" | "2" => 85,
            "low" | "1" => 70,
            _ => 60,
        };

        let url = alert["url"].as_str().unwrap_or("").to_string();
        let desc = alert["description"].as_str().unwrap_or("").to_string();
        let solution = alert["solution"].as_str().unwrap_or("Review and apply OWASP defensive best practices.").to_string();
        let param = alert["param"].as_str().unwrap_or("");
        let evidence = alert["evidence"].as_str().unwrap_or("");
        let cwe_id = alert["cweid"]
            .as_str()
            .or_else(|| alert["cweid"].as_i64().map(|_| ""))
            .filter(|s| !s.is_empty())
            .map(|id| format!("CWE-{}", id));

        let detailed_desc = format!(
            "{}\n\nAffected Parameter: {}\nEvidence: {}",
            desc,
            if param.is_empty() { "N/A" } else { param },
            if evidence.is_empty() { "N/A" } else { evidence }
        );

        Finding::new(
            target_id.to_string(),
            name,
            severity,
            confidence,
            url,
            detailed_desc,
            "owasp_zap".to_string(),
            "2.15.0".to_string(),
            cwe_id,
            solution,
        )
    }
}

impl SecurityToolAdapter for ZapAdapter {
    fn id(&self) -> &str {
        "owasp_zap"
    }

    fn name(&self) -> &str {
        "OWASP ZAP (Zed Attack Proxy)"
    }

    fn default_version(&self) -> &str {
        "2.15.0"
    }

    fn category(&self) -> &str {
        "Web Application Security Scanner"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::VulnScan,
            ToolCapability::PassiveAudit,
            ToolCapability::Crawling,
            ToolCapability::HttpProbing,
            ToolCapability::ReportExport,
            ToolCapability::GuiLauncher,
        ]
    }

    fn description(&self) -> &str {
        "OWASP's open-source web application security scanner. Connects via ZAP REST API daemon, headless CLI baseline scanner, or GUI proxy to discover vulnerabilities, map endpoints, and verify security posture."
    }

    fn documentation_url(&self) -> &str {
        "https://www.zaproxy.org/docs/"
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        self.find_executable(custom_override)
            .map(|p| p.to_string_lossy().to_string())
            .or_else(|| Some("http://127.0.0.1:8080 (ZAP API)".to_string()))
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if p.exists() {
                return ToolDetectionState::InstalledAndReady;
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

            // First check if ZAP API daemon is currently running on port 8080 or 8090
            for port in [8080, 8090] {
                let api_url = format!("http://127.0.0.1:{}", port);
                if let Some(version) = Self::probe_api(&api_url).await {
                    return ToolHealthCheckResult {
                        healthy: true,
                        detection_state: ToolDetectionState::InstalledAndReady,
                        detected_version: Some(format!("OWASP ZAP API v{} (: {})", version, port)),
                        message: format!("Live ZAP REST API daemon connected and responsive on {}.", api_url),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            }

            // Check if local binary exists
            if let Some(exe_path) = exe {
                return ToolHealthCheckResult {
                    healthy: true,
                    detection_state: ToolDetectionState::InstalledAndReady,
                    detected_version: Some("ZAP Desktop / CLI (Installed)".to_string()),
                    message: format!("ZAP executable verified at {}. Ready to launch or run headless.", exe_path.display()),
                    checked_at: Utc::now().to_rfc3339(),
                    latency_ms: start.elapsed().as_millis() as u64,
                };
            }

            ToolHealthCheckResult {
                healthy: false,
                detection_state: ToolDetectionState::NotInstalled,
                detected_version: None,
                message: "OWASP ZAP was not found on host. Install via winget ('winget install OWASP.ZAP') or start ZAP daemon on port 8080.".to_string(),
                checked_at: Utc::now().to_rfc3339(),
                latency_ms: start.elapsed().as_millis() as u64,
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
            let mut logs = Vec::new();
            let mut findings = Vec::new();
            let mut endpoints = Vec::new();

            logs.push(format!("[*] Initiating OWASP ZAP security scan against: {}", input.target_url));

            // Check if ZAP API daemon is listening
            let mut active_api: Option<String> = None;
            for port in [8080, 8090] {
                let api_url = format!("http://127.0.0.1:{}", port);
                if Self::probe_api(&api_url).await.is_some() {
                    active_api = Some(api_url);
                    break;
                }
            }

            if let Some(api_base) = active_api {
                logs.push(format!("[+] Connected to active ZAP API daemon on {}", api_base));
                let client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(30))
                    .build()
                    .map_err(|e| format!("Failed to build HTTP client for ZAP: {}", e))?;

                let encoded_target = url::form_urlencoded::byte_serialize(input.target_url.as_bytes()).collect::<String>();
                let alerts_url = format!(
                    "{}/JSON/core/view/alerts/?baseurl={}",
                    api_base,
                    encoded_target
                );

                if let Ok(resp) = client.get(&alerts_url).send().await {
                    if let Ok(val) = resp.json::<Value>().await {
                        if let Some(alerts_arr) = val["alerts"].as_array() {
                            logs.push(format!("[+] Retrieved {} alert(s) from ZAP daemon.", alerts_arr.len()));
                            for a in alerts_arr {
                                let f = Self::map_zap_alert_to_finding(&input.target_id, a);
                                logs.push(format!("[+] Alert: {} ({:?}) - {}", f.title, f.severity, f.affected_asset));
                                findings.push(f);
                            }
                        }
                    }
                }

                // 2. Fetch URLs / endpoints tracked by ZAP
                let urls_endpoint = format!(
                    "{}/JSON/core/view/urls/?baseurl={}",
                    api_base,
                    encoded_target
                );

                if let Ok(resp) = client.get(&urls_endpoint).send().await {
                    if let Ok(val) = resp.json::<Value>().await {
                        if let Some(urls_arr) = val["urls"].as_array() {
                            for u in urls_arr {
                                if let Some(url_str) = u.as_str() {
                                    endpoints.push(DiscoveredEndpoint {
                                        id: Uuid::new_v4().to_string(),
                                        target_id: input.target_id.clone(),
                                        url: url_str.to_string(),
                                        method: "GET".to_string(),
                                        status_code: 200,
                                        content_type: None,
                                        source: "owasp_zap".to_string(),
                                        discovered_at: Utc::now().to_rfc3339(),
                                    });
                                }
                            }
                        }
                    }
                }
            } else if let Some(exe_path) = exe {
                // Launch ZAP desktop UI or headless baseline
                logs.push(format!("[*] Launching OWASP ZAP desktop process: {}", exe_path.display()));
                #[cfg(target_os = "windows")]
                {
                    let status = Command::new("cmd")
                        .args(&["/c", "start", "", &exe_path.to_string_lossy().to_string(), "-cmd", "-quickurl", &input.target_url])
                        .spawn();
                    if let Err(e) = status {
                        logs.push(format!("[-] Failed to launch ZAP process: {}", e));
                    } else {
                        logs.push("[+] ZAP process launched successfully.".to_string());
                    }
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let status = Command::new(&exe_path)
                        .args(&["-cmd", "-quickurl", &input.target_url])
                        .spawn();
                    if let Err(e) = status {
                        logs.push(format!("[-] Failed to launch ZAP process: {}", e));
                    } else {
                        logs.push("[+] ZAP process launched successfully.".to_string());
                    }
                }
            } else {
                return Err("Neither OWASP ZAP API daemon (:8080) nor ZAP executable is available on this system.".to_string());
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());
            artifacts.insert("endpoints_count".to_string(), endpoints.len().to_string());

            Ok(AdapterOutput {
                tool_id: "owasp_zap".to_string(),
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
