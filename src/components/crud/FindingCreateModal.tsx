import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Finding, FindingSeverity, FindingStatus, Target } from "../../types";
import { PlusCircle, X, Check, AlertCircle } from "lucide-react";

interface FindingCreateModalProps {
  isOpen: boolean;
  targets: Target[];
  defaultTargetId?: string;
  onCreated: (finding: Finding) => void;
  onClose: () => void;
}

export const FindingCreateModal: React.FC<FindingCreateModalProps> = ({
  isOpen,
  targets,
  defaultTargetId,
  onCreated,
  onClose,
}) => {
  const [targetId, setTargetId] = useState(defaultTargetId || (targets[0]?.id ?? ""));
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<FindingSeverity>("Medium");
  const [status, setStatus] = useState<FindingStatus>("NeedsReview");
  const [confidence, setConfidence] = useState<number>(85);
  const [affectedAsset, setAffectedAsset] = useState("");
  const [cwe, setCwe] = useState("");
  const [remediation, setRemediation] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) {
      setError("Please select an authorized target.");
      return;
    }
    if (!title.trim()) {
      setError("Finding title cannot be empty.");
      return;
    }
    if (!affectedAsset.trim()) {
      setError("Affected asset / URL cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await invoke<Finding>("create_finding", {
        targetId,
        title: title.trim(),
        severity,
        confidence: Number(confidence),
        affectedAsset: affectedAsset.trim(),
        evidence: evidence.trim() || "Manual security assessment observation.",
        sourceTool: "Manual Audit",
        cwe: cwe.trim() || undefined,
        remediation: remediation.trim() || "Implement standard defense-in-depth sanitization and authorization checks.",
        status,
      });
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || "Failed to create finding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
          padding: "20px",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="finding-create-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PlusCircle size={18} color="var(--accent-cyan)" />
            <h3 id="finding-create-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              Record Custom Security Finding
            </h3>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px" }}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Target Project *
              </label>
              <select
                className="input-field"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={isSubmitting}
                required
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.primary_url})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Finding Title *
              </label>
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., IDOR in User Profile Endpoint"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Severity
              </label>
              <select
                className="input-field"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as FindingSeverity)}
                disabled={isSubmitting}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Info">Info</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Initial Status
              </label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as FindingStatus)}
                disabled={isSubmitting}
              >
                <option value="New">New</option>
                <option value="NeedsReview">Needs Review</option>
                <option value="NeedsValidation">Needs Validation</option>
                <option value="Confirmed">Confirmed</option>
                <option value="AcceptedRisk">Accepted Risk</option>
                <option value="Fixed">Fixed</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Confidence ({confidence}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                disabled={isSubmitting}
                style={{ width: "100%", marginTop: "8px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Affected Asset / URL *
              </label>
              <input
                type="text"
                className="input-field"
                value={affectedAsset}
                onChange={(e) => setAffectedAsset(e.target.value)}
                placeholder="e.g., https://example.com/api/users/profile?id=123"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                CWE Reference
              </label>
              <input
                type="text"
                className="input-field"
                value={cwe}
                onChange={(e) => setCwe(e.target.value)}
                placeholder="e.g., CWE-639"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Remediation Guidance
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              value={remediation}
              onChange={(e) => setRemediation(e.target.value)}
              placeholder="Recommended fix and defensive coding guidelines..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Observation Evidence & Repro Steps
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Manual testing payload, HTTP headers, curl command, or reproduction steps..."
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--accent-rose)",
                fontSize: "0.8rem",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Check size={14} />
              <span>{isSubmitting ? "Saving..." : "Record Finding"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
