import React, { useState, useMemo } from "react";
import {
  CheckSquare,
  CheckCircle2,
  Circle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useTour } from "../../context/TourContext";
import { GUIDED_WORKFLOWS } from "../../help/workflowsData";
import { GuidedWorkflow } from "../../types/tour";
import { SlidingDrawer } from "../ui/SlidingDrawer";

export const GuidedWorkflowsDrawer: React.FC = () => {
  const {
    isWorkflowsOpen,
    closeWorkflows,
    activeWorkflowId,
    workflowProgress,
    toggleWorkflowStep,
    onNavigateTab,
    openHelpCenter,
    startTour,
  } = useTour();

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    activeWorkflowId || GUIDED_WORKFLOWS[0].id
  );

  React.useEffect(() => {
    if (activeWorkflowId) {
      setSelectedWorkflowId(activeWorkflowId);
    }
  }, [activeWorkflowId]);

  const activeWorkflow = useMemo<GuidedWorkflow>(() => {
    return (
      GUIDED_WORKFLOWS.find((w) => w.id === selectedWorkflowId) ||
      GUIDED_WORKFLOWS[0]
    );
  }, [selectedWorkflowId]);

  const completedSteps = useMemo(() => {
    return workflowProgress[activeWorkflow.id] || [];
  }, [workflowProgress, activeWorkflow.id]);

  const totalSteps = activeWorkflow.steps.length;
  const completedCount = completedSteps.length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);

  const handleResetWorkflow = () => {
    completedSteps.forEach((stepId) => {
      toggleWorkflowStep(activeWorkflow.id, stepId);
    });
  };

  return (
    <SlidingDrawer
      isOpen={isWorkflowsOpen}
      onClose={closeWorkflows}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckSquare size={18} color="var(--accent-cyan)" />
          <span>Interactive Security Checklists</span>
        </div>
      }
      subtitle="Step-by-step guided procedures for pentesting, scanning, and remediation"
      storageKey="guided_workflows"
      initialWidth={540}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "16px" }}>
        {/* Workflow Selection Pills */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "4px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          {GUIDED_WORKFLOWS.map((wf) => {
            const isSelected = wf.id === activeWorkflow.id;
            const progress = workflowProgress[wf.id] || [];
            const isAllDone = progress.length === wf.steps.length;

            return (
              <button
                key={wf.id}
                onClick={() => setSelectedWorkflowId(wf.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  backgroundColor: isSelected
                    ? "var(--accent-primary-subtle)"
                    : "var(--bg-secondary)",
                  color: isSelected
                    ? "var(--accent-primary)"
                    : "var(--text-muted)",
                  border: isSelected
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {isAllDone ? (
                  <CheckCircle2 size={13} color="var(--accent-emerald)" />
                ) : (
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: isSelected
                        ? "var(--accent-primary)"
                        : "var(--text-dim)",
                    }}
                  />
                )}
                <span>{wf.title.split(". ")[1] || wf.title}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    opacity: 0.8,
                    padding: "1px 5px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(0,0,0,0.2)",
                  }}
                >
                  {progress.length}/{wf.steps.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Workflow Overview & Progress Meter */}
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "10px",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
              {activeWorkflow.title}
            </h3>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "rgba(14, 165, 233, 0.15)",
                color: "var(--accent-cyan)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                fontWeight: 600,
              }}
            >
              {activeWorkflow.category}
            </span>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 12px 0", lineHeight: "1.4" }}>
            {activeWorkflow.description}
          </p>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "6px" }}>
            <span style={{ color: "var(--text-dim)" }}>
              Checklist Progress: <strong>{completedCount} of {totalSteps} completed</strong>
            </span>
            <span style={{ fontWeight: 700, color: percentComplete === 100 ? "var(--accent-emerald)" : "var(--accent-primary)" }}>
              {percentComplete}%
            </span>
          </div>
          <div
            style={{
              height: "6px",
              borderRadius: "3px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${percentComplete}%`,
                backgroundColor: percentComplete === 100 ? "var(--accent-emerald)" : "var(--accent-primary)",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
          {activeWorkflow.steps.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);

            return (
              <div
                key={step.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: isCompleted ? "rgba(16, 185, 129, 0.05)" : "var(--bg-card)",
                  border: isCompleted
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid var(--border-color)",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <button
                    onClick={() => toggleWorkflowStep(activeWorkflow.id, step.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      marginTop: "2px",
                      color: isCompleted ? "var(--accent-emerald)" : "var(--text-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={isCompleted ? "Mark step as incomplete" : "Mark step as complete"}
                    aria-label={`Toggle step ${idx + 1}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "var(--text-dim)",
                          fontFamily: "monospace",
                        }}
                      >
                        STEP {idx + 1}
                      </span>
                      <h4
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          margin: 0,
                          color: isCompleted ? "var(--text-dim)" : "var(--text-main)",
                          textDecoration: isCompleted ? "line-through" : "none",
                        }}
                      >
                        {step.label}
                      </h4>
                    </div>

                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: isCompleted ? "var(--text-dim)" : "var(--text-muted)",
                        margin: "0 0 10px 0",
                        lineHeight: "1.4",
                      }}
                    >
                      {step.details}
                    </p>

                    {step.actionTab && (
                      <button
                        className="btn btn-secondary"
                        style={{
                          fontSize: "0.74rem",
                          padding: "4px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--accent-cyan)",
                        }}
                        onClick={() => {
                          if (step.actionTab && onNavigateTab) {
                            onNavigateTab(step.actionTab);
                          }
                        }}
                      >
                        <span>{step.actionLabel || `Go to ${step.actionTab}`}</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: "5px" }}
            onClick={handleResetWorkflow}
            disabled={completedCount === 0}
            title="Reset all checkboxes for this checklist"
          >
            <RotateCcw size={13} />
            <span>Reset Progress</span>
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: "5px" }}
              onClick={() => {
                closeWorkflows();
                openHelpCenter();
              }}
              title="Open documentation for more context"
            >
              <BookOpen size={13} />
              <span>Help Articles</span>
            </button>

            <button
              className="btn btn-primary"
              style={{ fontSize: "0.75rem", padding: "4px 12px", display: "flex", alignItems: "center", gap: "5px" }}
              onClick={() => {
                closeWorkflows();
                startTour("welcome");
              }}
              title="Start visual tour for this workflow"
            >
              <Sparkles size={13} />
              <span>Launch Tour</span>
            </button>
          </div>
        </div>
      </div>
    </SlidingDrawer>
  );
};
