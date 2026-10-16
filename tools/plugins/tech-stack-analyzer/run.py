#!/usr/bin/env python3
import sys
import json
import urllib.request
import ssl
import re

def analyze_tech(url):
    findings = []
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    logs = [f"Fingerprinting technologies on {url}"]
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppSecNexus/1.0"}
    )
    
    tech_detected = []
    
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
            body = resp.read(256 * 1024).decode("utf-8", errors="ignore")
            
            # 1. Server Header Disclosure
            server = headers.get("server")
            if server:
                tech_detected.append(f"Server: {server}")
                if any(c.isdigit() for c in server):
                    findings.append({
                        "title": "Web Server Detailed Version Disclosure",
                        "severity": "Low",
                        "confidence": 95,
                        "summary": f"The Server response header discloses exact server software and version ('{server}').",
                        "evidence": f"Server: {server}",
                        "cwe": "CWE-200",
                        "remediation": "Configure the web server to suppress or genericize the 'Server' header (e.g., ServerTokens Prod in Apache, server_tokens off in Nginx)."
                    })
                logs.append(f"Detected Web Server: {server}")

            # 2. X-Powered-By Disclosure
            x_powered = headers.get("x-powered-by")
            if x_powered:
                tech_detected.append(f"Framework: {x_powered}")
                findings.append({
                    "title": "Backend Technology Disclosure (X-Powered-By)",
                    "severity": "Low",
                    "confidence": 95,
                    "summary": f"The application advertises its underlying framework via X-Powered-By: {x_powered}.",
                    "evidence": f"X-Powered-By: {x_powered}",
                    "cwe": "CWE-200",
                    "remediation": "Disable the X-Powered-By header in application configuration (e.g. app.disable('x-powered-by') in Express.js)."
                })
                logs.append(f"Detected Framework: {x_powered}")

            # 3. CDN & Reverse Proxies
            if "cf-ray" in headers:
                tech_detected.append("CDN: Cloudflare")
            if "x-amz-cf-id" in headers or "x-amz-request-id" in headers:
                tech_detected.append("Cloud: Amazon Web Services (CloudFront / S3)")
            if "x-fastly-request-id" in headers:
                tech_detected.append("CDN: Fastly")

            # 4. Frontend library detection in body
            if "__NEXT_DATA__" in body:
                tech_detected.append("Frontend: Next.js")
            if "react" in body.lower() or "_reactRootContainer" in body:
                tech_detected.append("Frontend: React.js")
            if "vue" in body.lower() or "data-v-" in body:
                tech_detected.append("Frontend: Vue.js")
            if "ng-version" in body:
                tech_detected.append("Frontend: Angular")
            if "wp-content" in body or "wp-includes" in body:
                tech_detected.append("CMS: WordPress")
                findings.append({
                    "title": "WordPress CMS Detected",
                    "severity": "Info",
                    "confidence": 90,
                    "summary": "Target uses WordPress CMS. Ensure plugins and core version are audited against known CVEs.",
                    "evidence": "Observed wp-content / wp-includes directory references in page markup.",
                    "cwe": "CWE-200",
                    "remediation": "Keep WordPress core, themes, and plugins updated to their latest security patches."
                })

            for t in tech_detected:
                logs.append(f"[+] Identified: {t}")

    except Exception as e:
        logs.append(f"Fingerprinting error: {e}")
        
    logs.append(f"Technology detection complete: {len(tech_detected)} components identified.")
    return {"target": url, "findings": findings, "logs": logs, "technologies": tech_detected}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_URL>"}))
        sys.exit(1)
    url = sys.argv[1]
    res = analyze_tech(url)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
