# 🛠️ AppSec-Nexus Tool Integration Playbook & Architecture Guide

Welcome to the **AppSec-Nexus Universal Integration Framework**. This guide explains how to connect and orchestrate any security scanner, network utility, CLI binary, or custom script with your desktop application.

---

## 📑 Table of Contents
1. [Overview & Execution Architecture](#1-overview--execution-architecture)
2. [Integrating Standalone CLI Tools (Trivy, Semgrep, Gitleaks, etc.)](#2-integrating-standalone-cli-tools)
3. [Integrating Custom Python Security Scripts](#3-integrating-custom-python-security-scripts)
4. [Burp Suite & OWASP ZAP Integration](#4-burp-suite--owasp-zap-integration)
5. [Wireshark & PCAP Network Traffic Analysis](#5-wireshark--pcap-network-traffic-analysis)
6. [Android Mobile Security (APK Analysis)](#6-android-mobile-security-apk-analysis)
7. [Standard JSON Output Specification](#7-standard-json-output-specification)

---

## 1. Overview & Execution Architecture

AppSec-Nexus features an **Intelligent Universal CLI Adapter** that automatically executes tools locally, captures output in real-time, extracts security findings, and coordinates with your offline **Ollama AI Co-Pilot**.

```
+-------------------------------------------------------------------+
|                        AppSec Nexus Engine                        |
+-------------------------------------------------------------------+
        |                                           |
        v                                           v
[Core Engines]                              [Universal CLI Plugins]
- Native Baseline Scanner                   - Standalone Binaries (in PATH)
- ProjectDiscovery Nuclei (10k+ CVEs)       - Absolute Exe Paths
- ProjectDiscovery HTTPX                    - Python 3 Standard Lib Scripts
- Nmap Port Scanner                         - Node.js Scripts
        |                                           |
        +---------------------+---------------------+
                              |
                              v
        +-------------------------------------------+
        |        Dual-Mode Output Parser            |
        |  - Mode A: Structured AppSec JSON         |
        |  - Mode B: Raw CLI Fallback (Regex Alerts)|
        +-------------------------------------------+
                              |
                              v
        +-------------------------------------------+
        |   SQLite Database + Offline Ollama AI     |
        |   (1-Click CWE Classification & Patches)  |
        +-------------------------------------------+
```

---

## 2. Integrating Standalone CLI Tools

AppSec-Nexus resolves commands using your Windows `PATH` or direct executable paths.

### Examples:
- **Trivy** (Container & Filesystem CVE Scanner): `trivy`
- **Semgrep** (Static Code Security Analyzer): `semgrep`
- **Gitleaks** (Git Secret Scanner): `gitleaks`
- **TShark** (Wireshark CLI Packet Inspector): `tshark`

### Step-by-Step Setup:
1. Open AppSec-Nexus and navigate to **Tool Hub & Security Plugins**.
2. Click **Integrate Local Tool / Plugin**.
3. Choose **Quick Tool Form (Recommended)**:
   - **Tool Name**: `Trivy Vulnerability Scanner`
   - **Command Name or File Path**: `trivy` (or `C:\tools\trivy.exe`)
   - **Runtime**: `Standalone / PATH CLI`
   - **Timeout**: `45` seconds
   - **Description**: `Container and software dependency security scanner.`
4. Click **Register & Enable Tool**.
5. Go to the **Scanner Console**, select your target, and click **Run Plugin**!

---

## 3. Integrating Custom Python Security Scripts

You can write lightweight custom security checks using Python standard libraries (no external pip dependencies required).

### Sample Plugin Script (`run.py`):
```python
import sys
import json
import urllib.request

def audit(target_url):
    logs = [f"Starting audit for {target_url}"]
    findings = []
    
    # Custom security check logic
    try:
        req = urllib.request.Request(target_url, headers={"User-Agent": "AppSecNexus/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
            if "server" in headers:
                findings.append({
                    "title": f"Server Banner Leaked: {headers['server']}",
                    "severity": "Low",
                    "confidence": 95,
                    "summary": "Server disclosed version banner in response headers.",
                    "evidence": f"Server: {headers['server']}",
                    "cwe": "CWE-200",
                    "remediation": "Suppress the Server header in web server configuration."
                })
    except Exception as e:
        logs.append(f"Probe error: {e}")
        
    return {"target": target_url, "findings": findings, "logs": logs}

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://example.com"
    print(json.dumps(audit(url), indent=2))
```

---

## 4. Burp Suite & OWASP ZAP Integration

AppSec-Nexus bridges the gap between active proxying and automated vulnerability management:

### 🔄 Upstream Proxy Chaining:
Configure your browser or network tools to route through Burp Suite (`http://127.0.0.1:8080`) or OWASP ZAP (`http://127.0.0.1:8081`). All requests can be inspected and modified in Burp while AppSec-Nexus orchestrates scans.

### 📥 1-Click Report Import:
1. In Burp Suite: `Target` -> `Site map` -> Right-click `Issues` -> `Export issues as XML`.
2. In OWASP ZAP: `Report` -> `Generate Report` -> `JSON`.
3. In AppSec-Nexus: Navigate to **Import Reports**, select your format, paste the content, and click **Parse & Import Findings**.
4. All vulnerabilities are instantly saved into SQLite and ready for 1-click **Ollama AI Remediation Plans**.

---

## 5. Wireshark & PCAP Network Traffic Analysis

Use the built-in **Wireshark PCAP & Network Traffic Auditor** (`pcap-traffic-auditor`):
1. Capture packets using Wireshark and save the file as `my_traffic.pcap` or `capture.pcapng`.
2. In AppSec-Nexus, go to **Configure Authorized Target**.
3. In **Target Address**, enter the path to the capture file: `C:\captures\my_traffic.pcap`.
4. Run the **Wireshark PCAP & Network Traffic Auditor**.
5. It inspects:
   - Cleartext HTTP Basic Authentication headers ([CWE-522](https://cwe.mitre.org/data/definitions/522.html))
   - Plaintext credentials from FTP `USER`/`PASS` and Telnet ([CWE-319](https://cwe.mitre.org/data/definitions/319.html))
   - Obsolete TLS 1.0 / TLS 1.1 handshakes ([CWE-326](https://cwe.mitre.org/data/definitions/326.html))

---

## 6. Android Mobile Security (APK Analysis)

Use the built-in **Android APK & Mobile Security Auditor** (`android-apk-auditor`):
1. Download or compile an Android `.apk` package (e.g. `C:\apps\sample.apk`).
2. Add the path in **Target Address**: `C:\apps\sample.apk`.
3. Run the **Android APK Auditor**.
4. It performs static analysis against OWASP Mobile Top 10:
   - `android:debuggable="true"`
   - `android:allowBackup="true"`
   - `android:usesCleartextTraffic="true"`
   - Dangerous permissions (`READ_SMS`, `RECORD_AUDIO`, etc.)
   - Exported activities and broadcast receivers ([CWE-926](https://cwe.mitre.org/data/definitions/926.html))
   - Hardcoded cloud keys and API tokens in `classes.dex` and assets

---

## 7. Standard JSON Output Specification

When writing advanced plugins that return structured findings, format stdout as:

```json
{
  "target": "https://example.com",
  "findings": [
    {
      "title": "Vulnerability Title",
      "severity": "Critical | High | Medium | Low | Info",
      "confidence": 90,
      "summary": "Clear explanation of the weakness and risk.",
      "evidence": "Observed HTTP response, header, or payload trace.",
      "cwe": "CWE-89",
      "remediation": "Exact steps and code changes required to resolve the issue."
    }
  ],
  "logs": [
    "Initiating probe...",
    "Status 200 OK received",
    "Scan completed successfully."
  ]
}
```
*(Note: If your tool outputs plain text instead of JSON, AppSec-Nexus automatically captures the lines as console logs and flags security keywords like `CVE-`, `[CRITICAL]`, and `[HIGH]`.)*
