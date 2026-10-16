# AppSec Nexus --- Authorization & Acceptable Use Policy

## 1. Core Principle: Explicit Authorization
AppSec Nexus is designed solely for authorized security assessments, defensive testing, educational research, and internal systems auditing.

> **Absolute Rule:** Active vulnerability assessments, automated fuzzing, or port discovery MUST only be performed against systems:
> 1. You own directly, or
> 2. You possess explicit, written, and verifiable permission to assess (e.g., Bug Bounty program scope, penetration testing engagement agreement).

## 2. Permitted Testing Types
- **Passive Analysis:** Header inspection, TLS certificate evaluation, public sitemap/robots.txt reading, local artifact imports.
- **Controlled Active Scanning:** Parameter probing, crawl analysis, and vulnerability template execution within approved rate and depth boundaries.

## 3. Strict Prohibitions
Under no circumstances should AppSec Nexus be configured or used to:
- Perform Denial of Service (DoS/DDoS) stress testing.
- Target critical infrastructure, healthcare, or life-safety systems.
- Probe third-party domains outside authorized bug bounty scopes.
- Store, harvest, or exfiltrate plaintext credentials, session tokens, or personal data (PII).

## 4. Local Lab & Offline Boundary Guarantee
- By default, AppSec Nexus blocks loopback (`127.0.0.1`, `::1`), link-local, and private RFC-1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) to protect internal environments.
- Local labs (OWASP Juice Shop, WebGoat) require an explicit user opt-in toggle per target (`allow_local_lab = true`).
- AI analysis runs strictly on your local machine via Ollama; no scan logs, URLs, or findings are ever sent to remote cloud providers.
