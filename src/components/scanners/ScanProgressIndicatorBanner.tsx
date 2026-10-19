import React from "react";
import {
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Square,
  X,
  Target as TargetIcon,
  Activity,
} from "lucide-react";
import { useScanProgress } from "../../context/ScanProgressContext";

interface Props {
  onNavigateToConsole?: () => void;
  className?: string;
}

export const ScanProgressIndicatorBanner: React.FC<Props> = ({
  onNavigateToConsole,
  className = "",
}) => {
  const { activeScan, cancelScan, clearScan } = useScanProgress();

  if (!activeScan) return null;

  const isRunning = activeScan.status === "running" || activeScan.status === "queued";
  const isCompleted = activeScan.status === "completed";
  const isFailed = activeScan.status === "failed";
  const isCancelled = activeScan.status === "cancelled";

  const getBorderColor = () => {
    if (isRunning) return "rgba(6, 182, 212, 0.4)";
    if (isCompleted) return "rgba(16, 185, 129, 0.4)";
    if (isFailed) return "rgba(244, 63, 94, 0.4)";
    return "rgba(245, 158, 11, 0.4)";
  };

  const getBgColor = () => {
    if (isRunning) return "rgba(6, 182, 212, 0.08)";
    if (isCompleted) return "rgba(16, 185, 129, 0.08)";
    if (isFailed) return "rgba(244, 63, 94, 0.08)";
    return "rgba(245, 158, 11, 0.08)";
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div
      className={`scan-progress-banner ${className}`}
      style={{
        padding: "10px 16px",
        borderRadius: "8px",
        background: getBgColor(),
        border: `1px solid ${getBorderColor()}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        marginBottom: "14px",
        transition: "all 0.2s ease-in-out",
      }}
      role="region"
      aria-label="Security Scan Progress Monitor"
      data-testid="scan-progress-banner"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1 }}>
        {/* Status Icon */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {isRunning && <Loader2 size={18} className="animate-spin" color="var(--accent-cyan)" />}
          {isCompleted && <CheckCircle2 size={18} color="var(--accent-emerald)" />}
          {isFailed && <XCircle size={18} color="var(--accent-rose)" />}
          {isCancelled && <ShieldAlert size={18} color="var(--accent-amber)" />}
        </div>

        {/* Scan Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "160px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>
              {activeScan.toolName} Audit
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                background: isRunning
                  ? "rgba(6, 182, 212, 0.15)"
                  : isCompleted
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(244, 63, 94, 0.15)",
                color: isRunning
                  ? "var(--accent-cyan)"
                  : isCompleted
                  ? "var(--accent-emerald)"
                  : "var(--accent-rose)",
              }}
            >
              {activeScan.status}
            </span>
          </div>

          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <TargetIcon size={12} />
            <span style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeScan.targetUrl}
            </span>
          </div>
        </div>

        {/* Current Phase & Indeterminate / Determinate Bar */}
        <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem" }}>
            <span style={{ color: "var(--text-main)", fontWeight: 500 }}>
              {activeScan.currentPhase}
            </span>
            {activeScan.percentage !== undefined ? (
              <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                {activeScan.percentage}%
              </span>
            ) : (
              isRunning && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                  Active Audit
                </span>
              )
            )}
          </div>

          {/* Progress Bar Container */}
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "2px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {isRunning ? (
              activeScan.percentage !== undefined ? (
                <div
                  style={{
                    width: `${activeScan.percentage}%`,
                    height: "100%",
                    background: "var(--accent-cyan)",
                    transition: "width 0.3s ease",
                  }}
                />
              ) : (
                <div
                  className="scan-indeterminate-bar"
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
                    width: "40%",
                    position: "absolute",
                  }}
                />
              )
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: isCompleted ? "var(--accent-emerald)" : isFailed ? "var(--accent-rose)" : "var(--accent-amber)",
                }}
              />
            )}
          </div>
        </div>

        {/* Elapsed Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          <Clock size={13} />
          <span>{formatElapsed(activeScan.elapsedSeconds)}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {onNavigateToConsole && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onNavigateToConsole}
            style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
            title="Switch to Live Scan Console tab"
          >
            <Activity size={12} color="var(--accent-cyan)" />
            <span>Console</span>
          </button>
        )}

        {isRunning ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={cancelScan}
            style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
            title="Cancel ongoing scan"
          >
            <Square size={11} />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearScan}
            style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
            title="Dismiss scan banner"
          >
            <X size={12} />
            <span>Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );
};
