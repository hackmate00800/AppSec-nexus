use serde::{Deserialize, Serialize};
use std::time::Duration;

pub struct AiMentor {
    base_url: String,
}

#[derive(Serialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    system: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaGenerateResponse {
    response: String,
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub size: Option<u64>,
}

impl AiMentor {
    pub fn new() -> Self {
        Self {
            base_url: "http://127.0.0.1:11434".to_string(),
        }
    }

    pub async fn check_status(&self) -> (bool, Vec<String>) {
        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
        {
            Ok(c) => c,
            Err(_) => return (false, Vec::new()),
        };

        let res = client
            .get(format!("{}/api/tags", self.base_url))
            .send()
            .await;

        match res {
            Ok(resp) => {
                if let Ok(tags) = resp.json::<OllamaTagsResponse>().await {
                    let model_names = tags
                        .models
                        .unwrap_or_default()
                        .into_iter()
                        .map(|m| m.name)
                        .collect();
                    (true, model_names)
                } else {
                    (true, Vec::new())
                }
            }
            Err(_) => (false, Vec::new()),
        }
    }

    pub async fn explain_finding(
        &self,
        model: &str,
        mode: &str, // "beginner" or "advanced"
        title: &str,
        severity: &str,
        evidence: &str,
        affected_asset: &str,
        cwe: Option<&str>,
    ) -> Result<String, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| format!("Client creation error: {}", e))?;

        let system_prompt = "You are the local AppSec Nexus AI Security Mentor. \
            You operate in a strict read-only advisory role. You NEVER execute commands, \
            NEVER change targets, and NEVER generate weaponized destructive exploits. \
            Your purpose is education, defensive remediation, and clear technical explanation."
            .to_string();

        let prompt = if mode == "beginner" {
            format!(
                "Explain this cybersecurity finding in simple, beginner-friendly terms with an analogy:\n\
                - Vulnerability: {}\n\
                - Severity: {}\n\
                - Asset: {}\n\
                - Evidence: {}\n\
                - CWE: {}\n\n\
                Structure your answer into: \n\
                1. What does this mean in plain English?\n\
                2. Real-world risk analogy\n\
                3. How developers easily fix it",
                title, severity, affected_asset, evidence, cwe.unwrap_or("N/A")
            )
        } else {
            format!(
                "Provide an advanced technical assessment and remediation guide for this finding:\n\
                - Vulnerability: {}\n\
                - Severity: {}\n\
                - Asset: {}\n\
                - Evidence: {}\n\
                - CWE: {}\n\n\
                Structure your answer into:\n\
                1. Technical Root Cause & Attack Vector\n\
                2. Defense-in-depth Code Remediation (with code snippet)\n\
                3. Verification / Audit steps",
                title, severity, affected_asset, evidence, cwe.unwrap_or("N/A")
            )
        };

        let req_body = OllamaGenerateRequest {
            model: model.to_string(),
            prompt,
            system: system_prompt,
            stream: false,
        };

        let res = client
            .post(format!("{}/api/generate", self.base_url))
            .json(&req_body)
            .send()
            .await
            .map_err(|e| {
                format!(
                    "Failed to connect to local Ollama (is Ollama running?): {}",
                    e
                )
            })?;

        if !res.status().is_success() {
            return Err(format!(
                "Ollama returned HTTP error: {}",
                res.status()
            ));
        }

        let resp_json = res
            .json::<OllamaGenerateResponse>()
            .await
            .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

        Ok(resp_json.response)
    }

    pub async fn pull_model(&self, model: &str) -> Result<String, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(600))
            .build()
            .map_err(|e| e.to_string())?;

        let req = serde_json::json!({
            "name": model,
            "stream": false
        });

        let res = client
            .post(format!("{}/api/pull", self.base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("Failed to initiate model download: {}", e))?;

        if res.status().is_success() {
            Ok(format!("Model '{}' successfully downloaded and ready for offline use!", model))
        } else {
            Err(format!("Ollama returned error: HTTP {}", res.status()))
        }
    }
}
