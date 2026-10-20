import React from "react";
import { Finding, ValidationRecord } from "../types";
import { VerificationAuditEngine } from "./VerificationAuditEngine";
import { GenuineAuditResult } from "./types";
import { AlertTriangle, Database } from "lucide-react";

interface GenuineAuditViewProps {
  findings: Finding[];
  records: ValidationRecord[];
  onSelectFinding: (finding: Finding) => void;
}

export const GenuineAuditView: React.FC<GenuineAuditViewProps> = ({
  findings,
  records,
  onSelectFinding,
}) => {
  const auditResult: GenuineAuditResult = React.useMemo(() => {
    return VerificationAuditEngine.auditFindings(findings, records);
  }, [findings, records]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Integrity Summary Banner */}
      <div
        className="card"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <div style={{ padding: "6px", borderRadius: "6px", background: "rgba(6, 182, 212, 0.12)", color: "var(--accent-cyan)" }}>
            <Database size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Runtime Provenance & Detector Honesty Audit
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Continuous static and runtime analysis verifying whether findings stem from genuine target observations, external tool execution, or synthetic test fixtures.
            </p>
          </div>
        </div>

        {/* Provenance Distribution Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginTop: "14px" }}>
          <div style={{ background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Live HTTP Probes</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "2px" }}>
              {auditResult.liveCount}
            </div>
          </div>

          <div style={{ background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Tool Subprocesses</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "2px" }}>
              {auditResult.externalToolCount}
            </div>
          </div>

          <div style={{ background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Static Code AST</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-purple, #a855f7)", marginTop: "2px" }}>
              {auditResult.staticCount}
            </div>
          </div>

          <div style={{ background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Simulated Fixtures</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "2px" }}>
              {auditResult.simulatedCount}
            </div>
          </div>

          <div style={{ background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Heuristic Gaps</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: auditResult.unverifiedHeuristicsCount > 0 ? "var(--accent-rose)" : "var(--accent-emerald)", marginTop: "2px" }}>
              {auditResult.unverifiedHeuristicsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Detector Integrity Breakdown Table */}
      <div
        className="card"
        style={{
          padding: 0,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
          <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
            Detector & Scanner Provenance Register
          </h4>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
              <th style={{ padding: "10px 14px" }}>Detector / Tool</th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Total Alerts</th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Confirmed</th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Refuted</th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Potential</th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Simulated</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Integrity Verdict</th>
            </tr>
          </thead>
          <tbody>
            {auditResult.detectorIntegrity.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-dim)" }}>
                  No detectors have generated findings yet.
                </td>
              </tr>
            ) : (
              auditResult.detectorIntegrity.map((det) => (
                <tr key={det.detector} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{det.detector}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{det.total}</td>
                  <td style={{ padding: "10px 12px", color: "var(--accent-rose)", fontWeight: 600, fontFamily: "monospace" }}>
                    {det.confirmed}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--accent-emerald)", fontWeight: 600, fontFamily: "monospace" }}>
                    {det.falsePositive}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--accent-amber)", fontFamily: "monospace" }}>
                    {det.potential}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-dim)", fontFamily: "monospace" }}>
                    {det.simulated}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background:
                          det.verdict === "Authentic Live"
                            ? "rgba(6, 182, 212, 0.15)"
                            : det.verdict === "Tool Subprocess"
                            ? "rgba(16, 185, 129, 0.15)"
                            : det.verdict === "Simulated Demo"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                        color:
                          det.verdict === "Authentic Live"
                            ? "var(--accent-cyan)"
                            : det.verdict === "Tool Subprocess"
                            ? "var(--accent-emerald)"
                            : det.verdict === "Simulated Demo"
                            ? "var(--accent-amber)"
                            : "var(--accent-rose)",
                      }}
                    >
                      {det.verdict}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Flagged Anomalies Register */}
      {auditResult.flaggedItems.length > 0 && (
        <div
          className="card"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <AlertTriangle size={16} color="var(--accent-amber)" />
            <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
              Flagged Provenance Anomalies & Heuristic Discrepancies ({auditResult.flaggedItems.length})
            </h4>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {auditResult.flaggedItems.map((item, idx) => {
              const finding = findings.find((f) => f.id === item.findingId);
              return (
                <div
                  key={idx}
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--text-main)" }}>
                      {item.title}
                    </div>
                    <p style={{ margin: "4px 0 2px 0", fontSize: "0.78rem", color: "var(--accent-amber)" }}>
                      {item.reason}
                    </p>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                      Recommended Action: {item.suggestedAction}
                    </div>
                  </div>
                  {finding && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onSelectFinding(finding)}
                      style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                    >
                      Inspect Finding
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
