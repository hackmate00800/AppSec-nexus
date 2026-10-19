import { useState } from "react";
import { ETHICAL_HACKING_WORKFLOW, WEB_API_TESTING_WORKFLOW } from "../data/workflowsData";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Terminal,
  Zap,
  AlertTriangle,
  FileText
} from "lucide-react";

export function WorkflowsView() {
  const [workflowType, setWorkflowType] = useState<"ethical_hacking" | "web_api">("ethical_hacking");
  const [currentStageNumber, setCurrentStageNumber] = useState<number>(1);

  const activeWorkflow = workflowType === "ethical_hacking" ? ETHICAL_HACKING_WORKFLOW : WEB_API_TESTING_WORKFLOW;
  const currentStage = activeWorkflow.find((s) => s.stageNumber === currentStageNumber) || activeWorkflow[0];

  function handleSelectWorkflow(type: "ethical_hacking" | "web_api") {
    setWorkflowType(type);
    setCurrentStageNumber(1);
  }

  function handleNext() {
    if (currentStageNumber < activeWorkflow.length) {
      setCurrentStageNumber(currentStageNumber + 1);
    }
  }

  function handlePrev() {
    if (currentStageNumber > 1) {
      setCurrentStageNumber(currentStageNumber - 1);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Workflow Switcher Header */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 4px 0", color: "var(--text-main)" }}>
            Professional Methodological Workflows
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
            Structured, repeatable operational lifecycles aligned with PTES, NIST SP 800-115, and OWASP WSTG.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`btn ${workflowType === "ethical_hacking" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.8rem", padding: "7px 14px" }}
            onClick={() => handleSelectWorkflow("ethical_hacking")}
          >
            🛡️ 10-Stage Ethical Hacking Lifecycle
          </button>
          <button
            className={`btn ${workflowType === "web_api" ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "0.8rem", padding: "7px 14px" }}
            onClick={() => handleSelectWorkflow("web_api")}
          >
            🌐 12-Stage Web/API Testing Workflow
          </button>
        </div>
      </div>

      {/* Horizontal Stage Stepper Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          padding: "8px 4px",
          scrollbarWidth: "thin"
        }}
      >
        {activeWorkflow.map((stage) => {
          const isActive = stage.stageNumber === currentStageNumber;
          const isPassed = stage.stageNumber < currentStageNumber;

          return (
            <button
              key={stage.stageNumber}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${isActive ? "var(--accent-cyan)" : isPassed ? "rgba(16, 185, 129, 0.4)" : "var(--border-color)"}`,
                background: isActive ? "rgba(6, 182, 212, 0.15)" : isPassed ? "rgba(16, 185, 129, 0.08)" : "var(--bg-secondary)",
                color: isActive ? "var(--accent-cyan)" : isPassed ? "var(--accent-emerald)" : "var(--text-dim)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "all 0.15s ease",
                flexShrink: 0
              }}
              onClick={() => setCurrentStageNumber(stage.stageNumber)}
            >
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: isActive ? "var(--accent-cyan)" : isPassed ? "var(--accent-emerald)" : "rgba(255,255,255,0.1)",
                  color: isActive || isPassed ? "#050811" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: 800
                }}
              >
                {stage.stageNumber}
              </span>
              <span>{stage.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Stage Detailed Inspector */}
      {currentStage && (
        <div className="card" style={{ margin: 0, padding: "20px" }}>
          {/* Stage Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="badge badge-locked" style={{ fontSize: "0.72rem" }}>
                  STAGE {currentStage.stageNumber} OF {activeWorkflow.length}
                </span>
                <span className="badge badge-locked" style={{ fontSize: "0.72rem" }}>
                  {currentStage.category}
                </span>
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                {currentStage.name}
              </h2>
            </div>

            {/* Stepper Navigation Buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                disabled={currentStageNumber === 1}
                onClick={handlePrev}
              >
                <ChevronLeft size={14} /> Previous Stage
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                disabled={currentStageNumber === activeWorkflow.length}
                onClick={handleNext}
              >
                Next Stage <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Objective Statement */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", marginBottom: "16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
              Operational Objective:
            </div>
            <p style={{ fontSize: "0.86rem", color: "var(--text-main)", lineHeight: "1.5", margin: 0 }}>
              {currentStage.objective}
            </p>
          </div>

          {/* Native AppSec Nexus Integration Banner */}
          {currentStage.appsecNexusIntegration && (
            <div
              style={{
                background: currentStage.appsecNexusIntegration.isSupported
                  ? "rgba(6, 182, 212, 0.08)"
                  : "var(--bg-card)",
                border: `1px solid ${currentStage.appsecNexusIntegration.isSupported ? "rgba(6, 182, 212, 0.3)" : "var(--border-color)"}`,
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              <Zap size={20} color="var(--accent-cyan)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-cyan)", marginBottom: "2px" }}>
                  AppSec Nexus Capability: {currentStage.appsecNexusIntegration.featureName}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {currentStage.appsecNexusIntegration.actionDescription}
                </div>
              </div>
            </div>
          )}

          {/* 4-Box Detailed Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "14px", marginBottom: "18px" }}>
            {/* Box 1: Inputs Required */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={15} color="var(--accent-cyan)" /> Required Inputs:
              </div>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {currentStage.inputs.map((inp, idx) => (
                  <li key={idx}>{inp}</li>
                ))}
              </ul>
            </div>

            {/* Box 2: Activities Checklist */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={15} color="var(--accent-emerald)" /> Step-by-Step Activities:
              </div>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {currentStage.activities.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </div>

            {/* Box 3: Tools Used */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Terminal size={15} color="var(--accent-amber)" /> Tools & Utilities:
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {currentStage.toolsUsed.map((tool, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      color: "var(--accent-amber)"
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Box 4: Expected Deliverables */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={15} color="var(--accent-cyan)" /> Deliverables & Outputs:
              </div>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {currentStage.expectedOutputs.map((out, idx) => (
                  <li key={idx}>{out}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Safety & Scope Precautions Alert */}
          {currentStage.safetyAndScopePrecautions.length > 0 && (
            <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-rose)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={15} /> Safety, Legal & Scope Precautions:
              </div>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.8rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "4px" }}>
                {currentStage.safetyAndScopePrecautions.map((prec, idx) => (
                  <li key={idx}>{prec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
