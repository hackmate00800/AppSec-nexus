#!/usr/bin/env python3
import sys
import json
import re
import urllib.request
import ssl

PATTERNS = [
    ("AWS Access Key ID", r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}", "High", "CWE-798"),
    ("Google API Key", r"AIza[0-9A-Za-z\\-_]{35}", "Medium", "CWE-798"),
    ("Slack API Token", r"xox[baprs]-[0-9a-zA-Z]{10,48}", "High", "CWE-798"),
    ("GitHub Personal Access Token", r"gh[pousr]_[0-9a-zA-Z]{36}", "High", "CWE-798"),
    ("JSON Web Token (JWT)", r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}", "Medium", "CWE-200"),
    ("RSA / SSH Private Key Block", r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----", "Critical", "CWE-312"),
    ("Generic Authorization Bearer", r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}", "Medium", "CWE-522")
]

def scan_secrets(url):
    findings = []
    logs = [f"Scanning page markup and scripts for secret leaks at {url}"]
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AppSecNexus-Secrets/1.0"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "text" not in content_type and "json" not in content_type and "javascript" not in content_type:
                logs.append(f"Content-Type {content_type} is binary; scanning skipped.")
                return {"target": url, "findings": findings, "logs": logs}
                
            body = resp.read(512 * 1024).decode("utf-8", errors="ignore")
            logs.append(f"Read {len(body)} bytes of content.")
            
            for name, pattern, severity, cwe in PATTERNS:
                matches = re.findall(pattern, body)
                if matches:
                    unique_matches = list(set(matches))[:3]
                    for m in unique_matches:
                        # Mask secret evidence for safety
                        masked = m[:6] + "..." + m[-4:] if len(m) > 12 else m[:3] + "..."
                        findings.append({
                            "title": f"Hardcoded Secret Exposure: {name}",
                            "severity": severity,
                            "confidence": 90,
                            "summary": f"A potential {name} was detected in client-accessible page source code or script tags.",
                            "evidence": f"Found token matching signature: '{masked}'",
                            "cwe": cwe,
                            "remediation": "Revoke the exposed key immediately and store credentials in secure server-side environment variables or secret vaults (e.g., Vault, AWS Secrets Manager)."
                        })
                        logs.append(f"[!] Found {name}: {masked}")

    except Exception as e:
        logs.append(f"Secrets scan error: {e}")
        
    logs.append(f"Secrets scan complete. {len(findings)} exposures detected.")
    return {"target": url, "findings": findings, "logs": logs}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_URL>"}))
        sys.exit(1)
    url = sys.argv[1]
    res = scan_secrets(url)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
