import { FindingSeverity, FindingStatus } from "../../types";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  FileQuestion,
  XCircle,
} from "lucide-react";

interface SeverityBadgeProps {
  severity: FindingSeverity | string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function SeverityBadge({
  severity,
  size = "md",
  showIcon = true,
}: SeverityBadgeProps) {
  const normSev = severity ? severity.toUpperCase() : "INFO";

  const config = {
    CRITICAL: {
      label: "Critical",
      className: "badge badge-critical",
      icon: <ShieldAlert size={size === "sm" ? 11 : 13} />,
    },
    HIGH: {
      label: "High",
      className: "badge badge-high",
      icon: <AlertTriangle size={size === "sm" ? 11 : 13} />,
    },
    MEDIUM: {
      label: "Medium",
      className: "badge badge-medium",
      icon: <AlertCircle size={size === "sm" ? 11 : 13} />,
    },
    LOW: {
      label: "Low",
      className: "badge badge-low",
      icon: <Info size={size === "sm" ? 11 : 13} />,
    },
    INFO: {
      label: "Info",
      className: "badge badge-info",
      icon: <Info size={size === "sm" ? 11 : 13} />,
    },
  }[normSev] || {
    label: severity,
    className: "badge badge-info",
    icon: <Info size={size === "sm" ? 11 : 13} />,
  };

  return (
    <span
      className={config.className}
      style={{
        fontSize: size === "sm" ? "0.7rem" : "0.75rem",
        padding: size === "sm" ? "2px 6px" : "3px 8px",
      }}
      role="status"
      aria-label={`Severity: ${config.label}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
}

interface StatusBadgeProps {
  status: FindingStatus | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const norm = (status || "").replace(/_/g, "");
  
  const getBadgeConfig = () => {
    switch (norm.toLowerCase()) {
      case "new":
        return {
          label: "New",
          color: "var(--accent-cyan)",
          bg: "rgba(6, 182, 212, 0.15)",
          border: "rgba(6, 182, 212, 0.35)",
          icon: <AlertCircle size={size === "sm" ? 11 : 13} />,
        };
      case "needsvalidation":
        return {
          label: "Needs Validation",
          color: "var(--accent-amber)",
          bg: "rgba(245, 158, 11, 0.15)",
          border: "rgba(245, 158, 11, 0.4)",
          icon: <Eye size={size === "sm" ? 11 : 13} />,
        };
      case "validating":
        return {
          label: "Validating...",
          color: "var(--accent-cyan)",
          bg: "rgba(6, 182, 212, 0.2)",
          border: "rgba(6, 182, 212, 0.5)",
          icon: <AlertCircle size={size === "sm" ? 11 : 13} className="animate-spin" />,
        };
      case "confirmed":
        return {
          label: "Confirmed",
          color: "var(--accent-rose)",
          bg: "rgba(244, 63, 94, 0.18)",
          border: "rgba(244, 63, 94, 0.45)",
          icon: <ShieldAlert size={size === "sm" ? 11 : 13} />,
        };
      case "likelytruepositive":
        return {
          label: "Likely True Positive",
          color: "#fb923c",
          bg: "rgba(251, 146, 60, 0.15)",
          border: "rgba(251, 146, 60, 0.4)",
          icon: <AlertTriangle size={size === "sm" ? 11 : 13} />,
        };
      case "needsreview":
        return {
          label: "Needs Review",
          color: "var(--accent-amber)",
          bg: "rgba(245, 158, 11, 0.15)",
          border: "rgba(245, 158, 11, 0.35)",
          icon: <Eye size={size === "sm" ? 11 : 13} />,
        };
      case "unconfirmed":
        return {
          label: "Unconfirmed",
          color: "var(--text-muted)",
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.3)",
          icon: <FileQuestion size={size === "sm" ? 11 : 13} />,
        };
      case "likelyfalsepositive":
      case "falsepositive":
        return {
          label: "Likely False Positive",
          color: "#94a3b8",
          bg: "rgba(148, 163, 184, 0.15)",
          border: "rgba(148, 163, 184, 0.35)",
          icon: <XCircle size={size === "sm" ? 11 : 13} />,
        };
      case "validationfailed":
        return {
          label: "Validation Failed",
          color: "var(--accent-rose)",
          bg: "rgba(244, 63, 94, 0.1)",
          border: "rgba(244, 63, 94, 0.3)",
          icon: <AlertTriangle size={size === "sm" ? 11 : 13} />,
        };
      case "notapplicable":
        return {
          label: "Not Applicable",
          color: "var(--text-dim)",
          bg: "rgba(100, 116, 139, 0.12)",
          border: "rgba(100, 116, 139, 0.25)",
          icon: <FileQuestion size={size === "sm" ? 11 : 13} />,
        };
      case "fixed":
        return {
          label: "Fixed",
          color: "var(--accent-emerald)",
          bg: "rgba(16, 185, 129, 0.15)",
          border: "rgba(16, 185, 129, 0.35)",
          icon: <CheckCircle2 size={size === "sm" ? 11 : 13} />,
        };
      case "acceptedrisk":
        return {
          label: "Accepted Risk",
          color: "var(--accent-violet)",
          bg: "rgba(139, 92, 246, 0.15)",
          border: "rgba(139, 92, 246, 0.35)",
          icon: <Lock size={size === "sm" ? 11 : 13} />,
        };
      default:
        return {
          label: status,
          color: "var(--text-muted)",
          bg: "rgba(148, 163, 184, 0.15)",
          border: "rgba(148, 163, 184, 0.35)",
          icon: <FileQuestion size={size === "sm" ? 11 : 13} />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        fontSize: size === "sm" ? "0.7rem" : "0.75rem",
        padding: size === "sm" ? "2px 6px" : "3px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
      role="status"
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}

export function ValidationBadge({
  status,
  confidence,
  size = "sm",
}: {
  status?: string;
  confidence?: number;
  size?: "sm" | "md";
}) {
  const normStatus = (status || "NEEDS_VALIDATION").replace(/_/g, "");
  
  let label = "Needs Validation";
  let color = "var(--accent-amber)";
  let bg = "rgba(245, 158, 11, 0.12)";
  let border = "rgba(245, 158, 11, 0.35)";

  switch (normStatus.toLowerCase()) {
    case "confirmed":
      label = "CONFIRMED";
      color = "#10b981";
      bg = "rgba(16, 185, 129, 0.15)";
      border = "rgba(16, 185, 129, 0.4)";
      break;
    case "potential":
      label = "POTENTIAL";
      color = "#38bdf8";
      bg = "rgba(56, 189, 248, 0.15)";
      border = "rgba(56, 189, 248, 0.4)";
      break;
    case "inconclusive":
      label = "INCONCLUSIVE";
      color = "#eab308";
      bg = "rgba(234, 179, 8, 0.15)";
      border = "rgba(234, 179, 8, 0.4)";
      break;
    case "falsepositive":
      label = "FALSE POSITIVE";
      color = "#94a3b8";
      bg = "rgba(148, 163, 184, 0.15)";
      border = "rgba(148, 163, 184, 0.4)";
      break;
    case "simulated":
      label = "SIMULATED / DEMO";
      color = "#f59e0b";
      bg = "rgba(245, 158, 11, 0.15)";
      border = "rgba(245, 158, 11, 0.4)";
      break;
    case "scanerror":
      label = "SCAN ERROR";
      color = "#f43f5e";
      bg = "rgba(244, 63, 94, 0.15)";
      border = "rgba(244, 63, 94, 0.4)";
      break;
    case "likelytruepositive":
      label = "LIKELY TRUE POSITIVE";
      color = "#fb923c";
      bg = "rgba(251, 146, 60, 0.15)";
      border = "rgba(251, 146, 60, 0.4)";
      break;
    case "likelyfalsepositive":
      label = "LIKELY FALSE POSITIVE";
      color = "#94a3b8";
      bg = "rgba(148, 163, 184, 0.15)";
      border = "rgba(148, 163, 184, 0.35)";
      break;
    case "unconfirmed":
      label = "UNCONFIRMED";
      color = "var(--text-muted)";
      bg = "rgba(148, 163, 184, 0.12)";
      border = "rgba(148, 163, 184, 0.3)";
      break;
    case "validating":
      label = "VALIDATING";
      color = "var(--accent-cyan)";
      bg = "rgba(6, 182, 212, 0.15)";
      border = "rgba(6, 182, 212, 0.4)";
      break;
    case "validationfailed":
      label = "FAILED";
      color = "var(--accent-rose)";
      bg = "rgba(244, 63, 94, 0.1)";
      border = "rgba(244, 63, 94, 0.3)";
      break;
    case "notapplicable":
      label = "NOT APPLICABLE";
      color = "var(--text-dim)";
      bg = "rgba(100, 116, 139, 0.12)";
      border = "rgba(100, 116, 139, 0.25)";
      break;
  }

  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        borderRadius: "4px",
        padding: size === "sm" ? "2px 6px" : "3px 8px",
        fontSize: size === "sm" ? "0.68rem" : "0.72rem",
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "0.03em",
      }}
      title={`Deterministic Validation State: ${label}${confidence !== undefined ? ` (${confidence}% confidence)` : ""}`}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
      <span>{label}</span>
      {confidence !== undefined && confidence > 0 && (
        <span style={{ opacity: 0.8, fontSize: "0.65rem", marginLeft: "2px" }}>
          {confidence}%
        </span>
      )}
    </span>
  );
}

export function ScopeBadge({ allowLocalLab }: { allowLocalLab?: boolean }) {
  if (allowLocalLab) {
    return (
      <span className="badge badge-lab" title="Local/Private IP ranges permitted for lab testing">
        <Unlock size={12} />
        <span>Lab Scope Active</span>
      </span>
    );
  }
  return (
    <span className="badge badge-locked" title="Target scope enforced; internal/metadata IPs protected">
      <Lock size={12} />
      <span>SSRF Guard Enforced</span>
    </span>
  );
}

export type ProvenanceType =
  | "observed"
  | "detected_by"
  | "inferred"
  | "ai_explanation"
  | "not_verified"
  | "simulated"
  | "confirmed"
  | "false_positive"
  | "inconclusive"
  | "scan_error";

interface ProvenanceBadgeProps {
  type: ProvenanceType;
  detail?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ProvenanceBadge({ type, detail, className = "", style = {} }: ProvenanceBadgeProps) {
  const configs: Record<
    ProvenanceType,
    { label: string; title: string; color: string; bg: string; border: string }
  > = {
    observed: {
      label: "[Observed]",
      title: "Directly captured from the target response or source code",
      color: "var(--accent-cyan)",
      bg: "rgba(6, 182, 212, 0.12)",
      border: "rgba(6, 182, 212, 0.35)",
    },
    detected_by: {
      label: "[Detected by]",
      title: "Reported directly by the security scanner or tool rule",
      color: "#60a5fa",
      bg: "rgba(59, 130, 246, 0.12)",
      border: "rgba(59, 130, 246, 0.35)",
    },
    inferred: {
      label: "[Inferred]",
      title: "Derived from analytical deduction, CWE mapping, or heuristics",
      color: "#a855f7",
      bg: "rgba(168, 85, 247, 0.12)",
      border: "rgba(168, 85, 247, 0.35)",
    },
    ai_explanation: {
      label: "[AI explanation]",
      title: "Generated by AI Mentor / LLM grounded in real scan evidence",
      color: "var(--accent-amber)",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.35)",
    },
    not_verified: {
      label: "[Not verified]",
      title: "Potential issue observed but not yet verified by automated probe or analyst",
      color: "var(--accent-rose)",
      bg: "rgba(244, 63, 94, 0.12)",
      border: "rgba(244, 63, 94, 0.35)",
    },
    simulated: {
      label: "[Simulated / Demo]",
      title: "Synthetically generated test or demo fixture — not from a live target scan",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.15)",
      border: "rgba(245, 158, 11, 0.4)",
    },
    confirmed: {
      label: "[Confirmed]",
      title: "Directly verified and confirmed via active probe reproduction",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.15)",
      border: "rgba(16, 185, 129, 0.4)",
    },
    false_positive: {
      label: "[False Positive]",
      title: "Contradicted by deterministic active validation probe",
      color: "#94a3b8",
      bg: "rgba(148, 163, 184, 0.15)",
      border: "rgba(148, 163, 184, 0.35)",
    },
    inconclusive: {
      label: "[Inconclusive]",
      title: "Insufficient evidence or unexpected target behavior during verification",
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.15)",
      border: "rgba(234, 179, 8, 0.4)",
    },
    scan_error: {
      label: "[Scan Error]",
      title: "Target unreachable, connection timeout, or tool execution failure",
      color: "#f43f5e",
      bg: "rgba(244, 63, 94, 0.15)",
      border: "rgba(244, 63, 94, 0.4)",
    },
  };

  const cfg = configs[type] || configs.observed;

  return (
    <span
      className={`provenance-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.68rem",
        fontWeight: 700,
        fontFamily: "monospace",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "4px",
        padding: "1px 6px",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        ...style,
      }}
      title={cfg.title}
      role="status"
      aria-label={cfg.title}
    >
      <span>{cfg.label}</span>
      {detail && (
        <span
          style={{
            fontWeight: 500,
            color: "var(--text-main)",
            opacity: 0.9,
            marginLeft: "2px",
          }}
        >
          {detail}
        </span>
      )}
    </span>
  );
}
