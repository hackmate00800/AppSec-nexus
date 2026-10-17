import { CertificationInfo, CareerRoadmap } from "../types";

export const CERTIFICATIONS_DIRECTORY: CertificationInfo[] = [
  // 1. COMPTIA SECURITY+
  {
    id: "cert-secplus",
    title: "CompTIA Security+ (SY0-701)",
    issuer: "CompTIA (Computing Technology Industry Association)",
    level: "beginner",
    category: "Foundations",
    targetAudience: "Entry-level cybersecurity practitioners, system administrators, and security analysts.",
    examFormat: "Maximum 90 questions (Multiple-choice and Performance-Based Questions PBQs), 90 minutes. Passing score: 750/900.",
    prerequisites: "No formal prerequisites required. CompTIA recommends Network+ and 2 years of general IT administration experience.",
    estimatedCost: "$404 USD (Verified via CompTIA Store, vouchers often available)",
    officialUrl: "https://www.comptia.org/certifications/security",
    isVerified: true,
    freeAlternatives: [
      "Professor Messer's Free YouTube Training Course (SY0-701)",
      "Cybrary Free Security+ Training",
      "CompTIA Security+ Study Guide (Open Library)"
    ],
    relatedJobRoles: ["Junior Security Analyst", "SOC Analyst Tier 1", "Systems Administrator", "Cybersecurity Specialist"],
    lastVerifiedDate: "2024-10-01"
  },

  // 2. COMPTIA PENTEST+
  {
    id: "cert-pentestplus",
    title: "CompTIA PenTest+ (PT0-002 / PT0-003)",
    issuer: "CompTIA",
    level: "intermediate",
    category: "Offensive / Pentesting",
    targetAudience: "Intermediate penetration testers, vulnerability assessment analysts, and security auditors.",
    examFormat: "Maximum 85 questions (Multiple-choice and hands-on performance-based simulations), 165 minutes. Passing score: 750/900.",
    prerequisites: "Security+ or equivalent knowledge recommended (3-4 years practical hands-on experience).",
    estimatedCost: "$404 USD (Verified via CompTIA Store)",
    officialUrl: "https://www.comptia.org/certifications/pentest",
    isVerified: true,
    freeAlternatives: [
      "TryHackMe Junior Penetration Tester Pathway",
      "OverTheWire Bandit & Natas Wargames",
      "OWASP Web Security Testing Guide (WSTG)"
    ],
    relatedJobRoles: ["Penetration Tester", "Vulnerability Analyst", "Application Security Specialist"],
    lastVerifiedDate: "2024-10-01"
  },

  // 3. BURP SUITE CERTIFIED PRACTITIONER (BSCP)
  {
    id: "cert-bscp",
    title: "Burp Suite Certified Practitioner (BSCP)",
    issuer: "PortSwigger",
    level: "intermediate",
    category: "Offensive / Pentesting",
    targetAudience: "Web application security testers and penetration testers specializing in PortSwigger tooling and OWASP flaws.",
    examFormat: "100% Practical hands-on 4-hour exam. Requires breaking into two realistic target web applications using Burp Suite to access the server filesystem.",
    prerequisites: "Completion of the PortSwigger Web Security Academy Practitioner materials recommended.",
    estimatedCost: "$99 USD (Verified via PortSwigger Academy)",
    officialUrl: "https://portswigger.net/web-security/certification",
    isVerified: true,
    freeAlternatives: [
      "PortSwigger Web Security Academy (100% Free interactive labs and tutorials)",
      "OWASP Juice Shop hands-on testing",
      "HackTheBox Web challenges"
    ],
    relatedJobRoles: ["Web Application Pentester", "AppSec Consultant", "Bug Bounty Hunter"],
    lastVerifiedDate: "2024-10-01"
  },

  // 4. EJPT (ELEARNSECURITY JUNIOR PENETRATION TESTER)
  {
    id: "cert-ejpt",
    title: "eJPTv2 (eLearnSecurity Junior Penetration Tester)",
    issuer: "INE Security / eLearnSecurity",
    level: "beginner",
    category: "Offensive / Pentesting",
    targetAudience: "Aspiring penetration testers seeking hands-on dynamic network and web exploitation skills.",
    examFormat: "48-hour hands-on real-world laboratory assessment with 35 dynamic scenario questions.",
    prerequisites: "None formal; basic networking and command-line familiarity recommended.",
    estimatedCost: "$249 USD (Exam voucher via INE)",
    officialUrl: "https://ine.com/certifications/ejpt",
    isVerified: true,
    freeAlternatives: [
      "INE Free Fundamentals courseware",
      "TCM Security Practical Ethical Hacking introductory modules",
      "TryHackMe Pre-Security & Complete Beginner tracks"
    ],
    relatedJobRoles: ["Junior Pentester", "Associate Security Engineer", "Red Team Apprentice"],
    lastVerifiedDate: "2024-10-01"
  },

  // 5. OFFSEC CERTIFIED PROFESSIONAL (OSCP)
  {
    id: "cert-oscp",
    title: "OSCP (OffSec Certified Professional) / PEN-200",
    issuer: "OffSec (Offensive Security)",
    level: "advanced",
    category: "Offensive / Pentesting",
    targetAudience: "Professional penetration testers, red teamers, and senior security consultants.",
    examFormat: "24-hour hands-on laboratory exploitation exam followed by 24 hours to submit a professional penetration test report.",
    prerequisites: "Strong solid understanding of TCP/IP networking, Linux/Windows administration, and Python/Bash scripting.",
    estimatedCost: "$1,699 USD (Includes PEN-200 course, 90 days lab access, and 1 exam attempt)",
    officialUrl: "https://www.offsec.com/courses/pen-200/",
    isVerified: true,
    freeAlternatives: [
      "HackTheBox 'TJNull NetSec' retired machines list",
      "Proving Grounds Play tier",
      "VulnHub community challenge VMs"
    ],
    relatedJobRoles: ["Senior Penetration Tester", "Red Team Operator", "Lead Security Consultant"],
    lastVerifiedDate: "2024-10-01"
  },

  // 6. CISSP
  {
    id: "cert-cissp",
    title: "CISSP (Certified Information Systems Security Professional)",
    issuer: "(ISC)²",
    level: "advanced",
    category: "Management / Architecture",
    targetAudience: "Security managers, directors, enterprise architects, and senior information security officers.",
    examFormat: "Computer Adaptive Testing (CAT): 100-150 questions, 3 hours. Passing score: 700/1000.",
    prerequisites: "Requires minimum 5 years of cumulative paid work experience in 2 or more of the 8 CISSP CBK domains (or 4 years with approved degree/cert).",
    estimatedCost: "$749 USD (Verified via (ISC)²)",
    officialUrl: "https://www.isc2.org/certifications/cissp",
    isVerified: true,
    freeAlternatives: [
      "FRSecure CISSP Free Mentorship Study Program",
      "Kelly Handerhan Cybrary CISSP Audio Lectures",
      "NIST Special Publications (SP 800 Series)"
    ],
    relatedJobRoles: ["Chief Information Security Officer (CISO)", "Security Architect", "Security Director", "IT Audit Manager"],
    lastVerifiedDate: "2024-10-01"
  }
];

export const CAREER_ROADMAPS: CareerRoadmap[] = [
  // 1. WEB PENETRATION TESTER
  {
    id: "role-web-pentester",
    roleTitle: "Web Application Penetration Tester",
    targetAudience: "Professionals who evaluate the security posture of web applications, APIs, and client-side interfaces.",
    salaryRangeUS: "$95,000 - $160,000 / year",
    keyResponsibilities: [
      "Conduct authorized black-box and white-box penetration testing against web portals and APIs",
      "Identify high-impact vulnerabilities (SQLi, XSS, SSRF, BOLA, authentication bypasses)",
      "Write technical remediation reports with reproducible steps and proof-of-concept evidence",
      "Advise software engineering teams on secure coding standards and defense-in-depth"
    ],
    essentialSkills: [
      "OWASP Web Security Testing Guide (WSTG)",
      "Burp Suite Professional & OWASP ZAP proxy interception",
      "HTTP protocol, cookies, sessions, and browser Same-Origin Policy",
      "Python and Bash scripting for custom payload automation",
      "Source code review (JavaScript, Python, PHP, Java)"
    ],
    recommendedCertifications: ["Burp Suite Certified Practitioner (BSCP)", "CompTIA PenTest+", "eJPT", "OSCP"],
    learningPathIds: ["path-1", "path-3", "path-5", "path-6", "path-7", "path-8"]
  },

  // 2. APPLICATION SECURITY (APPSEC) ENGINEER
  {
    id: "role-appsec-engineer",
    roleTitle: "Application Security (AppSec) Engineer",
    targetAudience: "Engineers who bridge software development and cybersecurity, integrating automated security into CI/CD pipelines.",
    salaryRangeUS: "$115,000 - $185,000 / year",
    keyResponsibilities: [
      "Integrate SAST, DAST, and SCA scanning tools into GitLab CI / GitHub Actions pipelines",
      "Conduct threat modeling reviews (STRIDE) during application architecture design",
      "Triage vulnerability findings from bug bounty programs and internal security tools",
      "Deliver secure coding workshops for backend and frontend engineering teams"
    ],
    essentialSkills: [
      "DevSecOps CI/CD pipeline automation",
      "Static Analysis (Semgrep, SonarQube, CodeQL)",
      "Container security (Docker, Kubernetes, Trivy)",
      "Software Composition Analysis (SCA) & SBOM management",
      "Secure API design (OAuth 2.0, OpenID Connect, JWT)"
    ],
    recommendedCertifications: ["Certified DevSecOps Professional (CDP)", "CompTIA Security+", "BSCP", "AWS Certified Security Specialty"],
    learningPathIds: ["path-3", "path-4", "path-5", "path-7", "path-8", "path-9"]
  },

  // 3. SOC ANALYST / BLUE TEAM DEFENDER
  {
    id: "role-soc-analyst",
    roleTitle: "SOC Security Analyst (Tier 1 & Tier 2)",
    targetAudience: "Defenders who monitor enterprise telemetry, detect intrusions, and respond to active cybersecurity incidents.",
    salaryRangeUS: "$75,000 - $125,000 / year",
    keyResponsibilities: [
      "Monitor SIEM alerts (Splunk, Microsoft Sentinel, Elastic) for anomalous activity",
      "Triage endpoint detection alerts (CrowdStrike, Microsoft Defender for Endpoint)",
      "Execute initial containment and isolation of infected host endpoints",
      "Perform root cause analysis on phishing campaigns and credential stuffing attacks"
    ],
    essentialSkills: [
      "Log analysis (Windows Security Events, Sysmon, Linux Syslog, Web Server logs)",
      "Network packet analysis with Wireshark and Zeek",
      "MITRE ATT&CK framework mapping",
      "Incident response lifecycle (NIST SP 800-61)",
      "Writing detection rules (Sigma, YARA, Snort)"
    ],
    recommendedCertifications: ["CompTIA Security+", "CompTIA CySA+", "BTL1 (Blue Team Level 1)", "Cisco Certified CyberOps"],
    learningPathIds: ["path-0", "path-1", "path-2", "path-4", "path-9"]
  }
];
