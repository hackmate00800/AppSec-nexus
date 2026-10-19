import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { IssueRecord, IssueCategory, IssueSeverity, Target } from "../../types";
import { AlertCircle, Check, X, PlusCircle } from "lucide-react";

interface IssueCreateModalProps {
  isOpen: boolean;
  targets: Target[];
  onCreated: (created: IssueRecord) => void;
  onClose: () => void;
}

export const IssueCreateModal: React.FC<IssueCreateModalProps> = ({
  isOpen,
  targets,
  onCreated,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<IssueCategory>("FunctionalBug");
  const [subtype, setSubtype] = useState("");
  const [severity, setSeverity] = useState<IssueSeverity>("Medium");
  const [status, setStatus] = useState("Open");
  const [verificationStatus, setVerificationStatus] = useState("HumanVerified");
  const [affectedComponent, setAffectedComponent] = useState("");
  const [targetId, setTargetId] = useState(targets[0]?.id || "");
  const [description, setDescription] = useState("");
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [evidence, setEvidence] = useState("");
  const [remediationGuidance, setRemediationGuidance] = useState("");
  const [assignedOwner, setAssignedOwner] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Issue title is required.");
      return;
    }
    if (!affectedComponent.trim()) {
      setError("Affected component or endpoint is required.");
      return;
    }
    if (!description.trim()) {
      setError("Issue description is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const selectedTarget = targets.find((t) => t.id === targetId);

    const payload = {
      title: title.trim(),
      category,
      subtype: subtype.trim() || undefined,
      severity,
      status,
      verification_status: verificationStatus,
      affected_target_id: targetId || undefined,
      affected_target_name: selectedTarget?.name || undefined,
      affected_component: affectedComponent.trim(),
      source: "ManualReport",
      description: description.trim(),
      reproduction_steps: reproductionSteps.trim() || undefined,
      expected_behavior: expectedBehavior.trim() || undefined,
      actual_behavior: actualBehavior.trim() || undefined,
      error_details: errorDetails.trim() || undefined,
      evidence: evidence.trim() || undefined,
      remediation_guidance: remediationGuidance.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      assigned_owner: assignedOwner.trim() || undefined,
    };

    try {
      const created = await invoke<IssueRecord>("record_issue", { payload });
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || "Failed to record issue.");
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
        aria-labelledby="issue-create-title"
      >
        {/* Header */}
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
            <PlusCircle size={18} color="var(--accent-cyan)" />
            <h3 id="issue-create-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Document New Issue or Defect
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

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Row 1: Category & Subtype */}
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
                placeholder={
                  category === "SecurityVulnerability"
                    ? "e.g., CWE-89, SQL Injection, IDOR"
                    : category === "UiUxGlitch"
                    ? "e.g., Responsive Breakpoint, Overflow"
                    : "e.g., Unhandled Promise, Connection Timeout"
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Row 2: Title, Severity, Status */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Issue Title *
              </label>
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Navigation sidebar does not collapse on tablet screen"
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

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Initial Status
              </label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          {/* Row 3: Affected Component, Scope, Verification */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Affected Component / Endpoint / Screen *
              </label>
              <input
                type="text"
                className="input-field"
                value={affectedComponent}
                onChange={(e) => setAffectedComponent(e.target.value)}
                placeholder="e.g., /api/v1/auth/login or SidebarNav.tsx"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Target Project Scope
              </label>
              <select
                className="input-field"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Global / Platform Level</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.primary_url})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Verification
              </label>
              <select
                className="input-field"
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="HumanVerified">Human Verified</option>
                <option value="NeedsValidation">Needs Validation</option>
                <option value="AutomatedObservation">Automated</option>
              </select>
            </div>
          </div>

          {/* Row 4: Description */}
          <div>
            <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Detailed Description *
            </label>
            <textarea
              className="textarea-field"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the background, symptoms, and impact of this issue..."
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Dynamic Template Fields: For Bugs & Glitches */}
          {(category === "FunctionalBug" || category === "UiUxGlitch" || category === "PerformanceIssue") && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                  Reproduction Steps
                </label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  value={reproductionSteps}
                  onChange={(e) => setReproductionSteps(e.target.value)}
                  placeholder="1. Navigate to...\n2. Click on...\n3. Observe..."
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "4px" }}>
                    Expected Behavior
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="e.g., Drawer closes smoothly"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--accent-rose)", marginBottom: "4px" }}>
                    Actual Observed Behavior
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    placeholder="e.g., Screen flickers and remains open"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </>
          )}

          {/* Dynamic Template Fields: For Security Vulnerabilities */}
          {category === "SecurityVulnerability" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                  Technical Evidence & Request/Response (Sanitized)
                </label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="HTTP request headers, curl command, or test payload with confidential tokens redacted..."
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                  Remediation & Defensive Guidance
                </label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  value={remediationGuidance}
                  onChange={(e) => setRemediationGuidance(e.target.value)}
                  placeholder="Recommended coding fix, architectural changes, or patch..."
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {/* Dynamic Template Fields: For Backend / Tool / DB Failures */}
          {(category === "BackendApiError" || category === "ToolExecutionFailure" || category === "DatabaseIssue") && (
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Error Message / Stack Trace / Diagnostic Logs
              </label>
              <textarea
                className="textarea-field"
                rows={3}
                value={errorDetails}
                onChange={(e) => setErrorDetails(e.target.value)}
                placeholder="Paste CLI error output, exception stack trace, or SQL error message..."
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Row 5: Owner & Tags */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Assigned Owner / Team
              </label>
              <input
                type="text"
                className="input-field"
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                placeholder="e.g., Frontend Team, DevSecOps"
                disabled={isSubmitting}
              />
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
                placeholder="e.g., ui, mobile, regression, high-priority"
                disabled={isSubmitting}
              />
            </div>
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

          {/* Action Buttons */}
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
              <span>{isSubmitting ? "Documenting..." : "Document Issue"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
