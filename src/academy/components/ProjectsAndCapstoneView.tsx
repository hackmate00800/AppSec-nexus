import { useState } from "react";
import {
  Award,
  CheckCircle2,
  Circle,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";

interface PracticalProject {
  id: string;
  projectNumber: number;
  title: string;
  category: "Foundations" | "Reconnaissance" | "Offensive Testing" | "API Security" | "Defense & Reporting";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedHours: number;
  objectives: string[];
  deliverables: string[];
  keyTools: string[];
  sampleCommandsOrCode: string;
  remediationFocus: string;
}

const PRACTICAL_PROJECTS: PracticalProject[] = [
  {
    id: "proj-1",
    projectNumber: 1,
    title: "Local Pentest Lab Setup & Container Hardening",
    category: "Foundations",
    difficulty: "Beginner",
    estimatedHours: 3,
    objectives: [
      "Deploy OWASP Juice Shop and DVWA using isolated Docker containers on local loopback.",
      "Configure container network isolation so vulnerable labs cannot communicate with local LAN.",
      "Verify container port bindings are restricted to 127.0.0.1 instead of 0.0.0.0."
    ],
    deliverables: [
      "Running docker-compose.yml with non-root security context and localhost bindings.",
      "Lab readiness checklist confirming HTTP accessibility on ports 3000 and 8080."
    ],
    keyTools: ["Docker", "Docker Compose", "cURL", "PowerShell / Bash"],
    sampleCommandsOrCode: `docker run -d --name juiceshop -p 127.0.0.1:3000:3000 --read-only --tmpfs /tmp bkimminich/juice-shop`,
    remediationFocus: "Never bind vulnerable training applications to 0.0.0.0 on public Wi-Fi or multi-tenant cloud servers."
  },
  {
    id: "proj-2",
    projectNumber: 2,
    title: "Passive OSINT & Attack Surface Profiling",
    category: "Reconnaissance",
    difficulty: "Beginner",
    estimatedHours: 4,
    objectives: [
      "Perform passive reconnaissance against an authorized domain without sending intrusive packets.",
      "Enumerate public DNS records (A, AAAA, MX, TXT, SPF) using dig and nslookup.",
      "Identify technology stack components (web server, frameworks, CDNs) via passive HTTP response headers."
    ],
    deliverables: [
      "Attack surface profile document containing subdomains, email providers, and technology footprint.",
      "Identified third-party SaaS dependencies and potential subdomain takeover candidates."
    ],
    keyTools: ["dig", "nslookup", "whois", "AppSec Nexus Passive Scanner"],
    sampleCommandsOrCode: `dig +nocmd example.com any +multiline +noall +answer\nnslookup -type=TXT _dmarc.example.com`,
    remediationFocus: "Remove stale DNS CNAME records pointing to deleted cloud buckets to prevent subdomain takeovers."
  },
  {
    id: "proj-3",
    projectNumber: 3,
    title: "Network Port & Socket Auditing",
    category: "Reconnaissance",
    difficulty: "Beginner",
    estimatedHours: 3,
    objectives: [
      "Map open network ports and running services on target host using TCP SYN and service version detection.",
      "Distinguish between open, closed, and filtered firewall states.",
      "Differentiate an open port (operational reality) from a confirmed vulnerability."
    ],
    deliverables: [
      "Port audit report mapping TCP ports to confirmed service names and software versions.",
      "Threat model highlighting legacy protocols (e.g. unencrypted HTTP, Telnet, FTP)."
    ],
    keyTools: ["Nmap", "ss / netstat", "Test-NetConnection"],
    sampleCommandsOrCode: `nmap -sS -sV -p 80,443,3000,8080,3306 -T4 127.0.0.1`,
    remediationFocus: "Close unnecessary listening ports and configure host firewalls to deny incoming traffic by default."
  },
  {
    id: "proj-4",
    projectNumber: 4,
    title: "HTTP Protocol & Security Headers Deep-Dive",
    category: "Foundations",
    difficulty: "Beginner",
    estimatedHours: 4,
    objectives: [
      "Inspect HTTP request/response headers across an application using CLI tools and proxy inspection.",
      "Evaluate defense headers: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options.",
      "Identify server information disclosure tokens (e.g., Server: Apache/2.4.41 (Ubuntu), X-Powered-By: PHP/7.4)."
    ],
    deliverables: [
      "Security header gap analysis comparing existing headers against OWASP Secure Headers Project.",
      "Production-ready Nginx / Apache configuration snippet implementing strict headers."
    ],
    keyTools: ["cURL", "AppSec Nexus Scanner", "Chrome DevTools"],
    sampleCommandsOrCode: `curl -s -D - -o /dev/null https://target.local | grep -iE "(strict-transport|content-security|x-frame|x-content-type|server)"`,
    remediationFocus: "Implement defense-in-depth headers: 'default-src 'self'', HSTS max-age=31536000, and strip X-Powered-By."
  },
  {
    id: "proj-5",
    projectNumber: 5,
    title: "SQL Injection: Manual Verification & Prepared Statement Fix",
    category: "Offensive Testing",
    difficulty: "Intermediate",
    estimatedHours: 6,
    objectives: [
      "Identify SQL injection vectors in vulnerable search and authentication forms.",
      "Safely extract database banner without destructive queries using error-based and UNION-based techniques.",
      "Refactor vulnerable string-concatenated SQL queries into secure parameterized statements."
    ],
    deliverables: [
      "Step-by-step reproduction PoC detailing the vulnerable parameter and injected payload.",
      "Pull request containing parameterized database queries in Python (sqlite3/SQLAlchemy) or PHP (PDO)."
    ],
    keyTools: ["Burp Suite / AppSec Nexus", "cURL", "SQLite / MySQL"],
    sampleCommandsOrCode: `# Vulnerable:\ncursor.execute(f"SELECT * FROM users WHERE name = '{user_input}'")\n# Secure Fixed:\ncursor.execute("SELECT * FROM users WHERE name = ?", (user_input,))`,
    remediationFocus: "Prepared statements / parameterized queries eliminate SQL injection by separating code from data at the DB engine parser level."
  },
  {
    id: "proj-6",
    projectNumber: 6,
    title: "Cross-Site Scripting (XSS) Defense & Strict CSP",
    category: "Offensive Testing",
    difficulty: "Intermediate",
    estimatedHours: 5,
    objectives: [
      "Probe and identify Reflected, Stored, and DOM-based XSS vectors in user comment fields and search inputs.",
      "Craft non-destructive proof-of-concept payloads (e.g., alert(document.domain)).",
      "Implement contextual HTML entity encoding and a cryptographic nonce-based Content-Security-Policy."
    ],
    deliverables: [
      "Validation report proving JavaScript execution with screenshot or DOM state.",
      "Frontend sanitization code using DOMPurify and web server CSP configuration."
    ],
    keyTools: ["Browser DevTools", "DOMPurify", "AppSec Nexus AI Validator"],
    sampleCommandsOrCode: `// Fixed with DOMPurify:\nimport DOMPurify from 'dompurify';\nconst cleanHtml = DOMPurify.sanitize(userContent);`,
    remediationFocus: "Never trust raw HTML in innerHTML. Combine contextual output encoding with strict script-src 'nonce-{RANDOM}'."
  },
  {
    id: "proj-7",
    projectNumber: 7,
    title: "Broken Authentication & Brute-Force Rate Limiting",
    category: "Offensive Testing",
    difficulty: "Intermediate",
    estimatedHours: 5,
    objectives: [
      "Audit login endpoints for lack of rate limiting and credential stuffing vulnerability.",
      "Test password reset workflows for predictable tokens, expiration flaws, and host header poisoning.",
      "Implement Argon2id/Bcrypt password hashing and Redis-backed rate limiting."
    ],
    deliverables: [
      "Authentication vulnerability assessment report.",
      "Backend middleware enforcing max 5 attempts per minute per IP/username."
    ],
    keyTools: ["cURL / Python script", "Redis", "Bcrypt"],
    sampleCommandsOrCode: `// Rate limit middleware:\nconst rateLimit = require('express-rate-limit');\nconst loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });`,
    remediationFocus: "Store passwords with Argon2id or Bcrypt (work factor >= 12); enforce multi-factor authentication and strict rate limits."
  },
  {
    id: "proj-8",
    projectNumber: 8,
    title: "Insecure Direct Object References (IDOR / BOLA)",
    category: "API Security",
    difficulty: "Intermediate",
    estimatedHours: 5,
    objectives: [
      "Inspect API endpoints that take numerical or predictable identifiers (e.g., /api/orders/1042).",
      "Craft requests substituting user A's token with user B's resource ID to test authorization enforcement.",
      "Implement Attribute-Based Access Control (ABAC) validating the authenticated session owns the record."
    ],
    deliverables: [
      "Reproduction steps showing unauthorized data access.",
      "Secure backend code checking `resource.userId === currentUser.id` before returning data."
    ],
    keyTools: ["Postman", "cURL", "AppSec Nexus API Scanner"],
    sampleCommandsOrCode: `# Secure query checking ownership:\nSELECT * FROM documents WHERE id = :docId AND tenant_id = :currentTenantId AND owner_user_id = :currentUserId;`,
    remediationFocus: "Never rely on obscurity or client-side checks for access control. Validate ownership on every database fetch."
  },
  {
    id: "proj-9",
    projectNumber: 9,
    title: "Server-Side Request Forgery (SSRF) Hardening",
    category: "API Security",
    difficulty: "Advanced",
    estimatedHours: 6,
    objectives: [
      "Identify endpoints that fetch remote URLs (e.g. webhooks, avatar upload by URL, PDF generators).",
      "Test whether backend can be forced to query internal services (127.0.0.1, 169.254.169.254 cloud metadata).",
      "Implement strict URL parsing, DNS resolution validation, and private IP range blocklists."
    ],
    deliverables: [
      "SSRF verification document detailing payload and backend network response.",
      "Safe HTTP client wrapper validating destination IP is not in RFC 1918 or link-local ranges."
    ],
    keyTools: ["cURL", "Python requests", "Docker"],
    sampleCommandsOrCode: `// Block private IP ranges before sending socket connection:\nif (isPrivateIp(resolvedIp)) throw new Error('SSRF attempt blocked');`,
    remediationFocus: "Resolve host to IP before connecting, verify IP is not loopback or private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.169.254)."
  },
  {
    id: "proj-10",
    projectNumber: 10,
    title: "Security Misconfiguration & Sensitive File Leakage",
    category: "Reconnaissance",
    difficulty: "Beginner",
    estimatedHours: 3,
    objectives: [
      "Discover exposed administrative interfaces, diagnostic tools, and backup archives.",
      "Detect exposed `.git` directories, `.env` files, and `web.config` backups using wordlist fuzzing.",
      "Configure web servers to reject requests to hidden directories and sensitive extensions."
    ],
    deliverables: [
      "Inventory of sensitive exposed endpoints and information disclosure findings.",
      "Web server deny rules for `/.git`, `/.env`, and backup extensions (`.bak`, `.old`)."
    ],
    keyTools: ["ffuf / feroxbuster", "cURL", "AppSec Nexus Crawler"],
    sampleCommandsOrCode: `# Nginx rule blocking sensitive files:\nlocation ~ /\\.(git|env|bak|config) { deny all; return 404; }`,
    remediationFocus: "Disable directory indexing, return 404 for dotfiles, and purge unneeded build artifacts before production deployment."
  },
  {
    id: "proj-11",
    projectNumber: 11,
    title: "REST API Security Assessment with Postman & Nexus",
    category: "API Security",
    difficulty: "Intermediate",
    estimatedHours: 5,
    objectives: [
      "Import an OpenAPI / Swagger definition into testing workspace.",
      "Audit all endpoints for missing authentication, excessive data exposure, and HTTP method tampering.",
      "Test Mass Assignment vulnerabilities by injecting admin fields (`\"isAdmin\": true`) into profile update requests."
    ],
    deliverables: [
      "Complete API security test collection and execution results.",
      "Backend DTO (Data Transfer Object) whitelist preventing unauthorized property binding."
    ],
    keyTools: ["Postman", "OpenAPI", "AppSec Nexus Native API Scanner"],
    sampleCommandsOrCode: `// DTO Whitelist:\nconst allowedKeys = ['firstName', 'lastName', 'bio'];\nconst safeBody = pick(req.body, allowedKeys);`,
    remediationFocus: "Never bind raw client JSON into database models. Use strict schema validation and explicit field whitelists."
  },
  {
    id: "proj-12",
    projectNumber: 12,
    title: "JSON Web Token (JWT) Security Analysis",
    category: "API Security",
    difficulty: "Intermediate",
    estimatedHours: 5,
    objectives: [
      "Decode and inspect JWT header, payload, and signature components.",
      "Test for common flaws: `alg: \"none\"` acceptance, weak HMAC secret keys, and lack of expiration checking.",
      "Implement robust token validation using asymmetric cryptography (RS256 / EdDSA) with strict expiration."
    ],
    deliverables: [
      "JWT vulnerability analysis report detailing signature verification behavior.",
      "Hardened backend verification code enforcing specific signing algorithm and 15-minute lifespan."
    ],
    keyTools: ["jwt.io", "Python PyJWT", "cURL"],
    sampleCommandsOrCode: `jwt.verify(token, publicKey, { algorithms: ['RS256'], maxAge: '15m' });`,
    remediationFocus: "Explicitly declare expected algorithms in `jwt.verify()`; never permit algorithm negotiation from the untrusted token header."
  },
  {
    id: "proj-13",
    projectNumber: 13,
    title: "False Positive Triage: Automated Scanner vs Manual Verification",
    category: "Defense & Reporting",
    difficulty: "Intermediate",
    estimatedHours: 4,
    objectives: [
      "Run an automated web scan and analyze all generated findings.",
      "Manually verify each finding using cURL or browser developer tools to separate false positives from true vulnerabilities.",
      "Document the exact root cause of why the scanner generated a false alert (e.g., reflected query string without script execution context)."
    ],
    deliverables: [
      "Triage matrix detailing Scanner Findings, Verification Method, Validation Status (Confirmed vs False Positive), and Technical Evidence.",
      "Refined scanning profile reducing false positive rate."
    ],
    keyTools: ["AppSec Nexus Validation Engine", "cURL", "Browser Console"],
    sampleCommandsOrCode: `# Verify if reflected query is executable or just static text:\ncurl -s "https://target.local/search?q=%3Cscript%3Ealert(1)%3C/script%3E" | grep -i "alert(1)"`,
    remediationFocus: "An unvalidated scanner finding is merely a hypothesis. Security engineers must establish proof before assigning engineer remediation hours."
  },
  {
    id: "proj-14",
    projectNumber: 14,
    title: "Comprehensive Remediation, Retesting & Clean Executive Reporting",
    category: "Defense & Reporting",
    difficulty: "Advanced",
    estimatedHours: 6,
    objectives: [
      "Draft a complete professional penetration testing report including Executive Summary, Methodology, and Findings.",
      "Calculate CVSS v3.1 base score and assign appropriate severity ratings.",
      "Perform retesting after developers deploy security patches and certify vulnerability resolution."
    ],
    deliverables: [
      "Professional Penetration Testing Report PDF or Markdown artifact.",
      "Retesting certification log documenting verified remediation."
    ],
    keyTools: ["AppSec Nexus Report Generator", "FIRST CVSS Calculator", "Git"],
    sampleCommandsOrCode: `Retest verification: Sent original exploit payload -> Observed HTTP 400 Bad Request with generic error message. Confirmed patched.`,
    remediationFocus: "Clear, reproducible remediation steps empower engineering teams to fix security vulnerabilities permanently."
  }
];

export function ProjectsAndCapstoneView() {
  const [activeSection, setActiveSection] = useState<"projects" | "capstone">("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(PRACTICAL_PROJECTS[0].id);
  const [completedProjects, setCompletedProjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("appsec_nexus_completed_projects");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Capstone Interactive Simulator State
  const [capstoneStage, setCapstoneStage] = useState<number>(1);
  const [capstoneCompletedStages, setCapstoneCompletedStages] = useState<number[]>([]);
  const [capstoneNotes, setCapstoneNotes] = useState<string>("");
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  function toggleProjectComplete(id: string) {
    const updated = completedProjects.includes(id)
      ? completedProjects.filter((item) => item !== id)
      : [...completedProjects, id];
    setCompletedProjects(updated);
    try {
      localStorage.setItem("appsec_nexus_completed_projects", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }

  function handleCompleteStage(stageNum: number) {
    if (!capstoneCompletedStages.includes(stageNum)) {
      setCapstoneCompletedStages([...capstoneCompletedStages, stageNum]);
    }
    if (stageNum < 7) {
      setCapstoneStage(stageNum + 1);
    }
  }

  const activeProject =
    PRACTICAL_PROJECTS.find((p) => p.id === selectedProjectId) || PRACTICAL_PROJECTS[0];

  const CAPSTONE_STAGES = [
    {
      stage: 1,
      title: "Rules of Engagement & Target Scoping",
      task: "Verify that the target domain (http://localhost:3000) is authorized for testing and document in-scope vs out-of-scope assets.",
      checklist: [
        "Written authorization confirmed for 127.0.0.1:3000",
        "Out-of-scope third-party CDNs and analytics providers identified",
        "Assessment timeframe and emergency contact agreed upon"
      ],
      sampleOutput: "SCOPE APPROVED: Target host 127.0.0.1:3000 is authorized under standard local assessment boundaries."
    },
    {
      stage: 2,
      title: "Passive & Active Reconnaissance",
      task: "Discover active web server technologies, framework fingerprints, and exposed endpoints.",
      checklist: [
        "Web server software identified via HTTP headers (e.g. Express / Node.js)",
        "Client-side JavaScript bundles analyzed for exposed API routes (/api/Users, /api/Products)",
        "Security headers checked (missing CSP and HSTS identified)"
      ],
      sampleOutput: "DISCOVERY COMPLETE: 18 API routes mapped, Angular client frontend detected."
    },
    {
      stage: 3,
      title: "Vulnerability Identification & Testing",
      task: "Probe endpoints for OWASP Top 10 weaknesses: test SQLi in search field, BOLA in /api/BasketItems/1, and unauthenticated endpoints.",
      checklist: [
        "SQLi probe sent to `/rest/products/search?q=' OR 1=1--`",
        "Observed database response returning all products (including hidden test items)",
        "BOLA tested on `/api/BasketItems/2` with user A credentials"
      ],
      sampleOutput: "VULNERABILITY IDENTIFIED: Unsanitized SQL query in search handler directly executes user input."
    },
    {
      stage: 4,
      title: "Evidence-Based Validation (PoC)",
      task: "Formulate concrete, reproducible Proof of Concept showing root cause without causing data loss or service disruption.",
      checklist: [
        "Exact HTTP request method, path, and payload recorded",
        "Response body containing evidence captured",
        "False positive hypothesis ruled out"
      ],
      sampleOutput: "POC VALIDATED: HTTP 200 with 45 products returned when sending `' OR 1=1--` vs 0 products on normal query."
    },
    {
      stage: 5,
      title: "Root Cause Analysis & Secure Code Remediation",
      task: "Identify vulnerable line in application source code and draft a secure parameterized query fix.",
      checklist: [
        "Identified string concatenation: `models.sequelize.query('SELECT * FROM Products WHERE name LIKE \"%' + req.query.q + '%\"')`",
        "Replaced with parameterized query replacement: `replacements: { q: '%' + req.query.q + '%' }`",
        "Unit test created to verify input sanitization"
      ],
      sampleOutput: "REMEDIATION DRAFTED: Parameterized replacements implemented in Sequelize ORM."
    },
    {
      stage: 6,
      title: "Retesting & Remediation Verification",
      task: "Send the original PoC payload against the patched endpoint to verify the vulnerability is completely resolved.",
      checklist: [
        "Exploit payload resent",
        "Observed HTTP 200 with 0 results (treated as literal string rather than executable SQL syntax)",
        "Certified resolved"
      ],
      sampleOutput: "RETEST PASSED: Input safely escaped as literal string. Zero unintended records returned."
    },
    {
      stage: 7,
      title: "Executive & Technical Report Finalization",
      task: "Compile findings into a comprehensive pentest report with executive summary, CVSS 3.1 rating, and engineering action items.",
      checklist: [
        "Executive summary highlighting business risk",
        "CVSS 3.1 Base Score 8.6 (High) assigned to SQLi finding",
        "Detailed developer remediation guide attached"
      ],
      sampleOutput: "REPORT FINALIZED: Ready for stakeholder download and executive presentation."
    }
  ];

  const currentStageData = CAPSTONE_STAGES[capstoneStage - 1] || CAPSTONE_STAGES[0];

  function generateReportText() {
    return `# CAPSTONE WEB APPLICATION PENETRATION TESTING REPORT
Date: ${new Date().toLocaleDateString()}
Target Scope: http://localhost:3000 (Authorized Training Lab)
Lead Security Assessor: AppSec Nexus Academy Graduate

## 1. Executive Summary
During the authorized security assessment conducted on the target application, an end-to-end evaluation was executed covering reconnaissance, authentication, authorization, and data validation controls. The assessment identified a High-severity SQL Injection flaw and missing Content Security Policy defense headers. Remediation has been drafted and validated.

## 2. Findings Summary Matrix
| ID | Finding Title | Severity | CVSS v3.1 | Status |
|----|---------------|----------|-----------|--------|
| NEX-01 | SQL Injection in Product Search | High | 8.6 | Remediated & Retested |
| NEX-02 | Missing Content-Security-Policy (CSP) | Medium | 5.3 | Remediated |
| NEX-03 | Broken Object Level Authorization (BOLA) | High | 8.1 | Documented |

## 3. Finding Details: NEX-01 — SQL Injection
- Affected Endpoint: GET /rest/products/search?q=
- CWE: CWE-89 (Improper Neutralization of Special Elements used in an SQL Command)
- Proof of Concept:
  GET /rest/products/search?q=' OR 1=1-- HTTP/1.1
  Host: localhost:3000
- Root Cause:
  Vulnerable query concatenated untrusted user input directly into SQLite statement string.
- Remediation Code Applied:
  models.sequelize.query("SELECT * FROM Products WHERE name LIKE :search", {
    replacements: { search: '%' + req.query.q + '%' },
    type: models.sequelize.QueryTypes.SELECT
  });
- Retesting Observation:
  Resending payload yielded zero injected records. Injection completely mitigated.

## 4. Assessment Conclusion
The application security posture has significantly improved following the implementation of parameterized queries. All identified vulnerabilities have clear remediation paths.`;
  }

  function handleCopyReport() {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(generateReportText());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner */}
      <div
        className="card"
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.05) 100%)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
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
              background: "rgba(245, 158, 11, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Award size={24} color="var(--accent-amber)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              Practical Projects & Capstone Assessment
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  color: "var(--accent-amber)",
                  fontWeight: 600
                }}
              >
                14 Hands-On Projects + Full Capstone
              </span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Build real-world artifacts: from local Docker lab hardening to end-to-end simulated penetration test reports.
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div style={{ display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <button
            className={`filter-chip ${activeSection === "projects" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}
            onClick={() => setActiveSection("projects")}
          >
            14 Practical Projects ({completedProjects.length}/14)
          </button>
          <button
            className={`filter-chip ${activeSection === "capstone" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}
            onClick={() => setActiveSection("capstone")}
          >
            Capstone Pentest Assessment ({capstoneCompletedStages.length}/7 Stages)
          </button>
        </div>
      </div>

      {/* SECTION 1: 14 PRACTICAL PROJECTS */}
      {activeSection === "projects" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(420px, 2fr)", gap: "18px" }}>
          {/* Left Projects List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "800px", overflowY: "auto" }}>
            {PRACTICAL_PROJECTS.map((proj) => {
              const isSelected = activeProject.id === proj.id;
              const isCompleted = completedProjects.includes(proj.id);
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    cursor: "pointer",
                    border: isSelected ? "1px solid var(--accent-amber)" : "1px solid var(--border-color)",
                    backgroundColor: isSelected ? "var(--bg-secondary)" : "var(--bg-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectComplete(proj.id);
                      }}
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} color="var(--accent-emerald)" />
                      ) : (
                        <Circle size={18} color="var(--text-dim)" />
                      )}
                    </button>
                    <div>
                      <div style={{ fontSize: "0.86rem", fontWeight: 700, color: isSelected ? "var(--accent-amber)" : "inherit" }}>
                        Project {proj.projectNumber}: {proj.title}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                        {proj.category} &bull; {proj.difficulty} &bull; ~{proj.estimatedHours}h
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-dim)" />
                </div>
              );
            })}
          </div>

          {/* Right Selected Project Details */}
          {activeProject && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(245, 158, 11, 0.15)",
                          color: "var(--accent-amber)"
                        }}
                      >
                        PROJECT #{activeProject.projectNumber}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {activeProject.category} &bull; {activeProject.estimatedHours} Hours
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                      {activeProject.title}
                    </h3>
                  </div>

                  <button
                    className={`btn ${completedProjects.includes(activeProject.id) ? "btn-secondary" : "btn-primary"}`}
                    style={{ padding: "6px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={() => toggleProjectComplete(activeProject.id)}
                  >
                    {completedProjects.includes(activeProject.id) ? (
                      <>
                        <Check size={14} color="var(--accent-emerald)" /> Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} /> Mark as Complete
                      </>
                    )}
                  </button>
                </div>

                {/* Key Tools Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>Tools Used:</span>
                  {activeProject.keyTools.map((tool, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--accent-cyan)",
                        fontWeight: 600
                      }}
                    >
                      {tool}
                    </span>
                  ))}
                </div>

                {/* Objectives */}
                <div style={{ marginBottom: "16px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    Learning Objectives
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    {activeProject.objectives.map((obj, oIdx) => (
                      <li key={oIdx} style={{ marginBottom: "4px" }}>{obj}</li>
                    ))}
                  </ul>
                </div>

                {/* Deliverables */}
                <div style={{ marginBottom: "16px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                    Expected Deliverables & Evidence
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    {activeProject.deliverables.map((del, dIdx) => (
                      <li key={dIdx} style={{ marginBottom: "4px" }}>{del}</li>
                    ))}
                  </ul>
                </div>

                {/* Sample Code / Command Box */}
                <div style={{ marginBottom: "16px" }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                    Execution Reference & Snippet
                  </h4>
                  <pre
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "12px",
                      fontFamily: "monospace",
                      fontSize: "0.82rem",
                      color: "var(--accent-cyan)",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      margin: 0
                    }}
                  >
                    {activeProject.sampleCommandsOrCode}
                  </pre>
                </div>

                {/* Remediation Note */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    borderLeft: "3px solid var(--accent-emerald)",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)"
                  }}
                >
                  <strong style={{ color: "var(--accent-emerald)" }}>Remediation Philosophy:</strong>{" "}
                  {activeProject.remediationFocus}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: CAPSTONE WEB SECURITY ASSESSMENT SIMULATOR */}
      {activeSection === "capstone" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Stepper Header */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {CAPSTONE_STAGES.map((stg) => {
                const isCurrent = capstoneStage === stg.stage;
                const isDone = capstoneCompletedStages.includes(stg.stage);
                return (
                  <button
                    key={stg.stage}
                    onClick={() => setCapstoneStage(stg.stage)}
                    className="filter-chip"
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      borderColor: isCurrent ? "var(--accent-amber)" : undefined,
                      backgroundColor: isCurrent ? "rgba(245, 158, 11, 0.15)" : undefined,
                      color: isDone ? "var(--accent-emerald)" : isCurrent ? "var(--accent-amber)" : "inherit"
                    }}
                  >
                    {isDone ? <CheckCircle2 size={13} color="var(--accent-emerald)" /> : <span>{stg.stage}.</span>}
                    <span>{stg.title.split("&")[0]}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={handleCopyReport}
              >
                {copiedReport ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                {copiedReport ? "Report Copied!" : "Copy Full Report"}
              </button>
            </div>
          </div>

          {/* Current Stage Walkthrough Card */}
          <div className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-amber)" }}>
                  Stage {currentStageData.stage} of 7
                </span>
                <h3 style={{ margin: "4px 0 0 0", fontSize: "1.25rem", fontWeight: 700 }}>
                  {currentStageData.title}
                </h3>
              </div>

              <button
                className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => handleCompleteStage(currentStageData.stage)}
              >
                <CheckCircle2 size={16} />
                {capstoneCompletedStages.includes(currentStageData.stage) ? "Mark Stage Complete Again" : "Complete Stage & Advance"}
              </button>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "18px" }}>
              {currentStageData.task}
            </p>

            {/* Checklist */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                Stage Execution Checklist:
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {currentStageData.checklist.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-secondary)",
                      fontSize: "0.82rem"
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--accent-emerald)" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Stage Output */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Simulated Output Observation:
              </h4>
              <div
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  color: "#58a6ff"
                }}
              >
                &gt; {currentStageData.sampleOutput}
              </div>
            </div>

            {/* Interactive Stage Notes */}
            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                Assessor Notes & Findings for this Stage:
              </h4>
              <textarea
                className="input"
                rows={3}
                style={{ width: "100%", fontSize: "0.82rem", resize: "vertical" }}
                placeholder="Record manual observations, curl request headers, or response payloads..."
                value={capstoneNotes}
                onChange={(e) => setCapstoneNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
