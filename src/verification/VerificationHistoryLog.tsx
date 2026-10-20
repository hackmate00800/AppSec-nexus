import React, { useState } from "react";
import { Finding, ValidationRecord } from "../types";
import { ValidationBadge } from "../components/ui/Badge";
import { Trash2, Search, Eye } from "lucide-react";
import { VerificationAuditEngine } from "./VerificationAuditEngine";

interface VerificationHistoryLogProps {
  records: ValidationRecord[];
  findings: Finding[];
  onSelectFinding: (finding: Finding) => void;
  onClearHistory: () => void;
}

export const VerificationHistoryLog: React.FC<VerificationHistoryLogProps> = ({
  records,
  findings,
  onSelectFinding,
  onClearHistory,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredRecords = records.filter((r) => {
    if (statusFilter !== "ALL" && !r.status.toLowerCase().includes(statusFilter.toLowerCase())) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchMethod = r.test_method.toLowerCase().includes(q);
      const matchObs = r.actual_observation.toLowerCase().includes(q);
      const matchFinding = findings.find((f) => f.id === r.finding_id)?.title.toLowerCase().includes(q);
      if (!matchMethod && !matchObs && !matchFinding) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Controls */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          padding: "12px 16px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={14}
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }}
            />
            <input
              type="text"
              placeholder="Search history by method, finding, or observation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "0.82rem",
                color: "var(--text-main)",
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              fontSize: "0.82rem",
              color: "var(--text-main)",
            }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="confirmed">Confirmed</option>
            <option value="false">False Positive</option>
            <option value="unconfirmed">Inconclusive</option>
            <option value="failed">Failed / Error</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
            Showing {filteredRecords.length} of {records.length} runs
          </span>
          {records.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClearHistory}
              style={{ fontSize: "0.78rem", padding: "6px 10px", color: "var(--accent-rose)" }}
              title="Clear all stored verification history"
            >
              <Trash2 size={13} /> Clear History
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
              <th style={{ padding: "10px 14px", width: "160px" }}>Executed At</th>
              <th style={{ padding: "10px 12px" }}>Finding Title</th>
              <th style={{ padding: "10px 12px", width: "180px" }}>Test Method</th>
              <th style={{ padding: "10px 12px", width: "130px" }}>Outcome Status</th>
              <th style={{ padding: "10px 12px", width: "80px" }}>Score</th>
              <th style={{ padding: "10px 12px", width: "80px" }}>Latency</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "36px", textAlign: "center", color: "var(--text-dim)" }}>
                  No verification execution history recorded yet.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const finding = findings.find((f) => f.id === r.finding_id);
                const sanitizedObs = VerificationAuditEngine.sanitizeEvidence(r.actual_observation);

                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "10px 14px", color: "var(--text-dim)", fontFamily: "monospace", fontSize: "0.76rem" }}>
                      {new Date(r.executed_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                        {finding ? finding.title : `Finding #${r.finding_id.slice(0, 8)}`}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sanitizedObs}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.78rem" }}>
                      {r.test_method}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <ValidationBadge status={r.status} />
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, fontFamily: "monospace" }}>
                      {r.confidence_score}%
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-dim)", fontFamily: "monospace", fontSize: "0.76rem" }}>
                      {r.duration_ms} ms
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      {finding && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onSelectFinding(finding)}
                          style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                          title="View Finding Evidence"
                        >
                          <Eye size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
