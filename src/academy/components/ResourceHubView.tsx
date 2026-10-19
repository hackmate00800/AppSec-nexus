import { useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Search
} from "lucide-react";

export type ResourceCategory = "standard" | "docs" | "lab" | "cheatsheet";
export type AccessModel = "Free" | "Open Source" | "Account Required" | "Freemium";

interface ResourceEntry {
  id: string;
  title: string;
  category: ResourceCategory;
  accessModel: AccessModel;
  authoritativeBody: string;
  description: string;
  keyTopics: string[];
  url: string;
  recommendedOrder: number;
  highlightNotice?: string;
}

const RESOURCES_DATABASE: ResourceEntry[] = [
  // STANDARDS
  {
    id: "owasp-wstg",
    title: "OWASP Web Security Testing Guide (WSTG v4.2)",
    category: "standard",
    accessModel: "Free",
    authoritativeBody: "OWASP Foundation",
    description: "The definitive premier cybersecurity standard for web application penetration testing, covering 12 test categories from information gathering to client-side injection testing.",
    keyTopics: ["Information Gathering", "Configuration & Deployment", "Identity & Auth", "Input Validation", "Cryptography", "Business Logic"],
    url: "https://owasp.org/www-project-web-security-testing-guide/v42/",
    recommendedOrder: 1,
    highlightNotice: "Industry Gold Standard for Pentesting Methodology"
  },
  {
    id: "owasp-asvs",
    title: "OWASP Application Security Verification Standard (ASVS v4.0.3)",
    category: "standard",
    accessModel: "Free",
    authoritativeBody: "OWASP Foundation",
    description: "Rigorous framework of security requirements and controls for architects, developers, and testers. Defines Level 1 (opportunistic), Level 2 (standard), and Level 3 (advanced).",
    keyTopics: ["Architecture & Threat Modeling", "Authentication", "Session Management", "Access Control", "Stored Cryptography", "Data Protection"],
    url: "https://owasp.org/www-project-application-security-verification-standard/",
    recommendedOrder: 2
  },
  {
    id: "mitre-cwe",
    title: "MITRE CWE — Common Weakness Enumeration",
    category: "standard",
    accessModel: "Free",
    authoritativeBody: "The MITRE Corporation",
    description: "Universal dictionary of software security weaknesses, root causes, detection methods, and demonstrative examples (e.g. CWE-89 SQLi, CWE-79 XSS, CWE-639 IDOR).",
    keyTopics: ["Root Cause Taxonomies", "Software Faults", "Consequences", "Mitigations", "CVE Linkage"],
    url: "https://cwe.mitre.org/",
    recommendedOrder: 3
  },
  {
    id: "first-cvss",
    title: "FIRST CVSS Calculator & Specification (v3.1 & v4.0)",
    category: "standard",
    accessModel: "Free",
    authoritativeBody: "FIRST (Forum of Incident Response and Security Teams)",
    description: "Official quantitative scoring rubric for vulnerability severity based on Attack Vector, Attack Complexity, Privileges Required, User Interaction, Scope, and CIA impact.",
    keyTopics: ["Base Score Metrics", "Exploitability", "Impact Scoring", "Temporal & Environmental Metrics", "CVSS v4.0 Changes"],
    url: "https://www.first.org/cvss/calculator/3.1",
    recommendedOrder: 4
  },
  {
    id: "nist-800-115",
    title: "NIST SP 800-115: Technical Guide to Information Security Testing",
    category: "standard",
    accessModel: "Free",
    authoritativeBody: "National Institute of Standards and Technology",
    description: "Federal recommendations for designing, conducting, and reporting technical information security tests, vulnerability assessments, and penetration testing.",
    keyTopics: ["Planning & Scoping", "Execution Phase", "Target Identification", "Vulnerability Discovery", "Reporting & Review"],
    url: "https://csrc.nist.gov/publications/detail/sp/800-115/final",
    recommendedOrder: 5
  },
  {
    id: "rfc-9110",
    title: "IETF RFC 9110: HTTP Semantics",
    category: "standard",
    accessModel: "Free",
    authoritativeBody: "Internet Engineering Task Force (IETF)",
    description: "Official specification defining HTTP architecture, request methods (GET, POST, HEAD, OPTIONS), status codes (2xx, 3xx, 4xx, 5xx), and header fields.",
    keyTopics: ["Safe & Idempotent Methods", "Cache-Control", "Host Header Validation", "Connection Management", "Content Negotiation"],
    url: "https://www.rfc-editor.org/rfc/rfc9110.html",
    recommendedOrder: 6
  },

  // DOCUMENTATION & CHEATSHEETS
  {
    id: "mdn-csp",
    title: "MDN Web Docs: Content Security Policy (CSP)",
    category: "docs",
    accessModel: "Free",
    authoritativeBody: "Mozilla Developer Network",
    description: "Comprehensive guide to constructing, testing, and debugging Content-Security-Policy HTTP headers to defeat Cross-Site Scripting (XSS) and data injection.",
    keyTopics: ["default-src", "script-src 'nonce-*'", "style-src", "frame-ancestors", "connect-src", "report-uri / report-to"],
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
    recommendedOrder: 7
  },
  {
    id: "mdn-cors",
    title: "MDN Web Docs: Cross-Origin Resource Sharing (CORS)",
    category: "docs",
    accessModel: "Free",
    authoritativeBody: "Mozilla Developer Network",
    description: "Definitive explanation of CORS mechanisms, preflight OPTIONS requests, Access-Control-Allow-Origin, and credentials mode pitfalls.",
    keyTopics: ["Preflight Requests", "Credentials Mode", "Wildcard Origins", "Exposed Headers", "CORS Security Risks"],
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS",
    recommendedOrder: 8
  },
  {
    id: "owasp-cheatsheets",
    title: "OWASP Cheat Sheet Series",
    category: "cheatsheet",
    accessModel: "Free",
    authoritativeBody: "OWASP Foundation",
    description: "Concise, actionable security guides written by practicing security professionals covering SQLi prevention, password storage, JWT, REST APIs, and microservices.",
    keyTopics: ["Parameterized Queries", "Bcrypt / Argon2", "Secure Cookie Flags", "CSRF Protection", "Input Validation"],
    url: "https://cheatsheetseries.owasp.org/",
    recommendedOrder: 9,
    highlightNotice: "Essential Rapid Remediation Reference"
  },
  {
    id: "docker-sec",
    title: "Docker Security & Container Hardening Guide",
    category: "docs",
    accessModel: "Free",
    authoritativeBody: "Docker Inc.",
    description: "Official container security architecture guide covering rootless mode, read-only filesystems, Linux capabilities (CAP_DROP), and Seccomp profiles.",
    keyTopics: ["Rootless Containers", "Read-Only Root Filesystem", "Drop Capabilities", "Resource Limits", "Secrets Handling"],
    url: "https://docs.docker.com/engine/security/",
    recommendedOrder: 10
  },

  // PRACTICE LABS & ENVIRONMENTS
  {
    id: "portswigger-academy",
    title: "PortSwigger Web Security Academy",
    category: "lab",
    accessModel: "Free",
    authoritativeBody: "PortSwigger (Burp Suite)",
    description: "The world's highest-quality free interactive web security training platform with hundreds of realistic labs from apprentice to practitioner and expert levels.",
    keyTopics: ["SQL Injection", "XSS", "CSRF", "SSRF", "CORS", "XXE", "JWT Attacks", "HTTP Request Smuggling", "OAuth 2.0 Flaws"],
    url: "https://portswigger.net/web-security",
    recommendedOrder: 11,
    highlightNotice: "Premier Free Interactive Practice Environment"
  },
  {
    id: "owasp-juice-shop",
    title: "OWASP Juice Shop (Modern Vulnerable Web Application)",
    category: "lab",
    accessModel: "Open Source",
    authoritativeBody: "OWASP Foundation",
    description: "An intentionally insecure modern web application built with Angular, Node.js, Express, and SQLite. Features a complete interactive score board and 100+ challenges.",
    keyTopics: ["OWASP Top 10", "XSS & CSRF", "NoSQL / SQL Injection", "JWT Tampering", "Zero-Day Emulation", "Docker Deployable"],
    url: "https://owasp.org/www-project-juice-shop/",
    recommendedOrder: 12,
    highlightNotice: "Recommended Local Docker Practice Target"
  },
  {
    id: "dvwa",
    title: "DVWA — Damn Vulnerable Web Application",
    category: "lab",
    accessModel: "Open Source",
    authoritativeBody: "DVWA Community",
    description: "Classic PHP/MySQL vulnerable web application with adjustable security levels (Low, Medium, High, Impossible) specifically designed to compare exploitability and remediation.",
    keyTopics: ["Brute Force", "Command Execution", "CSRF", "File Inclusion (LFI/RFI)", "SQL Injection", "XSS"],
    url: "https://github.com/digininja/DVWA",
    recommendedOrder: 13
  },
  {
    id: "owasp-crapi",
    title: "OWASP completely ridiculous API (crAPI)",
    category: "lab",
    accessModel: "Open Source",
    authoritativeBody: "OWASP Foundation",
    description: "A modern microservices-based application explicitly created to practice the OWASP API Security Top 10 vulnerabilities (BOLA, broken user auth, mass assignment).",
    keyTopics: ["BOLA (IDOR)", "Broken Authentication", "Mass Assignment", "Excessive Data Exposure", "Rate Limiting", "SSRF"],
    url: "https://github.com/OWASP/crAPI",
    recommendedOrder: 14
  },
  {
    id: "tryhackme",
    title: "TryHackMe — Web Fundamentals & Pentesting",
    category: "lab",
    accessModel: "Freemium",
    authoritativeBody: "TryHackMe",
    description: "Guided browser-accessible security labs with structured questions and virtual attack machines for hands-on networking, Linux, and web application testing.",
    keyTopics: ["Web Fundamentals", "Nmap & Network Recon", "Burp Suite Basics", "Privilege Escalation", "CTF Rooms"],
    url: "https://tryhackme.com/",
    recommendedOrder: 15
  }
];

export function ResourceHubView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedAccessModel, setSelectedAccessModel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredResources = RESOURCES_DATABASE.filter((item) => {
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesAccess = selectedAccessModel === "ALL" || item.accessModel === selectedAccessModel;
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authoritativeBody.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keyTopics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesAccess && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Card */}
      <div
        className="card"
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
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
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <BookOpen size={24} color="var(--accent-emerald)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              Authoritative Documentation & Standards Hub
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  color: "var(--accent-emerald)",
                  fontWeight: 600
                }}
              >
                100% Verified Sources
              </span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Direct access to official standards bodies (OWASP, MITRE, NIST, IETF), technical specifications (MDN), and authorized practice labs.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-dim)", alignSelf: "center" }}>
            {filteredResources.length} References Available
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            className="input"
            placeholder="Search standards, CWE, OWASP guides, RFCs, or labs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "36px", width: "100%", fontSize: "0.85rem" }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All Types" },
            { id: "standard", label: "Official Standards" },
            { id: "docs", label: "Tech Specs & MDN" },
            { id: "cheatsheet", label: "Cheat Sheets" },
            { id: "lab", label: "Practice Labs & CTF" }
          ].map((cat) => (
            <button
              key={cat.id}
              className={`filter-chip ${selectedCategory === cat.id ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "5px 10px" }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Access Model Filter */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginLeft: "auto" }}>
          {[
            { id: "ALL", label: "All Access" },
            { id: "Free", label: "Free" },
            { id: "Open Source", label: "Open Source" },
            { id: "Freemium", label: "Freemium" }
          ].map((acc) => (
            <button
              key={acc.id}
              className={`filter-chip ${selectedAccessModel === acc.id ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
              onClick={() => setSelectedAccessModel(acc.id)}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
        {filteredResources.map((res) => (
          <div
            key={res.id}
            className="card"
            style={{
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "14px",
              border: "1px solid var(--border-color)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Top Tag & Authority */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor:
                      res.category === "standard"
                        ? "rgba(59, 130, 246, 0.15)"
                        : res.category === "lab"
                        ? "rgba(16, 185, 129, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                    color:
                      res.category === "standard"
                        ? "var(--accent-cyan)"
                        : res.category === "lab"
                        ? "var(--accent-emerald)"
                        : "var(--accent-amber)"
                  }}
                >
                  {res.category.toUpperCase()}
                </span>

                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-color)"
                  }}
                >
                  {res.accessModel}
                </span>
              </div>

              <h3 style={{ margin: "0 0 6px 0", fontSize: "1.02rem", fontWeight: 700 }}>
                {res.title}
              </h3>

              <div style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", marginBottom: "8px", fontWeight: 600 }}>
                {res.authoritativeBody}
              </div>

              <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                {res.description}
              </p>

              {res.highlightNotice && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    borderLeft: "2px solid var(--accent-emerald)",
                    fontSize: "0.74rem",
                    color: "var(--accent-emerald)",
                    fontWeight: 600
                  }}
                >
                  {res.highlightNotice}
                </div>
              )}
            </div>

            {/* Bottom Topics & Launch Button */}
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "14px" }}>
                {res.keyTopics.map((topic, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: "0.7rem",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-dim)"
                    }}
                  >
                    #{topic}
                  </span>
                ))}
              </div>

              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "0.82rem",
                  padding: "8px 14px",
                  textDecoration: "none"
                }}
              >
                <span>Visit Official Documentation</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
