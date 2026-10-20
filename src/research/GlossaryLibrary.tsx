import React, { useState } from "react";
import {
  BookA,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

export interface GlossaryTerm {
  term: string;
  acronym?: string;
  category: "Fundamentals" | "Web & API" | "Network" | "Governance & Risk" | "Cryptography";
  definition: string;
  example: string;
  relatedTerms: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: "Confidentiality, Integrity, Availability",
    acronym: "CIA Triad",
    category: "Fundamentals",
    definition: "The guiding model for information security policies: Confidentiality prevents unauthorized disclosure, Integrity protects data from unauthorized alteration, and Availability ensures authorized users have timely access.",
    example: "TLS provides Confidentiality and Integrity; DDoS mitigation ensures Availability.",
    relatedTerms: ["Defense in Depth", "Zero Trust", "AAA"],
  },
  {
    term: "Broken Object Level Authorization",
    acronym: "BOLA / IDOR",
    category: "Web & API",
    definition: "An API access control vulnerability where a client accesses unauthorized records by manipulating object identifiers (e.g. changing /api/users/1 to /api/users/2) without backend ownership verification.",
    example: "User modifies URL parameter order_id=50 to view another customer's invoice.",
    relatedTerms: ["BFLA", "Access Control", "OWASP API1"],
  },
  {
    term: "Common Vulnerabilities and Exposures",
    acronym: "CVE",
    category: "Governance & Risk",
    definition: "A dictionary of publicly disclosed cybersecurity vulnerabilities maintained by MITRE and authorized CVE Numbering Authorities (CNAs). Each record has a unique ID (e.g. CVE-2021-44228).",
    example: "CVE-2024-4671 designates a type confusion vulnerability in the Chrome V8 engine.",
    relatedTerms: ["CWE", "CVSS", "NVD"],
  },
  {
    term: "Common Weakness Enumeration",
    acronym: "CWE",
    category: "Governance & Risk",
    definition: "A community-developed taxonomy of software and hardware weakness types that serve as the root cause of vulnerabilities (e.g. CWE-89 SQL Injection, CWE-79 XSS).",
    example: "CWE-89 classifies improper neutralization of special elements in SQL commands.",
    relatedTerms: ["CVE", "OWASP", "SANS Top 25"],
  },
  {
    term: "Common Vulnerability Scoring System",
    acronym: "CVSS",
    category: "Governance & Risk",
    definition: "An open industry standard for assessing the severity of computer system security vulnerabilities. Produces a numerical score from 0.0 to 10.0 based on Base, Temporal, and Environmental metrics.",
    example: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H yields a critical severity score of 9.8.",
    relatedTerms: ["CVE", "NVD", "Risk Assessment"],
  },
  {
    term: "Content Security Policy",
    acronym: "CSP",
    category: "Web & API",
    definition: "An HTTP response header that restricts the resources (scripts, images, styles, iframes) that a browser is allowed to load for a given page, serving as a primary defense against XSS.",
    example: "Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com;",
    relatedTerms: ["XSS", "Same-Origin Policy", "Secure Headers"],
  },
  {
    term: "Server-Side Request Forgery",
    acronym: "SSRF",
    category: "Web & API",
    definition: "A security vulnerability where an attacker coerces a web application to send HTTP requests to an arbitrary destination, often targeting internal loopback addresses or cloud metadata services.",
    example: "Attacker supplies http://169.254.169.254/latest/meta-data/ into a profile picture import URL.",
    relatedTerms: ["CWE-918", "IMDSv2", "Cloud Security"],
  },
  {
    term: "Cross-Origin Resource Sharing",
    acronym: "CORS",
    category: "Web & API",
    definition: "An HTTP-header-based mechanism that allows a server to indicate any origins other than its own from which a browser should permit loading resources, bypassing the Same-Origin Policy when authorized.",
    example: "Access-Control-Allow-Origin: https://app.example.com accompanied by Access-Control-Allow-Credentials: true.",
    relatedTerms: ["Same-Origin Policy", "Preflight Request", "CWE-942"],
  },
  {
    term: "Zero Trust Architecture",
    acronym: "ZTA",
    category: "Fundamentals",
    definition: "A security model centered on the belief that organizations should not automatically trust anything inside or outside its perimeters and instead must verify anything and everything attempting to connect.",
    example: "Requiring continuous mutual TLS, device health posture checks, and MFA on every request.",
    relatedTerms: ["Least Privilege", "Defense in Depth", "CIA Triad"],
  },
  {
    term: "Penetration Testing Execution Standard",
    acronym: "PTES",
    category: "Governance & Risk",
    definition: "A structured methodology defining the phases of an authorized penetration test: Pre-engagement, Intelligence Gathering, Threat Modeling, Vulnerability Analysis, Exploitation, Post Exploitation, and Reporting.",
    example: "Following PTES ensures complete scope boundary compliance and reproducible deliverables.",
    relatedTerms: ["Rules of Engagement", "OWASP WSTG", "Ethics"],
  },
];

export interface GlossaryLibraryProps {
  onNavigateTab: (tab: string) => void;
}

export const GlossaryLibrary: React.FC<GlossaryLibraryProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Fundamentals", "Web & API", "Network", "Governance & Risk", "Cryptography"];

  const handleAskMentor = (term: string) => {
    const event = new CustomEvent("appsec-ai-mentor-query", {
      detail: {
        prompt: `Explain the cybersecurity term "${term}" in depth. How does it work, what are real-world examples, and what are the primary defensive practices associated with it?`,
        topic: `Glossary: ${term}`,
      },
    });
    window.dispatchEvent(event);
    onNavigateTab("mentor");
  };

  const filtered = GLOSSARY_TERMS.filter((item) => {
    const matchCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.acronym && item.acronym.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookA className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white">Cybersecurity Glossary & Reference Library</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative definitions, real-world examples, and terminology across security domains.
          </p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search glossary terms or acronyms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 bg-slate-900 border border-slate-800 text-xs pl-8 pr-3 py-2 rounded text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === cat
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">{item.term}</h3>
                  {item.acronym && (
                    <span className="text-xs font-mono font-bold text-cyan-400 block mt-0.5">{item.acronym}</span>
                  )}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                  {item.category}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">{item.definition}</p>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-[11px] mb-3">
                <span className="text-slate-500 font-bold uppercase text-[9px] block mb-0.5">Real-World Context:</span>
                <span className="text-slate-300">{item.example}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Tag size={10} />
                <span>{item.relatedTerms.join(", ")}</span>
              </div>

              <button
                onClick={() => handleAskMentor(item.term)}
                className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-800 hover:bg-cyan-900/60 hover:text-cyan-300 text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Sparkles size={11} className="text-cyan-400" />
                <span>Explain with AI</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
