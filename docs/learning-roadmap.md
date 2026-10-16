# AppSec Nexus --- Security Engineering Learning Roadmap

This structured learning progression guides practitioners from cybersecurity fundamentals to advanced web application penetration testing.

## Level 1: Foundations (Networking & HTTP)
- [ ] Understand TCP 3-way handshakes, UDP, IP addressing, subnets (CIDR), and DNS record types (A, AAAA, CNAME, TXT, MX).
- [ ] Master HTTP request/response semantics: Methods (`GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `HEAD`), Status code categories (`2xx`, `3xx`, `4xx`, `5xx`), and request/response headers.
- [ ] Master TLS/SSL fundamentals: Certificates, CAs, cipher suites, Handshakes, and HTTPS redirect mechanisms.
- [ ] Practice: Inspect network packets with Wireshark and intercept requests with a proxy.

## Level 2: Web Architecture & Defensive Headers
- [ ] Study frontend vs backend trust boundaries, sessions, cookies, JWTs, OAuth 2.0 flows, and CORS preflight requests.
- [ ] Audit HTTP security headers: CSP syntax, directives (`default-src`, `script-src`, `object-src`), HSTS preloading, and Clickjacking mitigation via `X-Frame-Options`.
- [ ] Practice: Deploy an intentionally insecure lab (OWASP Juice Shop) locally via Docker or Node.js.

## Level 3: OWASP Top 10 & Vulnerability Analysis
- [ ] **Injection:** SQL Injection (Error-based, Blind, Time-based), Command Injection.
- [ ] **Broken Access Control:** IDOR/BOLA, privilege escalation (vertical vs horizontal).
- [ ] **Cryptographic Failures:** Weak ciphers, missing encryption in transit/rest.
- [ ] **SSRF:** Internal metadata exploitation (`169.254.169.254`), blind SSRF, DNS rebinding.
- [ ] **Security Misconfigurations:** Default credentials, debug endpoints, exposed admin panels.
- [ ] Practice: Solve PortSwigger Web Security Academy practitioner labs.

## Level 4: Automation & Tool Orchestration
- [ ] Learn template-based vulnerability assessment with Nuclei and custom YAML templates.
- [ ] Master service discovery with Nmap (`-sV`, `-sC`) and HTTP fast probing with `httpx`.
- [ ] Understand scanner safety: rate limiting, depth bounds, non-destructive payloads, and scope validation.

## Level 5: Secure Reporting & Remediation
- [ ] Learn Common Weakness Enumeration (CWE) and CVSS v3.1/v4.0 scoring methodologies.
- [ ] Author professional, actionable remediation guidance with code-level fixes.
- [ ] Collaborate with local AI assistants (Ollama) to synthesize technical findings for engineering and executive audiences.
