import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Finding, FindingSeverity, FindingStatus, FindingUpdatePayload } from "../../types";
import { Shield, X, Check, AlertCircle } from "lucide-react";

interface FindingEditModalProps {
  isOpen: boolean;
  finding: Finding | null;
  onSave: (updated: Finding) => void;
  onClose: () => void;
}

export const FindingEditModal: React.FC<FindingEditModalProps> = ({
  isOpen,
  finding,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<FindingSeverity>("Medium");
  const [status, setStatus] = useState<FindingStatus>("NeedsReview");
  const [confidence, setConfidence] = useState<number>(80);
  const [affectedAsset, setAffectedAsset] = useState("");
  const [cwe, setCwe] = useState("");
  const [remediation, setRemediation] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (finding) {
      setTitle(finding.title);
      setSeverity(finding.severity);
      setStatus(finding.status);
      setConfidence(finding.confidence || 80);
      setAffectedAsset(finding.affected_asset);
      setCwe(finding.cwe || "");
      setRemediation(finding.remediation);
      setEvidence(finding.evidence);
      setError(null);
    }
  }, [finding, isOpen]);

  if (!isOpen || !finding) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finding) return;
    if (!title.trim()) {
      setError("Finding title cannot be empty.");
      return;
    }
    if (!affectedAsset.trim()) {
      setError("Affected asset/URL cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: FindingUpdatePayload = {
      title: title.trim(),
      severity,
      status,
      confidence: Number(confidence),
      affected_asset: affectedAsset.trim(),
      cwe: cwe.trim() || undefined,
      remediation: remediation.trim() || "Review secure coding guidelines.",
      evidence: evidence.trim() || "No scanner evidence provided.",
    };

    try {
      const updated = await invoke<Finding>("update_finding", {
        findingId: finding.id,
        payload,
      });
      onSave(updated);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || "Failed to update finding.");
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
        aria-labelledby="finding-edit-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={18} color="var(--accent-cyan)" />
            <h3 id="finding-edit-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              Edit Vulnerability Finding
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
          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Finding Title *
            </label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Insecure CORS Configuration"
              required
              disabled={isSubmitting}
            />
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
              <label htmlFor="finding-edit-status" style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Status
              </label>
              <select
                id="finding-edit-status"
                aria-label="Triage Status"
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as FindingStatus)}
                disabled={isSubmitting}
              >
                <option value="NeedsValidation">Needs Validation</option>
                <option value="Confirmed">Confirmed</option>
                <option value="LikelyTruePositive">Likely True Positive</option>
                <option value="NeedsReview">Needs Review</option>
                <option value="Unconfirmed">Unconfirmed</option>
                <option value="LikelyFalsePositive">Likely False Positive</option>
                <option value="ValidationFailed">Validation Failed</option>
                <option value="NotApplicable">Not Applicable</option>
                <option value="New">New</option>
                <option value="AcceptedRisk">Accepted Risk</option>
                <option value="Fixed">Fixed</option>
                <option value="FalsePositive">False Positive</option>
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
                placeholder="e.g., https://example.com/api/v1/auth"
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
                placeholder="e.g., CWE-79"
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
              Scanner / Verification Evidence
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Captured headers, response body, curl commands, or repro payload..."
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
              <span>{isSubmitting ? "Saving..." : "Save Finding"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
