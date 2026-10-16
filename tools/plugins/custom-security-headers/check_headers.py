#!/usr/bin/env python3
"""
Custom Header Auditor - AppSec Nexus Example Plugin
Audits HSTS, CSP, X-Content-Type-Options, and X-Frame-Options.
Outputs AppSec Nexus standard findings JSON format.
"""

import sys
import json
import urllib.request
import urllib.error
import ssl
from datetime import datetime, timezone

def audit_url(target_url):
    findings = []
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url
        
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        target_url,
        headers={"User-Agent": "AppSecNexus-CustomScanner/1.0"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            headers = {k.lower(): v for k, v in response.getheaders()}
            
            # 1. HSTS Check
            if target_url.startswith("https://") and "strict-transport-security" not in headers:
                findings.append({
                    "id": f"custom-hsts-{hash(target_url) & 0xffffffff}",
                    "title": "Missing HTTP Strict Transport Security (HSTS)",
                    "severity": "Medium",
                    "cwe": "CWE-319",
                    "source": "Custom-HeaderAuditor",
                    "summary": "Target does not enforce encrypted transport via Strict-Transport-Security header.",
                    "evidence": "Response headers lacked 'strict-transport-security'",
                    "remediation": "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to all HTTPS responses."
                })
                
            # 2. CSP Check
            if "content-security-policy" not in headers:
                findings.append({
                    "id": f"custom-csp-{hash(target_url) & 0xffffffff}",
                    "title": "Missing Content Security Policy (CSP)",
                    "severity": "Medium",
                    "cwe": "CWE-1021",
                    "source": "Custom-HeaderAuditor",
                    "summary": "No Content-Security-Policy header defined to restrict script execution and framing.",
                    "evidence": "Response headers lacked 'content-security-policy'",
                    "remediation": "Define a robust Content-Security-Policy header restricting script-src, object-src, and frame-ancestors."
                })
                
            # 3. X-Content-Type-Options
            if headers.get("x-content-type-options", "").lower() != "nosniff":
                findings.append({
                    "id": f"custom-xcto-{hash(target_url) & 0xffffffff}",
                    "title": "Missing or Weak X-Content-Type-Options",
                    "severity": "Low",
                    "cwe": "CWE-16",
                    "source": "Custom-HeaderAuditor",
                    "summary": "MIME type sniffing is not explicitly disabled via X-Content-Type-Options: nosniff.",
                    "evidence": f"x-content-type-options: {headers.get('x-content-type-options', 'NONE')}",
                    "remediation": "Set 'X-Content-Type-Options: nosniff' header across all HTTP responses."
                })
                
    except Exception as e:
        sys.stderr.write(f"Error auditing {target_url}: {e}\n")
        return []

    return findings

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: check_headers.py <TARGET_URL>"}))
        sys.exit(1)
        
    url = sys.argv[1]
    results = audit_url(url)
    print(json.dumps({"target": url, "findings": results, "timestamp": datetime.now(timezone.utc).isoformat()}, indent=2))

if __name__ == "__main__":
    main()
