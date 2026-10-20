use appsec_nexus_lib::adapters::ToolDetectionState;
use appsec_nexus_lib::adapters::{openapi::OpenApiAdapter, postman::PostmanAdapter};
use serde_json::json;
use std::path::PathBuf;

#[test]
fn test_adapter_registry_contains_all_priority_tools() {
    let bin_dir = PathBuf::from("tools/bin");
    let registry = appsec_nexus_lib::adapters::AdapterRegistry::new(bin_dir);
    let tools = registry.list_adapters();

    let tool_ids: Vec<String> = tools.iter().map(|t| t.id.clone()).collect();

    // Verify prioritized Web and API tools
    assert!(tool_ids.contains(&"baseline".to_string()), "Native baseline must be registered");
    assert!(tool_ids.contains(&"openapi".to_string()), "OpenAPI auditor must be registered");
    assert!(tool_ids.contains(&"postman".to_string()), "Postman collection runner must be registered");
    assert!(tool_ids.contains(&"owasp_zap".to_string()), "OWASP ZAP adapter must be registered");
    assert!(tool_ids.contains(&"nuclei".to_string()), "Nuclei must be registered");

    // Verify Network tools
    assert!(tool_ids.contains(&"nmap".to_string()), "Nmap must be registered");

    // Verify SAST & Dependency tools
    assert!(tool_ids.contains(&"osv_scanner".to_string()), "OSV-Scanner must be registered");
    assert!(tool_ids.contains(&"trivy".to_string()), "Trivy must be registered");
    assert!(tool_ids.contains(&"semgrep".to_string()), "Semgrep must be registered");
}

#[tokio::test]
async fn test_openapi_spec_security_audit() {
    use appsec_nexus_lib::adapters::{AdapterInput, SecurityToolAdapter};

    let adapter = OpenApiAdapter::new();
    assert_eq!(adapter.id(), "openapi");
    assert_eq!(adapter.detect(None), ToolDetectionState::InstalledAndReady);

    let sample_spec = json!({
        "openapi": "3.0.0",
        "info": { "title": "Test Banking API", "version": "1.0.0" },
        "servers": [{ "url": "http://api.insecure-bank.com/v1" }],
        "paths": {
            "/public/health": {
                "get": { "summary": "Health Check" }
            },
            "/admin/users": {
                "get": { "summary": "List All Users" }
            },
            "/api/payments": {
                "post": {
                    "summary": "Process Payment",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "additionalProperties": true
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "UserProfile": {
                    "type": "object",
                    "properties": {
                        "id": { "type": "string" },
                        "username": { "type": "string" },
                        "password": { "type": "string" },
                        "ssn": { "type": "string" }
                    }
                }
            }
        }
    });

    let mut params = std::collections::HashMap::new();
    params.insert("spec_json".to_string(), sample_spec.to_string());

    let input = AdapterInput {
        target_id: "target-123".to_string(),
        target_url: "https://api.insecure-bank.com".to_string(),
        parameters: params,
        timeout_seconds: Some(10),
    };

    let result = adapter.execute(None, input).await.expect("Audit execution failed");

    assert_eq!(result.status, "Success");
    assert!(!result.findings.is_empty(), "Should generate security findings");

    // 1. Should flag Cleartext HTTP in server URL (CWE-319)
    let http_finding = result.findings.iter().find(|f| f.cwe.as_deref() == Some("CWE-319"));
    assert!(http_finding.is_some(), "Cleartext HTTP server finding must be present");

    // 2. Should flag unauthenticated sensitive route /admin/users (CWE-306)
    let auth_finding = result.findings.iter().find(|f| f.title.contains("Sensitive Endpoint Missing Authentication"));
    assert!(auth_finding.is_some(), "Unauthenticated admin route finding must be present");

    // 3. Should flag Mass Assignment on /api/payments (CWE-915)
    let mass_finding = result.findings.iter().find(|f| f.cwe.as_deref() == Some("CWE-915"));
    assert!(mass_finding.is_some(), "Mass assignment finding must be present");

    // 4. Should flag sensitive property exposures: password, ssn (CWE-200)
    let pwd_finding = result.findings.iter().find(|f| f.title.contains("UserProfile.password"));
    assert!(pwd_finding.is_some(), "Sensitive property password finding must be present");

    // 5. Should extract discovered endpoints
    assert!(result.endpoints.len() >= 3, "All 3 operations should be mapped to endpoints");
}

#[tokio::test]
async fn test_postman_collection_parsing_and_masking() {
    use appsec_nexus_lib::adapters::{AdapterInput, SecurityToolAdapter};

    let bin_dir = PathBuf::from("tools/bin");
    let adapter = PostmanAdapter::new(bin_dir);
    assert_eq!(adapter.id(), "postman");

    let sample_collection = json!({
        "info": {
            "name": "Auth API Tests",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [
            {
                "name": "Admin Dashboard",
                "request": {
                    "method": "GET",
                    "url": { "raw": "{{baseUrl}}/api/admin" },
                    "header": [
                        { "key": "Authorization", "value": "Bearer super-secret-admin-jwt-token-12345" }
                    ]
                }
            }
        ]
    });

    let mut params = std::collections::HashMap::new();
    params.insert("collection_json".to_string(), sample_collection.to_string());

    let input = AdapterInput {
        target_id: "target-456".to_string(),
        target_url: "http://127.0.0.1:9".to_string(), // Inactive port to test execution handling
        parameters: params,
        timeout_seconds: Some(5),
    };

    let result = adapter.execute(None, input).await.expect("Execution should return result gracefully");

    // Verify logs mask sensitive authorization header value
    let auth_log = result.logs.iter().find(|l| l.contains("Authorization"));
    if let Some(log_line) = auth_log {
        assert!(!log_line.contains("super-secret-admin-jwt-token-12345"), "Sensitive token must NOT appear in raw text logs");
        assert!(log_line.contains("REDACTED"), "Sensitive token must be masked with REDACTED");
    }
}
