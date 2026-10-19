import React, { useState } from "react";
import { IssueRecord, IssueNote } from "../../types";
import { SeverityBadge, StatusBadge } from "../ui/Badge";
import {
  X,
  Copy,
  Check,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface IssueDetailModalProps {
  isOpen: boolean;
  issue: IssueRecord | null;
  onClose: () => void;
  onEdit: (issue: IssueRecord) => void;
  onDelete: (issue: IssueRecord) => void;
  onUpdate: (updated: IssueRecord) => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  isOpen,
  issue,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [authorName, setAuthorName] = useState("SecAnalyst");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!isOpen || !issue) return null;

  const notes: IssueNote[] = (() => {
    try {
      return JSON.parse(issue.notes_json || "[]");
    } catch {
      return [];
    }
  })();

  const history = (() => {
    try {
      return JSON.parse(issue.history_json || "[]");
    } catch {
      return [];
    }
  })();

  const tags: string[] = (() => {
    try {
      return JSON.parse(issue.tags_json || "[]");
    } catch {
      return [];
    }
  })();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const updated = await invoke<IssueRecord>("add_issue_note", {
        id: issue.id,
        author: authorName.trim() || "Analyst",
        text: newNoteText.trim(),
      });
      onUpdate(updated);
      setNewNoteText("");
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleQuickStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await invoke<IssueRecord>("update_issue", {
        id: issue.id,
        payload: { status: newStatus },
      });
      onUpdate(updated);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportSingleIssueJson = () => {
    const blob = new Blob([JSON.stringify(issue, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${issue.id}-details.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSingleIssueMd = () => {
    const md = `# [${issue.id}] ${issue.title}
**Category:** ${issue.category} (${issue.subtype})
**Severity:** ${issue.severity} | **Status:** ${issue.status} | **Verification:** ${issue.verification_status}
**Affected Component:** ${issue.affected_component}
**First Detected:** ${issue.first_detected} | **Last Detected:** ${issue.last_detected}
**Occurrences:** ${issue.occurrence_count}

## Description
${issue.description}

${issue.reproduction_steps ? `## Reproduction Steps\n${issue.reproduction_steps}\n` : ""}
${issue.expected_behavior ? `## Expected Behavior\n${issue.expected_behavior}\n` : ""}
${issue.actual_behavior ? `## Observed Behavior\n${issue.actual_behavior}\n` : ""}
${issue.error_details ? `## Error Details\n\`\`\`\n${issue.error_details}\n\`\`\`\n` : ""}
${issue.evidence ? `## Evidence & Payload\n\`\`\`\n${issue.evidence}\n\`\`\`\n` : ""}
${issue.remediation_guidance ? `## Remediation\n${issue.remediation_guidance}\n` : ""}
${issue.root_cause ? `## Root Cause\n${issue.root_cause}\n` : ""}
`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${issue.id}-documentation.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          padding: 0,
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-detail-title"
      >
        {/* Top Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "var(--accent-cyan)",
                  color: "#050b14",
                }}
              >
                {issue.id}
              </span>
              <SeverityBadge severity={issue.severity as any} />
              <StatusBadge status={issue.status as any} />
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "var(--text-main)",
                  fontWeight: 600,
                }}
              >
                {issue.category} • {issue.subtype}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(6, 182, 212, 0.12)",
                  color: "var(--accent-cyan)",
                  fontWeight: 600,
                }}
              >
                {issue.verification_status}
              </span>
            </div>
            <h2 id="issue-detail-title" style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
              {issue.title}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => onEdit(issue)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", fontSize: "0.78rem" }}
              title="Edit Issue"
            >
              <Edit2 size={13} />
              <span>Edit</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onDelete(issue)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 10px", fontSize: "0.78rem", color: "var(--accent-rose)" }}
              title="Delete Issue"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: "6px 10px" }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              fontSize: "0.8rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.72rem", marginBottom: "2px" }}>
                Affected Component / Asset
              </span>
              <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)", wordBreak: "break-all", fontWeight: 600 }}>
                {issue.affected_component}
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.72rem", marginBottom: "2px" }}>
                Detection Source
              </span>
              <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                {issue.source}
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.72rem", marginBottom: "2px" }}>
                Occurrences
              </span>
              <span style={{ fontWeight: 700, color: issue.occurrence_count > 1 ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                {issue.occurrence_count}x detected
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.72rem", marginBottom: "2px" }}>
                Timestamps
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                First: {new Date(issue.first_detected).toLocaleDateString()} • Last: {new Date(issue.last_detected).toLocaleTimeString()}
              </span>
            </div>
            {tags.length > 0 && (
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Tags:</span>
                {tags.map((t, idx) => (
                  <span key={idx} style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Status Bar */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 600 }}>Quick Actions:</span>
            {issue.status !== "Confirmed" && (
              <button
                className="btn btn-secondary"
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus("Confirmed")}
                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
              >
                Mark Confirmed
              </button>
            )}
            {issue.status !== "Fixed" && (
              <button
                className="btn btn-secondary"
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus("Fixed")}
                style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--accent-emerald)" }}
              >
                <CheckCircle2 size={13} style={{ marginRight: "4px" }} /> Mark Fixed
              </button>
            )}
            {issue.status === "Fixed" && (
              <button
                className="btn btn-secondary"
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus("Open")}
                style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--accent-amber)" }}
              >
                <RotateCcw size={13} style={{ marginRight: "4px" }} /> Reopen Issue
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleExportSingleIssueMd}
              style={{ fontSize: "0.75rem", padding: "4px 8px", marginLeft: "auto" }}
            >
              Export Markdown
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportSingleIssueJson}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            >
              Export JSON
            </button>
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "6px" }}>
              Detailed Description
            </h4>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "8px",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
              }}
            >
              {issue.description}
            </div>
          </div>

          {/* Reproduction Steps & Behavior (if present) */}
          {(issue.reproduction_steps || issue.expected_behavior || issue.actual_behavior) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {issue.reproduction_steps && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "6px" }}>
                    Reproduction Steps
                  </h4>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.82rem",
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                    }}
                  >
                    {issue.reproduction_steps}
                  </div>
                </div>
              )}
              {issue.expected_behavior && (
                <div>
                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "4px" }}>
                    Expected Behavior
                  </h4>
                  <div style={{ padding: "8px 12px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.08)", fontSize: "0.8rem", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    {issue.expected_behavior}
                  </div>
                </div>
              )}
              {issue.actual_behavior && (
                <div>
                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "4px" }}>
                    Observed Behavior
                  </h4>
                  <div style={{ padding: "8px 12px", borderRadius: "6px", background: "rgba(244, 63, 94, 0.08)", fontSize: "0.8rem", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                    {issue.actual_behavior}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technical Evidence / Error details */}
          {(issue.evidence || issue.error_details) && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", margin: 0 }}>
                  Technical Evidence & Error Details
                </h4>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                  onClick={() => handleCopy(issue.evidence || issue.error_details || "", "evidence")}
                >
                  {copiedKey === "evidence" ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                  <span style={{ marginLeft: "4px" }}>{copiedKey === "evidence" ? "Copied" : "Copy Payload"}</span>
                </button>
              </div>
              <pre
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  background: "#080c14",
                  border: "1px solid var(--border-color)",
                  color: "var(--accent-cyan)",
                  fontSize: "0.78rem",
                  overflowX: "auto",
                  margin: 0,
                  fontFamily: "monospace",
                }}
              >
                {issue.evidence || issue.error_details}
              </pre>
            </div>
          )}

          {/* Remediation & Root Cause */}
          {(issue.remediation_guidance || issue.root_cause) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {issue.root_cause && (
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                    Root Cause Analysis
                  </h4>
                  <div style={{ padding: "10px 14px", borderRadius: "6px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", fontSize: "0.82rem" }}>
                    {issue.root_cause}
                  </div>
                </div>
              )}
              {issue.remediation_guidance && (
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-emerald)", textTransform: "uppercase", marginBottom: "4px" }}>
                    Remediation & Defense Guidance
                  </h4>
                  <div style={{ padding: "10px 14px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.82rem", color: "var(--text-main)" }}>
                    {issue.remediation_guidance}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline & Retest History */}
          {history.length > 0 && (
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px" }}>
                Activity & Retest History
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {history.map((h: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.02)",
                      borderLeft: "3px solid var(--accent-cyan)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <span style={{ color: "var(--text-dim)", fontFamily: "monospace", fontSize: "0.72rem" }}>
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--accent-cyan)", fontSize: "0.72rem" }}>
                      [{h.action}]
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {h.actor}: {h.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal Notes Section */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "8px" }}>
              Internal Investigation Notes ({notes.length})
            </h4>

            {notes.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {notes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{n.author}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        {new Date(n.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>{n.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontStyle: "italic", marginBottom: "12px" }}>
                No investigation notes added yet.
              </p>
            )}

            {/* Add note form */}
            <form onSubmit={handleAddNote} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <div style={{ width: "130px" }}>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "2px" }}>
                  Author
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: "32px", fontSize: "0.78rem" }}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "2px" }}>
                  Add Investigation Note
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ height: "32px", fontSize: "0.78rem" }}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Type note or retest observation..."
                  disabled={isSubmittingNote}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmittingNote || !newNoteText.trim()}
                style={{ height: "32px", padding: "0 12px", fontSize: "0.78rem" }}
              >
                Add Note
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
