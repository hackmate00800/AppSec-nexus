import React, { useState } from "react";
import { Finding, ValidationRecord } from "../types";
import { ValidationBadge, ProvenanceBadge } from "../components/ui/Badge";
import {
  RotateCcw,
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { VerificationAuditEngine } from "./VerificationAuditEngine";

interface EvidenceComparisonViewerProps {
  finding: Finding;
  records: ValidationRecord[];
  isVerifying: boolean;
  onVerifyFinding: (finding: Finding) => void;
  onUpdateStatus: (findingId: string, status: string, notes?: string) => void;
  onAskAiMentor: (finding: Finding, record?: ValidationRecord) => void;
  onClose?: () => void;
}

export const EvidenceComparisonViewer: React.FC<EvidenceComparisonViewerProps> = ({
  finding,
  records,
  isVerifying,
  onVerifyFinding,
  onUpdateStatus,
  onAskAiMentor,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"comparison" | "requests" | "timeline" | "proves">("comparison");
  const [manualNote, setManualNote] = useState(finding.validation_notes || "");

  // Find most recent validation record for this finding
  const latestRecord = records
    .filter((r) => r.finding_id === finding.id)
    .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())[0];

  const sanitizedEvidence = VerificationAuditEngine.sanitizeEvidence(finding.evidence || "");
  const sanitizedActual = VerificationAuditEngine.sanitizeEvidence(latestRecord?.actual_observation || "");
  const sanitizedContradicting = VerificationAuditEngine.sanitizeEvidence(latestRecord?.contradicting_evidence || "");

  // Helper to determine what evidence proves vs does not prove
  const getProvesAnalysis = () => {
    const titleLower = finding.title.toLowerCase();
    const cwe = finding.cwe || "";

    if (titleLower.includes("content-security-policy") || titleLower.includes("csp")) {
      return {
        proves: "Proves whether the server returns a valid Content-Security-Policy HTTP response header during live requests.",
        doesNotProve: "Does not prove that existing script elements or third-party widgets are incapable of malicious DOM manipulation.",
        limitations: "Inspection occurs on the designated URL path. Different subpaths or reverse-proxy routing rules may inject different headers.",
      };
    } else if (titleLower.includes("x-content-type-options") || cwe === "CWE-693") {
      return {
        proves: "Proves whether 'X-Content-Type-Options: nosniff' is actively served on the asset endpoint (Defense-in-depth protection mechanism).",
        doesNotProve: "Does NOT prove that Cross-Site Scripting (XSS / CWE-79) is actively exploitable on this target.",
        limitations: "Modern browsers adhere to MIME-sniffing protection, but absence alone does not imply vulnerability unless malicious MIME uploads execute.",
      };
    } else if (titleLower.includes("cors") || cwe === "CWE-942") {
      return {
        proves: "Proves whether the endpoint reflects untrusted Origin headers with 'Access-Control-Allow-Credentials: true'.",
        doesNotProve: "Does not prove cross-origin data leakage unless sensitive authenticated data is exposed in the response body.",
        limitations: "Preflight OPTIONS behavior may differ from GET/POST request responses.",
      };
    } else if (titleLower.includes("sql") || cwe === "CWE-89") {
      return {
        proves: "Proves whether safe parameter manipulation elicits database syntax anomalies, timing delays, or vendor DBMS error responses.",
        doesNotProve: "Does not prove arbitrary data extraction or database takeover without full blind injection exploitation.",
        limitations: "WAFs or rate-limiting layers may block detection probes without fixing the underlying parameter query string.",
      };
    } else if (titleLower.includes("xss") || cwe === "CWE-79") {
      return {
        proves: "Proves whether non-destructive test markers are reflected without sanitization in the returned HTML/DOM context.",
        doesNotProve: "Does not prove script execution if browser CSP or sandbox attributes prevent inline script execution.",
        limitations: "Client-side DOM-based XSS requires headless browser execution rather than simple HTTP response inspection.",
      };
    }

    return {
      proves: "Corroborates HTTP response status code, header values, and deterministic output from the target asset.",
      doesNotProve: "Does not guarantee end-to-end exploitability in complex multi-step user workflows.",
      limitations: "Automated single-endpoint probe limited to authorized target scope boundaries.",
    };
  };

  const analysis = getProvesAnalysis();

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "20px",
        color: "var(--text-main)",
      }}
    >
      {/* Top Finding Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              className={`badge badge-${finding.severity.toLowerCase()}`}
              style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}
            >
              {finding.severity}
            </span>
            <ValidationBadge status={finding.verification_status || finding.status} />
            <ProvenanceBadge type={finding.provenance_kind || (finding.is_simulated ? "Simulated" : "Live")} />
            {finding.cwe && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                {finding.cwe}
              </span>
            )}
            {finding.is_simulated && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(245, 158, 11, 0.2)",
                  color: "var(--accent-amber)",
                  fontWeight: 700,
                }}
              >
                SIMULATED DATA
              </span>
            )}
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "8px 0 4px 0" }}>{finding.title}</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
            Asset: <span style={{ color: "var(--text-main)" }}>{finding.affected_asset}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onVerifyFinding(finding)}
            disabled={isVerifying}
            style={{
              background: "var(--accent-cyan)",
              color: "#000",
              fontWeight: 600,
              fontSize: "0.82rem",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RotateCcw size={14} className={isVerifying ? "spin" : ""} />
            {isVerifying ? "Probing..." : "Run Verification Check"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onAskAiMentor(finding, latestRecord)}
            style={{
              fontSize: "0.82rem",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--accent-purple, #a855f7)",
            }}
            title="Ask AI Mentor to explain this evidence"
          >
            <Bot size={14} /> AI Mentor Analysis
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: "6px 10px" }}>
              Back to Queue
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("comparison")}
          className={`btn ${activeTab === "comparison" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.8rem", padding: "5px 12px" }}
        >
          Evidence Comparison
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("proves")}
          className={`btn ${activeTab === "proves" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.8rem", padding: "5px 12px" }}
        >
          What Evidence Proves
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`btn ${activeTab === "requests" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.8rem", padding: "5px 12px" }}
        >
          Observation Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`btn ${activeTab === "timeline" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "0.8rem", padding: "5px 12px" }}
        >
          Verification Runs ({records.filter((r) => r.finding_id === finding.id).length})
        </button>
      </div>

      {/* TAB CONTENT: Evidence Comparison */}
      {activeTab === "comparison" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Left: Original Finding */}
          <div
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-amber)" }}>
                Original Scanner Alert
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                {finding.source_tool} v{finding.tool_version || "1.0.0"}
              </span>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Original Evidence</div>
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "10px",
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  marginTop: "4px",
                  maxHeight: "180px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {sanitizedEvidence || "No original evidence text recorded."}
              </div>
            </div>

            <div style={{ fontSize: "0.8rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Initial Confidence:</span>{" "}
                <span style={{ fontWeight: 600 }}>{finding.confidence}%</span>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Method:</span>{" "}
                <span style={{ fontWeight: 600 }}>{finding.detection_method || "AutomatedDetection"}</span>
              </div>
            </div>

            {finding.remediation && (
              <div style={{ marginTop: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Remediation Guidance:</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {finding.remediation}
                </p>
              </div>
            )}
          </div>

          {/* Right: Verification Probe Result */}
          <div
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-cyan)" }}>
                Live Verification Probe
              </span>
              {latestRecord && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  Executed: {new Date(latestRecord.executed_at).toLocaleTimeString()} ({latestRecord.duration_ms} ms)
                </span>
              )}
            </div>

            {latestRecord ? (
              <>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Test Method</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, marginTop: "2px" }}>
                    {latestRecord.test_method}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Actual Observation</div>
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px",
                      padding: "10px",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      marginTop: "4px",
                      maxHeight: "140px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      color: latestRecord.status.toLowerCase().includes("false")
                        ? "var(--accent-emerald)"
                        : latestRecord.status.toLowerCase().includes("confirmed")
                        ? "var(--accent-rose)"
                        : "var(--text-main)",
                    }}
                  >
                    {sanitizedActual}
                  </div>
                </div>

                {sanitizedContradicting && sanitizedContradicting !== "N/A" && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 600 }}>Contradicting Evidence (Refutation)</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {sanitizedContradicting}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: "0.8rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Verification Status:</span>{" "}
                    <span style={{ fontWeight: 700 }}>{latestRecord.status}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-dim)" }}>Confidence Score:</span>{" "}
                    <span style={{ fontWeight: 700 }}>{latestRecord.confidence_score}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "30px 16px",
                  textAlign: "center",
                  color: "var(--text-dim)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <HelpCircle size={32} opacity={0.5} />
                <p style={{ margin: 0, fontSize: "0.85rem" }}>
                  No active verification check has been executed for this finding yet.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onVerifyFinding(finding)}
                  disabled={isVerifying}
                  style={{ fontSize: "0.8rem" }}
                >
                  Run First Verification Check
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: What Evidence Proves */}
      {activeTab === "proves" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "0.88rem", color: "var(--accent-emerald)" }}>
              <CheckCircle size={16} /> What This Evidence Proves
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
              {analysis.proves}
            </p>
          </div>

          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "0.88rem", color: "var(--accent-rose)" }}>
              <XCircle size={16} /> What This Evidence Does NOT Prove
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
              {analysis.doesNotProve}
            </p>
          </div>

          <div
            style={{
              padding: "12px 16px",
              borderRadius: "6px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "0.88rem", color: "var(--accent-amber)" }}>
              <AlertTriangle size={16} /> Known Limitations & Failure Modes
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.82rem", lineHeight: 1.5 }}>
              {analysis.limitations}
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Observation Details */}
      {activeTab === "requests" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "var(--bg-primary)", padding: "14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "6px" }}>Sanitized Observation Details</div>
            <pre
              style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: "4px",
                fontSize: "0.8rem",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                color: "var(--text-main)",
                maxHeight: "220px",
              }}
            >
              {sanitizedActual || sanitizedEvidence || "No raw observation text available."}
            </pre>
          </div>

          {latestRecord?.confidence_rationale && (
            <div style={{ background: "var(--bg-primary)", padding: "14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "4px" }}>Confidence Rationale</div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {latestRecord.confidence_rationale}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Verification Timeline */}
      {activeTab === "timeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {records.filter((r) => r.finding_id === finding.id).length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
              No historical verification runs found for this finding.
            </div>
          ) : (
            records
              .filter((r) => r.finding_id === finding.id)
              .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
              .map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{rec.test_method}</span>
                      <ValidationBadge status={rec.status} />
                    </div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {rec.actual_observation}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    <div>{new Date(rec.executed_at).toLocaleString()}</div>
                    <div>{rec.duration_ms} ms | Score: {rec.confidence_score}%</div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Manual Status Override & Notes */}
      <div
        style={{
          borderTop: "1px solid var(--border-color)",
          paddingTop: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>Override Honest Status:</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUpdateStatus(finding.id, "Confirmed", manualNote)}
            style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--accent-rose)" }}
          >
            Mark Confirmed
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUpdateStatus(finding.id, "FalsePositive", manualNote)}
            style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--accent-emerald)" }}
          >
            Mark False Positive
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUpdateStatus(finding.id, "Potential", manualNote)}
            style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--accent-amber)" }}
          >
            Mark Potential
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUpdateStatus(finding.id, "Inconclusive", manualNote)}
            style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--text-muted)" }}
          >
            Mark Inconclusive
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "240px", maxWidth: "400px" }}>
          <input
            type="text"
            placeholder="Add validation audit note..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            style={{
              flex: 1,
              padding: "5px 8px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              fontSize: "0.78rem",
              color: "var(--text-main)",
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onUpdateStatus(finding.id, finding.verification_status || "Potential", manualNote)}
            style={{ fontSize: "0.75rem", padding: "5px 8px" }}
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};
