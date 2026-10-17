import { useState } from "react";
import {
  ShieldCheck,
  Flame,
  Activity,
  BarChart3,
  PieChart,
  CheckCircle2,
  Clock,
  Compass,
  Play,
  ArrowRight,
  FileText,
  Lock,
  Unlock,
  Sparkles
} from "lucide-react";
import { Target, Finding, ScanResult, DiscoveredEndpoint, FindingSeverity } from "./types";

interface AnalyticsProps {
  targets: Target[];
  selectedTarget: Target | null;
  onSelectTarget: (target: Target | null) => void;
  findings: Finding[];
  endpoints: DiscoveredEndpoint[];
  scanHistory: ScanResult[];
  onNavigateTab: (tab: "targets" | "tools" | "crawler" | "scanner" | "findings" | "importer" | "mentor" | "history" | "academy", filterSeverity?: FindingSeverity | "ALL") => void;
  onQuickScan: (toolId: string) => void;
  isScanning: boolean;
}

export function AnalyticsDashboard({
  targets,
  selectedTarget,
  onSelectTarget,
  findings,
  endpoints,
  scanHistory,
  onNavigateTab,
  onQuickScan,
  isScanning,
}: AnalyticsProps) {
  const [filterMode, setFilterMode] = useState<"current" | "all">(selectedTarget ? "current" : "all");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Compute dataset based on current target or all targets
  const relevantFindings = findings.filter((f) => {
    if (filterMode === "current" && selectedTarget) {
      return f.target_id === selectedTarget.id;
    }
    return true;
  });

  const relevantEndpoints = endpoints.filter((ep) => {
    if (filterMode === "current" && selectedTarget) {
      return ep.target_id === selectedTarget.id;
    }
    return true;
  });

  const relevantScans = scanHistory.filter((s) => {
    if (filterMode === "current" && selectedTarget) {
      return s.target_url === selectedTarget.primary_url;
    }
    return true;
  });

  // Severity counts
  const critCount = relevantFindings.filter((f) => f.severity === "Critical").length;
  const highCount = relevantFindings.filter((f) => f.severity === "High").length;
  const medCount = relevantFindings.filter((f) => f.severity === "Medium").length;
  const lowCount = relevantFindings.filter((f) => f.severity === "Low").length;
  const infoCount = relevantFindings.filter((f) => f.severity === "Info").length;
  const totalFindings = relevantFindings.length;

  // Status counts
  const fixedCount = relevantFindings.filter((f) => f.status === "Fixed").length;
  const openCount = relevantFindings.filter(
    (f) => f.status === "New" || f.status === "Confirmed" || f.status === "NeedsReview"
  ).length;

  // Security Posture Score Calculation
  // Base 100 score penalized by weighted severity of unresolved issues
  const penalty = critCount * 25 + highCount * 15 + medCount * 8 + lowCount * 3;
  const postureScore = Math.max(0, Math.min(100, 100 - penalty));

  // Determine Grade & Status
  let grade = "A+";
  let gradeColor = "#10b981"; // Emerald
  let gradeStatus = "Hardened & Resilient";
  let gradeDesc = "Target exhibits high defensive posture with no severe vulnerabilities.";

  if (postureScore < 30) {
    grade = "F";
    gradeColor = "#ef4444"; // Rose / Red
    gradeStatus = "Critical Exposure Risk";
    gradeDesc = "Severe vulnerabilities detected. System is vulnerable to direct exploit or takeover.";
  } else if (postureScore < 50) {
    grade = "D";
    gradeColor = "#fb923c"; // Orange
    gradeStatus = "High Exposure";
    gradeDesc = "Multiple high-severity issues present. Immediate remediation required.";
  } else if (postureScore < 70) {
    grade = "C";
    gradeColor = "#f59e0b"; // Amber
    gradeStatus = "Moderate Risk";
    gradeDesc = "Multiple medium-severity vulnerabilities require prioritized remediation.";
  } else if (postureScore < 85) {
    grade = "B";
    gradeColor = "#3b82f6"; // Blue
    gradeStatus = "Adequate Defense";
    gradeDesc = "Minor vulnerabilities or misconfigurations detected. Good baseline security.";
  } else if (postureScore < 95) {
    grade = "A";
    gradeColor = "#06b6d4"; // Cyan
    gradeStatus = "Strong Baseline";
    gradeDesc = "Excellent posture with only minimal low-severity or informational observations.";
  }

  // SVG Gauge calculations
  const gaugeRadius = 72;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (postureScore / 100) * gaugeCircumference;

  // Categories breakdown
  const categoryGroups = [
    {
      name: "Security Misconfigurations",
      desc: "Missing CSP, CORS wildcard, clickjacking, MIME sniffing",
      icon: "⚙️",
      color: "#f59e0b",
      findings: relevantFindings.filter(
        (f) =>
          f.title.toLowerCase().includes("csp") ||
          f.title.toLowerCase().includes("cors") ||
          f.title.toLowerCase().includes("x-frame") ||
          f.title.toLowerCase().includes("mime") ||
          f.title.toLowerCase().includes("misconfig") ||
          f.cwe === "CWE-693" ||
          f.cwe === "CWE-942" ||
          f.cwe === "CWE-1021"
      ),
    },
    {
      name: "Sensitive Data & Exposures",
      desc: "Exposed .git, .env files, server banners, robots.txt",
      icon: "📁",
      color: "#ef4444",
      findings: relevantFindings.filter(
        (f) =>
          f.title.toLowerCase().includes(".git") ||
          f.title.toLowerCase().includes(".env") ||
          f.title.toLowerCase().includes("disclosure") ||
          f.title.toLowerCase().includes("banner") ||
          f.title.toLowerCase().includes("robots.txt") ||
          f.cwe === "CWE-200" ||
          f.cwe === "CWE-538"
      ),
    },
    {
      name: "Session & Cookie Security",
      desc: "Missing HttpOnly, Secure, or SameSite flags",
      icon: "🍪",
      color: "#a855f7",
      findings: relevantFindings.filter(
        (f) =>
          f.title.toLowerCase().includes("cookie") ||
          f.cwe === "CWE-1004" ||
          f.cwe === "CWE-614" ||
          f.cwe === "CWE-1275"
      ),
    },
    {
      name: "Transport & Cryptography",
      desc: "Missing HSTS, insecure protocols, cleartext endpoints",
      icon: "🔒",
      color: "#3b82f6",
      findings: relevantFindings.filter(
        (f) =>
          f.title.toLowerCase().includes("hsts") ||
          f.title.toLowerCase().includes("ssl") ||
          f.title.toLowerCase().includes("tls") ||
          f.cwe === "CWE-319"
      ),
    },
    {
      name: "Network & Port Exposure",
      desc: "Open services discovered via Nmap or probers",
      icon: "🌐",
      color: "#06b6d4",
      findings: relevantFindings.filter(
        (f) =>
          f.title.toLowerCase().includes("port") ||
          f.source_tool.toLowerCase().includes("nmap")
      ),
    },
  ];

  // Donut chart slices calculation
  const donutRadius = 65;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutData = [
    { label: "Critical", count: critCount, color: "#ef4444", sev: "Critical" as FindingSeverity },
    { label: "High", count: highCount, color: "#fb923c", sev: "High" as FindingSeverity },
    { label: "Medium", count: medCount, color: "#facc15", sev: "Medium" as FindingSeverity },
    { label: "Low", count: lowCount, color: "#60a5fa", sev: "Low" as FindingSeverity },
    { label: "Info", count: infoCount, color: "#94a3b8", sev: "Info" as FindingSeverity },
  ];

  let cumulativeAngle = 0;
  const donutSlices = donutData.map((d) => {
    const ratio = totalFindings > 0 ? d.count / totalFindings : 0;
    const strokeDash = ratio * donutCircumference;
    const offset = donutCircumference - cumulativeAngle;
    cumulativeAngle += strokeDash;
    return {
      ...d,
      ratio,
      strokeDash,
      offset,
    };
  });

  return (
    <div className="analytics-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner & Target Filter */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(20, 30, 51, 0.95) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)",
            }}
          >
            <Activity size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Security Posture & Analytics
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Real-time vulnerability metrics, attack surface radar, and defensive resilience tracking.
            </p>
          </div>
        </div>

        {/* Scope toggle & target selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "4px",
              display: "flex",
              gap: "4px",
            }}
          >
            <button
              className={`filter-chip ${filterMode === "current" ? "active" : ""}`}
              style={{ margin: 0, padding: "5px 12px" }}
              onClick={() => setFilterMode("current")}
              disabled={!selectedTarget}
            >
              Current Target
            </button>
            <button
              className={`filter-chip ${filterMode === "all" ? "active" : ""}`}
              style={{ margin: 0, padding: "5px 12px" }}
              onClick={() => setFilterMode("all")}
            >
              Global Fleet ({targets.length})
            </button>
          </div>

          {filterMode === "current" && targets.length > 0 && (
            <select
              className="input-field"
              style={{ width: "auto", minWidth: "180px", padding: "6px 12px" }}
              value={selectedTarget?.id || ""}
              onChange={(e) => {
                const found = targets.find((t) => t.id === e.target.value);
                if (found) onSelectTarget(found);
              }}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.primary_url})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Hero KPIs Grid: 4 Interactive Colorful Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card 1: Security Posture */}
        <div
          className="card"
          style={{
            margin: 0,
            background: "linear-gradient(135deg, rgba(20, 30, 51, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
            border: `1px solid ${gradeColor}40`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "80px",
              height: "80px",
              background: `radial-gradient(circle, ${gradeColor}20 0%, transparent 70%)`,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Resilience Score</span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: gradeColor,
                backgroundColor: `${gradeColor}18`,
                border: `1px solid ${gradeColor}50`,
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              Grade {grade}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: gradeColor }}>
              {postureScore}
            </span>
            <span style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>/ 100</span>
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <strong>{gradeStatus}</strong>: {gradeDesc}
          </div>
        </div>

        {/* Card 2: Total Vulnerabilities */}
        <div
          className="card"
          style={{
            margin: 0,
            background: "linear-gradient(135deg, rgba(20, 30, 51, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            cursor: "pointer",
          }}
          onClick={() => onNavigateTab("findings")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Total Findings</span>
            <Flame size={18} color="var(--accent-rose)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: "var(--text-main)" }}>
              {totalFindings}
            </span>
            {critCount > 0 && (
              <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>
                {critCount} Critical
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <span className="badge badge-critical" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
              {critCount} Crit
            </span>
            <span className="badge badge-high" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
              {highCount} High
            </span>
            <span className="badge badge-medium" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
              {medCount} Med
            </span>
          </div>
        </div>

        {/* Card 3: Attack Surface Endpoints */}
        <div
          className="card"
          style={{
            margin: 0,
            background: "linear-gradient(135deg, rgba(20, 30, 51, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            cursor: "pointer",
          }}
          onClick={() => onNavigateTab("crawler")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Mapped Surface</span>
            <Compass size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: "var(--accent-cyan)" }}>
              {relevantEndpoints.length}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>endpoints</span>
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Sensitive Probes:</span>
            <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
              {relevantEndpoints.filter((e) => e.source === "sensitive_probe").length}
            </span>
          </div>
        </div>

        {/* Card 4: Remediation Progress */}
        <div
          className="card"
          style={{
            margin: 0,
            background: "linear-gradient(135deg, rgba(20, 30, 51, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="stat-label">Remediation Rate</span>
            <CheckCircle2 size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: "var(--accent-emerald)" }}>
              {totalFindings > 0 ? Math.round((fixedCount / totalFindings) * 100) : 100}%
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              ({openCount} open • {fixedCount} fixed)
            </span>
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: "6px",
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              marginTop: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${totalFindings > 0 ? (fixedCount / totalFindings) * 100 : 100}%`,
                background: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
                borderRadius: "4px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Charts Section: 2 Columns (Gauge & Donut vs OWASP Categories) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "20px" }}>
        {/* Left Column: Interactive Security Gauge & Severity Donut */}
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PieChart size={18} color="var(--accent-cyan)" />
              <span>Severity Distribution & Posture Gauge</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>SVG Vector Engine</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              flexWrap: "wrap",
              gap: "24px",
              padding: "10px 0",
            }}
          >
            {/* SVG Circular Posture Gauge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
                {/* Background Ring */}
                <circle
                  cx="90"
                  cy="90"
                  r={gaugeRadius}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="14"
                  fill="transparent"
                />
                {/* Value Ring with Glow */}
                <circle
                  cx="90"
                  cy="90"
                  r={gaugeRadius}
                  stroke={gradeColor}
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeOffset}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease",
                    filter: `drop-shadow(0 0 8px ${gradeColor}80)`,
                  }}
                />
              </svg>

              {/* Center Content */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: "2.1rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: gradeColor }}>
                  {postureScore}
                </div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                  Posture Index
                </div>
              </div>
              <span style={{ marginTop: "8px", fontSize: "0.8rem", fontWeight: 600, color: gradeColor }}>
                Grade {grade} • {gradeStatus}
              </span>
            </div>

            {/* SVG Severity Donut Ring */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
                {/* Background Base */}
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="16"
                  fill="transparent"
                />
                {totalFindings === 0 ? (
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    stroke="#10b981"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray={donutCircumference}
                    strokeDashoffset={0}
                  />
                ) : (
                  donutSlices.map((slice) =>
                    slice.count > 0 ? (
                      <circle
                        key={slice.label}
                        cx="90"
                        cy="90"
                        r={donutRadius}
                        stroke={slice.color}
                        strokeWidth={hoveredSlice === slice.label ? 20 : 16}
                        fill="transparent"
                        strokeDasharray={`${slice.strokeDash} ${donutCircumference}`}
                        strokeDashoffset={slice.offset}
                        style={{
                          transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                          cursor: "pointer",
                          opacity: hoveredSlice && hoveredSlice !== slice.label ? 0.45 : 1,
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.label)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        onClick={() => onNavigateTab("findings", slice.sev)}
                      />
                    ) : null
                  )
                )}
              </svg>

              {/* Center Content */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontSize: "1.7rem", fontWeight: 800, fontFamily: "Fira Code, monospace" }}>
                  {totalFindings}
                </div>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-dim)" }}>
                  {hoveredSlice || "Vulnerabilities"}
                </div>
              </div>
              <span style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Click slice to filter findings
              </span>
            </div>
          </div>

          {/* Interactive Legend Pills */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "8px",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "16px",
            }}
          >
            {donutData.map((d) => (
              <div
                key={d.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  backgroundColor: hoveredSlice === d.label ? "rgba(255, 255, 255, 0.08)" : "var(--bg-secondary)",
                  border: `1px solid ${d.count > 0 ? d.color + "40" : "var(--border-color)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={() => setHoveredSlice(d.label)}
                onMouseLeave={() => setHoveredSlice(null)}
                onClick={() => onNavigateTab("findings", d.sev)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: d.color,
                      boxShadow: d.count > 0 ? `0 0 6px ${d.color}` : "none",
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{d.label}</span>
                </div>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "Fira Code, monospace" }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Vulnerability Categories Breakdown */}
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={18} color="var(--accent-purple)" />
              <span>Vulnerability Category Breakdown</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>OWASP / CWE Clusters</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1, justifyContent: "space-around" }}>
            {categoryGroups.map((cat) => {
              const count = cat.findings.length;
              const percent = totalFindings > 0 ? Math.round((count / totalFindings) * 100) : 0;
              return (
                <div
                  key={cat.name}
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1rem" }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{cat.desc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          fontFamily: "Fira Code, monospace",
                          color: count > 0 ? cat.color : "var(--text-dim)",
                        }}
                      >
                        {count}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: "4px" }}>
                        ({percent}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div
                    style={{
                      height: "6px",
                      width: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        backgroundColor: cat.color,
                        borderRadius: "3px",
                        boxShadow: count > 0 ? `0 0 8px ${cat.color}60` : "none",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Scan Velocity Timeline & Quick Action Station */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
        {/* Recent Scan Velocity & Activity */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} color="var(--accent-emerald)" />
              <span>Recent Scan History & Velocity</span>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              onClick={() => onNavigateTab("history")}
            >
              Full History
            </button>
          </div>

          {relevantScans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-dim)" }}>
              <Activity size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
              <p style={{ fontSize: "0.85rem" }}>No scans recorded yet for this scope.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: "12px", fontSize: "0.8rem" }}
                onClick={() => onQuickScan("baseline")}
                disabled={isScanning || !selectedTarget}
              >
                <Play size={14} /> Launch First Scan
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
              {relevantScans.slice(0, 5).map((scan) => (
                <div
                  key={scan.scan_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: scan.status === "Completed" ? "var(--accent-emerald)" : "var(--accent-rose)",
                        boxShadow:
                          scan.status === "Completed"
                            ? "0 0 6px var(--accent-emerald)"
                            : "0 0 6px var(--accent-rose)",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{scan.tool}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        {scan.target_url} • {scan.duration_ms} ms
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor: scan.findings_count > 0 ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: scan.findings_count > 0 ? "var(--accent-rose)" : "var(--accent-emerald)",
                        fontWeight: 600,
                      }}
                    >
                      {scan.findings_count} findings
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Defensive Action Station */}
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="card-title">
              <Sparkles size={18} color="var(--accent-cyan)" />
              <span>Defensive Action Station</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
              Execute rapid security assessments, trigger web crawlers, or export audit reports directly from this dashboard.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className="btn btn-secondary"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "linear-gradient(90deg, rgba(6, 182, 212, 0.1) 0%, rgba(20, 30, 51, 0.4) 100%)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                }}
                disabled={isScanning || !selectedTarget}
                onClick={() => onQuickScan("baseline")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={18} color="var(--accent-cyan)" />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Run Baseline Security Audit</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      Checks CSP, CORS, HSTS, Cookie security flags, robots.txt
                    </div>
                  </div>
                </div>
                <Play size={16} color="var(--accent-cyan)" />
              </button>

              <button
                className="btn btn-secondary"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, rgba(20, 30, 51, 0.4) 100%)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                }}
                onClick={() => onNavigateTab("crawler")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Compass size={18} color="var(--accent-purple)" />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Crawl & Map Attack Surface</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      Discover hidden endpoints, form actions, and script dependencies
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--accent-purple)" />
              </button>

              <button
                className="btn btn-secondary"
                style={{
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 30, 51, 0.4) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
                onClick={() => onNavigateTab("scanner")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={18} color="var(--accent-emerald)" />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Open Scan Console & Tools Hub</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      Access Nuclei, Nmap, httpx, and custom security plugins
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--accent-emerald)" />
              </button>
            </div>
          </div>

          {selectedTarget && (
            <div
              style={{
                marginTop: "16px",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.78rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {selectedTarget.scope.allow_local_lab ? (
                  <Unlock size={14} color="var(--accent-amber)" />
                ) : (
                  <Lock size={14} color="var(--accent-emerald)" />
                )}
                <span style={{ color: "var(--text-muted)" }}>Target Scope:</span>
                <span style={{ fontWeight: 600 }}>{selectedTarget.name}</span>
              </div>
              <span style={{ color: "var(--text-dim)" }}>
                {selectedTarget.scope.allow_local_lab ? "Lab Mode" : "SSRF Guard Active"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
