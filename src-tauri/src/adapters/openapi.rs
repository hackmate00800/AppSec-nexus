use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity};
use chrono::Utc;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use std::pin::Pin;
use std::time::Instant;
use uuid::Uuid;

pub struct OpenApiAdapter;

impl OpenApiAdapter {
    pub fn new() -> Self {
        Self
    }

    /// Evaluates OpenAPI v3 or Swagger v2 schema for security weaknesses
    fn audit_spec_security(
        target_id: &str,
        target_url: &str,
        spec: &Value,
        findings: &mut Vec<Finding>,
        endpoints: &mut Vec<DiscoveredEndpoint>,
        logs: &mut Vec<String>,
    ) {
        let title = spec["info"]["title"].as_str().unwrap_or("API Specification");
        let version = spec["info"]["version"].as_str().unwrap_or("1.0.0");
        logs.push(format!("[+] Auditing OpenAPI specification: '{}' v{}", title, version));

        // 1. Check Global Servers / Schemes for Cleartext HTTP
        if let Some(servers) = spec["servers"].as_array() {
            for s in servers {
                if let Some(srv_url) = s["url"].as_str() {
                    if srv_url.starts_with("http://") && !srv_url.contains("localhost") && !srv_url.contains("127.0.0.1") {
                        findings.push(Finding::new(
                            target_id.to_string(),
                            "OpenAPI Server Defined over Unencrypted HTTP".to_string(),
                            FindingSeverity::Medium,
                            95,
                            srv_url.to_string(),
                            format!("API specification explicitly defines unencrypted server endpoint: '{}'", srv_url),
                            "openapi".to_string(),
                            version.to_string(),
                            Some("CWE-319".to_string()),
                            "Enforce HTTPS TLS encryption on all public and internal API server definitions.".to_string(),
                        ));
                    }
                }
            }
        } else if let Some(schemes) = spec["schemes"].as_array() {
            for sc in schemes {
                if sc.as_str() == Some("http") {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        "Swagger Specification Allows Plaintext HTTP Scheme".to_string(),
                        FindingSeverity::Medium,
                        95,
                        target_url.to_string(),
                        "Swagger 2.0 definition includes 'http' in schemes array.".to_string(),
                        "openapi".to_string(),
                        version.to_string(),
                        Some("CWE-319".to_string()),
                        "Restrict schemes array to 'https' only.".to_string(),
                    ));
                }
            }
        }

        // 2. Check Security Definitions for API Keys in Query String
        let sec_schemes = spec["components"]["securitySchemes"]
            .as_object()
            .or_else(|| spec["securityDefinitions"].as_object());

        if let Some(schemes) = sec_schemes {
            for (name, scheme) in schemes {
                let stype = scheme["type"].as_str().unwrap_or("");
                let location = scheme["in"].as_str().unwrap_or("");
                if stype == "apiKey" && location == "query" {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        format!("Insecure API Key Passing in Query Parameter ({})", name),
                        FindingSeverity::Medium,
                        95,
                        target_url.to_string(),
                        format!("Security scheme '{}' is configured with 'in: query'. Tokens in query parameters leak to server logs, browser history, and referer headers.", name),
                        "openapi".to_string(),
                        version.to_string(),
                        Some("CWE-598".to_string()),
                        "Pass API keys via HTTP headers (e.g. 'Authorization: Bearer <key>' or 'X-API-Key') rather than URL query parameters.".to_string(),
                    ));
                }
            }
        }

        // Global security requirement
        let has_global_security = spec["security"]
            .as_array()
            .map(|arr| !arr.is_empty())
            .unwrap_or(false);

        // 3. Inspect Paths & Operations
        let mut total_routes = 0;
        let mut unauthenticated_routes = 0;

        if let Some(paths) = spec["paths"].as_object() {
            for (path_name, path_item) in paths {
                if let Some(methods) = path_item.as_object() {
                    for (method, op_details) in methods {
                        let method_upper = method.to_uppercase();
                        if !["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"].contains(&method_upper.as_str()) {
                            continue;
                        }

                        total_routes += 1;
                        let summary = op_details["summary"].as_str().unwrap_or("");
                        let route_url = format!("{}{}", target_url.trim_end_matches('/'), path_name);

                        endpoints.push(DiscoveredEndpoint {
                            id: Uuid::new_v4().to_string(),
                            target_id: target_id.to_string(),
                            url: route_url.clone(),
                            method: method_upper.clone(),
                            status_code: 200,
                            content_type: Some("application/json".to_string()),
                            source: "openapi".to_string(),
                            discovered_at: Utc::now().to_rfc3339(),
                        });

                        // Check authentication requirements
                        let route_sec = op_details["security"].as_array();
                        let is_public = match route_sec {
                            Some(arr) => arr.is_empty(),
                            None => !has_global_security,
                        };

                        if is_public {
                            unauthenticated_routes += 1;
                            let lower_path = path_name.to_lowercase();
                            if lower_path.contains("/admin")
                                || lower_path.contains("/user")
                                || lower_path.contains("/account")
                                || lower_path.contains("/billing")
                                || lower_path.contains("/internal")
                                || lower_path.contains("/token")
                                || lower_path.contains("/key")
                                || lower_path.contains("/payment")
                            {
                                findings.push(Finding::new(
                                    target_id.to_string(),
                                    format!("Sensitive Endpoint Missing Authentication: {} {}", method_upper, path_name),
                                    FindingSeverity::High,
                                    90,
                                    route_url.clone(),
                                    format!("Potentially privileged route '{}' ({}) has no security requirements defined in OpenAPI contract.", path_name, summary),
                                    "openapi".to_string(),
                                    version.to_string(),
                                    Some("CWE-306".to_string()),
                                    "Attach an explicit security requirement (e.g. OAuth2, JWT Bearer) to prevent unauthorized access (OWASP API2:2023).".to_string(),
                                ));
                            }
                        }

                        // Check for Mass Assignment / Unconstrained payloads
                        if ["POST", "PUT", "PATCH"].contains(&method_upper.as_str()) {
                            if let Some(req_body) = op_details["requestBody"]["content"]["application/json"]["schema"].as_object() {
                                let schema_type = req_body.get("type").and_then(|t| t.as_str()).unwrap_or("");
                                let has_additional_props = req_body.get("additionalProperties")
                                    .and_then(|p| p.as_bool())
                                    .unwrap_or(true);

                                if schema_type == "object" && has_additional_props && !req_body.contains_key("properties") {
                                    findings.push(Finding::new(
                                        target_id.to_string(),
                                        format!("Potential Mass Assignment / Unbounded Schema: {} {}", method_upper, path_name),
                                        FindingSeverity::Medium,
                                        85,
                                        route_url.clone(),
                                        format!("Request schema for '{}' accepts arbitrary object attributes without schema constraints ('additionalProperties: true').", path_name),
                                        "openapi".to_string(),
                                        version.to_string(),
                                        Some("CWE-915".to_string()),
                                        "Define an explicit whitelist of allowed properties in request DTO schemas and set 'additionalProperties: false' (OWASP API3:2023).".to_string(),
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Inspect Data Schemas for Sensitive Property Exposure
        let schemas = spec["components"]["schemas"]
            .as_object()
            .or_else(|| spec["definitions"].as_object());

        if let Some(model_schemas) = schemas {
            for (schema_name, schema_obj) in model_schemas {
                if let Some(props) = schema_obj["properties"].as_object() {
                    for (prop_name, _) in props {
                        let lower_prop = prop_name.to_lowercase();
                        if lower_prop == "password"
                            || lower_prop == "password_hash"
                            || lower_prop == "ssn"
                            || lower_prop == "secret_key"
                            || lower_prop == "private_key"
                            || lower_prop == "credit_card"
                        {
                            findings.push(Finding::new(
                                target_id.to_string(),
                                format!("Sensitive Field Exposed in API Data Model: {}.{}", schema_name, prop_name),
                                FindingSeverity::High,
                                95,
                                format!("schema://{}", schema_name),
                                format!("API model schema '{}' includes sensitive property '{}'. Exposing sensitive attributes in response schemas risks excessive data disclosure.", schema_name, prop_name),
                                "openapi".to_string(),
                                version.to_string(),
                                Some("CWE-200".to_string()),
                                "Use Data Transfer Objects (DTOs) or serialization filters (e.g. '@JsonIgnore') to exclude sensitive fields from API responses (OWASP API3:2023).".to_string(),
                            ));
                        }
                    }
                }
            }
        }

        logs.push(format!(
            "[*] OpenAPI audit summary: {} total endpoints analyzed, {} without authentication requirement, {} security findings identified.",
            total_routes, unauthenticated_routes, findings.len()
        ));
    }
}

impl Default for OpenApiAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for OpenApiAdapter {
    fn id(&self) -> &str {
        "openapi"
    }

    fn name(&self) -> &str {
        "OpenAPI & Swagger Security Auditor"
    }

    fn default_version(&self) -> &str {
        "3.1.0"
    }

    fn category(&self) -> &str {
        "API Security & Schema Testing"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::NativeEngine
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::PassiveAudit,
            ToolCapability::HttpProbing,
            ToolCapability::VulnScan,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "Discovers and audits OpenAPI v3 and Swagger 2.0 specifications. Identifies unprotected endpoints, mass assignment risks, cleartext transport, and sensitive credential disclosures against the OWASP API Security Top 10."
    }

    fn documentation_url(&self) -> &str {
        "https://owasp.org/www-project-api-security/"
    }

    fn resolve_path(&self, _custom_override: Option<&str>) -> Option<String> {
        Some("internal://rust/native_openapi".to_string())
    }

    fn detect(&self, _custom_override: Option<&str>) -> ToolDetectionState {
        ToolDetectionState::InstalledAndReady
    }

    fn health_check(
        &self,
        _custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        Box::pin(async move {
            ToolHealthCheckResult {
                healthy: true,
                detection_state: ToolDetectionState::InstalledAndReady,
                detected_version: Some("3.1.0 (Native In-Process OpenAPI Engine)".to_string()),
                message: "Native OpenAPI 3.x / Swagger 2.x security parser and OWASP API audit engine is operational."
                    .to_string(),
                checked_at: Utc::now().to_rfc3339(),
                latency_ms: 1,
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
            let mut findings = Vec::new();
            let mut endpoints = Vec::new();

            logs.push(format!("[*] Commencing OpenAPI security audit for target: {}", input.target_url));

            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(12))
                .danger_accept_invalid_certs(true)
                .build()
                .map_err(|e| format!("HTTP client init failed: {}", e))?;

            // 1. Determine spec content
            let mut loaded_spec: Option<Value> = None;

            if let Some(raw_json) = input.parameters.get("spec_json") {
                if let Ok(val) = serde_json::from_str::<Value>(raw_json) {
                    loaded_spec = Some(val);
                    logs.push("[+] Loaded OpenAPI specification from parameters directly.".to_string());
                }
            } else if let Some(path_str) = input.parameters.get("spec_path") {
                let p = Path::new(path_str);
                if p.exists() {
                    if let Ok(c) = std::fs::read_to_string(p) {
                        if let Ok(val) = serde_json::from_str::<Value>(&c) {
                            loaded_spec = Some(val);
                            logs.push(format!("[+] Loaded OpenAPI file from: {}", path_str));
                        }
                    }
                }
            }

            // If not provided directly, probe target URL for common OpenAPI/Swagger JSON routes
            if loaded_spec.is_none() {
                let target_base = input.target_url.trim_end_matches('/');
                let candidates = [
                    "/openapi.json",
                    "/swagger.json",
                    "/v2/api-docs",
                    "/v3/api-docs",
                    "/api-docs",
                    "/swagger/v1/swagger.json",
                    "/api/openapi.json",
                ];

                logs.push("[*] Probing target for published OpenAPI/Swagger endpoints...".to_string());
                for path in &candidates {
                    let probe_url = format!("{}{}", target_base, path);
                    if let Ok(resp) = client.get(&probe_url).send().await {
                        if resp.status().is_success() {
                            if let Ok(text) = resp.text().await {
                                if let Ok(val) = serde_json::from_str::<Value>(&text) {
                                    if val.get("openapi").is_some() || val.get("swagger").is_some() || val.get("paths").is_some() {
                                        logs.push(format!("[+] Discovered active OpenAPI endpoint at: {}", probe_url));
                                        endpoints.push(DiscoveredEndpoint {
                                            id: Uuid::new_v4().to_string(),
                                            target_id: input.target_id.clone(),
                                            url: probe_url.clone(),
                                            method: "GET".to_string(),
                                            status_code: 200,
                                            content_type: Some("application/json".to_string()),
                                            source: "openapi_discovery".to_string(),
                                            discovered_at: Utc::now().to_rfc3339(),
                                        });
                                        loaded_spec = Some(val);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Perform Security Audit if spec loaded
            if let Some(spec) = loaded_spec {
                Self::audit_spec_security(
                    &input.target_id,
                    &input.target_url,
                    &spec,
                    &mut findings,
                    &mut endpoints,
                    &mut logs,
                );
            } else {
                logs.push("[-] No OpenAPI specification found on target or provided in parameters.".to_string());
                logs.push("[*] Tip: You can supply 'spec_json' or 'spec_path' in tool parameters to audit local or protected specifications.".to_string());
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("endpoints_count".to_string(), endpoints.len().to_string());
            artifacts.insert("findings_count".to_string(), findings.len().to_string());

            Ok(AdapterOutput {
                tool_id: "openapi".to_string(),
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
