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
        let parsed = Url::parse(url_str).map_err(|e| format!("Invalid URL: {}", e))?;

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
