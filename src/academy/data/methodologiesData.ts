import { MethodologyFramework } from "../types";

export const METHODOLOGIES_DATA: MethodologyFramework[] = [
  // 1. OWASP WSTG
  {
    id: "meth-wstg",
    name: "OWASP Web Security Testing Guide (WSTG v4.2)",
    organization: "OWASP (Open Worldwide Application Security Project)",
    version: "v4.2 (Latest Community Edition)",
    purpose: "The premier cybersecurity testing guide for web application security professionals, providing a structured, repeatable framework of 90+ comprehensive test cases.",
    whenToUse: "Use during formal Web Application Penetration Tests, gray-box application assessments, code-assisted pentesting, and recurring web vulnerability verification prior to production deployments.",
    prerequisites: [
      "HTTP protocol mastery (headers, cookies, verbs, response codes)",
      "Web browser developer tools and intercepting proxy operation (ZAP/Burp)",
      "Understanding of web application architecture (client, API, database)"
    ],
    scopeAndLimitations: "Covers black-box, gray-box, and white-box web application penetration testing. Does not deeply cover low-level network packet analysis or binary firmware reverse engineering.",
    inputs: [
      "Authorized target domain/URL and in-scope API endpoints",
      "Test accounts across all functional roles (low privilege, high privilege)",
      "Architecture documentation and API specifications (OpenAPI/Swagger if available)"
    ],
    expectedOutputs: [
      "Comprehensive test case execution matrix (WSTG IDs tested)",
      "Validated vulnerability findings with reproduction steps and HTTP traffic logs",
      "Executive summary of risk posture and prioritized technical remediation guidance"
    ],
    limitations: [
      "Does not replace automated continuous regression scanning in CI/CD",
      "Testing depth depends heavily on tester skill and allotted testing time window",
      "Blind automated execution without business context yields false positives"
    ],
    practicalExample: "Testing WSTG-ATHZ-02 (Bypassing Authorization Schema): An auditor logs in as User A, captures request `GET /api/v1/invoices/9924`, changes the session cookie to User B, and tests if the invoice can still be accessed, identifying Broken Object Level Authorization.",
    reportingRequirements: [
      "Mapping of each finding to its official WSTG Category and ID (e.g. WSTG-INPV-01)",
      "Detailed step-by-step reproduction instructions with curl commands or request/response dumps",
      "CVSS v3.1 vector calculation with base and environmental metric justification",
      "Actionable source-code or configuration remediation advice"
    ],
    relatedStandards: [
      "OWASP Top 10:2021",
      "OWASP ASVS v4.0.3",
      "NIST SP 800-115 (Technical Guide to Information Security Testing)",
      "CWE/SANS Top 25"
    ],
    corePhases: [
      {
        phaseNumber: 1,
        title: "Information Gathering (WSTG-INFO)",
        description: "Conduct search engine discovery, web server fingerprinting, metafile analysis (robots.txt, sitemaps), and application architecture mapping.",
        deliverables: ["Asset inventory", "Technology stack report", "Exposed sensitive files catalog"],
        activities: ["Spidering public endpoints", "Extracting hidden comments", "Mapping cloud buckets and CDNs"],
        toolsUsed: ["httpx", "Nuclei", "Nmap", "AppSec Nexus Crawler"]
      },
      {
        phaseNumber: 2,
        title: "Configuration & Deployment Management Testing (WSTG-CONF)",
        description: "Audit network infrastructure, default credentials, HTTP security headers, subdomains, and cloud storage bucket permissions.",
        deliverables: ["Security header scorecard", "Misconfiguration matrix", "TLS cipher audit"],
        activities: ["Reviewing HSTS/CSP/XFO headers", "Checking admin portal exposures", "Testing directory indexing"],
        toolsUsed: ["AppSec Nexus Header Scanner", "testssl.sh", "curl"]
      },
      {
        phaseNumber: 3,
        title: "Identity & Authentication Testing (WSTG-ATHN)",
        description: "Test password strength requirements, account lockout mechanisms, MFA bypasses, remember-me functionality, and password resets.",
        deliverables: ["Brute-force risk assessment", "MFA validation report", "Credential stuffing resistance"],
        activities: ["Testing password reset token predictability", "Verifying rate limiting on /login", "Testing MFA parameter manipulation"],
        toolsUsed: ["Burp Suite Intruder", "OWASP ZAP Fuzzer", "Custom Python scripts"]
      },
      {
        phaseNumber: 4,
        title: "Authorization Testing (WSTG-ATHZ)",
        description: "Audit role-based access control (RBAC), directory traversal, horizontal/vertical privilege escalation, and BOLA/IDOR flaws.",
        deliverables: ["Access control matrix", "Privilege escalation proof-of-concept logs"],
        activities: ["Testing parameter tampering on object IDs", "Forced browsing to administrative URLs", "Testing HTTP method replacement (GET vs POST)"],
        toolsUsed: ["Burp Suite Match/Replace", "Postman", "AppSec Nexus API Auditor"]
      },
      {
        phaseNumber: 5,
        title: "Data Validation & Injection Testing (WSTG-INPV)",
        description: "Execute deep validation against SQLi, XSS, Command Injection, SSRF, XML External Entities (XXE), and Template Injection.",
        deliverables: ["Verified injection findings", "Contextual remediation code snippets"],
        activities: ["Injecting non-destructive syntax error probes", "Testing polyglot payloads", "Observing time delays and out-of-band interactions"],
        toolsUsed: ["sqlmap", "AppSec Nexus Injection Scanner", "Interactsh"]
      }
    ],
    officialUrl: "https://owasp.org/www-project-web-security-testing-guide/"
  },

  // 2. OWASP ASVS
  {
    id: "meth-asvs",
    name: "OWASP Application Security Verification Standard (ASVS v4.0.3)",
    organization: "OWASP",
    version: "v4.0.3",
    purpose: "Provides a basis for testing web application technical security controls and provides developers with a list of requirements for secure development across 3 rigorous assurance levels.",
    whenToUse: "Use as a blueprint for secure system design, procurement verification criteria, vendor security evaluation, and white-box security verification audits.",
    prerequisites: [
      "Access to application source code and deployment manifests",
      "Software architecture diagrams and threat models",
      "Understanding of secure coding principles across the application's runtime language"
    ],
    scopeAndLimitations: "Focuses on application-level technical controls and secure architecture rather than physical facility security or endpoint workstation hygiene.",
    inputs: [
      "Full source code repository and dependency locks",
      "Authentication and cryptographic architecture documentation",
      "Role-based access matrix and business data classification"
    ],
    expectedOutputs: [
      "ASVS Level 1/2/3 Verification Checklist with pass/fail evidence",
      "Gap analysis detailing missing defensive architectural controls",
      "Engineering remediation backlog for development sprint integration"
    ],
    limitations: [
      "Level 2 and Level 3 require white-box access; cannot be fulfilled solely via black-box network scans",
      "Requires substantial engineering time to verify all 286 individual requirements"
    ],
    practicalExample: "Auditing ASVS V2.1.1 (Verify that user passwords are submitted to the server over an encrypted channel): Reviewing application code to ensure TLS 1.3 is enforced on the login route and checking that passwords are never logged in application or web server logs.",
    reportingRequirements: [
      "Formal declaration of the targeted ASVS Assurance Level (Level 1, 2, or 3)",
      "Section-by-section audit report covering all 14 ASVS chapters (V1 Architecture to V14 Configuration)",
      "Specific line-of-code citations or configuration files demonstrating verification compliance"
    ],
    relatedStandards: [
      "OWASP WSTG v4.2",
      "ISO/IEC 27001 / 27034 (Application Security)",
      "PCI-DSS v4.0 Requirement 6.4",
      "NIST SP 800-53 (Security and Privacy Controls)"
    ],
    corePhases: [
      {
        phaseNumber: 1,
        title: "Level 1: Opportunistic (Basic Applications)",
        description: "Covers the bare minimum security requirements against common, automated threats. Fully black-box testable without source code access.",
        deliverables: ["Level 1 Compliance Checklist", "Automated baseline verification"],
        activities: ["Verifying HTTP security headers", "Auditing cookie security flags", "Testing basic input sanitization"],
        toolsUsed: ["AppSec Nexus Passive Scanner", "Nuclei Baseline", "OWASP ZAP"]
      },
      {
        phaseNumber: 2,
        title: "Level 2: Standard (Applications with Sensitive Data)",
        description: "Recommended for applications processing business transactions, PII, healthcare records, or sensitive financial data. Requires code access.",
        deliverables: ["Architecture threat model", "Access control validation", "Cryptographic key audit"],
        activities: ["Reviewing password hashing algorithms (Argon2id/bcrypt)", "Auditing JWT token validation logic", "Validating parameterized SQL queries"],
        toolsUsed: ["Semgrep SAST", "AppSec Nexus Host Auditor", "SonarQube"]
      },
      {
        phaseNumber: 3,
        title: "Level 3: Advanced (High Assurance & Critical Assets)",
        description: "Reserved for military, banking, medical life-support, or critical national infrastructure applications where compromise causes severe harm.",
        deliverables: ["Formal verification report", "Zero-trust enclave audit", "Fail-safe integrity proof"],
        activities: ["Auditing microservice mutual TLS (mTLS)", "Verifying hardware security module (HSM) integration", "Simulating Byzantine fault conditions"],
        toolsUsed: ["Formal Verification Analyzers", "Static Binary Analysis", "Memory Sanitizers"]
      }
    ],
    officialUrl: "https://owasp.org/www-project-application-security-verification-standard/"
  },

  // 3. PTES
  {
    id: "meth-ptes",
    name: "Penetration Testing Execution Standard (PTES)",
    organization: "PTES Working Group",
    version: "v1.0 Standard",
    purpose: "Defines a complete, structured baseline for penetration testing engagements, ensuring consistent quality, communication, and actionable technical findings.",
    whenToUse: "Use for commercial penetration testing engagements, red team exercises, external vulnerability assessments, and scoping client contracts.",
    prerequisites: [
      "Legal engagement contract and signed Authorization / Rules of Engagement (RoE)",
      "Clear communication channels with target organization's incident response point-of-contact",
      "Controlled offensive testing toolkit"
    ],
    scopeAndLimitations: "A methodology for professional services delivery rather than a specific tool implementation. Covers the complete operational lifecycle from scoping to debrief.",
    inputs: [
      "Client scoping questionnaire and signed Statement of Work (SOW)",
      "In-scope IP address ranges, domain names, and excluded targets",
      "Designated emergency escalation contacts"
    ],
    expectedOutputs: [
      "Formal Penetration Testing Report with Executive Summary and Technical Findings",
      "Risk assessment matrix with CVSS calculations",
      "Raw evidence archives and cleaned testing artifacts"
    ],
    limitations: [
      "Time-bounded engagement model may not reflect continuous advanced persistent threat (APT) dwell times",
      "Restricted rules of engagement often preclude high-impact disruptive tests (e.g. DoS testing)"
    ],
    practicalExample: "Executing the Intelligence Gathering phase: Passive OSINT collects subdomains and mail server IPs, followed by controlled active scanning with Nmap to discover open ports, without exceeding client-approved rate limits.",
    reportingRequirements: [
      "Executive Summary: high-level business risks, overall posture score, and strategic investments needed",
      "Technical Findings: vulnerability title, severity, CVSS vector, detailed walkthrough, and proof-of-concept evidence",
      "Remediation Guidance: immediate quick-fixes vs strategic long-term architectural upgrades"
    ],
    relatedStandards: [
      "NIST SP 800-115",
      "OWASP WSTG v4.2",
      "OSSTMM (Open Source Security Testing Methodology Manual)",
      "CREST Penetration Testing Framework"
    ],
    corePhases: [
      {
        phaseNumber: 1,
        title: "Pre-engagement Interactions",
        description: "Define scope, testing windows, emergency contacts, rules of engagement (RoE), and non-disclosure agreements.",
        deliverables: ["Signed Scoping Document", "Rules of Engagement (RoE) Agreement"],
        activities: ["Scoping meeting with stakeholders", "Establishing out-of-scope boundaries", "Agreeing on IP whitelisting"],
        toolsUsed: ["Legal Contracts", "PGP Encrypted Communication"]
      },
      {
        phaseNumber: 2,
        title: "Intelligence Gathering",
        description: "Perform passive OSINT, public DNS reconnaissance, certificate transparency logs, and social footprint mapping.",
        deliverables: ["Attack surface map", "Discovered host list"],
        activities: ["Certificate transparency log scraping", "DNS brute-forcing", "Technology stack enumeration"],
        toolsUsed: ["httpx", "Sublist3r", "Amass", "theHarvester"]
      },
      {
        phaseNumber: 3,
        title: "Threat Modeling",
        description: "Identify high-value business assets, determine likely adversary motivations, and formulate specific attack path hypotheses.",
        deliverables: ["Threat model diagram", "Target prioritized vectors"],
        activities: ["Asset criticality ranking", "Attacker capability profiling", "Attack tree generation"],
        toolsUsed: ["AppSec Nexus Flowcharts", "STRIDE Modeling Worksheets"]
      },
      {
        phaseNumber: 4,
        title: "Vulnerability Analysis",
        description: "Combine automated scans with extensive manual analysis to discover security weaknesses in applications and systems.",
        deliverables: ["Validated vulnerability register", "False-positive filter log"],
        activities: ["Automated vulnerability probing", "Manual endpoint parameter fuzzing", "Logic flaw inspection"],
        toolsUsed: ["Nuclei", "Nmap", "OWASP ZAP", "AppSec Nexus Scanners"]
      },
      {
        phaseNumber: 5,
        title: "Exploitation & Controlled PoC",
        description: "Execute controlled proofs of concept to verify that flaws are genuinely exploitable without causing denial of service.",
        deliverables: ["Evidence screenshots", "HTTP request/response logs"],
        activities: ["Crafting benign SQL queries (`AND 1=1`)", "Demonstrating authenticated session hijacking", "Validating IDOR boundaries"],
        toolsUsed: ["Burp Suite Repeater", "curl", "Custom Python PoCs"]
      },
      {
        phaseNumber: 6,
        title: "Reporting & Remediation Guidance",
        description: "Author an executive summary for leadership alongside technical remediation steps for development teams.",
        deliverables: ["Executive Summary Report", "Technical Remediation Guide"],
        activities: ["CVSS scoring", "Drafting step-by-step fix guides", "Presenting findings in debrief call"],
        toolsUsed: ["Markdown / PDF Report Generators", "AppSec Nexus Finding Exporter"]
      }
    ],
    officialUrl: "http://www.pentest-standard.org/"
  },

  // 4. MITRE ATT&CK
  {
    id: "meth-mitre",
    name: "MITRE ATT&CK Framework (Enterprise)",
    organization: "The MITRE Corporation",
    version: "v15 Enterprise Matrix",
    purpose: "A globally accessible knowledge base of adversary tactics, techniques, and procedures (TTPs) based on real-world threat observations.",
    whenToUse: "Use for SOC detection engineering, threat hunting, red-team adversary emulation, purple-teaming exercises, and gap analysis in security monitoring.",
    prerequisites: [
      "Understanding of modern operating system internals (Windows APIs, Linux syscalls)",
      "Familiarity with enterprise logging architectures (Sysmon, Windows Event Logs, auditd)",
      "Foundational networking knowledge (TCP/IP, DNS, SMB, TLS)"
    ],
    scopeAndLimitations: "Documents known adversary behaviors observed in the wild. Not a step-by-step testing methodology, but an empirical taxonomy and knowledge base.",
    inputs: [
      "Endpoint and network telemetry logs",
      "Threat intelligence reports regarding specific threat actor groups (e.g. APT29, FIN7)",
      "SIEM detection rules and EDR alert profiles"
    ],
    expectedOutputs: [
      "ATT&CK Navigator Coverage Heatmap",
      "Detection Gap Analysis identifying unmonitored adversary techniques",
      "Emulation playbooks for red/blue collaboration"
    ],
    limitations: [
      "Matrix is massive (hundreds of techniques); attempting 100% coverage simultaneously is impractical",
      "Techniques evolve as adversaries adapt to detection rules"
    ],
    practicalExample: "Simulating T1059.001 (Command and Scripting Interpreter: PowerShell): Testing whether encoded PowerShell commands (`powershell.exe -enc ...`) executed on a workstation trigger an EDR alert or are logged by Script Block Logging (Event ID 4104).",
    reportingRequirements: [
      "Mapping of observed activities to MITRE ATT&CK Tactic (TAxxxx) and Technique (Txxxx) IDs",
      "Analysis of which techniques were detected by existing controls and which bypassed detection",
      "Specific Sigma or Yara detection rules provided for remediation"
    ],
    relatedStandards: [
      "MITRE D3FEND (Matrix of Defensive Countermeasures)",
      "NIST SP 800-53",
      "CIS Critical Security Controls (CIS Controls v8)"
    ],
    corePhases: [
      {
        phaseNumber: 1,
        title: "Initial Access (TA0001)",
        description: "Techniques used to gain an initial foothold inside a network (e.g. Exploit Public-Facing Application T1190, Phishing T1566).",
        deliverables: ["Perimeter defense audit", "External exposure mapping"],
        activities: ["Auditing web server attack surface", "Simulating spearphishing attachments in sandbox"],
        toolsUsed: ["Nuclei", "httpx", "AppSec Nexus Host Auditor"]
      },
      {
        phaseNumber: 2,
        title: "Execution (TA0002)",
        description: "Techniques that result in adversary-controlled code running on a local or remote system (e.g. Command and Scripting Interpreter T1059).",
        deliverables: ["Process creation telemetry", "Script execution policy check"],
        activities: ["Testing PowerShell Constrained Language Mode", "Testing WMI execution detection"],
        toolsUsed: ["Sysmon", "Windows Event Viewer", "Atomic Red Team"]
      },
      {
        phaseNumber: 3,
        title: "Persistence & Privilege Escalation (TA0003 & TA0004)",
        description: "Techniques adversaries use to maintain their presence and gain higher-level permissions (e.g. SUID T1548.001, Unquoted Service Path T1574.009).",
        deliverables: ["Privileged account audit", "Host misconfiguration alerts"],
        activities: ["Auditing Windows services for writeable paths", "Checking Linux cron jobs and sudoers configuration"],
        toolsUsed: ["AppSec Nexus Windows Auditor", "WinPEAS", "LinPEAS"]
      },
      {
        phaseNumber: 4,
        title: "Exfiltration (TA0010)",
        description: "Techniques used to steal and package data from the target network (e.g. Exfiltration Over Web Service T1567).",
        deliverables: ["Egress firewall rule validation", "Data loss prevention telemetry"],
        activities: ["Testing encrypted HTTPS outbound uploads", "Auditing DNS tunneling detection"],
        toolsUsed: ["Wireshark", "Zeek", "Suricata"]
      }
    ],
    officialUrl: "https://attack.mitre.org/"
  }
];
