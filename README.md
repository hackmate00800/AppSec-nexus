# 🛡️ AppSec Nexus

**Next-Generation Desktop Cybersecurity, Vulnerability Management & Application Security Platform**

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2024%20Edition-orange?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Overview

**AppSec Nexus** is a cross-platform desktop application built for security engineers, penetration testers, and DevSecOps practitioners. It combines automated scanning tools, vulnerability validation, threat intelligence feeds, compliance checklists, interactive web security learning academies, and a local offline AI Security Mentor powered by Ollama.

Built with **Tauri v2**, **Rust**, **React 19**, and **SQLite**, AppSec Nexus provides low-resource usage, high-performance execution, and native local security auditing without sending sensitive scan data or credentials to cloud providers.

---

## ✨ Key Features

### 🔍 Automated Scanning & Security Tools
- **Baseline Scanner:** Integrated checks for HTTP headers, TLS/SSL configuration, CORS policies, Cookie flags, robots.txt, and sensitive files.
- **External Tool Integrations:** Orchestration support for industry-standard tools:
  - `nmap` (Network discovery and port enumeration)
  - `httpx` (HTTP probing and web server fingerprinting)
  - `nuclei` (Fast, template-based vulnerability scanning with auto-updating templates)
- **Crawler & Endpoint Discovery:** Built-in web asset discovery and automated URL mapping.
- **Burp Suite Integration:** Import and synchronize issues and proxy traffic logs from Burp Suite.

### 🛡️ Vulnerability Management & Dynamic Validation
- **Unified Findings Dashboard:** Filter, search, triage, and organize findings by severity (Critical, High, Medium, Low, Info) and status.
- **Evidence Inspection & Details:** View detailed detection traces, raw request/response captures, CWE identifiers, and CVSS scores.
- **Automated Verification Engine:** In-engine validation tests to confirm vulnerabilities and reduce false positives.
- **Bulk Operations & Status Triage:** Multi-select actions to confirm, review, false-positive mark, or resolve issues.

### 🤖 Local AI Security Mentor (Powered by Ollama)
- **Offline & Private:** Chat and analyze vulnerabilities locally with Ollama (Llama 3, Mistral, CodeLlama, DeepSeek, etc.) without external data leakage.
- **Security Knowledge Base:** Built-in guidance for remediation strategies, secure coding practices, and exploitation reproduction steps.
- **Background AI Task Queue:** Run deep reasoning and vulnerability analysis asynchronously without blocking the UI.

### 💻 Host & System Security Audits
- **Windows System Audit:** Built-in auditing for Windows OS configurations, patch state, registry security flags, and privilege configurations.
- **Android Manifest Audit:** Static security review of Android `AndroidManifest.xml` files for permission misconfigurations and exported components.

### 📚 Interactive Security Academy & Checklists
- **Cyber Academy:** Curated educational modules covering OWASP Top 10 vulnerabilities, interactive playground examples, and defensive engineering.
- **Methodologies & Checklists:** Built-in checklists for Web Application Penetration Testing, Cloud Security, API Auditing, and Network Assessments.

### 📊 Reporting & Analytics
- **Executive & Technical Reports:** Export styled HTML and print-ready reports containing vulnerability summaries, remediation roadmaps, and evidence logs.
- **Real-Time System Resource Monitoring:** Live tracking of memory, CPU, and running scan tasks.

---

## 🏗️ Architecture

```
AppSec Nexus
├── src/                          # Frontend Application (React 19 + TypeScript + Vite)
│   ├── academy/                  # Cyber Academy & vulnerability study modules
│   ├── burp/                     # Burp Suite integration views
│   ├── categories/               # Finding categories & CWE taxonomy
│   ├── checklists/               # Pentesting & compliance checklists
│   ├── components/               # UI components, badges, modals, dialogs
│   ├── context/                  # App state, role management, themes
│   ├── help/                     # Documentation and user manuals
│   ├── orchestration/            # Scan runner & pipeline controls
│   ├── terminal/                 # Integrated tool terminal & log viewers
│   └── utils/                    # Data formatters and helpers
│
└── src-tauri/                    # Native Backend (Rust + Tauri v2)
    ├── src/
    │   ├── ai.rs                 # Ollama integration & AI task runner
    │   ├── burp.rs               # Burp Suite log parser & synchronizer
    │   ├── crawler.rs            # Web asset crawler
    │   ├── db.rs                 # SQLite persistence layer
    │   ├── feeds.rs              # Threat intelligence (CISA KEV, Nuclei feeds)
    │   ├── scanners.rs           # Baseline security scanner implementation
    │   ├── scope.rs              # Target scope authorization & validation
    │   ├── validator.rs          # Vulnerability verification engine
    │   ├── windows_audit.rs      # Windows OS security audit rules
    │   ├── android_audit.rs      # Android manifest analysis
    │   └── lib.rs                # Tauri command registrations & app lifecycle
    └── Cargo.toml                # Rust dependencies & optimization profiles
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: `v18.0.0` or higher (Recommended: `v20+`)
2. **Rust**: Rust toolchain (2024 edition or latest stable) — install via [rustup.rs](https://rustup.rs/)
3. **C++ Build Tools**: Visual Studio Build Tools (Windows) or standard C compiler (`gcc`/`clang` on Linux/macOS)
4. *(Optional)* **Ollama**: For running the AI Mentor locally ([ollama.com](https://ollama.com/))
5. *(Optional)* Security CLI tools: `nmap`, `nuclei`, `httpx` installed in system `PATH`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hackmate00800/AppSec-nexus.git
   cd AppSec-nexus
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run the development application:**
   ```bash
   npm run tauri dev
   ```

---

## 🧪 Testing

### Frontend Unit & Component Tests
```bash
npm run test
```

### Backend Rust Unit Tests
```bash
cd src-tauri
cargo test
```

---

## 📦 Building for Production

Compile a stand-alone desktop binary installer with production optimizations (LTO, stripped debug symbols):

```bash
npm run tauri build
```

The resulting executable and installer will be located in:
`src-tauri/target/release/bundle/`

---

## 🔒 Security & Scope Boundaries

AppSec Nexus includes strict **Scope Boundary Protections**:
- All targets require explicit user authorization and scope definition before scans can be dispatched.
- Built-in Scope Guards ensure local loopback addresses and third-party hostnames are restricted unless expressly permitted in target settings.
- All scan telemetry, credentials, and finding data remain stored locally inside an encrypted or private SQLite database on your machine.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
