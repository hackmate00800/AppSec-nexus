use crate::models::ScopeConfig;
use std::net::{IpAddr, ToSocketAddrs};
use url::Url;

pub struct ScopeValidator;

impl ScopeValidator {
    pub fn is_private_or_sensitive_ip(ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(ipv4) => {
                let octets = ipv4.octets();
                // Loopback 127.0.0.0/8
                if octets[0] == 127 {
                    return true;
                }
                // Private Class A: 10.0.0.0/8
                if octets[0] == 10 {
                    return true;
                }
                // Private Class B: 172.16.0.0/12
                if octets[0] == 172 && (16..=31).contains(&octets[1]) {
                    return true;
                }
                // Private Class C: 192.168.0.0/16
                if octets[0] == 192 && octets[1] == 168 {
                    return true;
                }
                // Cloud Metadata / Link-Local: 169.254.0.0/16
                if octets[0] == 169 && octets[1] == 254 {
                    return true;
                }
                // Broadcast / Unspecified
                if ipv4.is_unspecified() || ipv4.is_broadcast() {
                    return true;
                }
                false
            }
            IpAddr::V6(ipv6) => ipv6.is_loopback() || ipv6.is_unspecified(),
        }
    }

    pub fn validate_target(url_str: &str, scope: &ScopeConfig) -> Result<String, String> {
        let trimmed = url_str.trim();
        if trimmed.is_empty() {
            return Err("Target URL or path cannot be empty".to_string());
        }

        // 1. Check if it's a local file or path (e.g., APK or local source directory)
        let path = std::path::Path::new(trimmed);
        if path.exists() || trimmed.ends_with(".apk") || trimmed.starts_with("file://") {
            return Ok(trimmed.to_string());
        }

        // 2. Prepend scheme if missing (e.g. "example.com" -> "https://example.com", "localhost:8080" -> "http://localhost:8080")
        let normalized = if !trimmed.contains("://") {
            if trimmed.starts_with("localhost") || trimmed.starts_with("127.0.0.1") {
                format!("http://{}", trimmed)
            } else {
                format!("https://{}", trimmed)
            }
        } else {
            trimmed.to_string()
        };

        let parsed = Url::parse(&normalized).map_err(|e| format!("Invalid URL: {}", e))?;

        if parsed.scheme() != "http" && parsed.scheme() != "https" {
            return Err("Only http and https schemes are supported".to_string());
        }

        let host_str = parsed
            .host_str()
            .ok_or_else(|| "URL has no host".to_string())?;

        // Check excluded paths
        for excluded in &scope.excluded_paths {
            if !excluded.is_empty() && parsed.path().starts_with(excluded) {
                return Err(format!(
                    "Path '{}' is explicitly excluded from scope",
                    parsed.path()
                ));
            }
        }

        // Port validation
        let port = parsed.port_or_known_default().unwrap_or(80);
        if !scope.allowed_ports.is_empty() && !scope.allowed_ports.contains(&port) {
            return Err(format!("Port {} is not in the allowed ports scope", port));
        }

        // IP Check (SSRF & Localhost Guard)
        if !scope.allow_local_lab {
            let socket_addr = format!("{}:{}", host_str, port);
            if let Ok(mut addrs) = socket_addr.to_socket_addrs() {
                if let Some(addr) = addrs.next() {
                    let ip = addr.ip();
                    if Self::is_private_or_sensitive_ip(&ip) {
                        return Err(format!(
                            "Blocked sensitive/private IP destination ({}) to prevent SSRF/loopback scanning. Enable 'Lab Mode' if testing local intentionally vulnerable apps.",
                            ip
                        ));
                    }
                }
            }
        }

        // Host validation
        if !scope.allowed_hosts.is_empty() {
            let in_scope = scope.allowed_hosts.iter().any(|allowed| {
                if allowed.starts_with("*.") {
                    let domain_suffix = &allowed[2..];
                    host_str.ends_with(domain_suffix)
                } else {
                    allowed.eq_ignore_ascii_case(host_str)
                }
            });

            if !in_scope {
                return Err(format!(
                    "Host '{}' is not within the authorized scope list",
                    host_str
                ));
            }
        }

        Ok(parsed.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_private_ip_detection() {
        let loopback = IpAddr::from_str("127.0.0.1").unwrap();
        assert!(ScopeValidator::is_private_or_sensitive_ip(&loopback));

        let metadata = IpAddr::from_str("169.254.169.254").unwrap();
        assert!(ScopeValidator::is_private_or_sensitive_ip(&metadata));

        let class_a = IpAddr::from_str("10.0.1.5").unwrap();
        assert!(ScopeValidator::is_private_or_sensitive_ip(&class_a));

        let class_c = IpAddr::from_str("192.168.1.1").unwrap();
        assert!(ScopeValidator::is_private_or_sensitive_ip(&class_c));

        let public_dns = IpAddr::from_str("1.1.1.1").unwrap();
        assert!(!ScopeValidator::is_private_or_sensitive_ip(&public_dns));
    }

    #[test]
    fn test_scope_validation_blocking() {
        let mut scope = ScopeConfig::default();
        scope.allow_local_lab = false;

        // Block loopback without lab mode
        let res = ScopeValidator::validate_target("http://127.0.0.1:8080/test", &scope);
        assert!(res.is_err());

        // Allow when lab mode active
        scope.allow_local_lab = true;
        let res_lab = ScopeValidator::validate_target("http://127.0.0.1:8080/test", &scope);
        assert!(res_lab.is_ok());

        // Disallowed scheme
        let ftp_res = ScopeValidator::validate_target("ftp://example.com/file", &scope);
        assert!(ftp_res.is_err());

        // Excluded path
        let excluded_res = ScopeValidator::validate_target("http://127.0.0.1:8080/logout", &scope);
        assert!(excluded_res.is_err());

        // Bare domain auto-normalization
        let bare_res = ScopeValidator::validate_target("example.com", &scope);
        assert!(bare_res.is_ok());
        assert_eq!(bare_res.unwrap(), "https://example.com/");

        // Local APK target path
        let apk_res = ScopeValidator::validate_target("sample_vulnerable.apk", &scope);
        assert!(apk_res.is_ok());
        assert_eq!(apk_res.unwrap(), "sample_vulnerable.apk");
    }
}

