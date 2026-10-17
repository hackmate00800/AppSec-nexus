import { LearningPath } from "../types";

export const LEARNING_PATHS: LearningPath[] = [
  // LEVEL 0: IT & COMPUTER FUNDAMENTALS
  {
    id: "path-0",
    title: "Level 0: Computer & IT Fundamentals",
    subtitle: "Hardware, Operating Systems, Filesystems, Processes & Command Line",
    level: "beginner",
    iconName: "Monitor",
    category: "foundations",
    estimatedHours: 12,
    prerequisitePathIds: [],
    description: "The absolute foundation of all computing. Understand CPU, RAM, kernel architectures, process isolation, filesystem hierarchies, and command-line execution before diving into security.",
    modules: [
      {
        id: "mod-0-1",
        pathId: "path-0",
        title: "Computer Architecture & Hardware",
        description: "How computers execute code, manage memory, and handle storage.",
        iconName: "Cpu",
        lessons: [
          {
            id: "les-0-1-1",
            moduleId: "mod-0-1",
            pathId: "path-0",
            title: "CPU, Memory, Storage & System Bus",
            level: "beginner",
            estimatedMinutes: 20,
            objectives: [
              "Understand the role of CPU registers, ALU, and cache hierarchy (L1/L2/L3)",
              "Differentiate between volatile RAM and persistent storage (NVMe/SSD)",
              "Explain how operating system kernels schedule process execution threads",
              "Understand the Von Neumann architecture and memory boundaries"
            ],
            prerequisites: ["None - absolute beginner starting point"],
            summary: "A computer consists of processing cores that fetch, decode, and execute binary instructions from RAM over a system bus.",
            beginnerExplanation: "Think of the CPU as a master chef, RAM as the kitchen prep counter where active ingredients sit, and storage (SSD) as the pantry downstairs where ingredients are stored long-term. When you open a program, the OS moves it from the pantry to the prep counter so the chef can work on it at lightning speed.",
            technicalDeepDive: "CPUs execute instructions at the nanosecond scale using registers (e.g. RAX, RBX in x86_64). Instructions are fetched sequentially unless redirected by branch instructions. Memory management units (MMUs) translate virtual memory addresses assigned to processes into physical RAM addresses, preventing one user process from corrupting another process's memory space.",
            diagramAscii: `+--------------------------------------------------------------+
|                        CENTRAL CPU                           |
|  +--------------------+   +-------------------------------+  |
|  | General Registers  |   | Arithmetic Logic Unit (ALU)   |  |
|  | RAX, RBX, RCX, RDX |   | Mathematical Calculations     |  |
|  +--------------------+   +-------------------------------+  |
|                 ^                        ^                   |
|                 |    L1 / L2 / L3 Cache  |                   |
+-----------------|------------------------|-------------------+
                  |                        |
             System Bus (Address, Data, Control Lines)
                  |                        |
                  v                        v
     +-------------------------+     +-------------------------+
     | Physical RAM (Volatile) |     | NVMe Storage (Persistent|
     | Active Process Memory   | <-> | Filesystem, OS Kernel   |
     +-------------------------+     +-------------------------+`,
            commonMistakes: [
              "Confusing RAM (volatile working memory) with Storage (persistent hard drives)",
              "Assuming 32-bit systems can address more than 4GB of physical RAM",
              "Believing that deleting a file from storage immediately overwrites its physical sectors"
            ],
            authoritativeReferences: [
              { title: "NIST SP 800-88: Media Sanitization Guidelines", url: "https://csrc.nist.gov/publications/detail/sp/800-88/rev-1/final", isOfficial: true },
              { title: "Computer Organization and Architecture (William Stallings)", url: "https://williamstallings.com/ComputerOrganization/", isOfficial: false }
            ],
            quiz: {
              id: "quiz-0-1-1",
              lessonId: "les-0-1-1",
              title: "Computer Architecture Knowledge Check",
              questions: [
                {
                  id: "q-0-1-1-1",
                  question: "Which component translates virtual process memory addresses into physical RAM locations?",
                  options: [
                    "Arithmetic Logic Unit (ALU)",
                    "Memory Management Unit (MMU)",
                    "Basic Input/Output System (BIOS)",
                    "Network Interface Card (NIC)"
                  ],
                  correctIndex: 1,
                  explanation: "The Memory Management Unit (MMU) is the hardware module in the CPU responsible for paging and virtual-to-physical address translation."
                },
                {
                  id: "q-0-1-1-2",
                  question: "What happens to data stored in RAM when the computer power is switched off?",
                  options: [
                    "It is automatically encrypted and saved to the SSD",
                    "It persists indefinitely until manual deletion",
                    "It is completely lost because RAM is volatile memory",
                    "It is archived to the UEFI firmware chip"
                  ],
                  correctIndex: 2,
                  explanation: "RAM is volatile memory; without continuous electrical current, the capacitors discharge and all stored state is lost."
                }
              ]
            }
          },
          {
            id: "les-0-1-2",
            moduleId: "mod-0-1",
            pathId: "path-0",
            title: "Operating Systems, Processes & Threads",
            level: "beginner",
            estimatedMinutes: 25,
            objectives: [
              "Understand User Mode vs. Kernel Mode (Ring 3 vs. Ring 0)",
              "Explain what a process is, including PID, environment, and file descriptors",
              "Differentiate between single-threaded and multi-threaded applications",
              "Learn how context switching and process scheduling work"
            ],
            prerequisites: ["CPU, Memory, Storage & System Bus"],
            summary: "An operating system manages hardware resources and isolates software applications using privilege rings and process boundaries.",
            beginnerExplanation: "The operating system acts as the conductor of an orchestra. Normal programs (browser, music player) run in 'User Mode', meaning they cannot directly touch the physical hard drive or network card. When a program wants to save a file, it must politely ask the OS kernel (running in 'Kernel Mode') via a System Call.",
            technicalDeepDive: "Modern x86/x64 processors implement hierarchical privilege rings. Ring 0 (Kernel Mode) has complete, unrestricted access to hardware instructions and physical memory. Ring 3 (User Mode) runs applications in an isolated sandbox. Switching between user and kernel space requires software interrupts (`syscall` in x86_64), which incur context-switching overhead.",
            diagramAscii: `+--------------------------------------------------------------+
| USER MODE (Ring 3) - Applications & Sandboxed Code           |
|  [ Web Browser ]      [ Text Editor ]      [ Python Script ] |
+--------------------------------------------------------------+
                               |
                   System Calls (syscall / libc)
                               v
+--------------------------------------------------------------+
| KERNEL MODE (Ring 0) - Privileged Operating System Core      |
|  - Process Scheduler     - Memory Paging      - IPC Engine   |
|  - Device Drivers        - File System Drivers- Network Stack|
+--------------------------------------------------------------+
                               |
                       Hardware Direct
                               v
             [ CPU Cores ]   [ RAM ]   [ NIC ]   [ Storage ]`,
            commonMistakes: [
              "Thinking user applications can directly write to raw physical RAM without kernel translation",
              "Confusing processes (independent address spaces) with threads (shared address space within a process)",
              "Assuming killing a child thread automatically terminates the parent process"
            ],
            authoritativeReferences: [
              { title: "Linux Kernel Documentation: System Calls", url: "https://www.kernel.org/doc/html/latest/process/adding-syscalls.html", isOfficial: true },
              { title: "Microsoft Learn: User Mode and Kernel Mode", url: "https://learn.microsoft.com/en-us/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode", isOfficial: true }
            ],
            quiz: {
              id: "quiz-0-1-2",
              lessonId: "les-0-1-2",
              title: "Process & Kernel Model Knowledge Check",
              questions: [
                {
                  id: "q-0-1-2-1",
                  question: "Why do web browsers and text editors run in User Mode (Ring 3) rather than Kernel Mode (Ring 0)?",
                  options: [
                    "To allow them to run faster without waiting on the CPU",
                    "To prevent application crashes or vulnerabilities from taking down the entire operating system",
                    "Because user applications cannot utilize RAM",
                    "To disable internet access by default"
                  ],
                  correctIndex: 1,
                  explanation: "Running user programs in Ring 3 enforces isolation. If a user app crashes or suffers an exploit, the kernel protects the rest of the system."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // LEVEL 1: NETWORKING ACADEMY
  {
    id: "path-1",
    title: "Level 1: Networking Academy",
    subtitle: "OSI 7 Layers, TCP/IP, IP Addressing, Subnetting, DNS, TLS 1.3 & Packet Inspection",
    level: "beginner",
    iconName: "Globe",
    category: "foundations",
    estimatedHours: 18,
    prerequisitePathIds: ["path-0"],
    description: "Every security flaw in web, cloud, and network security operates across network protocols. Master packets, sockets, routing, Wireshark, and Nmap scanning.",
    modules: [
      {
        id: "mod-1-1",
        pathId: "path-1",
        title: "The Architecture of Network Protocols",
        description: "From physical ethernet frames to encrypted application payloads.",
        iconName: "Layers",
        lessons: [
          {
            id: "les-1-1-1",
            moduleId: "mod-1-1",
            pathId: "path-1",
            title: "OSI 7-Layer vs. TCP/IP 4-Layer Reference Models",
            level: "beginner",
            estimatedMinutes: 30,
            objectives: [
              "Map the 7 layers of the OSI model to real-world networking technologies",
              "Understand the 4-layer TCP/IP practical model used by the Internet",
              "Trace data encapsulation and de-encapsulation from browser to wire",
              "Identify Protocol Data Units (PDUs): Frame, Packet, Segment, and Data"
            ],
            prerequisites: ["Computer Architecture & Hardware"],
            summary: "Network communication relies on standardized layering. Each layer prepends its own header during encapsulation and strips it during de-encapsulation.",
            beginnerExplanation: "Sending a message over the internet is like mailing a letter. You write the letter (Application layer), put it in an envelope with an apartment number (Transport port), put that inside a box with the street address (Network IP), and give it to a postal truck with license plates (Data Link MAC).",
            technicalDeepDive: "As data flows down the protocol stack on the transmitting host, each layer adds a header: Layer 4 adds TCP/UDP ports and sequence numbers; Layer 3 adds source and destination IP addresses (IPv4/IPv6); Layer 2 adds source/destination MAC addresses and a Frame Check Sequence (FCS) trailer. The receiving host reverses this process.",
            diagramAscii: `OSI 7-LAYER MODEL               TCP/IP 4-LAYER             DATA UNIT (PDU)
+-----------------------+     +-------------------+       +---------------+
| 7. Application Layer  | <-> |                   |       |               |
| 6. Presentation Layer | <-> | 4. Application    | ----> | Application   |
| 5. Session Layer      | <-> |    (HTTP, DNS)    |       | Payload Data  |
+-----------------------+     +-------------------+       +---------------+
| 4. Transport Layer    | <-> | 3. Transport      | ----> | TCP Segment   |
|    (TCP, UDP, Ports)  |     |    (TCP/UDP)      |       | / UDP Datagram|
+-----------------------+     +-------------------+       +---------------+
| 3. Network Layer      | <-> | 2. Internet       | ----> | IP Packet     |
|    (IPv4, IPv6, ICMP) |     |    (IPv4, IPv6)   |       | (Host to Host)|
+-----------------------+     +-------------------+       +---------------+
| 2. Data Link Layer    | <-> | 1. Network Access | ----> | Ethernet Frame|
|    (MAC, ARP, Switch) |     |    (Ethernet, Wi-Fi)      | (Hop to Hop)  |
| 1. Physical (Bits/Wire)     +-------------------+       +---------------+`,
            commonMistakes: [
              "Confusing Layer 2 MAC addresses (local hop) with Layer 3 IP addresses (end-to-end routing)",
              "Assuming HTTP is Layer 4 (HTTP is Layer 7; TCP is Layer 4)",
              "Thinking routers inspect Layer 7 HTTP payloads by default (standard routers operate strictly at Layer 3)"
            ],
            authoritativeReferences: [
              { title: "RFC 1122: Requirements for Internet Hosts", url: "https://datatracker.ietf.org/doc/html/rfc1122", isOfficial: true },
              { title: "ISO/IEC 7498-1: Open Systems Interconnection Basic Reference Model", url: "https://www.iso.org/standard/20269.html", isOfficial: true }
            ],
            quiz: {
              id: "quiz-1-1-1",
              lessonId: "les-1-1-1",
              title: "OSI & TCP/IP Model Knowledge Check",
              questions: [
                {
                  id: "q-1-1-1-1",
                  question: "At which layer of the OSI model does IP routing occur?",
                  options: [
                    "Layer 2 (Data Link)",
                    "Layer 3 (Network)",
                    "Layer 4 (Transport)",
                    "Layer 7 (Application)"
                  ],
                  correctIndex: 1,
                  explanation: "Layer 3 (Network Layer) is responsible for logical host addressing (IPv4/IPv6) and path determination (routing)."
                },
                {
                  id: "q-1-1-1-2",
                  question: "What is the specific Protocol Data Unit (PDU) name at the Transport Layer (Layer 4) when using TCP?",
                  options: [
                    "Frame",
                    "Packet",
                    "Segment",
                    "Bitstream"
                  ],
                  correctIndex: 2,
                  explanation: "At Layer 4, TCP data is called a Segment (or Datagram for UDP). Layer 3 uses Packets, and Layer 2 uses Frames."
                }
              ]
            },
            scannerIntegration: {
              toolId: "nmap",
              toolName: "Nmap Network Scanner",
              scanType: "passive",
              suggestedAction: "Run an Nmap host discovery scan to see Layer 3/4 probing in action."
            }
          },
          {
            id: "les-1-1-2",
            moduleId: "mod-1-1",
            pathId: "path-1",
            title: "IP Addressing, Subnetting & CIDR Mastery",
            level: "beginner",
            estimatedMinutes: 35,
            objectives: [
              "Calculate network address, broadcast address, and usable host ranges",
              "Understand CIDR notation (/24, /16, /8, /28, /30)",
              "Distinguish RFC 1918 Private IPv4 address spaces from Public IPs",
              "Understand IPv6 addressing structure and benefits"
            ],
            prerequisites: ["OSI 7-Layer vs. TCP/IP 4-Layer Reference Models"],
            summary: "IP addresses uniquely identify hosts on a network. Subnet masks separate the network portion from host identifiers.",
            beginnerExplanation: "An IP address is like a phone number. The area code tells you which city the house is in (the network portion), and the remaining digits tell you which exact house is ringing (the host portion). A subnet mask tells your router exactly where the area code ends and the house number begins.",
            technicalDeepDive: "IPv4 addresses are 32-bit binary integers written in 4 dotted-decimal octets. A /24 subnet has 24 network bits and 8 host bits ($2^8 = 256$ total addresses). The first address (.0) is reserved as the Network ID; the last address (.255) is reserved as the Directed Broadcast. Therefore, usable hosts = $2^{(32 - \text{CIDR})} - 2 = 254$.",
            diagramAscii: `IPv4 OCTET BINARY BREAKDOWN (192.168.1.10 / 24):
192      . 168      . 1        . 10
11000000 . 10101000 . 00000001 . 00001010  (IP Address)
11111111 . 11111111 . 11111111 . 00000000  (Subnet Mask 255.255.255.0 = /24)
[------- 24 NETWORK BITS ------] [8 HOST]

RFC 1918 PRIVATE IP RANGES (NOT ROUTED ON PUBLIC INTERNET):
1. Class A: 10.0.0.0      - 10.255.255.255   (/8  - 16,777,216 IPs)
2. Class B: 172.16.0.0    - 172.31.255.255   (/12 - 1,048,576 IPs)
3. Class C: 192.168.0.0   - 192.168.255.255  (/16 - 65,536 IPs)
Loopback:   127.0.0.1     - 127.255.255.254  (Host Localhost)`,
            commonMistakes: [
              "Forgetting to subtract 2 (Network and Broadcast) when calculating usable host capacity",
              "Assuming private RFC 1918 IP addresses can be routed directly across the public internet without NAT",
              "Confusing /24 (254 hosts) with /16 (65,534 hosts)"
            ],
            authoritativeReferences: [
              { title: "RFC 1918: Address Allocation for Private Internets", url: "https://datatracker.ietf.org/doc/html/rfc1918", isOfficial: true },
              { title: "RFC 4632: Classless Inter-domain Routing (CIDR)", url: "https://datatracker.ietf.org/doc/html/rfc4632", isOfficial: true }
            ],
            quiz: {
              id: "quiz-1-1-2",
              lessonId: "les-1-1-2",
              title: "Subnetting & CIDR Knowledge Check",
              questions: [
                {
                  id: "q-1-1-2-1",
                  question: "How many usable host IP addresses are available in a /28 subnet?",
                  options: [
                    "16",
                    "14",
                    "30",
                    "254"
                  ],
                  correctIndex: 1,
                  explanation: "A /28 subnet leaves 4 host bits ($32 - 28 = 4$). Total addresses = $2^4 = 16$. Subtracting network and broadcast gives $16 - 2 = 14$ usable hosts."
                },
                {
                  id: "q-1-1-2-2",
                  question: "Which of the following IP addresses belongs to an RFC 1918 private network range?",
                  options: [
                    "8.8.8.8",
                    "172.20.14.5",
                    "151.101.65.140",
                    "1.1.1.1"
                  ],
                  correctIndex: 1,
                  explanation: "172.20.14.5 falls within the 172.16.0.0 - 172.31.255.255 private range defined by RFC 1918."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // LEVEL 2: LINUX & WINDOWS SECURITY
  {
    id: "path-2",
    title: "Level 2: Linux & Windows Security",
    subtitle: "Filesystems, User Privileges, SUID, Windows Tokens, Sysmon & Hardening",
    level: "beginner",
    iconName: "Terminal",
    category: "foundations",
    estimatedHours: 16,
    prerequisitePathIds: ["path-0", "path-1"],
    description: "Operating systems host servers and databases. Learn Linux permissions, privilege escalation vectors (SUID/capabilities), Windows Access Tokens, UAC, and PowerShell incident response.",
    modules: [
      {
        id: "mod-2-1",
        pathId: "path-2",
        title: "Linux Security Architecture",
        description: "Permissions, Daemons, Shell Scripting, and Privilege Escalation Vectors.",
        iconName: "Shield",
        lessons: [
          {
            id: "les-2-1-1",
            moduleId: "mod-2-1",
            pathId: "path-2",
            title: "Linux Filesystem Hierarchy, Permissions & SUID Bits",
            level: "beginner",
            estimatedMinutes: 25,
            objectives: [
              "Understand the Linux Filesystem Hierarchy Standard (/etc, /var, /tmp, /dev)",
              "Calculate octal permissions (r=4, w=2, x=1) for User, Group, and Others",
              "Identify high-risk SUID/SGID binaries that execute with root privileges",
              "Audit sudo permissions using `sudo -l`"
            ],
            prerequisites: ["Computer Architecture & Operating Systems"],
            summary: "Linux enforces discretionary access control (DAC) based on owner, group, and other permissions, with special bits like SUID allowing temporary privilege elevation.",
            beginnerExplanation: "In Linux, everything is a file. Every file has an Owner, a Group, and Others. The permissions dictate who can Read, Write, or Execute it. If a file has the SUID bit set, running it executes with the powers of the file's owner (often root), similar to a regular citizen temporarily holding presidential executive authority.",
            technicalDeepDive: "Linux permission modes are stored in 12 bits: 3 special bits (SUID=4000, SGID=2000, Sticky=1000) followed by 9 standard permission bits (rwx for User, Group, Others). A binary with permissions `-rwsr-xr-x` (4755) executes with the Effective UID (EUID) of its owner. If an administrator improperly grants SUID to binaries like `find`, `vim`, or `bash`, any low-privilege user can spawn a root shell.",
            diagramAscii: `LINUX PERMISSION BITS MATRIX:
Special Bits: SUID (4), SGID (2), Sticky (1)
Permissions:  r = 4 (Read), w = 2 (Write), x = 1 (Execute)

-   r w x   r - x   r - x   (Octal: 755 - Standard executable)
|   |---|   |---|   |---|
Type Owner  Group   Others

-   r w s   r - x   r - x   (Octal: 4755 - SUID Active!)
        ^
        |-- The 's' indicates SUID bit is set. When launched by ANY user,
            the process effective UID elevates to file owner (e.g. root)!`,
            codeExamples: [
              {
                language: "bash",
                caption: "Finding all SUID binaries on a Linux host",
                code: "find / -perm -4000 -type f -exec ls -la {} \\; 2>/dev/null"
              }
            ],
            commonMistakes: [
              "Setting 777 permissions on sensitive production files or directories",
              "Placing SUID permissions on scripting interpreters (bash, python, perl)",
              "Leaving world-writable files in directories where root executes cron jobs"
            ],
            authoritativeReferences: [
              { title: "POSIX.1-2017: File Permissions and Access Control", url: "https://pubs.opengroup.org/onlinepubs/9699919799/", isOfficial: true },
              { title: "GTFOBins: Unix Binaries Privilege Escalation Cheatsheet", url: "https://gtfobins.github.io/", isOfficial: false }
            ],
            quiz: {
              id: "quiz-2-1-1",
              lessonId: "les-2-1-1",
              title: "Linux Permissions Knowledge Check",
              questions: [
                {
                  id: "q-2-1-1-1",
                  question: "What does the numeric permission octal '4755' represent on an executable binary owned by root?",
                  options: [
                    "Only the root user can read and write the file",
                    "The file has SUID set, executing with root privileges regardless of who launches it",
                    "The file is encrypted with AES-256",
                    "The file will be automatically deleted after execution"
                  ],
                  correctIndex: 1,
                  explanation: "The leading '4' indicates SUID. When executed by any user, the kernel assigns root's UID to the running process."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // LEVEL 3: PROGRAMMING FOR CYBERSECURITY
  {
    id: "path-3",
    title: "Level 3: Programming for Cybersecurity",
    subtitle: "Python, Bash, JavaScript, SQL & PHP for Security Automation & Code Auditing",
    level: "beginner",
    iconName: "Code",
    category: "foundations",
    estimatedHours: 22,
    prerequisitePathIds: ["path-0", "path-1"],
    description: "Security engineers audit code and automate scans. Learn Python network requests, Bash recon automation, JavaScript browser DOM, SQL queries, and PHP backend flaws.",
    modules: [
      {
        id: "mod-3-1",
        pathId: "path-3",
        title: "Python for Security Automation",
        description: "Writing custom HTTP auditors, port scanners, and API interaction scripts.",
        iconName: "Terminal",
        lessons: [
          {
            id: "les-3-1-1",
            moduleId: "mod-3-1",
            pathId: "path-3",
            title: "Automating HTTP Probing with Python Requests",
            level: "beginner",
            estimatedMinutes: 30,
            objectives: [
              "Send HTTP GET, POST, PUT, and DELETE requests using `requests`",
              "Inspect response status codes, headers, cookies, and JSON payloads",
              "Implement custom timeout handling and redirect inspection",
              "Write a defensive security header auditor in 25 lines of Python"
            ],
            prerequisites: ["Computer & IT Fundamentals", "Networking Academy"],
            summary: "Python is the industry-standard language for security automation, tooling, and rapid script creation.",
            beginnerExplanation: "Instead of clicking through a browser or typing curl commands one by one, Python lets you write 10 lines of code that automatically inspect 1,000 URLs in seconds to check if they have security headers enabled.",
            technicalDeepDive: "The `requests` library abstracts underlying socket management. In security auditing, always set explicit timeouts (`timeout=5`) to prevent thread hangs, handle SSL verification gracefully (`verify=True`), and inspect redirect histories (`response.history`) to detect open redirect vulnerabilities.",
            codeExamples: [
              {
                language: "python",
                caption: "Defensive Security Header Auditor in Python",
                code: `import requests, sys

target_url = sys.argv[1] if len(sys.argv) > 1 else "https://example.com"
essential_headers = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options"
]

try:
    res = requests.get(target_url, timeout=5, allow_redirects=True)
    print(f"[*] Auditing {target_url} (HTTP {res.status_code})")
    for header in essential_headers:
        if header in res.headers:
            print(f"  [+] {header}: Present")
        else:
            print(f"  [-] {header}: MISSING! Risk of injection/framing attacks.")
except requests.exceptions.RequestException as e:
    print(f"[!] Scan error: {e}")`
              }
            ],
            commonMistakes: [
              "Omitting `timeout` parameters, causing Python scripts to hang indefinitely on stalled servers",
              "Hardcoding sensitive API tokens inside public GitHub repository scripts",
              "Disabling SSL verification (`verify=False`) in production scanning without understanding MITM risks"
            ],
            authoritativeReferences: [
              { title: "Python Requests Documentation: Advanced Usage", url: "https://requests.readthedocs.io/en/latest/", isOfficial: true },
              { title: "OWASP Secure Coding Practices Quick Reference", url: "https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/", isOfficial: true }
            ],
            quiz: {
              id: "quiz-3-1-1",
              lessonId: "les-3-1-1",
              title: "Python Automation Knowledge Check",
              questions: [
                {
                  id: "q-3-1-1-1",
                  question: "Why is setting an explicit timeout parameter essential when automating network security scans in Python?",
                  options: [
                    "To speed up the CPU clock rate",
                    "To prevent scripts from hanging indefinitely if a remote server drops packets or is unresponsive",
                    "To bypass cloud firewalls",
                    "To enable automatic multi-threading"
                  ],
                  correctIndex: 1,
                  explanation: "Without an explicit timeout, network sockets can block forever on unclosed TCP connections, stalling your entire scanning pipeline."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // LEVEL 4: CYBERSECURITY FUNDAMENTALS
  {
    id: "path-4",
    title: "Level 4: Cybersecurity Fundamentals",
    subtitle: "CIA Triad, STRIDE Threat Modeling, Cryptography, Identity & Risk Assessment",
    level: "beginner",
    iconName: "Shield",
    category: "foundations",
    estimatedHours: 18,
    prerequisitePathIds: ["path-0", "path-1"],
    description: "Understand core defensive principles: Confidentiality, Integrity, Availability, threat modeling frameworks, symmetric vs asymmetric encryption, and CVSS severity scoring.",
    modules: [
      {
        id: "mod-4-1",
        pathId: "path-4",
        title: "Core Security Architecture & Threat Modeling",
        description: "The conceptual foundations of building secure, tamper-resistant systems.",
        iconName: "Lock",
        lessons: [
          {
            id: "les-4-1-1",
            moduleId: "mod-4-1",
            pathId: "path-4",
            title: "CIA Triad, Zero Trust & Defense-in-Depth",
            level: "beginner",
            estimatedMinutes: 25,
            objectives: [
              "Define Confidentiality, Integrity, and Availability with practical engineering examples",
              "Explain the core tenets of Zero Trust Architecture: 'Never Trust, Always Verify'",
              "Design a Defense-in-Depth layered strategy for a public cloud application",
              "Apply the Principle of Least Privilege across users, services, and APIs"
            ],
            prerequisites: ["Computer & IT Fundamentals"],
            summary: "Security is not a single product or feature; it is an architectural mindset prioritizing data confidentiality, tamper resistance, and continuous availability.",
            beginnerExplanation: "Imagine a high-security bank. It doesn't rely solely on a locked front door. It has security cameras, armed guards, an outer vault, safe deposit boxes inside the vault, dual keys, and biometric authentication. If someone bypasses the front door, the remaining layers keep the money safe.",
            technicalDeepDive: "Zero Trust Architecture (NIST SP 800-207) eliminates the concept of an implicitly trusted internal corporate network. Every access request must be authenticated, authorized, and encrypted based on real-time context (user identity, device health status, geolocation, and behavioral anomaly scores).",
            diagramAscii: `DEFENSE-IN-DEPTH LAYERED MODEL:
1. Physical Security       -> Biometrics, locked server cages, CCTV
2. Perimeter Network       -> Cloudflare DDoS Scrubbing, Border Gateway Firewalls
3. Network Segmentation    -> Internal VLANs, Micro-segmentation, Private Subnets
4. Application Layer       -> Web Application Firewall (WAF), TLS 1.3, Rate Limits
5. Access Control (IAM)    -> Multi-Factor Authentication (MFA), Role-Based Access (RBAC)
6. Data Security           -> AES-256-GCM encryption at rest, SHA-256 HMAC integrity checks`,
            commonMistakes: [
              "Assuming being on the corporate office Wi-Fi means a device is trustworthy",
              "Prioritizing Confidentiality while completely ignoring Availability (e.g. failing to maintain offline backups)",
              "Relying on a single security control (like a perimeter firewall) to protect vulnerable backend servers"
            ],
            authoritativeReferences: [
              { title: "NIST SP 800-207: Zero Trust Architecture", url: "https://csrc.nist.gov/publications/detail/sp/800-207/final", isOfficial: true },
              { title: "CISA Zero Trust Maturity Model v2.0", url: "https://www.cisa.gov/zero-trust-maturity-model", isOfficial: true }
            ],
            quiz: {
              id: "quiz-4-1-1",
              lessonId: "les-4-1-1",
              title: "Security Principles Knowledge Check",
              questions: [
                {
                  id: "q-4-1-1-1",
                  question: "Which pillar of the CIA Triad is directly violated by a ransomware attack that encrypts files and demands payment?",
                  options: [
                    "Confidentiality only",
                    "Availability (and potentially Confidentiality/Integrity)",
                    "Authentication",
                    "Non-repudiation"
                  ],
                  correctIndex: 1,
                  explanation: "Ransomware primarily violates Availability by making systems and files inaccessible to legitimate users."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // LEVEL 5: WEB DEVELOPMENT & APPLICATION ARCHITECTURE
  {
    id: "path-5",
    title: "Level 5: Web Dev & Application Architecture",
    subtitle: "HTTP Lifecycle, Cookies, Sessions, Tokens, Same-Origin Policy & Browser Security",
    level: "intermediate",
    iconName: "Globe",
    category: "architecture",
    estimatedHours: 20,
    prerequisitePathIds: ["path-1", "path-3"],
    description: "You cannot secure what you do not understand. Learn how modern web applications operate: full HTTP request-response cycle, cookies, JWT tokens, CORS, CSP, and reverse proxies.",
    modules: [
      {
        id: "mod-5-1",
        pathId: "path-5",
        title: "Browser Security Boundaries",
        description: "Same-Origin Policy, Cross-Origin Resource Sharing, and Content-Security-Policy.",
        iconName: "Lock",
        lessons: [
          {
            id: "les-5-1-1",
            moduleId: "mod-5-1",
            pathId: "path-5",
            title: "Same-Origin Policy (SOP) vs. CORS Misconfigurations",
            level: "intermediate",
            estimatedMinutes: 30,
            objectives: [
              "Define an Origin (Protocol + FQDN + Port) and explain SOP enforcement",
              "Understand why CORS is a mechanism to relax SOP for trusted domains",
              "Analyze insecure CORS headers (`Access-Control-Allow-Origin: *` with credentials)",
              "Configure secure Nginx and Express.js CORS allowlists"
            ],
            prerequisites: ["Networking Academy", "Programming for Cybersecurity"],
            summary: "The Same-Origin Policy prevents scripts loaded from one website from reading confidential data from another website unless authorized via CORS headers.",
            beginnerExplanation: "If you are logged into your bank in Tab 1, and visit an attacker's game website in Tab 2, the browser's Same-Origin Policy forbids Tab 2 from reading your bank account balance or stealing your statements.",
            technicalDeepDive: "Two URLs share the Same Origin if and only if their Scheme, Host, and Port are identical. CORS (Cross-Origin Resource Sharing) allows servers to instruct browsers via response headers (`Access-Control-Allow-Origin`) to permit cross-origin reads. Setting `Access-Control-Allow-Origin: *` or reflecting arbitrary `Origin` request headers alongside `Access-Control-Allow-Credentials: true` completely undermines browser isolation.",
            diagramAscii: `SAME-ORIGIN POLICY MATRIX (Relative to https://example.com:443):
URL                                     Same Origin?  Reason
https://example.com/user/profile        YES           Same scheme, host, port
https://example.com:443/api             YES           Explicit matching port
http://example.com/api                  NO            Different scheme (HTTP vs HTTPS)
https://api.example.com/data            NO            Different host (subdomain)
https://example.com:8080/app            NO            Different port (8080 vs 443)`,
            codeExamples: [
              {
                language: "javascript",
                caption: "Insecure CORS Wildcard Reflection in Express.js",
                code: `// VULNERABLE: Reflects any requesting origin and allows credentials!
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});`,
                isVulnerable: true
              },
              {
                language: "javascript",
                caption: "Secure CORS Allowlist in Express.js",
                code: `// SECURE: Validates against a static whitelist of trusted domains
const ALLOWED_ORIGINS = ["https://app.trusted-portal.com", "https://admin.trusted-portal.com"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  next();
});`,
                isVulnerable: false
              }
            ],
            commonMistakes: [
              "Confusing CORS with network firewalling (CORS is enforced by the client browser, not the server)",
              "Reflecting the incoming `Origin` header dynamically without validation",
              "Using regex matching like `/example.com/` which accidentally matches attacker domains like `evil-example.com`"
            ],
            authoritativeReferences: [
              { title: "MDN Web Docs: Same-Origin Policy", url: "https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy", isOfficial: true },
              { title: "PortSwigger Web Security Academy: CORS Vulnerabilities", url: "https://portswigger.net/web-security/cors", isOfficial: false }
            ],
            quiz: {
              id: "quiz-5-1-1",
              lessonId: "les-5-1-1",
              title: "SOP & CORS Knowledge Check",
              questions: [
                {
                  id: "q-5-1-1-1",
                  question: "Does the Same-Origin Policy permit https://bank.com to read API responses from http://bank.com?",
                  options: [
                    "Yes, because the hostname is identical",
                    "No, because the schemes (HTTPS vs HTTP) differ",
                    "Yes, if cookies are present",
                    "No, only if port 8080 is blocked"
                  ],
                  correctIndex: 1,
                  explanation: "The Same-Origin Policy requires identical scheme, host, and port. HTTPS and HTTP represent distinct origins."
                }
              ]
            },
            scannerIntegration: {
              toolId: "baseline",
              toolName: "AppSec Nexus Crawler & Header Analyzer",
              scanType: "passive",
              suggestedAction: "Run a passive scan against your lab target to audit CORS response headers."
            }
          }
        ]
      }
    ]
  },

  // LEVEL 6: ETHICAL HACKING & PENETRATION TESTING
  {
    id: "path-6",
    title: "Level 6: Ethical Hacking & Penetration Testing",
    subtitle: "Rules of Engagement, PTES, WSTG, Passive/Active Recon & Professional Reporting",
    level: "intermediate",
    iconName: "ShieldAlert",
    category: "offensive",
    estimatedHours: 24,
    prerequisitePathIds: ["path-1", "path-2", "path-4"],
    description: "Learn the full authorized penetration testing lifecycle: scoping, legal boundaries, passive OSINT, active enumeration, controlled PoC verification, and writing executive remediation reports.",
    modules: [
      {
        id: "mod-6-1",
        pathId: "path-6",
        title: "The Penetration Testing Lifecycle",
        description: "From Rules of Engagement to Retesting and Vulnerability Closure.",
        iconName: "FileText",
        lessons: [
          {
            id: "les-6-1-1",
            moduleId: "mod-6-1",
            pathId: "path-6",
            title: "Rules of Engagement, Authorization & PTES Framework",
            level: "intermediate",
            estimatedMinutes: 30,
            objectives: [
              "Understand the legal difference between authorized penetration testing and computer crime",
              "Define explicit Rules of Engagement (RoE), testing windows, and IP whitelists",
              "Execute the 7 phases of the Penetration Testing Execution Standard (PTES)",
              "Differentiate vulnerability scanning, pentesting, red teaming, and code auditing"
            ],
            prerequisites: ["Cybersecurity Fundamentals"],
            summary: "Without explicit, written authorization and defined scope from the system owner, any active security probing is unauthorized and illegal under CFAA and global cybercrime laws.",
            beginnerExplanation: "A building owner hires a locksmith to test the building's locks and physical security. The locksmith has a contract specifying which doors to test and during what hours. If someone tries to pick locks without a contract, that is burglary.",
            technicalDeepDive: "The Penetration Testing Execution Standard (PTES) defines 7 structured phases: 1) Pre-engagement Interactions (scoping, RoE, emergency contacts); 2) Intelligence Gathering (OSINT, DNS, Shodan); 3) Threat Modeling; 4) Vulnerability Analysis; 5) Exploitation (controlled PoC verification); 6) Post-Exploitation (determining business impact); 7) Reporting (executive summary, technical breakdown, remediation steps).",
            diagramAscii: `THE PTES PENETRATION TESTING LIFECYCLE:
[ 1. Pre-Engagement ] -> Scoping, Authorization Contract, Rules of Engagement
         |
         v
[ 2. Intel Gathering ] -> Passive OSINT, Subdomain Discovery, Certificate Logs
         |
         v
[ 3. Threat Modeling ] -> Identify Assets, Trust Boundaries, Attack Vectors
         |
         v
[ 4. Vuln Analysis  ] -> Automated Scanning + Manual Business Logic Enumeration
         |
         v
[ 5. Exploitation   ] -> Controlled Safe Proof-of-Concept Validation (No Denial of Service)
         |
         v
[ 6. Post-Exploit   ] -> Determine Realistic Business Impact & Data Exposure Risk
         |
         v
[ 7. Reporting      ] -> Executive Summary, Technical Evidence, Verified Remediation & Retesting`,
            commonMistakes: [
              "Conducting active testing before obtaining signed written authorization from the verified system owner",
              "Scanning out-of-scope third-party infrastructure (like shared CDNs or payment gateways) during an engagement",
              "Delivering an unverified raw automated tool output dump and calling it a penetration test report"
            ],
            authoritativeReferences: [
              { title: "Penetration Testing Execution Standard (PTES)", url: "http://www.pentest-standard.org/", isOfficial: true },
              { title: "NIST SP 800-115: Technical Guide to Information Security Testing and Assessment", url: "https://csrc.nist.gov/publications/detail/sp/800-115/final", isOfficial: true }
            ],
            quiz: {
              id: "quiz-6-1-1",
              lessonId: "les-6-1-1",
              title: "Pentesting Methodology Knowledge Check",
              questions: [
                {
                  id: "q-6-1-1-1",
                  question: "What is the primary distinguishing factor between a Vulnerability Assessment and a Penetration Test?",
                  options: [
                    "Vulnerability assessments use computers; penetration tests do not",
                    "Penetration tests validate exploitable attack chains and determine real-world business impact through controlled verification",
                    "Vulnerability assessments are illegal without police permission",
                    "Penetration tests never include written reports"
                  ],
                  correctIndex: 1,
                  explanation: "Vulnerability assessments list potential flaws; penetration testing goes further by manually validating exploitability, filtering false positives, and assessing actual business risk."
                }
              ]
            }
          }
        ]
      }
    ]
  },

  // LEVEL 7: COMPLETE WEB APPLICATION PENTESTING
  {
    id: "path-7",
    title: "Level 7: Web Application Penetration Testing",
    subtitle: "OWASP Top 10, SQLi, XSS, SSRF, IDOR, Path Traversal, SSTI & Deserialization",
    level: "advanced",
    iconName: "Bug",
    category: "offensive",
    estimatedHours: 35,
    prerequisitePathIds: ["path-3", "path-5", "path-6"],
    description: "Deep dive into web application vulnerabilities: root causes, vulnerable code, manual validation, proof-of-concept testing, and secure engineering remediations.",
    modules: [
      {
        id: "mod-7-1",
        pathId: "path-7",
        title: "Injection Vulnerabilities",
        description: "SQL Injection, Cross-Site Scripting, Command Injection, and SSTI.",
        iconName: "Code",
        lessons: [
          {
            id: "les-7-1-1",
            moduleId: "mod-7-1",
            pathId: "path-7",
            title: "SQL Injection (SQLi) - In-Band, Error-Based & Blind",
            level: "advanced",
            estimatedMinutes: 40,
            objectives: [
              "Identify the root cause of SQL Injection (untrusted string concatenation into SQL statements)",
              "Differentiate between Union-based, Error-based, Boolean Blind, and Time-based Blind SQLi",
              "Execute manual validation using parameterized tests in controlled local environments",
              "Implement robust remediation using Prepared Statements and Parameterized Queries across languages"
            ],
            prerequisites: ["Programming for Cybersecurity (SQL)", "Web Dev Architecture"],
            summary: "SQL Injection occurs when untrusted user input is directly concatenated into a dynamic SQL query, allowing an attacker to manipulate the query structure.",
            beginnerExplanation: "Imagine ordering a drink and saying: 'Give me a coffee, and also cancel everyone else's bill!' If the cashier takes your words literally as a managerial command instead of a drink name, they execute unintended instructions.",
            technicalDeepDive: "When an application executes `SELECT * FROM users WHERE username = '\" + input + \"'`, submitting `' OR '1'='1` changes the boolean evaluation of the WHERE clause so it always returns true. In Blind SQLi where no data or error is returned, attackers use conditional delays like `pg_sleep(5)` or `WAITFOR DELAY '0:0:5'` to infer database contents one character at a time.",
            diagramAscii: `SQL INJECTION EXECUTION FLOW:
1. Attacker Input:   admin' OR '1'='1' --
2. Vulnerable App:   query = "SELECT * FROM users WHERE user = '" + input + "' AND pass = '" + pass + "'"
3. Resulting SQL:    SELECT * FROM users WHERE user = 'admin' OR '1'='1' -- ' AND pass = '...'
                     |--------------------------------------| |--------|
                           Evaluates to TRUE for all rows     Commented out!
4. Database Action:  Returns the first account in the table (typically Administrator)
5. Secure Fix:       Use Parameterized Queries: query = "SELECT * FROM users WHERE user = ? AND pass = ?"
                     Database engine compiles SQL BEFORE binding input strictly as literal text data!`,
            codeExamples: [
              {
                language: "php",
                caption: "Vulnerable PHP Concatenation Query",
                code: `// VULNERABLE: Direct variable concatenation into SQL string
$user = $_POST['username'];
$pass = $_POST['password'];
$sql = "SELECT * FROM accounts WHERE username = '$user' AND password = '$pass'";
$result = $conn->query($sql);`,
                isVulnerable: true
              },
              {
                language: "php",
                caption: "Secure PHP PDO Parameterized Query",
                code: `// SECURE: PDO Prepared Statement with Parameter Binding
$stmt = $pdo->prepare('SELECT id, username, role FROM accounts WHERE username = :user AND password_hash = :hash');
$stmt->execute(['user' => $user, 'hash' => $hashed_pass]);
$account = $stmt->fetch();`,
                isVulnerable: false
              }
            ],
            commonMistakes: [
              "Relying on client-side HTML input validation or regex blacklists (like removing single quotes)",
              "Using `addslashes()` or simple escaping instead of true parameterized queries",
              "Assuming stored procedures are automatically immune to SQLi (dynamic SQL inside stored procedures is still vulnerable)"
            ],
            authoritativeReferences: [
              { title: "OWASP SQL Injection Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html", isOfficial: true },
              { title: "MITRE CWE-89: Improper Neutralization of Special Elements used in an SQL Command", url: "https://cwe.mitre.org/data/definitions/89.html", isOfficial: true }
            ],
            quiz: {
              id: "quiz-7-1-1",
              lessonId: "les-7-1-1",
              title: "SQL Injection Knowledge Check",
              questions: [
                {
                  id: "q-7-1-1-1",
                  question: "What is the primary, industry-standard defensive control to prevent SQL Injection in web applications?",
                  options: [
                    "Web Application Firewall (WAF) rule sets",
                    "Parameterized queries (Prepared Statements)",
                    "JavaScript client-side input validation",
                    "Hashing all user input with MD5"
                  ],
                  correctIndex: 1,
                  explanation: "Parameterized queries ensure the database engine compiles the SQL query structure first, treating user input strictly as literal text parameters."
                }
              ]
            },
            relatedVulnerabilityIds: ["vuln-sqli"],
            scannerIntegration: {
              toolId: "nuclei",
              toolName: "Nuclei CVE & Vulnerability Engine",
              scanType: "active",
              suggestedAction: "Run a targeted Nuclei SQLi template scan against your authorized lab target."
            }
          }
        ]
      }
    ]
  },

  // LEVEL 8: COMPLETE API SECURITY & PENTESTING
  {
    id: "path-8",
    title: "Level 8: API Security & Penetration Testing",
    subtitle: "OWASP API Top 10, REST, GraphQL, BOLA/BFLA, JWT Flaws & Rate Limiting",
    level: "advanced",
    iconName: "Radio",
    category: "offensive",
    estimatedHours: 25,
    prerequisitePathIds: ["path-5", "path-7"],
    description: "Modern web applications are powered by APIs. Master testing REST, GraphQL, WebSockets, Broken Object Level Authorization (BOLA), Mass Assignment, and JWT token attacks.",
    modules: [
      {
        id: "mod-8-1",
        pathId: "path-8",
        title: "API Authorization & Logic Flaws",
        description: "BOLA, BFLA, and Mass Assignment in modern REST and GraphQL APIs.",
        iconName: "Key",
        lessons: [
          {
            id: "les-8-1-1",
            moduleId: "mod-8-1",
            pathId: "path-8",
            title: "Broken Object Level Authorization (BOLA / IDOR in APIs)",
            level: "advanced",
            estimatedMinutes: 35,
            objectives: [
              "Understand why BOLA is the #1 vulnerability on the OWASP API Security Top 10",
              "Detect object ID parameter tampering in RESTful endpoints (`/api/v1/orders/{id}`)",
              "Test multi-tenant isolation and verify server-side authorization gates",
              "Implement context-aware authorization policies in API gateways and controllers"
            ],
            prerequisites: ["Web Application Penetration Testing"],
            summary: "BOLA occurs when an API endpoint accepts an object identifier from the client request and accesses the database without verifying that the requesting user owns that object.",
            beginnerExplanation: "When you visit a coat check and hand over claim ticket #105, the attendant should check if that ticket really belongs to you. If you can just ask for coat #106 and the attendant hands it over without question, that is BOLA.",
            technicalDeepDive: "BOLA (CWE-639) stems from relying on the client-supplied ID in URLs (`GET /api/documents/8472`) without checking whether `document.tenant_id == current_user.tenant_id`. Because APIs often expose database auto-incrementing integer IDs or predictable UUIDs, attackers easily iterate IDs to exfiltrate private records across entire user bases.",
            diagramAscii: `BOLA / IDOR ATTACK SEQUENCE:
1. Legitimate Request: User A (ID: 55) views their invoice:
   GET /api/v1/invoices/1001 HTTP/1.1
   Authorization: Bearer <User_A_Token>
   Response: 200 OK -> Invoice 1001 Details

2. Tampered Request: User A substitutes User B's Invoice ID (1002):
   GET /api/v1/invoices/1002 HTTP/1.1
   Authorization: Bearer <User_A_Token>

3. Vulnerable API Logic:
   invoice = db.find(params[:id]) # Finds invoice 1002
   render json: invoice            # Returns User B's data! (BOLA FLaw)

4. Secure API Logic:
   invoice = current_user.invoices.find_by(id: params[:id])
   if !invoice: return 403 Forbidden!`,
            commonMistakes: [
              "Assuming complex UUIDs prevent BOLA (UUIDs prevent enumeration guessing, but do not enforce authorization)",
              "Relying on client-side UI hiding to prevent users from requesting other IDs",
              "Checking authentication (is the token valid?) but forgetting authorization (does the user own this record?)"
            ],
            authoritativeReferences: [
              { title: "OWASP API Security Top 10: API1:2023 Broken Object Level Authorization", url: "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/", isOfficial: true },
              { title: "PortSwigger Web Security Academy: Access Control & IDOR", url: "https://portswigger.net/web-security/access-control", isOfficial: false }
            ],
            quiz: {
              id: "quiz-8-1-1",
              lessonId: "les-8-1-1",
              title: "BOLA & API Authorization Knowledge Check",
              questions: [
                {
                  id: "q-8-1-1-1",
                  question: "Why does replacing an auto-incrementing integer ID with a random UUID not solve BOLA vulnerabilities?",
                  options: [
                    "UUIDs cannot be indexed in SQL databases",
                    "A UUID only makes guessing difficult; it does not verify whether the requesting user is authorized to access the object",
                    "UUIDs are easily decrypted using rainbow tables",
                    "Browsers do not support UUIDs in HTTP headers"
                  ],
                  correctIndex: 1,
                  explanation: "Obscurity is not authorization. If User A obtains User B's UUID (via shared links, logs, or other API endpoints), the server still fulfills the unauthorized request unless ownership validation is enforced."
                }
              ]
            },
            relatedVulnerabilityIds: ["vuln-idor", "vuln-bfla"]
          }
        ]
      }
    ]
  },

  // LEVEL 9: SYSTEMS, CLOUD & DEVSECOPS
  {
    id: "path-9",
    title: "Level 9: Cloud, Systems & DevSecOps",
    subtitle: "Active Directory, SIEM / SOC Monitoring, AWS/Azure IAM, Docker & CI/CD Pipelines",
    level: "advanced",
    iconName: "Cloud",
    category: "defensive",
    estimatedHours: 26,
    prerequisitePathIds: ["path-2", "path-4"],
    description: "Enterprise security spans cloud infrastructure and CI/CD pipelines. Learn Active Directory Kerberos tickets, SIEM log analysis, AWS IAM privilege escalation, and container security.",
    modules: [
      {
        id: "mod-9-1",
        pathId: "path-9",
        title: "Cloud & Container Security",
        description: "Hardening Docker containers, Kubernetes clusters, and AWS/Azure cloud IAM.",
        iconName: "Layers",
        lessons: [
          {
            id: "les-9-1-1",
            moduleId: "mod-9-1",
            pathId: "path-9",
            title: "Container Security, Docker Escapes & CI/CD SAST",
            level: "advanced",
            estimatedMinutes: 30,
            objectives: [
              "Understand Linux cgroups, namespaces, and Docker daemon security boundaries",
              "Identify high-risk container misconfigurations (`--privileged`, mounted docker.sock)",
              "Audit Dockerfile security practices (non-root users, multi-stage builds)",
              "Integrate automated vulnerability scanning (Trivy, Semgrep) into CI/CD pipelines"
            ],
            prerequisites: ["Linux Security Architecture", "Cybersecurity Fundamentals"],
            summary: "Containers share the host Linux kernel. Running containers with root or privileged capabilities allows attackers to escape into the underlying host operating system.",
            beginnerExplanation: "A container is like a rented hotel room. You have your own room with your own furniture, but you share the foundation and plumbing with the entire building. If the landlord accidentally gives you the master key (`--privileged`), you can break through the walls into other rooms.",
            technicalDeepDive: "Docker isolates processes using kernel Namespaces (PID, Mount, Net, IPC, UTS, User) and restricts resource usage via cgroups. If a container is launched with `--privileged` or with the host's `/var/run/docker.sock` mounted inside it, an attacker with shell access can communicate directly with the host Docker daemon to launch a new container that mounts the entire host root filesystem (`/`), resulting in immediate host compromise.",
            diagramAscii: `DOCKER SECURITY BOUNDARIES & CONTAINER ESCAPE:
+--------------------------------------------------------------+
| HOST LINUX OPERATING SYSTEM                                  |
|  - Host Kernel & Syscalls                                    |
|  - Host Docker Daemon (/var/run/docker.sock)                 |
|                                                              |
|  +----------------------------+  +------------------------+  |
|  | Normal Container (Sandbox) |  | Privileged Container   |  |
|  |  - Non-root User           |  |  - Root EUID           |  |
|  |  - Drops SYS_ADMIN cap     |  |  - Mounted docker.sock |  |
|  |  - Isolated Namespaces     |  |         |              |  |
|  +----------------------------+  +---------|--------------+  |
|                                            v                 |
|                   [ ATTACKER ESCAPES DIRECTLY TO HOST ]      |
+--------------------------------------------------------------+`,
            commonMistakes: [
              "Mounting `/var/run/docker.sock` inside public-facing web containers",
              "Running container processes as default `root` instead of defining a low-privilege `USER appuser`",
              "Storing API tokens or production database passwords in Dockerfile `ENV` directives"
            ],
            authoritativeReferences: [
              { title: "NIST SP 800-190: Application Container Security Guide", url: "https://csrc.nist.gov/publications/detail/sp/800-190/final", isOfficial: true },
              { title: "CIS Docker Community Edition Benchmark", url: "https://www.cisecurity.org/benchmark/docker", isOfficial: true }
            ],
            quiz: {
              id: "quiz-9-1-1",
              lessonId: "les-9-1-1",
              title: "Container Security Knowledge Check",
              questions: [
                {
                  id: "q-9-1-1-1",
                  question: "Why is mounting '/var/run/docker.sock' inside a web application container considered a critical security vulnerability?",
                  options: [
                    "It causes the web server to run out of disk space",
                    "It grants the container full administrative control over the host Docker daemon, allowing trivial host breakout",
                    "It disables HTTPS encryption",
                    "It forces all network traffic to bypass DNS"
                  ],
                  correctIndex: 1,
                  explanation: "Access to docker.sock allows any process inside the container to issue API commands to the host Docker daemon, including creating a container that mounts the host root drive."
                }
              ]
            }
          }
        ]
      }
    ]
  }
];
