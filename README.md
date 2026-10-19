# 🛡️ AppSec Nexus

**Next-Generation Desktop Cybersecurity, Vulnerability Management & Application Security Assessment Platform**

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue?logo=tauri)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2024%20Edition-orange?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%203-003B57?logo=sqlite)](https://www.sqlite.org/)
[![AI Offline](https://img.shields.io/badge/Local%20AI-Ollama%20Native-black?logo=ollama)](https://ollama.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Implemented Capabilities](#-implemented-capabilities)
  - [Roadmap & Planned Capabilities](#-roadmap--planned-capabilities)
- [Security Testing Categories](#-security-testing-categories)
- [AI Mentor Engine](#-ai-mentor-engine)
- [Screenshots & User Interface](#-screenshots--user-interface)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Prerequisites & System Requirements](#-prerequisites--system-requirements)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Development, Testing & Build Commands](#-development-testing--build-commands)
- [Application Usage Guide](#-application-usage-guide)
- [Responsible Testing & Authorized-Use Policy](#-responsible-testing--authorized-use-policy)
- [Known Limitations](#-known-limitations)
- [Contributing](#-contributing)
- [Issue Reporting & Security Disclosures](#-issue-reporting--security-disclosures)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 📖 Overview

**AppSec Nexus** is a cross-platform desktop application architected for application security engineers, penetration testers, vulnerability researchers, and DevSecOps practitioners.

Unlike browser-based dashboards that transmit sensitive scan data to external third parties, AppSec Nexus runs **100% locally** on your host workstation. It orchestrates automated passive and active vulnerability scans, executes deterministic validation probes, tracks issues with an SQLite-backed audit trail, facilitates hands-on security training in the integrated Cyber Academy, and provides an offline local AI Security Mentor powered by Ollama.

### Who is AppSec Nexus for?
- **Application Security (AppSec) Engineers:** Triage vulnerabilities, generate reproducible remediation code, and track security observations across target applications.
- **Penetration Testers:** Define authorized scope boundaries, execute CLI tools (`nuclei`, `httpx`, `nmap`), import Burp Suite XML/JSON observations, and export technical audit reports.
- **DevSecOps & Developers:** Learn secure coding patterns through hands-on curriculum tracks, inspect HTTP security headers, and validate fixes locally.

---

## ✨ Key Features

### ✅ Implemented Capabilities

#### 🔍 1. Automated Scanners & CLI Tool Orchestration
- **Native Baseline Scanner:** Zero-dependency Rust scanner checking HTTP security headers (CSP, HSTS, X-Frame-Options, CORS), cookie flags (`HttpOnly`, `Secure`, `SameSite`), `robots.txt`, and exposed administrative paths.
- **External CLI Tool Execution:** Asynchronous subprocess management for:
  - `nuclei` (Template-based CVE, vulnerability, and misconfiguration scans with feed updates)
  - `httpx` (HTTP probing, technology fingerprinting, response status validation)
  - `nmap` (Port scanning, service version discovery, and network enumeration)
- **Live Scan Console & Multi-Terminal Workspace:** Terminal execution view with split panes, real-time stdout streaming, and persistent command history.
- **Web Asset Crawler:** Depth-controlled web endpoint discovery and asset mapping.
- **Burp Suite Synchronization:** Dedicated Burp XML and JSON import views, live HTTP proxy listener testing, and upstream repeater requests.

#### 🛡️ 2. Unified Vulnerability Management & Deterministic Validation
- **Unified Findings Dashboard:** Multi-criteria sorting, search, severity filtering (Critical, High, Medium, Low, Info), and pagination.
- **Inline Details & Attack Traces:** Expandable finding details with methodology links, CWE references, CVSS metrics, affected URLs, and evidence records.
- **Independent Validation Engine:** Automated active verification probes to confirm whether a vulnerability is a True Positive or False Positive.
- **Context Menu & Batch Actions:** Right-click context menus, bulk status changes (`Confirmed`, `LikelyTruePositive`, `NeedsReview`, `Resolved`, `FalsePositive`), and bulk deletions.
- **Audit History & Activity Logs:** Comprehensive SQLite-backed audit log recording all user mutations and scan events.

#### 🤖 3. Local AI Security Mentor (Two-Model Architecture)
- **100% Offline & Private:** Connects to local Ollama daemon (`127.0.0.1:11434`) without transmitting prompt data or findings to cloud APIs.
- **Two-Model Security AI Workspace:** Fast response model slot ("Quick AI") for instant triage and deep reasoning slot ("Deep AI") for complex exploit analysis.
- **Category-Aware AI Personas:** Contextual system prompts tailored to Web, API, Cloud, Network, Mobile, and Source Code categories.
- **Persistent AI Task Queue:** Background execution context allowing users to switch tabs while the model synthesizes answers.
- **Progressive Thinking Indicators:** Real-time multi-stage thinking status cards with elapsed timers and prompt previews.

#### 📚 4. Cyber Academy & Security Knowledge Base
- **Taxonomy Curriculum:** Guided learning paths covering OWASP Top 10, CWE definitions, network security, and cryptography.
- **Interactive Security Flowcharts:** Visual decision trees explaining exploitation vectors and defensive mechanisms.
- **Checklist & Playbook Center:** Actionable assessment playbooks for Web, API, Cloud, Mobile, and Infrastructure testing.

#### 🎨 5. User Interface & Accessible Workspace
- **Five Built-In Themes:** Cyber Dark, Dark Pro, Minimal Light, Cyber Neon, and Aurora Glass with persistent user preferences.
- **Customizable Panels & Drawers:** Resizable sidebar, sliding AI drawer, and preset layouts (`default`, `compact`, `analyst`, `pentest`, `api`, `learning`).
- **Responsive Layout:** Adaptive viewports with table-matched skeleton loaders and ARIA accessibility controls.
- **Global Command Palette:** Shortcut navigation (`Ctrl+K` / `Cmd+K`) and interactive quick-start tour overlay.

---

### ⏳ Roadmap & Planned Capabilities

The following items are under active architecture and will be released in future milestones:
- [ ] Automated continuous scheduled scans (cron/daemon background runner).
- [ ] Native Linux eBPF system audit modules.
- [ ] Native macOS SIP and TCC permission auditing.
- [ ] Cloud posture adapters for AWS, GCP, and Azure credentials.
- [ ] CI/CD pipeline integration CLI (`appsec-cli`).

---

## 🎯 Security Testing Categories

AppSec Nexus organizes assessments across standard industry domains:

| Category | Status | Primary Verification Mechanisms |
| :--- | :--- | :--- |
| **Web Applications** | **Implemented** | Baseline scanner, Nuclei CVE templates, HTTP security header audits, CSP/CORS analysis |
| **API Security** | **Implemented** | Endpoint crawler, httpx probing, parameter reflection testing, Burp XML/JSON ingestion |
| **Network & Ports** | **Implemented** | Nmap port enumeration, service version detection, socket probing |
| **Host Configuration** | **Implemented** | Windows OS security configuration audit, Android Manifest XML static analysis |
| **Methodologies & Playbooks** | **Implemented** | OWASP WSTG, ASVS, NIST SP 800-115 checklists, interactive playbooks |
| **Cloud & Containers** | *Planned* | Cloud configuration benchmarks (CIS), container image vulnerability mapping |

---

## 🤖 AI Mentor Engine

AppSec Nexus includes an offline cybersecurity AI assistant engineered specifically for defensive vulnerability explanation, safe laboratory reproduction, and source code remediation.

```
┌────────────────────────────────────────────────────────┐
│                   AppSec Nexus UI                      │
└───────────────┬────────────────────────▲───────────────┘
                │ Submit Task / Prompt   │ Streaming Response
┌───────────────▼────────────────────────┴───────────────┐
│               Rust AI Task Subsystem (ai.rs)            │
│  - Non-blocking async queue & resource limiter        │
│  - Category persona builder & anti-fabrication filters │
└───────────────┬────────────────────────▲───────────────┘
                │ HTTP IPC (127.0.0.1:11434)             │
┌───────────────▼────────────────────────┴───────────────┐
│                 Local Ollama Daemon                    │
│   Quick AI Slot (e.g., appsec-teacher / 3B-8B)         │
│   Deep AI Slot  (e.g., deepseek-r1 / llama3 / qwen)    │
└────────────────────────────────────────────────────────┘
```

### Supported AI Features:
- **Zero Cloud Leakage:** Strictly communicates via local loopback (`http://127.0.0.1:11434`).
- **Model Agnostic:** Any model pulled in Ollama can be mapped into Quick or Deep slots.
- **Context Injection:** Automatically injects the currently selected finding's title, severity, asset URL, CWE ID, and evidence for instant contextual remediation.
- **Non-Destructive Guidance:** Pre-configured system instructions emphasize technical accuracy, defensive remediation (Nginx, Apache, Node.js, Python), and refuse harmful exploitation.

---

## 📸 Screenshots & User Interface

> *Screenshots captured on desktop build (1440×900).*

| Security Analytics & Dashboard | Unified Vulnerability Findings |
| :---: | :---: |
| *(Dashboard with severity breakdown, active targets, and quick scan triggers)* | *(Sortable table with severity badges, validation status, and inline details)* |

| Local AI Mentor Workspace | Multi-Terminal Tool Console |
| :---: | :---: |
| *(Dual-model selection, prompt preview, thinking indicators, and defensive fixes)* | *(Split-pane CLI runner streaming output from Nuclei, httpx, and Nmap)* |

*(To view live screenshots, run `npm run tauri dev` or inspect the project documentation in the [`docs/`](docs/) directory).*

---

## 🏛️ Architecture & Tech Stack

```
AppSec Nexus
├── src/                          # Frontend Application (React 19 + TypeScript + Vite)
│   ├── academy/                  # Cyber Academy & vulnerability study tracks
│   ├── burp/                     # Burp Suite connector, repeater & traffic views
│   ├── categories/               # Finding categories, CWE taxonomy & personas
│   ├── checklists/               # Interactive compliance checklists & playbooks
│   ├── components/               # Modular UI, modals, badges, drawers, skeletons
│   ├── context/                  # Theme, Workspace, AI Task, and Scan Progress contexts
│   ├── terminal/                 # Multi-Terminal workspace and CLI split panes
│   └── utils/                    # DSA deduplication, token estimators, model resolvers
│
├── src-tauri/                    # Native Backend (Rust + Tauri v2)
│   ├── src/
│   │   ├── ai.rs                 # Ollama client, system info & task runner
│   │   ├── burp.rs               # Burp Suite proxy listener & XML/JSON parsers
│   │   ├── crawler.rs            # Web asset crawler and endpoint discovery
│   │   ├── db.rs                 # SQLite connection pool, migrations & queries
│   │   ├── feeds.rs              # Threat intelligence & template auto-updates
│   │   ├── scanners.rs           # Native baseline scanner implementation
│   │   ├── scope.rs              # Authorized target scope boundary guards
│   │   ├── validator.rs          # Vulnerability verification engine
│   │   ├── windows_audit.rs      # Windows OS security audit rules
│   │   ├── android_audit.rs      # Android manifest XML static analysis
│   │   └── lib.rs                # Tauri IPC command handlers & app lifecycle
│   ├── Cargo.toml                # Rust dependencies & compilation profile
│   └── tauri.conf.json           # Window configuration, bundle settings & CSP
```

### Core Technologies
- **Desktop Framework:** [Tauri v2](https://tauri.app/) (native OS webview bindings, low memory footprint)
- **Backend Language:** [Rust](https://www.rust-lang.org/) (2024 Edition)
- **Frontend Framework:** [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Bundler:** [Vite 8](https://vitejs.dev/)
- **Database:** [SQLite 3](https://sqlite.org/) (embedded via `rusqlite` with bundled driver)
- **Local AI Provider:** [Ollama](https://ollama.com/) REST API (`reqwest`)
- **Testing:** [Vitest](https://vitest.dev/) + Testing Library + `cargo test`

---

## 💻 Prerequisites & System Requirements

### Hardware Requirements
- **CPU:** Dual-core 64-bit x86_64 or ARM64 processor (Quad-core recommended).
- **RAM:** Minimum 4 GB RAM (8 GB+ recommended if running local 7B/8B AI models via Ollama).
- **Storage:** 500 MB free space for the application; additional space depending on downloaded Ollama models and tool templates.

### Software Prerequisites
1. **Node.js:** `v18.0.0` or higher (Recommended: `v20.x` or `v22.x` LTS). Download from [nodejs.org](https://nodejs.org/).
2. **Rust:** Stable Rust toolchain (`rustc` and `cargo` 1.80+). Install via [rustup.rs](https://rustup.rs/):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. **C/C++ Build Tools:**
   - **Windows:** Visual Studio C++ Build Tools (Install the *"Desktop development with C++"* workload).
   - **Linux (Ubuntu/Debian):**
     ```bash
     sudo apt-get update && sudo apt-get install -y build-essential curl libwebkit2gtk-4.1-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
     ```
   - **macOS:** Xcode Command Line Tools (`xcode-select --install`).
4. *(Optional)* **Ollama:** Required only if using local AI features. Download from [ollama.com](https://ollama.com/).
5. *(Optional)* **CLI Tools:** `nuclei`, `httpx`, and `nmap` installed and available in system `PATH` if using external scanner integrations.

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hackmate00800/AppSec-nexus.git
   cd AppSec-nexus
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Verify the environment configuration:**
   Copy the example environment template:
   ```bash
   cp .env.example .env
   ```

4. **Start the local AI daemon (Optional):**
   If you plan to use the AI Mentor, ensure Ollama is running and has at least one model pulled:
   ```bash
   ollama serve
   ollama pull llama3.2:1b
   ```

5. **Launch in development mode:**
   ```bash
   npm run tauri dev
   ```

---

## 🔐 Environment Variables

AppSec Nexus reads environment variables from `.env` during development. **Never commit real credentials, access tokens, or private keys to the repository.**

Reference configuration from [`.env.example`](.env.example):

```bash
# Frontend development server port (default: 1420)
VITE_PORT=1420

# Host binding for development
VITE_HOST=127.0.0.1

# Ollama local inference endpoint (default local port)
OLLAMA_HOST=http://127.0.0.1:11434

# Security scope boundary override (TESTING ONLY - Keep false in production)
ALLOW_PRIVATE_RANGES_UNSAFE=false

# Logging verbosity (trace | debug | info | warn | error)
DEBUG_LOG_LEVEL=info
```

---

## 🛠️ Development, Testing & Build Commands

All development commands are defined in [`package.json`](package.json) and [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml):

### Development
```bash
# Launch full desktop application with hot-reloading (Vite + Tauri)
npm run tauri dev

# Run frontend Vite dev server only in browser
npm run dev
```

### Type Checking & Linting
```bash
# Run TypeScript compilation check
npm run build
```

### Automated Testing
```bash
# Run full Vitest frontend suite (27 suites, 228+ tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run Rust backend unit and integration tests
cd src-tauri
cargo test
```

### Production Build
Compile a release desktop executable with Link-Time Optimization (LTO) and stripped binary symbols:

```bash
# Generate production installer and standalone binary
npm run tauri build
```

The resulting binary installer will be generated in:
- **Windows:** `src-tauri/target/release/bundle/nsis/` or `src-tauri/target/release/bundle/msi/`
- **Linux:** `src-tauri/target/release/bundle/deb/` or `src-tauri/target/release/bundle/appimage/`
- **macOS:** `src-tauri/target/release/bundle/dmg/`

---

## 📖 Application Usage Guide

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Define Scope │ ────> │ 2. Run Audits   │ ────> │ 3. Triage & AI  │
│ (Target & Scope)│       │ (Baseline / CLI)│       │ (Unified Views) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ 4. Export & Fix │
                                                    │ (Reports & Code)│
                                                    └─────────────────┘
```

1. **Target & Scope Definition:**
   - Navigate to **Target & Scope**.
   - Enter your authorized primary URL (e.g., `https://example.com` or local testing lab `http://localhost:3000`).
   - Define allowed hosts, path prefixes, and specify whether local loopback testing is authorized.
2. **Execute Scans:**
   - Navigate to **Scan Console** or **Tool Hub**.
   - Choose **Baseline Scan** (instant header and policy checks), **httpx Probe**, or **Nuclei Audit**.
   - Monitor live progress via the global **Scan Progress Banner** while freely navigating between tabs.
3. **Inspect & Validate Findings:**
   - Navigate to **Unified Findings**.
   - Expand any row to inspect HTTP evidence, detection methodology, and CWE classification.
   - Click **Run Verification** to execute an active verification probe and eliminate false positives.
4. **Consult the AI Mentor:**
   - Click **AI** on any finding or switch to the **Local AI Mentor** tab.
   - The AI Mentor automatically analyzes the vulnerability and outputs secure copy-pasteable remediation code for your tech stack.
5. **Generate Reports:**
   - Open **Security Analytics** or **Issue Center** to export structured JSON summaries or print-ready reports.

---

## ⚖️ Responsible Testing & Authorized-Use Policy

> [!IMPORTANT]
> **AppSec Nexus is designed strictly for authorized security assessments, defensive engineering, educational training, and authorized penetration testing.**

- **Explicit Authorization Required:** Only test targets, networks, and applications that you own or have received formal, written authorization to evaluate.
- **Compliance with Laws:** Unauthorized scanning, probing, or exploiting computer systems is illegal in many jurisdictions under laws such as the US Computer Fraud and Abuse Act (CFAA), the UK Computer Misuse Act, and international cybercrime legislation.
- **No Liability:** The authors, contributors, and maintainers of AppSec Nexus assume no liability and are not responsible for any misuse, damage, or legal consequences caused by this software.

---

## ⚠️ Known Limitations

- **Binary Dependencies:** Tools such as `nuclei`, `httpx`, and `nmap` must be manually installed in your operating system's `PATH` if you wish to run external CLI scans.
- **Local Model Performance:** AI Mentor response speed depends on host hardware (CPU/GPU) and the parameter size of the local model selected in Ollama (3B and 8B models are recommended for standard developer laptops).
- **Desktop Only:** AppSec Nexus relies on OS-level subprocess execution, local socket probing, and SQLite database storage managed via Tauri v2, and cannot run as a static web application in a browser.

---

## 🤝 Contributing

Contributions, bug reports, and pull requests are welcome!

1. Fork the repository.
2. Create your dedicated feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes with clear, semantic commit messages:
   ```bash
   git commit -m 'feat: implement new security check adapter'
   ```
4. Run the full test suite to ensure zero regressions:
   ```bash
   npm test
   cd src-tauri && cargo test
   ```
5. Push your feature branch:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Open a Pull Request on GitHub.

---

## 🐛 Issue Reporting & Security Disclosures

- **Bug Reports:** If you encounter unexpected behavior or UI issues, please open a GitHub Issue with reproduction steps, your operating system, and relevant terminal logs.
- **Security Vulnerabilities:** If you discover a security vulnerability within AppSec Nexus itself (e.g. scope bypass, IPC privilege escalation), please do not open a public issue. Disclose responsibly by contacting the maintainers directly or utilizing GitHub Private Vulnerability Reporting.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for full details.

---

## 🙏 Acknowledgements

AppSec Nexus leverages open-source libraries and cybersecurity tools:
- [Tauri Project](https://tauri.app/) — Lightweight desktop application framework.
- [ProjectDiscovery](https://projectdiscovery.io/) — Creators of `nuclei` and `httpx`.
- [Nmap Project](https://nmap.org/) — Network exploration and security auditing.
- [Ollama](https://ollama.com/) — Seamless local LLM inference runner.
- [OWASP Foundation](https://owasp.org/) — Methodologies, Top 10 guidelines, and vulnerability definitions.
- [Lucide Icons](https://lucide.dev/) — Clean, consistent open-source iconography.
