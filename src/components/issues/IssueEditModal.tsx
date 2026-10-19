import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { IssueRecord, IssueCategory, IssueSeverity, IssueStatus, IssueVerificationStatus } from "../../types";
import { AlertCircle, Check, X, Edit3 } from "lucide-react";

interface IssueEditModalProps {
  isOpen: boolean;
  issue: IssueRecord | null;
  onSave: (updated: IssueRecord) => void;
  onClose: () => void;
}

export const IssueEditModal: React.FC<IssueEditModalProps> = ({
  isOpen,
  issue,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<IssueCategory>("FunctionalBug");
  const [subtype, setSubtype] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("Medium");
  const [status, setStatus] = useState<IssueStatus>("Open");
  const [verificationStatus, setVerificationStatus] = useState<IssueVerificationStatus>("HumanVerified");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [description, setDescription] = useState("");
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [evidence, setEvidence] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");
  const [remediationGuidance, setRemediationGuidance] = useState("");
  const [assignedOwner, setAssignedOwner] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (issue) {
      setTitle(issue.title || "");
      setCategory(issue.category);
      setSubtype(issue.subtype || "");
      setSeverity(issue.severity);
      setStatus(issue.status);
      setVerificationStatus(issue.verification_status);
      setAffectedComponent(issue.affected_component || "");
      setDescription(issue.description || "");
      setReproductionSteps(issue.reproduction_steps || "");
      setExpectedBehavior(issue.expected_behavior || "");
      setActualBehavior(issue.actual_behavior || "");
      setErrorDetails(issue.error_details || "");
      setEvidence(issue.evidence || "");
      setRootCause(issue.root_cause || "");
      setImpactAssessment(issue.impact_assessment || "");
      setRemediationGuidance(issue.remediation_guidance || "");
      setAssignedOwner(issue.assigned_owner || "");
      setResolutionSummary(issue.resolution_summary || "");
      try {
        const parsedTags: string[] = JSON.parse(issue.tags_json || "[]");
        setTagsInput(parsedTags.join(", "));
      } catch {
        setTagsInput("");
      }
      setError(null);
    }
  }, [issue, isOpen]);

  if (!isOpen || !issue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!affectedComponent.trim()) {
      setError("Affected component is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      category,
      subtype: subtype.trim() || undefined,
      severity,
      status,
      verification_status: verificationStatus,
      affected_component: affectedComponent.trim(),
      description: description.trim(),
      reproduction_steps: reproductionSteps.trim() || undefined,
      expected_behavior: expectedBehavior.trim() || undefined,
      actual_behavior: actualBehavior.trim() || undefined,
      error_details: errorDetails.trim() || undefined,
      evidence: evidence.trim() || undefined,
      root_cause: rootCause.trim() || undefined,
      impact_assessment: impactAssessment.trim() || undefined,
      remediation_guidance: remediationGuidance.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      assigned_owner: assignedOwner.trim() || undefined,
      resolution_summary: resolutionSummary.trim() || undefined,
    };

    try {
      const updated = await invoke<IssueRecord>("update_issue", {
        id: issue.id,
        payload,
      });
      onSave(updated);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || "Failed to update issue.");
    } finally {
      setIsSubmitting(false);
    }
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
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
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
        aria-labelledby="issue-edit-title"
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Edit3 size={18} color="var(--accent-cyan)" />
            <h3 id="issue-edit-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Edit Issue [{issue.id}]
            </h3>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px" }}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Issue Category *
              </label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                disabled={isSubmitting}
              >
                <option value="SecurityVulnerability">Security Vulnerability</option>
                <option value="FunctionalBug">Functional Bug / Logic Defect</option>
                <option value="UiUxGlitch">UI / UX Glitch or Styling Flaw</option>
                <option value="BackendApiError">Backend / API Service Error</option>
                <option value="DatabaseIssue">Database & Data Integrity Issue</option>
                <option value="ToolExecutionFailure">Tool / CLI Execution Failure</option>
                <option value="PerformanceIssue">Performance & Latency Issue</option>
                <option value="ConfigurationIssue">Configuration & Environment Issue</option>
                <option value="ManualReport">Other Manual Report</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Subtype / Classification
              </label>
              <input
                type="text"
                className="input-field"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Issue Title *
              </label>
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Severity
              </label>
              <select
                className="input-field"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                disabled={isSubmitting}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Info">Info</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Status
              </label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as IssueStatus)}
                disabled={isSubmitting}
              >
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Confirmed">Confirmed</option>
                <option value="FalsePositive">False Positive</option>
                <option value="Fixed">Fixed</option>
                <option value="AcceptedRisk">Accepted Risk</option>
                <option value="RetestFailed">Retest Failed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Verification Status
              </label>
              <select
                className="input-field"
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as IssueVerificationStatus)}
                disabled={isSubmitting}
              >
                <option value="AutomatedObservation">Automated Observation</option>
                <option value="NeedsValidation">Needs Validation</option>
                <option value="HumanVerified">Human Verified</option>
                <option value="RetestedValid">Retested Valid</option>
                <option value="FalsePositive">False Positive</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Affected Component *
              </label>
              <input
                type="text"
                className="input-field"
                value={affectedComponent}
                onChange={(e) => setAffectedComponent(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Detailed Description *
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Reproduction Steps
              </label>
              <textarea
                className="textarea-field"
                rows={2}
                value={reproductionSteps}
                onChange={(e) => setReproductionSteps(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Remediation Guidance
              </label>
              <textarea
                className="textarea-field"
                rows={2}
                value={remediationGuidance}
                onChange={(e) => setRemediationGuidance(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Assigned Owner
              </label>
              <input
                type="text"
                className="input-field"
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Resolution Summary
              </label>
              <input
                type="text"
                className="input-field"
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="e.g., Patched in commit a1b2c3d"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Tags (comma separated)
            </label>
            <input
              type="text"
              className="input-field"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
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
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
