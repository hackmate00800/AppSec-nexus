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

pub struct OllamaAdapter;

impl OllamaAdapter {
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

        if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
            let winget_path = PathBuf::from(&local_appdata)
                .join("Microsoft")
                .join("WinGet")
                .join("Packages");
            if winget_path.exists() {
                if let Ok(entries) = std::fs::read_dir(&winget_path) {
                    for entry in entries.flatten() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        if name.contains("Ollama") {
                            let exe = entry.path().join("ollama.exe");
                            if exe.exists() {
                                return Some(exe);
                            }
                        }
                    }
                }
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("ollama.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("ollama");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }

    async fn check_server_health() -> bool {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(600))
            .build();
        if let Ok(c) = client {
            if let Ok(resp) = c.get("http://127.0.0.1:11434/api/tags").send().await {
                return resp.status().is_success();
            }
        }
        false
    }
}

impl Default for OllamaAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for OllamaAdapter {
    fn id(&self) -> &str {
        "ollama"
    }

    fn name(&self) -> &str {
        "Ollama Local AI Engine"
    }

    fn default_version(&self) -> &str {
        "0.5.12"
    }

    fn category(&self) -> &str {
        "Local LLM / Privacy AI"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::LocalHttpApi
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::AiReasoning,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Privacy-first offline local LLM runtime (DeepSeek-R1 / Llama 3) for vulnerability impact assessment, remediation drafting, and workflow analysis without data leaks."
    }

    fn documentation_url(&self) -> &str {
        "https://ollama.com"
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        if let Some(p) = Self::find_executable(custom_override) {
            return Some(p.to_string_lossy().to_string());
        }
        Some("http://127.0.0.1:11434".to_string())
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if !p.exists() && !custom.starts_with("http") {
                return ToolDetectionState::Misconfigured;
            }
        }

        if Self::find_executable(custom_override).is_some() {
            ToolDetectionState::InstalledAndReady
        } else {
            ToolDetectionState::DetectedUnavailable
        }
    }

    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        let exe = Self::find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let server_up = Self::check_server_health().await;

            if server_up {
                return ToolHealthCheckResult {
                    healthy: true,
                    detection_state: ToolDetectionState::InstalledAndReady,
                    detected_version: Some("Ollama REST API (Active on port 11434)".to_string()),
                    message: "Ollama local inference service is running and responsive on 127.0.0.1:11434."
                        .to_string(),
                    checked_at: Utc::now().to_rfc3339(),
                    latency_ms: start.elapsed().as_millis() as u64,
                };
            }

            if let Some(p) = exe {
                return ToolHealthCheckResult {
                    healthy: false,
                    detection_state: ToolDetectionState::DetectedUnavailable,
                    detected_version: Some(format!("Binary found: {}", p.display())),
                    message: "Ollama binary is installed on disk, but the local daemon service is not currently running. Launch Ollama to activate AI features.".to_string(),
                    checked_at: Utc::now().to_rfc3339(),
                    latency_ms: start.elapsed().as_millis() as u64,
                };
            }

            ToolHealthCheckResult {
                healthy: false,
                detection_state: ToolDetectionState::NotInstalled,
                detected_version: None,
                message: "Ollama is not installed or running. Install from ollama.com or winget to enable local AI features.".to_string(),
                checked_at: Utc::now().to_rfc3339(),
                latency_ms: start.elapsed().as_millis() as u64,
            }
        })
    }

    fn execute<'a>(
        &'a self,
        _custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>> {
        Box::pin(async move {
            let start = Instant::now();
            let mut logs = Vec::new();
            logs.push(format!(
                "[*] Synthesizing security analysis and remediation plan for {}",
                input.target_url
            ));

            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(45))
                .build()
                .map_err(|e| e.to_string())?;

            let prompt = format!(
                "You are a Senior Application Security Engineer. Provide a concise, actionable security hardening summary for web target '{}'. Include top 3 recommendations for headers, authentication, and attack surface defense.",
                input.target_url
            );

            let body = serde_json::json!({
                "model": input.parameters.get("model").unwrap_or(&"deepseek-r1:8b".to_string()),
                "prompt": prompt,
                "stream": false
            });

            let mut synthesis = String::new();
            let mut findings = Vec::new();

            match client
                .post("http://127.0.0.1:11434/api/generate")
                .json(&body)
                .send()
                .await
            {
                Ok(resp) => {
                    if let Ok(val) = resp.json::<serde_json::Value>().await {
                        if let Some(resp_text) = val["response"].as_str() {
                            synthesis = resp_text.to_string();
                            logs.push("[+] Local AI analysis successfully generated:".to_string());
                            for l in synthesis.lines().take(15) {
                                logs.push(format!("  {}", l));
                            }

                            findings.push(Finding::new(
                                input.target_id.clone(),
                                "AI Defensive Hardening Guidance".to_string(),
                                FindingSeverity::Info,
                                85,
                                input.target_url.clone(),
                                format!("Local LLM Defense Synthesis:\n{}", synthesis),
                                "ollama".to_string(),
                                "0.5.12".to_string(),
                                None,
                                "Review and implement the recommended hardening guidance.".to_string(),
                            ));
                        }
                    }
                }
                Err(e) => {
                    logs.push(format!(
                        "[-] Local Ollama server was not reachable ({}). Proceeding with fallback rule-based synthesis.",
                        e
                    ));
                    synthesis = "Apply strict Content-Security-Policy, HSTS, Secure/HttpOnly/SameSite cookies, and rate-limit API endpoints.".to_string();
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("ai_synthesis".to_string(), synthesis);

            Ok(AdapterOutput {
                tool_id: "ollama".to_string(),
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
