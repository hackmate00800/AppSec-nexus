# AppSec Nexus --- Threat Model & Security Architecture

## 1. Asset Classification
- **Primary Assets:**
  - Local database (`appsec.db`): Contains configured targets, scan scopes, discovered URLs, vulnerability findings, and evidence metadata.
  - Scan Artifacts & Evidence: HTTP request/response snippets, extracted headers, endpoint parameters.
  - Model Context & Prompts: User queries and AI mentor explanations.
  - External Tool Binaries: `nuclei.exe`, `httpx.exe`, `nmap.exe`, `ollama.exe`.

## 2. Trust Boundaries
- **Untrusted Zone:**
  - Remote target web applications and servers under assessment.
  - Server response headers, response bodies, and scraped HTML contents.
  - External report files imported by the user (ZAP JSON, Burp XML).
- **Semi-Trusted Zone:**
  - Local AI Model outputs (Ollama): Model responses are treated as non-executable text and cannot execute system commands.
- **Trusted Zone:**
  - The AppSec Nexus desktop shell (Rust core), local SQLite database, and user-initiated UI actions.

## 3. Threat Scenarios & Mitigations
| Threat | Attack Vector | AppSec Nexus Mitigation |
|---|---|---|
| **SSRF Weaponization** | User or malicious target directs scanner to internal IP / cloud metadata | `ScopeValidator` enforces strict RFC 1918 and loopback blocks before any request is sent. |
| **Command Injection** | Malicious target URL with shell metacharacters passed to CLI tools | Tools run via `tokio::process::Command` without shell interpretation (`cmd.exe /c` avoided), arguments passed as discrete typed strings. |
| **Prompt Injection** | Scanned target embeds malicious instructions in HTML/headers to manipulate AI Mentor | Mentor prompt isolates untrusted finding evidence inside strict delimiter quotes; AI output is sandboxed as text with zero execution rights. |
| **Process Starvation / Hangs** | Target hangs connection indefinitely or streams infinite bytes | Explicit timeouts (`reqwest` client, CLI process timeouts) terminate unresponsive child processes cooperatively. |
| **Memory / Directory Lock** | Concurrent launches causing WebView2 directory lock collision | Session mutex guard focuses existing active window and cleanly aborts duplicate launches without process clobbering. |
