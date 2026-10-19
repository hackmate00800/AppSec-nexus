import React, { useState, useEffect } from "react";
import { Bot, Sparkles, Brain, Clock, X, Cpu } from "lucide-react";

export interface AiThinkingStage {
  label: string;
  minElapsedSeconds: number;
}

const DEFAULT_STAGES: AiThinkingStage[] = [
  { label: "Analyzing query & security context...", minElapsedSeconds: 0 },
  { label: "Evaluating attack surface & vulnerabilities...", minElapsedSeconds: 3 },
  { label: "Synthesizing remediation & defensive rules...", minElapsedSeconds: 7 },
  { label: "Formulating authoritative guidance...", minElapsedSeconds: 12 },
];

interface AiThinkingIndicatorProps {
  modelName?: string;
  role?: "quick" | "deep" | string;
  promptPreview?: string;
  onCancel?: () => void;
  stages?: AiThinkingStage[];
  statusText?: string;
}

export const AiThinkingIndicator: React.FC<AiThinkingIndicatorProps> = ({
  modelName,
  role = "quick",
  promptPreview,
  onCancel,
  stages = DEFAULT_STAGES,
  statusText,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current stage based on elapsed seconds
  const currentStage = stages
    .slice()
    .reverse()
    .find((s) => elapsedSeconds >= s.minElapsedSeconds) || stages[0];

  const isDeep = role === "deep";
  const isDeepSeek = role === "deepseek";

  const getBackgroundColor = () => {
    if (isDeepSeek) return "rgba(59, 130, 246, 0.08)";
    if (isDeep) return "rgba(139, 92, 246, 0.08)";
    return "rgba(14, 165, 233, 0.08)";
  };

  const getBorderColor = () => {
    if (isDeepSeek) return "rgba(59, 130, 246, 0.3)";
    if (isDeep) return "rgba(139, 92, 246, 0.25)";
    return "rgba(14, 165, 233, 0.25)";
  };

  const getAccentColor = () => {
    if (isDeepSeek) return "var(--accent-blue, #3b82f6)";
    if (isDeep) return "var(--accent-purple, #a855f7)";
    return "var(--accent-cyan, #0ea5e9)";
  };

  const getDefaultStatusText = () => {
    if (isDeepSeek) return "🌐 DeepSeek Cloud AI Thinking...";
    if (isDeep) return "🧠 Deep Security AI Thinking...";
    return "⚡ Quick Security AI Responding...";
  };

  return (
    <div
      className="ai-thinking-card"
      style={{
        padding: "14px 16px",
        borderRadius: "10px",
        backgroundColor: getBackgroundColor(),
        border: `1px solid ${getBorderColor()}`,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginTop: "10px",
        marginBottom: "10px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        transition: "all 0.2s ease",
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              backgroundColor: isDeepSeek
                ? "rgba(59, 130, 246, 0.18)"
                : isDeep
                ? "rgba(139, 92, 246, 0.18)"
                : "rgba(14, 165, 233, 0.18)",
            }}
          >
            {isDeepSeek ? (
              <Sparkles size={18} className="pulse" color="var(--accent-blue, #3b82f6)" />
            ) : isDeep ? (
              <Brain size={18} className="pulse" color="var(--accent-purple, #8b5cf6)" />
            ) : (
              <Bot size={18} className="pulse" color="var(--accent-cyan, #0ea5e9)" />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: getAccentColor(),
                }}
              >
                {statusText || getDefaultStatusText()}
              </span>
              {modelName && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text-muted, #94a3b8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Cpu size={10} />
                  {modelName}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-main, #e2e8f0)",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={12} color="var(--accent-amber, #f59e0b)" />
              <span>{currentStage.label}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-dim, #64748b)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "monospace",
            }}
          >
            <Clock size={12} />
            {elapsedSeconds}s
          </span>

          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                fontSize: "0.72rem",
                padding: "3px 8px",
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "var(--accent-rose, #f43f5e)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "transparent",
                cursor: "pointer",
                borderRadius: "4px",
              }}
              onClick={onCancel}
              title="Cancel generation"
            >
              <X size={12} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {promptPreview && (
        <div
          style={{
            fontSize: "0.73rem",
            color: "var(--text-dim, #64748b)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            padding: "4px 8px",
            borderRadius: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Prompt: &quot;{promptPreview}&quot;
        </div>
      )}

      {/* Progress visual line */}
      <div
        style={{
          height: "3px",
          width: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "2px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className="scan-indeterminate-bar"
          style={{
            height: "100%",
            borderRadius: "2px",
            background: isDeep
              ? "linear-gradient(90deg, transparent, #8b5cf6, transparent)"
              : "linear-gradient(90deg, transparent, #0ea5e9, transparent)",
          }}
        />
      </div>
    </div>
  );
};
