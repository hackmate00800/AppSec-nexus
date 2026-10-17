import { WorkflowStage } from "../types";

export const ETHICAL_HACKING_WORKFLOW: WorkflowStage[] = [
  {
    stageNumber: 1,
    name: "Authorization & Scope Definition",
    category: "Pre-engagement Governance",
    objective: "Establish mutual legal permissions, define strict target boundaries, agree on acceptable test methods, and create emergency escalation procedures.",
    inputs: [
      "Client scoping questionnaire and target infrastructure inventory",
      "List of in-scope domains, IPs, CIDR ranges, and API endpoints",
      "Explicit list of out-of-scope assets (e.g., third-party payment gateways, shared cloud infrastructure)"
    ],
    activities: [
      "Conduct pre-engagement scoping conference with client security sponsors",
      "Execute bilateral Non-Disclosure Agreement (NDA) and Master Services Agreement (MSA)",
      "Sign formal Rules of Engagement (RoE) with defined testing windows and safe-stop triggers",
      "Exchange PGP keys and establish out-of-band communication channels for critical findings"
    ],
    toolsUsed: ["Legal Contracts", "PGP Encryption", "Scoping Questionnaires"],
    expectedOutputs: [
      "Executed Rules of Engagement (RoE) contract",
      "Authorized target scope specification",
      "Emergency contact escalation matrix"
    ],
    safetyAndScopePrecautions: [
      "Never execute any packet transmission before both authorized signatures are in hand",
      "Verify DNS ownership of all target domains to prevent testing stale or recycled cloud IPs"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Target Scope Manager & Authorization Enforcement",
      actionDescription: "AppSec Nexus requires explicit target URL definition and warns users before any active requests are initiated."
    }
  },
  {
    stageNumber: 2,
    name: "Passive Reconnaissance & OSINT",
    category: "Intelligence Gathering",
    objective: "Map external digital assets and gather intelligence without transmitting any direct packets to the target organization's infrastructure.",
    inputs: [
      "Primary organization domain name and company brand aliases",
      "Registered corporate ASN numbers and employee email domains"
    ],
    activities: [
      "Query Certificate Transparency (CT) logs to discover staging and development subdomains",
      "Query public DNS records (A, AAAA, MX, TXT, SPF, DKIM, CNAME)",
      "Search Shodan, Censys, and SecurityTrails for pre-indexed open ports and software banners",
      "Perform search engine dorking to locate exposed configuration files, backup archives, and leaked credentials"
    ],
    toolsUsed: ["crt.sh", "Shodan", "theHarvester", "SecurityTrails", "Google Dorks"],
    expectedOutputs: [
      "Initial target host and subdomain registry",
      "Discovered third-party cloud assets (S3 buckets, Azure blobs)",
      "Key employee names and email patterns for contextual threat modeling"
    ],
    safetyAndScopePrecautions: [
      "Keep all intelligence gathering strictly third-party query based",
      "Do not attempt to authenticate with leaked credentials discovered during OSINT"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Passive Feed Intelligence & Threat Feeds",
      actionDescription: "AppSec Nexus Threat Feed engine syncs known vulnerable signatures and CVE feeds locally."
    }
  },
  {
    stageNumber: 3,
    name: "Active Enumeration & Attack Surface Mapping",
    category: "Reconnaissance & Discovery",
    objective: "Interact directly with authorized target systems to discover responsive hosts, open TCP/UDP ports, running network services, and application entry points.",
    inputs: [
      "Verified list of in-scope IP addresses and resolved subdomains from Stage 2"
    ],
    activities: [
      "Execute TCP SYN port scanning with rate limiting to map perimeter listening daemons",
      "Perform banner grabbing and service fingerprinting to identify exact daemon versions",
      "Crawl target web applications to discover forms, parameters, hidden HTML comments, and API routes",
      "Enumerate virtual hosts (VHosts) and reverse proxy routing behaviors"
    ],
    toolsUsed: ["Nmap", "httpx", "AppSec Nexus Native Web Crawler", "ffuf"],
    expectedOutputs: [
      "Port and service inventory matrix (Port, Protocol, Service, Version)",
      "Discovered web endpoint sitemap and parameter registry",
      "TLS certificate and cipher suite analysis"
    ],
    safetyAndScopePrecautions: [
      "Respect approved scan rate limits (e.g. max 50 requests/sec) to avoid triggering DDoS alarms",
      "Avoid scanning fragile industrial control or legacy embedded hardware during business hours"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "High-Performance Endpoint Crawler & Nmap Adapter",
      actionDescription: "Native crawling engine crawls client targets and populates the endpoint table for scanning."
    }
  },
  {
    stageNumber: 4,
    name: "Threat Modeling & Attack Path Hypotheses",
    category: "Analysis & Planning",
    objective: "Analyze discovered attack surface components, formulate targeted attack hypotheses, and prioritize testing vectors based on high-impact business risk.",
    inputs: [
      "Discovered technology stack inventory (e.g. Spring Boot, PostgreSQL, React, Envoy)",
      "Identified authentication entry points and business workflows"
    ],
    activities: [
      "Map system data flows and identify critical trust boundaries (User -> Gateway -> Microservice -> DB)",
      "Correlate discovered software versions against known CVE databases (NVD, GitHub Security Advisories)",
      "Formulate specific attack trees: e.g. 'Can an authenticated user elevate privilege to tenant admin?'",
      "Prioritize endpoints handling sensitive PII, financial transactions, or administrative functions"
    ],
    toolsUsed: ["STRIDE Worksheets", "AppSec Nexus Flowchart Engine", "NVD / CVE Feeds"],
    expectedOutputs: [
      "Prioritized vulnerability testing checklist",
      "Data flow threat model diagram",
      "Specific exploit hypotheses to test"
    ],
    safetyAndScopePrecautions: [
      "Do not rely solely on automated tool ratings; adjust priorities based on customer business context"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "AI Mentor Flowcharts & Threat Matrix",
      actionDescription: "Generates visual Mermaid diagrams of attack paths and vulnerability concepts."
    }
  },
  {
    stageNumber: 5,
    name: "Vulnerability Discovery & Probing",
    category: "Technical Assessment",
    objective: "Execute systematic automated and manual security probes across all in-scope inputs to discover security weaknesses in application logic, configurations, and services.",
    inputs: [
      "Prioritized testing checklist from Stage 4",
      "Discovered URLs, query parameters, POST body fields, and HTTP headers"
    ],
    activities: [
      "Run automated vulnerability detection templates (Nuclei, AppSec Nexus Passive/Active Scanner)",
      "Inject non-destructive syntax probes (single quote, double quote, angle brackets, template tags)",
      "Test HTTP security header configuration (HSTS, CSP, X-Frame-Options, CORS)",
      "Audit API authentication tokens, cookie flags, and session handling routines"
    ],
    toolsUsed: ["AppSec Nexus Vulnerability Scanner", "Nuclei", "OWASP ZAP", "Burp Suite"],
    expectedOutputs: [
      "Raw vulnerability alert findings catalog",
      "HTTP request/response logs exhibiting unexpected behavior or error leaks",
      "Candidate security flaws requiring manual confirmation"
    ],
    safetyAndScopePrecautions: [
      "Use only benign testing strings (`'\"<test>`, `SLEEP(3)`); never use destructive payloads (`DROP TABLE`, `rm -rf`)",
      "Immediately pause testing if application displays instability or database errors"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Native Scanner Engine & Nuclei Tool Adapter",
      actionDescription: "Performs real passive and active security checks against verified in-scope targets."
    }
  },
  {
    stageNumber: 6,
    name: "Manual Validation & False-Positive Elimination",
    category: "Verification",
    objective: "Manually verify every automated finding to eliminate false positives, understand root cause mechanisms, and confirm genuine exploitability.",
    inputs: [
      "Raw findings catalog generated in Stage 5",
      "HTTP proxy logs and server response payloads"
    ],
    activities: [
      "Reproduce scanner findings manually via repeater/curl to eliminate timing anomalies",
      "Verify whether reflected characters are actually executable or safely context-encoded by the browser",
      "Test boundary conditions: compare boolean true vs boolean false queries",
      "Filter out harmless version banner disclosures that lack actual exploitable functionality"
    ],
    toolsUsed: ["curl", "Burp Suite Repeater", "Browser DevTools", "AppSec Nexus Findings Manager"],
    expectedOutputs: [
      "Vetted, confirmed vulnerability findings register (100% false-positive free)",
      "Precise HTTP curl reproduction commands for each confirmed flaw",
      "Detailed notes on observed server reactions and defensive evasion"
    ],
    safetyAndScopePrecautions: [
      "Never report an unverified scanner finding as a confirmed vulnerability"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Finding Management & Validation Console",
      actionDescription: "Allows marking findings as Verified, False Positive, or Remediated with notes."
    }
  },
  {
    stageNumber: 7,
    name: "Controlled Proof-of-Concept & Impact Assessment",
    category: "Exploitation",
    objective: "Demonstrate the real-world business impact of confirmed vulnerabilities through minimal, non-destructive proofs-of-concept without disrupting operations.",
    inputs: [
      "Confirmed vulnerabilities from Stage 6"
    ],
    activities: [
      "Demonstrate data access: extract current database user (`SELECT current_user`) rather than dumping customer tables",
      "Demonstrate privilege escalation: access restricted admin settings page without modifying configurations",
      "Demonstrate IDOR: access a designated second test account owned by the tester",
      "Calculate CVSS v3.1 base and environmental metrics based on verified technical metrics"
    ],
    toolsUsed: ["Controlled Python Scripts", "Browser Sessions", "AppSec Nexus CVSS Calculator"],
    expectedOutputs: [
      "Photographic and textual proof-of-concept evidence",
      "Calculated CVSS v3.1 score and vector string",
      "Clear business impact narrative explaining real-world attacker consequences"
    ],
    safetyAndScopePrecautions: [
      "Strictly prohibit mass data dumping, ransomware simulation, or permanent record deletion",
      "Immediately notify emergency contact if discovering a Critical vulnerability (e.g. Unauthenticated RCE)"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Finding Detail & Severity Scoring",
      actionDescription: "Records CVSS scores, remediation suggestions, and evidence descriptions."
    }
  },
  {
    stageNumber: 8,
    name: "Reporting & Remediation Guidance",
    category: "Documentation",
    objective: "Author a comprehensive, professional penetration testing report containing both an Executive Summary for leadership and detailed technical remediation for engineers.",
    inputs: [
      "Verified findings, PoC logs, and CVSS scores from Stage 7"
    ],
    activities: [
      "Draft Executive Summary: high-level risk radar, strategic security posture, and business risk analysis",
      "Draft Technical Findings: title, severity, CVSS vector, CWE ID, affected endpoint, step-by-step reproduction, and impact",
      "Author tailored remediation guidance: provide secure code snippets and configuration hardening instructions",
      "Conduct findings debrief presentation with engineering and executive stakeholders"
    ],
    toolsUsed: ["Markdown / PDF Exporters", "AppSec Nexus Report Exporter"],
    expectedOutputs: [
      "Final Penetration Testing Report (PDF / Markdown)",
      "Executive presentation slide deck",
      "Raw findings export (JSON / CSV) for import into Jira / issue trackers"
    ],
    safetyAndScopePrecautions: [
      "Deliver the report strictly over encrypted channels (PGP or password-protected encrypted archives)",
      "Redact any sensitive customer PII that was inadvertently observed during testing"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Finding Export & Markdown Summary Generation",
      actionDescription: "Generates structured export files containing full scan results and finding matrices."
    }
  },
  {
    stageNumber: 9,
    name: "Remediation & Defensive Hardening",
    category: "Engineering Collaboration",
    objective: "Assist engineering teams in implementing root-cause architectural fixes, secure coding practices, and defensive controls.",
    inputs: [
      "Final Penetration Testing Report and developer ticket backlog"
    ],
    activities: [
      "Refactor vulnerable code to use parameterized queries and context-aware output encoding",
      "Implement robust server-side authorization checks comparing user tenant ID to requested object ID",
      "Deploy defense-in-depth controls: Content Security Policy, rate limiting, and WAF rules",
      "Add automated regression unit tests in CI/CD pipeline to prevent vulnerability recurrence"
    ],
    toolsUsed: ["Semgrep SAST", "Git / GitHub Pull Requests", "AppSec Nexus Academy Guides"],
    expectedOutputs: [
      "Merged pull requests with code fixes",
      "Updated deployment manifests with security header hardening",
      "Passing automated CI/CD security regression test suites"
    ],
    safetyAndScopePrecautions: [
      "Test all security patches thoroughly in staging environments prior to production deployment"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Vulnerability Encyclopedia Secure Code Snippets",
      actionDescription: "Provides side-by-side vulnerable vs secure code fixes across multiple languages."
    }
  },
  {
    stageNumber: 10,
    name: "Retesting & Attestation of Closure",
    category: "Verification & Sign-off",
    objective: "Re-execute all original testing procedures against patched systems to verify that vulnerabilities have been genuinely resolved without introducing new regressions.",
    inputs: [
      "Original penetration test findings report",
      "Developer remediation notes and deployed patch release version"
    ],
    activities: [
      "Re-run the exact curl commands and payloads used during original exploit validation",
      "Test potential bypasses around new validation logic to ensure the fix is robust",
      "Confirm that previously reported vulnerabilities return 401/403 or safely sanitized responses",
      "Issue a formal Letter of Attestation or Updated Penetration Testing Report with findings marked 'Resolved'"
    ],
    toolsUsed: ["AppSec Nexus Active Scanner", "curl", "Burp Suite Repeater"],
    expectedOutputs: [
      "Retest Verification Report",
      "Updated vulnerability registry with verified 'Closed' statuses",
      "Formal Attestation of Clean Security Posture for compliance audits"
    ],
    safetyAndScopePrecautions: [
      "Ensure retesting is performed only against the updated target release version"
    ],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "One-Click Rescan & Status Update",
      actionDescription: "Re-runs specific vulnerability checks and updates finding status to 'Remediated'."
    }
  }
];

export const WEB_API_TESTING_WORKFLOW: WorkflowStage[] = [
  {
    stageNumber: 1,
    name: "Attack Surface Mapping & Endpoint Discovery",
    category: "Reconnaissance & Routing",
    objective: "Discover all reachable HTTP/HTTPS routes, REST endpoints, GraphQL schemas, WebSocket paths, and hidden administrative interfaces.",
    inputs: ["Authorized target base URL and API gateway addresses"],
    activities: [
      "Spider application web pages using headless browser crawlers",
      "Inspect robots.txt, sitemap.xml, and client-side JavaScript bundle files (webpack sourcemaps)",
      "Download and parse OpenAPI / Swagger JSON specifications (/v2/api-docs, /openapi.json)",
      "Fuzz for hidden API versions (/api/v1 vs /api/v2) and administrative routes (/admin, /internal)"
    ],
    toolsUsed: ["AppSec Nexus Web Crawler", "httpx", "ffuf", "Postman"],
    expectedOutputs: ["Complete endpoint routing tree", "Parsed OpenAPI route specification", "Parameter inventory"],
    safetyAndScopePrecautions: ["Set crawler depth and rate limits to prevent overloading test servers"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Native Endpoint Crawler & Discovered Endpoints Console",
      actionDescription: "Crawls live targets and populates discovered endpoints with HTTP methods."
    }
  },
  {
    stageNumber: 2,
    name: "Authentication & Password Mechanics",
    category: "Identity & Access",
    objective: "Evaluate the strength, resilience, and security of user authentication mechanisms across all access tiers.",
    inputs: ["Login routes, registration endpoints, password reset mechanisms, and MFA prompts"],
    activities: [
      "Test password complexity enforcement and credential stuffing resistance",
      "Verify rate limiting and account lockout after repeated failed login attempts",
      "Audit password reset flows for token predictability, lack of expiration, or host header poisoning",
      "Test Multi-Factor Authentication (MFA) bypasses via direct endpoint access or parameter tampering"
    ],
    toolsUsed: ["Burp Suite Intruder", "AppSec Nexus Active Scanner", "OWASP ZAP"],
    expectedOutputs: ["Authentication assessment report", "Brute-force resistance scorecard", "MFA validation proof"],
    safetyAndScopePrecautions: ["Do not lock out real client operational accounts during brute force testing"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Active Scanner Authentication Probes",
      actionDescription: "Tests for lack of rate limiting and default credential vulnerabilities."
    }
  },
  {
    stageNumber: 3,
    name: "Authorization & Access Control (BOLA/BFLA)",
    category: "Access Enforcement",
    objective: "Verify that users cannot access resources belonging to other tenants (Horizontal Privilege Escalation) or administrative functions (Vertical Privilege Escalation).",
    inputs: ["Two test user accounts with standard privileges (User A, User B) and one administrator account"],
    activities: [
      "Capture requests from User A, replace object IDs with User B's IDs, and inspect responses (BOLA/IDOR)",
      "Attempt direct browsing to administrative API routes (`/api/v1/admin/users`) using standard user credentials (BFLA)",
      "Test HTTP method substitution: replace `GET /api/users/1` with `DELETE` or `PUT`",
      "Test tenant isolation in multi-tenant SaaS environments"
    ],
    toolsUsed: ["Postman", "Burp Suite Match/Replace", "curl"],
    expectedOutputs: ["Access control matrix with verified authorization boundary violations"],
    safetyAndScopePrecautions: ["Perform IDOR tampering only between accounts created specifically for testing"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Interactive BOLA/IDOR Guided Lab & Encyclopedia Entry",
      actionDescription: "Provides interactive step-by-step guidance on testing and remediating BOLA flaws."
    }
  },
  {
    stageNumber: 4,
    name: "Input Validation & Boundary Testing",
    category: "Input Handling",
    objective: "Test how backend controllers handle malformed, unexpected, oversized, or boundary-violating input data.",
    inputs: ["All query parameters, POST JSON fields, and HTTP headers"],
    activities: [
      "Submit oversized payloads (10MB JSON strings) to test for memory exhaustion denial of service",
      "Submit unexpected data types: strings where integers are expected, arrays where primitives are expected",
      "Test null byte injection (`%00`), Unicode normalization, and CRLF line break injection",
      "Inspect HTTP response status codes: ensure unhandled 500 Internal Server Errors with stack traces are flagged"
    ],
    toolsUsed: ["AppSec Nexus Active Scanner", "ffuf", "Custom Python fuzzer"],
    expectedOutputs: ["Data validation boundary analysis", "Discovered application exceptions and stack trace logs"],
    safetyAndScopePrecautions: ["Ensure fuzzed inputs do not corrupt persistent database tables"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Native Active Scanner Fuzzing Engine",
      actionDescription: "Injects malformed boundary vectors and analyzes HTTP response codes and latencies."
    }
  },
  {
    stageNumber: 5,
    name: "Injection Testing (SQLi, NoSQLi, Command Injection)",
    category: "Data & Code Execution",
    objective: "Probe all user-supplied inputs to determine if they are passed unescaped to interpreters, databases, or operating system shells.",
    inputs: ["All dynamic search parameters, filter queries, orderby clauses, and backend command fields"],
    activities: [
      "Inject SQL syntax delimiters (`'`, `\"`, `/*`) and observe database syntax errors",
      "Perform boolean and time-based blind SQLi probes (`AND 1=1`, `pg_sleep(3)`)",
      "Test NoSQL injection: submit JSON operator objects (`{\"$gt\": \"\"}`) into MongoDB query fields",
      "Test OS command injection: submit command chaining characters (`|`, `&`, `;`, `` ` ``) followed by `id` or `whoami`"
    ],
    toolsUsed: ["AppSec Nexus SQLi Scanner", "sqlmap", "Nuclei injection templates"],
    expectedOutputs: ["Verified injection findings with evidence logs and database version extractions"],
    safetyAndScopePrecautions: ["Use only read-only syntax tests; never run DROP, UPDATE, or DELETE commands"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Native Injection Scanner Engine",
      actionDescription: "Runs non-destructive SQLi and OS command injection checks directly against target URLs."
    }
  },
  {
    stageNumber: 6,
    name: "Session Security, Cookies & Token Management",
    category: "State Management",
    objective: "Audit how the application tracks authenticated state across multiple requests and evaluates session termination.",
    inputs: ["Set-Cookie headers, JWT Bearer tokens, and session renewal flows"],
    activities: [
      "Verify cookie security attributes: `Secure`, `HttpOnly`, and `SameSite` (Lax or Strict)",
      "Test session fixation: verify session ID changes upon successful authentication",
      "Test session termination: verify tokens are truly invalidated on server side upon logout",
      "Audit JWT tokens: test `alg: none` signature bypass, algorithm confusion (RS256 vs HS256), and secret brute-forcing"
    ],
    toolsUsed: ["AppSec Nexus Header Scanner", "jwt_tool", "Browser DevTools"],
    expectedOutputs: ["Cookie security scorecard", "JWT cryptographic validation report", "Session lifecycle log"],
    safetyAndScopePrecautions: ["Never test JWT brute forcing with production production user tokens in public online tools"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Cookie & Header Passive Scanner",
      actionDescription: "Automatically flags missing Secure, HttpOnly, and SameSite cookie flags."
    }
  },
  {
    stageNumber: 7,
    name: "Server-Side Vulnerabilities (SSRF, XXE, Deserialization)",
    category: "Server Infrastructure",
    objective: "Discover vulnerabilities where the server processes dangerous data formats or performs unauthorized internal network requests.",
    inputs: ["URL import features, webhook configurations, XML endpoints, and serialized object payloads"],
    activities: [
      "Test SSRF by supplying internal loopback URLs (`http://127.0.0.1`) and cloud metadata endpoints (`http://169.254.169.254`)",
      "Test XML External Entity (XXE) injection by submitting DTD entities (`<!ENTITY xxe SYSTEM \"file:///etc/passwd\">`)",
      "Test insecure deserialization in Java, Python (pickle), PHP, and Node.js serialization formats",
      "Test Server-Side Template Injection (SSTI) using polyglot expressions (`{{7*7}}`, `${7*7}`)"
    ],
    toolsUsed: ["Interactsh", "Burp Collaborator", "AppSec Nexus SSRF Engine"],
    expectedOutputs: ["Verified SSRF out-of-band interaction logs", "XXE file disclosure proof-of-concept"],
    safetyAndScopePrecautions: ["Do not attempt to pivot or scan internal production subnets without explicit permission"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Server-Side Flaw Encyclopedia & Lab Walkthroughs",
      actionDescription: "Provides dedicated encyclopedia definitions and safe guided labs for SSRF and XXE."
    }
  },
  {
    stageNumber: 8,
    name: "Business Logic & Workflow Integrity",
    category: "Application Logic",
    objective: "Identify flaws where an attacker can violate business rules, bypass payment amounts, or exploit race conditions.",
    inputs: ["Multi-step workflows: e-commerce checkout, coupon redemption, money transfers, password resets"],
    activities: [
      "Test parameter tampering on price or quantity fields (`quantity: -1` or `price: 0.01`)",
      "Test step-skipping: complete payment step before selecting items, or jump directly to confirmation URL",
      "Test race conditions: submit simultaneous concurrent requests to redeem a single-use coupon multiple times",
      "Audit business limit enforcement: verify withdrawal cannot exceed account balance"
    ],
    toolsUsed: ["Burp Suite Repeater (Turbo Intruder)", "curl parallel scripts"],
    expectedOutputs: ["Business logic flaw reproduction walkthroughs", "Financial integrity risk assessment"],
    safetyAndScopePrecautions: ["Perform logic testing using test credit cards and test currency in sandbox environments"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Curriculum Level 7 & 8 Business Logic Modules",
      actionDescription: "Teaches multi-step business logic flaw discovery with real-world case studies."
    }
  },
  {
    stageNumber: 9,
    name: "API-Specific Risks (Mass Assignment, Rate Limits, Schema Violations)",
    category: "API Architecture",
    objective: "Audit risks unique to modern REST, GraphQL, and microservice APIs documented in the OWASP API Security Top 10.",
    inputs: ["JSON request payloads, GraphQL endpoints (`/graphql`), and API gateway headers"],
    activities: [
      "Test Mass Assignment: add internal model properties (`role: admin`, `balance: 9999`) to profile update requests",
      "Test Excessive Data Exposure: inspect API JSON responses for sensitive fields hidden in frontend UI",
      "Test GraphQL Introspection: download full GraphQL schema if `__schema` query is enabled in production",
      "Test GraphQL Denial of Service via circular/nested queries (`author { posts { author { posts ... } } }`)"
    ],
    toolsUsed: ["GraphQL Voyager", "Postman", "AppSec Nexus Active API Probes"],
    expectedOutputs: ["API Security Top 10 compliance audit", "GraphQL schema exposure risk", "Mass assignment report"],
    safetyAndScopePrecautions: ["Do not execute deep circular GraphQL queries that could crash production database nodes"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "API Security Track (Level 8) & Tools Adapter",
      actionDescription: "Dedicated curriculum and tool adapters for testing and securing API architectures."
    }
  },
  {
    stageNumber: 10,
    name: "Security Configuration & Deployment Hardening",
    category: "Configuration & Transport",
    objective: "Audit transport layer encryption, HTTP security headers, CORS policies, and server deployment configurations.",
    inputs: ["Server response headers, TLS handshake parameters, error pages, and CORS preflight options"],
    activities: [
      "Audit HTTP security headers: HSTS, Content-Security-Policy, X-Content-Type-Options, Referrer-Policy",
      "Audit CORS configuration: test whether arbitrary `Origin` headers are reflected with credentials enabled",
      "Inspect TLS configuration: check for deprecated TLS 1.0/1.1 protocols and weak cipher suites",
      "Check for directory listing, exposed `.git` directories, and default server landing pages"
    ],
    toolsUsed: ["AppSec Nexus Security Header Scanner", "testssl.sh", "curl"],
    expectedOutputs: ["Security header grade and scorecard", "CORS vulnerability report", "TLS cipher audit log"],
    safetyAndScopePrecautions: ["Verify that cipher checking does not trigger IDS network throttling"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Native Security Header & TLS Scanner",
      actionDescription: "Directly audits and scores HTTP security headers against OWASP secure baselines."
    }
  },
  {
    stageNumber: 11,
    name: "Source-Code Review & SAST Correlation",
    category: "White-Box Analysis",
    objective: "Correlate dynamic penetration test findings with static source code analysis to locate exact vulnerable code lines and systemic flaws.",
    inputs: ["Application source code repository, build files, and dependency manifests"],
    activities: [
      "Execute automated SAST rules using Semgrep across application codebase",
      "Trace untrusted user inputs from source (HTTP request parameter) to sink (SQL query, innerHTML, shell_exec)",
      "Audit third-party dependencies for known vulnerabilities using Software Composition Analysis (SCA)",
      "Review configuration files and secret management patterns (checking for hardcoded API keys)"
    ],
    toolsUsed: ["Semgrep SAST", "OSV-Scanner", "AppSec Nexus Android/Windows Auditor"],
    expectedOutputs: ["SAST finding report with exact file and line number citations", "SCA dependency vulnerability list"],
    safetyAndScopePrecautions: ["Ensure source code is reviewed in secure, isolated development workstations"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Android Manifest SAST Auditor & Windows Host Auditor",
      actionDescription: "Native Rust analyzers inspect local Windows configurations and Android APK manifests."
    }
  },
  {
    stageNumber: 12,
    name: "Remediation Verification & Retesting",
    category: "Closure & Governance",
    objective: "Verify that all discovered web and API security vulnerabilities have been thoroughly remediated without introducing regressions.",
    inputs: ["Original penetration testing findings registry and deployed software patch version"],
    activities: [
      "Re-execute the exact HTTP requests and payloads that previously triggered vulnerabilities",
      "Verify that parameterized queries, output encoding, and authorization checks are functioning properly",
      "Verify that error messages no longer leak database stack traces or internal server paths",
      "Issue formal updated security finding status and updated executive risk summary"
    ],
    toolsUsed: ["AppSec Nexus Scanner", "curl", "Postman"],
    expectedOutputs: ["Retest Verification Matrix", "Attestation of Vulnerability Remediation"],
    safetyAndScopePrecautions: ["Verify retesting is conducted against the intended target environment and build version"],
    appsecNexusIntegration: {
      isSupported: true,
      featureName: "Finding Status Workflow & One-Click Rescan",
      actionDescription: "Allows immediate verification of fixes with direct status toggling in the Findings table."
    }
  }
];
