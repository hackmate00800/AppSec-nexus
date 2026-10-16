# AppSec Nexus --- Application Security Glossary

This glossary defines key application security concepts, vulnerability classifications, and networking fundamentals implemented across AppSec Nexus.

### Network & Transport Security
- **DNS (Domain Name System):** Resolves human-readable domain names to IP addresses. Vulnerable to DNS rebinding attacks if not checked at connection time.
- **TLS (Transport Layer Security):** Cryptographic protocol encrypting communication over computer networks (HTTPS). Enforces server authenticity and data privacy.
- **HSTS (HTTP Strict Transport Security):** Header informing browsers that the site must only be accessed over HTTPS, preventing downgrade and cookie hijacking attacks.

### HTTP Security Headers & Client-Side Defenses
- **CSP (Content Security Policy):** Restricts the resources (scripts, images, stylesheets) that the browser is allowed to load for a given page, acting as the primary mitigation for Cross-Site Scripting (XSS).
- **CORS (Cross-Origin Resource Sharing):** HTTP-header-based mechanism that allows a server to indicate any origins other than its own from which a browser should permit loading resources. Misconfigurations can lead to unauthorized data extraction.
- **X-Frame-Options:** Prevents clickjacking by controlling whether a page can be rendered inside an `<iframe>` or `<frame>`.
- **Cookie Security Flags:**
  - `HttpOnly`: Blocks client-side JavaScript access to prevent session theft via XSS.
  - `Secure`: Ensures cookies are transmitted solely over encrypted HTTPS connections.
  - `SameSite`: Protects against Cross-Site Request Forgery (CSRF) by regulating when cookies are included in cross-origin requests.

### Core Vulnerability Classes
- **SSRF (Server-Side Request Forgery):** Vulnerability where an attacker tricks a server into making unexpected network requests to internal services, cloud metadata endpoints (`169.254.169.254`), or loopback interfaces.
- **SQLi (SQL Injection):** Injection of malicious SQL statements into backend database queries, allowing data exposure or tampering.
- **XSS (Cross-Site Scripting):** Execution of untrusted scripts in the victim's browser context (Stored, Reflected, or DOM-based).
- **IDOR / BOLA (Insecure Direct Object References / Broken Object Level Authorization):** Failure to verify whether the requesting user is authorized to view or mutate an identified object or record.
- **Path Traversal:** Exploitation of insufficient file path sanitation allowing attackers to access arbitrary files on the filesystem outside the web root (e.g., `../../etc/passwd`).
