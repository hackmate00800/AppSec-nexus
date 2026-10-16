#!/usr/bin/env python3
"""
Wireshark PCAP & Network Traffic Auditor
AppSec Nexus Security Plugin
Analyzes packet captures (.pcap, .pcapng) and network traffic for cleartext credentials,
unencrypted protocols, and insecure cryptographic handshakes.
"""

import sys
import os
import json
import re
import struct
import base64
import socket
from urllib.parse import urlparse

def parse_pcap_packets(file_path):
    """Parses standard libpcap or PCAPNG packet bytes without third-party dependencies."""
    packets = []
    with open(file_path, "rb") as f:
        data = f.read()

    if len(data) < 24:
        return packets

    # Check magic number
    magic = data[:4]
    # Standard libpcap magic numbers:
    # 0xa1b2c3d4 (standard identical endian)
    # 0xd4c3b2a1 (swapped endian)
    # 0xa1b23c4d (nanosecond)
    # 0x0a0d0d0a (PCAPNG Section Header Block)
    if magic in (b"\xa1\xb2\xc3\xd4", b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\x3c\x4d"):
        endian = "<" if magic in (b"\xd4\xc3\xb2\xa1",) else ">"
        if magic == b"\xa1\xb2\xc3\xd4":
            endian = "="
        offset = 24
        while offset + 16 <= len(data):
            ts_sec, ts_usec, incl_len, orig_len = struct.unpack_from(f"{endian}IIII", data, offset)
            offset += 16
            if offset + incl_len > len(data):
                break
            packet_data = data[offset : offset + incl_len]
            packets.append(packet_data)
            offset += incl_len
            if len(packets) >= 5000:  # safety limit
                break
    else:
        # Fallback: scan binary stream chunks
        chunk_size = 1514
        for i in range(0, len(data), chunk_size):
            packets.append(data[i : i + chunk_size])
            if len(packets) >= 5000:
                break

    return packets

def audit_pcap(target):
    findings = []
    logs = [f"Initiating Network Traffic Audit for: {target}"]

    # 1. Local PCAP File Analysis
    if os.path.exists(target) and os.path.isfile(target):
        logs.append(f"Target identified as local file ({os.path.getsize(target)} bytes)")
        packets = parse_pcap_packets(target)
        logs.append(f"Parsed {len(packets)} packet payloads from capture.")

        cleartext_creds = []
        basic_auth_creds = []
        plaintext_http_count = 0
        tls_obsolete_count = 0

        for pkt in packets:
            # Check for HTTP Basic Auth
            if b"Authorization: Basic " in pkt or b"authorization: basic " in pkt:
                m = re.search(rb"(?i)authorization:\s*basic\s+([a-zA-Z0-9+/=]+)", pkt)
                if m:
                    raw_b64 = m.group(1).decode("ascii", errors="ignore")
                    try:
                        decoded = base64.b64decode(raw_b64).decode("utf-8", errors="ignore")
                        if ":" in decoded:
                            user, pwd = decoded.split(":", 1)
                            masked_pwd = pwd[0] + "***" if pwd else ""
                            basic_auth_creds.append(f"User: {user}, Pass: {masked_pwd}")
                    except Exception:
                        pass

            # Check for FTP / Telnet USER / PASS commands
            ftp_user = re.findall(rb"(?i)(?:USER|pass)\s+([^\r\n]+)", pkt)
            if ftp_user:
                for match in ftp_user:
                    val = match.decode("latin1", errors="ignore").strip()
                    if val and len(val) < 64:
                        cleartext_creds.append(val)

            # Check for Plaintext HTTP
            if b"GET /" in pkt or b"POST /" in pkt or b"HTTP/1.1" in pkt:
                plaintext_http_count += 1

            # Check for Deprecated SSL/TLS Record Versions (SSL 3.0: 0x0300, TLS 1.0: 0x0301, TLS 1.1: 0x0302)
            if len(pkt) >= 3 and pkt[0] == 0x16:  # TLS Handshake
                version = (pkt[1], pkt[2])
                if version in ((3, 0), (3, 1), (3, 2)):
                    tls_obsolete_count += 1

        # Evaluate Findings from PCAP
        if basic_auth_creds:
            unique_creds = list(set(basic_auth_creds))[:3]
            findings.append({
                "title": "Cleartext HTTP Basic Authentication Leaked in Network Traffic",
                "severity": "High",
                "confidence": 100,
                "summary": "Network packet inspection revealed unencrypted HTTP Basic Authentication headers containing credentials.",
                "evidence": f"Found {len(basic_auth_creds)} instances.\nSample: {', '.join(unique_creds)}",
                "cwe": "CWE-522",
                "remediation": "Enforce HTTPS with TLS 1.3 to prevent in-transit eavesdropping and token interception."
            })
            logs.append(f"[!] Alert: Found cleartext Basic Auth credentials ({len(basic_auth_creds)} occurrences).")

        if cleartext_creds:
            findings.append({
                "title": "Unencrypted Telnet/FTP Credentials Discovered",
                "severity": "High",
                "confidence": 95,
                "summary": "Cleartext user authentication strings (USER/PASS) were observed transmitted over legacy plaintext protocols.",
                "evidence": f"Detected {len(cleartext_creds)} credentials in network stream.",
                "cwe": "CWE-319",
                "remediation": "Decommission plaintext protocols (Telnet/FTP). Migrate to SSH (SFTP) and TLS-secured channels."
            })
            logs.append(f"[!] Alert: Plaintext credentials discovered in capture: {len(cleartext_creds)} occurrences.")

        if tls_obsolete_count > 0:
            findings.append({
                "title": "Deprecated TLS 1.0 / TLS 1.1 Handshake Observed in Traffic",
                "severity": "Medium",
                "confidence": 90,
                "summary": f"Observed {tls_obsolete_count} TLS handshake sessions using legacy protocol versions vulnerable to cryptographic downgrade attacks.",
                "evidence": f"Captured {tls_obsolete_count} packets with SSL/TLS record version 0x0300/0x0301/0x0302.",
                "cwe": "CWE-326",
                "remediation": "Disable TLS 1.0 and TLS 1.1 at the web server and load balancer. Enforce TLS 1.2 and TLS 1.3 exclusively."
            })
            logs.append(f"[!] Alert: Deprecated TLS sessions observed ({tls_obsolete_count} packets).")

        if plaintext_http_count > 0:
            findings.append({
                "title": "Unencrypted HTTP Application Traffic Observed",
                "severity": "Low",
                "confidence": 85,
                "summary": f"Detected {plaintext_http_count} cleartext HTTP requests/responses lacking cryptographic transport encryption.",
                "evidence": f"Found {plaintext_http_count} plaintext HTTP packets in capture.",
                "cwe": "CWE-319",
                "remediation": "Redirect all HTTP traffic (port 80) to HTTPS (port 443) with HSTS enabled."
            })

        logs.append(f"PCAP Audit complete: {len(findings)} network security issues identified.")
        return {"target": target, "findings": findings, "logs": logs}

    # 2. Remote Host / Network Endpoint Probing
    logs.append(f"Target is a network host: probing common cleartext and encrypted ports...")
    host = target.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
    
    ports_to_check = [
        (80, "HTTP", "Cleartext Web Protocol", "Low", "CWE-319"),
        (21, "FTP", "Cleartext File Transfer Protocol", "Medium", "CWE-319"),
        (23, "Telnet", "Cleartext Remote Terminal Protocol", "High", "CWE-319"),
        (110, "POP3", "Cleartext Mail Protocol", "Medium", "CWE-319"),
    ]

    for port, proto_name, desc, sev, cwe in ports_to_check:
        try:
            with socket.create_connection((host, port), timeout=3) as s:
                findings.append({
                    "title": f"Exposed Insecure Plaintext Service: {proto_name} (Port {port})",
                    "severity": sev,
                    "confidence": 95,
                    "summary": f"Host '{host}' exposes {desc} on port {port}. Traffic across this port is vulnerable to passive sniffing and interception.",
                    "evidence": f"Successfully established TCP socket to {host}:{port}",
                    "cwe": cwe,
                    "remediation": f"Disable port {port} or migrate to encrypted equivalent (e.g. HTTPS, SFTP, SSH, POP3S)."
                })
                logs.append(f"[!] Open plaintext port detected: {proto_name} on {host}:{port}")
        except Exception:
            logs.append(f"Port {port} ({proto_name}) closed or filtered.")

    logs.append(f"Network service audit complete: {len(findings)} findings recorded.")
    return {"target": target, "findings": findings, "logs": logs}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: run.py <TARGET_PCAP_OR_HOST>"}))
        sys.exit(1)

    target = sys.argv[1]
    res = audit_pcap(target)
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
