# 📚 The Comprehensive Cybersecurity, Networking & OS Foundations Textbook

A complete, beginner-to-advanced curriculum covering **Cybersecurity Principles**, **Computer Networking**, **Linux System Security**, and **Windows Security Architecture**.

---

## 📑 Table of Contents
1. [Module 1: Cybersecurity Foundations](#module-1-cybersecurity-foundations)
   - [The Core Security Pillars (CIA & Parkerian Hexad)](#the-core-security-pillars)
   - [Fundamental Security Design Principles](#fundamental-security-design-principles)
   - [Threat Modeling & Risk Frameworks (STRIDE, CVSS)](#threat-modeling--risk-frameworks)
   - [OWASP Top 10 Web Vulnerabilities Deep Dive](#owasp-top-10-web-vulnerabilities-deep-dive)
   - [Cryptography Fundamentals (Symmetric, Asymmetric, Hashing)](#cryptography-fundamentals)
2. [Module 2: Computer Networking from Scratch to Mastery](#module-2-computer-networking-from-scratch-to-mastery)
   - [OSI 7-Layer Model vs TCP/IP Model](#osi-7-layer-model-vs-tcpip-model)
   - [IP Addressing, Subnetting & CIDR Calculation](#ip-addressing-subnetting--cidr-calculation)
   - [Transport Protocols: TCP 3-Way Handshake vs UDP](#transport-protocols-tcp-vs-udp)
   - [Essential Protocols & Ports Reference](#essential-protocols--ports-reference)
   - [SSL/TLS Cryptographic Handshake](#ssltls-cryptographic-handshake)
   - [Wireshark & Packet Analysis Guide](#wireshark--packet-analysis-guide)
3. [Module 3: Linux Operating System Security](#module-3-linux-operating-system-security)
   - [Linux Filesystem Hierarchy Explained](#linux-filesystem-hierarchy-explained)
   - [Linux Permissions Matrix (chmod, chown, SUID, SGID, Sticky Bit)](#linux-permissions-matrix)
   - [User & Authentication Security (/etc/passwd & /etc/shadow)](#user--authentication-security)
   - [Linux Process & Service Auditing (systemd, ps, netstat)](#linux-process--service-auditing)
   - [Essential Linux Defense Commands Cheat Sheet](#essential-linux-defense-commands)
4. [Module 4: Windows Operating System Security](#module-4-windows-operating-system-security)
   - [Windows Architecture (User vs Kernel Mode)](#windows-architecture)
   - [Access Control Model: SIDs, Tokens, DACLs, SACLs](#access-control-model)
   - [Authentication: NTLM vs Kerberos 5 Deep Dive](#authentication-ntlm-vs-kerberos)
   - [Windows Event Auditing & Sysmon Essentials](#windows-event-auditing--sysmon)
   - [PowerShell for Security Administrators](#powershell-for-security-administrators)

---

# Module 1: Cybersecurity Foundations

## The Core Security Pillars
Every security system balances three fundamental pillars known as the **CIA Triad**:
- **Confidentiality:** Ensuring data is accessible only to authorized entities. (Guarded by encryption, access control lists, authentication).
- **Integrity:** Assuring information is accurate, authentic, and protected against unauthorized modification. (Guarded by cryptographic hashing like SHA-256, digital signatures).
- **Availability:** Guaranteeing systems, services, and data are accessible to legitimate users when needed. (Guarded by redundancy, DDoS mitigation, backups, fault tolerance).

The expanded **Parkerian Hexad** adds three more:
- **Possession / Control:** Physical or logical ownership of data.
- **Authenticity:** Verification of true identity (e.g., verifying sender via digital certificates).
- **Utility:** The usefulness of the data (e.g., encrypted data without the decryption key preserves confidentiality but loses utility).

---

## Fundamental Security Design Principles
- **Defense in Depth:** Never rely on a single defensive barrier. Layer multiple controls (e.g., Firewall -> WAF -> TLS -> App Authentication -> Database Encryption).
- **Principle of Least Privilege (PoLP):** Every user, service account, and process should only possess the minimum permissions required to perform its function.
- **Fail-Safe Defaults:** By default, access should be denied unless explicitly allowed (Whitelisting).
- **Separation of Duties:** Critical tasks require multiple distinct approvals to prevent single-person fraud or compromise.
- **Zero Trust Architecture:** *"Never trust, always verify."* Assume the internal network is already compromised; continuously authenticate and inspect every connection.

---

## Threat Modeling & Risk Frameworks
### STRIDE Threat Model
Used during software design to identify what can go wrong:
| Threat | Security Property Violated | Definition | Example Mitigation |
| :--- | :--- | :--- | :--- |
| **S**poofing | Authenticity | Impersonating someone or something else | Multi-Factor Authentication (MFA), TLS certificates |
| **T**ampering | Integrity | Modifying data in transit or storage | Cryptographic hashes, HMACs, digital signatures |
| **R**epudiation | Non-repudiation | Denying having performed an action | Secure write-once audit logging, timestamps |
| **I**nformation Disclosure | Confidentiality | Leaking private information to unauthorized parties | End-to-end encryption, data masking |
| **D**enial of Service | Availability | Exhausting resources so users cannot access services | Rate limiting, auto-scaling, cloud DDoS scrubbing |
| **E**levation of Privilege | Authorization | Gaining higher rights than allowed | Role-Based Access Control (RBAC), capability dropping |

### CVSS 3.1 Scoring Matrix
Vulnerabilities are scored from 0.0 to 10.0 based on:
- **Base Metrics:** Attack Vector (Network/Local), Attack Complexity (Low/High), Privileges Required (None/Low/High), User Interaction (None/Required), Scope (Unchanged/Changed), Confidentiality Impact, Integrity Impact, Availability Impact.
- **Severities:**
  - `0.1 - 3.9`: Low
  - `4.0 - 6.9`: Medium
  - `7.0 - 8.9`: High
  - `9.0 - 10.0`: Critical

---

## OWASP Top 10 Web Vulnerabilities Deep Dive

### 1. SQL Injection (CWE-89)
Occurs when untrusted user input is directly concatenated into a database query.
- **Vulnerable Code (Python):**
  ```python
  cursor.execute(f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'")
  ```
- **Attacker Input:** `' OR '1'='1`
- **Remediation (Parameterized Query):**
  ```python
  cursor.execute("SELECT * FROM users WHERE username = %s AND password = %s", (username, password))
  ```

### 2. Cross-Site Scripting - XSS (CWE-79)
Occurs when an application reflects unescaped user input into HTML/JavaScript executed by other users' browsers.
- **Types:**
  - **Reflected XSS:** Payload delivered via URL parameter and immediately reflected.
  - **Stored XSS:** Payload permanently stored in a database (e.g. comment field) and served to all visitors.
  - **DOM-based XSS:** Client-side JavaScript reads input (`location.hash`) and writes directly to DOM (`innerHTML`).
- **Remediation:** Context-aware HTML escaping, Strict Content-Security-Policy (CSP), and `HttpOnly` flags on session cookies.

### 3. Server-Side Request Forgery - SSRF (CWE-918)
Occurs when a web application fetches a remote resource without validating the destination address, allowing attackers to coerce the server into connecting to internal services.
- **Exploitation:** Forcing a webhook service to query cloud metadata (`http://169.254.169.254/latest/meta-data/`) to steal IAM credentials.
- **Remediation:** Whitelist permitted destination domains, block RFC 1918 private IP ranges, disable HTTP redirects in fetching clients.

---

## Cryptography Fundamentals
- **Symmetric Encryption:** Same secret key used for encryption and decryption. Very fast. Examples: **AES-256-GCM**, **ChaCha20-Poly1305**.
- **Asymmetric Encryption (Public Key):** Public key encrypts, private key decrypts. Used for key exchange and digital signatures. Examples: **RSA-4096**, **ECDSA**, **Ed25519**.
- **Cryptographic Hashing:** One-way mathematical function producing a fixed-size digest. Irreversible. Examples: **SHA-256**, **SHA-3**, **BLAKE3**. (Note: MD5 and SHA-1 are cryptographically broken).
- **Password Hashing:** Must be deliberately slow and memory-hard to defeat GPU brute-forcing. Examples: **Argon2id**, **bcrypt**, **PBKDF2**.

---

# Module 2: Computer Networking from Scratch to Mastery

## OSI 7-Layer Model vs TCP/IP Model

```
        OSI 7 Layers                      TCP/IP 4 Layers               Protocol Examples
+---------------------------+       +-------------------------+       +------------------------+
| 7. Application Layer      |       |                         |       | HTTP, DNS, SSH, SMTP   |
+---------------------------+       | 4. Application Layer    |       +------------------------+
| 6. Presentation Layer     |       |                         |       | TLS, SSL, JPEG, ASCII  |
+---------------------------+       +                         +       +------------------------+
| 5. Session Layer          |       |                         |       | NetBIOS, RPC, Sockets  |
+---------------------------+       +-------------------------+       +------------------------+
| 4. Transport Layer        | ----> | 3. Transport Layer      | ----> | TCP (Segments), UDP    |
+---------------------------+       +-------------------------+       +------------------------+
| 3. Network Layer          | ----> | 2. Internet Layer       | ----> | IPv4, IPv6, ICMP, ARP  |
+---------------------------+       +-------------------------+       +------------------------+
| 2. Data Link Layer        | ----> | 1. Network Access Layer | ----> | Ethernet (Frames), Wi-Fi|
+---------------------------+       |                         |       +------------------------+
| 1. Physical Layer         |       |                         |       | Cables, Signals, Bits  |
+---------------------------+       +-------------------------+       +------------------------+
```

---

## IP Addressing, Subnetting & CIDR Calculation
An **IPv4 address** is 32 bits divided into 4 octets: `192.168.1.50`.
### RFC 1918 Private IP Ranges (Non-routable on the public internet):
- **Class A:** `10.0.0.0` - `10.255.255.255` (`10.0.0.0/8`) -> 16,777,216 hosts.
- **Class B:** `172.16.0.0` - `172.31.255.255` (`172.16.0.0/12`) -> 1,048,576 hosts.
- **Class C:** `192.168.0.0` - `192.168.255.255` (`192.168.0.0/16`) -> 65,536 hosts.
- **Loopback:** `127.0.0.1` (`127.0.0.0/8`) -> Localhost.
- **Link-Local:** `169.254.0.0/16` -> Self-assigned when DHCP fails (APIPA) or Cloud Metadata.

### CIDR Subnet Cheat Sheet:
- `/24` = Subnet Mask `255.255.255.0` -> $2^{(32-24)} - 2 = 254$ usable hosts.
- `/16` = Subnet Mask `255.255.0.0` -> $2^{(32-16)} - 2 = 65,534$ usable hosts.
- `/8` = Subnet Mask `255.0.0.0` -> $2^{(32-8)} - 2 = 16,777,214$ usable hosts.

---

## Transport Protocols: TCP vs UDP
### TCP (Transmission Control Protocol)
Connection-oriented, reliable, guaranteed in-order delivery, flow control.
**The TCP 3-Way Handshake:**
```
Client                                                  Server
  |                                                       |
  | ---------------- SYN (Seq = X) -------------------->  |   1. Client initiates connection
  |                                                       |
  | <------------- SYN-ACK (Seq = Y, Ack = X + 1) ------  |   2. Server acknowledges & synchronizes
  |                                                       |
  | ---------------- ACK (Seq = X + 1, Ack = Y + 1) --->  |   3. Connection ESTABLISHED!
  |                                                       |
```
- **TCP Teardown (4-Way):** FIN -> ACK -> FIN -> ACK.

### UDP (User Datagram Protocol)
Connectionless, lightweight, low-latency, no handshake, no retransmission. Ideal for: DNS queries (port 53), VoIP, video streaming, gaming, DHCP.

---

## Essential Protocols & Ports Reference
| Port | Protocol | Layer | Transport | Description & Security Note |
| :--- | :--- | :--- | :--- | :--- |
| **20/21** | FTP | 7 | TCP | File Transfer Protocol. **Cleartext**; vulnerable to sniffing. Use SFTP (port 22). |
| **22** | SSH / SFTP | 7 | TCP | Secure Shell. Encrypted remote terminal & file transfer. |
| **23** | Telnet | 7 | TCP | Legacy terminal. **Cleartext** credentials. Obsolete. |
| **25** | SMTP | 7 | TCP | Simple Mail Transfer Protocol. Use STARTTLS for encryption. |
| **53** | DNS | 7 | UDP/TCP | Domain Name System. Port 53 plaintext. Use DoH (DNS over HTTPS). |
| **67/68**| DHCP | 7 | UDP | Dynamic Host Configuration Protocol. Assigns IP configurations. |
| **80** | HTTP | 7 | TCP | Hypertext Transfer Protocol. **Plaintext**. Redirect to 443. |
| **110** | POP3 | 7 | TCP | Post Office Protocol. Plaintext email retrieval. |
| **143** | IMAP | 7 | TCP | Internet Message Access Protocol. |
| **443** | HTTPS | 7 | TCP | HTTP over TLS. Industry standard encrypted web protocol. |
| **445** | SMB | 7 | TCP | Server Message Block. Windows file sharing. Frequent attack target (e.g. EternalBlue). |
| **3389**| RDP | 7 | TCP | Windows Remote Desktop Protocol. Protect behind VPN & NLA. |

---

## Wireshark & Packet Analysis Guide
Wireshark captures raw frames from network interfaces.
### Essential Wireshark Display Filters:
- `http.request.method == "POST"`: View all web form submissions & credentials.
- `tcp.flags.syn == 1 && tcp.flags.ack == 0`: Detect incoming connection attempts / port scans.
- `dns.qry.name contains "corp"`: Inspect internal DNS domain lookups.
- `tls.handshake.type == 1`: Inspect TLS ClientHello messages and cipher offerings.
- `ip.addr == 192.168.1.10`: Filter all traffic to/from a specific machine.

---

# Module 3: Linux Operating System Security

## Linux Filesystem Hierarchy Explained
- `/etc/`: System configuration files (`/etc/passwd`, `/etc/shadow`, `/etc/ssh/sshd_config`).
- `/var/log/`: System and application audit logs (`/var/log/auth.log`, `/var/log/syslog`).
- `/bin/` & `/sbin/`: Essential user and system administrative binaries.
- `/proc/` & `/sys/`: Virtual filesystems reflecting live kernel state, CPU info, and running processes.
- `/tmp/`: World-writable temporary directory (often exploited by attackers for staging scripts).

---

## Linux Permissions Matrix
Every file and directory has 3 sets of permissions: **User (Owner)**, **Group**, and **Others**.

| Permission | Symbol | Octal Value | Meaning on Files | Meaning on Directories |
| :--- | :--- | :--- | :--- | :--- |
| **Read** | `r` | `4` | View contents | List files (`ls`) |
| **Write** | `w` | `2` | Modify contents | Create/delete files |
| **Execute** | `x` | `1` | Run as program | Enter directory (`cd`) |

### Calculation Examples:
- `chmod 755 script.sh` -> User: $4+2+1 = 7$ (`rwx`), Group: $4+1 = 5$ (`r-x`), Other: $4+1 = 5$ (`r-x`).
- `chmod 600 id_rsa` -> User: $4+2 = 6$ (`rw-`), Group: $0$ (`---`), Other: $0$ (`---`). Standard for SSH keys.

### Special Bits:
- **SUID (`chmod 4755 /bin/ping`):** Executes with permissions of the file owner (e.g. root), regardless of who runs it.
- **SGID (`chmod 2755 /shared/`):** New files inherit the parent group ID.
- **Sticky Bit (`chmod 1777 /tmp`):** Only the file owner can delete or rename files in this directory.

---

## User & Authentication Security
- **/etc/passwd:** World-readable listing of user accounts:
  ```
  alice:x:1001:1001:Alice Smith:/home/alice:/bin/bash
  ```
- **/etc/shadow:** Read-only by root. Stores password hashes:
  ```
  alice:$6$qZ7y$mK9b...:19245:0:99999:7:::
  ```
  - Prefix `$6$` denotes SHA-512 crypt.
  - Prefix `$y$` denotes Yescrypt (modern Debian/Ubuntu).

---

## Essential Linux Defense Commands
- `ps aux | grep <name>`: Inspect running processes and command line arguments.
- `ss -tulpn` or `netstat -tulpn`: List all listening TCP/UDP ports and associated PIDs.
- `journalctl -u ssh -n 50`: Review recent SSH authentication attempts.
- `last -n 20`: View recent system logins and active sessions.
- `find / -perm -4000 2>/dev/null`: Audit all SUID binaries on the filesystem.

---

# Module 4: Windows Operating System Security

## Windows Architecture
Windows divides execution into two primary CPU privilege rings:
- **User Mode (Ring 3):** Applications, shell, background user services. Isolated address space. Cannot directly talk to hardware.
- **Kernel Mode (Ring 0):** NT Executive, Kernel, Device Drivers, Hardware Abstraction Layer (HAL). Unrestricted access to hardware and physical RAM.

---

## Access Control Model
- **SID (Security Identifier):** Unique string representing a security principal (e.g., `S-1-5-21-...-500` is the default Administrator account).
- **Access Token:** Generated upon login; contains user SID, group SIDs, and privileges (`SeDebugPrivilege`, `SeImpersonatePrivilege`). Attached to every thread and process spawned by the user.
- **DACL (Discretionary Access Control List):** Attached to objects (files, registry keys, services) declaring who is allowed or denied specific rights.
- **SACL (System Access Control List):** Declares what actions on an object should trigger an audit event in the Windows Security Log.

---

## Authentication: NTLM vs Kerberos 5
### NTLM (NT LAN Manager)
Legacy challenge-response protocol. Vulnerable to NTLM Relay attacks and Pass-the-Hash.

### Kerberos 5 (Active Directory Standard)
Ticket-based, mutual authentication using a trusted Key Distribution Center (KDC).
**Authentication Flow:**
1. **AS-REQ / AS-REP:** Client sends timestamp encrypted with password hash. Domain Controller returns a **Ticket Granting Ticket (TGT)**.
2. **TGS-REQ / TGS-REP:** Client presents TGT to request a service ticket for a target resource (e.g. file share).
3. **AP-REQ / AP-REP:** Client presents Service Ticket to the target server to gain authorized access.

---

## Windows Event Auditing & Sysmon Essentials
The Windows Security Event Log (`eventvwr.msc`) records critical events:
- **Event ID 4624:** Successful Logon.
- **Event ID 4625:** Failed Logon attempt (brute-force indicator).
- **Event ID 4672:** Special privileges assigned to new logon (Admin logon).
- **Event ID 4688:** A new process has been created.

### Microsoft Sysmon (System Monitor)
Enhanced kernel driver providing high-fidelity threat detection:
- **Sysmon Event 1:** Process Creation (full command line, parent process, hashes).
- **Sysmon Event 3:** Network Connection initiated by a process.
- **Sysmon Event 7:** Image / DLL loaded by an executable.
- **Sysmon Event 11:** File created (detecting ransomware drops).

---

## PowerShell for Security Administrators
- `Get-Process | Select-Object Name, Id, Path | Where-Object Path -notmatch "System32"`: Audit processes running outside Windows system directories.
- `Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess`: List all active listening ports and PIDs.
- `Get-Service | Where-Object {$_.StartType -eq "Automatic" -and $_.Status -ne "Running"}`: Audit failing or misconfigured autostart services.
- `Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 10`: Review the 10 most recent failed logons.
