import { MethodologyFramework } from "../types";

export const METHODOLOGIES_DATA: MethodologyFramework[] = [
  // 1. OWASP WSTG
  {
    id: "meth-wstg",
    name: "OWASP Web Security Testing Guide (WSTG v4.2)",
    organization: "OWASP (Open Worldwide Application Security Project)",
    version: "v4.2 (Latest Community Edition)",
    purpose: "The premier cybersecurity testing guide for web application security professionals, providing a structured, repeatable framework of 90+ comprehensive test cases.",
    scopeAndLimitations: "Covers black-box, gray-box, and white-box web penetration testing. Does not deeply cover low-level network packet analysis or binary firmware reverse engineering.",
    corePhases: [
      {
        phaseNumber: 1,
        title: "Information Gathering (WSTG-INFO)",
        description: "Conduct search engine discovery, web server fingerprinting, metafile analysis (robots.txt, sitemaps), and application architecture mapping.",
        deliverables: ["Asset inventory", "Technology stack report", "Exposed sensitive files catalog"]
      },
      {
        phaseNumber: 2,
        title: "Configuration & Deployment Management Testing (WSTG-CONF)",
        description: "Audit network infrastructure, default credentials, HTTP security headers, subdomains, and cloud storage bucket permissions.",
        deliverables: ["Security header scorecard", "Misconfiguration matrix", "TLS cipher audit"]
      },
      {
        phaseNumber: 3,
        title: "Identity & Authentication Testing (WSTG-ATHN)",
        description: "Test password strength requirements, account lockout mechanisms, MFA bypasses, remember-me functionality, and password resets.",
        deliverables: ["Brute-force risk assessment", "MFA validation report", "Credential stuffing resistance"]
      },
      {
        phaseNumber: 4,
        title: "Authorization Testing (WSTG-ATHZ)",
        description: "Audit role-based access control (RBAC), directory traversal, horizontal/vertical privilege escalation, and BOLA/IDOR flaws.",
        deliverables: ["Access control matrix", "Privilege escalation proof-of-concept logs"]
      },
      {
        phaseNumber: 5,
        title: "Data Validation & Injection Testing (WSTG-INPV)",
        description: "Execute deep validation against SQLi, XSS, Command Injection, SSRF, XML External Entities (XXE), and Template Injection.",
        deliverables: ["Verified injection findings", "Contextual remediation code snippets"]
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
    scopeAndLimitations: "Focuses on application-level controls and secure architecture rather than network infrastructure or physical security.",
    corePhases: [
      {
        phaseNumber: 1,
        title: "Level 1: Opportunistic (Basic Applications)",
        description: "Covers the bare minimum security requirements against common, automated threats. Fully black-box testable.",
        deliverables: ["Level 1 Compliance Checklist", "Automated baseline verification"]
      },
      {
        phaseNumber: 2,
        title: "Level 2: Standard (Applications with Sensitive Data)",
        description: "Recommended for applications processing business transactions, PII, healthcare records, or sensitive financial data. Requires code access.",
        deliverables: ["Architecture threat model", "Access control validation", "Cryptographic key audit"]
      },
      {
        phaseNumber: 3,
        title: "Level 3: Advanced (High Assurance & Critical Assets)",
        description: "Reserved for military, banking, medical life-support, or critical national infrastructure applications where compromise causes severe harm.",
        deliverables: ["Formal verification report", "Zero-trust enclave audit", "Fail-safe integrity proof"]
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
    scopeAndLimitations: "A methodology for professional services delivery rather than a specific tool implementation.",
    corePhases: [
      {
        phaseNumber: 1,
        title: "Pre-engagement Interactions",
        description: "Define scope, testing windows, emergency contacts, rules of engagement (RoE), and non-disclosure agreements.",
        deliverables: ["Signed Scoping Document", "Rules of Engagement (RoE) Agreement"]
      },
      {
        phaseNumber: 2,
        title: "Intelligence Gathering",
        description: "Perform passive OSINT, public DNS reconnaissance, certificate transparency logs, and social footprint mapping.",
        deliverables: ["Attack surface map", "Discovered host list"]
      },
      {
        phaseNumber: 3,
        title: "Threat Modeling",
        description: "Identify high-value business assets, determine likely adversary motivations, and formulate specific attack path hypotheses.",
        deliverables: ["Threat model diagram", "Target prioritized vectors"]
      },
      {
        phaseNumber: 4,
        title: "Vulnerability Analysis",
        description: "Combine automated scans with extensive manual analysis to discover security weaknesses in applications and systems.",
        deliverables: ["Validated vulnerability register", "False-positive filter log"]
      },
      {
        phaseNumber: 5,
        title: "Exploitation & Controlled PoC",
        description: "Execute controlled proofs of concept to verify that flaws are genuinely exploitable without causing denial of service.",
        deliverables: ["Evidence screenshots", "HTTP request/response logs"]
      },
      {
        phaseNumber: 6,
        title: "Reporting & Remediation Guidance",
        description: "Author an executive summary for leadership alongside technical remediation steps for development teams.",
        deliverables: ["Executive Summary Report", "Technical Remediation Guide"]
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
    scopeAndLimitations: "Documents known threat actor behavior. Not a compliance checklist or testing methodology, but a taxonomy for threat intelligence and detection.",
    corePhases: [
      {
        phaseNumber: 1,
        title: "Initial Access (TA0001)",
        description: "Techniques used to gain an initial foothold inside a network (e.g. Exploit Public-Facing Application T1190, Phishing T1566).",
        deliverables: ["Perimeter defense audit", "External exposure mapping"]
      },
      {
        phaseNumber: 2,
        title: "Execution (TA0002)",
        description: "Techniques that result in adversary-controlled code running on a local or remote system (e.g. Command and Scripting Interpreter T1059).",
        deliverables: ["Process creation telemetry", "Script execution policy check"]
      },
      {
        phaseNumber: 3,
        title: "Persistence & Privilege Escalation (TA0003 & TA0004)",
        description: "Techniques adversaries use to maintain their presence and gain higher-level permissions (e.g. SUID T1548.001, Unquoted Service Path T1574.009).",
        deliverables: ["Privileged account audit", "Host misconfiguration alerts"]
      },
      {
        phaseNumber: 4,
        title: "Exfiltration (TA0010)",
        description: "Techniques used to steal and package data from the target network (e.g. Exfiltration Over Web Service T1567).",
        deliverables: ["Egress firewall rule validation", "Data loss prevention telemetry"]
      }
    ],
    officialUrl: "https://attack.mitre.org/"
  }
];
