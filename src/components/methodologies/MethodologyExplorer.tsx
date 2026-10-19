import React, { useState, useEffect } from "react";
import { MethodologyDefinition, Finding } from "../../types";
import { invoke } from "@tauri-apps/api/core";
import {
  Workflow,
  Search,
  AlertTriangle,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface MethodologyExplorerProps {
  initialMethodologyId?: string;
  findings?: Finding[];
  onSelectFinding?: (finding: Finding) => void;
  onSelectMethodology?: (methodology: MethodologyDefinition) => void;
  onOpenAiMentor?: (prompt: string) => void;
}

export const MethodologyExplorer: React.FC<MethodologyExplorerProps> = ({
  initialMethodologyId,
  findings = [],
  onSelectMethodology,
  onOpenAiMentor,
}) => {
  const [methodologies, setMethodologies] = useState<MethodologyDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(initialMethodologyId || null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    invoke<MethodologyDefinition[]>("get_methodologies")
      .then((data) => {
        if (isMounted) {
          setMethodologies(data);
          if (initialMethodologyId && data.some((m) => m.id === initialMethodologyId)) {
            setExpandedId(initialMethodologyId);
          } else if (data.length > 0 && !expandedId) {
            setExpandedId(data[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load methodologies:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialMethodologyId]);

  const filteredMethodologies = methodologies.filter((m) => {
    if (categoryFilter !== "ALL" && m.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (typeFilter !== "ALL" && m.method_type.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.detection_objective || "").toLowerCase().includes(q) ||
        (m.detection_logic || "").toLowerCase().includes(q) ||
        (m.applicable_vulnerability_classes || []).some((c) => (c || "").toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="methodology-explorer-view" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: 20,
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
              <Workflow size={22} color="var(--accent-cyan)" />
              Security Detection Methodology Explorer
            </h1>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.86rem", color: "var(--text-dim)", maxWidth: "800px" }}>
              Explore how AppSec tests Web, API, Network, and Source Code vulnerabilities. Each methodology explains detection heuristics, inputs, expected evidence, verification strategies, and safe local lab practice.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input
                type="text"
                placeholder="Search methodologies or CWEs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  padding: "6px 10px 6px 30px",
                  fontSize: "0.8rem",
                  color: "var(--text-main)",
                  width: "240px",
                }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: "0.8rem",
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="Web">Web Security</option>
              <option value="API">API Security</option>
              <option value="Network">Network & Transport</option>
              <option value="SourceCode">Source Code (SAST)</option>
              <option value="Dependency">Dependencies (SCA)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: "0.8rem",
              }}
            >
              <option value="ALL">All Check Types</option>
              <option value="passive">Passive Auditing</option>
              <option value="active">Active Probing</option>
              <option value="static">Static Code Analysis</option>
              <option value="dynamic">Dynamic Fuzzing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Methodologies List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          Loading security methodologies registry...
        </div>
      ) : filteredMethodologies.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          <AlertTriangle size={32} color="var(--accent-amber)" style={{ margin: "0 auto 8px auto" }} />
          <p style={{ margin: 0, fontSize: "0.95rem" }}>No detection methodologies match your filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredMethodologies.map((m) => {
            const isExpanded = expandedId === m.id;
            return (
              <div
                key={m.id}
                className="card"
                style={{
                  padding: 16,
                  border: isExpanded ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                  transition: "border 0.2s ease",
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => {
                    const next = isExpanded ? null : m.id;
                    setExpandedId(next);
                    if (next && onSelectMethodology) onSelectMethodology(m);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          m.method_type === "passive"
                            ? "rgba(16, 185, 129, 0.12)"
                            : m.method_type === "active"
                            ? "rgba(244, 63, 94, 0.12)"
                            : m.method_type === "static"
                            ? "rgba(59, 130, 246, 0.12)"
                            : "rgba(245, 158, 11, 0.12)",
                        color:
                          m.method_type === "passive"
                            ? "var(--accent-emerald)"
                            : m.method_type === "active"
                            ? "var(--accent-rose)"
                            : m.method_type === "static"
                            ? "var(--accent-blue)"
                            : "var(--accent-amber)",
                      }}
                    >
                      {m.method_type}
                    </span>

                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                        {m.name}
                      </h3>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 2 }}>
                        Category: <strong>{m.category}</strong> • ID: <code>{m.id}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                      {isExpanded ? "Collapse" : "Expand Details"}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Methodology Body */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Objective */}
                    <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.85rem", marginBottom: 4 }}>
                        Detection Objective:
                      </div>
                      <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                        {m.detection_objective}
                      </p>
                    </div>

                    {/* Preconditions & Inputs Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "0.85rem", marginBottom: 6 }}>
                          Required Preconditions:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                          {m.preconditions.map((pre, i) => (
                            <li key={i}>{pre}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, color: "var(--accent-purple)", fontSize: "0.85rem", marginBottom: 4 }}>
                          Input / Artifact Examined:
                        </div>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                          {m.input_or_artifact_examined}
                        </p>
                        <div style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: "0.85rem", marginTop: 8, marginBottom: 4 }}>
                          Evidence Expected:
                        </div>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                          {m.evidence_expected}
                        </p>
                      </div>
                    </div>

                    {/* Heuristic Logic */}
                    <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: "0.85rem", marginBottom: 4 }}>
                        Detection Logic & Verification Heuristic:
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                        {m.detection_logic}
                      </p>
                      <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--text-dim)" }}>
                        <strong>Verification Strategy:</strong> {m.verification_strategy}
                      </div>
                    </div>

                    {/* Applicable CWE Classes */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 6 }}>
                        Applicable Vulnerability Classes:
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {m.applicable_vulnerability_classes.map((cls, i) => (
                          <span
                            key={i}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(6, 182, 212, 0.08)",
                              border: "1px solid rgba(6, 182, 212, 0.2)",
                              fontSize: "0.75rem",
                              color: "var(--accent-cyan)",
                            }}
                          >
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Safe Local Lab Exercise */}
                    <div style={{ background: "rgba(16, 185, 129, 0.06)", padding: 12, borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <div style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "0.85rem", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <FlaskConical size={14} /> Safe Practice Exercise (Local Test Lab):
                      </div>
                      <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-main)" }}>
                        {m.safe_lab_exercise}
                      </p>
                    </div>

                    {/* Limitations & References */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--accent-rose)", fontSize: "0.82rem", marginBottom: 4 }}>
                          Known Limitations:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
                          {m.known_limitations.map((lim, i) => (
                            <li key={i}>{lim}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, color: "var(--text-dim)", fontSize: "0.82rem", marginBottom: 4 }}>
                          Authoritative References:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
                          {m.references.map((ref, i) => (
                            <li key={i}>
                              <a href={ref} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)", textDecoration: "none" }}>
                                {ref}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actions and Matching Findings */}
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                        {findings && findings.length > 0 && (
                          <span>
                            Matching findings in current project:{" "}
                            <strong style={{ color: "var(--accent-cyan)" }}>
                              {findings.filter((f) => m.applicable_vulnerability_classes.some((c) => f.title.toLowerCase().includes(c.toLowerCase()) || (f.evidence && f.evidence.toLowerCase().includes(c.toLowerCase())))).length}
                            </strong>
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {onOpenAiMentor && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAiMentor(`Teach me about the ${m.name} security detection methodology (${m.id}). How does its heuristic logic work, what are common evasion techniques, and how can I practice this safely?`);
                            }}
                          >
                            <Sparkles size={12} color="var(--accent-cyan)" />
                            Ask AI Mentor About This Methodology
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
