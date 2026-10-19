# AppSec Nexus — Operational Considerations, Prerequisites & Known Limitations

**Document Type:** Known Limitations, System Prerequisites & Manual Verification Runbook  
**Version:** 1.0  
**Target Platform:** Windows 10/11 Desktop  

---

## 1. System Prerequisites & Environment Setup

To run AppSec Nexus with full active capabilities, ensure the following environment prerequisites are met:

### A. Ollama Local AI Runtime
- **Requirement:** Ollama installed and serving on `http://127.0.0.1:11434`.
- **Recommended Models:**
  - Quick Security AI: `ollama pull llama3.2:1b` (low VRAM, ~1.3 GB download).
  - Deep Security AI: `ollama pull llama3:8b` (deep reasoning, ~4.7 GB download).
- **Graceful Fallback:** If Ollama is not installed or currently stopped, AppSec Nexus displays an offline indicator badge and continues normal operation for all scanning, reconnaissance, CRUD, and issue documentation workflows.

### B. External Security Scanning Tools (Optional for Extended Checks)
- **Nuclei:** Installed and added to system `PATH` (`nuclei -version`).
- **Nmap:** Nmap Windows binary (`nmap.exe`) available in `tools/bin/` or system `PATH`.
- **httpx:** ProjectDiscovery httpx executable available in `tools/bin/` or `PATH`.
- **Built-in Fallback:** When third-party CLI tools are not present, AppSec Nexus uses first-party baseline checks (HTTP headers, TLS metadata, robots.txt, and low-impact crawling) without throwing unhandled exceptions.

---

## 2. Safe Testing & Authorization Constraints

1. **Authorization Guardrails:**
   - Active security scanning is strictly restricted to targets that have been explicitly declared in the target scope configuration.
   - Loopback (`127.0.0.1`, `localhost`), link-local (`169.254.x.x`), and private network ranges (`10.x.x.x`, `192.168.x.x`) are blocked by default.
   - Testing local vulnerable applications (e.g., OWASP Juice Shop, WebGoat) requires enabling the **Allow Local Lab Testing** checkbox within target configuration.

2. **Non-Destructive Live Probing:**
   - The Validation Engine uses benign test payloads (context-encoded reflection probes, header verification) designed to verify vulnerability existence without modifying database records or triggering denial of service.

---

## 3. Step-by-Step Manual Verification Guide

Follow this guide to manually verify AppSec Nexus in an end-to-end user journey:

### Step 1: Launch Application
1. Run `cargo tauri dev` or launch the production installer.
2. Observe the desktop window opens at the default workspace preset.
3. Verify the navigation sidebar renders with all primary sections:
   - Dashboard, Targets & Scope, Web Scanner, Crawler, Findings & Intel, Issues & Reports, AppSec AI, Cyber Academy, Appearance Settings.

### Step 2: Target & Scope Configuration
1. Click **Targets & Scope** in the sidebar.
2. Click **Add Target** or edit the default target (`Test Shop Lab`).
3. Set Primary URL to `http://localhost:3000`.
4. Enable **Allow Local Lab Testing** for isolated testing.
5. Save target and verify the target card updates immediately.

### Step 3: Run Passive or Baseline Scan
1. Navigate to **Web Scanner**.
2. Select the configured target and click **Start Passive Scan**.
3. Observe real-time progress updates and job completion status.
4. Navigate to **Findings & Intel** to inspect discovered vulnerabilities.

### Step 4: Vulnerability Validation & AI Grounding
1. In the Findings table, click on a finding (e.g. `Reflected XSS`).
2. Click **Validate with Live Probe**.
3. Verify that the confidence score computes and status transitions to `Confirmed`.
4. Open **Security Mentor Chat** and observe that genuine technical facts are provided as system context.

### Step 5: Issue Documentation & Deliverable Export
1. Click **Issues & Reports** in the sidebar.
2. Click **Report New Issue** to document a functional bug or manual vulnerability.
3. Fill in the title, affected component, and reproduction steps, then click **Document Issue**.
4. Click **Generate Formal Report**.
5. Select the **Technical Security Vulnerability Report** template.
6. Verify the live Markdown preview displays formatted sections.
7. Click **Markdown Document (.md)**, **JSON (.json)**, or **Tabular CSV Spreadsheet (.csv)** to verify deliverable export.

### Step 6: Two-Model Ollama AI Workspace
1. Click **AppSec AI** in the sidebar.
2. Verify that exactly two primary model choice cards appear: **Quick Security AI** and **Deep Security AI**.
3. Toggle between Quick and Deep AI; confirm the active role updates smoothly.
4. Open **Model Setup** to verify local installed models are detected.

---

## 4. Known Edge-Case Considerations

| Consideration | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Ollama Service Startup Delay** | On slower machines, Ollama cold-start may take 3–5 seconds to load large models into VRAM. | A visual loading spinner and non-blocking background queue prevent UI freeze during inference. |
| **High Concurrency Scanning on Slow Networks** | Launching multiple external scans simultaneously on constrained networks may lead to packet drops. | Default per-tool concurrency is throttled via token-bucket rate limiting. |
| **Windows Defender False Flags on Security Binaries** | Antivirus solutions may quarantine raw tool executables like `nuclei.exe`. | AppSec Nexus uses verified binary hashes and documents proper folder exclusion procedures in `docs/installation-guide.md`. |
