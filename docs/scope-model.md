# AppSec Nexus --- Scope & Anti-SSRF Defense Model

## 1. Scope Validation Philosophy
Security scanners must never drift outside their intended evaluation zone. AppSec Nexus enforces strict URL validation before any request is scheduled or sent.

## 2. In-Scope Definition
A target URL is strictly evaluated against:
- **Scheme Validation:** Allowed schemes are `http` and `https`. Schemes such as `file://`, `gopher://`, `ldap://`, `ftp://`, or `dict://` are rejected immediately.
- **Port Constraints:** Restricted to approved web and service ports (`80`, `443`, `8080`, `8443`, `3000`).
- **Domain Matching:** Strict hostname parsing via standard URI parsing crates. Wildcard or substring drift is blocked.

## 3. Anti-SSRF & Private Network Defense
To prevent AppSec Nexus from being weaponized against local environments, the `ScopeValidator` enforces:
1. **Loopback Blockade:** `localhost`, `127.0.0.1`, `[::1]` are blocked unless `allow_local_lab = true`.
2. **RFC 1918 Private Ranges:** `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` are rejected by default.
3. **Cloud Metadata IP Blockade:** `169.254.169.254` (AWS, Azure, GCP metadata endpoints) is strictly prohibited.
4. **IPv6 Special Addresses:** IPv4-mapped loopback (`::ffff:127.0.0.1`) and link-local (`fe80::/10`) are blocked.

## 4. Redirect & Discovered URL Revalidation
Every HTTP 3xx redirect encountered during crawling or scanning is routed back through `ScopeValidator::validate_target()` before following. If a target redirects to an internal endpoint or external unapproved domain, the scanner terminates the path immediately.
