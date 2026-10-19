import { useState } from "react";
import {
  Users,
  ExternalLink,
  Shield,
  AlertTriangle,
  Lock,
  EyeOff,
  MessageSquare,
  Search
} from "lucide-react";

interface CommunityEntry {
  id: string;
  name: string;
  platform: "OWASP" | "Reddit" | "Forum" | "GitHub" | "Research";
  description: string;
  url: string;
  targetAudience: string;
  bestFor: string[];
  rulesHighlight: string;
}

const COMMUNITIES_DATABASE: CommunityEntry[] = [
  {
    id: "owasp-chapters",
    name: "OWASP Global & Local Chapters",
    platform: "OWASP",
    description: "The premier non-profit application security community with hundreds of local city chapters worldwide hosting monthly technical talks, workshops, and networking.",
    url: "https://owasp.org/chapters/",
    targetAudience: "AppSec Engineers, Web Developers, Security Architects, CISOs",
    bestFor: ["Local In-Person Meetups", "Open-Source AppSec Projects", "Vendor-Neutral Networking", "Speaking Opportunities"],
    rulesHighlight: "Vendor-neutral educational environment. Pitching products or attacking organizations is strictly forbidden."
  },
  {
    id: "portswigger-forum",
    name: "PortSwigger Web Security Community",
    platform: "Forum",
    description: "Official discussion forum for Burp Suite users and Web Security Academy learners. Active discussions on lab solutions, BPerf extensions, and HTTP protocol quirks.",
    url: "https://forum.portswigger.net/",
    targetAudience: "Pentesters, Bug Bounty Hunters, Burp Suite Users",
    bestFor: ["Burp Suite Extension Development", "Academy Lab Questions", "HTTP Parsing Edge-Cases", "Bug Bounty Techniques"],
    rulesHighlight: "Do not post direct flags or spoiler payloads without explanation. Emphasize learning and root causes."
  },
  {
    id: "r-netsec",
    name: "Reddit /r/netsec (Information Security)",
    platform: "Reddit",
    description: "A heavily moderated community dedicated solely to technical papers, security research, exploit write-ups, vulnerability analyses, and defensive methodologies.",
    url: "https://www.reddit.com/r/netsec/",
    targetAudience: "Security Researchers, Reverse Engineers, Exploit Analysts",
    bestFor: ["Technical Research Papers", "Disclosed Vulnerability Writeups", "Novel Attack Primitives", "Kernel & Protocol Analysis"],
    rulesHighlight: "Only in-depth technical links allowed. Career questions, memes, and non-technical news are strictly prohibited."
  },
  {
    id: "r-netsecstudents",
    name: "Reddit /r/netsecstudents",
    platform: "Reddit",
    description: "Supportive community tailored for beginners, college students, career changers, and junior analysts seeking study tips, certification roadmaps, and CTF writeups.",
    url: "https://www.reddit.com/r/netsecstudents/",
    targetAudience: "Students, Career Changers, Junior Analysts",
    bestFor: ["Certification Advice (OSCP, CEH, Sec+)", "Home Lab Building", "Resume Feedback", "CTF Walkthroughs"],
    rulesHighlight: "Friendly, constructive peer learning. No asking for illegal hacking advice or exam dumps."
  },
  {
    id: "r-appsec",
    name: "Reddit /r/AppSec",
    platform: "Reddit",
    description: "Dedicated to Application Security engineering, threat modeling, DevSecOps pipelines, SAST/DAST automation, and secure software development lifecycle (SSDLC).",
    url: "https://www.reddit.com/r/AppSec/",
    targetAudience: "AppSec Engineers, DevSecOps Specialists, Product Security Teams",
    bestFor: ["DevSecOps CI/CD Integration", "Threat Modeling", "SAST/DAST Tool Comparison", "Developer Security Training"],
    rulesHighlight: "Practical defender and engineering focus."
  },
  {
    id: "github-sec-lab",
    name: "GitHub Security Lab",
    platform: "GitHub",
    description: "Collaborative research hub bridging open-source maintainers and security researchers to secure the open-source software supply chain with CodeQL and bounty rewards.",
    url: "https://securitylab.github.com/",
    targetAudience: "CodeQL Authors, Vulnerability Researchers, OSS Maintainers",
    bestFor: ["CodeQL Query Writing", "Open-Source CVE Hunting", "Bounties for Query Contributions", "Supply Chain Security"],
    rulesHighlight: "Coordinated disclosure with maintainers. 90-day responsible disclosure deadline."
  },
  {
    id: "sans-isc",
    name: "SANS Internet Storm Center (ISC)",
    platform: "Research",
    description: "Daily internet threat analysis, honeypot telemetry, podcast briefings, and incident diaries maintained by global incident handlers.",
    url: "https://isc.sans.edu/",
    targetAudience: "SOC Analysts, Incident Responders, Threat Intelligence Analysts",
    bestFor: ["Daily Threat Diary", "Honeypot Attack Trends", "Zero-Day Campaign Tracking", "StormCast 5-min Audio"],
    rulesHighlight: "Defensive threat intelligence and collaborative packet analysis."
  }
];

export function CommunityDirectoryView() {
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredCommunities = COMMUNITIES_DATABASE.filter((comm) => {
    const matchesPlatform = platformFilter === "ALL" || comm.platform === platformFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      comm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.bestFor.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPlatform && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
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
              background: "rgba(139, 92, 246, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Users size={24} color="var(--accent-purple, #a855f7)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              Ethical Cybersecurity Communities Directory
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(139, 92, 246, 0.2)",
                  color: "#c084fc",
                  fontWeight: 600
                }}
              >
                Peer Learning & Research
              </span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Join legitimate developer and security researcher circles, ask well-scoped questions, and collaborate ethically.
            </p>
          </div>
        </div>

        <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
          {filteredCommunities.length} Active Communities
        </span>
      </div>

      {/* Code of Ethics & Safe Engagement Guidelines Banner */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          backgroundColor: "var(--bg-secondary)",
          borderLeft: "4px solid var(--accent-amber)",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.92rem", color: "var(--accent-amber)" }}>
          <Lock size={16} /> Essential Code of Ethics for Cybersecurity Communities
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <EyeOff size={15} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent-cyan)" }} />
            <span><strong>Always Redact Secrets:</strong> Strip authorization tokens, real target IP addresses, API secrets, and client session cookies before asking questions.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <Shield size={15} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent-emerald)" }} />
            <span><strong>Authorized Scope Only:</strong> Never test, probe, or discuss unauthenticated targets without explicit written authorization or Bug Bounty program scope.</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent-rose)" }} />
            <span><strong>Responsible Disclosure:</strong> Report vulnerabilities directly to vendors or via security coordination teams, never leak zero-days publicly to extort.</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            className="input"
            placeholder="Search communities by name, topic, or focus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "36px", width: "100%", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", "OWASP", "Forum", "Reddit", "GitHub", "Research"].map((plat) => (
            <button
              key={plat}
              className={`filter-chip ${platformFilter === plat ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "5px 12px" }}
              onClick={() => setPlatformFilter(plat)}
            >
              {plat === "ALL" ? "All Platforms" : plat}
            </button>
          ))}
        </div>
      </div>

      {/* Community Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "16px" }}>
        {filteredCommunities.map((comm) => (
          <div
            key={comm.id}
            className="card"
            style={{
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "14px",
              border: "1px solid var(--border-color)"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                    color: "#c084fc"
                  }}
                >
                  {comm.platform}
                </span>

                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  Audience: {comm.targetAudience.split(",")[0]}
                </span>
              </div>

              <h3 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", fontWeight: 700 }}>
                {comm.name}
              </h3>

              <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                {comm.description}
              </p>

              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--accent-cyan)" }}>
                  Best For:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {comm.bestFor.map((item, bIdx) => (
                    <span
                      key={bIdx}
                      style={{
                        fontSize: "0.72rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-dim)"
                      }}
                    >
                      &bull; {item}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  backgroundColor: "var(--bg-secondary)",
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  borderLeft: "2px solid var(--accent-cyan)"
                }}
              >
                <strong>Community Standard:</strong> {comm.rulesHighlight}
              </div>
            </div>

            <a
              href={comm.url}
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
              <MessageSquare size={14} />
              <span>Join Community</span>
              <ExternalLink size={13} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
