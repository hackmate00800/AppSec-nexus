use crate::models::{Finding, FindingSeverity, FindingStatus};
use reqwest::header::HeaderMap;
use std::time::Duration;
use uuid::Uuid;

pub struct BaselineScanner;

impl BaselineScanner {
    pub async fn scan_url(target_id: &str, url: &str) -> Result<Vec<Finding>, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .danger_accept_invalid_certs(true)
            .build()
            .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let headers = response.headers();
        let mut findings = Vec::new();
        let now = chrono::Utc::now().to_rfc3339();

        // 1. Check Content-Security-Policy
        if !headers.contains_key("content-security-policy") {
            findings.push(Finding {
                id: Uuid::new_v4().to_string(),
                target_id: target_id.to_string(),
                title: "Missing Content-Security-Policy (CSP) Header".to_string(),
                severity: FindingSeverity::Low,
                confidence: 95,
                affected_asset: url.to_string(),
                evidence: "No Content-Security-Policy HTTP header was returned by the server."
                    .to_string(),
                source_tool: "BaselineScanner".to_string(),
                tool_version: "1.0.0".to_string(),
                cwe: Some("CWE-693".to_string()),
                remediation:
                    "Implement a strong Content-Security-Policy header restricting script sources."
                        .to_string(),
                status: FindingStatus::New,
                created_at: now.clone(),
            });
        }

        // 2. Check Strict-Transport-Security (HSTS)
        if url.starts_with("https://") && !headers.contains_key("strict-transport-security") {
            findings.push(Finding {
                id: Uuid::new_v4().to_string(),
                target_id: target_id.to_string(),
                title: "Missing Strict-Transport-Security (HSTS) Header".to_string(),
                severity: FindingSeverity::Low,
                confidence: 95,
                affected_asset: url.to_string(),
                evidence: "Strict-Transport-Security header is absent on HTTPS endpoint."
                    .to_string(),
                source_tool: "BaselineScanner".to_string(),
                tool_version: "1.0.0".to_string(),
                cwe: Some("CWE-319".to_string()),
                remediation:
                    "Enable HSTS with 'Strict-Transport-Security: max-age=31536000; includeSubDomains'."
                        .to_string(),
                status: FindingStatus::New,
                created_at: now.clone(),
            });
        }

        // 3. Check X-Frame-Options (Clickjacking)
        if !headers.contains_key("x-frame-options")
            && !headers.contains_key("content-security-policy")
        {
            findings.push(Finding {
                id: Uuid::new_v4().to_string(),
                target_id: target_id.to_string(),
                title: "Potential Clickjacking - Missing X-Frame-Options".to_string(),
                severity: FindingSeverity::Medium,
                confidence: 90,
                affected_asset: url.to_string(),
                evidence: "Neither X-Frame-Options nor CSP frame-ancestors is configured."
                    .to_string(),
                source_tool: "BaselineScanner".to_string(),
                tool_version: "1.0.0".to_string(),
                cwe: Some("CWE-1021".to_string()),
                remediation:
                    "Set 'X-Frame-Options: DENY' or 'SAMEORIGIN' to prevent framing attacks."
                        .to_string(),
                status: FindingStatus::New,
                created_at: now.clone(),
            });
        }

        // 4. Check X-Content-Type-Options
        if !headers.contains_key("x-content-type-options") {
            findings.push(Finding {
                id: Uuid::new_v4().to_string(),
                target_id: target_id.to_string(),
                title: "Missing X-Content-Type-Options (MIME Sniffing)".to_string(),
                severity: FindingSeverity::Low,
                confidence: 95,
                affected_asset: url.to_string(),
                evidence: "Header 'X-Content-Type-Options: nosniff' was not detected.".to_string(),
                source_tool: "BaselineScanner".to_string(),
                tool_version: "1.0.0".to_string(),
                cwe: Some("CWE-79".to_string()),
                remediation: "Add 'X-Content-Type-Options: nosniff' to HTTP response headers."
                    .to_string(),
                status: FindingStatus::New,
                created_at: now.clone(),
            });
        }

        // 5. Inspect Cookies for Security Flags
        Self::check_cookies(target_id, url, headers, &mut findings, &now);

        // 6. Check robots.txt presence
        if let Ok(base_url) = url::Url::parse(url) {
            if let Ok(robots_url) = base_url.join("/robots.txt") {
                if let Ok(r_resp) = client.get(robots_url.as_str()).send().await {
                    if r_resp.status().is_success() {
                        let text = r_resp.text().await.unwrap_or_default();
                        if text.contains("Disallow:") {
                            findings.push(Finding {
                                id: Uuid::new_v4().to_string(),
                                target_id: target_id.to_string(),
                                title: "Information Disclosure: robots.txt Disallow Rules Discovered"
                                    .to_string(),
                                severity: FindingSeverity::Info,
                                confidence: 100,
                                affected_asset: robots_url.to_string(),
                                evidence: format!(
                                    "Discovered robots.txt containing hidden paths:\n{}",
                                    text.lines().take(5).collect::<Vec<_>>().join("\n")
                                ),
                                source_tool: "BaselineScanner".to_string(),
                                tool_version: "1.0.0".to_string(),
                                cwe: Some("CWE-200".to_string()),
                                remediation:
                                    "Ensure sensitive administrative paths in robots.txt are properly protected by authentication."
                                        .to_string(),
                                status: FindingStatus::New,
                                created_at: now.clone(),
                            });
                        }
                    }
                }
            }
        }

        Ok(findings)
    }

    fn check_cookies(
        target_id: &str,
        url: &str,
        headers: &HeaderMap,
        findings: &mut Vec<Finding>,
        now: &str,
    ) {
        for val in headers.get_all("set-cookie") {
            if let Ok(cookie_str) = val.to_str() {
                let lower = cookie_str.to_lowercase();
                if !lower.contains("httponly") {
                    findings.push(Finding {
                        id: Uuid::new_v4().to_string(),
                        target_id: target_id.to_string(),
                        title: "Cookie Missing HttpOnly Flag".to_string(),
                        severity: FindingSeverity::Medium,
                        confidence: 95,
                        affected_asset: url.to_string(),
                        evidence: format!("Cookie set without HttpOnly flag: {}", cookie_str),
                        source_tool: "BaselineScanner".to_string(),
                        tool_version: "1.0.0".to_string(),
                        cwe: Some("CWE-1004".to_string()),
                        remediation:
                            "Add the 'HttpOnly' flag to cookies to mitigate client-side script theft (XSS)."
                                .to_string(),
                        status: FindingStatus::New,
                        created_at: now.to_string(),
                    });
                }

                if url.starts_with("https://") && !lower.contains("secure") {
                    findings.push(Finding {
                        id: Uuid::new_v4().to_string(),
                        target_id: target_id.to_string(),
                        title: "Cookie Missing Secure Flag over HTTPS".to_string(),
                        severity: FindingSeverity::Medium,
                        confidence: 95,
                        affected_asset: url.to_string(),
                        evidence: format!("Cookie set without Secure flag: {}", cookie_str),
                        source_tool: "BaselineScanner".to_string(),
                        tool_version: "1.0.0".to_string(),
                        cwe: Some("CWE-614".to_string()),
                        remediation:
                            "Set the 'Secure' flag to ensure the cookie is only transmitted over encrypted TLS connections."
                                .to_string(),
                        status: FindingStatus::New,
                        created_at: now.to_string(),
                    });
                }
            }
        }
    }
}
