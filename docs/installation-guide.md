# AppSec Nexus --- Installation & Quick Start Guide

## 1. System Requirements
- **Operating System:** Windows 10/11 (64-bit)
- **Memory:** 8 GB RAM minimum (16 GB recommended for 8B local LLMs)
- **Disk Space:** 500 MB for AppSec Nexus binary and security tools; 2–5 GB for local Ollama models
- **WebView2:** Microsoft Edge WebView2 Runtime (preinstalled on Windows 10/11)

## 2. Standalone Desktop Launch
1. Download or locate `AppSec-Nexus.exe` in the application directory.
2. Double-click `AppSec-Nexus.exe` to launch directly.
3. No browser or external web server is required. The application initializes native Win32 windows and bundles all client assets.

## 3. Bundled Security Tools
AppSec Nexus ships with or automatically detects:
- **Native Baseline Scanner:** Built directly into the Rust core.
- **Nuclei:** Located at `tools/bin/nuclei.exe`.
- **httpx:** Located at `tools/bin/httpx.exe`.
- **Nmap:** Located at `tools/bin/nmap/nmap-7.92/nmap.exe` or system PATH.
- **Ollama AI Engine:** Located via WinGet or PATH at `http://127.0.0.1:11434`.

## 4. Local AI Setup
1. Launch Ollama or let AppSec Nexus detect your local service.
2. In the **Local AI Mentor** tab, select an installed model (e.g. `llama3.2:1b` or `llama3:8b`).
3. To install a new model, type the model tag into the pull field and watch the live download progress bar.
4. All AI inference is 100% offline and private.
