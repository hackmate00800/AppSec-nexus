#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.error
import ssl

def check_cors(target_url):
    findings = []
    logs = [f"Initiating CORS Misconfiguration Audit on {target_url}"]
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    test_origins = [
        ("Arbitrary Origin Reflection", "https://attacker.evil.com"),
        ("Null Origin Trust", "null"),
        ("Subdomain Trust Bypass", "https://not-actual-subdomain.com")
    ]
    
    for test_name, test_origin in test_origins:
        logs.append(f"Testing {test_name} with Origin: {test_origin}")
        req = urllib.request.Request(
            target_url,
            headers={
                "User-Agent": "AppSecNexus-CORS/1.0",
                "Origin": test_origin
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=8, context=ctx) as resp:
                headers = {k.lower(): v for k, v in resp.getheaders()}
                acao = headers.get("access-control-allow-origin")
                acac = headers.get("access-control-allow-credentials", "false").lower()
                
                if acao == test_origin:
                    severity = "High" if acac == "true" else "Medium"
                    findings.append({
                        "title": f"Insecure CORS: {test_name}",
                        "severity": severity,
                        "confidence": 95,
                        "summary": f"Server dynamically reflects unvalidated origin '{test_origin}' in Access-Control-Allow-Origin header (Credentials: {acac}).",
                        "evidence": f"Request Origin: {test_origin}\nAccess-Control-Allow-Origin: {acao}\nAccess-Control-Allow-Credentials: {acac}",
                        "cwe": "CWE-942",
                        "remediation": "Validate the Origin header against a strict server-side whitelist. Never reflect arbitrary client origins."
                    })
                    logs.append(f"[!] VULNERABLE: Reflected {test_origin} with ACAC={acac}")
                elif acao == "*":
                    if acac == "true":
                        findings.append({
                            "title": "Invalid Insecure CORS Wildcard with Credentials",
                            "severity": "High",
                            "confidence": 90,
                            "summary": "Server returns Access-Control-Allow-Origin: * along with Access-Control-Allow-Credentials: true.",
                            "evidence": f"ACAO: *, ACAC: {acac}",
                            "cwe": "CWE-942",
                            "remediation": "Do not combine wildcard origins with credentials support."
                        })
                    else:
                        logs.append("Server returned public wildcard ACAO: * without credentials.")
        except Exception as e:
            logs.append(f"Probe error for origin {test_origin}: {e}")
            
    logs.append(f"CORS audit complete. {len(findings)} issues discovered.")
    return {"target": target_url, "findings": findings, "logs": logs}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_URL>"}))
        sys.exit(1)
    url = sys.argv[1]
    res = check_cors(url)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
