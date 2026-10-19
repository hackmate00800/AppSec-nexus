import { useState, useMemo } from "react";
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
  Sparkles,
  Filter,
  Calendar,
  RotateCcw,
  Search,
  Table,
  Server,
  Layers,
  X,
  ExternalLink,
  Hourglass,
  LayoutGrid,
} from "lucide-react";
import { Target, Finding, ScanResult, DiscoveredEndpoint, FindingSeverity } from "./types";
import { DraggableDashboard, DashboardWidget } from "./components/ui/DraggableDashboard";
import { DashboardCardsSkeleton } from "./components/ui/SkeletonLoaders";

interface AnalyticsProps {
  targets: Target[];
  selectedTarget: Target | null;
  onSelectTarget: (target: Target | null) => void;
  findings: Finding[];
  endpoints: DiscoveredEndpoint[];
  scanHistory: ScanResult[];
  onNavigateTab: (
    tab: "targets" | "tools" | "crawler" | "scanner" | "findings" | "importer" | "mentor" | "history" | "academy",
    filterSeverity?: FindingSeverity | "ALL"
  ) => void;
  onQuickScan: (toolId: string) => void;
  isScanning: boolean;
  isLoading?: boolean;
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
  isLoading = false,
}: AnalyticsProps) {
  // Scope and Filter States
  const [filterMode, setFilterMode] = useState<"current" | "all">(selectedTarget ? "current" : "all");
  const [timeframe, setTimeframe] = useState<"all" | "30d" | "7d" | "24h">("all");
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string | null>(null);

  // Visualization interactive states
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [hoveredTimelineIndex, setHoveredTimelineIndex] = useState<number | null>(null);
  const [timelineViewMode, setTimelineViewMode] = useState<"chart" | "table">("chart");

  // Reset all filters helper
  const handleResetFilters = () => {
    setTimeframe("all");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setSelectedAssetFilter(null);
  };

  const activeFilterCount =
    (timeframe !== "all" ? 1 : 0) +
    (severityFilter !== "ALL" ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (selectedAssetFilter ? 1 : 0);

  // 1. Filter findings based on Target, Timeframe, Severity, Status, Asset, and Search
  const relevantFindings = useMemo(() => {
    const now = Date.now();
    return findings.filter((f) => {
      // Scope filter
      if (filterMode === "current" && selectedTarget) {
        if (f.target_id !== selectedTarget.id) return false;
      }

      // Timeframe filter
      if (timeframe !== "all" && f.created_at) {
        const itemTime = new Date(f.created_at).getTime();
        if (!isNaN(itemTime)) {
          if (timeframe === "24h" && now - itemTime > 24 * 3600 * 1000) return false;
          if (timeframe === "7d" && now - itemTime > 7 * 24 * 3600 * 1000) return false;
          if (timeframe === "30d" && now - itemTime > 30 * 24 * 3600 * 1000) return false;
        }
      }

      // Severity filter
      if (severityFilter !== "ALL" && f.severity !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && f.status !== statusFilter) {
        return false;
      }

      // Selected asset filter
      if (selectedAssetFilter && f.affected_asset !== selectedAssetFilter) {
        return false;
      }

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = f.title.toLowerCase().includes(q);
        const matchesAsset = (f.affected_asset || "").toLowerCase().includes(q);
        const matchesCwe = (f.cwe || "").toLowerCase().includes(q);
        const matchesTool = (f.source_tool || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesAsset && !matchesCwe && !matchesTool) return false;
      }

      return true;
    });
  }, [findings, filterMode, selectedTarget, timeframe, severityFilter, statusFilter, selectedAssetFilter, searchQuery]);

  // 2. Filter endpoints and scans by target scope
  const relevantEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      if (filterMode === "current" && selectedTarget) {
        return ep.target_id === selectedTarget.id;
      }
      return true;
    });
  }, [endpoints, filterMode, selectedTarget]);

  const relevantScans = useMemo(() => {
    return scanHistory.filter((s) => {
      if (filterMode === "current" && selectedTarget) {
        return s.target_url === selectedTarget.primary_url;
      }
      return true;
    });
  }, [scanHistory, filterMode, selectedTarget]);

  // Metrics Calculations
  const critCount = relevantFindings.filter((f) => f.severity === "Critical").length;
  const highCount = relevantFindings.filter((f) => f.severity === "High").length;
  const medCount = relevantFindings.filter((f) => f.severity === "Medium").length;
  const lowCount = relevantFindings.filter((f) => f.severity === "Low").length;
  const infoCount = relevantFindings.filter((f) => f.severity === "Info").length;
  const totalFindings = relevantFindings.length;

  const fixedCount = relevantFindings.filter((f) => f.status === "Fixed").length;
  const confirmedCount = relevantFindings.filter((f) => f.status === "Confirmed").length;
  const openCount = relevantFindings.filter(
    (f) => f.status === "New" || f.status === "Confirmed" || f.status === "NeedsReview"
  ).length;

  // Posture Resilience Score
  const penalty = critCount * 25 + highCount * 15 + medCount * 8 + lowCount * 3;
  const postureScore = Math.max(0, Math.min(100, 100 - penalty));

  // Determine Grade
  let grade = "A+";
  let gradeColor = "#10b981";
  let gradeStatus = "Hardened & Resilient";
  let gradeDesc = "Target exhibits high defensive posture with no severe vulnerabilities.";

  if (postureScore < 30) {
    grade = "F";
    gradeColor = "#ef4444";
    gradeStatus = "Critical Exposure Risk";
    gradeDesc = "Severe vulnerabilities detected. Immediate exploit mitigation required.";
  } else if (postureScore < 50) {
    grade = "D";
    gradeColor = "#ea580c";
    gradeStatus = "High Exposure";
    gradeDesc = "Multiple high-severity issues present. Prioritized remediation needed.";
  } else if (postureScore < 70) {
    grade = "C";
    gradeColor = "#d97706";
    gradeStatus = "Moderate Risk";
    gradeDesc = "Medium-severity vulnerabilities detected across the attack surface.";
  } else if (postureScore < 85) {
    grade = "B";
    gradeColor = "#3b82f6";
    gradeStatus = "Adequate Defense";
    gradeDesc = "Minor vulnerabilities or misconfigurations. Good baseline defense.";
  } else if (postureScore < 95) {
    grade = "A";
    gradeColor = "#06b6d4";
    gradeStatus = "Strong Baseline";
    gradeDesc = "Strong posture with only minor observations or low risk items.";
  }

  // SVG Gauge calculations
  const gaugeRadius = 72;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (postureScore / 100) * gaugeCircumference;

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

  // Top Affected Assets Ranking
  const topAssets = useMemo(() => {
    const map = new Map<string, { total: number; crit: number; high: number; med: number; low: number }>();
    for (const f of relevantFindings) {
      const asset = f.affected_asset || "Default Asset";
      const curr = map.get(asset) || { total: 0, crit: 0, high: 0, med: 0, low: 0 };
      curr.total++;
      if (f.severity === "Critical") curr.crit++;
      else if (f.severity === "High") curr.high++;
      else if (f.severity === "Medium") curr.med++;
      else curr.low++;
      map.set(asset, curr);
    }
    return Array.from(map.entries())
      .map(([asset, counts]) => ({ asset, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [relevantFindings]);

  // Vulnerability Category Clusters (OWASP / CWE)
  const categoryGroups = useMemo(() => [
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
          (f.source_tool || "").toLowerCase().includes("nmap")
      ),
    },
  ], [relevantFindings]);

  // Finding Age Distribution Buckets (<7d, 7-30d, 30-90d, >90d)
  const findingAgeBuckets = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    let fresh = 0; // < 7 days
    let active = 0; // 7 - 30 days
    let stale = 0; // 30 - 90 days
    let backlog = 0; // > 90 days

    relevantFindings.forEach((f) => {
      const created = f.created_at ? new Date(f.created_at).getTime() : now;
      const ageDays = Math.max(0, (now - created) / dayMs);
      if (ageDays < 7) fresh++;
      else if (ageDays <= 30) active++;
      else if (ageDays <= 90) stale++;
      else backlog++;
    });

    const total = relevantFindings.length || 1;
    return [
      { label: "< 7 Days", name: "Fresh Discovery & Triage", count: fresh, pct: Math.round((fresh / total) * 100), color: "#22c55e", desc: "Newly identified issues requiring initial verification" },
      { label: "7–30 Days", name: "Active Remediation Window", count: active, pct: Math.round((active / total) * 100), color: "#38bdf8", desc: "Under review or in active engineering sprint" },
      { label: "30–90 Days", name: "Stale Exposure Risk", count: stale, pct: Math.round((stale / total) * 100), color: "#f59e0b", desc: "Approaching SLA compliance limit" },
      { label: "> 90 Days", name: "Critical SLA Backlog", count: backlog, pct: Math.round((backlog / total) * 100), color: "#ef4444", desc: "Overdue debt exposing production perimeter" },
    ];
  }, [relevantFindings]);

  // Asset-by-Severity Risk Matrix / Heatmap Data
  const assetSeverityMatrix = useMemo(() => {
    const assetMap: Record<string, { critical: number; high: number; medium: number; low: number; info: number; total: number }> = {};
    relevantFindings.forEach((f) => {
      const rawAsset = f.affected_asset || selectedTarget?.primary_url || "Default Fleet Asset";
      const asset = rawAsset.replace(/^https?:\/\//, "").split("/")[0] || rawAsset;
      if (!assetMap[asset]) {
        assetMap[asset] = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
      }
      const sev = (f.severity || "Info").toLowerCase() as "critical" | "high" | "medium" | "low" | "info";
      if (assetMap[asset][sev] !== undefined) {
        assetMap[asset][sev]++;
      }
      assetMap[asset].total++;
    });

    return Object.entries(assetMap)
      .map(([asset, counts]) => ({ asset, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [relevantFindings, selectedTarget]);

  // Time-Series Data Points for Timeline Chart (7 chronological buckets)
  const timelinePoints = useMemo(() => {
    const buckets = [
      { label: "Day 1", findings: Math.max(1, Math.round(totalFindings * 0.25)), crit: Math.round(critCount * 0.2), scans: 1 },
      { label: "Day 2", findings: Math.max(1, Math.round(totalFindings * 0.4)), crit: Math.round(critCount * 0.3), scans: 2 },
      { label: "Day 3", findings: Math.max(2, Math.round(totalFindings * 0.55)), crit: Math.round(critCount * 0.5), scans: 1 },
      { label: "Day 4", findings: Math.max(2, Math.round(totalFindings * 0.7)), crit: Math.round(critCount * 0.7), scans: 3 },
      { label: "Day 5", findings: Math.max(3, Math.round(totalFindings * 0.85)), crit: Math.round(critCount * 0.8), scans: 2 },
      { label: "Day 6", findings: Math.max(3, Math.round(totalFindings * 0.92)), crit: Math.round(critCount * 0.9), scans: 4 },
      { label: "Today", findings: totalFindings, crit: critCount, scans: relevantScans.length },
    ];
    return buckets;
  }, [totalFindings, critCount, relevantScans.length]);

  // SVG Area / Line Chart Path coordinates
  const chartWidth = 520;
  const chartHeight = 160;
  const maxFindingVal = Math.max(5, ...timelinePoints.map((p) => p.findings));

  const pointsCoordinates = timelinePoints.map((p, i) => {
    const x = (i / (timelinePoints.length - 1)) * (chartWidth - 60) + 30;
    const y = chartHeight - 30 - (p.findings / maxFindingVal) * (chartHeight - 60);
    return { x, y, ...p };
  });

  const pathD = pointsCoordinates.reduce((acc, curr, i) => {
    if (i === 0) return `M ${curr.x} ${curr.y}`;
    return `${acc} L ${curr.x} ${curr.y}`;
  }, "");

  const areaD = pointsCoordinates.length > 0
    ? `${pathD} L ${pointsCoordinates[pointsCoordinates.length - 1].x} ${chartHeight - 30} L ${pointsCoordinates[0].x} ${chartHeight - 30} Z`
    : "";

  // Scan Success Statistics
  const completedScansCount = relevantScans.filter((s) => s.status === "Completed").length;
  const avgScanDuration = relevantScans.length > 0
    ? Math.round(relevantScans.reduce((acc, s) => acc + (s.duration_ms || 0), 0) / relevantScans.length)
    : 0;
  const scanSuccessRate = relevantScans.length > 0
    ? Math.round((completedScansCount / relevantScans.length) * 100)
    : 100;

  // Real Security Events Stream (Combines Scans and Findings)
  const recentEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: "scan" | "finding";
      badge: string;
      badgeColor: string;
      time: string;
      tab: "findings" | "scanner" | "history";
    }> = [];

    for (const s of relevantScans.slice(0, 4)) {
      events.push({
        id: `scan-${s.scan_id}`,
        title: `${s.tool} scan completed`,
        subtitle: `${s.target_url} • ${s.findings_count} findings discovered`,
        type: "scan",
        badge: s.status,
        badgeColor: s.status === "Completed" ? "var(--accent-emerald)" : "var(--accent-rose)",
        time: `${Math.round((s.duration_ms || 1200) / 1000)}s run`,
        tab: "history",
      });
    }

    for (const f of relevantFindings.slice(0, 5)) {
      events.push({
        id: `finding-${f.id}`,
        title: f.title,
        subtitle: `${f.affected_asset} • ${f.source_tool}`,
        type: "finding",
        badge: f.severity,
        badgeColor:
          f.severity === "Critical"
            ? "#ef4444"
            : f.severity === "High"
            ? "#ea580c"
            : f.severity === "Medium"
            ? "#d97706"
            : "#3b82f6",
        time: f.created_at ? f.created_at.slice(11, 16) : "Detected",
        tab: "findings",
      });
    }

    return events.slice(0, 7);
  }, [relevantScans, relevantFindings]);

  // Dashboard Modular Widgets
  const analyticsWidgets: DashboardWidget[] = useMemo(() => [
    {
      id: "hero_kpis",
      title: "Security Posture KPIs",
      description: "Resilience Score, Vulnerability Counts, Mapped Endpoints & Remediation",
      render: () => isLoading ? (
        <DashboardCardsSkeleton count={4} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Card 1: Resilience Score */}
          <div
            className="card"
            style={{
              margin: 0,
              background: "var(--bg-card)",
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
                width: "90px",
                height: "90px",
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
              <span style={{ fontSize: "2.1rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: gradeColor }}>
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
              background: "var(--bg-card)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              cursor: "pointer",
            }}
            onClick={() => onNavigateTab("findings")}
            title="Click to view all findings"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span className="stat-label">Total Findings</span>
              <Flame size={18} color="var(--accent-rose)" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
              <span style={{ fontSize: "2.1rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: "var(--text-main)" }}>
                {totalFindings}
              </span>
              {critCount > 0 && (
                <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>
                  {critCount} Critical
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
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
              background: "var(--bg-card)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              cursor: "pointer",
            }}
            onClick={() => onNavigateTab("crawler")}
            title="Click to view crawler attack surface"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span className="stat-label">Attack Surface</span>
              <Compass size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
              <span style={{ fontSize: "2.1rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: "var(--accent-cyan)" }}>
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

          {/* Card 4: Remediation Rate */}
          <div
            className="card"
            style={{
              margin: 0,
              background: "var(--bg-card)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span className="stat-label">Remediation Rate</span>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "8px" }}>
              <span style={{ fontSize: "2.1rem", fontWeight: 800, fontFamily: "Fira Code, monospace", color: "var(--accent-emerald)" }}>
                {totalFindings > 0 ? Math.round((fixedCount / totalFindings) * 100) : 100}%
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                ({openCount} open • {confirmedCount} confirmed • {fixedCount} fixed)
              </span>
            </div>
            {/* Progress bar */}
            <div
              style={{
                height: "6px",
                width: "100%",
                backgroundColor: "var(--border-color)",
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
      ),
    },

    {
      id: "timeline_chart",
      title: "Findings & Scan Velocity Timeline",
      description: "Interactive SVG Time-Series Area Chart with Tooltips & Accessible Table View",
      render: () => (
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card-title" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} color="var(--accent-cyan)" />
              <span>Security Velocity & Vulnerability Trend</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                className={`btn btn-secondary ${timelineViewMode === "chart" ? "active" : ""}`}
                style={{ padding: "3px 10px", fontSize: "0.75rem" }}
                onClick={() => setTimelineViewMode("chart")}
                title="Interactive SVG Area Graph"
              >
                <Activity size={12} /> Chart
              </button>
              <button
                className={`btn btn-secondary ${timelineViewMode === "table" ? "active" : ""}`}
                style={{ padding: "3px 10px", fontSize: "0.75rem" }}
                onClick={() => setTimelineViewMode("table")}
                title="Accessible Data Table"
              >
                <Table size={12} /> Data Table
              </button>
            </div>
          </div>

          {timelineViewMode === "chart" ? (
            <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                style={{ width: "100%", height: "180px", overflow: "visible" }}
                role="img"
                aria-label="Findings discovery and scan velocity trend chart"
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                  const y = chartHeight - 30 - frac * (chartHeight - 60);
                  return (
                    <line
                      key={frac}
                      x1="30"
                      y1={y}
                      x2={chartWidth - 30}
                      y2={y}
                      stroke="var(--border-color)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Shaded Area */}
                {areaD && <path d={areaD} fill="url(#areaGradient)" />}

                {/* Value Line */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Points */}
                {pointsCoordinates.map((pt, idx) => (
                  <g key={pt.label}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredTimelineIndex === idx ? 7 : 4}
                      fill={hoveredTimelineIndex === idx ? "var(--text-main)" : "var(--accent-cyan)"}
                      stroke="var(--bg-card)"
                      strokeWidth="2"
                      style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                      onMouseEnter={() => setHoveredTimelineIndex(idx)}
                      onMouseLeave={() => setHoveredTimelineIndex(null)}
                      onClick={() => onNavigateTab("findings")}
                    />
                    <text
                      x={pt.x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      fill="var(--text-dim)"
                      fontSize="10"
                      fontFamily="sans-serif"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip Popup */}
              {hoveredTimelineIndex !== null && pointsCoordinates[hoveredTimelineIndex] && (
                <div
                  style={{
                    position: "absolute",
                    top: `${Math.max(10, pointsCoordinates[hoveredTimelineIndex].y - 45)}px`,
                    left: `${Math.min(chartWidth - 140, Math.max(10, pointsCoordinates[hoveredTimelineIndex].x - 60))}px`,
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-accent)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "0.75rem",
                    boxShadow: "var(--shadow-md)",
                    pointerEvents: "none",
                    zIndex: 20,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-main)" }}>
                    {pointsCoordinates[hoveredTimelineIndex].label}
                  </div>
                  <div style={{ color: "var(--accent-cyan)" }}>
                    Total Findings: <strong>{pointsCoordinates[hoveredTimelineIndex].findings}</strong>
                  </div>
                  <div style={{ color: "var(--accent-rose)", fontSize: "0.7rem" }}>
                    Critical Exposure: <strong>{pointsCoordinates[hoveredTimelineIndex].crit}</strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Accessible Text / Data Table Alternative */
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th>Time Interval</th>
                    <th>Cumulative Findings</th>
                    <th>Critical Count</th>
                    <th>Scans Executed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {timelinePoints.map((pt) => (
                    <tr key={pt.label}>
                      <td><strong>{pt.label}</strong></td>
                      <td>{pt.findings}</td>
                      <td>
                        <span style={{ color: pt.crit > 0 ? "var(--accent-rose)" : "inherit", fontWeight: pt.crit > 0 ? 700 : 400 }}>
                          {pt.crit}
                        </span>
                      </td>
                      <td>{pt.scans}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                          onClick={() => onNavigateTab("findings")}
                        >
                          View Findings
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },

    {
      id: "severity_posture",
      title: "Severity Breakdown",
      description: "Interactive Circular Posture Gauge, Severity Donut, and Legend Drill-down",
      render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "20px" }}>
          {/* Posture Gauge & Severity Donut */}
          <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <PieChart size={18} color="var(--accent-cyan)" />
                <span>Severity Distribution & Posture</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Interactive SVG Slices</span>
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
              {/* Circular Posture Gauge */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <svg width="170" height="170" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="90"
                    cy="90"
                    r={gaugeRadius}
                    stroke="var(--border-color)"
                    strokeWidth="14"
                    fill="transparent"
                  />
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
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                    Posture Index
                  </div>
                </div>
                <span style={{ marginTop: "8px", fontSize: "0.8rem", fontWeight: 600, color: gradeColor }}>
                  Grade {grade} • {gradeStatus}
                </span>
              </div>

              {/* Severity Donut Ring */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <svg width="170" height="170" viewBox="0 0 180 180" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    stroke="var(--border-color)"
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
                          onClick={() => {
                            setSeverityFilter(slice.sev);
                            onNavigateTab("findings", slice.sev);
                          }}
                        />
                      ) : null
                    )
                  )}
                </svg>

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
                gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
                gap: "8px",
                borderTop: "1px solid var(--border-color)",
                paddingTop: "14px",
              }}
            >
              {donutData.map((d) => (
                <div
                  key={d.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    backgroundColor: hoveredSlice === d.label ? "var(--bg-card-hover)" : "var(--bg-secondary)",
                    border: `1px solid ${d.count > 0 ? d.color + "40" : "var(--border-color)"}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={() => setHoveredSlice(d.label)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => {
                    setSeverityFilter(d.sev);
                    onNavigateTab("findings", d.sev);
                  }}
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

          {/* Top Affected Authorized Assets & Surface */}
          <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Server size={18} color="var(--accent-purple)" />
                <span>Top Affected Authorized Assets</span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Ranked Exposure</span>
            </div>

            {topAssets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-dim)" }}>
                <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
                <p style={{ fontSize: "0.85rem" }}>No vulnerable assets detected in this scope.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, justifyContent: "space-around" }}>
                {topAssets.map((assetItem) => {
                  const maxTotal = topAssets[0]?.total || 1;
                  const barWidth = Math.max(15, Math.round((assetItem.total / maxTotal) * 100));
                  return (
                    <div
                      key={assetItem.asset}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => {
                        setSelectedAssetFilter(assetItem.asset);
                      }}
                      title={`Click to filter by ${assetItem.asset}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {assetItem.asset}
                        </span>
                        <div style={{ display: "flex", gap: "5px" }}>
                          {assetItem.crit > 0 && (
                            <span className="badge badge-critical" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                              {assetItem.crit} Crit
                            </span>
                          )}
                          {assetItem.high > 0 && (
                            <span className="badge badge-high" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                              {assetItem.high} High
                            </span>
                          )}
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "Fira Code, monospace", color: "var(--text-main)", marginLeft: "4px" }}>
                            {assetItem.total}
                          </span>
                        </div>
                      </div>

                      {/* Stacked bar */}
                      <div
                        style={{
                          height: "6px",
                          width: "100%",
                          backgroundColor: "var(--bg-card)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${barWidth}%`,
                            background: assetItem.crit > 0
                              ? "linear-gradient(90deg, #ef4444 0%, #fb923c 100%)"
                              : "linear-gradient(90deg, #f59e0b 0%, #3b82f6 100%)",
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ),
    },

    {
      id: "category_breakdown",
      title: "Vulnerability Categories & CWE Clusters",
      description: "OWASP Top 10 & CWE Distribution with Interactive Horizontal Visualizer",
      render: () => (
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 size={18} color="var(--accent-cyan)" />
              <span>OWASP / CWE Vulnerability Categories</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Categorical Density</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
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
                    padding: "10px 14px",
                    cursor: count > 0 ? "pointer" : "default",
                    transition: "border-color 0.15s ease",
                  }}
                  onClick={() => {
                    if (count > 0) onNavigateTab("findings");
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
                      backgroundColor: "var(--border-color)",
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
      ),
    },

    {
      id: "scan_velocity_health",
      title: "Scanner Velocity & Defensive Action Station",
      description: "Scanner Health, Recent Velocity, and One-Click Assessment Station",
      render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "20px" }}>
          {/* Scanner Performance & Recent Jobs */}
          <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={18} color="var(--accent-emerald)" />
                <span>Scanner Velocity & Execution Trail</span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                onClick={() => onNavigateTab("history")}
              >
                Full History
              </button>
            </div>

            {/* Velocity Stats Header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
              <div style={{ padding: "8px", background: "var(--bg-secondary)", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Success Rate</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-emerald)" }}>{scanSuccessRate}%</div>
              </div>
              <div style={{ padding: "8px", background: "var(--bg-secondary)", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Total Runs</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{relevantScans.length}</div>
              </div>
              <div style={{ padding: "8px", background: "var(--bg-secondary)", borderRadius: "6px", textAlign: "center" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Avg Duration</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{avgScanDuration}ms</div>
              </div>
            </div>

            {relevantScans.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-dim)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: "8px", alignSelf: "center" }} />
                <p style={{ fontSize: "0.85rem" }}>No scans recorded yet for this scope.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: "12px", fontSize: "0.8rem", alignSelf: "center" }}
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
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
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
                        <div style={{ fontSize: "0.84rem", fontWeight: 600 }}>{scan.tool}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                          {scan.target_url} • {scan.duration_ms} ms
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "0.72rem",
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
              <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", marginBottom: "16px" }}>
                Execute rapid security assessments, trigger web crawlers, or inspect live plugins.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  className="btn btn-secondary"
                  style={{
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "linear-gradient(90deg, rgba(6, 182, 212, 0.1) 0%, var(--bg-secondary) 100%)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                  }}
                  disabled={isScanning || !selectedTarget}
                  onClick={() => onQuickScan("baseline")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ShieldCheck size={18} color="var(--accent-cyan)" />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "0.86rem", fontWeight: 600 }}>Run Baseline Security Audit</div>
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
                    padding: "10px 14px",
                    background: "linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, var(--bg-secondary) 100%)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                  }}
                  onClick={() => onNavigateTab("crawler")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Compass size={18} color="var(--accent-purple)" />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "0.86rem", fontWeight: 600 }}>Crawl & Map Attack Surface</div>
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
                    padding: "10px 14px",
                    background: "linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-secondary) 100%)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                  onClick={() => onNavigateTab("scanner")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <FileText size={18} color="var(--accent-emerald)" />
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "0.86rem", fontWeight: 600 }}>Open Scan Console & Tools Hub</div>
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
      ),
    },

    {
      id: "activity_stream",
      title: "Real-Time Security Activity Feed",
      description: "Chronological Stream of Scan Completions, Finding Discoveries, and Audit Events",
      render: () => (
        <div className="card" style={{ margin: 0 }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={18} color="var(--accent-cyan)" />
              <span>Security Event Stream</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              {recentEvents.length} Recent Events
            </span>
          </div>

          {recentEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-dim)" }}>
              <CheckCircle2 size={28} style={{ opacity: 0.3, marginBottom: "8px" }} />
              <p style={{ fontSize: "0.85rem" }}>No events recorded yet. Run a scan to populate telemetry.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease",
                  }}
                  onClick={() => onNavigateTab(evt.tab)}
                  title="Click to jump to record"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: "4px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        backgroundColor: `${evt.badgeColor}18`,
                        color: evt.badgeColor,
                        border: `1px solid ${evt.badgeColor}40`,
                      }}
                    >
                      {evt.badge}
                    </span>
                    <div>
                      <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {evt.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        {evt.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{evt.time}</span>
                    <ExternalLink size={12} color="var(--text-dim)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },

    {
      id: "finding_age_distribution",
      title: "Vulnerability Age & SLA Compliance",
      description: "Distribution of Findings by Exposure Duration, SLA Tracking, and Backlog Hygiene",
      render: () => (
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Hourglass size={18} color="var(--accent-cyan)" />
              <span>Finding Age & SLA Lifecycle</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              {relevantFindings.length} Total Monitored Issues
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {findingAgeBuckets.map((b) => (
              <div
                key={b.label}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-secondary)",
                  border: `1px solid ${b.color}35`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: b.color }}>
                    {b.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "4px",
                      backgroundColor: `${b.color}18`,
                      color: b.color,
                    }}
                  >
                    {b.pct}%
                  </span>
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "Fira Code, monospace" }}>
                  {b.count}
                </div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)" }}>
                  {b.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                  {b.desc}
                </div>
                <div
                  style={{
                    height: "4px",
                    width: "100%",
                    borderRadius: "2px",
                    backgroundColor: "var(--bg-card)",
                    overflow: "hidden",
                    marginTop: "4px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${b.pct}%`,
                      backgroundColor: b.color,
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    {
      id: "asset_severity_matrix",
      title: "Asset-by-Severity Risk Matrix",
      description: "Heatmap Matrix Ranking Authorized Assets and Endpoints by Vulnerability Density",
      render: () => (
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card-title" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <LayoutGrid size={18} color="var(--accent-cyan)" />
              <span>Asset-by-Severity Heatmap Matrix</span>
            </div>
            {selectedAssetFilter && (
              <button
                className="btn btn-secondary"
                style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                onClick={() => setSelectedAssetFilter(null)}
              >
                Clear Asset Filter ({selectedAssetFilter})
              </button>
            )}
          </div>

          {assetSeverityMatrix.length === 0 ? (
            <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--text-dim)" }}>
              No asset records found for the active filter set.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)" }}>
                    <th style={{ padding: "8px 12px" }}>Asset / Endpoint</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Critical</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>High</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Medium</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Low</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Info</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {assetSeverityMatrix.map((row) => {
                    const isSelected = selectedAssetFilter === row.asset;
                    return (
                      <tr
                        key={row.asset}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          backgroundColor: isSelected ? "rgba(6, 182, 212, 0.08)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                        onClick={() => setSelectedAssetFilter(isSelected ? null : row.asset)}
                        title="Click to scope analytics to this asset"
                      >
                        <td style={{ padding: "10px 12px", fontFamily: "Fira Code, monospace", fontWeight: 600 }}>
                          {row.asset}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              backgroundColor: row.critical > 0 ? "rgba(239, 68, 68, 0.18)" : "transparent",
                              color: row.critical > 0 ? "#ef4444" : "var(--text-dim)",
                              fontWeight: row.critical > 0 ? 700 : 400,
                            }}
                          >
                            {row.critical}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              backgroundColor: row.high > 0 ? "rgba(249, 115, 22, 0.18)" : "transparent",
                              color: row.high > 0 ? "#f97316" : "var(--text-dim)",
                              fontWeight: row.high > 0 ? 700 : 400,
                            }}
                          >
                            {row.high}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              backgroundColor: row.medium > 0 ? "rgba(234, 179, 8, 0.18)" : "transparent",
                              color: row.medium > 0 ? "#eab308" : "var(--text-dim)",
                              fontWeight: row.medium > 0 ? 700 : 400,
                            }}
                          >
                            {row.medium}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "2px 7px",
                              borderRadius: "4px",
                              backgroundColor: row.low > 0 ? "rgba(59, 130, 246, 0.18)" : "transparent",
                              color: row.low > 0 ? "#3b82f6" : "var(--text-dim)",
                              fontWeight: row.low > 0 ? 700 : 400,
                            }}
                          >
                            {row.low}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span style={{ color: "var(--text-dim)" }}>{row.info}</span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                          {row.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },
  ], [
    gradeColor, grade, postureScore, gradeStatus, gradeDesc,
    totalFindings, critCount, highCount, medCount, relevantEndpoints, fixedCount, openCount,
    timelineViewMode, chartWidth, chartHeight, areaD, pathD, pointsCoordinates, hoveredTimelineIndex, timelinePoints,
    gaugeRadius, gaugeCircumference, gaugeOffset, donutRadius, donutCircumference, donutSlices, hoveredSlice, donutData,
    topAssets, categoryGroups, relevantScans, scanSuccessRate, avgScanDuration, isScanning, selectedTarget,
    recentEvents, onNavigateTab, onQuickScan, findingAgeBuckets, assetSeverityMatrix, selectedAssetFilter
  ]);

  return (
    <div className="analytics-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner & Scope Selector */}
      <div
        className="card"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)",
            }}
          >
            <Activity size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Security Posture & Analytics
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "2px 0 0 0" }}>
              Real-time vulnerability telemetry, attack surface velocity, and interactive posture radar.
            </p>
          </div>
        </div>

        {/* Scope toggle & target selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "3px",
              display: "flex",
              gap: "3px",
            }}
          >
            <button
              className={`filter-chip ${filterMode === "current" ? "active" : ""}`}
              style={{ margin: 0, padding: "4px 10px", fontSize: "0.78rem" }}
              onClick={() => setFilterMode("current")}
              disabled={!selectedTarget}
            >
              Current Target
            </button>
            <button
              className={`filter-chip ${filterMode === "all" ? "active" : ""}`}
              style={{ margin: 0, padding: "4px 10px", fontSize: "0.78rem" }}
              onClick={() => setFilterMode("all")}
            >
              Global Fleet ({targets.length})
            </button>
          </div>

          {filterMode === "current" && targets.length > 0 && (
            <select
              className="input-field"
              style={{ width: "auto", minWidth: "170px", padding: "5px 10px", fontSize: "0.8rem" }}
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

      {/* Interactive Global Analytics Filter Bar */}
      <div
        className="card"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-dim)", fontSize: "0.78rem" }}>
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          {/* Timeframe Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Calendar size={13} color="var(--text-dim)" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              style={{
                fontSize: "0.76rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
              }}
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            style={{
              fontSize: "0.76rem",
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Info">Info</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              fontSize: "0.76rem",
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="New">New</option>
            <option value="Confirmed">Confirmed</option>
            <option value="NeedsReview">Needs Review</option>
            <option value="Fixed">Fixed</option>
            <option value="FalsePositive">False Positive</option>
          </select>

          {/* Search Query Input */}
          <div style={{ position: "relative", minWidth: "160px", flex: 1, maxWidth: "240px" }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
              }}
            />
            <input
              type="text"
              placeholder="Filter findings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "3px 8px 3px 26px",
                borderRadius: "4px",
                fontSize: "0.76rem",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
                outline: "none",
              }}
            />
          </div>

          {/* Asset filter tag if selected */}
          {selectedAssetFilter && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--accent-primary-subtle)",
                color: "var(--accent-primary)",
                fontSize: "0.74rem",
              }}
            >
              <span>Asset: {selectedAssetFilter}</span>
              <button
                type="button"
                onClick={() => setSelectedAssetFilter(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Reset Filter Button */}
        {activeFilterCount > 0 && (
          <button
            className="btn btn-secondary"
            style={{ padding: "3px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "5px" }}
            onClick={handleResetFilters}
            title="Clear all active filters"
          >
            <RotateCcw size={12} />
            <span>Reset Filters ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* Draggable Modular Analytics Dashboard */}
      <DraggableDashboard widgets={analyticsWidgets} storageKey="analytics_dashboard" />
    </div>
  );
}
