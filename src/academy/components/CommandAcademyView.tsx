import { useState } from "react";
import {
  Terminal,
  Search,
  Copy,
  Check,
  Play,
  Shield,
  AlertTriangle,
  Layers,
  Info
} from "lucide-react";

export type ShellEnvironment = "cmd" | "powershell" | "bash";

interface CommandItem {
  id: string;
  name: string;
  shell: ShellEnvironment;
  syntax: string;
  category: "recon" | "network" | "process" | "secrets" | "privesc" | "web_api";
  summary: string;
  parameters: { flag: string; description: string; securityUse: string }[];
  simulatedOutput: string;
  securityRelevance: string;
  commonPitfalls: string[];
  safePracticeNotes: string;
}

const COMMANDS_DATABASE: CommandItem[] = [
  // WINDOWS CMD
  {
    id: "cmd-whoami",
    name: "whoami /all",
    shell: "cmd",
    syntax: "whoami /all",
    category: "privesc",
    summary: "Displays user, group, and security privilege information for the current Windows access token.",
    parameters: [
      { flag: "/user", description: "Displays the current user name and security ID (SID).", securityUse: "Identifies whether running under local user, service account, or SYSTEM." },
      { flag: "/groups", description: "Displays group memberships.", securityUse: "Checks if user is in 'Administrators' or 'Backup Operators'." },
      { flag: "/priv", description: "Displays security privileges held by user token.", securityUse: "Checks for high-risk privileges like SeImpersonatePrivilege, SeDebugPrivilege, SeBackupPrivilege." },
      { flag: "/fo {table|list|csv}", description: "Formats output.", securityUse: "Use csv or table for automated scripting and tool parsing." }
    ],
    simulatedOutput: `USER INFORMATION
----------------
User Name         SID
================= ====================================================
corp\\audit_user  S-1-5-21-392819283-192839210-928109283-1002

GROUP INFORMATION
-----------------
Group Name                                  Type             SID                                           Attributes
=========================================== ================ ============================================= ==================================================
Everyone                                    Well-known group S-1-1-0                                       Mandatory group, Enabled by default, Enabled group
BUILTIN\\Users                               Alias            S-1-5-32-545                                  Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\\INTERACTIVE                   Well-known group S-1-5-4                                       Mandatory group, Enabled by default, Enabled group

PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                          State
============================= ==================================== ========
SeChangeNotifyPrivilege       Bypass traverse checking             Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set       Disabled
SeShutdownPrivilege           Shut down the system                 Disabled`,
    securityRelevance: "Essential first-step recon on Windows hosts. If an application execution vulnerability or command injection is achieved, 'whoami /all' reveals your exact execution context and whether token impersonation or potato exploits are viable.",
    commonPitfalls: [
      "Running on Windows XP/2000 without whoami installed (default in modern Windows, but legacy boxes may lack it).",
      "Confusing user account name with effective privileges: an Administrator user in a non-elevated prompt still runs with medium integrity filter token."
    ],
    safePracticeNotes: "Passive read-only query. Safe to run in authorized audits. Generates Event ID 4688 in Sysmon/Security logs if process auditing is enabled."
  },
  {
    id: "cmd-netstat",
    name: "netstat -ano",
    shell: "cmd",
    syntax: "netstat -ano",
    category: "network",
    summary: "Displays active TCP/UDP connections, listening ports, and the owning Process ID (PID) numerically.",
    parameters: [
      { flag: "-a", description: "Displays all active connections and listening ports.", securityUse: "Uncovers internal-only listening services (e.g. 127.0.0.1:8080 or 0.0.0.0:3306)." },
      { flag: "-n", description: "Displays addresses and port numbers in numerical form without DNS lookup.", securityUse: "Prevents hanging on reverse DNS lookups and avoids generating extraneous DNS queries." },
      { flag: "-o", description: "Displays the owning process ID (PID) associated with each connection.", securityUse: "Enables immediate correlation with 'tasklist' to determine which executable owns the port." },
      { flag: "-p proto", description: "Filters by protocol (TCP or UDP).", securityUse: "Isolates TCP web services from UDP broadcast noise." }
    ],
    simulatedOutput: `Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1184
  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:3306           0.0.0.0:0              LISTENING       2480
  TCP    127.0.0.1:11434        0.0.0.0:0              LISTENING       5212
  TCP    127.0.0.1:5000         0.0.0.0:0              LISTENING       7840
  TCP    192.168.1.45:51280     52.176.4.15:443        ESTABLISHED     4120`,
    securityRelevance: "Identifies exposed database engines (e.g., MySQL on port 3306), internal API microservices (port 5000), local AI servers (port 11434), or backdoors established by attackers.",
    commonPitfalls: [
      "Forgetting '-n', which causes netstat to query DNS for every single remote IP, freezing output on slow or isolated networks.",
      "Assuming an open port is reachable externally without checking the Local Address (127.0.0.1 is loopback-only; 0.0.0.0 binds to all interfaces)."
    ],
    safePracticeNotes: "Completely passive kernel socket table inspection. No network packets are sent."
  },
  {
    id: "cmd-dir-secrets",
    name: "dir /s /b *.config",
    shell: "cmd",
    syntax: "dir /s /b /a:-d *password* *.config *.env *.kdbx",
    category: "secrets",
    summary: "Recursively searches directory trees for configuration files, credentials, and password vaults.",
    parameters: [
      { flag: "/s", description: "Searches the specified directory and all subdirectories.", securityUse: "Deep search across entire web root (e.g., C:\\inetpub\\wwwroot\\)." },
      { flag: "/b", description: "Bare format: strips headers, summary, and file size.", securityUse: "Produces clean file path lists for piping into analysis scripts." },
      { flag: "/a:-d", description: "Attributes filter excluding directories.", securityUse: "Prevents directory names containing search strings from polluting output." }
    ],
    simulatedOutput: `C:\\inetpub\\wwwroot\\web.config
C:\\inetpub\\wwwroot\\appsettings.Production.json
C:\\inetpub\\wwwroot\\connectionstrings.config
C:\\inetpub\\wwwroot\\backup\\database_passwords.txt`,
    securityRelevance: "Developers frequently leave database connection strings, API secrets, and JWT private keys in cleartext within web.config, appsettings.json, or .env files.",
    commonPitfalls: [
      "Running on root C:\\ without /b will flood the terminal with thousands of lines of disk space notices.",
      "Searching for too broad a pattern (like *.*) which hangs CMD on systems with millions of files."
    ],
    safePracticeNotes: "Read-only file enumeration. Note that heavy disk I/O may spike disk utilization on production servers."
  },
  {
    id: "cmd-tasklist",
    name: "tasklist /v /fo table",
    shell: "cmd",
    syntax: "tasklist /v /fo table",
    category: "process",
    summary: "Lists all running processes on local machine along with user session, memory usage, and window titles.",
    parameters: [
      { flag: "/v", description: "Verbose mode: shows username running process and window title.", securityUse: "Shows if AV/EDR agents (e.g., MsMpEng.exe, SentinelOne, CrowdStrike) or admin consoles are running." },
      { flag: "/fo table", description: "Formats output as clean ASCII table.", securityUse: "Easy visual scanning." },
      { flag: "/fi \"USERNAME eq SYSTEM\"", description: "Filters by process owner.", securityUse: "Isolates privileged SYSTEM services." }
    ],
    simulatedOutput: `Image Name                     PID Session Name        Session#    Mem Usage Status          User Name                     Window Title
========================= ======== ================ =========== ============ =============== ============================= =====================================
System                           4 Services                   0        148 K Unknown         NT AUTHORITY\\SYSTEM           N/A
services.exe                   788 Services                   0      8,420 K Unknown         NT AUTHORITY\\SYSTEM           N/A
svchost.exe                    932 Services                   0     18,204 K Unknown         NT AUTHORITY\\LOCAL SERVICE    N/A
mysqld.exe                    2480 Services                   0    412,890 K Running         NT AUTHORITY\\NETWORK SERVICE  N/A
nginx.exe                     3120 Console                    1     14,280 K Running         corp\\audit_user               N/A
AppSec-Nexus.exe             15992 Console                    1     84,200 K Running         corp\\audit_user               AppSec Nexus - Cybersecurity Platform`,
    securityRelevance: "Allows AppSec analysts and defenders to verify web server processes, security telemetry agents, and spot unauthorized mining or remote access software.",
    commonPitfalls: [
      "Missing /v flag: running plain 'tasklist' hides the username and window titles, rendering it difficult to identify privilege boundaries."
    ],
    safePracticeNotes: "Native Windows management query. Completely safe in testing."
  },

  // WINDOWS POWERSHELL
  {
    id: "ps-test-connection",
    name: "Test-NetConnection",
    shell: "powershell",
    syntax: "Test-NetConnection -ComputerName target.local -Port 443 -InformationLevel Detailed",
    category: "network",
    summary: "Tests TCP connectivity, DNS resolution, and routing path to a remote host on a specific port.",
    parameters: [
      { flag: "-ComputerName", description: "Remote hostname or IP address.", securityUse: "Target web or API endpoint." },
      { flag: "-Port", description: "TCP port number to test.", securityUse: "Verifies whether 80, 443, 8080, 8443, or database ports are open and reachable through firewalls." },
      { flag: "-InformationLevel Detailed", description: "Displays source IP, route, and ping test results.", securityUse: "Validates egress filtering and proxy paths." },
      { flag: "-CommonTCPPort {HTTP|RDP|SMB|WINRM}", description: "Preset common ports.", securityUse: "Quick discovery of administrative services." }
    ],
    simulatedOutput: `ComputerName           : target.local
RemoteAddress          : 192.168.1.150
RemotePort             : 443
NameResolutionResults  : 192.168.1.150
MatchingIPInterface    : InterfaceAlias: Ethernet, InterfaceIndex: 12
PingSucceeded          : True
PingReplyDetails       : MinimumRTT: 1ms, MaximumRTT: 2ms, AverageRTT: 1ms
TcpTestSucceeded       : True`,
    securityRelevance: "PowerShell native substitute for telnet or nc (netcat) on modern Windows without needing third-party binaries. Proves whether a port is genuinely open and accepting TCP handshakes.",
    commonPitfalls: [
      "Assuming PingSucceeded being false means the port is closed. ICMP ping is frequently blocked by firewalls while TcpTestSucceeded is true!"
    ],
    safePracticeNotes: "Sends a single standard TCP SYN packet and completes a 3-way handshake. Safe for authorized audits."
  },
  {
    id: "ps-invoke-webrequest",
    name: "Invoke-WebRequest",
    shell: "powershell",
    syntax: "Invoke-WebRequest -Uri \"https://target.local/api/v1/auth\" -Method POST -Headers @{ \"Content-Type\"=\"application/json\" } -Body '{\"user\":\"admin\"}' -SkipCertificateCheck",
    category: "web_api",
    summary: "Performs full HTTP requests directly from PowerShell, supporting custom headers, body payloads, and SSL bypass.",
    parameters: [
      { flag: "-Uri", description: "Target URL to probe.", securityUse: "Specifies the endpoint under test." },
      { flag: "-Method", description: "HTTP method: GET, POST, PUT, DELETE, OPTIONS, PATCH.", securityUse: "Allows testing HTTP method tampering and CORS preflights." },
      { flag: "-Headers", description: "Hashtable of HTTP headers.", securityUse: "Supplies authorization tokens, custom cookies, or spoofed origin headers." },
      { flag: "-SkipCertificateCheck", description: "Bypasses untrusted or self-signed TLS cert validation.", securityUse: "Essential in staging and local testing environments (PS Core 6+)." }
    ],
    simulatedOutput: `StatusCode        : 200
StatusDescription : OK
Content           : {"status":"success","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","role":"user"}
RawContent        : HTTP/1.1 200 OK
                    Server: nginx/1.24.0
                    Date: Fri, 17 Oct 2026 13:42:01 GMT
                    Content-Type: application/json; charset=utf-8
                    Content-Length: 142
                    Connection: keep-alive
                    X-Frame-Options: SAMEORIGIN
Headers           : {[Server, nginx/1.24.0], [Date, Fri, 17 Oct 2026 13:42:01 GMT], ...}
Images            : {}
InputFields       : {}
Links             : {}`,
    securityRelevance: "Allows manual validation of API vulnerabilities (e.g. BOLA, broken authentication, CORS misconfiguration, or missing security headers) without leaving PowerShell.",
    commonPitfalls: [
      "In Windows PowerShell 5.1, Invoke-WebRequest by default parses the DOM using Internet Explorer's engine, which errors on servers without IE initial setup. Use `-UseBasicParsing` in PS 5.1 to avoid this.",
      "PowerShell escaping of JSON quotes: single quotes around the JSON body string prevent variable interpolation bugs."
    ],
    safePracticeNotes: "Always ensure you are authorized to send requests to target URL. Avoid automated rapid loops without rate limiting."
  },
  {
    id: "ps-get-net-tcp",
    name: "Get-NetTCPConnection",
    shell: "powershell",
    syntax: "Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess, @{Name=\"ProcessName\";Expression={(Get-Process -Id $_.OwningProcess).ProcessName}}",
    category: "network",
    summary: "PowerShell cmdlet that queries the TCP connection table and joins with running process names.",
    parameters: [
      { flag: "-State Listen", description: "Filters connections in LISTEN state only.", securityUse: "Filters out temporary outgoing sockets to focus exclusively on exposed server attack surfaces." },
      { flag: "-LocalPort", description: "Filters by specific port number.", securityUse: "Checks if a specific vulnerability port like 8080 or 445 is listening." }
    ],
    simulatedOutput: `LocalAddress LocalPort OwningProcess ProcessName
------------ --------- ------------- -----------
0.0.0.0            135          1184 svchost
0.0.0.0            445             4 System
0.0.0.0           3306          2480 mysqld
127.0.0.1        11434          5212 ollama
127.0.0.1         5000          7840 python
0.0.0.0             80          3120 nginx`,
    securityRelevance: "In 1 line of script, maps all open network entry points directly to their underlying executable binaries on the system.",
    commonPitfalls: [
      "Permissions: Some privileged process names owned by SYSTEM will throw access denied when non-administrator queries `(Get-Process -Id $_.OwningProcess).ProcessName`."
    ],
    safePracticeNotes: "Zero network impact. Clean WMI/CIM/Socket query."
  },

  // LINUX BASH
  {
    id: "bash-curl-headers",
    name: "curl -iv -X GET",
    shell: "bash",
    syntax: "curl -iv -X GET https://target.local/api/health -H \"X-Forwarded-For: 127.0.0.1\" -H \"Origin: https://evil.com\"",
    category: "web_api",
    summary: "Sends HTTP request with verbose header output and response status information for header auditing.",
    parameters: [
      { flag: "-i", description: "Include HTTP response headers in output.", securityUse: "Exposes CSP, HSTS, X-Content-Type-Options, Cookies, and Set-Cookie flags." },
      { flag: "-v", description: "Verbose mode: shows TLS handshake details, request headers sent, and DNS resolution.", securityUse: "Essential for debugging certificate validity and TLS cipher suites." },
      { flag: "-X {METHOD}", description: "Specifies HTTP method verb.", securityUse: "Tests HTTP verb tampering (e.g. HEAD, PUT, OPTIONS, TRACE)." },
      { flag: "-k / --insecure", description: "Allows insecure server connections when using SSL.", securityUse: "Useful for testing internal IP addresses with self-signed SSL certs." }
    ],
    simulatedOutput: `*   Trying 192.168.1.150:443...
* Connected to target.local (192.168.1.150) port 443
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
> GET /api/health HTTP/1.1
> Host: target.local
> User-Agent: curl/8.5.0
> Accept: */*
> X-Forwarded-For: 127.0.0.1
> Origin: https://evil.com
> 
< HTTP/1.1 200 OK
< Server: nginx/1.24.0
< Date: Fri, 17 Oct 2026 13:45:00 GMT
< Content-Type: application/json
< Content-Length: 35
< Access-Control-Allow-Origin: https://evil.com
< Access-Control-Allow-Credentials: true
< Strict-Transport-Security: max-age=31536000; includeSubDomains
< 
{"status":"healthy","uptime":3600}`,
    securityRelevance: "Notice in the simulated output: the server reflected `Access-Control-Allow-Origin: https://evil.com` with `Access-Control-Allow-Credentials: true`! This is a critical CORS misconfiguration allowing attacker websites to steal authenticated user data.",
    commonPitfalls: [
      "Forgetting quotes around URLs containing query strings (&), which causes bash to background the process.",
      "Confusing -i (include headers in body) with -I (send HTTP HEAD request instead of GET)."
    ],
    safePracticeNotes: "The gold standard tool for web application penetration testing and API manual verification."
  },
  {
    id: "bash-ss-sockets",
    name: "ss -tulpn",
    shell: "bash",
    syntax: "ss -tulpn",
    category: "network",
    summary: "Dumps socket statistics showing listening TCP and UDP sockets with numeric port names and owning process names.",
    parameters: [
      { flag: "-t", description: "Display TCP sockets.", securityUse: "Inspects web, SSH, database TCP listeners." },
      { flag: "-u", description: "Display UDP sockets.", securityUse: "Inspects DNS (53), SNMP (161), DHCP (67/68) listeners." },
      { flag: "-l", description: "Show only listening sockets.", securityUse: "Filters out established outbound web browsing connections." },
      { flag: "-p", description: "Show process using socket.", securityUse: "Requires sudo to view processes owned by other users." },
      { flag: "-n", description: "Do not resolve service names.", securityUse: "Displays exact port numbers (e.g. 3306 instead of 'mysql')." }
    ],
    simulatedOutput: `Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process                                                  
tcp   LISTEN 0      128          0.0.0.0:22         0.0.0.0:*     users:(("sshd",pid=712,fd=3))                           
tcp   LISTEN 0      511        127.0.0.1:3306       0.0.0.0:*     users:(("mariadbd",pid=1024,fd=19))                     
tcp   LISTEN 0      511          0.0.0.0:80         0.0.0.0:*     users:(("nginx",pid=1450,fd=6),("nginx",pid=1449,fd=6)) 
tcp   LISTEN 0      511          0.0.0.0:443        0.0.0.0:*     users:(("nginx",pid=1450,fd=7),("nginx",pid=1449,fd=7)) 
tcp   LISTEN 0      128        127.0.0.1:11434      0.0.0.0:*     users:(("ollama",pid=2150,fd=8))                        
udp   LISTEN 0      0            0.0.0.0:53         0.0.0.0:*     users:(("systemd-resolve",pid=510,fd=13))`,
    securityRelevance: "Modern replacement for netstat on Linux. Instant confirmation of which services are accessible locally (127.0.0.1) vs exposed to the entire network (0.0.0.0).",
    commonPitfalls: [
      "Running without `sudo`: non-root users cannot see the `users:((\"process\",pid=...))` column for processes owned by root or system daemons."
    ],
    safePracticeNotes: "Zero network packets. Kernel socket interface inspection."
  },
  {
    id: "bash-grep-secrets",
    name: "grep -rnwi",
    shell: "bash",
    syntax: "grep -rnwi \"api_key\\|secret\\|password\\|token\\|bearer\" /var/www/ --exclude-dir={node_modules,.git,vendor}",
    category: "secrets",
    summary: "Recursively searches files for sensitive patterns while ignoring bloated dependencies.",
    parameters: [
      { flag: "-r", description: "Recursive directory search.", securityUse: "Crawls entire web root." },
      { flag: "-n", description: "Print line number.", securityUse: "Pinpoints exact line of vulnerability in source code." },
      { flag: "-w", description: "Match whole word.", securityUse: "Reduces noise by avoiding partial matches like 'passwordless'." },
      { flag: "-i", description: "Ignore case distinctions.", securityUse: "Matches 'PASSWORD', 'Password', and 'password'." },
      { flag: "--exclude-dir", description: "Skips specified folders.", securityUse: "Essential to skip node_modules and .git to avoid freezing." }
    ],
    simulatedOutput: `/var/www/app/config/database.php:14:    'password' => 'SuperSecretDBPass2026!',
/var/www/app/.env:8:AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
/var/www/app/src/jwt.py:22:JWT_SECRET = "jwt_signing_key_do_not_commit"`,
    securityRelevance: "Code review and white-box pentesting staple. Fast, local identification of hardcoded cryptographic credentials and keys.",
    commonPitfalls: [
      "Failing to exclude `node_modules` or `vendor`, leading to millions of irrelevant third-party library matches."
    ],
    safePracticeNotes: "Read-only file search. Avoid printing huge binary files."
  },
  {
    id: "bash-find-suid",
    name: "find / -perm -4000",
    shell: "bash",
    syntax: "find / -perm -4000 -type f 2>/dev/null",
    category: "privesc",
    summary: "Locates all SUID (Set User ID) binaries on the filesystem which execute with file owner privileges (typically root).",
    parameters: [
      { flag: "-perm -4000", description: "Matches files with SUID bit enabled.", securityUse: "Identifies privilege escalation candidates (GTFOBins)." },
      { flag: "-type f", description: "Limits search to regular files.", securityUse: "Filters out directories and sockets." },
      { flag: "2>/dev/null", description: "Redirects standard error to null.", securityUse: "Silences 'Permission Denied' errors across restricted directories." }
    ],
    simulatedOutput: `/usr/bin/passwd
/usr/bin/chsh
/usr/bin/sudo
/usr/bin/pkexec
/usr/local/bin/custom_backup_tool`,
    securityRelevance: "Any non-standard binary with SUID (e.g. `/usr/local/bin/custom_backup_tool` or misconfigured `vim`, `find`, `nmap`) can allow an unprivileged user or web server user (`www-data`) to execute arbitrary commands as root.",
    commonPitfalls: [
      "Forgetting `2>/dev/null`, which results in hundreds of 'Permission denied' errors drowning out the actual SUID binaries."
    ],
    safePracticeNotes: "Standard defense auditing command. Safe on Linux servers."
  }
];

export function CommandAcademyView() {
  const [selectedShell, setSelectedShell] = useState<ShellEnvironment>("cmd");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedCommandId, setSelectedCommandId] = useState<string>(COMMANDS_DATABASE[0].id);
  const [copiedId, setCopiedId] = useState<string>("");
  const [runningSimulations, setRunningSimulations] = useState<Record<string, boolean>>({});

  const filteredCommands = COMMANDS_DATABASE.filter((cmd) => {
    const matchesShell = cmd.shell === selectedShell;
    const matchesCategory = categoryFilter === "ALL" || cmd.category === categoryFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.syntax.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesShell && matchesCategory && matchesSearch;
  });

  const activeCommand =
    COMMANDS_DATABASE.find((c) => c.id === selectedCommandId) || filteredCommands[0] || COMMANDS_DATABASE[0];

  function handleCopy(id: string, text: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    }
  }

  function handleRunSim(id: string) {
    setRunningSimulations((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setRunningSimulations((prev) => ({ ...prev, [id]: false }));
    }, 600);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Terminal size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              OS & Terminal Academy
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(6, 182, 212, 0.2)",
                  color: "var(--accent-cyan)",
                  fontWeight: 600
                }}
              >
                CLI Security Lab
              </span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Master Windows CMD, PowerShell cmdlets, and Linux Bash syntax for reconnaissance, socket verification, and security auditing.
            </p>
          </div>
        </div>

        {/* Shell Selector Pills */}
        <div style={{ display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <button
            className={`filter-chip ${selectedShell === "cmd" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}
            onClick={() => setSelectedShell("cmd")}
          >
            Windows CMD
          </button>
          <button
            className={`filter-chip ${selectedShell === "powershell" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}
            onClick={() => setSelectedShell("powershell")}
          >
            PowerShell
          </button>
          <button
            className={`filter-chip ${selectedShell === "bash" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}
            onClick={() => setSelectedShell("bash")}
          >
            Linux Bash
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            className="input"
            placeholder="Search commands by name, flag, or security concept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "36px", width: "100%", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All Categories" },
            { id: "recon", label: "Recon & Discovery" },
            { id: "network", label: "Sockets & Ports" },
            { id: "process", label: "Process Auditing" },
            { id: "secrets", label: "Secrets & Files" },
            { id: "privesc", label: "Privileges & Tokens" },
            { id: "web_api", label: "Web & API Probing" }
          ].map((cat) => (
            <button
              key={cat.id}
              className={`filter-chip ${categoryFilter === cat.id ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Left List / Right Deep Dive */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(400px, 2fr)", gap: "18px" }}>
        {/* Left Command Selection List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredCommands.length === 0 ? (
            <div className="card" style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)" }}>
              <Info size={28} style={{ margin: "0 auto 8px auto", opacity: 0.6 }} />
              <p style={{ margin: 0, fontSize: "0.85rem" }}>No commands match your filter criteria.</p>
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const isSelected = activeCommand?.id === cmd.id;
              return (
                <div
                  key={cmd.id}
                  onClick={() => setSelectedCommandId(cmd.id)}
                  className="card"
                  style={{
                    padding: "14px",
                    cursor: "pointer",
                    border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                    backgroundColor: isSelected ? "var(--bg-secondary)" : "var(--bg-card)",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-cyan)" }}>
                      {cmd.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "var(--text-dim)"
                      }}
                    >
                      {cmd.category}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineClamp: 2, overflow: "hidden" }}>
                    {cmd.summary}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Active Command Terminal & Deep Dive */}
        {activeCommand && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Command Header Card */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: activeCommand.shell === "bash" ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)",
                        color: activeCommand.shell === "bash" ? "var(--accent-rose)" : "var(--accent-cyan)"
                      }}
                    >
                      {activeCommand.shell.toUpperCase()}
                    </span>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, fontFamily: "monospace" }}>
                      {activeCommand.name}
                    </h3>
                  </div>
                  <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {activeCommand.summary}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => handleCopy(activeCommand.id, activeCommand.syntax)}
                  >
                    {copiedId === activeCommand.id ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                    {copiedId === activeCommand.id ? "Copied!" : "Copy Syntax"}
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => handleRunSim(activeCommand.id)}
                    disabled={runningSimulations[activeCommand.id]}
                  >
                    <Play size={14} />
                    {runningSimulations[activeCommand.id] ? "Executing..." : "Run Simulator"}
                  </button>
                </div>
              </div>

              {/* Code / Command Display Box */}
              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontFamily: "monospace",
                  fontSize: "0.88rem",
                  color: "var(--accent-cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>$ {activeCommand.syntax}</span>
              </div>
            </div>

            {/* Simulated Live Terminal Output Window */}
            <div
              style={{
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backgroundColor: "#0d1117",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)"
              }}
            >
              {/* Terminal Window Chrome Title Bar */}
              <div
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#161b22",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ff5f56" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#27c93f" }} />
                  <span style={{ fontSize: "0.75rem", color: "#8b949e", marginLeft: "10px", fontFamily: "monospace" }}>
                    {activeCommand.shell === "cmd" ? "cmd.exe (Command Prompt)" : activeCommand.shell === "powershell" ? "pwsh (PowerShell 7.4)" : "bash (/bin/bash)"}
                  </span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "#58a6ff", fontFamily: "monospace" }}>
                  SIMULATED HOST STDOUT
                </span>
              </div>

              {/* Terminal Body */}
              <div
                style={{
                  padding: "16px",
                  fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                  fontSize: "0.82rem",
                  lineHeight: "1.5",
                  color: "#c9d1d9",
                  maxHeight: "300px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap"
                }}
              >
                <div style={{ color: "#79c0ff", marginBottom: "8px" }}>
                  {activeCommand.shell === "cmd" ? "C:\\Users\\audit_user>" : activeCommand.shell === "powershell" ? "PS C:\\Users\\audit_user>" : "user@audithost:~$"} {activeCommand.syntax}
                </div>
                {runningSimulations[activeCommand.id] ? (
                  <div style={{ color: "#e3b341", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }} />
                    Running command on simulated system socket...
                  </div>
                ) : (
                  <div>{activeCommand.simulatedOutput}</div>
                )}
              </div>
            </div>

            {/* Parameters & Flags Breakdown */}
            <div className="card" style={{ padding: "18px" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={16} color="var(--accent-cyan)" /> Key Parameters & Flags Breakdown
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeCommand.parameters.map((param, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      display: "grid",
                      gridTemplateColumns: "140px 1fr 1fr",
                      gap: "10px",
                      fontSize: "0.82rem",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-cyan)" }}>
                      {param.flag}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {param.description}
                    </span>
                    <span style={{ color: "var(--accent-emerald)", fontSize: "0.78rem" }}>
                      <strong>Security:</strong> {param.securityUse}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Relevance & Pitfalls Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Security Relevance Card */}
              <div className="card" style={{ padding: "16px", borderLeft: "3px solid var(--accent-cyan)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Shield size={16} /> Cybersecurity Purpose & Context
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                  {activeCommand.securityRelevance}
                </p>
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--accent-emerald)" }}>
                  <strong>Safety:</strong> {activeCommand.safePracticeNotes}
                </div>
              </div>

              {/* Common Pitfalls Card */}
              <div className="card" style={{ padding: "16px", borderLeft: "3px solid var(--accent-amber)" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-amber)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={16} /> Common Pitfalls & Traps
                </h4>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                  {activeCommand.commonPitfalls.map((pitfall, pIdx) => (
                    <li key={pIdx} style={{ marginBottom: "6px" }}>
                      {pitfall}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
