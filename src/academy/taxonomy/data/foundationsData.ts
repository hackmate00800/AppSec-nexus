import { TaxonomyDomain } from "../types";

export const FOUNDATIONS_DOMAIN: TaxonomyDomain = {
  id: "domain-foundations",
  title: "Cybersecurity & Computing Foundations",
  shortName: "Foundations",
  description: "Core technical building blocks covering hardware architectures, operating system primitives, network protocols, programming scripting, and security risk models.",
  category: "foundations",
  iconName: "Cpu",
  isBeginnerRecommended: true,
  disciplines: [
    {
      id: "disc-computer-architecture",
      title: "Computer Systems & Hardware Architecture",
      description: "Low-level system mechanics, memory hierarchies, CPU execution pipelines, and boot firmware verification.",
      iconName: "HardDrive",
      phases: [
        {
          id: "phase-comp-arch",
          phaseNumber: 1,
          title: "Hardware Fundamentals & Storage",
          description: "Processor rings, registers, stack and heap memory, persistent storage controllers, and secure boot verification.",
          subPhases: [
            {
              id: "subphase-cpu-memory",
              title: "CPU Execution & Memory Management",
              description: "Instruction cycles, privilege rings (Ring 0 vs Ring 3), MMU virtual memory paging, and stack execution boundaries.",
              topics: [
                {
                  id: "topic-cpu-rings-memory",
                  title: "Processor Privilege Rings & Virtual Memory Paging",
                  description: "Understand the hardware separation between Kernel Mode (Ring 0) and User Mode (Ring 3), translation lookaside buffers, and memory protection bits.",
                  skillLevel: "beginner",
                  estimatedMinutes: 35,
                  technologies: ["x86-64", "ARM64", "MMU", "Virtual Memory"],
                  prerequisites: ["None - First entry point"],
                  learningObjectives: [
                    "Explain the hardware distinction between Ring 0 (kernel) and Ring 3 (user space)",
                    "Describe how the Memory Management Unit (MMU) translates virtual addresses to physical pages",
                    "Understand Data Execution Prevention (DEP / NX bit) at the silicon level"
                  ],
                  definition: "Processor privilege rings are hardware-enforced security boundaries that restrict what instructions a given thread of execution is permitted to execute, protecting kernel memory from user-space tampering.",
                  purpose: "Prevents untrusted applications and user processes from directly writing to hardware devices, reading arbitrary kernel memory, or executing privileged machine instructions.",
                  technicalFoundations: "Modern x86-64 and ARM processors implement hierarchical privilege levels. Operating system kernels run in Ring 0 (EL1 in ARM), allowing execution of sensitive instructions like CLI/STI, page table manipulation (CR3 register), and direct I/O port access. User applications execute in Ring 3 (EL0), having access only to their isolated virtual address space.",
                  typesAndSubtypes: [
                    { name: "Ring 0 (Supervisor/Kernel)", description: "Full execution permissions; manages device drivers, scheduler, and memory mappings." },
                    { name: "Ring 3 (User Land)", description: "Restricted execution; all hardware and cross-process access must transition via software interrupts (syscalls)." },
                    { name: "Ring -1 (Hypervisor / VMX Root)", description: "Hardware virtualization layer managing multiple guest operating systems." },
                    { name: "Ring -2 (System Management Mode - SMM)", description: "High-privilege firmware execution mode used by UEFI/BIOS." }
                  ],
                  architectureDataFlow: "User App (Ring 3) -> SYSCALL instruction -> CPU transitions to Ring 0 -> Kernel Interrupt Handler verifies pointers -> Hardware I/O executed -> SYSRET back to Ring 3.",
                  threatModel: "Attacker objective: Local Privilege Escalation (LPE) to transition execution control from Ring 3 to Ring 0 via kernel vulnerability or driver flaw.",
                  commonWeaknesses: [
                    "Kernel pointer disclosure in user-accessible logs or error messages",
                    "Missing page table isolation (KPTI) enabling side-channel speculative execution leaks (Meltdown/Spectre)",
                    "Insecure direct memory access (DMA) peripherals lacking IOMMU enforcement"
                  ],
                  defensiveControls: [
                    "Hardware Data Execution Prevention (DEP / NX bit)",
                    "Kernel Page Table Isolation (KPTI)",
                    "Supervisor Mode Execution Prevention (SMEP) and Supervisor Mode Access Prevention (SMAP)",
                    "IOMMU DMA protection for Thunderbolt and external expansion ports"
                  ],
                  assessmentMethodology: "Inspect kernel boot parameters and hardware security mitigations in system telemetry without executing destructive payloads.",
                  procedure: {
                    id: "proc-cpu-rings-audit",
                    title: "Auditing Hardware Memory Mitigations (DEP/KPTI/SMEP)",
                    summary: "Inspect host hardware memory protection flags using standard system utilities.",
                    prerequisites: ["Standard user terminal access on Linux or Windows"],
                    safetyPrecautions: ["Read-only telemetry commands; no system destabilization risk"],
                    scopeRequirements: ["Authorized local audit host"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Query CPU Security Features on Linux",
                        objective: "Verify hardware support for NX, SMEP, SMAP, and Meltdown/Spectre mitigations",
                        readOnly: true,
                        commandOrPayload: "grep -E 'nx|smep|smap|pti' /proc/cpuinfo | head -n 1",
                        explanation: "Reads hardware flags directly exposed by the CPUID instruction to the Linux kernel.",
                        expectedObservation: "Flags list containing 'nx', 'smep', 'smap', and 'pti'.",
                        evidenceCollection: "Capture output of cpuinfo flags and /sys/devices/system/cpu/vulnerabilities/."
                      },
                      {
                        stepNumber: 2,
                        title: "Query Data Execution Prevention (DEP) on Windows",
                        objective: "Check system-wide DEP status",
                        readOnly: true,
                        commandOrPayload: "powershell -Command \"Get-CimInstance Win32_OperatingSystem | Select-Object DataExecutionPrevention_SupportPolicy, DataExecutionPrevention_Available\"",
                        explanation: "Queries WMI for DEP policy (Policy 2 or 3 indicates OptOut or AlwaysOn protection).",
                        expectedObservation: "DataExecutionPrevention_Available = True, SupportPolicy = 2 or 3.",
                        evidenceCollection: "Save terminal transcript with timestamp."
                      }
                    ],
                    validationCriteria: "CPU flags confirm NX/DEP is enabled and enforcing non-executable stack and heap pages.",
                    falsePositiveAnalysis: "Virtual machines without hardware CPU pass-through may show virtualized or limited flag sets.",
                    severityAndImpact: {
                      severityLevel: "Medium",
                      businessImpact: "Absence of hardware memory mitigations simplifies buffer overflow exploitation and shellcode execution.",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "High"
                    },
                    remediation: {
                      summary: "Ensure DEP is set to AlwaysOn in boot configuration and enable Secure Boot in firmware.",
                      codeOrConfigExample: "bcdedit /set nx AlwaysOn",
                      language: "cmd",
                      defenseInDepth: [
                        "Compile applications with /NXCOMPAT and /DYNAMICBASE (ASLR)",
                        "Keep hypervisor and CPU microcode up to date to address architectural side channels"
                      ]
                    },
                    retestProcedure: {
                      steps: [
                        "Reboot host after configuration change",
                        "Re-execute step 2 PowerShell DEP verification command"
                      ],
                      passCondition: "DataExecutionPrevention_SupportPolicy reflects AlwaysOn (3).",
                      residualRiskNotes: "Return-Oriented Programming (ROP) can bypass DEP if ASLR is not concurrently enforced."
                    },
                    tools: ["grep", "procfs", "PowerShell", "Get-CimInstance"]
                  },
                  practicalExercises: [
                    "Run read-only inspection commands to verify if your current operating system enforces DEP/NX.",
                    "Review an explanation of how a stack buffer overflow attempts to jump into executable shellcode and why the NX bit halts it."
                  ],
                  assessment: {
                    id: "quiz-cpu-rings",
                    title: "Hardware Rings & Memory Architecture Quiz",
                    passingScorePercent: 100,
                    questions: [
                      {
                        id: "q1",
                        prompt: "What privilege ring do standard user applications execute in on x86 processors?",
                        options: ["Ring 0", "Ring 1", "Ring 2", "Ring 3"],
                        correctIndex: 3,
                        explanation: "User-space applications run in Ring 3 (least privileged), while the operating system kernel runs in Ring 0."
                      },
                      {
                        id: "q2",
                        prompt: "What security guarantee is provided by the CPU NX (No-eXecute) / DEP bit?",
                        options: [
                          "It encrypts RAM during sleep mode",
                          "It prevents CPU instructions from executing inside data-marked memory pages like stack or heap",
                          "It prevents users from deleting system files",
                          "It forces SSL certificate validation on all sockets"
                        ],
                        correctIndex: 1,
                        explanation: "The NX bit marks memory pages as non-executable so data buffers cannot be executed as CPU instructions."
                      }
                    ]
                  },
                  references: [
                    { title: "Intel 64 and IA-32 Architectures Software Developer's Manual", url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html", publisher: "Standard", isOfficial: true },
                    { title: "NIST SP 800-147: BIOS Protection Guidelines", url: "https://csrc.nist.gov/publications/detail/sp/800-147/final", publisher: "NIST", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            },
            {
              id: "subphase-boot-uefi",
              title: "Firmware, Boot Chain & UEFI Security",
              description: "BIOS/UEFI architecture, Secure Boot signature verification, and Trusted Platform Module (TPM 2.0) measured boot.",
              topics: [
                {
                  id: "topic-secure-boot-tpm",
                  title: "UEFI Secure Boot, Platform Trust & Measured Boot",
                  description: "How cryptographic signatures verify bootloader integrity from the hardware Root of Trust through the kernel.",
                  skillLevel: "beginner",
                  estimatedMinutes: 30,
                  technologies: ["UEFI", "Secure Boot", "TPM 2.0", "PCR Registers"],
                  prerequisites: ["topic-cpu-rings-memory"],
                  learningObjectives: [
                    "Explain the cryptographic chain of trust from ROM to Kernel",
                    "Understand the role of KEK, PK, and DB/DBX key databases in UEFI",
                    "Describe how TPM Platform Configuration Registers (PCRs) provide measured boot attestation"
                  ],
                  definition: "Secure Boot is a UEFI protocol standard that validates digital signatures on bootloaders, kernel images, and Option ROMs against trusted hardware-stored platform keys before allowing execution.",
                  purpose: "Prevents rootkits and bootkits from loading before the operating system kernel and subverting security controls.",
                  technicalFoundations: "At power-on, the processor executes code from immutable hardware ROM. The Platform Key (PK) establishes ownership. Key Exchange Keys (KEK) authorize updates to the Signature Database (DB) and Forbidden Database (DBX). Only binaries signed with a certificate in DB (and not in DBX) are permitted to execute.",
                  typesAndSubtypes: [
                    { name: "Platform Key (PK)", description: "Root authority established by hardware OEM." },
                    { name: "Key Exchange Key (KEK)", description: "Used to sign updates to DB and DBX." },
                    { name: "Allowed Database (DB)", description: "Whitelisted signing certificates for bootloaders and drivers." },
                    { name: "Revocation Database (DBX)", description: "Blacklist of revoked keys and compromised bootloader hashes." }
                  ],
                  threatModel: "Threat: Bootkit installation in Master Boot Record (MBR) or EFI system partition to hijack system before kernel init.",
                  commonWeaknesses: [
                    "Outdated DBX database failing to revoke vulnerable shim bootloaders (e.g., BootHole CVE-2020-10713)",
                    "Secure Boot disabled in BIOS configuration to allow unsigned legacy diagnostic tools",
                    "Default OEM manufacturing keys left in setup mode"
                  ],
                  defensiveControls: [
                    "Enforce UEFI Secure Boot in firmware settings",
                    "Set BIOS/UEFI administrative supervisor password",
                    "Regularly apply OS-delivered DBX revocation updates via Windows Update or fwupd on Linux"
                  ],
                  assessmentMethodology: "Query firmware security status through operating system APIs without modifying hardware NVRAM.",
                  procedure: {
                    id: "proc-secure-boot-check",
                    title: "Verifying Secure Boot & TPM Status",
                    summary: "Inspect Secure Boot state and TPM PCR measurements using native administrative commands.",
                    prerequisites: ["Read access to system firmware status"],
                    safetyPrecautions: ["Non-invasive check; will not alter NVRAM"],
                    scopeRequirements: ["Local managed host"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Query Secure Boot on Windows",
                        objective: "Verify Secure Boot is deployed and active",
                        readOnly: true,
                        commandOrPayload: "powershell -Command \"Confirm-SecureBootUEFI\"",
                        explanation: "Returns True if Secure Boot is active and enforcing signature verification.",
                        expectedObservation: "True",
                        evidenceCollection: "Record command output and system manufacturer info."
                      },
                      {
                        stepNumber: 2,
                        title: "Query Secure Boot on Linux",
                        objective: "Inspect EFI boot state",
                        readOnly: true,
                        commandOrPayload: "mokutil --sb-state 2>/dev/null || bootctl status | grep 'Secure Boot'",
                        explanation: "Inspects Machine Owner Key (MOK) and systemd-boot status for Secure Boot enforcement.",
                        expectedObservation: "SecureBoot enabled",
                        evidenceCollection: "Terminal output capture."
                      }
                    ],
                    validationCriteria: "System reports Secure Boot is enabled and active.",
                    falsePositiveAnalysis: "Legacy BIOS boot mode returns an error as UEFI is not present.",
                    severityAndImpact: {
                      severityLevel: "High",
                      businessImpact: "Disabled Secure Boot enables persistent kernel rootkits that survive operating system reinstallation.",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "High"
                    },
                    remediation: {
                      summary: "Enter UEFI firmware setup, enable Secure Boot mode, and set a BIOS supervisor password.",
                      codeOrConfigExample: "Enable 'Secure Boot' -> Select 'Standard Mode' -> Save & Exit",
                      defenseInDepth: [
                        "Enable BitLocker / LUKS full-disk encryption bound to TPM 2.0 PCR registers 7 and 11"
                      ]
                    },
                    retestProcedure: {
                      steps: ["Re-run Confirm-SecureBootUEFI or mokutil --sb-state"],
                      passCondition: "Output confirms Secure Boot is True/enabled.",
                      residualRiskNotes: "Physical access with direct flash programmer can bypass firmware passwords if chip is unshielded."
                    },
                    tools: ["Confirm-SecureBootUEFI", "mokutil", "bootctl"]
                  },
                  references: [
                    { title: "UEFI Specification v2.10", url: "https://uefi.org/specifications", publisher: "Standard", isOfficial: true },
                    { title: "NIST SP 800-155: BIOS Integrity Measurement Guidelines", url: "https://csrc.nist.gov/publications/detail/sp/800-155/final", publisher: "NIST", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "disc-networking-foundations",
      title: "Networking Foundations & Architecture",
      description: "OSI and TCP/IP protocol stacks, addressing, routing, domain resolution, transport encryption, and packet inspection.",
      iconName: "Network",
      phases: [
        {
          id: "phase-network-models",
          phaseNumber: 1,
          title: "Network Models & Addressing",
          description: "OSI 7-layer reference model, TCP/IP 4-layer suite, IP addressing, subnet masking, and ARP resolution.",
          subPhases: [
            {
              id: "subphase-osi-tcpip",
              title: "OSI vs. TCP/IP Architecture",
              description: "Encapsulation, protocol data units (PDUs), headers, and layer-by-layer security controls.",
              topics: [
                {
                  id: "topic-osi-model",
                  title: "The 7-Layer OSI Model & Encapsulation Security",
                  description: "Examine Physical, Data Link, Network, Transport, Session, Presentation, and Application layers and their specific security threat vectors.",
                  skillLevel: "beginner",
                  estimatedMinutes: 30,
                  technologies: ["OSI", "TCP/IP", "Ethernet", "IP", "TCP", "TLS", "HTTP"],
                  prerequisites: ["None"],
                  learningObjectives: [
                    "Map network protocols to their respective OSI layers",
                    "Understand how data encapsulation adds headers at each layer",
                    "Identify layer-specific security attacks (e.g. ARP spoofing at Layer 2 vs SQL injection at Layer 7)"
                  ],
                  definition: "The Open Systems Interconnection (OSI) model is a conceptual framework that standardizes the communication functions of a telecommunication or computing system into seven abstraction layers.",
                  purpose: "Provides a common mental and architectural model for designing interoperable network protocols, understanding encapsulation, and isolating security failures.",
                  technicalFoundations: "Data starts at Layer 7 (Application) as raw payload, is serialized and formatted at Layer 6 (Presentation), coordinated at Layer 5 (Session), segmented with port headers at Layer 4 (Transport), packetized with IP addresses at Layer 3 (Network), framed with MAC addresses at Layer 2 (Data Link), and encoded into electrical/optical pulses at Layer 1 (Physical).",
                  typesAndSubtypes: [
                    { name: "Layer 7 (Application)", description: "HTTP, DNS, SSH, TLS, SMTP - vulnerable to injection, XSS, and logic abuse." },
                    { name: "Layer 4 (Transport)", description: "TCP, UDP - vulnerable to SYN floods, reset attacks, and port scanning." },
                    { name: "Layer 3 (Network)", description: "IP, ICMP, BGP - vulnerable to IP spoofing, routing hijacking, and ping-of-death." },
                    { name: "Layer 2 (Data Link)", description: "Ethernet, ARP, MAC, VLAN - vulnerable to ARP poisoning and MAC flooding." }
                  ],
                  architectureDataFlow: "Data -> [TCP Hdr + Data] -> [IP Hdr + TCP Hdr + Data] -> [Ethernet Hdr + IP + TCP + Data + FCS].",
                  threatModel: "Attacker identifies weakest layer to achieve unauthorized access or disrupt availability.",
                  commonWeaknesses: [
                    "Assuming upper-layer TLS protects against Layer 2/3 traffic analysis or metadata leakage",
                    "Failing to implement defense-in-depth across multiple layers simultaneously"
                  ],
                  defensiveControls: [
                    "Layer 2: 802.1X Port Security, Dynamic ARP Inspection (DAI), DHCP Snooping",
                    "Layer 3: Network segmentation, stateful firewall rules, anti-spoofing egress filters (BCP 38)",
                    "Layer 4: State-tracking firewalls, TCP SYN cookies",
                    "Layer 7: Web Application Firewalls (WAF), mutual TLS (mTLS), strict input validation"
                  ],
                  assessmentMethodology: "Analyze protocol capture files to verify which headers are exposed in cleartext versus encrypted.",
                  procedure: {
                    id: "proc-inspect-pdu-encapsulation",
                    title: "Inspecting Protocol Encapsulation with Wireshark/tshark",
                    summary: "Capture a test DNS/HTTP request and inspect the nested protocol headers from Layer 2 to Layer 7.",
                    prerequisites: ["Wireshark or tshark installed in authorized test lab"],
                    safetyPrecautions: ["Only capture traffic on permitted local interface"],
                    scopeRequirements: ["Local loopback or lab network interface"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Capture DNS query packet",
                        objective: "Capture standard DNS lookup to observe protocol headers",
                        readOnly: true,
                        commandOrPayload: "tshark -i any -c 2 -f \"udp port 53\" -V",
                        explanation: "Captures 2 packets of DNS traffic and prints full vertical protocol tree decode.",
                        expectedObservation: "Decoded Frame (L1) -> Ethernet II (L2) -> Internet Protocol Version 4 (L3) -> User Datagram Protocol (L4) -> Domain Name System (L7).",
                        evidenceCollection: "Save pcap file or text decode."
                      }
                    ],
                    validationCriteria: "Each protocol layer header is visible with distinct source/destination fields.",
                    falsePositiveAnalysis: "Encrypted packets (like TLS on port 443) will conceal Layer 5-7 payload contents.",
                    severityAndImpact: {
                      severityLevel: "Info",
                      businessImpact: "Foundational knowledge required for network monitoring and vulnerability detection.",
                      confidentiality: "None",
                      integrity: "None",
                      availability: "None"
                    },
                    remediation: {
                      summary: "Ensure end-to-end transport encryption (HTTPS / TLS 1.3 / DNS-over-HTTPS) is enforced to protect payload privacy.",
                      defenseInDepth: ["Adopt Zero Trust network architecture assuming perimeter traffic is visible"]
                    },
                    retestProcedure: {
                      steps: ["Re-capture traffic after enabling TLS"],
                      passCondition: "Layer 7 payloads are replaced with opaque Application Data frames.",
                      residualRiskNotes: "Server Name Indication (SNI) and IP headers remain visible unless Encrypted Client Hello (ECH) is deployed."
                    },
                    tools: ["tshark", "Wireshark", "tcpdump"]
                  },
                  references: [
                    { title: "ISO/IEC 7498-1: Information technology — Open Systems Interconnection", url: "https://www.iso.org/standard/20269.html", publisher: "Standard", isOfficial: true },
                    { title: "RFC 1122: Requirements for Internet Hosts — Communication Layers", url: "https://datatracker.ietf.org/doc/html/rfc1122", publisher: "RFC", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "disc-security-foundations",
      title: "Security Principles, Threat Modeling & Ethics",
      description: "Core security definitions (CIA triad), defense-in-depth, least privilege, threat modeling (STRIDE), and authorized rules of engagement.",
      iconName: "Shield",
      phases: [
        {
          id: "phase-sec-principles",
          phaseNumber: 1,
          title: "Foundational Security Principles",
          description: "Confidentiality, integrity, availability, authentication, authorization, non-repudiation, and threat modeling frameworks.",
          subPhases: [
            {
              id: "subphase-cia-threat-modeling",
              title: "The CIA Triad & Threat Modeling",
              description: "Balance security goals and systematically identify architecture flaws using STRIDE and DREAD.",
              topics: [
                {
                  id: "topic-stride-threat-modeling",
                  title: "STRIDE Threat Modeling & Risk Formulation",
                  description: "Deconstruct an application architecture to evaluate Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege.",
                  skillLevel: "beginner",
                  estimatedMinutes: 40,
                  technologies: ["STRIDE", "Data Flow Diagrams (DFD)", "Trust Boundaries"],
                  prerequisites: ["topic-osi-model"],
                  learningObjectives: [
                    "Explain all 6 elements of the STRIDE threat modeling framework",
                    "Draw data flow diagrams with distinct trust boundaries",
                    "Map threat categories to corresponding security controls"
                  ],
                  definition: "Threat modeling is a structured engineering process for identifying potential security threats and vulnerabilities, quantifying risk, and selecting targeted mitigations during software design.",
                  purpose: "Fixes architectural flaws early in the software development lifecycle before code is deployed to production, reducing remediation costs by up to 80%.",
                  technicalFoundations: "STRIDE categorizes security threats against architectural components: Spoofing violates Authentication; Tampering violates Integrity; Repudiation violates Non-Repudiation; Information Disclosure violates Confidentiality; Denial of Service violates Availability; Elevation of Privilege violates Authorization.",
                  typesAndSubtypes: [
                    { name: "S - Spoofing Identity", description: "Impersonating an authorized user, process, or server (e.g. session hijacking)." },
                    { name: "T - Tampering with Data", description: "Modifying data in transit or storage without authorization (e.g. SQL injection)." },
                    { name: "R - Repudiation", description: "Claiming an action was not performed due to inadequate audit trails." },
                    { name: "I - Information Disclosure", description: "Leaking sensitive data to unauthorized parties (e.g. exposed API credentials)." },
                    { name: "D - Denial of Service", description: "Exhausting system resources to prevent legitimate users from accessing services." },
                    { name: "E - Elevation of Privilege", description: "Gaining unauthorized permissions (e.g. user becoming admin via BOLA or LPE)." }
                  ],
                  threatModel: "Threat modeling itself produces the primary threat model for an application by mapping threats across trust boundaries.",
                  commonWeaknesses: [
                    "Failing to draw clear trust boundaries between public internet and internal microservices",
                    "Treating internal network traffic as implicitly trusted"
                  ],
                  defensiveControls: [
                    "Spoofing -> Multi-Factor Authentication (MFA), digital signatures",
                    "Tampering -> Message Authentication Codes (HMAC), database constraints",
                    "Repudiation -> Tamper-resistant append-only logging (SIEM)",
                    "Information Disclosure -> TLS 1.3, AES-256-GCM encryption at rest",
                    "Denial of Service -> Rate limiting, autoscaling, caching, DDoS protection",
                    "Elevation of Privilege -> Least privilege, robust role-based access control (RBAC)"
                  ],
                  assessmentMethodology: "Review system architecture diagrams and trace every data flow crossing a trust boundary.",
                  references: [
                    { title: "OWASP Threat Modeling Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html", publisher: "OWASP", isOfficial: true },
                    { title: "NIST SP 800-160: Systems Security Engineering", url: "https://csrc.nist.gov/publications/detail/sp/800-160/vol-1-rev-1/final", publisher: "NIST", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
