import { ConceptEntry } from "../types";

export const CONCEPT_LIBRARY: ConceptEntry[] = [
  // ==========================================
  // DOMAIN 1: CYBERSECURITY FUNDAMENTALS & ADVANCED
  // ==========================================
  {
    id: "concept-cia-triad",
    name: "The CIA Triad (Confidentiality, Integrity, Availability)",
    domain: "cybersecurity",
    difficulty: "beginner",
    definition: "The foundational model in information security consisting of Confidentiality (preserving authorized restrictions on access), Integrity (guarding against improper modification or destruction), and Availability (ensuring timely, reliable access).",
    purpose: "Provides a universal benchmark for evaluating organizational risk, classifying assets, and prioritizing defensive countermeasures across all technical systems.",
    prerequisites: ["None - Foundational Entry Point"],
    technicalExplanation: "Confidentiality ensures that sensitive data in transit, at rest, and in use cannot be intercepted by unauthorized parties (enforced via AES-256 encryption, TLS, RBAC). Integrity guarantees that data has not been altered, tampered with, or corrupted (enforced via SHA-256 HMACs, digital signatures, blockchain ledgers, and database foreign key constraints). Availability guarantees that infrastructure and services remain reachable and functional during hardware failures, software crashes, network congestion, or DDoS attacks (enforced via load balancing, geographic redundancy, disaster recovery failover, and rate limiting).",
    examples: [
      {
        scenario: "Confidentiality Breach",
        codeOrConfig: "SELECT * FROM users WHERE ssn IS NOT NULL; -- exposed over unencrypted HTTP",
        explanation: "Unencrypted transmission of Social Security Numbers allows passive network eavesdroppers to harvest sensitive PII."
      },
      {
        scenario: "Integrity Violation",
        codeOrConfig: "UPDATE balances SET amount = 999999 WHERE account_id = 42; -- lacking HMAC or audit signature",
        explanation: "A malicious insider directly alters database records without cryptographic audit proofs, fabricating financial assets."
      },
      {
        scenario: "Availability Degradation",
        codeOrConfig: "SYN Flood: 1,000,000 TCP SYN packets per second to port 443 with spoofed source IPs",
        explanation: "Exhausts the server's TCP connection backlog queue, preventing legitimate customers from completing the TLS handshake."
      }
    ],
    practicalApplications: [
      "Asset risk assessment and data classification matrices in ISO 27001 / SOC 2 audits",
      "Designing disaster recovery (DR) Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)",
      "Evaluating cloud vendor shared responsibility models"
    ],
    relatedConceptIds: ["concept-defense-in-depth", "concept-cryptography", "concept-threat-modeling"],
    commonMistakes: [
      "Assuming encryption automatically guarantees integrity (unauthenticated AES-CBC is malleable without an HMAC or GCM tag)",
      "Focusing exclusively on confidentiality while neglecting availability during DDoS mitigation planning",
      "Treating CIA as an all-or-nothing boolean rather than a spectrum of risk tolerance"
    ],
    learningResources: [
      {
        title: "NIST SP 800-12 Rev. 1: An Introduction to Information Security",
        url: "https://csrc.nist.gov/publications/detail/sp/800-12/rev-1/final",
        type: "standard",
        isOfficial: true
      },
      {
        title: "IETF RFC 4949: Internet Security Glossary, Version 2",
        url: "https://datatracker.ietf.org/doc/html/rfc4949",
        type: "rfc",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-311", "CWE-353", "CWE-400"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-defense-in-depth",
    name: "Defense-in-Depth & Zero Trust Architecture",
    domain: "cybersecurity",
    difficulty: "intermediate",
    definition: "A security design strategy employing multiple layered defenses such that if one layer fails, subsequent layers prevent total compromise, combined with Zero Trust principles ('never trust, always verify').",
    purpose: "Eliminates single points of security failure and rejects the outdated perimeter-security model where internal network traffic was implicitly trusted.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "Defense-in-depth establishes independent security controls across Physical, Network, Host, Application, and Data layers. In a modern web application, this means: (1) Network Layer: WAF with strict geo/IP reputation; (2) Transport Layer: TLS 1.3 with mTLS for internal microservices; (3) Application Layer: Strong authentication (FIDO2 WebAuthn), fine-grained RBAC, and contextual input validation; (4) Database Layer: Parameterized queries, column-level AES encryption, and least-privilege DB credentials. Zero Trust enforces explicit authentication and authorization on EVERY request regardless of whether the packet originated from the internet or the internal VPC.",
    examples: [
      {
        scenario: "Layered Defense Against SQLi Exploitation",
        codeOrConfig: "Layer 1: Cloudflare WAF blocks obvious SQL keywords ('UNION SELECT')\nLayer 2: Application uses parameterized PDO queries\nLayer 3: MySQL user 'app' only has SELECT, INSERT permissions (NO DROP, NO FILE)\nLayer 4: DB runs in isolated subnet with egress firewall rules",
        explanation: "Even if an attacker discovers an esoteric SQLi bypass past the WAF, parameterized queries prevent execution. If a developer accidentally writes raw SQL, the limited DB privileges prevent system takeover or remote shell."
      }
    ],
    practicalApplications: [
      "Microsegmentation of Kubernetes clusters using Calico network policies",
      "Implementing BeyondCorp-style identity-aware reverse proxies",
      "Designing multi-stage CI/CD security gating"
    ],
    relatedConceptIds: ["concept-cia-triad", "concept-role-based-access", "concept-devsecops-guardrails"],
    commonMistakes: [
      "Relying on a WAF as the sole defense while leaving vulnerable application code unpatched",
      "Assuming VPN connection implies an authenticated and trustworthy client state",
      "Neglecting egress filtering, allowing compromised servers to phone home freely"
    ],
    learningResources: [
      {
        title: "NIST SP 800-207: Zero Trust Architecture",
        url: "https://csrc.nist.gov/publications/detail/sp/800-207/final",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedMitre: ["TA0005", "TA0011"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-cryptography",
    name: "Asymmetric Cryptography & Public Key Infrastructure (PKI)",
    domain: "cybersecurity",
    difficulty: "intermediate",
    definition: "A cryptographic system using mathematically linked keypairs: a Public Key (distributed openly for encryption or signature verification) and a Private Key (kept strictly secret for decryption or signature generation).",
    purpose: "Enables secure communication over untrusted channels without requiring prior shared secret distribution, providing non-repudiation and identity verification.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "Asymmetric algorithms (RSA-3072, ECC SECP256R1, Ed25519) rely on one-way trapdoor mathematical functions (discrete logarithms, elliptic curve point multiplication, prime factorization). In TLS handshakes, asymmetric key exchange (ECDHE) negotiates an ephemeral symmetric session key (AES-256-GCM or ChaCha20-Poly1305), optimizing CPU performance while maintaining Perfect Forward Secrecy (PFS). PKI provides hierarchical trust via Certificate Authorities (CAs) that sign X.509 digital certificates binding a domain name to a public key.",
    examples: [
      {
        scenario: "Digital Signature Verification",
        codeOrConfig: "openssl dgst -sha256 -sign private.key -out payload.sig payload.bin\nopenssl dgst -sha256 -verify public.key -signature payload.sig payload.bin",
        explanation: "Ensures the payload originated authentically from the private key holder and has not been altered by even a single byte."
      }
    ],
    practicalApplications: [
      "TLS/HTTPS website identity verification and traffic encryption",
      "SSH key-based remote server authentication without passwords",
      "Code signing for desktop binaries (.exe, .deb) and mobile apps (.apk)"
    ],
    relatedConceptIds: ["concept-cia-triad", "concept-jwt-security"],
    commonMistakes: [
      "Hardcoding private keys inside client application repositories or Docker images",
      "Disabling certificate revocation checking (OCSP / CRL) in HTTP clients",
      "Using deprecated algorithms like RSA 1024-bit or MD5/SHA-1 for signatures"
    ],
    learningResources: [
      {
        title: "IETF RFC 5280: Internet X.509 Public Key Infrastructure Certificate and CRL Profile",
        url: "https://datatracker.ietf.org/doc/html/rfc5280",
        type: "rfc",
        isOfficial: true
      }
    ],
    linkedTools: ["wireshark", "testssl.sh"],
    linkedCwe: ["CWE-327", "CWE-347"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-threat-modeling",
    name: "Threat Modeling & STRIDE Methodology",
    domain: "cybersecurity",
    difficulty: "intermediate",
    definition: "A proactive engineering procedure for identifying potential threats, vulnerabilities, and attack vectors in an architecture before code is written, categorized using STRIDE.",
    purpose: "Identifies systemic design flaws early in the software development lifecycle when they are 100x cheaper to fix than post-production incident response.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "STRIDE categorizes threats into: Spoofing (violates authenticity), Tampering (violates integrity), Repudiation (violates non-repudiation), Information Disclosure (violates confidentiality), Denial of Service (violates availability), and Elevation of Privilege (violates authorization). Threat modeling decomposes a system into Data Flow Diagrams (DFDs) highlighting Processes, Data Stores, Data Flows, and Trust Boundaries (e.g. crossing from user browser to reverse proxy).",
    examples: [
      {
        scenario: "STRIDE Analysis of Password Reset Flow",
        codeOrConfig: "Trust Boundary: Public Internet -> Reset API\nThreat (Information Disclosure): Timing attack on /api/forgot-password leaks whether an email exists.\nThreat (Tampering): Reset token lacks digital signature, allowing brute-forcing.\nMitigation: Return identical 200 OK responses regardless of email existence; use cryptographically secure 256-bit random tokens with 15-minute expiration.",
        explanation: "Systematic analysis prevents account takeover logic flaws prior to API deployment."
      }
    ],
    practicalApplications: [
      "Architecture design reviews in DevSecOps pipelines",
      "Compliance audit readiness for SOC 2 Type II and ISO 27001",
      "Scoping focused penetration testing efforts on highest-risk components"
    ],
    relatedConceptIds: ["concept-cia-triad", "concept-defense-in-depth"],
    commonMistakes: [
      "Treating threat modeling as a one-time exercise rather than updating it during major refactors",
      "Analyzing code syntax instead of system data flows and trust boundaries",
      "Failing to track identified threats in the engineering backlog"
    ],
    learningResources: [
      {
        title: "OWASP Threat Modeling Project",
        url: "https://owasp.org/www-community/Threat_Modeling",
        type: "standard",
        isOfficial: true
      }
    ],
    capabilityType: "educational_only"
  },

  // ==========================================
  // DOMAIN 2: ETHICAL HACKING & METHODOLOGIES
  // ==========================================
  {
    id: "concept-rules-of-engagement",
    name: "Rules of Engagement (RoE) & Legal Authorization",
    domain: "ethical_hacking",
    difficulty: "beginner",
    definition: "A formal, legally binding bilateral contract that authorizes security testers to perform security assessments against specified target systems under strict parameters, timelines, and boundaries.",
    purpose: "Distinguishes legal ethical hacking from illegal cybercrime (e.g. Computer Fraud and Abuse Act in the US, Computer Misuse Act in the UK), protecting both tester and organization.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "A valid RoE document defines: (1) Explicit target scope (specific IP addresses, CIDR blocks, domains, and API endpoints); (2) Excluded targets (third-party payment gateways, production mainframes, staging environments); (3) Permitted testing techniques (passive OSINT, active scanning, manual exploitation); (4) Prohibited actions (denial-of-service, physical break-in, social engineering of employees, permanent data alteration); (5) Testing time windows (e.g., weekends 02:00-06:00 UTC); (6) Emergency contact chain and safe stop thresholds; (7) Data handling and encryption protocols for proof-of-concept evidence.",
    examples: [
      {
        scenario: "Scope Boundary Enforcement",
        codeOrConfig: "In-Scope: *.api.example.com (IPs: 203.0.113.10-20)\nOut-of-Scope: auth.example.com (Hosted by Auth0/Okta SaaS)\nOut-of-Scope: /api/v1/payments/* (Live Stripe Gateway)",
        explanation: "Targeting out-of-scope third-party SaaS without their explicit written authorization violates vendor terms of service and federal computer crime laws."
      }
    ],
    practicalApplications: [
      "Drafting Master Services Agreements (MSA) and Statements of Work (SOW) for commercial penetration tests",
      "Reviewing Bug Bounty program policies (e.g. HackerOne, Bugcrowd Safe Harbor provisions)",
      "Internal red team exercise governance"
    ],
    relatedConceptIds: ["concept-reconnaissance", "concept-pentest-reporting"],
    commonMistakes: [
      "Starting testing before all authorized signatures have been legally executed",
      "Scanning an AWS/Azure IP that was recycled to another customer due to dynamic cloud reassignment",
      "Failing to immediately notify the client when discovering a critical pre-existing breach indicator"
    ],
    learningResources: [
      {
        title: "NIST SP 800-115: Technical Guide to Information Security Testing and Assessment",
        url: "https://csrc.nist.gov/publications/detail/sp/800-115/final",
        type: "standard",
        isOfficial: true
      }
    ],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-reconnaissance",
    name: "Passive Reconnaissance vs Active Enumeration",
    domain: "ethical_hacking",
    difficulty: "intermediate",
    definition: "The initial intelligence-gathering phase of penetration testing, split into Passive Recon (gathering OSINT without directly touching target infrastructure) and Active Enumeration (interacting directly with target ports and endpoints).",
    purpose: "Constructs an exhaustive map of the target's attack surface, identifying forgotten subdomains, exposed admin consoles, legacy servers, and technology stack components.",
    prerequisites: ["concept-rules-of-engagement"],
    technicalExplanation: "Passive reconnaissance interrogates public third-party databases: Certificate Transparency (crt.sh), DNS records (SecurityTrails, Censys), WHOIS, search engine dorking, GitHub leaked secrets, and Shodan/Censys indexed banners. The target host generates zero server logs because no packets are sent to their IPs. Active enumeration initiates direct network connections: SYN port scanning (Nmap), HTTP web spidering (AppSec Nexus Crawler), directory brute-forcing (ffuf), TLS cipher checks (testssl.sh), and DNS zone transfer requests.",
    examples: [
      {
        scenario: "Passive Intelligence Discovery",
        codeOrConfig: "curl -s \"https://crt.sh/?q=%25.targetcorp.com&output=json\" | jq '.[].name_value' | sort -u",
        explanation: "Discovers forgotten staging subdomains (`dev-auth.targetcorp.com`, `vpn-legacy.targetcorp.com`) without sending a single packet to the company's servers."
      },
      {
        scenario: "Controlled Active Enumeration",
        codeOrConfig: "nmap -sS -p 80,443,8080,8443 --script http-title,ssl-cert 203.0.113.50",
        explanation: "Directly queries target ports to identify running web services and TLS certificate details."
      }
    ],
    practicalApplications: [
      "External attack surface management (EASM)",
      "Pre-engagement threat modeling for red teams",
      "Locating shadow IT and orphaned cloud storage buckets"
    ],
    relatedConceptIds: ["concept-rules-of-engagement", "concept-exploit-validation"],
    commonMistakes: [
      "Running aggressive multi-threaded scans without rate limiting, triggering target WAF bans or crashing fragile legacy daemons",
      "Relying solely on automated sublist tools without manual DNS permutation testing",
      "Failing to document discovered IPs against the approved scoping list"
    ],
    learningResources: [
      {
        title: "OWASP WSTG-INFO-01: Conduct Search Engine Discovery Reconnaissance for Information Leakage",
        url: "https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/01-Information_Gathering/01-Conduct_Search_Engine_Discovery_Reconnaissance_for_Information_Leakage",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedTools: ["nmap", "httpx", "nuclei"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-exploit-validation",
    name: "Controlled Proof-of-Concept vs Denial of Service",
    domain: "ethical_hacking",
    difficulty: "advanced",
    definition: "The ethical practice of validating discovered vulnerabilities using minimal, non-destructive proofs-of-concept (PoC) to demonstrate business impact without degrading system stability, corrupting data, or triggering downtime.",
    purpose: "Proves that a vulnerability is genuine and exploitable while eliminating operational disruption and respecting customer service-level agreements (SLAs).",
    prerequisites: ["concept-rules-of-engagement", "concept-reconnaissance"],
    technicalExplanation: "Vulnerability scanners frequently produce false positives. The ethical hacker must validate findings through controlled probes: For SQLi, demonstrating `SELECT 1` or calculating `SLEEP(3)` rather than dumping all user tables; for Command Injection, executing `whoami` or `id` rather than destructive file manipulation; for Blind SSRF, pinging a controlled collaborator server (Interactsh) rather than scanning the cloud provider's internal metadata for production AWS credentials. If a test carries risk of data corruption or denial of service, testing MUST be paused and cleared with client management.",
    examples: [
      {
        scenario: "Ethical Validation of RCE",
        codeOrConfig: "Vulnerable Parameter: ?cmd=id\nResponse: uid=33(www-data) gid=33(www-data) groups=33(www-data)\nNext Action: STOP HERE. Screenshot output, capture request/response headers, report immediately.",
        explanation: "Demonstrating command execution with `id` conclusively proves the vulnerability. Attempting privilege escalation to root or installing backdoors on client systems without explicit written instruction is unethical and illegal."
      }
    ],
    practicalApplications: [
      "Producing verifiable evidence logs for penetration test reports",
      "Bug bounty report validation without risk of disqualification",
      "Verifying security patch efficacy in staging environments"
    ],
    relatedConceptIds: ["concept-rules-of-engagement", "concept-pentest-reporting"],
    commonMistakes: [
      "Running automated exploitation tools (`sqlmap --dump-all`) that corrupt database state or fill disk partitions",
      "Claiming a high-severity finding based solely on automated tool output without manual verification",
      "Failing to clean up temporary test accounts or benign uploaded files after testing"
    ],
    learningResources: [
      {
        title: "PTES Exploitation Phase Guidelines",
        url: "http://www.pentest-standard.org/index.php/Exploitation",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedTools: ["nuclei", "burp_suite"],
    capabilityType: "tool_adapter"
  },

  {
    id: "concept-pentest-reporting",
    name: "Penetration Testing Reporting & CVSS v3.1 Scoring",
    domain: "ethical_hacking",
    difficulty: "intermediate",
    definition: "The culmination of a security engagement: a comprehensive document detailing executive risk posture alongside technical findings, reproduction logs, and remediation guidance, scored using CVSS v3.1.",
    purpose: "Translates complex technical exploitation data into actionable business risk decisions for leadership while providing precise remediation blueprints for developers.",
    prerequisites: ["concept-rules-of-engagement", "concept-exploit-validation"],
    technicalExplanation: "A professional penetration test report contains: (1) Executive Summary (business context, overall security posture, high-level risk radar); (2) Scope and Methodology description; (3) Detailed Findings breakdown. Each finding must include: Title, Severity (Critical, High, Medium, Low, Informational), CVSS v3.1 Base Score and Vector (e.g. `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`), CWE ID, Affected URLs/Endpoints, Detailed Walkthrough with raw HTTP dumps, Real-world Impact Scenario, and Actionable Remediation Guidance with secure code examples.",
    examples: [
      {
        scenario: "CVSS Vector Breakdown for Unauthenticated SQLi",
        codeOrConfig: "Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H (Score: 9.8 Critical)\nAV:N = Attack Vector: Network\nAC:L = Attack Complexity: Low\nPR:N = Privileges Required: None\nUI:N = User Interaction: None\nS:U  = Scope: Unchanged\nC:H/I:H/A:H = High Confidentiality, Integrity, and Availability Impact",
        explanation: "Standardized metric ensures both developers and corporate risk officers understand the immediate severity."
      }
    ],
    practicalApplications: [
      "Delivering commercial penetration test reports to enterprise clients",
      "Presenting quarterly security review dashboards to board of directors",
      "Prioritizing engineering remediation sprint backlogs"
    ],
    relatedConceptIds: ["concept-rules-of-engagement", "concept-exploit-validation"],
    commonMistakes: [
      "Delivering raw scanner automated PDF exports without manual analysis or false-positive cleanup",
      "Inflating finding severity to make the report look more impactful",
      "Providing vague remediation advice (e.g. 'Fix input validation') without showing actual parameterized code snippets"
    ],
    learningResources: [
      {
        title: "FIRST CVSS v3.1 Specification and User Guide",
        url: "https://www.first.org/cvss/v3.1/specification-document",
        type: "standard",
        isOfficial: true
      }
    ],
    capabilityType: "native_scanner"
  },

  // ==========================================
  // DOMAIN 3: WEB APPLICATION PENETRATION TESTING
  // ==========================================
  {
    id: "concept-same-origin-policy",
    name: "Same-Origin Policy (SOP) & CORS Misconfigurations",
    domain: "web_pentest",
    difficulty: "intermediate",
    definition: "SOP is the cornerstone of web browser security, preventing scripts loaded from one origin from accessing DOM elements or reading responses from another origin unless explicitly permitted via Cross-Origin Resource Sharing (CORS).",
    purpose: "Prevents malicious websites visited in another tab from reading authenticated session data, banking balances, or private emails from your trusted web services.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "An Origin is defined by the triple: `(Protocol, Domain, Port)`. `https://bank.com:443` is a completely different origin from `http://bank.com` (different protocol) or `https://api.bank.com` (different subdomain). SOP allows cross-origin WRITING (e.g. submitting a POST form or sending an image request), but strictly blocks cross-origin READING of the HTTP response. CORS relaxes this restriction via response headers: `Access-Control-Allow-Origin`. A dangerous misconfiguration occurs when servers blindly reflect the client's `Origin` header (`Access-Control-Allow-Origin: attacker.com`) alongside `Access-Control-Allow-Credentials: true`, completely bypassing SOP.",
    examples: [
      {
        scenario: "Exploiting Insecure CORS Reflection",
        codeOrConfig: "Victim Request from attacker.com:\nGET /api/user/private-data HTTP/1.1\nHost: target.com\nOrigin: https://attacker.com\nCookie: session=secret123\n\nVulnerable Server Response:\nAccess-Control-Allow-Origin: https://attacker.com\nAccess-Control-Allow-Credentials: true",
        explanation: "Because credentials are permitted and the origin was echoed, attacker JavaScript running in the victim's browser can read the full confidential response."
      }
    ],
    practicalApplications: [
      "Securing single-page applications (React/Vue) communicating with multi-domain microservice APIs",
      "Auditing CORS headers during web pentests using AppSec Nexus Header Scanner",
      "Designing secure cross-domain webhooks"
    ],
    relatedConceptIds: ["concept-content-security-policy", "concept-cross-site-scripting"],
    commonMistakes: [
      "Believing CORS protects against Cross-Site Request Forgery (CSRF requests are still executed; only reading the response is blocked)",
      "Using regex with unescaped dots for origin whitelisting (`target.com` matches `targetxcom.evil.com`)",
      "Setting `Access-Control-Allow-Origin: *` while expecting cookie-authenticated sessions to remain private"
    ],
    learningResources: [
      {
        title: "MDN Web Docs: Same-Origin Policy",
        url: "https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy",
        type: "documentation",
        isOfficial: true
      },
      {
        title: "PortSwigger Web Security Academy: CORS Vulnerabilities",
        url: "https://portswigger.net/web-security/cors",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-346", "CWE-942"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-content-security-policy",
    name: "Content Security Policy (CSP) & Defense Against XSS",
    domain: "web_pentest",
    difficulty: "intermediate",
    definition: "An HTTP response header (`Content-Security-Policy`) allowing site administrators to declare approved sources of executable code, images, scripts, styles, and frames that the browser is permitted to load.",
    purpose: "Acts as a primary defense-in-depth mitigation against Cross-Site Scripting (XSS), clickjacking, and data injection attacks by restricting arbitrary script execution.",
    prerequisites: ["concept-same-origin-policy"],
    technicalExplanation: "By default, a strict CSP disables inline script execution (`<script>alert(1)</script>`, `onclick=\"...\"`) and blocks `eval()` execution. Modern robust CSPs utilize cryptographic nonces (`script-src 'nonce-random123'`) or SHA-256 hashes rather than domain whitelists (which are frequently bypassed via open JSONP endpoints or CDN gadget hosting). CSP also prevents clickjacking via `frame-ancestors 'none'` or `frame-ancestors 'self'`. Violation reports can be streamed to a collection endpoint using the `report-uri` or `report-to` directives.",
    examples: [
      {
        scenario: "Robust Cryptographic Nonce CSP",
        codeOrConfig: "Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-EDNnf03nceI1nnq' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none';",
        explanation: "Only scripts possessing the unique, cryptographically random per-request nonce will execute. Injected attacker payloads lack this nonce and are blocked by the browser engine."
      }
    ],
    practicalApplications: [
      "Hardening high-security banking, healthcare, and enterprise portals against XSS",
      "Auditing HTTP headers using AppSec Nexus Passive Scanner",
      "Eliminating clickjacking vulnerabilities without relying on legacy X-Frame-Options"
    ],
    relatedConceptIds: ["concept-same-origin-policy", "concept-cross-site-scripting"],
    commonMistakes: [
      "Including `'unsafe-inline'` or `'unsafe-eval'` in production CSP, which neutralizes XSS protection",
      "Relying on domain whitelists (`script-src https://*.googleapis.com`) without realizing attackers can host malicious scripts on trusted cloud storage",
      "Deploying CSP in `Content-Security-Policy-Report-Only` mode indefinitely without actually enforcing blocking"
    ],
    learningResources: [
      {
        title: "W3C Content Security Policy Level 3 Specification",
        url: "https://www.w3.org/TR/CSP3/",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-79", "CWE-1021"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-sql-injection",
    name: "SQL Injection Mechanisms (In-band, Error, Blind, Out-of-band)",
    domain: "web_pentest",
    difficulty: "intermediate",
    definition: "A severe injection vulnerability occurring when untrusted user input is directly concatenated or interpolated into a SQL database query instead of using parameterized prepared statements.",
    purpose: "Enables unauthorized adversaries to read confidential database records, bypass authentication, modify or delete critical data, and in some configurations execute operating system commands.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "SQLi operates across four distinct technical channels: (1) In-Band / UNION-based: The attacker attaches a `UNION SELECT` statement, and the extracted data is directly visible in the web application's HTML response; (2) Error-Based: The attacker deliberately triggers a database runtime error (e.g. `CAST('abc' AS INT)`) where the error message echoed in the response contains the target data; (3) Boolean-Based Blind: No data or errors are returned, but the application responds differently (HTTP 200 vs 404, or rendering a different UI message) when a condition is true (`AND 1=1`) vs false (`AND 1=2`); (4) Time-Based Blind: The attacker injects sleep statements (`WAITFOR DELAY '0:0:5'`, `pg_sleep(5)`), inferring data character-by-character based on network response latency; (5) Out-of-Band (OOB): Exploits DB DNS or SMB lookups (e.g. `xp_dirtree` or `LOAD_FILE()`) to exfiltrate data via DNS queries to an attacker-controlled server.",
    examples: [
      {
        scenario: "Classic In-Band UNION Injection",
        codeOrConfig: "Vulnerable Code: \"SELECT id, title, content FROM articles WHERE id = \" + req.query.id;\nPayload: ?id=-1 UNION SELECT 1, username, password_hash FROM users--",
        explanation: "By negating the original query with `-1`, the database returns the second record set containing user credentials."
      },
      {
        scenario: "Time-Based Blind SQLi Probe",
        codeOrConfig: "Payload: ?search=shoes' AND (SELECT 1 FROM (SELECT(SLEEP(5)))a)--",
        explanation: "If the HTTP response takes exactly 5+ seconds, the injection is confirmed even with zero output on screen."
      }
    ],
    practicalApplications: [
      "Auditing backend database security during web application penetration testing",
      "Scanning target endpoints using AppSec Nexus Active Injection Engine",
      "Implementing parameterized database layers with ORMs (Prisma, SQLAlchemy, Hibernate)"
    ],
    relatedConceptIds: ["concept-parameterized-queries", "concept-exploit-validation"],
    commonMistakes: [
      "Attempting to sanitize SQL using regex blacklists (stripping `'` or `SELECT`), which can be bypassed with hex encoding, inline comments (`UN/**/ION`), or multi-byte characters",
      "Believing stored procedures are inherently safe (stored procedures using dynamic `sp_executesql` concatenation remain vulnerable)",
      "Relying on client-side input validation"
    ],
    learningResources: [
      {
        title: "OWASP SQL Injection Prevention Cheat Sheet",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedTools: ["sqlmap", "nuclei"],
    linkedCwe: ["CWE-89"],
    linkedMitre: ["T1190"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-cross-site-scripting",
    name: "Cross-Site Scripting (XSS: Stored, Reflected, DOM-Based)",
    domain: "web_pentest",
    difficulty: "intermediate",
    definition: "A vulnerability that occurs when a web application incorporates untrusted user data into a web page without proper contextual output encoding or validation, allowing an attacker to execute arbitrary JavaScript in victim browsers.",
    purpose: "Enables adversaries to hijack authenticated sessions, steal sensitive session tokens/cookies, log keystrokes, perform actions on behalf of the victim, and deliver malware.",
    prerequisites: ["concept-same-origin-policy"],
    technicalExplanation: "XSS manifests in three distinct architectures: (1) Reflected XSS: Malicious script is delivered via a URL parameter or POST body and reflected immediately in the server's HTTP response (requires victim to click a phishing link); (2) Stored XSS: Malicious script is permanently stored in the application's database (e.g. comment forum, user profile bio, invoice line item) and executed every time an unsuspecting user or administrator views the page; (3) DOM-Based XSS: The vulnerability exists entirely on the client side; attacker data flows from a DOM 'source' (e.g. `location.search`, `document.referrer`) to a dangerous DOM 'sink' (e.g. `innerHTML`, `document.write()`, `eval()`) without the server ever seeing the malicious payload.",
    examples: [
      {
        scenario: "DOM-Based XSS via innerHTML Sink",
        codeOrConfig: "const params = new URLSearchParams(window.location.search);\nconst name = params.get('name');\ndocument.getElementById('greeting').innerHTML = 'Hello, ' + name;\n\n// Attacker URL:\nhttps://example.com/welcome?name=<img src=x onerror=alert(document.cookie)>",
        explanation: "The browser parses `<img onerror=...>` as an HTML tag, immediately executing the JavaScript handler."
      }
    ],
    practicalApplications: [
      "Testing web input parameters using AppSec Nexus XSS Scanner",
      "Auditing frontend JavaScript source code using Semgrep SAST",
      "Configuring HttpOnly cookie flags and robust Content Security Policies"
    ],
    relatedConceptIds: ["concept-same-origin-policy", "concept-content-security-policy", "concept-parameterized-queries"],
    commonMistakes: [
      "Using HTML entity encoding inside JavaScript contexts (e.g. `&quot;` inside `<script>var x = '...';</script>` does NOT stop script breakout)",
      "Assuming modern frontend frameworks (React, Angular) prevent all XSS (`dangerouslySetInnerHTML` and `javascript:` URLs in href attributes remain vulnerable)",
      "Failing to set `HttpOnly` on sensitive session cookies"
    ],
    learningResources: [
      {
        title: "OWASP Cross Site Scripting Prevention Cheat Sheet",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-79"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-server-side-request-forgery",
    name: "Server-Side Request Forgery (SSRF) & Cloud Metadata Exploitation",
    domain: "web_pentest",
    difficulty: "advanced",
    definition: "A vulnerability that occurs when a web server fetches a remote resource (e.g. downloading an avatar from a URL, generating a PDF, importing an RSS feed) without validating the user-supplied destination URL.",
    purpose: "Allows an attacker to coerce the server into acting as a proxy to probe internal loopback services (`127.0.0.1`), scan internal RFC 1918 private subnets, access cloud instance metadata services (IMDSv1), and exfiltrate IAM credentials.",
    prerequisites: ["concept-cia-triad", "concept-defense-in-depth"],
    technicalExplanation: "When an application backend takes a URL from user input (`https://api.example.com/fetch?url=http://...`) and invokes an HTTP client library (`fetch`, `curl`, `requests.get()`), the outgoing request originates from the server's own network identity. Attackers supply internal loopback IPs (`http://127.0.0.1:6379` to interact with Redis) or cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/iam/security-credentials/` on AWS). In Blind SSRF, the server does not return the response body, but the attacker validates interaction using DNS out-of-band canary tokens.",
    examples: [
      {
        scenario: "AWS Cloud Metadata Credential Exfiltration",
        codeOrConfig: "POST /api/v1/generate-pdf\nHost: target.com\nContent-Type: application/json\n\n{\n  \"sourceUrl\": \"http://169.254.169.254/latest/meta-data/iam/security-credentials/web-app-role\"\n}",
        explanation: "The backend PDF rendering daemon fetches the metadata endpoint, embedding temporary AWS access keys, secret keys, and session tokens directly into the generated PDF."
      }
    ],
    practicalApplications: [
      "Auditing microservice internal trust boundaries and webhooks",
      "Testing SSRF detection in AppSec Nexus active scanner",
      "Configuring AWS IMDSv2 (requiring session tokens) to defeat metadata harvesting"
    ],
    relatedConceptIds: ["concept-defense-in-depth", "concept-rules-of-engagement"],
    commonMistakes: [
      "Using string blacklists to filter `127.0.0.1` (bypassed with decimal IP `2130706433`, IPv6 `[::1]`, hex `0x7f000001`, or DNS rebinding)",
      "Validating the URL before making the request without accounting for DNS Rebinding (where the DNS server responds with a public IP on first lookup and `127.0.0.1` on second lookup)",
      "Leaving internal administrative microservices unauthenticated under the assumption that 'they are inside the private network'"
    ],
    learningResources: [
      {
        title: "OWASP Server-Side Request Forgery Prevention Cheat Sheet",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-918"],
    linkedMitre: ["T1190"],
    capabilityType: "native_scanner"
  },

  // ==========================================
  // DOMAIN 4: API SECURITY & PENETRATION TESTING
  // ==========================================
  {
    id: "concept-bola",
    name: "Broken Object Level Authorization (BOLA / IDOR)",
    domain: "api_security",
    difficulty: "intermediate",
    definition: "Ranked #1 in the OWASP API Security Top 10, BOLA occurs when an API endpoint accepts an object identifier from the client and retrieves or modifies the corresponding record without verifying that the requesting user has legitimate ownership or permission.",
    purpose: "Enables low-privileged users to view, tamper with, or delete private resources belonging to other users simply by changing an ID in the API request path or body.",
    prerequisites: ["concept-cia-triad", "concept-role-based-access"],
    technicalExplanation: "Modern REST and GraphQL APIs frequently structure endpoints around entity IDs: `/api/v1/orders/{orderId}` or `/graphql { order(id: 104) { total items } }`. When a client authenticates, the server validates their session/token, but fails to implement an authorization check comparing `token.user_id` against `order.owner_id`. Because IDs are frequently sequential integers (`101`, `102`) or predictable patterns, attackers write automated scripts iterating through the entire range to scrape or overwrite all customer records.",
    examples: [
      {
        scenario: "BOLA / IDOR Parameter Tampering",
        codeOrConfig: "User A (ID 402) sends authenticated request:\nGET /api/v1/users/402/documents HTTP/1.1\nCookie: session=UserA_Cookie\n\nAttacker changes URL parameter to victim User B (ID 403):\nGET /api/v1/users/403/documents HTTP/1.1\nCookie: session=UserA_Cookie\n\nVulnerable Server returns 200 OK with User B's confidential tax documents.",
        explanation: "Authentication succeeded, but the database query lacked an ownership clause (`WHERE id = 403 AND tenant_id = current_user.tenant_id`)."
      }
    ],
    practicalApplications: [
      "Auditing API microservices and mobile application backend gateways",
      "Automating multi-tenant authorization testing with Burp Suite / Postman",
      "Designing row-level security (RLS) policies in PostgreSQL / SQLite"
    ],
    relatedConceptIds: ["concept-role-based-access", "concept-jwt-security"],
    commonMistakes: [
      "Relying on UUIDs instead of integer IDs as security (UUIDs only make guessing harder; they do not enforce authorization and often leak in other API endpoints or logs)",
      "Enforcing authorization in frontend UI code (hiding edit buttons) while leaving the backend API endpoint completely unprotected",
      "Confusing authentication (who you are) with authorization (what you are allowed to access)"
    ],
    learningResources: [
      {
        title: "OWASP API Security Top 10: API1:2023 Broken Object Level Authorization",
        url: "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-285", "CWE-639"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-jwt-security",
    name: "JSON Web Token (JWT) Architecture, Algorithms & Tampering",
    domain: "api_security",
    difficulty: "advanced",
    definition: "An open, stateless standard (RFC 7519) for securely transmitting information between parties as a JSON object, consisting of Header, Payload, and Signature separated by dots.",
    purpose: "Provides decentralized, stateless user authentication across distributed microservices without requiring shared database session lookups.",
    prerequisites: ["concept-cryptography"],
    technicalExplanation: "A JWT is composed of three Base64URL-encoded strings: `Header.Payload.Signature`. The header defines the token type and cryptographic signing algorithm (`alg`: `HS256`, `RS256`, or `none`). The payload contains claims (`sub`, `role`, `exp`). The signature is computed using the secret/private key over `Header.Payload`. Vulnerabilities arise when: (1) The server accepts `alg: none`, validating tokens without any signature verification; (2) Key Confusion / Algorithm Confusion: A server expecting asymmetric `RS256` can be coerced into using symmetric `HS256`, verifying the token using the public RSA certificate as the HMAC shared secret; (3) Weak secret keys brute-forced offline using hashcat.",
    examples: [
      {
        scenario: "The 'none' Algorithm Tampering Attack",
        codeOrConfig: "Original Header: {\"alg\":\"HS256\",\"typ\":\"JWT\"}\nTampered Header: {\"alg\":\"none\",\"typ\":\"JWT\"}\nTampered Payload: {\"sub\":\"123\",\"username\":\"bob\",\"role\":\"admin\"}\nForged Token: eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJ1c2VybmFtZSI6ImJvYiIsInJvbGUiOiJhZG1pbiJ9.",
        explanation: "Notice the trailing dot with an empty signature. Vulnerable JWT libraries that allow `none` will deserialize the token as fully valid, granting instant admin privileges."
      }
    ],
    practicalApplications: [
      "Auditing OAuth 2.0 / OpenID Connect single sign-on (SSO) implementations",
      "Testing JWT verification rigor during API penetration tests",
      "Designing secure, short-lived access token + refresh token rotations"
    ],
    relatedConceptIds: ["concept-cryptography", "concept-bola"],
    commonMistakes: [
      "Storing confidential data (passwords, PII) inside the JWT payload without realizing Base64URL is encoding, not encryption",
      "Failing to validate the expiration claim (`exp`) or issuer claim (`iss`)",
      "Using the same JWT across multiple independent tenant environments"
    ],
    learningResources: [
      {
        title: "IETF RFC 7519: JSON Web Token (JWT)",
        url: "https://datatracker.ietf.org/doc/html/rfc7519",
        type: "rfc",
        isOfficial: true
      },
      {
        title: "IETF RFC 8725: JSON Web Token Best Current Practices",
        url: "https://datatracker.ietf.org/doc/html/rfc8725",
        type: "rfc",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-347", "CWE-287"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-rate-limiting",
    name: "API Rate Limiting, Throttling & Resource Protection",
    domain: "api_security",
    difficulty: "intermediate",
    definition: "Defensive mechanisms that restrict the number of requests a client or IP address can submit to an API within a specified time window, preventing resource exhaustion and automated abuse.",
    purpose: "Protects backend infrastructure from denial of service, brute-force credential stuffing, API scraping, and unexpected cloud compute billing spikes.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "Rate limiting is implemented using algorithms like Token Bucket, Leaky Bucket, or Fixed/Sliding Window Counter (frequently backed by an in-memory Redis cluster). When an API client exceeds the allocated threshold (e.g. 60 requests/minute), the server responds with HTTP status `429 Too Many Requests` alongside informative response headers: `Retry-After: 30`, `X-RateLimit-Limit: 60`, `X-RateLimit-Remaining: 0`. Tiered rate limiting applies different thresholds depending on authentication status: unauthenticated `/login` (5 attempts/min), authenticated standard user (100 req/min), internal enterprise service (10,000 req/min).",
    examples: [
      {
        scenario: "HTTP 429 Rate Limit Response",
        codeOrConfig: "HTTP/1.1 429 Too Many Requests\nRetry-After: 60\nX-RateLimit-Limit: 5\nX-RateLimit-Remaining: 0\nX-RateLimit-Reset: 1776412800\nContent-Type: application/json\n\n{\"error\":\"Rate limit exceeded. Please wait 60 seconds before retrying login.\"}",
        explanation: "Prevents automated password-guessing dictionaries from testing millions of credentials."
      }
    ],
    practicalApplications: [
      "Hardening login, password reset, and payment checkout endpoints against brute force",
      "Preventing GraphQL recursive query denial of service via query complexity analysis",
      "Protecting third-party API quotas"
    ],
    relatedConceptIds: ["concept-cia-triad", "concept-defense-in-depth"],
    commonMistakes: [
      "Rate limiting solely on `X-Forwarded-For` header, which attackers can spoof with arbitrary values on every request",
      "Failing to rate limit resource-intensive endpoints like PDF generators, report exports, or password hashing",
      "Treating rate limiting as a complete substitute for strong password policies and MFA"
    ],
    learningResources: [
      {
        title: "IETF RFC 6585: Additional HTTP Status Codes (Section 4: 429 Too Many Requests)",
        url: "https://datatracker.ietf.org/doc/html/rfc6585#section-4",
        type: "rfc",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-799", "CWE-307"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-mass-assignment",
    name: "Mass Assignment & Excessive Data Exposure",
    domain: "api_security",
    difficulty: "intermediate",
    definition: "Vulnerabilities occurring when modern software frameworks automatically bind incoming client JSON request parameters to internal database models or data structures without strict property whitelisting.",
    purpose: "Enables an attacker to modify internal, sensitive model properties that should only be controlled by administrators, such as `is_admin`, `account_balance`, or `verified`.",
    prerequisites: ["concept-role-based-access"],
    technicalExplanation: "Object-relational mappers (ORMs) and API frameworks (Node.js/Express, Spring Boot, Ruby on Rails) simplify updating records by allowing developers to pass request bodies directly into update methods: `User.update(req.body)`. If the request body includes unexpected fields like `{\"role\": \"admin\", \"is_verified\": true}`, the ORM binds them directly to the database record. Conversely, Excessive Data Exposure occurs when an endpoint fetches a full internal model (`SELECT * FROM users`) and serializes it directly to JSON, leaking password hashes, internal IDs, and PII to client-side browsers.",
    examples: [
      {
        scenario: "Mass Assignment Privilege Escalation",
        codeOrConfig: "Legitimate UI profile update sends:\nPUT /api/v1/profile\n{\"name\": \"John Doe\", \"bio\": \"Security Analyst\"}\n\nAttacker injects hidden administrative fields:\nPUT /api/v1/profile\n{\"name\": \"John Doe\", \"bio\": \"Security Analyst\", \"role\": \"administrator\", \"is_superadmin\": true}",
        explanation: "If the backend controller does not use a strict Data Transfer Object (DTO), the attacker gains instantaneous superuser access."
      }
    ],
    practicalApplications: [
      "Auditing API parameter binding during web and mobile penetration tests",
      "Implementing strict DTO validation schemas (Zod, Class-Validator, Pydantic)",
      "Eliminating internal model serialization in public API responses"
    ],
    relatedConceptIds: ["concept-bola", "concept-role-based-access"],
    commonMistakes: [
      "Using blacklists to reject specific properties (attackers simply find other model fields)",
      "Relying on frontend forms to restrict which parameters can be submitted",
      "Serializing full ORM database entities directly into API responses without projection"
    ],
    learningResources: [
      {
        title: "OWASP API Security Top 10: API3:2023 Broken Object Property Level Authorization",
        url: "https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-915", "CWE-213"],
    capabilityType: "native_scanner"
  },

  // ==========================================
  // DOMAIN 5: DEFENSIVE CONTROLS & ARCHITECTURE
  // ==========================================
  {
    id: "concept-parameterized-queries",
    name: "Parameterized Queries & Context-Aware Output Encoding",
    domain: "defensive_controls",
    difficulty: "beginner",
    definition: "The primary coding defenses against injection attacks: Parameterized Queries (separating SQL code structure from user data) and Context-Aware Output Encoding (neutralizing executable characters based on output context).",
    purpose: "Permanently neutralizes SQL Injection and Cross-Site Scripting vulnerabilities by ensuring data is strictly treated as passive literals rather than executable commands.",
    prerequisites: ["concept-sql-injection", "concept-cross-site-scripting"],
    technicalExplanation: "In a parameterized query (prepared statement), the database engine compiles the SQL command template (`SELECT * FROM users WHERE email = ?`) into an execution tree BEFORE binding the parameter values. When user data arrives, the database engine treats it purely as a literal value; quotes or SQL keywords inside the data can never alter the query structure. Context-Aware Output Encoding recognizes that data rendered in an HTML Body requires different sanitization (`&` -> `&amp;`, `<` -> `&lt;`) than data rendered inside an HTML Attribute, a `<script>` block, an `href` URL, or a CSS style.",
    examples: [
      {
        scenario: "Parameterized SQL in Rust (Rusqlite)",
        codeOrConfig: "conn.execute(\n    \"INSERT INTO targets (name, url) VALUES (?1, ?2)\",\n    params![target_name, target_url],\n)?;",
        explanation: "Input variables `target_name` and `target_url` are passed through SQLite's native parameter binding API, completely preventing SQL syntax injection."
      }
    ],
    practicalApplications: [
      "Implementing secure database layers in enterprise applications",
      "Building sanitization pipelines in automated frontend rendering engines",
      "Performing automated code review with Semgrep rules"
    ],
    relatedConceptIds: ["concept-sql-injection", "concept-cross-site-scripting", "concept-devsecops-guardrails"],
    commonMistakes: [
      "Using prepared statements for table names or column names (most database engines only support parameters for values; dynamic table names require strict identifier whitelisting)",
      "Applying HTML entity encoding to data before storing it in the database (taints raw data and fails if the data is later exported to JSON or CLI)",
      "Using basic string replacement (`str.replace(\"'\", \"''\")`) instead of native prepared statements"
    ],
    learningResources: [
      {
        title: "OWASP Injection Prevention Cheat Sheet",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-89", "CWE-79"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-role-based-access",
    name: "Principle of Least Privilege (PoLP) & RBAC Enforcement",
    domain: "defensive_controls",
    difficulty: "intermediate",
    definition: "The fundamental security principle dictating that every user, service, process, and application component must be granted only the minimum permissions necessary to perform its legitimate job function.",
    purpose: "Limits the blast radius and lateral movement potential when a user account, service credential, or application server is compromised.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "Role-Based Access Control (RBAC) groups granular permissions into administrative roles (`Admin`, `Auditor`, `Support`, `Customer`). Attribute-Based Access Control (ABAC) extends RBAC by evaluating contextual attributes: user identity, resource ownership, client IP geographic origin, device compliance status, and time of day. Under PoLP, an application server process should never run as `root` or `Administrator`; the database user should not possess `DROP TABLE` or `GRANT` privileges; and individual microservices should only possess IAM permissions for their specific S3 bucket.",
    examples: [
      {
        scenario: "Least Privilege Database User Configuration",
        codeOrConfig: "-- Insecure:\nGRANT ALL PRIVILEGES ON *.* TO 'webapp'@'%' IDENTIFIED BY 'password';\n\n-- Secure Least Privilege:\nCREATE USER 'webapp'@'10.0.1.%' IDENTIFIED BY 'complex_secret_99#';\nGRANT SELECT, INSERT, UPDATE, DELETE ON production_db.orders TO 'webapp'@'10.0.1.%';\n-- No DROP, No ALTER, No GRANT, No access to mysql.user tables",
        explanation: "Limits attacker capability to basic DML operations even if an injection flaw exists."
      }
    ],
    practicalApplications: [
      "Configuring Linux service daemons with unprivileged system users (`www-data`, `nobody`)",
      "Designing AWS IAM policies with explicit resource ARN restrictions",
      "Implementing Windows User Account Control (UAC) and AppLocker policies"
    ],
    relatedConceptIds: ["concept-defense-in-depth", "concept-bola"],
    commonMistakes: [
      "Assigning the `Administrator` or `Owner` role to software developers to save time during initial setup",
      "Failing to implement automated role offboarding when employees transition or depart",
      "Using shared generic credentials (e.g. `admin/admin`) across team members"
    ],
    learningResources: [
      {
        title: "NIST SP 800-162: Guide to Attribute Based Access Control (ABAC) Definition and Considerations",
        url: "https://csrc.nist.gov/publications/detail/sp/800-162/final",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedMitre: ["TA0004"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-security-logging",
    name: "Security Logging, Auditing & Tamper-Resistant SIEM Ingestion",
    domain: "defensive_controls",
    difficulty: "intermediate",
    definition: "The systematic recording, centralization, and monitoring of security-relevant events across operating systems, network devices, and applications to detect intrusions, ensure non-repudiation, and support forensic investigations.",
    purpose: "Enables real-time incident detection and rapid breach investigation, while ensuring evidence cannot be erased or modified by adversaries.",
    prerequisites: ["concept-cia-triad"],
    technicalExplanation: "Effective security logging captures: Timestamp (in synchronized UTC ISO 8601 format), Event Type (Authentication Success/Failure, Privilege Escalation, Authorization Failure, Data Export), Initiator Identity (User ID, Source IP, User-Agent), and Affected Resource ID. To prevent log tampering by attackers who achieve local system administrator privileges, logs must be immediately streamed in real time over TLS (syslog-ng, fluentd) to an append-only, write-once centralized Security Information and Event Management (SIEM) platform (Splunk, Elastic, Sentinel) with cryptographic verification.",
    examples: [
      {
        scenario: "Structured JSON Security Audit Log",
        codeOrConfig: "{\n  \"timestamp\": \"2026-10-17T05:12:00.124Z\",\n  \"event\": \"AUTH_MFA_FAILED\",\n  \"severity\": \"WARN\",\n  \"actor\": {\n    \"userId\": \"usr_8892\",\n    \"ip\": \"198.51.100.45\",\n    \"userAgent\": \"Mozilla/5.0...\"\n  },\n  \"details\": {\n    \"reason\": \"Invalid TOTP token submitted 3 consecutive times\",\n    \"accountStatus\": \"TEMPORARILY_LOCKED\"\n  }\n}",
        explanation: "Machine-readable structured log allows SIEM correlation rules to trigger automated IP banning."
      }
    ],
    practicalApplications: [
      "SOC monitoring and real-time alert triage",
      "PCI-DSS Requirement 10 and HIPAA compliance auditing",
      "Post-incident digital forensic timeline reconstruction"
    ],
    relatedConceptIds: ["concept-cia-triad", "concept-defense-in-depth"],
    commonMistakes: [
      "Logging sensitive data (cleartext passwords, credit card numbers, JWT tokens) into application logs",
      "Storing logs only on local server disks where an attacker with root privileges can execute `rm -rf /var/log`",
      "Failing to synchronize clocks using NTP, rendering log correlation across distributed servers impossible"
    ],
    learningResources: [
      {
        title: "OWASP Logging Cheat Sheet",
        url: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
        type: "guide",
        isOfficial: true
      }
    ],
    linkedCwe: ["CWE-778", "CWE-532"],
    capabilityType: "native_scanner"
  },

  {
    id: "concept-devsecops-guardrails",
    name: "DevSecOps Automated Guardrails & Secure CI/CD Pipelines",
    domain: "defensive_controls",
    difficulty: "advanced",
    definition: "The automated integration of security testing and compliance checks throughout every phase of the software delivery lifecycle (SDLC), transforming security from a manual bottleneck into an automated engineering guardrail.",
    purpose: "Detects and blocks vulnerabilities in pull requests before code is merged or deployed to production, reducing remediation costs and MTTR.",
    prerequisites: ["concept-parameterized-queries", "concept-threat-modeling"],
    technicalExplanation: "A modern DevSecOps pipeline implements automated security controls at distinct stages: (1) Pre-commit / IDE: Secret scanning (TruffleHog, Gitleaks) to prevent committing AWS API keys or passwords; (2) Pull Request / Build: Static Application Security Testing (SAST via Semgrep) and Software Composition Analysis (SCA via Dependabot, OSV-Scanner) to identify known CVEs in third-party npm/crates dependencies; (3) Staging Deployment: Dynamic Application Security Testing (DAST via AppSec Nexus / ZAP) to probe running endpoints against OWASP Top 10 vectors; (4) Container / Cloud: Container image vulnerability scanning (Trivy) and Infrastructure as Code (IaC) misconfiguration checks (Checkov).",
    examples: [
      {
        scenario: "Automated GitHub Actions Security Pipeline Gating",
        codeOrConfig: "name: DevSecOps Guardrail\non: [pull_request]\njobs:\n  security-scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Scan for Hardcoded Secrets\n        run: trufflehog git file://. --fail\n      - name: SAST Code Analysis\n        run: semgrep --config=p/security-audit --error\n      - name: Dependency Vulnerability Audit\n        run: cargo audit --deny warnings",
        explanation: "If any step discovers a high-severity vulnerability or hardcoded secret, the CI build fails and the Pull Request merge is blocked."
      }
    ],
    practicalApplications: [
      "Shift-left automated application security governance",
      "Continuous compliance verification for SOC 2 and ISO 27001",
      "Automated third-party supply chain risk reduction"
    ],
    relatedConceptIds: ["concept-parameterized-queries", "concept-defense-in-depth"],
    commonMistakes: [
      "Configuring security tools with noisy rules that produce thousands of false positives, causing developers to ignore all alerts",
      "Scanning only in production instead of shifting left into developer branches",
      "Treating automated CI/CD scans as a complete replacement for human architecture review and penetration testing"
    ],
    learningResources: [
      {
        title: "NIST SP 800-218: Secure Software Development Framework (SSDF) Version 1.1",
        url: "https://csrc.nist.gov/publications/detail/sp/800-218/final",
        type: "standard",
        isOfficial: true
      }
    ],
    linkedTools: ["nuclei", "semgrep"],
    capabilityType: "native_scanner"
  }
];
