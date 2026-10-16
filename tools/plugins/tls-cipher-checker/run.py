#!/usr/bin/env python3
import sys
import json
import ssl
import socket
from urllib.parse import urlparse
from datetime import datetime, timezone

def audit_tls(url):
    findings = []
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    logs = [f"Analyzing TLS/SSL configuration for {url}"]
    
    parsed = urlparse(url)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    
    if parsed.scheme != "https":
        logs.append("Target uses plaintext HTTP; TLS checks skipped.")
        return {"target": url, "findings": findings, "logs": logs}
        
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                version = ssock.version()
                
                logs.append(f"Negotiated TLS Version: {version}")
                logs.append(f"Cipher Suite: {cipher[0]} ({cipher[1]} bits)")
                
                # Check expiration
                not_after_str = cert.get("notAfter")
                if not_after_str:
                    not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    days_left = (not_after - datetime.now(timezone.utc)).days
                    logs.append(f"Certificate expires on {not_after.isoformat()} ({days_left} days remaining)")
                    
                    if days_left < 0:
                        findings.append({
                            "title": "Expired SSL/TLS Certificate",
                            "severity": "Critical",
                            "confidence": 100,
                            "summary": f"The SSL/TLS certificate expired on {not_after_str}.",
                            "evidence": f"notAfter: {not_after_str}",
                            "cwe": "CWE-295",
                            "remediation": "Renew and deploy a valid TLS certificate immediately."
                        })
                    elif days_left < 21:
                        findings.append({
                            "title": "SSL/TLS Certificate Expiring Soon",
                            "severity": "Medium",
                            "confidence": 95,
                            "summary": f"The certificate will expire in {days_left} days.",
                            "evidence": f"Expiration: {not_after_str} (Days remaining: {days_left})",
                            "cwe": "CWE-295",
                            "remediation": "Trigger automated certificate renewal via ACME / Let's Encrypt."
                        })
                        
                # Check cipher bit length
                if cipher and cipher[2] < 128:
                    findings.append({
                        "title": "Weak TLS Cipher Key Length",
                        "severity": "High",
                        "confidence": 90,
                        "summary": f"The negotiated cipher '{cipher[0]}' uses only {cipher[2]} bits of encryption.",
                        "evidence": f"Cipher: {cipher[0]}, Secret bits: {cipher[2]}",
                        "cwe": "CWE-326",
                        "remediation": "Disable weak ciphers and require at least 128-bit AES-GCM or ChaCha20-Poly1305."
                    })
                    
                # Check TLS protocol version
                if version in ["TLSv1", "TLSv1.1", "SSLv3", "SSLv2"]:
                    findings.append({
                        "title": f"Insecure Protocol Negotiated: {version}",
                        "severity": "High",
                        "confidence": 95,
                        "summary": f"The server permitted obsolete and insecure protocol {version}.",
                        "evidence": f"Protocol: {version}",
                        "cwe": "CWE-326",
                        "remediation": "Disable TLS 1.0 and 1.1; enforce TLS 1.2 and TLS 1.3 only."
                    })

    except ssl.SSLCertVerificationError as e:
        findings.append({
            "title": "SSL/TLS Certificate Untrusted / Verification Failed",
            "severity": "High",
            "confidence": 95,
            "summary": f"Certificate verification failed: {e.verify_message}",
            "evidence": str(e),
            "cwe": "CWE-295",
            "remediation": "Ensure the certificate is issued by a recognized Certificate Authority (CA) and intermediate certificates are properly chained."
        })
        logs.append(f"Certificate verification failed: {e}")
    except Exception as e:
        logs.append(f"TLS inspection error: {e}")

    logs.append(f"TLS Audit complete. {len(findings)} findings.")
    return {"target": url, "findings": findings, "logs": logs}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_URL>"}))
        sys.exit(1)
    url = sys.argv[1]
    res = audit_tls(url)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
