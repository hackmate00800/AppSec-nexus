use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity, ScopeConfig};
use crate::scope::ScopeValidator;
use regex::Regex;
use std::collections::{HashSet, VecDeque};
use std::time::Duration;
use url::Url;
use uuid::Uuid;

pub struct Crawler;

impl Crawler {
    pub async fn crawl(
        target_id: &str,
        start_url: &str,
        scope: &ScopeConfig,
        max_depth: u32,
        max_pages: u32,
    ) -> Result<(Vec<DiscoveredEndpoint>, Vec<Finding>), String> {
        let base_parsed = Url::parse(start_url).map_err(|e| format!("Invalid start URL: {}", e))?;
        let base_domain = base_parsed
            .host_str()
            .ok_or_else(|| "URL has no valid host".to_string())?
            .to_string();

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(6))
            .danger_accept_invalid_certs(true)
            .redirect(reqwest::redirect::Policy::limited(3))
            .user_agent("AppSec-Nexus-Security-Crawler/1.0")
            .build()
            .map_err(|e| format!("Failed to build crawler client: {}", e))?;

        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut endpoints = Vec::new();
        let mut findings = Vec::new();

        // Regex patterns for extracting assets and links
        let href_re = Regex::new(r#"(?i)<a\s+[^>]*?href=["']([^"'#\s>]+)["']"#).unwrap();
        let form_re = Regex::new(r#"(?i)<form\s+[^>]*?action=["']([^"'#\s>]+)["']"#).unwrap();
        let method_re = Regex::new(r#"(?i)method=["'](GET|POST|PUT|DELETE)["']"#).unwrap();
        let script_re = Regex::new(r#"(?i)<script\s+[^>]*?src=["']([^"'#\s>]+)["']"#).unwrap();

        // 1. Initial sensitive exposures probe
        Self::probe_sensitive_files(
            target_id,
            &base_parsed,
            &client,
            scope,
            &mut endpoints,
            &mut findings,
        )
        .await;

        // Seed with starting URL
        queue.push_back((start_url.to_string(), 0u32));
        visited.insert(Self::normalize_url(start_url));

        while let Some((current_url, depth)) = queue.pop_front() {
            if endpoints.len() >= max_pages as usize {
                break;
            }

            // Strict SSRF / Scope Check before sending request
            if ScopeValidator::validate_target(&current_url, scope).is_err() {
                continue;
            }

            let resp = match client.get(&current_url).send().await {
                Ok(r) => r,
                Err(_) => continue,
            };

            let status = resp.status().as_u16();
            let content_type = resp
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            endpoints.push(DiscoveredEndpoint {
                id: Uuid::new_v4().to_string(),
                target_id: target_id.to_string(),
                url: current_url.clone(),
                method: "GET".to_string(),
                status_code: status,
                content_type: content_type.clone(),
                source: "crawler".to_string(),
                discovered_at: chrono::Utc::now().to_rfc3339(),
            });

            // Only extract links if HTML and within depth limit
            let is_html = content_type
                .as_ref()
                .map(|ct| ct.contains("text/html"))
                .unwrap_or(false);

            if !is_html || depth >= max_depth {
                continue;
            }

            let body = match resp.text().await {
                Ok(t) => t,
                Err(_) => continue,
            };

            let parsed_current = match Url::parse(&current_url) {
                Ok(u) => u,
                Err(_) => continue,
            };

            // Extract anchor links
            for cap in href_re.captures_iter(&body) {
                if let Some(raw_link) = cap.get(1) {
                    if let Ok(resolved) = parsed_current.join(raw_link.as_str()) {
                        if resolved.scheme() == "http" || resolved.scheme() == "https" {
                            if resolved.host_str() == Some(&base_domain) {
                                let norm = Self::normalize_url(resolved.as_str());
                                if !visited.contains(&norm) {
                                    visited.insert(norm.clone());
                                    queue.push_back((norm, depth + 1));
                                }
                            }
                        }
                    }
                }
            }

            // Extract form endpoints
            for cap in form_re.captures_iter(&body) {
                if let Some(raw_act) = cap.get(1) {
                    if let Ok(resolved) = parsed_current.join(raw_act.as_str()) {
                        let method = method_re
                            .captures(&cap[0])
                            .and_then(|m| m.get(1))
                            .map(|m| m.as_str().to_uppercase())
                            .unwrap_or_else(|| "POST".to_string());

                        let norm = Self::normalize_url(resolved.as_str());
                        if !visited.contains(&norm) {
                            visited.insert(norm.clone());
                            endpoints.push(DiscoveredEndpoint {
                                id: Uuid::new_v4().to_string(),
                                target_id: target_id.to_string(),
                                url: norm.clone(),
                                method,
                                status_code: 0,
                                content_type: None,
                                source: "form_action".to_string(),
                                discovered_at: chrono::Utc::now().to_rfc3339(),
                            });
                        }
                    }
                }
            }

            // Extract script endpoints
            for cap in script_re.captures_iter(&body) {
                if let Some(raw_src) = cap.get(1) {
                    if let Ok(resolved) = parsed_current.join(raw_src.as_str()) {
                        let norm = Self::normalize_url(resolved.as_str());
                        if !visited.contains(&norm) && resolved.host_str() == Some(&base_domain) {
                            visited.insert(norm.clone());
                            endpoints.push(DiscoveredEndpoint {
                                id: Uuid::new_v4().to_string(),
                                target_id: target_id.to_string(),
                                url: norm,
                                method: "GET".to_string(),
                                status_code: 200,
                                content_type: Some("application/javascript".to_string()),
                                source: "script_tag".to_string(),
                                discovered_at: chrono::Utc::now().to_rfc3339(),
                            });
                        }
                    }
                }
            }
        }

        Ok((endpoints, findings))
    }

    async fn probe_sensitive_files(
        target_id: &str,
        base_url: &Url,
        client: &reqwest::Client,
        scope: &ScopeConfig,
        endpoints: &mut Vec<DiscoveredEndpoint>,
        findings: &mut Vec<Finding>,
    ) {
        let probes = vec![
            ("/.git/HEAD", "Exposed Git Repository", FindingSeverity::High, "ref: refs/"),
            ("/.git/config", "Exposed Git Configuration", FindingSeverity::High, "repositoryformatversion"),
            ("/.env", "Exposed Environment Configuration (.env)", FindingSeverity::Critical, "KEY="),
            ("/actuator/health", "Spring Boot Actuator Health Exposed", FindingSeverity::Low, "\"status\""),
            ("/.well-known/security.txt", "Security Disclosure Policy Present", FindingSeverity::Info, "Contact:"),
            ("/sitemap.xml", "Sitemap Discovered", FindingSeverity::Info, "<urlset"),
        ];

        for (path, title, severity, indicator) in probes {
            if let Ok(probe_url) = base_url.join(path) {
                let url_str = probe_url.as_str();
                if ScopeValidator::validate_target(url_str, scope).is_err() {
                    continue;
                }

                if let Ok(resp) = client.get(url_str).send().await {
                    let status = resp.status().as_u16();
                    if resp.status().is_success() {
                        let text = resp.text().await.unwrap_or_default();
                        let text_lower = text.to_lowercase();

                        // Soft-404 rejection: if probing .git or .env and received an HTML document, skip as false positive!
                        if (path.starts_with("/.git") || path == "/.env") && (text_lower.contains("<!doctype html") || text_lower.contains("<html")) {
                            continue;
                        }

                        // Specific checks for .env
                        let matches_indicator = if path == "/.env" {
                            text.contains("DB_") || text.contains("APP_") || text.contains("SECRET=") || text.contains("PASSWORD=") || text.contains("API_KEY=") || text.contains("PORT=")
                        } else {
                            text.contains(indicator)
                        };

                        if matches_indicator {
                            endpoints.push(DiscoveredEndpoint {
                                id: Uuid::new_v4().to_string(),
                                target_id: target_id.to_string(),
                                url: url_str.to_string(),
                                method: "GET".to_string(),
                                status_code: status,
                                content_type: Some("text/plain".to_string()),
                                source: "sensitive_probe".to_string(),
                                discovered_at: chrono::Utc::now().to_rfc3339(),
                            });

                            if severity != FindingSeverity::Info {
                                findings.push(Finding::new(
                                    target_id.to_string(),
                                    title.to_string(),
                                    severity,
                                    100,
                                    url_str.to_string(),
                                    format!("Discovered accessible sensitive file at {}. Preview:\n{}", url_str, text.lines().take(3).collect::<Vec<_>>().join("\n")),
                                    "AppSec Crawler".to_string(),
                                    "1.0.0".to_string(),
                                    Some("CWE-538".to_string()),
                                    "Immediately restrict public HTTP access to administrative, environment, and VCS files via web server configuration.".to_string(),
                                ));
                            }
                        }
                    }
                }
            }
        }
    }

    fn normalize_url(raw: &str) -> String {
        if let Ok(mut parsed) = Url::parse(raw) {
            parsed.set_fragment(None);
            let s = parsed.to_string();
            if s.ends_with('/') && s.len() > 10 {
                s[..s.len() - 1].to_string()
            } else {
                s
            }
        } else {
            raw.to_string()
        }
    }
}
