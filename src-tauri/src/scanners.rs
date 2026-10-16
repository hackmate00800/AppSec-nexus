use crate::models::{Finding, FindingSeverity};
use reqwest::header::HeaderMap;
use std::time::Duration;

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

        // 1. Check Content-Security-Policy
        if !headers.contains_key("content-security-policy") {
            findings.push(Finding::new(
                target_id.to_string(),
                "Missing Content-Security-Policy (CSP) Header".to_string(),
                FindingSeverity::Low,
                95,
                url.to_string(),
                "No Content-Security-Policy HTTP header was returned by the server.".to_string(),
                "BaselineScanner".to_string(),
                "1.0.0".to_string(),
                Some("CWE-693".to_string()),
                "Implement a strong Content-Security-Policy header restricting script sources.".to_string(),
            ));
        }

        // 2. Check Strict-Transport-Security (HSTS)
        if url.starts_with("https://") && !headers.contains_key("strict-transport-security") {
            findings.push(Finding::new(
                target_id.to_string(),
                "Missing Strict-Transport-Security (HSTS) Header".to_string(),
                FindingSeverity::Low,
                95,
                url.to_string(),
                "Strict-Transport-Security header is absent on HTTPS endpoint.".to_string(),
                "BaselineScanner".to_string(),
                "1.0.0".to_string(),
                Some("CWE-319".to_string()),
                "Enable HSTS with 'Strict-Transport-Security: max-age=31536000; includeSubDomains'.".to_string(),
            ));
        }

        // 3. Check X-Frame-Options (Clickjacking)
        if !headers.contains_key("x-frame-options")
            && !headers.contains_key("content-security-policy")
        {
            findings.push(Finding::new(
                target_id.to_string(),
                "Potential Clickjacking - Missing X-Frame-Options".to_string(),
                FindingSeverity::Medium,
                90,
                url.to_string(),
                "Neither X-Frame-Options nor CSP frame-ancestors is configured.".to_string(),
                "BaselineScanner".to_string(),
                "1.0.0".to_string(),
                Some("CWE-1021".to_string()),
                "Set 'X-Frame-Options: DENY' or 'SAMEORIGIN' to prevent framing attacks.".to_string(),
            ));
        }

        // 4. Check X-Content-Type-Options
        if !headers.contains_key("x-content-type-options") {
            findings.push(Finding::new(
                target_id.to_string(),
                "Missing X-Content-Type-Options (MIME Sniffing)".to_string(),
                FindingSeverity::Low,
                95,
                url.to_string(),
                "Header 'X-Content-Type-Options: nosniff' was not detected.".to_string(),
                "BaselineScanner".to_string(),
                "1.0.0".to_string(),
                Some("CWE-79".to_string()),
                "Add 'X-Content-Type-Options: nosniff' to HTTP response headers.".to_string(),
            ));
        }

        // 5. Inspect Cookies for Security Flags
        Self::check_cookies(target_id, url, headers, &mut findings);

        // 6. Check robots.txt presence
        if let Ok(base_url) = url::Url::parse(url) {
            if let Ok(robots_url) = base_url.join("/robots.txt") {
                if let Ok(r_resp) = client.get(robots_url.as_str()).send().await {
                    if r_resp.status().is_success() {
                        let text = r_resp.text().await.unwrap_or_default();
                        if text.contains("Disallow:") {
                            findings.push(Finding::new(
                                target_id.to_string(),
                                "Information Disclosure: robots.txt Disallow Rules Discovered".to_string(),
                                FindingSeverity::Info,
                                100,
                                robots_url.to_string(),
                                format!(
                                    "Discovered robots.txt containing hidden paths:\n{}",
                                    text.lines().take(5).collect::<Vec<_>>().join("\n")
                                ),
                                "BaselineScanner".to_string(),
                                "1.0.0".to_string(),
                                Some("CWE-200".to_string()),
                                "Ensure sensitive administrative paths in robots.txt are properly protected by authentication.".to_string(),
                            ));
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
    ) {
        for val in headers.get_all("set-cookie") {
            if let Ok(cookie_str) = val.to_str() {
                let lower = cookie_str.to_lowercase();
                if !lower.contains("httponly") {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        "Cookie Missing HttpOnly Flag".to_string(),
                        FindingSeverity::Medium,
                        95,
                        url.to_string(),
                        format!("Cookie set without HttpOnly flag: {}", cookie_str),
                        "BaselineScanner".to_string(),
                        "1.0.0".to_string(),
                        Some("CWE-1004".to_string()),
                        "Add the 'HttpOnly' flag to cookies to mitigate client-side script theft (XSS).".to_string(),
                    ));
                }

                if url.starts_with("https://") && !lower.contains("secure") {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        "Cookie Missing Secure Flag over HTTPS".to_string(),
                        FindingSeverity::Medium,
                        95,
                        url.to_string(),
                        format!("Cookie set without Secure flag: {}", cookie_str),
                        "BaselineScanner".to_string(),
                        "1.0.0".to_string(),
                        Some("CWE-614".to_string()),
                        "Set the 'Secure' flag to ensure the cookie is only transmitted over encrypted TLS connections.".to_string(),
                    ));
                }
            }
        }
    }
}
