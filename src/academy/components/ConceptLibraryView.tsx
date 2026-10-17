import { useState } from "react";
import { ConceptEntry } from "../types";
import {
  Search,
  BookOpen,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Filter,
  Terminal,
  AlertTriangle
} from "lucide-react";

interface ConceptLibraryViewProps {
  concepts: ConceptEntry[];
  selectedConcept: ConceptEntry | null;
  onSelectConcept: (concept: ConceptEntry) => void;
  domainFilter: string;
  onChangeDomainFilter: (domain: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
}

const DOMAINS: { id: string; label: string }[] = [
  { id: "ALL", label: "All Domains" },
  { id: "cybersecurity", label: "Cybersecurity Fundamentals" },
  { id: "ethical_hacking", label: "Ethical Hacking & Methodologies" },
  { id: "web_pentest", label: "Web App Penetration Testing" },
  { id: "api_security", label: "API Security & Pentesting" },
  { id: "defensive_controls", label: "Defensive Controls & Architecture" }
];

export function ConceptLibraryView({
  concepts,
  selectedConcept,
  onSelectConcept,
  domainFilter,
  onChangeDomainFilter,
  searchQuery,
  onChangeSearchQuery
}: ConceptLibraryViewProps) {
  const [copiedCode, setCopiedCode] = useState<string>("");

  function handleCopy(text: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(""), 2000);
    }
  }

  const filtered = concepts.filter((c) => {
    if (domainFilter !== "ALL" && c.domain !== domainFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDef = c.definition.toLowerCase().includes(q);
      const matchCwe = c.linkedCwe && c.linkedCwe.some((cwe) => cwe.toLowerCase().includes(q));
      const matchMitre = c.linkedMitre && c.linkedMitre.some((m) => m.toLowerCase().includes(q));
      return matchName || matchDef || matchCwe || matchMitre;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Search & Domain Filter Bar */}
      <div className="filter-bar" style={{ margin: 0, flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            className="input-field"
            placeholder="Search concepts by keyword, CWE, or MITRE technique..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            style={{ height: "36px", fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <Filter size={14} color="var(--text-dim)" />
          {DOMAINS.map((dom) => (
            <button
              key={dom.id}
              className={`filter-chip ${domainFilter === dom.id ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              onClick={() => onChangeDomainFilter(dom.id)}
            >
              {dom.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "16px", alignItems: "flex-start" }}>
        {/* Left Concept Selector List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "720px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)" }}>
              No concepts matching filter.
            </div>
          ) : (
            filtered.map((concept) => {
              const isSelected = selectedConcept?.id === concept.id;
              let domainColor = "var(--accent-cyan)";
              if (concept.domain === "ethical_hacking") domainColor = "var(--accent-rose)";
              if (concept.domain === "web_pentest") domainColor = "var(--accent-amber)";
              if (concept.domain === "api_security") domainColor = "#a855f7";
              if (concept.domain === "defensive_controls") domainColor = "var(--accent-emerald)";

              return (
                <div
                  key={concept.id}
                  style={{
                    background: isSelected ? "rgba(6, 182, 212, 0.12)" : "var(--bg-secondary)",
                    border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--border-color)"}`,
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onClick={() => onSelectConcept(concept)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text-main)", lineHeight: "1.3" }}>
                      {concept.name}
                    </span>
                    <span className="badge badge-locked" style={{ fontSize: "0.68rem", textTransform: "capitalize" }}>
                      {concept.difficulty}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "var(--text-dim)", flexWrap: "wrap" }}>
                    <span style={{ color: domainColor, fontWeight: 600 }}>
                      {concept.domain.replace("_", " ")}
                    </span>
                    <span>&bull;</span>
                    {concept.capabilityType === "native_scanner" && (
                      <span style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "2px" }}>
                        ⚡ Native Scanner
                      </span>
                    )}
                    {concept.capabilityType === "tool_adapter" && (
                      <span style={{ color: "var(--accent-amber)" }}>
                        🛠️ Tool Adapter
                      </span>
                    )}
                    {concept.capabilityType === "educational_only" && (
                      <span style={{ color: "var(--text-dim)" }}>
                        📚 Concept
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Deep-Dive Detail View */}
        {selectedConcept ? (
          <div className="card" style={{ margin: 0, padding: "20px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="badge badge-locked" style={{ fontSize: "0.72rem", textTransform: "uppercase" }}>
                    {selectedConcept.domain.replace("_", " ")}
                  </span>
                  <span className="badge badge-locked" style={{ fontSize: "0.72rem" }}>
                    Level: {selectedConcept.difficulty}
                  </span>
                </div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                  {selectedConcept.name}
                </h2>
              </div>

              {/* Capability Distinction Badge */}
              <div>
                {selectedConcept.capabilityType === "native_scanner" && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(6, 182, 212, 0.15)",
                      color: "var(--accent-cyan)",
                      border: "1px solid rgba(6, 182, 212, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    ⚡ Native AppSec Nexus Scanner
                  </span>
                )}
                {selectedConcept.capabilityType === "tool_adapter" && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "var(--accent-amber)",
                      border: "1px solid rgba(245, 158, 11, 0.35)"
                    }}
                  >
                    🛠️ External Tool Adapter
                  </span>
                )}
                {selectedConcept.capabilityType === "educational_only" && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    📚 Architectural Reference
                  </span>
                )}
              </div>
            </div>

            {/* Definition & Core Purpose */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-cyan)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} /> Authoritative Definition & Purpose:
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: "1.5", margin: "0 0 8px 0" }}>
                {selectedConcept.definition}
              </p>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                <strong>Strategic Purpose:</strong> {selectedConcept.purpose}
              </div>
            </div>

            {/* Prerequisites */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "6px" }}>
                PREREQUISITES:
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {selectedConcept.prerequisites.map((prereq, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "0.75rem",
                      color: "var(--text-main)"
                    }}
                  >
                    {prereq}
                  </span>
                ))}
              </div>
            </div>

            {/* Technical In-Depth Explanation */}
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <BookOpen size={15} /> Technical Deep Dive & Mechanics
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6", margin: 0 }}>
                {selectedConcept.technicalExplanation}
              </p>
            </div>

            {/* Concrete Examples */}
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Terminal size={15} /> Concrete Technical Examples
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedConcept.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#050811",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                        {ex.scenario}
                      </span>
                      {ex.codeOrConfig && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "3px 6px", fontSize: "0.7rem" }}
                          onClick={() => handleCopy(ex.codeOrConfig!)}
                        >
                          {copiedCode === ex.codeOrConfig ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                    {ex.codeOrConfig && (
                      <pre style={{ margin: "0 0 8px 0", fontSize: "0.76rem", color: "#38bdf8", overflowX: "auto", fontFamily: "monospace" }}>
                        {ex.codeOrConfig}
                      </pre>
                    )}
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: "1.4" }}>
                      {ex.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Practical Industry Applications */}
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "6px" }}>
                Practical Industry Applications:
              </h3>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedConcept.practicalApplications.map((app, idx) => (
                  <li key={idx}>{app}</li>
                ))}
              </ul>
            </div>

            {/* Common Mistakes & Antipatterns */}
            <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.25)", borderRadius: "8px", padding: "14px", marginBottom: "18px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-rose)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={15} /> Common Mistakes & Antipatterns:
              </div>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.8rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedConcept.commonMistakes.map((mis, idx) => (
                  <li key={idx}>{mis}</li>
                ))}
              </ul>
            </div>

            {/* Authoritative Resources & Standards */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "6px" }}>
                AUTHORITATIVE STANDARDS & RFCS:
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {selectedConcept.learningResources.map((res, idx) => (
                  <a
                    key={idx}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      color: "var(--accent-cyan)",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <ExternalLink size={12} /> {res.title}
                  </a>
                ))}
              </div>
            </div>

            {/* Related Concepts */}
            {selectedConcept.relatedConceptIds.length > 0 && (
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "6px" }}>
                  INTERCONNECTED CONCEPTS:
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {selectedConcept.relatedConceptIds.map((relId) => {
                    const relConcept = concepts.find((c) => c.id === relId);
                    if (!relConcept) return null;
                    return (
                      <button
                        key={relId}
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => onSelectConcept(relConcept)}
                      >
                        {relConcept.name} <ChevronRight size={12} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            Select a concept from the left to view in-depth technical analysis.
          </div>
        )}
      </div>
    </div>
  );
}
