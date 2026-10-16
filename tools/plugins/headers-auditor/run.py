#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.error
import ssl
from datetime import datetime

def audit_headers(url):
    findings = []
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    logs = [f"Starting Security Header Audit for {url}"]
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AppSecNexus-Plugin/1.0 (HeadersAuditor)"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
            logs.append(f"Received HTTP {resp.status} with {len(headers)} response headers")
            
            # 1. HSTS
            if url.startswith("https://"):
                if "strict-transport-security" not in headers:
                    findings.append({
                        "title": "Missing HTTP Strict Transport Security (HSTS)",
                        "severity": "Medium",
                        "confidence": 95,
                        "summary": "The web application does not transmit the Strict-Transport-Security header, leaving users vulnerable to SSL-stripping attacks.",
                        "evidence": "Response headers lacked 'strict-transport-security'.",
                        "cwe": "CWE-319",
                        "remediation": "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to all HTTPS responses."
                    })
                else:
                    logs.append("✓ HSTS header present")

            # 2. CSP
            if "content-security-policy" not in headers:
                findings.append({
                    "title": "Missing Content Security Policy (CSP)",
                    "severity": "High",
                    "confidence": 90,
                    "summary": "No Content-Security-Policy header was detected. CSP is the primary defense mitigating Cross-Site Scripting (XSS) and data injection.",
                    "evidence": "Response headers lacked 'content-security-policy'.",
                    "cwe": "CWE-1021",
                    "remediation": "Define a restrictive CSP such as: default-src 'self'; script-src 'self'; object-src 'none';"
                })
            else:
                csp_val = headers["content-security-policy"]
                if "unsafe-inline" in csp_val or "*" in csp_val:
                    findings.append({
                        "title": "Weak Content Security Policy Configuration",
                        "severity": "Medium",
                        "confidence": 85,
                        "summary": "CSP contains permissive directives ('unsafe-inline' or '*') which reduce protection against Cross-Site Scripting.",
                        "evidence": f"content-security-policy: {csp_val[:120]}...",
                        "cwe": "CWE-1021",
                        "remediation": "Replace 'unsafe-inline' with cryptographic nonces or hashes (e.g., 'nonce-random123')."
                    })
                else:
                    logs.append("✓ Strict CSP header present")

            # 3. X-Content-Type-Options
            if headers.get("x-content-type-options", "").lower() != "nosniff":
                findings.append({
                    "title": "Missing X-Content-Type-Options: nosniff",
                    "severity": "Low",
                    "confidence": 90,
                    "summary": "MIME-sniffing is not explicitly disabled, allowing browsers to interpret files as different MIME types (e.g. executing uploaded images as scripts).",
                    "evidence": f"x-content-type-options: {headers.get('x-content-type-options', 'NONE')}",
                    "cwe": "CWE-16",
                    "remediation": "Add 'X-Content-Type-Options: nosniff' header."
                })

            # 4. X-Frame-Options
            if "x-frame-options" not in headers and "frame-ancestors" not in headers.get("content-security-policy", ""):
                findings.append({
                    "title": "Missing Clickjacking Protection (X-Frame-Options / frame-ancestors)",
                    "severity": "Medium",
                    "confidence": 85,
                    "summary": "The application allows framing by other origins, exposing users to UI redressing and Clickjacking attacks.",
                    "evidence": "Neither 'X-Frame-Options' nor CSP 'frame-ancestors' directive were present.",
                    "cwe": "CWE-1021",
                    "remediation": "Set 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN', or use CSP 'frame-ancestors self'."
                })

            # 5. Cache-Control for sensitive content
            cc = headers.get("cache-control", "").lower()
            if "no-store" not in cc and "no-cache" not in cc:
                findings.append({
                    "title": "Permissive Cache-Control on Web Root",
                    "severity": "Info",
                    "confidence": 75,
                    "summary": "Responses may be stored in shared or intermediate HTTP proxy caches.",
                    "evidence": f"cache-control: {headers.get('cache-control', 'NONE')}",
                    "cwe": "CWE-524",
                    "remediation": "Ensure authenticated and sensitive responses use 'Cache-Control: no-store, max-age=0'."
                })

            # 6. Cookies flags
            set_cookies = resp.headers.get_all("Set-Cookie") or []
            for sc in set_cookies:
                sc_lower = sc.lower()
                c_name = sc.split("=")[0].strip()
                if "httponly" not in sc_lower:
                    findings.append({
                        "title": f"Cookie '{c_name}' Missing HttpOnly Flag",
                        "severity": "Medium",
                        "confidence": 95,
                        "summary": f"The cookie '{c_name}' does not specify the HttpOnly attribute, allowing JavaScript access via document.cookie.",
                        "evidence": f"Set-Cookie: {sc[:80]}...",
                        "cwe": "CWE-1004",
                        "remediation": f"Append '; HttpOnly' to the Set-Cookie definition for {c_name}."
                    })
                if url.startswith("https://") and "secure" not in sc_lower:
                    findings.append({
                        "title": f"Cookie '{c_name}' Missing Secure Flag",
                        "severity": "Medium",
                        "confidence": 95,
                        "summary": f"The cookie '{c_name}' is not marked Secure and may be sent in cleartext over unencrypted HTTP.",
                        "evidence": f"Set-Cookie: {sc[:80]}...",
                        "cwe": "CWE-614",
                        "remediation": f"Append '; Secure' to the Set-Cookie definition for {c_name}."
                    })

    except Exception as e:
        logs.append(f"Connection error: {e}")
        
    logs.append(f"Completed audit: {len(findings)} findings recorded.")
    return {"target": url, "findings": findings, "logs": logs}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_URL>"}))
        sys.exit(1)
    target = sys.argv[1]
    res = audit_headers(target)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
