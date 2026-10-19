use crate::models::{Finding, FindingSeverity, FindingStatus};
use regex::Regex;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tauri::Emitter;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpConnectorStatus {
    pub is_running: bool,
    pub host: String,
    pub port: u16,
    pub token: String,
    pub total_ingested: usize,
    pub last_ingested_at: Option<String>,
}

impl Default for BurpConnectorStatus {
    fn default() -> Self {
        Self {
            is_running: false,
            host: "127.0.0.1".to_string(),
            port: 41785,
            token: String::new(),
            total_ingested: 0,
            last_ingested_at: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpFindingImportItem {
    pub title: String,
    pub severity: Option<String>,
    pub confidence: Option<u8>,
    pub affected_asset: Option<String>,
    pub url: Option<String>,
    pub parameter: Option<String>,
    pub evidence: Option<String>,
    pub remediation: Option<String>,
    pub cwe: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpTrafficIngestionEvent {
    pub count: usize,
    pub duplicates_skipped: usize,
    pub latest_item: Option<BurpTrafficItem>,
}

static CONNECTOR_STATUS: std::sync::LazyLock<Arc<RwLock<BurpConnectorStatus>>> =
    std::sync::LazyLock::new(|| Arc::new(RwLock::new(BurpConnectorStatus::default())));

pub fn get_connector_status() -> BurpConnectorStatus {
    CONNECTOR_STATUS.read().unwrap().clone()
}

pub fn update_connector_token(token: &str) {
    let mut st = CONNECTOR_STATUS.write().unwrap();
    st.token = token.to_string();
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpConnectionConfig {
    pub host: String,
    pub port: u16,
    pub auto_connect: bool,
}

impl Default for BurpConnectionConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            auto_connect: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpConnectionStatus {
    pub is_connected: bool,
    pub host: String,
    pub port: u16,
    pub latency_ms: Option<u64>,
    pub burp_edition: Option<String>,
    pub is_burp: bool,
    pub port_conflict_detected: bool,
    pub conflicting_service: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpRepeaterRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub use_proxy: bool,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpRepeaterResponse {
    pub status_code: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub latency_ms: u64,
    pub content_length: usize,
    pub routed_via_proxy: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurpTrafficItem {
    pub id: String,
    pub timestamp: String,
    pub method: String,
    pub url: String,
    pub host: String,
    pub path: String,
    pub status_code: u16,
    pub request_headers: HashMap<String, String>,
    pub request_body: Option<String>,
    pub response_headers: HashMap<String, String>,
    pub response_body: Option<String>,
    pub response_size: usize,
    pub latency_ms: u64,
    pub source: String,
    pub is_tls: bool,
}

pub struct BurpService;

impl BurpService {
    /// Tests HTTP connectivity to a configured Burp Suite Proxy listener.
    /// Accurately detects port conflicts (e.g., Jenkins running on port 8080).
    pub async fn test_connection(host: &str, port: u16) -> BurpConnectionStatus {
        let test_url = format!("http://{}:{}/", host, port);
        let start = Instant::now();

        let client = match reqwest::Client::builder()
            .timeout(Duration::from_millis(3000))
            .danger_accept_invalid_certs(true)
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                return BurpConnectionStatus {
                    is_connected: false,
                    host: host.to_string(),
                    port,
                    latency_ms: None,
                    burp_edition: None,
                    is_burp: false,
                    port_conflict_detected: false,
                    conflicting_service: None,
                    message: format!("Failed to initialize HTTP probe client: {}", e),
                };
            }
        };

        match client.get(&test_url).send().await {
            Ok(response) => {
                let latency = start.elapsed().as_millis() as u64;
                let status_code = response.status().as_u16();

                // Inspect response headers and body
                let mut is_jenkins = false;
                let mut server_header = String::new();

                if let Some(h) = response.headers().get("X-Jenkins") {
                    if let Ok(val) = h.to_str() {
                        is_jenkins = true;
                        server_header = format!("Jenkins {}", val);
                    }
                }

                if let Some(s) = response.headers().get("Server") {
                    if let Ok(val) = s.to_str() {
                        if server_header.is_empty() {
                            server_header = val.to_string();
                        } else {
                            server_header = format!("{} / {}", server_header, val);
                        }
                        if val.to_lowercase().contains("jetty") && !is_jenkins {
                            is_jenkins = true;
                        }
                    }
                }

                let body_text = response.text().await.unwrap_or_default();
                let body_lower = body_text.to_lowercase();

                if is_jenkins || body_lower.contains("jenkins") {
                    return BurpConnectionStatus {
                        is_connected: false,
                        host: host.to_string(),
                        port,
                        latency_ms: Some(latency),
                        burp_edition: None,
                        is_burp: false,
                        port_conflict_detected: true,
                        conflicting_service: Some(if server_header.is_empty() {
                            "Jenkins CI/CD".to_string()
                        } else {
                            server_header
                        }),
                        message: format!(
                            "Port conflict detected on port {}: A Jenkins CI/CD instance is occupying this port. In Burp Suite, please go to 'Proxy' -> 'Proxy settings' -> 'Proxy listeners' and change the listener port to 8081 or 8082, then update the port in AppSec.",
                            port
                        ),
                    };
                }

                // Check for Burp signature
                let is_burp = body_lower.contains("burp suite")
                    || body_lower.contains("portswigger")
                    || body_lower.contains("/burp/cert")
                    || body_text.contains("Burp");

                if is_burp {
                    return BurpConnectionStatus {
                        is_connected: true,
                        host: host.to_string(),
                        port,
                        latency_ms: Some(latency),
                        burp_edition: Some("Burp Suite Community / Professional".to_string()),
                        is_burp: true,
                        port_conflict_detected: false,
                        conflicting_service: None,
                        message: format!(
                            "Successfully connected to Burp Suite Proxy listener at {}:{} ({}ms).",
                            host, port, latency
                        ),
                    };
                }

                // If it returned 200/400/403/502 from a proxy but no explicit Burp signature:
                BurpConnectionStatus {
                    is_connected: false,
                    host: host.to_string(),
                    port,
                    latency_ms: Some(latency),
                    burp_edition: None,
                    is_burp: false,
                    port_conflict_detected: true,
                    conflicting_service: Some(if server_header.is_empty() {
                        format!("HTTP Service (HTTP {})", status_code)
                    } else {
                        server_header
                    }),
                    message: format!(
                        "Service reachable on port {}, but did not return a Burp Suite Proxy signature. Verify your Burp Suite listener settings.",
                        port
                    ),
                }
            }
            Err(e) => {
                BurpConnectionStatus {
                    is_connected: false,
                    host: host.to_string(),
                    port,
                    latency_ms: None,
                    burp_edition: None,
                    is_burp: false,
                    port_conflict_detected: false,
                    conflicting_service: None,
                    message: format!(
                        "Could not connect to {}:{}. Ensure Burp Suite is running and the Proxy Listener is enabled in Proxy Settings. ({})",
                        host, port, e
                    ),
                }
            }
        }
    }

    /// Replays or sends an HTTP request optionally routed through Burp Suite proxy.
    pub async fn send_repeater_request(
        req: BurpRepeaterRequest,
    ) -> Result<BurpRepeaterResponse, String> {
        let timeout_sec = req.timeout_seconds.unwrap_or(15);
        let mut builder = reqwest::Client::builder()
            .timeout(Duration::from_secs(timeout_sec))
            .danger_accept_invalid_certs(true);

        if req.use_proxy {
            let p_host = req.proxy_host.as_deref().unwrap_or("127.0.0.1");
            let p_port = req.proxy_port.unwrap_or(8080);
            let proxy_url = format!("http://{}:{}", p_host, p_port);
            let proxy = reqwest::Proxy::all(&proxy_url)
                .map_err(|e| format!("Invalid proxy URL '{}': {}", proxy_url, e))?;
            builder = builder.proxy(proxy);
        }

        let client = builder
            .build()
            .map_err(|e| format!("Failed to build HTTP repeater client: {}", e))?;

        let method = match req.method.to_uppercase().as_str() {
            "GET" => reqwest::Method::GET,
            "POST" => reqwest::Method::POST,
            "PUT" => reqwest::Method::PUT,
            "DELETE" => reqwest::Method::DELETE,
            "PATCH" => reqwest::Method::PATCH,
            "HEAD" => reqwest::Method::HEAD,
            "OPTIONS" => reqwest::Method::OPTIONS,
            _ => reqwest::Method::GET,
        };

        let mut request_builder = client.request(method, &req.url);

        // Attach custom headers
        let mut headers = HeaderMap::new();
        for (k, v) in req.headers {
            if let (Ok(hname), Ok(hval)) = (HeaderName::from_str(&k), HeaderValue::from_str(&v)) {
                headers.insert(hname, hval);
            }
        }
        request_builder = request_builder.headers(headers);

        // Attach request body if provided
        if let Some(body_content) = req.body {
            if !body_content.is_empty() {
                request_builder = request_builder.body(body_content);
            }
        }

        let start = Instant::now();
        let response = request_builder
            .send()
            .await
            .map_err(|e| format!("Repeater HTTP request failed: {}", e))?;

        let latency_ms = start.elapsed().as_millis() as u64;
        let status_code = response.status().as_u16();
        let status_text = response.status().canonical_reason().unwrap_or("").to_string();

        let mut res_headers = HashMap::new();
        for (k, v) in response.headers().iter() {
            if let Ok(v_str) = v.to_str() {
                res_headers.insert(k.as_str().to_string(), v_str.to_string());
            }
        }

        let body_str = response
            .text()
            .await
            .unwrap_or_else(|_| "<Binary or unreadable body>".to_string());
        let content_length = body_str.len();

        Ok(BurpRepeaterResponse {
            status_code,
            status_text,
            headers: res_headers,
            body: body_str,
            latency_ms,
            content_length,
            routed_via_proxy: req.use_proxy,
        })
    }

    /// Automatically redacts sensitive authentication credentials, tokens, and cookies
    pub fn redact_sensitive_data(input: &str) -> String {
        // Redact Bearer and JWT tokens
        let bearer_re = Regex::new(r"(?i)(authorization:\s*bearer\s+)[A-Za-z0-9_\-\.]{8,}").unwrap();
        let s1 = bearer_re.replace_all(input, "$1[REDACTED_BEARER_TOKEN]");

        // Redact Cookie session values
        let cookie_re = Regex::new(r"(?i)(cookie:\s*.*?(?:session|token|auth|jwt|phpsessid|jsessionid)=)[^;\s&]+").unwrap();
        let s2 = cookie_re.replace_all(&s1, "$1[REDACTED_SESSION_COOKIE]");

        // Redact API key params
        let api_key_re = Regex::new(r"(?i)(api[_-]?key|secret|access[_-]?token|password|passwd)=([^&\s]+)").unwrap();
        let s3 = api_key_re.replace_all(&s2, "$1=[REDACTED_CREDENTIAL]");

        s3.to_string()
    }

    /// Parses Burp Suite XML reports, extracts issues, normalizes confidence and severity,
    /// redacts sensitive evidence tokens, and marks status as NeedsValidation.
    pub fn parse_burp_xml(target_id: &str, content: &str) -> Result<Vec<Finding>, String> {
        let issue_re = Regex::new(r"(?s)<issue>(.*?)</issue>").unwrap();
        let name_re = Regex::new(r"<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</name>").unwrap();
        let severity_re = Regex::new(r"<severity>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</severity>").unwrap();
        let confidence_re = Regex::new(r"<confidence>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</confidence>").unwrap();
        let host_re = Regex::new(r"<host[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</host>").unwrap();
        let path_re = Regex::new(r"<path[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</path>").unwrap();
        let detail_re = Regex::new(r"<issueDetail>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</issueDetail>").unwrap();
        let background_re = Regex::new(r"<issueBackground>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</issueBackground>").unwrap();
        let remediation_re = Regex::new(r"<remediationBackground>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</remediationBackground>").unwrap();
        let cwe_re = Regex::new(r"(?i)CWE-(\d+)").unwrap();

        let mut findings = Vec::new();

        for cap in issue_re.captures_iter(content) {
            let block = &cap[1];

            let title = name_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_else(|| "Burp Suite Issue".to_string());

            let sev_str = severity_re
                .captures(block)
                .map(|m| m[1].trim().to_lowercase())
                .unwrap_or_default();

            let severity = match sev_str.as_str() {
                "critical" => FindingSeverity::Critical,
                "high" => FindingSeverity::High,
                "medium" => FindingSeverity::Medium,
                "low" => FindingSeverity::Low,
                _ => FindingSeverity::Info,
            };

            let conf_str = confidence_re
                .captures(block)
                .map(|m| m[1].trim().to_lowercase())
                .unwrap_or_default();

            let confidence = match conf_str.as_str() {
                "certain" => 100,
                "firm" => 80,
                "tentative" => 50,
                _ => 85,
            };

            let host = host_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_default();

            let path = path_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_default();

            let affected_asset = if !host.is_empty() {
                format!("{}{}", host, path)
            } else {
                path
            };

            let raw_detail = detail_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .or_else(|| background_re.captures(block).map(|m| m[1].trim().to_string()))
                .unwrap_or_else(|| "Exported from Burp Suite assessment.".to_string());

            // Redact any credentials or session keys in evidence
            let detail = Self::redact_sensitive_data(&raw_detail);

            let remediation = remediation_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_else(|| "Consult vendor and OWASP recommendations for remediation.".to_string());

            let cwe = cwe_re.captures(block).map(|m| format!("CWE-{}", &m[1]));

            let mut finding = Finding::new(
                target_id.to_string(),
                title,
                severity,
                confidence,
                affected_asset,
                detail,
                "Burp Suite (Imported)".to_string(),
                "Community/Pro".to_string(),
                cwe,
                remediation,
            );

            // Mark explicitly as unconfirmed / needs validation
            finding.status = FindingStatus::NeedsValidation;
            finding.validation_status = "NEEDS_VALIDATION".to_string();

            findings.push(finding);
        }

        if findings.is_empty() {
            return Err("No <issue> blocks found in Burp Suite XML data".to_string());
        }

        Ok(findings)
    }

    /// Computes deterministic SHA-256 fingerprint for traffic deduplication
    pub fn compute_traffic_hash(item: &BurpTrafficItem) -> String {
        let mut hasher = Sha256::new();
        hasher.update(item.method.as_bytes());
        hasher.update(b"|");
        hasher.update(item.url.as_bytes());
        hasher.update(b"|");
        if let Some(ref req_b) = item.request_body {
            hasher.update(req_b.as_bytes());
        }
        hasher.update(b"|");
        if let Some(ref res_b) = item.response_body {
            hasher.update(res_b.as_bytes());
        }
        format!("{:x}", hasher.finalize())
    }

    /// Parses JSON traffic payload (array of items or wrapper object), redacting secrets
    pub fn parse_burp_json_traffic(content: &str) -> Result<Vec<BurpTrafficItem>, String> {
        let trimmed = content.trim();
        let items: Vec<BurpTrafficItem> = if trimmed.starts_with('[') {
            serde_json::from_str(trimmed).map_err(|e| format!("Failed to parse traffic array: {}", e))?
        } else if trimmed.starts_with('{') {
            if let Ok(wrapper) = serde_json::from_str::<serde_json::Value>(trimmed) {
                if let Some(arr) = wrapper.get("traffic").and_then(|t| t.as_array()) {
                    serde_json::from_value(serde_json::Value::Array(arr.clone()))
                        .map_err(|e| format!("Failed to parse traffic wrapper: {}", e))?
                } else {
                    let single: BurpTrafficItem = serde_json::from_str(trimmed)
                        .map_err(|e| format!("Failed to parse single traffic item: {}", e))?;
                    vec![single]
                }
            } else {
                return Err("Invalid JSON structure".to_string());
            }
        } else {
            return Err("Payload is not valid JSON".to_string());
        };

        let cleaned: Vec<BurpTrafficItem> = items
            .into_iter()
            .map(|mut it| {
                if it.id.is_empty() {
                    it.id = uuid::Uuid::new_v4().to_string();
                }
                if let Some(ref rb) = it.request_body {
                    it.request_body = Some(Self::redact_sensitive_data(rb));
                }
                if let Some(ref rsb) = it.response_body {
                    it.response_body = Some(Self::redact_sensitive_data(rsb));
                }
                for (_, v) in it.request_headers.iter_mut() {
                    *v = Self::redact_sensitive_data(v);
                }
                for (_, v) in it.response_headers.iter_mut() {
                    *v = Self::redact_sensitive_data(v);
                }
                it
            })
            .collect();

        Ok(cleaned)
    }

    /// Parses JSON findings exported by Burp Community extensions, marking as NeedsValidation
    pub fn parse_burp_json_findings(
        target_id: &str,
        content: &str,
    ) -> Result<Vec<Finding>, String> {
        let trimmed = content.trim();
        let raw_items: Vec<BurpFindingImportItem> = if trimmed.starts_with('[') {
            serde_json::from_str(trimmed).map_err(|e| format!("Failed to parse findings array: {}", e))?
        } else if trimmed.starts_with('{') {
            if let Ok(wrapper) = serde_json::from_str::<serde_json::Value>(trimmed) {
                if let Some(arr) = wrapper.get("findings").or_else(|| wrapper.get("issues")).and_then(|f| f.as_array()) {
                    serde_json::from_value(serde_json::Value::Array(arr.clone()))
                        .map_err(|e| format!("Failed to parse findings wrapper: {}", e))?
                } else {
                    let single: BurpFindingImportItem = serde_json::from_str(trimmed)
                        .map_err(|e| format!("Failed to parse single finding: {}", e))?;
                    vec![single]
                }
            } else {
                return Err("Invalid JSON structure".to_string());
            }
        } else {
            return Err("Payload is not valid JSON".to_string());
        };

        let mut findings = Vec::new();
        for item in raw_items {
            let sev = match item.severity.as_deref().unwrap_or("Info").to_lowercase().as_str() {
                "critical" => FindingSeverity::Critical,
                "high" => FindingSeverity::High,
                "medium" => FindingSeverity::Medium,
                "low" => FindingSeverity::Low,
                _ => FindingSeverity::Info,
            };

            let affected = item
                .affected_asset
                .or(item.url)
                .unwrap_or_else(|| "Target Asset".to_string());

            let raw_ev = item.evidence.unwrap_or_else(|| item.description.clone().unwrap_or_default());
            let redacted_evidence = Self::redact_sensitive_data(&raw_ev);

            let mut f = Finding::new(
                target_id.to_string(),
                item.title,
                sev,
                item.confidence.unwrap_or(80),
                affected,
                redacted_evidence,
                "Burp Community Extension".to_string(),
                "1.0".to_string(),
                item.cwe,
                item.remediation.unwrap_or_else(|| "Remediate per OWASP recommendations.".to_string()),
            );
            f.status = FindingStatus::NeedsValidation;
            f.validation_status = "NEEDS_VALIDATION".to_string();
            findings.push(f);
        }

        Ok(findings)
    }
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|window| window == needle)
}

pub async fn start_burp_connector_server(
    db: Arc<crate::db::Database>,
    app_handle: Option<tauri::AppHandle>,
) {
    let token = match db.get_or_create_burp_token() {
        Ok(t) => t,
        Err(_) => format!("appsec_{}", uuid::Uuid::new_v4().simple()),
    };

    let mut selected_port = 41785;
    let mut listener = None;
    for port in 41785..41795 {
        if let Ok(l) = TcpListener::bind(format!("127.0.0.1:{}", port)).await {
            selected_port = port;
            listener = Some(l);
            break;
        }
    }

    let listener = match listener {
        Some(l) => l,
        None => {
            eprintln!("[Burp Connector] Failed to bind to loopback port 41785-41795");
            return;
        }
    };

    {
        let mut st = CONNECTOR_STATUS.write().unwrap();
        st.is_running = true;
        st.host = "127.0.0.1".to_string();
        st.port = selected_port;
        st.token = token.clone();
    }

    loop {
        let (mut socket, peer_addr) = match listener.accept().await {
            Ok(conn) => conn,
            Err(_) => continue,
        };

        if !peer_addr.ip().is_loopback() {
            continue;
        }

        let db_clone = db.clone();
        let app_handle_clone = app_handle.clone();
        let expected_token = {
            CONNECTOR_STATUS.read().unwrap().token.clone()
        };

        tokio::spawn(async move {
            let mut buf = vec![0u8; 1024 * 1024 * 10]; // max 10MB
            let mut total_read = 0;
            let mut header_end_pos = None;
            let mut content_length = 0usize;

            while total_read < buf.len() {
                let n = match socket.read(&mut buf[total_read..]).await {
                    Ok(0) => break,
                    Ok(n) => n,
                    Err(_) => return,
                };
                total_read += n;

                if header_end_pos.is_none() {
                    if let Some(pos) = find_subsequence(&buf[..total_read], b"\r\n\r\n") {
                        header_end_pos = Some(pos);
                        let header_str = String::from_utf8_lossy(&buf[..pos]);
                        for line in header_str.lines() {
                            if line.to_lowercase().starts_with("content-length:") {
                                if let Some(val) = line.split(':').nth(1) {
                                    content_length = val.trim().parse::<usize>().unwrap_or(0);
                                }
                            }
                        }
                    }
                }

                if let Some(pos) = header_end_pos {
                    let body_read = total_read.saturating_sub(pos + 4);
                    if body_read >= content_length {
                        break;
                    }
                }
            }

            if total_read == 0 {
                return;
            }

            let head_end = match header_end_pos {
                Some(p) => p,
                None => {
                    let _ = socket.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n").await;
                    return;
                }
            };

            let header_str = String::from_utf8_lossy(&buf[..head_end]);
            let body_bytes = &buf[(head_end + 4)..total_read];
            let body_str = String::from_utf8_lossy(body_bytes);

            let first_line = header_str.lines().next().unwrap_or("");
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            if parts.len() < 2 {
                let _ = socket.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n").await;
                return;
            }

            let method = parts[0];
            let path = parts[1];

            if method == "OPTIONS" {
                let cors_resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-AppSec-Token, Authorization\r\nContent-Length: 0\r\n\r\n";
                let _ = socket.write_all(cors_resp.as_bytes()).await;
                return;
            }

            if method == "GET" && (path == "/api/health" || path == "/health") {
                let json = serde_json::json!({
                    "status": "ok",
                    "app": "AppSec Nexus",
                    "version": "0.1.0",
                    "connector": "Burp Community Ingestion Connector",
                    "timestamp": chrono::Utc::now().to_rfc3339()
                });
                let payload = json.to_string();
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                    payload.len(),
                    payload
                );
                let _ = socket.write_all(resp.as_bytes()).await;
                return;
            }

            let mut provided_token = None;
            for line in header_str.lines() {
                let lower = line.to_lowercase();
                if lower.starts_with("x-appsec-token:") {
                    if let Some(val) = line.split(':').nth(1) {
                        provided_token = Some(val.trim().to_string());
                    }
                } else if lower.starts_with("authorization: bearer ") {
                    if let Some(val) = line.split_whitespace().nth(2) {
                        provided_token = Some(val.trim().to_string());
                    }
                }
            }

            let token_valid = match provided_token {
                Some(ref t) => t == &expected_token,
                None => false,
            };

            if !token_valid {
                let err_json = serde_json::json!({
                    "error": "Unauthorized",
                    "message": "Missing or invalid X-AppSec-Token header. Verify the token configured in Burp Suite AppSec tab."
                });
                let payload = err_json.to_string();
                let resp = format!(
                    "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                    payload.len(),
                    payload
                );
                let _ = socket.write_all(resp.as_bytes()).await;
                return;
            }

            if method == "POST" && (path == "/api/burp/traffic" || path == "/traffic") {
                match BurpService::parse_burp_json_traffic(&body_str) {
                    Ok(items) => {
                        let mut inserted_count = 0;
                        let mut skipped_count = 0;
                        let mut latest_item = None;

                        for item in &items {
                            let hash = BurpService::compute_traffic_hash(item);
                            match db_clone.insert_burp_traffic(item, &hash) {
                                Ok(true) => {
                                    inserted_count += 1;
                                    latest_item = Some(item.clone());
                                }
                                Ok(false) => {
                                    skipped_count += 1;
                                }
                                Err(e) => {
                                    eprintln!("[Burp Connector] DB insert error: {}", e);
                                }
                            }
                        }

                        {
                            let mut st = CONNECTOR_STATUS.write().unwrap();
                            st.total_ingested += inserted_count;
                            st.last_ingested_at = Some(chrono::Utc::now().to_rfc3339());
                        }

                        if let Some(ref handle) = app_handle_clone {
                            let _ = handle.emit(
                                "burp-traffic-received",
                                BurpTrafficIngestionEvent {
                                    count: inserted_count,
                                    duplicates_skipped: skipped_count,
                                    latest_item,
                                },
                            );
                        }

                        let res_json = serde_json::json!({
                            "success": true,
                            "ingested": inserted_count,
                            "duplicates_skipped": skipped_count,
                            "total_received": items.len()
                        });
                        let payload = res_json.to_string();
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                            payload.len(),
                            payload
                        );
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    Err(err) => {
                        let err_json = serde_json::json!({ "error": "Invalid traffic payload", "details": err });
                        let payload = err_json.to_string();
                        let resp = format!(
                            "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                            payload.len(),
                            payload
                        );
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                }
                return;
            }

            if method == "POST" && (path == "/api/burp/findings" || path == "/findings") {
                let target_id = "burp-default-target";
                match BurpService::parse_burp_json_findings(target_id, &body_str) {
                    Ok(findings) => {
                        let mut imported_count = 0;
                        for f in &findings {
                            if db_clone.insert_finding(f).is_ok() {
                                imported_count += 1;
                            }
                        }

                        if let Some(ref handle) = app_handle_clone {
                            let _ = handle.emit("burp-findings-received", imported_count);
                        }

                        let res_json = serde_json::json!({
                            "success": true,
                            "imported": imported_count
                        });
                        let payload = res_json.to_string();
                        let resp = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                            payload.len(),
                            payload
                        );
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                    Err(err) => {
                        let err_json = serde_json::json!({ "error": "Invalid findings payload", "details": err });
                        let payload = err_json.to_string();
                        let resp = format!(
                            "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                            payload.len(),
                            payload
                        );
                        let _ = socket.write_all(resp.as_bytes()).await;
                    }
                }
                return;
            }

            let resp = "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 27\r\n\r\n{\"error\": \"Route not found\"}";
            let _ = socket.write_all(resp.as_bytes()).await;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_burp_xml_parsing_and_redaction() {
        let sample_xml = r#"
        <issues>
          <issue>
            <name><![CDATA[SQL Injection in /api/users]]></name>
            <severity>High</severity>
            <confidence>Certain</confidence>
            <host ip="192.168.1.10">https://api.internal</host>
            <path>/api/users?id=1'</path>
            <issueDetail><![CDATA[Error based SQLi. Request Header Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secretpayload sent.]]></issueDetail>
            <issueBackground>SQL injection permits unauthorized database queries.</issueBackground>
            <remediationBackground>Use parameterized prepared statements.</remediationBackground>
            <vulnerabilityClassifications>CWE-89</vulnerabilityClassifications>
          </issue>
        </issues>
        "#;

        let findings = BurpService::parse_burp_xml("test-target", sample_xml).unwrap();
        assert_eq!(findings.len(), 1);
        let f = &findings[0];
        assert_eq!(f.title, "SQL Injection in /api/users");
        assert_eq!(f.severity, FindingSeverity::High);
        assert_eq!(f.confidence, 100);
        assert_eq!(f.affected_asset, "https://api.internal/api/users?id=1'");
        assert_eq!(f.cwe, Some("CWE-89".to_string()));
        assert_eq!(f.status, FindingStatus::NeedsValidation);
        assert!(f.evidence.contains("[REDACTED_BEARER_TOKEN]"));
        assert!(!f.evidence.contains("secretpayload"));
    }

    #[test]
    fn test_secret_redaction_regex() {
        let input = "Cookie: session=xyz123456789; other=1\nAuthorization: Bearer secret_jwt_token_here_1234\nparam api_key=supersecretkey";
        let redacted = BurpService::redact_sensitive_data(input);
        assert!(redacted.contains("[REDACTED_SESSION_COOKIE]"));
        assert!(redacted.contains("[REDACTED_BEARER_TOKEN]"));
        assert!(redacted.contains("[REDACTED_CREDENTIAL]"));
        assert!(!redacted.contains("secret_jwt_token_here_1234"));
    }

    #[test]
    fn test_json_findings_and_traffic_parsing() {
        let sample_json_traffic = r#"[
            {
                "id": "item-101",
                "timestamp": "12:00:00",
                "method": "POST",
                "url": "https://example.com/api/login",
                "host": "example.com",
                "path": "/api/login",
                "status_code": 200,
                "request_headers": { "Authorization": "Bearer sensitive_token_abc123" },
                "request_body": "{\"password\":\"mysecretpass\"}",
                "response_headers": { "Set-Cookie": "session=sensitive_cookie_999" },
                "response_body": "{\"auth\":true}",
                "response_size": 14,
                "latency_ms": 35,
                "source": "Burp Community Extension",
                "is_tls": true
            }
        ]"#;

        let traffic = BurpService::parse_burp_json_traffic(sample_json_traffic).unwrap();
        assert_eq!(traffic.len(), 1);
        assert_eq!(traffic[0].method, "POST");
        assert_eq!(traffic[0].request_headers.get("Authorization").unwrap(), "Bearer [REDACTED_BEARER_TOKEN]");
        assert!(traffic[0].request_body.as_ref().unwrap().contains("[REDACTED_CREDENTIAL]"));

        let sample_json_findings = r#"[
            {
                "title": "Broken Access Control",
                "severity": "High",
                "confidence": 90,
                "url": "https://example.com/admin",
                "evidence": "Authorization: Bearer test_token_xyz987 permitted admin access",
                "cwe": "CWE-284"
            }
        ]"#;

        let findings = BurpService::parse_burp_json_findings("t1", sample_json_findings).unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].title, "Broken Access Control");
        assert_eq!(findings[0].severity, FindingSeverity::High);
        assert_eq!(findings[0].status, FindingStatus::NeedsValidation);
        assert!(findings[0].evidence.contains("[REDACTED_BEARER_TOKEN]"));
    }
}
