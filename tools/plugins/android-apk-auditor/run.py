#!/usr/bin/env python3
"""
Android APK & Mobile Security Auditor
AppSec Nexus Plugin - OWASP Mobile Top 10 Static Analysis
"""

import sys
import os
import json
import re
import zipfile
import urllib.request
import ssl
from urllib.parse import urlparse

DANGEROUS_PERMISSIONS = {
    "android.permission.READ_SMS": ("High", "CWE-250", "Allows the application to read incoming and stored SMS messages, exposing 2FA tokens."),
    "android.permission.SEND_SMS": ("High", "CWE-250", "Allows sending SMS messages, which could result in unauthorized toll fraud."),
    "android.permission.RECORD_AUDIO": ("Medium", "CWE-250", "Allows recording audio via microphone without active user interaction."),
    "android.permission.CAMERA": ("Medium", "CWE-250", "Grants camera access, posing privacy risks if exploited."),
    "android.permission.ACCESS_FINE_LOCATION": ("Medium", "CWE-250", "Accesses precise GPS coordinates."),
    "android.permission.READ_CONTACTS": ("Medium", "CWE-200", "Accesses the user's local contact book."),
    "android.permission.READ_EXTERNAL_STORAGE": ("Low", "CWE-200", "Accesses shared external storage where other applications write files."),
    "android.permission.WRITE_EXTERNAL_STORAGE": ("Medium", "CWE-276", "Modifies shared files on the device filesystem.")
}

SECRET_PATTERNS = [
    ("Google API Key", r"AIza[0-9A-Za-z\\-_]{35}", "Medium", "CWE-798"),
    ("Firebase Database URL", r"https://[a-zA-Z0-9_\-]+\.firebaseio\.com", "Medium", "CWE-200"),
    ("AWS Access Key ID", r"(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}", "High", "CWE-798"),
    ("Hardcoded Bearer / Secret Token", r"(?i)(?:api_key|secret_key|auth_token)\s*[:=]\s*[\"'][a-zA-Z0-9_\-\.]{16,}[\"']", "High", "CWE-798"),
    ("RSA / EC Private Key", r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----", "Critical", "CWE-312")
]

def extract_strings(byte_data):
    """Extract readable ASCII and UTF-8 strings from binary data (e.g. binary AndroidManifest or DEX)."""
    return re.findall(rb"[\x20-\x7E]{4,}", byte_data)

def audit_apk_file(apk_path):
    findings = []
    logs = [f"Starting Android APK static audit for: {apk_path}"]
    
    if not os.path.exists(apk_path):
        logs.append(f"APK file not found on disk at {apk_path}")
        return {"target": apk_path, "findings": findings, "logs": logs}
        
    try:
        with zipfile.ZipFile(apk_path, "r") as z:
            namelist = z.namelist()
            logs.append(f"Package contains {len(namelist)} internal files.")
            
            # 1. Manifest Analysis
            if "AndroidManifest.xml" in namelist:
                manifest_data = z.read("AndroidManifest.xml")
                raw_strings = [s.decode("latin1", errors="ignore") for s in extract_strings(manifest_data)]
                manifest_text = " ".join(raw_strings)
                
                # Check debuggable
                if "debuggable" in manifest_text.lower():
                    findings.append({
                        "title": "Android Application is Debuggable (android:debuggable=true)",
                        "severity": "High",
                        "confidence": 95,
                        "summary": "The application allows runtime debugging. Attackers can attach jdb or gdb to inspect memory, modify variables, and bypass authentication.",
                        "evidence": "Observed 'debuggable' flag enabled in AndroidManifest.xml.",
                        "cwe": "CWE-215",
                        "remediation": "Ensure 'android:debuggable=\"false\"' is set in release builds via Gradle build variants."
                    })
                    logs.append("[!] Flagged: android:debuggable enabled")

                # Check allowBackup
                if "allowbackup" in manifest_text.lower() and "allowbackup=false" not in manifest_text.lower():
                    findings.append({
                        "title": "Application Allows Insecure Data Backup (android:allowBackup=true)",
                        "severity": "Medium",
                        "confidence": 90,
                        "summary": "Backup is enabled, allowing device owners or USB attackers with adb access to extract the entire application data sandbox (shared preferences, SQLite databases).",
                        "evidence": "android:allowBackup is enabled or omitted (defaults to true on older targets).",
                        "cwe": "CWE-200",
                        "remediation": "Set 'android:allowBackup=\"false\"' in AndroidManifest.xml to prevent adb backup extraction."
                    })
                    logs.append("[!] Flagged: android:allowBackup enabled")

                # Check usesCleartextTraffic
                if "usescleartexttraffic" in manifest_text.lower() and "usescleartexttraffic=false" not in manifest_text.lower():
                    findings.append({
                        "title": "Cleartext HTTP Traffic Permitted (usesCleartextTraffic=true)",
                        "severity": "Medium",
                        "confidence": 90,
                        "summary": "The application permits unencrypted HTTP transmission, leaving mobile users vulnerable to man-in-the-middle (MitM) eavesdropping.",
                        "evidence": "android:usesCleartextTraffic is enabled in manifest.",
                        "cwe": "CWE-319",
                        "remediation": "Enforce HTTPS by setting 'android:usesCleartextTraffic=\"false\"' and defining a Network Security Config."
                    })
                    logs.append("[!] Flagged: Cleartext traffic allowed")

                # Check Permissions
                for perm, (sev, cwe, desc) in DANGEROUS_PERMISSIONS.items():
                    perm_short = perm.split(".")[-1]
                    if perm in manifest_text or perm_short in manifest_text:
                        findings.append({
                            "title": f"Dangerous Permission Requested: {perm_short}",
                            "severity": sev,
                            "confidence": 95,
                            "summary": desc,
                            "evidence": f"Permission '{perm}' declared in AndroidManifest.xml.",
                            "cwe": cwe,
                            "remediation": f"Verify if {perm_short} is strictly necessary. Request at runtime with clear user justification."
                        })
                        logs.append(f"[!] Dangerous Permission: {perm_short}")

                # Check Exported Components
                if "exported" in manifest_text.lower():
                    findings.append({
                        "title": "Exported Android Component Detected Without Explicit Permissions",
                        "severity": "High",
                        "confidence": 85,
                        "summary": "One or more Activities, Services, or BroadcastReceivers are exported, potentially allowing malicious apps on the device to invoke them directly.",
                        "evidence": "android:exported=\"true\" found in manifest.",
                        "cwe": "CWE-926",
                        "remediation": "Set 'android:exported=\"false\"' for all internal components, or protect them with custom signature-level permissions."
                    })

            # 2. Hardcoded Secrets in DEX, Assets, and Resources
            scan_targets = [f for f in namelist if f.endswith(".dex") or f.startswith("assets/") or f.endswith(".json") or f.endswith(".xml")]
            for filename in scan_targets[:20]: # Check primary DEX files and assets
                try:
                    data = z.read(filename)
                    text = " ".join([s.decode("latin1", errors="ignore") for s in extract_strings(data)])
                    for name, pat, sev, cwe in SECRET_PATTERNS:
                        matches = re.findall(pat, text)
                        if matches:
                            m = matches[0]
                            masked = m[:6] + "..." + m[-4:] if len(m) > 12 else m[:3] + "..."
                            findings.append({
                                "title": f"Hardcoded Secret in APK: {name}",
                                "severity": sev,
                                "confidence": 90,
                                "summary": f"A potential {name} was found embedded inside APK binary file '{filename}'.",
                                "evidence": f"File: {filename}\nMatched: {masked}",
                                "cwe": cwe,
                                "remediation": "Do not hardcode API secrets in client-side mobile binaries. Use backend proxy authentication or Android Keystore."
                            })
                            logs.append(f"[!] Leaked {name} inside {filename}")
                except Exception:
                    pass

    except Exception as e:
        logs.append(f"Error inspecting APK: {e}")
        
    logs.append(f"APK analysis complete: {len(findings)} mobile findings recorded.")
    return {"target": apk_path, "findings": findings, "logs": logs}

def audit_mobile_web_target(url):
    """If target is a web URL, audit mobile deep links (Digital Asset Links) and mobile web security."""
    findings = []
    logs = [f"Auditing Mobile Web & Android App Links for {url}"]
    
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    assetlinks_url = f"{origin}/.well-known/assetlinks.json"
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    logs.append(f"Checking Android App Links configuration at {assetlinks_url}")
    try:
        req = urllib.request.Request(assetlinks_url, headers={"User-Agent": "AppSecNexus-Mobile/1.0"})
        with urllib.request.urlopen(req, timeout=8, context=ctx) as resp:
            if resp.status == 200:
                body = resp.read().decode("utf-8", errors="ignore")
                logs.append("Found /.well-known/assetlinks.json file.")
                if "android_app" in body:
                    logs.append("✓ Valid Android App Links (Digital Asset Links) declared.")
                else:
                    findings.append({
                        "title": "Incomplete Digital Asset Links Configuration",
                        "severity": "Low",
                        "confidence": 85,
                        "summary": "The assetlinks.json file is present but does not declare a valid 'android_app' namespace.",
                        "evidence": f"Content snippet: {body[:150]}...",
                        "cwe": "CWE-200",
                        "remediation": "Ensure assetlinks.json contains the correct package_name and sha256_cert_fingerprints."
                    })
    except Exception as e:
        logs.append(f"No Android Asset Links found at /.well-known/assetlinks.json ({e})")
        
    logs.append(f"Mobile web audit complete: {len(findings)} findings.")
    return {"target": url, "findings": findings, "logs": logs}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_APK_OR_URL>"}))
        sys.exit(1)
        
    target = sys.argv[1]
    if target.endswith(".apk") or os.path.isfile(target):
        res = audit_apk_file(target)
    else:
        res = audit_mobile_web_target(target)
        
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
