# AppSec Nexus --- Custom Tool Adapter Development Guide

## 1. Overview
AppSec Nexus features a decoupled, schema-enforced adapter model that allows security researchers and developers to plug custom scanners and scripts into the unified desktop interface without recompiling the application.

## 2. Directory Structure
Custom tools live in `tools/custom/<tool-id>/` or `tools/examples/<tool-id>/`:
```
tools/examples/custom-header-check/
├── manifest.json       # Metadata, capabilities, and permission declaration
└── check_headers.py   # Executable script or binary
```

## 3. The Tool Manifest (`manifest.json`)
Every custom adapter must declare:
- `id`: Unique alphanumeric identifier (lowercase, hyphens permitted).
- `name`: Display title in the Tool Hub.
- `version`: SemVer string (e.g., `1.0.0`).
- `runtime`: Execution engine (`standalone`, `python3`, `node`).
- `executable`: Relative or absolute path to the binary or script.
- `capabilities`: Array of features (`passive_analysis`, `active_scan`, `port_audit`).
- `permissions`: Required access limits:
  - `network`: `["in_scope_target_only"]`
  - `filesystem`: `["none"]`
  - `environment`: `["none"]`
- `timeout_seconds`: Execution watchdog threshold (default: 60s).

## 4. Input and Output Contract
### Input
AppSec Nexus invokes the executable with CLI arguments:
```bash
<executable> <TARGET_URL>
```
The target URL is guaranteed to have passed strict `ScopeValidator` checks (anti-SSRF, RFC 1918 blocks, valid schemes) before invocation.

### Output
The adapter must write a valid JSON object to standard output (`stdout`):
```json
{
  "target": "https://example.com",
  "findings": [
    {
      "id": "unique-finding-id",
      "title": "Vulnerability Title",
      "severity": "High | Medium | Low | Info",
      "cwe": "CWE-XXX",
      "source": "Tool-Name",
      "summary": "Clear explanation of the issue.",
      "evidence": "Observed request/response proof.",
      "remediation": "Prescriptive remediation guidance."
    }
  ]
}
```

## 5. Security & Isolation Guarantee
- Custom tools run as unprivileged child processes via Tokio.
- Output buffer sizes are bounded to 5MB to avoid memory exhaustion.
- Process crashes or invalid JSON formats are captured safely without destabilizing the desktop app.
