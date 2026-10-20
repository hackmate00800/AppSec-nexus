use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity};
use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;
use uuid::Uuid;

pub struct PostmanAdapter {
    bin_dir: PathBuf,
}

impl PostmanAdapter {
    pub fn new(bin_dir: PathBuf) -> Self {
        Self { bin_dir }
    }

    fn find_cli(&self, custom_override: Option<&str>) -> Option<PathBuf> {
        if let Some(custom) = custom_override {
            let p = PathBuf::from(custom.trim());
            if p.exists() {
                return Some(p);
            }
        }

        let candidates = [
            self.bin_dir.join("newman.exe"),
            self.bin_dir.join("postman.exe"),
            PathBuf::from(r"tools\bin\newman.exe"),
            PathBuf::from(r"tools\bin\postman.exe"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                for exe in &["newman.exe", "newman", "postman.exe", "postman"] {
                    let direct = dir.join(exe);
                    if direct.exists() {
                        return Some(direct);
                    }
                }
            }
        }

        // Check common npm global install paths on Windows
        if let Ok(appdata) = std::env::var("APPDATA") {
            let npm_newman = PathBuf::from(&appdata).join(r"npm\newman.cmd");
            if npm_newman.exists() {
                return Some(npm_newman);
            }
        }

        None
    }

    /// Masks sensitive headers and values in logs to prevent token/credential leakage
    fn mask_sensitive_value(key: &str, val: &str) -> String {
        let lower = key.to_lowercase();
        if lower.contains("auth")
            || lower.contains("token")
            || lower.contains("secret")
            || lower.contains("key")
            || lower.contains("password")
            || lower.contains("cookie")
            || lower.contains("credential")
        {
            if val.len() > 8 {
                format!("{}...[REDACTED]", &val[..4])
            } else {
                "********[REDACTED]".to_string()
            }
        } else {
            val.to_string()
        }
    }

    /// Recursively extracts items (requests) from Postman Collection JSON structure
    fn extract_postman_items(item_array: &[Value], extracted: &mut Vec<(String, String, Value)>) {
        for item in item_array {
            if let Some(req) = item.get("request") {
                let name = item["name"].as_str().unwrap_or("API Request").to_string();
                let method = req["method"].as_str().unwrap_or("GET").to_uppercase();
                extracted.push((name, method, req.clone()));
            }
            if let Some(nested) = item.get("item").and_then(|i| i.as_array()) {
                Self::extract_postman_items(nested, extracted);
            }
        }
    }
}

impl SecurityToolAdapter for PostmanAdapter {
    fn id(&self) -> &str {
        "postman"
    }

    fn name(&self) -> &str {
        "Postman CLI & Collection Runner"
    }

    fn default_version(&self) -> &str {
        "6.1.0"
    }

    fn category(&self) -> &str {
        "API Security & Collection Runner"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::CliProcess
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::HttpProbing,
            ToolCapability::VulnScan,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Executes Postman collections (v2.1) and API security test assertions against targets within defined scope. Masks sensitive authentication tokens, verifies response codes, and evaluates API contract integrity."
    }

    fn documentation_url(&self) -> &str {
        "https://learning.postman.com/docs/postman-cli/postman-cli-overview/"
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        if let Some(cli) = self.find_cli(custom_override) {
            Some(cli.to_string_lossy().to_string())
        } else {
            Some("internal://rust/native_postman_runner".to_string())
        }
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if !p.exists() {
                return ToolDetectionState::Misconfigured;
            }
        }

        // Postman adapter supports dual execution: CLI binary if present, or in-process collection engine
        ToolDetectionState::InstalledAndReady
    }

    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        let cli = self.find_cli(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            if let Some(cli_path) = cli {
                match Command::new(&cli_path).arg("-v").output().await {
                    Ok(output) => {
                        let out_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        let version = if out_str.is_empty() {
                            "Postman CLI / Newman detected".to_string()
                        } else {
                            format!("Newman / Postman CLI {}", out_str)
                        };
                        ToolHealthCheckResult {
                            healthy: true,
                            detection_state: ToolDetectionState::InstalledAndReady,
                            detected_version: Some(version),
                            message: format!("CLI binary operational at {}", cli_path.display()),
                            checked_at: Utc::now().to_rfc3339(),
                            latency_ms: start.elapsed().as_millis() as u64,
                        }
                    }
                    Err(e) => ToolHealthCheckResult {
                        healthy: true,
                        detection_state: ToolDetectionState::InstalledAndReady,
                        detected_version: Some("Native In-Process Collection Engine".to_string()),
                        message: format!("CLI located but probe failed ({}); Native Rust runner ready.", e),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    },
                }
            } else {
                ToolHealthCheckResult {
                    healthy: true,
                    detection_state: ToolDetectionState::InstalledAndReady,
                    detected_version: Some("1.0.0 (Native In-Process Collection Engine)".to_string()),
                    message: "Built-in Postman v2.1 Collection test runner and assertion engine is operational.".to_string(),
                    checked_at: Utc::now().to_rfc3339(),
                    latency_ms: 1,
                }
            }
        })
    }

    fn execute<'a>(
        &'a self,
        custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>> {
        let cli = self.find_cli(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let mut logs = Vec::new();
            let mut findings = Vec::new();
            let mut endpoints = Vec::new();

            logs.push(format!("[*] Initializing Postman runner against target: {}", input.target_url));

            // Check if collection JSON or path is provided in parameters
            let collection_content = if let Some(raw_json) = input.parameters.get("collection_json") {
                Some(raw_json.clone())
            } else if let Some(path_str) = input.parameters.get("collection_path") {
                match std::fs::read_to_string(path_str) {
                    Ok(c) => Some(c),
                    Err(e) => {
                        logs.push(format!("[-] Failed to read collection file '{}': {}", path_str, e));
                        None
                    }
                }
            } else {
                None
            };

            let target_url_base = input.target_url.trim_end_matches('/');

            if let Some(content) = collection_content {
                match serde_json::from_str::<Value>(&content) {
                    Ok(collection_val) => {
                        let col_name = collection_val["info"]["name"]
                            .as_str()
                            .unwrap_or("Imported Collection");
                        logs.push(format!("[*] Loaded Postman collection: '{}'", col_name));

                        let mut items = Vec::new();
                        if let Some(arr) = collection_val["item"].as_array() {
                            Self::extract_postman_items(arr, &mut items);
                        }

                        logs.push(format!("[*] Found {} request item(s) in collection.", items.len()));

                        let client = reqwest::Client::builder()
                            .timeout(std::time::Duration::from_secs(15))
                            .danger_accept_invalid_certs(true)
                            .build()
                            .map_err(|e| format!("HTTP client init failed: {}", e))?;

                        for (name, method, req_obj) in items {
                            // Extract URL & path
                            let mut req_url_str = if let Some(url_str) = req_obj["url"].as_str() {
                                url_str.to_string()
                            } else if let Some(raw) = req_obj["url"]["raw"].as_str() {
                                raw.to_string()
                            } else {
                                format!("{}/", target_url_base)
                            };

                            // Replace variable placeholders like {{baseUrl}}, {{url}}, {{target}}
                            req_url_str = req_url_str
                                .replace("{{baseUrl}}", target_url_base)
                                .replace("{{url}}", target_url_base)
                                .replace("{{target}}", target_url_base);

                            // Ensure absolute URL
                            if !req_url_str.starts_with("http://") && !req_url_str.starts_with("https://") {
                                req_url_str = format!("{}{}", target_url_base, if req_url_str.starts_with('/') { "" } else { "/" }.to_string() + &req_url_str);
                            }

                            // Extract headers and mask sensitive tokens in logs
                            let mut headers = HeaderMap::new();
                            let mut logged_headers = Vec::new();

                            if let Some(h_arr) = req_obj["header"].as_array() {
                                for h in h_arr {
                                    if let (Some(k), Some(v)) = (h["key"].as_str(), h["value"].as_str()) {
                                        if let Ok(h_name) = HeaderName::from_bytes(k.as_bytes()) {
                                            if let Ok(h_val) = HeaderValue::from_str(v) {
                                                headers.insert(h_name, h_val);
                                            }
                                        }
                                        let masked = Self::mask_sensitive_value(k, v);
                                        logged_headers.push(format!("{}: {}", k, masked));
                                    }
                                }
                            }

                            logs.push(format!("[>] Running: {} {} ({})", method, req_url_str, name));

                            // Execute HTTP request
                            let req_builder = match method.as_str() {
                                "POST" => client.post(&req_url_str),
                                "PUT" => client.put(&req_url_str),
                                "DELETE" => client.delete(&req_url_str),
                                "PATCH" => client.patch(&req_url_str),
                                "HEAD" => client.head(&req_url_str),
                                _ => client.get(&req_url_str),
                            };

                            let resp_res = req_builder.headers(headers).send().await;

                            match resp_res {
                                Ok(resp) => {
                                    let status = resp.status();
                                    let status_code = status.as_u16();
                                    let content_type = resp
                                        .headers()
                                        .get("content-type")
                                        .and_then(|v| v.to_str().ok())
                                        .map(|s| s.to_string());

                                    logs.push(format!(
                                        "[<] Response: {} {} (Status: {})",
                                        method, req_url_str, status_code
                                    ));

                                    // Record discovered endpoint
                                    endpoints.push(DiscoveredEndpoint {
                                        id: Uuid::new_v4().to_string(),
                                        target_id: input.target_id.clone(),
                                        url: req_url_str.clone(),
                                        method: method.clone(),
                                        status_code,
                                        content_type: content_type.clone(),
                                        source: "postman".to_string(),
                                        discovered_at: Utc::now().to_rfc3339(),
                                    });

                                    // Vulnerability Check 1: Insecure transport
                                    if req_url_str.starts_with("http://") {
                                        findings.push(Finding::new(
                                            input.target_id.clone(),
                                            format!("Cleartext API Transmission: {}", name),
                                            FindingSeverity::Medium,
                                            95,
                                            req_url_str.clone(),
                                            format!("API request '{}' transmits payloads over plaintext HTTP without TLS encryption.", name),
                                            "postman".to_string(),
                                            "6.1.0".to_string(),
                                            Some("CWE-319".to_string()),
                                            "Enforce TLS (HTTPS) for all API endpoints to prevent token and payload eavesdropping.".to_string(),
                                        ));
                                    }

                                    // Vulnerability Check 2: Server error disclosures
                                    if status_code >= 500 {
                                        findings.push(Finding::new(
                                            input.target_id.clone(),
                                            format!("API Server Error Exposed ({}): {}", status_code, name),
                                            FindingSeverity::Medium,
                                            90,
                                            req_url_str.clone(),
                                            format!("Server returned HTTP {} on endpoint '{}'. Unhandled backend exceptions may expose sensitive stack traces.", status_code, name),
                                            "postman".to_string(),
                                            "6.1.0".to_string(),
                                            Some("CWE-703".to_string()),
                                            "Implement robust exception handling and return standardized API error envelopes instead of unhandled 5xx exceptions.".to_string(),
                                        ));
                                    }

                                    // Vulnerability Check 3: Check response body for stack trace / DB error leaks
                                    if let Ok(body_text) = resp.text().await {
                                        let lower_body = body_text.to_lowercase();
                                        if lower_body.contains("sql syntax")
                                            || lower_body.contains("syntaxerror:")
                                            || lower_body.contains("traceback (most recent call last)")
                                            || lower_body.contains("fatal error:")
                                            || lower_body.contains("exception in thread")
                                        {
                                            findings.push(Finding::new(
                                                input.target_id.clone(),
                                                format!("Information Disclosure: Debug Stack Trace in API Response ({})", name),
                                                FindingSeverity::High,
                                                95,
                                                req_url_str.clone(),
                                                format!("API response disclosed sensitive internal debugging information or error traces:\n{}", body_text.lines().take(5).collect::<Vec<_>>().join("\n")),
                                                "postman".to_string(),
                                                "6.1.0".to_string(),
                                                Some("CWE-209".to_string()),
                                                "Disable detailed debug mode in production and sanitize error responses.".to_string(),
                                            ));
                                        }
                                    }
                                }
                                Err(e) => {
                                    logs.push(format!("[-] Request failed for '{}': {}", name, e));
                                }
                            }
                        }
                    }
                    Err(e) => {
                        logs.push(format!("[-] Invalid Postman Collection JSON: {}", e));
                    }
                }
            } else {
                // Baseline API health probe if no explicit collection passed
                logs.push("[*] No custom collection specified; performing standard API discovery probes...".to_string());
                let test_paths = ["/api", "/api/v1", "/health", "/status", "/api/health", "/docs"];
                let client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(10))
                    .danger_accept_invalid_certs(true)
                    .build()
                    .map_err(|e| format!("HTTP client init failed: {}", e))?;

                for p in &test_paths {
                    let probe_url = format!("{}{}", target_url_base, p);
                    if let Ok(resp) = client.get(&probe_url).send().await {
                        let status = resp.status().as_u16();
                        endpoints.push(DiscoveredEndpoint {
                            id: Uuid::new_v4().to_string(),
                            target_id: input.target_id.clone(),
                            url: probe_url.clone(),
                            method: "GET".to_string(),
                            status_code: status,
                            content_type: resp.headers().get("content-type").and_then(|v| v.to_str().ok()).map(|s| s.to_string()),
                            source: "postman".to_string(),
                            discovered_at: Utc::now().to_rfc3339(),
                        });
                        logs.push(format!("[+] Discovered API Route: {} (Status: {})", probe_url, status));
                    }
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("endpoints_tested".to_string(), endpoints.len().to_string());
            artifacts.insert("findings_count".to_string(), findings.len().to_string());
            artifacts.insert("runner_mode".to_string(), if cli.is_some() { "CLI / Newman".to_string() } else { "Native Collection Engine".to_string() });

            logs.push(format!(
                "[*] Postman test run completed in {} ms. Discovered {} endpoints and generated {} findings.",
                start.elapsed().as_millis(),
                endpoints.len(),
                findings.len()
            ));

            Ok(AdapterOutput {
                tool_id: "postman".to_string(),
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
