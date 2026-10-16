# 📚 Master Cyber Academy: Cybersecurity, Networking, and OS Architecture

---

## 📑 Comprehensive Curriculum Index
1. [Core Glossary & Essential Terminology](#1-core-glossary--essential-terminology)
2. [Key Differences & Comparison Tables](#2-key-differences--comparison-tables)
3. [Cybersecurity Architecture & OWASP Top 10](#3-cybersecurity-architecture--owasp-top-10)
4. [Real-World Breach Case Studies & Attack Scenarios](#4-real-world-breach-case-studies--attack-scenarios)
5. [Computer Networking Deep Dive (OSI, TCP/IP, Subnetting, TLS & Diagnostics)](#5-computer-networking-deep-dive)
6. [Linux System Security, Architecture & Command Reference](#6-linux-system-security-architecture--command-reference)
7. [Windows Security Architecture, Active Directory & PowerShell Reference](#7-windows-security-architecture-active-directory--powershell-reference)

---

# 1. Core Glossary & Essential Terminology

| Term | Category | Authoritative Definition | Real-World Context & Example |
| :--- | :--- | :--- | :--- |
| **Vulnerability** | Security Core | A flaw or weakness in software code, hardware logic, or system configuration that can be accidentally triggered or deliberately exploited. | An unpatched buffer overflow in an Apache web server (CVE-2021-41773). |
| **Threat** | Security Core | Any circumstance, entity, or action with the potential to cause harm, unauthorized disclosure, data destruction, or denial of service. | An external ransomware group (LockBit), a rogue automated scanning worm, or a disgruntled insider employee. |
| **Exploit** | Security Core | Specific input, software script, or sequence of commands that takes advantage of a vulnerability to cause unintended behavior. | A Python script that sends a crafted SQL payload to bypass an e-commerce authentication screen. |
| **Risk** | Security Core | The probability of a threat actor exercising a vulnerability, multiplied by the resulting operational or financial impact: $\text{Risk} = \text{Threat} \times \text{Vulnerability} \times \text{Impact}$. | A critical flaw on an internal offline sandbox has low risk; the same flaw on a public production payment portal has critical risk. |
| **Attack Surface** | Security Core | The total sum of all accessible network ports, user inputs, APIs, interfaces, and trusted accounts that an untrusted entity can reach and attempt to probe. | Closing unused ports 21 (FTP) and 23 (Telnet) directly shrinks the network attack surface. |
| **Zero Trust** | Architecture | A cybersecurity paradigm requiring all users, devices, and network flows to be authenticated, authorized, and continuously validated before being granted access: "Never Trust, Always Verify." | Rejecting implicit trust based solely on being inside the corporate office Wi-Fi network; requiring MFA and device health checks on every request. |
| **Defense-in-Depth** | Architecture | Layering diverse defensive controls (physical, network, host, application, data) so that if one fails, subsequent layers prevent total compromise. | Perimeter Firewall $\rightarrow$ WAF $\rightarrow$ TLS 1.3 $\rightarrow$ RBAC $\rightarrow$ Database Field Encryption. |
| **Principle of Least Privilege (PoLP)** | Security Core | Granting users, applications, and service daemons only the minimum set of permissions necessary to execute their legitimate tasks. | Running Nginx or Apache under a low-privilege `www-data` account rather than as `root`. |
| **CIA Triad** | Security Core | The foundational model of information security: Confidentiality (data secrecy), Integrity (data accuracy/tamper-resistance), and Availability (system uptime). | Encrypting databases at rest (Confidentiality), generating SHA-256 HMACs (Integrity), and using redundant load balancers (Availability). |
| **Non-Repudiation** | Security Core | A guarantee that the author or sender of a message or transaction cannot deny the authenticity of their signature or sending action. | Digital signatures utilizing asymmetric private keys and immutable audit logs. |
| **PDU (Protocol Data Unit)** | Networking | A formatted block of data carried at a specific layer of the OSI model (Data at L7-5, Segment/Datagram at L4, Packet at L3, Frame at L2, Bits at L1). | An IPv4 packet routed across the internet between two public routers. |
| **Socket** | Networking | The logical software endpoint of a bidirectional inter-process communication flow, defined by `IP Address : Port Number : Protocol`. | `192.168.1.100:443 (TCP)` representing an active encrypted web connection. |
| **Subnet / CIDR** | Networking | Classless Inter-Domain Routing notation specifying how many leading bits of an IP address represent the network prefix versus host identifiers. | `/24` gives 256 addresses (254 usable hosts) with subnet mask `255.255.255.0`. |
| **MTU (Maximum Transmission Unit)** | Networking | The maximum size (in bytes) of a single packet or frame that can be transmitted across a network layer without fragmentation. | Standard Ethernet MTU is 1500 bytes. Jumbo frames allow up to 9000 bytes. |
| **ARP (Address Resolution Protocol)** | Networking | Protocol that maps an IP address (Layer 3) to a physical Ethernet hardware MAC address (Layer 2) on a local network segment. | When PC-A wants to ping PC-B on 192.168.1.5, it broadcasts `Who has 192.168.1.5? Tell 192.168.1.2`. |
| **NAT (Network Address Translation)** | Networking | Technique allowing an entire private LAN of multiple computers to share one or more public IP addresses by rewriting packet headers. | Your home Wi-Fi router rewriting source port 54321 on 192.168.1.15 to its single ISP public IP. |
| **ASLR (Address Space Layout Randomization)** | Memory Safety | An operating system defense that randomizes the memory address positions of key data areas (stack, heap, libraries) to block memory corruption exploits. | Prevents buffer overflow exploits from hardcoding shellcode jump targets into `0x7fffffff...`. |
| **DEP / NX (Data Execution Prevention / No-Execute)** | Memory Safety | Hardware-enforced memory flag that marks memory regions (like the call stack) as non-executable, preventing code execution from data buffers. | If an attacker injects shellcode onto the stack, the CPU refuses to execute it, throwing an `Access Violation`. |
| **DACL / SACL** | Windows OS | Discretionary Access Control List (who has rights to an object) vs. System Access Control List (what events generate security audit logs). | Setting a DACL on a folder so only `BUILTIN\Administrators` can write files; SACL logs failed delete attempts. |
| **SID (Security Identifier)** | Windows OS | A unique alphanumeric string assigned to every user, group, and computer object in Windows (`S-1-5-21-...`). | Renaming a user account does not change their SID; privileges remain attached to the SID. |
| **Access Token** | Windows OS | An internal Windows kernel object generated upon logon that contains the user's SID, group SIDs, and security privileges. | Attached to every process spawned by that user to determine authorization against object DACLs. |
| **SUID / SGID** | Linux OS | Set User ID / Set Group ID special permission bits that cause an executable to run with the privileges of the file owner (e.g. root) rather than the launching user. | `/usr/bin/passwd` needs SUID root to write the user's new hashed password into `/etc/shadow`. |
| **Sysmon** | Windows Monitoring | System Monitor: A free Microsoft Sysinternals device driver and service that logs detailed process creation, network connections, and file changes. | Logs parent-child process relationships (`Event ID 1`) with complete command-line strings and SHA-256 hashes. |
| **EDR / SIEM / SOAR** | Enterprise SecOps | Endpoint Detection & Response (host-level agent), Security Information & Event Management (centralized log lake), Security Orchestration, Automation & Response. | CrowdStrike / Defender (EDR) sends telemetry to Splunk / Sentinel (SIEM), triggering automated firewall IP blocking (SOAR). |
| **CVE / CVSS / CWE** | Vulnerability Mgmt | Common Vulnerabilities and Exposures (unique ID e.g. CVE-2024-3094), Common Vulnerability Scoring System (0.0 - 10.0 scale), Common Weakness Enumeration (flaw type e.g. CWE-89 SQLi). | CVE-2021-44228 (Log4Shell) had a CVSS score of 10.0 (Critical) and CWE-502 (Insecure Deserialization). |

---

# 2. Key Differences & Comparison Tables

### Comparison 1: Vulnerability vs. Threat vs. Exploit vs. Risk
```
  [ THREAT ACTOR ]  ──────── exercises ───────>  [ EXPLOIT CODE ]
         │                                               │
         │ (Motivation & Capability)                     │ (Weaponized Delivery)
         v                                               v
   calculates                                     targets specific
         │                                               │
         v                                               v
     [ RISK ] <── assessed as probability & impact ── [ VULNERABILITY ]
```

| Dimension | Vulnerability | Threat | Exploit | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **What it is** | The flaw or security hole | The malicious actor or hazard | The weaponized tool or payload | The potential financial or operational loss |
| **Under your control?** | **Yes** (You can patch or harden it) | **No** (Adversaries exist independently) | **No** (Exploit scripts circulate online) | **Yes** (You can mitigate, transfer, or accept it) |
| **Example** | Missing input validation on `id` query parameter | Financially motivated cybercrime syndicate | `' UNION SELECT credit_card FROM payments--` | High probability of \$1M regulatory GDPR/PCI fine |
| **Defensive Action** | Secure code review, SAST/DAST, patch cycles | Threat intelligence, firewall geoblocking, honeypots | Web Application Firewall (WAF), IDS/IPS signatures | Defense-in-depth, cyber insurance, incident response plans |

---

### Comparison 2: Encoding vs. Encryption vs. Hashing vs. Obfuscation
```
Input: "SuperSecretKey99"
  ├── Encoding (Base64)      ──> "U3VwZXJTZWNyZXRLZXk5OQ=="        (Reversible by ANYONE, NO key required)
  ├── Encryption (AES-256)   ──> 0x7c4f... [ciphertext] + IV       (Reversible ONLY with correct Secret Key)
  ├── Hashing (SHA-256)      ──> 8d969eef6ecad3c29a3a629280e686cf0 (ONE-WAY mathematical digest, irreversible)
  └── Obfuscation (JS/C)     ──> _0x3b1a(["\x53\x75\x70..."])      (Intentionally obfuscated to hinder analysis)
```

| Dimension | Encoding | Encryption | Hashing | Obfuscation |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Goal** | Data format compatibility across systems | Confidentiality against unauthorized eavesdroppers | Integrity and tamper-detection | Slow down reverse engineering of binaries |
| **Requires Key?** | **No** (Public standard format) | **Yes** (Symmetric secret or Asymmetric private) | **No** (Fixed mathematical algorithm) | **No** |
| **Reversible?** | **Yes** (Anyone can decode trivially) | **Yes** (Anyone holding the private key) | **No** (One-way mathematical function) | **Yes** (With time and deobfuscation tools) |
| **Common Algorithms** | `Base64`, URL-encoding (`%20`), Hex, ASCII | `AES-GCM-256`, `ChaCha20-Poly1305`, `RSA`, `ECC` | `SHA-256`, `SHA-3`, `Argon2id`, `bcrypt`, `scrypt` | ProGuard, JavaScript Obfuscator, VMProtect |
| **Security Note** | **Never provides security!** | Essential for data in transit and data at rest | Passwords must be hashed with unique random **salts** | Security through obscurity only; never reliance |

---

### Comparison 3: TCP vs. UDP
| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection Type** | Connection-oriented (Explicit 3-Way Handshake) | Connectionless (Fire and forget) |
| **Reliability** | **Guaranteed**: Packets are acknowledged; lost packets retransmitted | **Unreliable**: No acknowledgement; packets can drop or arrive out of order |
| **Ordering** | In-order delivery guaranteed by Sequence Numbers | Packets arrive in arbitrary order |
| **Header Size** | 20 to 60 bytes (Complex control flags, sequence/ack fields) | 8 bytes (Source port, dest port, length, checksum) |
| **Flow & Congestion Control** | Sliding Window, Congestion Avoidance (Slow Start) | None (Sender transmits as fast as possible) |
| **Typical Use Cases** | Web (`HTTPS`), File Transfer (`SFTP`), Remote Shell (`SSH`), Databases | DNS lookups (Port 53), VoIP calls, Live Video Streaming, Online Gaming, DHCP |

---

### Comparison 4: Symmetric vs. Asymmetric Cryptography
```
Symmetric:   [ Plaintext ] ─── Encrypt with KEY K ───> [ Ciphertext ] ─── Decrypt with KEY K ───> [ Plaintext ]
Asymmetric:  [ Plaintext ] ─── Encrypt with PUBLIC KEY ───> [ Ciphertext ] ─── Decrypt with PRIVATE KEY ───> [ Plaintext ]
```

| Property | Symmetric Encryption | Asymmetric (Public Key) Encryption |
| :--- | :--- | :--- |
| **Key Architecture** | Single shared secret key for both encryption & decryption | Key pair: Public key (encrypt/verify) + Private key (decrypt/sign) |
| **Performance Speed** | Extremely fast (hardware-accelerated via Intel AES-NI) | 100x to 1000x slower (complex modular exponentiation / elliptic curves) |
| **Key Distribution Problem** | Difficult: How to safely share the secret key without interception? | Solved: Public key can be freely broadcasted anywhere on the internet |
| **Standard Algorithms** | AES-128, AES-256 (GCM mode), ChaCha20 | RSA-3072/4096, ECDSA, Ed25519, X25519 |
| **Primary Modern Use** | Bulk data encryption (TLS session traffic, BitLocker, VPN tunnels) | Key exchange (ECDH) in TLS handshakes, SSH keys, digital signatures |

---

### Comparison 5: NTLM vs. Kerberos 5 (Windows Authentication)
| Property | NTLM (NT LAN Manager) | Kerberos 5 (Active Directory) |
| :--- | :--- | :--- |
| **Architecture** | 3-way Challenge-Response (`Type 1`, `Type 2`, `Type 3`) | Centralized Ticket-Granting Service (Key Distribution Center - KDC) |
| **Mutual Auth** | Client authenticates to server; server identity **not** verified | **Mutual Authentication**: Both client and server prove identity to each other |
| **Pass-the-Hash Risk** | **High**: NTLM response can be replayed or relayed via SMB | **Mitigated**: Kerberos uses time-stamped tickets; TGT cannot be relayed to arbitrary servers |
| **Delegation** | Unconstrained or unsupported | Constrained delegation and Resource-Based Constrained Delegation (RBCD) |
| **Performance** | Server must query Domain Controller for every logon challenge | Client caches tickets (TGT/TGS); minimal DC load |
| **Protocol / Port** | SMB / RPC (TCP 445, 135) | Kerberos (TCP/UDP port 88) |

---

### Comparison 6: Linux vs. Windows Security Model
| Dimension | Linux Security Architecture | Windows Security Architecture |
| :--- | :--- | :--- |
| **Privilege Model** | Superuser (`root`, UID 0) vs unprivileged UIDs; `sudo` delegation | Dual-mode: User Mode (Ring 3) vs Kernel Mode (Ring 0); Builtin Administrators, `SYSTEM`, `TrustedInstaller` |
| **Access Control** | Traditional POSIX (`rwx` for User, Group, Others), Extended ACLs (`setfacl`), SELinux/AppArmor MAC | Windows Security Descriptors: DACL (Discretionary ACL) & SACL (Audit ACL) evaluated against user Access Tokens |
| **Authentication** | Pluggable Authentication Modules (PAM), `/etc/passwd`, `/etc/shadow` | Local Security Authority Subsystem Service (LSASS), NTLM, Kerberos 5, Active Directory Domain Services |
| **Logging Subsystem** | Systemd Journal (`journalctl`), Syslog (`/var/log/auth.log`, `/var/log/syslog`) | Windows Event Log (Application, Security, System) + Sysmon (`Get-WinEvent`) |
| **Execution Control** | File execute bit (`+x`), mount options (`noexec`), AppArmor, SELinux | AppLocker, Windows Defender Application Control (WDAC), Software Restriction Policies |

---

# 3. Cybersecurity Architecture & OWASP Top 10

## The STRIDE Threat Modeling Architecture
```
+---------------------------------------------------------------------------------------+
| Threat Category        | Violated Property  | Real-World Example      | Defensive Countermeasure    |
+------------------------+--------------------+-------------------------+-----------------------------+
| [S] Spoofing           | Authenticity       | Impersonating an admin  | Strong MFA, PKI TLS Client  |
| [T] Tampering          | Integrity          | Modifying bank balances | SHA-256 HMAC, Signatures    |
| [R] Repudiation        | Non-Repudiation    | Denying a wire transfer | Append-only audit logging   |
| [I] Info Disclosure    | Confidentiality    | Leaking customer SSNs   | AES-256, TLS 1.3 encryption |
| [D] Denial of Service  | Availability       | SYN flood crashing app  | Anycast, Rate Limiting, WAF |
| [E] Elevation of Priv  | Authorization      | SUID root escalation    | Least privilege, AppArmor   |
+---------------------------------------------------------------------------------------+
```

---

## Detailed OWASP Top 10 Scenarios & Remediation

### 1. SQL Injection (SQLi) - CWE-89
* **Real-World Mechanism:** Attacker inputs `' OR 1=1;--` into an authentication or search parameter. Raw string concatenation combines untrusted data with SQL commands, forcing the database engine to execute attacker instructions.
* **Vulnerable vs. Secure Code:**
  ```python
  # ❌ VULNERABLE: Direct String Formatting
  def get_user_bad(username):
      query = f"SELECT id, email, role FROM users WHERE username = '{username}'"
      cursor.execute(query) # Attacker controls query logic!

  # ✅ SECURE: Parameterized Prepared Statement
  def get_user_good(username):
      query = "SELECT id, email, role FROM users WHERE username = %s"
      cursor.execute(query, (username,)) # SQL engine treats input purely as literal data!
  ```

---

### 2. Cross-Site Scripting (XSS) - CWE-79
* **Real-World Mechanism:** An application renders unescaped user input into HTML. The browser executes attacker-injected JavaScript, which accesses `document.cookie` or captures keystrokes.
* **Vulnerable vs. Secure Implementation:**
  ```javascript
  // ❌ VULNERABLE: Direct innerHTML injection
  document.getElementById("user-comment").innerHTML = commentData;

  // ✅ SECURE: Safe DOM Property + Context Encoding
  document.getElementById("user-comment").textContent = commentData;
  ```
* **Defense-in-Depth:** Set `HttpOnly` on session cookies so client JavaScript cannot read them; enforce strict Content Security Policy (`Content-Security-Policy: default-src 'self'`).

---

### 3. Server-Side Request Forgery (SSRF) - CWE-918
* **Real-World Mechanism:** The server fetches a user-supplied URL (e.g. for avatar upload) without validating the destination. Attacker supplies `http://169.254.169.254/latest/meta-data/` to harvest cloud IAM credentials.
* **Defensive Architecture:**
```
User Input URL ──> [ Domain Whitelist Check ] ──> [ DNS Resolve ] ──> [ Is IP Private/169.254? ]
                                                                                 │
                                                                 +───────────────┴───────────────+
                                                                 │                               │
                                                             (Yes: BLOCK!)                 (No: ALLOW)
```

---

# 4. Real-World Breach Case Studies & Attack Scenarios

### Case Study 1: Equifax Apache Struts Breach (CVE-2017-5638)
* **What Happened:** In March 2017, attackers targeted an unpatched deserialization / OGNL expression flaw in the Jakarta Multipart parser of Apache Struts.
* **Root Cause:** A patch was available 2 months prior to the intrusion, but was never deployed due to missing asset inventory and lack of automated vulnerability patch management.
* **Impact:** 147 million consumers had Social Security numbers, birthdays, and credit histories stolen. Over \$700 million in legal settlements.
* **Key Defensive Lessons:**
  1. Maintain an automated Software Bill of Materials (SBOM) and Software Composition Analysis (SCA) scanner.
  2. Implement internal network segmentation so web servers cannot freely query internal database clusters.

---

### Case Study 2: Capital One AWS Cloud Metadata SSRF Breach
* **What Happened:** An attacker exploited an SSRF flaw in a misconfigured ModSecurity open-source WAF running on an AWS EC2 instance.
* **Root Cause:** The EC2 instance could freely query AWS IMDSv1 (`http://169.254.169.254/latest/meta-data/iam/security-credentials/`). The attacker extracted the temporary IAM role credentials and used them to download 100 million customer credit card applications from Amazon S3 buckets.
* **Key Defensive Lessons:**
  1. Transition all cloud workloads to **IMDSv2**, which requires a session token `PUT` request with `X-aws-ec2-metadata-token-ttl-seconds: 21600` that SSRF cannot easily spoof.
  2. Implement strict least privilege on IAM roles: web servers should never hold S3 `ListAllMyBuckets` permissions.

---

### Case Study 3: Target Third-Party HVAC Vendor Credential Pivot
* **What Happened:** Attackers compromised the network credentials of Fazio Mechanical Services (a third-party heating and refrigeration contractor) via a phishing email carrying Citadel malware.
* **Root Cause:** The HVAC vendor had network access to Target's billing portal. Target lacked network segmentation between their corporate vendor portal and the in-store Point of Sale (POS) card reader network.
* **Impact:** Attackers moved laterally and installed memory-scraping malware on POS terminals, harvesting 40 million credit and debit card numbers.
* **Key Defensive Lessons:**
  1. Apply **Zero Trust Micro-segmentation**: vendor management portals must never have network routes to POS or PCI-DSS cardholder environments.
  2. Enforce Mandatory Multi-Factor Authentication (MFA) on all external partner logins.

---

### Case Study 4: SolarWinds Sunburst CI/CD Supply-Chain Tampering
* **What Happened:** Advanced threat actors compromised the internal build server (TeamCity) of SolarWinds and injected a backdoor into the source code of `SolarWinds.Orion.Core.BusinessLayer.dll` during compilation.
* **Root Cause:** Compromised build pipelines where official digital signatures were applied to modified binary artifacts.
* **Impact:** The digitally signed update was downloaded by 18,000 enterprise and government organizations, allowing stealthy command-and-control beaconing.
* **Key Defensive Lessons:**
  1. Implement reproducible, deterministic builds with multi-party code signing validation.
  2. Restrict outbound egress traffic from critical network management servers to prevent C2 beaconing.

---

### Case Study 5: NotPetya Ransomware & Lateral Movement
* **What Happened:** Nation-state actors poisoned an automatic software update for M.E.Doc (a widely used Ukrainian accounting package). Once inside a victim network, the malware extracted credentials from memory using Mimikatz and executed remote commands across the LAN using EternalBlue (MS17-010 SMB exploit) and PsExec.
* **Impact:** Over \$10 billion in global damages; global shipping giant Maersk had its entire global shipping container terminal network shut down in hours.
* **Key Defensive Lessons:**
  1. Disable legacy SMBv1 across all operating systems.
  2. Enable Windows Credential Guard to protect the LSASS memory process from Mimikatz dumping.

---

# 5. Computer Networking Deep Dive

## The Full OSI 7-Layer Architecture
```
Layer 7: Application    ──> Encapsulates user application data (HTTP, DNS, SSH, TLS)
Layer 4: Transport      ──> Adds Source Port (e.g. 52341) & Destination Port (e.g. 443)
Layer 3: Network        ──> Adds Source IP (e.g. 192.168.1.10) & Destination IP (e.g. 93.184.216.34)
Layer 2: Data Link      ──> Adds Source MAC & Destination Router MAC (Ethernet Frame)
Layer 1: Physical       ──> Transmits physical electrical voltages, optical pulses, or radio waves
```

---

## The TCP 3-Way Handshake & 4-Way Teardown

```
         TCP Connection Establishment (3-Way Handshake)
  CLIENT                                                 SERVER
    |                                                      |
    | ────────── SYN (Seq = 100) ────────────────────────> |  1. Client sends SYN (Synchronize)
    |                                                      |
    | <───────── SYN-ACK (Seq = 300, Ack = 101) ────────── |  2. Server responds with SYN-ACK
    |                                                      |
    | ────────── ACK (Seq = 101, Ack = 301) ─────────────> |  3. Client acknowledges. ESTABLISHED!
    |                                                      |
    | <====== Bi-Directional Reliable Data Stream ======>  |
    |                                                      |
    |                                                      |
         TCP Connection Termination (4-Way Teardown)
    |                                                      |
    | ────────── FIN (Seq = 500) ────────────────────────> |  1. Client requests close
    |                                                      |
    | <───────── ACK (Ack = 501) ───────────────────────── |  2. Server acknowledges
    |                                                      |
    | <───────── FIN (Seq = 700) ───────────────────────── |  3. Server finishes and closes
    |                                                      |
    | ────────── ACK (Ack = 701) ────────────────────────> |  4. Client acknowledges. CLOSED!
    v                                                      v
```

---

## Subnetting & CIDR Calculation Master Table

$$\text{Usable Hosts} = 2^{(32 - \text{Prefix})} - 2$$

| CIDR Prefix | Subnet Mask | Total Addresses | Usable Hosts | Use Case Example |
| :--- | :--- | :--- | :--- | :--- |
| **/30** | `255.255.255.252` | 4 | **2** | Point-to-Point router-to-router links |
| **/28** | `255.255.255.240` | 16 | **14** | Small DMZ server cluster |
| **/24** | `255.255.255.0` | 256 | **254** | Standard corporate office department LAN |
| **/20** | `255.255.240.0` | 4,096 | **4,094** | Large university or corporate branch campus |
| **/16** | `255.255.0.0` | 65,536 | **65,534** | Cloud Virtual Private Cloud (AWS VPC / Azure VNet) |
| **/8** | `255.0.0.0` | 16,777,216 | **16,777,214**| Entire enterprise private Class A network (`10.0.0.0/8`) |

---

## TLS 1.3 Cryptographic Handshake Architecture
```
Client                                                   Server
  |                                                        |
  | ── ClientHello (Supported Ciphers + Key Share) ──────> |  1. Client offers ECDH public key share
  |                                                        |
  | <─ ServerHello (Selected Cipher + Server Key Share) ── |  2. Server returns matching key share
  | <─ {EncryptedExtensions} ───────────────────────────── |  3. Server parameters encrypted!
  | <─ {Certificate} + {CertificateVerify} ─────────────── |  4. Server sends digital certificate & signature
  | <─ {Finished} ──────────────────────────────────────── |  5. Handshake authenticated!
  |                                                        |
  | ── {Finished} ───────────────────────────────────────> |  6. Client confirms.
  |                                                        |
  | <============= Encrypted Application Data ============>|     Full Session Encrypted (AES-GCM)!
```

---

## Essential Networking Diagnostic & Auditing Commands
```bash
# 1. Connectivity & Path Tracing
ping -c 4 8.8.8.8               # Test ICMP echo reachability and packet loss
traceroute 1.1.1.1             # Trace network hops and latency across routing path (tracert on Windows)
mtr 1.1.1.1                    # Interactive real-time ping + traceroute diagnosis

# 2. DNS Investigation
nslookup -type=TXT google.com   # Query DNS TXT records (SPF, DMARC, verification)
dig example.com +trace          # Follow DNS root servers down to authoritative answer

# 3. HTTP / TLS Header Auditing
curl -Iv https://example.com    # View raw TLS handshake details, cert issuer, and HTTP headers
curl -s -D - -o /dev/null https://example.com # Audit response headers (HSTS, CSP, X-Frame-Options)

# 4. Live Packet Inspection
tcpdump -nn -i eth0 port 443    # Capture raw packet headers on port 443
tshark -i 1 -Y "http.request"   # Wireshark CLI: Filter live HTTP requests
```

---

# 6. Linux System Security, Architecture & Command Reference

## Linux Permissions Matrix
```
Permission String Breakdown:  -  r w x  r - x  r - -
                              │  └──┬──┘ └──┬──┘ └──┬──┘
                              │     │       │       └── Others: Read (4)
                              │     │       └────────── Group: Read + Execute (4 + 1 = 5)
                              │     └────────────────── User/Owner: Read + Write + Execute (4 + 2 + 1 = 7)
                              └──────────────────────── File Type: (-) Regular file, (d) Directory
```

```
Octal Calculation Matrix:
  Read (r)    = 4
  Write (w)   = 2
  Execute (x) = 1
  ----------------
  Sum (7)     = Read + Write + Execute (rwx)
  Sum (5)     = Read + Execute (r-x)
  Sum (0)     = No Permissions (---)
```

### Special Permission Bits: SUID, SGID, and Sticky Bit
* **SUID (4000):** When executed, runs with the privileges of the file owner (e.g. root). Represented as `rws` in user field.
* **SGID (2000):** Executes with group privileges, or ensures new files in folder inherit group ownership. Represented as `rws` in group field.
* **Sticky Bit (1000):** Only the file owner or root can delete files inside a world-writable directory (e.g. `/tmp`). Represented as `rwt` in others field.

---

## Linux Filesystem Hierarchy Architecture
```
/ (Root)
 ├── /bin & /sbin      ──> Essential user & system administrator binaries
 ├── /etc              ──> System configuration files (/etc/passwd, /etc/shadow, /etc/ssh/)
 ├── /proc             ──> Virtual filesystem exposing kernel & process memory (/proc/[pid]/)
 ├── /sys              ──> Virtual filesystem exposing kernel hardware & device drivers
 ├── /var/log          ──> System event & audit logs (/var/log/auth.log, /var/log/syslog)
 ├── /dev              ──> Device nodes (/dev/null, /dev/urandom, /dev/sda1)
 └── /home & /root     ──> User home directories and superuser home
```

---

### Essential Linux Security & Auditing Commands
```bash
# 1. Network & Listening Port Auditing
ss -tulpn                       # List all listening TCP/UDP ports with process IDs and program names
lsof -i :80                     # Show exact process holding port 80 open
netstat -plant                  # Alternative port and connection listing

# 2. Process & Privilege Inspection
ps aux | grep -E "(root|sudo)"  # List all running root processes
systemctl list-units --type=service --state=running # List all active systemd background daemons
top -b -n 1 | head -n 20       # Snapshot of highest CPU/Memory processes

# 3. SUID & Privilege Escalation Auditing
find / -perm -4000 -type f 2>/dev/null              # Audit all SUID binaries on disk
find / -writable -type d 2>/dev/null               # Find all world-writable directories
find / -perm -2000 -type f 2>/dev/null              # Find all SGID binaries

# 4. User Account & Authentication Auditing
awk -F: '($3 == 0) {print $1}' /etc/passwd         # Find any rogue accounts with UID 0 (root privileges)
lastlog                                            # Show last logon timestamp for every user
tail -n 50 /var/log/auth.log                       # Inspect recent SSH and sudo login attempts
faillog -a                                         # Review failed login attempt tallies
```

---

# 7. Windows Security Architecture, Active Directory & PowerShell Reference

## Windows Architecture Diagram
```
+-------------------------------------------------------------------+
| USER MODE (Ring 3)                                                |
|   Applications (Browsers, IDEs)    Windows Services (svchost.exe) |
|   Subsystem DLLs (kernel32.dll, user32.dll, ntdll.dll)            |
+-------------------------------------------------------------------+
                                │  (Syscall: Native NT API via SYSENTER / SYSCALL)
+-------------------------------------------------------------------+
| KERNEL MODE (Ring 0)                                              |
|   Executive Subsystems (Process Manager, Security Ref Monitor)    |
|   NT Kernel (ntoskrnl.exe)                                        |
|   Hardware Abstraction Layer (HAL) & Device Drivers (.sys)        |
+-------------------------------------------------------------------+
```

---

## Kerberos 5 Authentication Architecture
```
Client                      Domain Controller (KDC)                 Target File Server
  |                                   |                                     |
  | ── 1. AS-REQ (Auth Request) ────> |                                     |
  | <─ 2. AS-REP (Returns TGT) ────── |                                     |
  |                                   |                                     |
  | ── 3. TGS-REQ (Sends TGT) ──────> |                                     |
  | <─ 4. TGS-REP (Service Ticket) ── |                                     |
  |                                                                         |
  | ── 5. AP-REQ (Presents Service Ticket to Target Server) ──────────────> |
  | <─ 6. AP-REP (Mutual Authentication Complete; Access Granted!) ──────── |
```

---

## Critical Windows Security Event IDs
| Event ID | Log | Meaning | Threat Detection Significance |
| :--- | :--- | :--- | :--- |
| **4624** | Security | An account was successfully logged on | Examine Logon Type: `2` (Interactive console), `3` (Network/SMB share), `10` (Remote Desktop RDP). |
| **4625** | Security | An account failed to log on | Multiple 4625 events within seconds indicate brute-force or password spraying attacks. |
| **4672** | Security | Special privileges assigned to new logon | Administrator privilege assignment detection. |
| **4688** | Security | A new process has been created | Track process execution trees (requires command-line auditing policy enabled). |
| **4720** | Security | A user account was created | Detects unauthorized backdoor account creation by malware or rogue actors. |
| **Sysmon 1**| Sysmon | Process Creation (with Command Line & Hashes) | Essential for endpoint detection of malicious PowerShell/cmd arguments. |
| **Sysmon 3**| Sysmon | Network Connection detected | Identifies outbound Command & Control (C2) connections from non-browser binaries. |
| **Sysmon 11**| Sysmon | File Created | Detects malware drops and ransomware file creation in sensitive folders. |

---

## Essential PowerShell Security Auditing Commands
```powershell
# 1. Audit Listening TCP Ports and Owning Processes
Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess, @{Name="Process"; Expression={(Get-Process -Id $_.OwningProcess).ProcessName}}

# 2. Inspect Running Services with Suspicious Unquoted Paths
Get-WmiObject win32_service | Where-Object {$_.PathName -notlike '"*' -and $_.PathName -like '* *'} | Select-Object Name, PathName, StartMode

# 3. Review Recent Failed Logons (Event ID 4625)
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 15 | Select-Object TimeCreated, Message

# 4. Audit Local Administrators Group Members
Get-LocalGroupMember -Group "Administrators"

# 5. Find Files Modified in the Last 24 Hours in User AppData
Get-ChildItem -Path "$env:LOCALAPPDATA" -Recurse -File | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-1)} | Select-Object FullName, LastWriteTime -First 25

# 6. Check Active Network Interfaces and DNS Configuration
Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer

# 7. Audit Process Integrity Levels
Get-Process | Select-Object Id, ProcessName, SessionId, Path -First 20
```
