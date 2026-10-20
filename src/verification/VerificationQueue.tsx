import React, { useState } from "react";
import { Finding, Target, ValidationRecord } from "../types";
import { ValidationBadge, ProvenanceBadge } from "../components/ui/Badge";
import {
  RotateCcw,
  Search,
  Eye,
  Bot,
} from "lucide-react";

interface VerificationQueueProps {
  findings: Finding[];
  targets: Target[];
  records: ValidationRecord[];
  isVerifying: boolean;
  onVerifyFinding: (finding: Finding) => void;
  onBatchVerify: (findingIds: string[]) => void;
  onSelectFindingForEvidence: (finding: Finding) => void;
  onAskAiMentor: (finding: Finding) => void;
}

export const VerificationQueue: React.FC<VerificationQueueProps> = ({
  findings,
  targets,
  records,
  isVerifying,
  onVerifyFinding,
  onBatchVerify,
  onSelectFindingForEvidence,
  onAskAiMentor,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDetector, setSelectedDetector] = useState<string>("ALL");

  // Unique detectors
  const detectors = Array.from(new Set(findings.map((f) => f.source_tool || "BaselineScanner"))).sort();

  // Filtered queue
  const filteredFindings = findings.filter((f) => {
    if (selectedTargetId !== "ALL" && f.target_id !== selectedTargetId) return false;
    if (selectedSeverity !== "ALL" && f.severity.toLowerCase() !== selectedSeverity.toLowerCase()) return false;
    if (selectedStatus !== "ALL") {
      const st = (f.verification_status || f.status || "").toLowerCase();
      if (!st.includes(selectedStatus.toLowerCase())) return false;
    }
    if (selectedDetector !== "ALL" && (f.source_tool || "BaselineScanner") !== selectedDetector) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchAsset = f.affected_asset.toLowerCase().includes(q);
      const matchCwe = (f.cwe || "").toLowerCase().includes(q);
      if (!matchTitle && !matchAsset && !matchCwe) return false;
    }
    return true;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredFindings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFindings.map((f) => f.id));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Search and Filters */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "12px 16px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <Search
            size={14}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }}
          />
          <input
            type="text"
            placeholder="Search findings by title, asset, or CWE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              fontSize: "0.82rem",
              color: "var(--text-main)",
            }}
          />
        </div>

        {/* Target Filter */}
        <select
          value={selectedTargetId}
          onChange={(e) => setSelectedTargetId(e.target.value)}
          style={{
            padding: "7px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "var(--text-main)",
          }}
          aria-label="Filter by Target"
        >
          <option value="ALL">All Targets ({targets.length})</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          style={{
            padding: "7px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "var(--text-main)",
          }}
          aria-label="Filter by Severity"
        >
          <option value="ALL">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
          <option value="Info">Info</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            padding: "7px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "var(--text-main)",
          }}
          aria-label="Filter by Status"
        >
          <option value="ALL">All Verification States</option>
          <option value="confirmed">Confirmed</option>
          <option value="potential">Potential / Pending</option>
          <option value="false">False Positive</option>
          <option value="inconclusive">Inconclusive</option>
        </select>

        {/* Detector Filter */}
        <select
          value={selectedDetector}
          onChange={(e) => setSelectedDetector(e.target.value)}
          style={{
            padding: "7px 10px",
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "var(--text-main)",
          }}
          aria-label="Filter by Detector"
        >
          <option value="ALL">All Detectors ({detectors.length})</option>
          {detectors.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Batch action */}
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onBatchVerify(selectedIds)}
            disabled={isVerifying}
            style={{
              background: "var(--accent-cyan)",
              color: "#000",
              fontWeight: 600,
              fontSize: "0.8rem",
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <RotateCcw size={13} className={isVerifying ? "spin" : ""} />
            Verify Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Table of Findings */}
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
              <th style={{ padding: "10px 14px", width: "36px" }}>
                <input
                  type="checkbox"
                  checked={filteredFindings.length > 0 && selectedIds.length === filteredFindings.length}
                  onChange={handleToggleSelectAll}
                  style={{ accentColor: "var(--accent-cyan)", cursor: "pointer" }}
                  aria-label="Select all findings"
                />
              </th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Severity</th>
              <th style={{ padding: "10px 12px" }}>Finding Title & CWE</th>
              <th style={{ padding: "10px 12px" }}>Target / Affected Asset</th>
              <th style={{ padding: "10px 12px", width: "120px" }}>Detector Tool</th>
              <th style={{ padding: "10px 12px", width: "140px" }}>Verification Status</th>
              <th style={{ padding: "10px 12px", width: "90px" }}>Confidence</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFindings.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "36px", textAlign: "center", color: "var(--text-dim)" }}>
                  No findings match the current verification filters.
                </td>
              </tr>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedIds.includes(finding.id);
                const hasRecord = records.some((r) => r.finding_id === finding.id);

                return (
                  <tr
                    key={finding.id}
                    style={{
                      borderBottom: "1px solid var(--border-color)",
                      background: isSelected ? "rgba(6, 182, 212, 0.05)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(finding.id)}
                        style={{ accentColor: "var(--accent-cyan)", cursor: "pointer" }}
                        aria-label={`Select ${finding.title}`}
                      />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        className={`badge badge-${finding.severity.toLowerCase()}`}
                        style={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}
                      >
                        {finding.severity}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{finding.title}</span>
                        {hasRecord && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              padding: "1px 4px",
                              borderRadius: "3px",
                              background: "rgba(6, 182, 212, 0.15)",
                              color: "var(--accent-cyan)",
                              fontWeight: 600,
                            }}
                            title="Evidence probe recorded"
                          >
                            PROBED
                          </span>
                        )}
                        {finding.is_simulated && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              padding: "1px 4px",
                              borderRadius: "3px",
                              background: "rgba(245, 158, 11, 0.2)",
                              color: "var(--accent-amber)",
                              fontWeight: 700,
                            }}
                          >
                            SIMULATED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        {finding.cwe || "Unmapped CWE"} | ID: {finding.id.slice(0, 8)}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "var(--text-muted)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={finding.affected_asset}>
                        {finding.affected_asset}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{finding.source_tool}</div>
                      <ProvenanceBadge type={finding.provenance_kind || (finding.is_simulated ? "Simulated" : "Live")} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <ValidationBadge status={finding.verification_status || finding.status} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "6px",
                            borderRadius: "3px",
                            background: "var(--bg-primary)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${finding.confidence}%`,
                              height: "100%",
                              background: finding.confidence >= 80 ? "var(--accent-emerald)" : finding.confidence >= 50 ? "var(--accent-cyan)" : "var(--accent-amber)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{finding.confidence}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onSelectFindingForEvidence(finding)}
                          style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                          title="Inspect Evidence Comparison"
                        >
                          <Eye size={12} /> Inspect
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onVerifyFinding(finding)}
                          disabled={isVerifying}
                          style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", color: "var(--accent-cyan)" }}
                          title="Run Active Verification Check"
                        >
                          <RotateCcw size={12} className={isVerifying ? "spin" : ""} /> Verify
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => onAskAiMentor(finding)}
                          style={{ padding: "4px 8px", fontSize: "0.75rem", color: "var(--accent-purple, #a855f7)" }}
                          title="Ask AI Mentor"
                        >
                          <Bot size={12} />
                        </button>
                      </div>
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
