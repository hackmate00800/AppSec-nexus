import React, { useState, useMemo, useEffect } from "react";
import {
  FileCheck,
  AlertTriangle,
  Sparkles,
  Download,
  Search,
  Plus,
  Layers,
  Check,
} from "lucide-react";
import {
  ChecklistItemStatus,
  AssessmentRun,
  ItemExecutionRecord,
  AssessmentRunMetrics,
  ChecklistItemTemplate,
} from "./types";
import { BUILTIN_PLAYBOOKS } from "./data/playbooksData";
import { SecurityCategory } from "../categories/types";
import { ALL_SECURITY_CATEGORIES } from "../categories/registry";
import { getCategoryIcon } from "../categories/CategorySelector";
import { sanitizeEvidence } from "../categories/validationRules";
import { Finding } from "../types";

interface ChecklistPlaybookCenterProps {
  initialCategory?: SecurityCategory;
  targets?: Array<{ id: string; name: string; primary_url: string }>;
  onFindingsAdded?: (newFindings: Finding[]) => void;
  onLaunchAiMentor?: (promptText?: string) => void;
}

const ALL_STATUSES: ChecklistItemStatus[] = [
  "Not Started",
  "In Progress",
  "Pass",
  "Fail",
  "Needs Review",
  "Not Applicable",
  "Blocked",
  "Not Tested",
  "Retest Required",
  "Retest Passed",
  "Retest Failed",
];

export function getStatusStyle(status: ChecklistItemStatus) {
  switch (status) {
    case "Pass":
    case "Retest Passed":
      return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)" };
    case "Fail":
    case "Retest Failed":
      return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.4)" };
    case "In Progress":
      return { bg: "rgba(0, 240, 255, 0.15)", text: "var(--accent-cyan)", border: "rgba(0, 240, 255, 0.4)" };
    case "Needs Review":
      return { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "rgba(168, 85, 247, 0.4)" };
    case "Blocked":
      return { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308", border: "rgba(234, 179, 8, 0.4)" };
    case "Retest Required":
      return { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.4)" };
    case "Not Applicable":
      return { bg: "rgba(100, 116, 139, 0.15)", text: "#64748b", border: "rgba(100, 116, 139, 0.3)" };
    case "Not Tested":
    case "Not Started":
    default:
      return { bg: "rgba(148, 163, 184, 0.1)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.25)" };
  }
}

export const ChecklistPlaybookCenter: React.FC<ChecklistPlaybookCenterProps> = ({
  initialCategory = "web",
  targets = [],
  onFindingsAdded,
  onLaunchAiMentor,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SecurityCategory | "all">(initialCategory);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    BUILTIN_PLAYBOOKS[0]?.id || "playbook-web-wstg"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChecklistItemStatus | "All">("All");

  // Assessment Runs State (persisted in localStorage)
  const [runs, setRuns] = useState<AssessmentRun[]>(() => {
    try {
      const stored = localStorage.getItem("appsec_assessment_runs");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("Failed to read runs from storage", e);
    }
    // Default initial mock run
    const defaultTmpl = BUILTIN_PLAYBOOKS[0];
    return [
      {
        id: "run-initial-wstg-sample",
        templateId: defaultTmpl.id,
        templateTitle: defaultTmpl.title,
        category: defaultTmpl.category,
        targetId: targets[0]?.id || "target-staging",
        targetName: targets[0]?.name || "Staging Web Portal",
        targetUrl: targets[0]?.primary_url || "https://staging.internal.corp",
        environment: "Staging",
        authorizedScope: "Strictly authorized staging environment pentest",
        status: "Active",
        createdAt: new Date().toISOString(),
        itemResults: {
          "wstg-info-01": {
            itemId: "wstg-info-01",
            status: "Pass",
            methodUsed: "Header inspection via curl -I",
            toolsUsed: "curl, nuclei",
            evidenceSnippet: "HTTP/1.1 200 OK\nServer: nginx (tokens suppressed)",
            updatedAt: new Date().toISOString(),
          },
          "wstg-inp-01": {
            itemId: "wstg-inp-01",
            status: "Fail",
            methodUsed: "Reflected parameter fuzzing on /search?q=",
            toolsUsed: "nuclei, Burp Suite",
            evidenceSnippet: "<script>alert(1)</script> reflected raw without entity encoding",
            findingTitle: "Reflected XSS on Search Endpoint",
            updatedAt: new Date().toISOString(),
          },
        },
      },
    ];
  });

  const [activeRunId, setActiveRunId] = useState<string>(runs[0]?.id || "");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [copiedReport, setCopiedReport] = useState(false);
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);

  // New Run Form State
  const [newRunTargetId, setNewRunTargetId] = useState(targets[0]?.id || "custom-target");
  const [newRunTargetUrl, setNewRunTargetUrl] = useState(targets[0]?.primary_url || "https://api.internal.corp");
  const [newRunTargetName, setNewRunTargetName] = useState(targets[0]?.name || "Primary API Gateway");
  const [newRunEnv, setNewRunEnv] = useState<"Production" | "Staging" | "Development" | "Lab">("Staging");
  const [newRunScope, setNewRunScope] = useState("Authorized testing scope per Rule of Engagement document.");

  // Save runs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("appsec_assessment_runs", JSON.stringify(runs));
    } catch (e) {
      console.warn("Failed to persist assessment runs", e);
    }
  }, [runs]);

  // Active run & Active template
  const activeRun = useMemo(() => {
    return runs.find((r) => r.id === activeRunId) || runs[0];
  }, [runs, activeRunId]);

  const activeTemplate = useMemo(() => {
    const tmplId = activeRun ? activeRun.templateId : selectedTemplateId;
    return BUILTIN_PLAYBOOKS.find((p) => p.id === tmplId) || BUILTIN_PLAYBOOKS[0];
  }, [activeRun, selectedTemplateId]);

  // Selected item within active template
  const selectedItem = useMemo(() => {
    if (!activeTemplate) return null;
    return activeTemplate.items.find((i) => i.id === selectedItemId) || activeTemplate.items[0];
  }, [activeTemplate, selectedItemId]);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "all") return BUILTIN_PLAYBOOKS;
    return BUILTIN_PLAYBOOKS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Metrics for active run
  const metrics: AssessmentRunMetrics = useMemo(() => {
    if (!activeTemplate || !activeRun) {
      return {
        totalItems: 0,
        completedItems: 0,
        passCount: 0,
        failCount: 0,
        needsReviewCount: 0,
        notApplicableCount: 0,
        blockedCount: 0,
        retestCount: 0,
        progressPercent: 0,
        passRatePercent: 0,
      };
    }
    const total = activeTemplate.items.length;
    let completed = 0;
    let pass = 0;
    let fail = 0;
    let needsReview = 0;
    let notApplicable = 0;
    let blocked = 0;
    let retest = 0;

    activeTemplate.items.forEach((item) => {
      const res = activeRun.itemResults[item.id];
      if (res) {
        if (res.status === "Pass" || res.status === "Retest Passed") {
          pass++;
          completed++;
        } else if (res.status === "Fail" || res.status === "Retest Failed") {
          fail++;
          completed++;
        } else if (res.status === "Needs Review") {
          needsReview++;
        } else if (res.status === "Not Applicable") {
          notApplicable++;
          completed++;
        } else if (res.status === "Blocked") {
          blocked++;
        } else if (res.status === "Retest Required") {
          retest++;
        } else if (res.status === "In Progress") {
          // in progress
        }
      }
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const passRate = completed > 0 ? Math.round((pass / completed) * 100) : 0;

    return {
      totalItems: total,
      completedItems: completed,
      passCount: pass,
      failCount: fail,
      needsReviewCount: needsReview,
      notApplicableCount: notApplicable,
      blockedCount: blocked,
      retestCount: retest,
      progressPercent: progress,
      passRatePercent: passRate,
    };
  }, [activeTemplate, activeRun]);

  // Filter items in active template
  const filteredItems = useMemo(() => {
    if (!activeTemplate) return [];
    return activeTemplate.items.filter((item) => {
      const record = activeRun?.itemResults[item.id];
      const status = record?.status || "Not Started";

      if (statusFilter !== "All" && status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.phase.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeTemplate, activeRun, statusFilter, searchQuery]);

  // Update item result
  const handleUpdateItemResult = (
    itemId: string,
    updates: Partial<ItemExecutionRecord>
  ) => {
    if (!activeRun) return;

    setRuns((prev) =>
      prev.map((r) => {
        if (r.id !== activeRun.id) return r;
        const currentRecord = r.itemResults[itemId] || {
          itemId,
          status: "Not Started",
          updatedAt: new Date().toISOString(),
        };

        const updatedRecord: ItemExecutionRecord = {
          ...currentRecord,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        return {
          ...r,
          itemResults: {
            ...r.itemResults,
            [itemId]: updatedRecord,
          },
        };
      })
    );
  };

  // Create new assessment run
  const handleCreateRun = () => {
    const tmpl = BUILTIN_PLAYBOOKS.find((p) => p.id === selectedTemplateId) || BUILTIN_PLAYBOOKS[0];
    const newRun: AssessmentRun = {
      id: `run-${Date.now()}`,
      templateId: tmpl.id,
      templateTitle: tmpl.title,
      category: tmpl.category,
      targetId: newRunTargetId,
      targetName: newRunTargetName,
      targetUrl: newRunTargetUrl,
      environment: newRunEnv,
      authorizedScope: newRunScope,
      status: "Active",
      createdAt: new Date().toISOString(),
      itemResults: {},
    };

    setRuns((prev) => [newRun, ...prev]);
    setActiveRunId(newRun.id);
    setIsNewRunModalOpen(false);
  };

  // Create finding from checklist item
  const handleCreateFinding = (item: ChecklistItemTemplate) => {
    if (!onFindingsAdded || !activeRun) return;
    const record = activeRun.itemResults[item.id];

    const newFinding: Finding = {
      id: `finding-chk-${Date.now()}`,
      target_id: activeRun.targetId,
      title: `${item.code}: ${item.title}`,
      severity: item.defaultSeverity,
      confidence: 90,
      affected_asset: activeRun.targetUrl,
      evidence: record?.evidenceSnippet || "Verified during playbook assessment.",
      source_tool: record?.toolsUsed || item.recommendedTools[0] || "Checklist Playbook",
      tool_version: "1.0",
      cwe: item.cwe,
      remediation: item.remediationGuidance,
      status: "New",
      created_at: new Date().toISOString(),
      validation_status: "CONFIRMED",
    };

    onFindingsAdded([newFinding]);
    handleUpdateItemResult(item.id, {
      findingId: newFinding.id,
      findingTitle: newFinding.title,
      status: "Fail",
    });
  };

  // Generate markdown assessment report
  const generateReportMarkdown = () => {
    if (!activeRun || !activeTemplate) return "";
    let md = `# Assessment Run Report: ${activeTemplate.title}\n\n`;
    md += `**Target:** ${activeRun.targetName} (${activeRun.targetUrl})\n`;
    md += `**Environment:** ${activeRun.environment}\n`;
    md += `**Standard:** ${activeTemplate.standard} (v${activeTemplate.version})\n`;
    md += `**Started:** ${new Date(activeRun.createdAt).toLocaleString()}\n`;
    md += `**Scope:** ${activeRun.authorizedScope}\n\n`;

    md += `## Metrics Summary\n`;
    md += `- **Progress:** ${metrics.progressPercent}% (${metrics.completedItems}/${metrics.totalItems} items)\n`;
    md += `- **Pass Rate:** ${metrics.passRatePercent}%\n`;
    md += `- **Pass:** ${metrics.passCount} | **Fail:** ${metrics.failCount} | **Needs Review:** ${metrics.needsReviewCount} | **Blocked:** ${metrics.blockedCount}\n\n`;

    md += `## Detailed Item Results\n\n`;
    activeTemplate.items.forEach((item) => {
      const res = activeRun.itemResults[item.id];
      const status = res?.status || "Not Started";
      md += `### [${item.code}] ${item.title} - **${status}**\n`;
      md += `- **Phase:** ${item.phase} | **Severity:** ${item.defaultSeverity} | **CWE:** ${item.cwe || "N/A"}\n`;
      if (res?.methodUsed) md += `- **Method:** ${res.methodUsed}\n`;
      if (res?.toolsUsed) md += `- **Tools:** ${res.toolsUsed}\n`;
      if (res?.evidenceSnippet) md += `- **Evidence:**\n\`\`\`\n${res.evidenceSnippet}\n\`\`\`\n`;
      if (res?.remediationNotes) md += `- **Remediation Notes:** ${res.remediationNotes}\n`;
      md += `\n`;
    });

    return md;
  };

  const currentItemRecord = selectedItem ? activeRun?.itemResults[selectedItem.id] : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "16px 20px",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        borderRadius: 12,
        minHeight: "82vh",
      }}
      data-testid="checklist-playbook-center"
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 14,
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileCheck size={24} color="var(--accent-cyan)" />
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
              Universal Security Checklists & Pentest Playbooks
            </h1>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Reusable assessment workflows, 11-status verification lifecycles, sanitized evidence logging, and finding traceability.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setIsNewRunModalOpen(true)}
            className="btn btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              padding: "8px 14px",
            }}
            data-testid="btn-new-assessment-run"
          >
            <Plus size={15} />
            <span>Start New Assessment Run</span>
          </button>

          <button
            onClick={() => {
              const report = generateReportMarkdown();
              navigator.clipboard.writeText(report);
              setCopiedReport(true);
              setTimeout(() => setCopiedReport(false), 2000);
            }}
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              padding: "8px 14px",
            }}
            data-testid="btn-export-report"
          >
            {copiedReport ? <Check size={14} color="#10b981" /> : <Download size={14} />}
            <span>{copiedReport ? "Report Copied!" : "Export Report (MD)"}</span>
          </button>
        </div>
      </div>

      {/* Assessment Run Selector & Active Run Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 16px",
          backgroundColor: "var(--bg-card)",
          borderRadius: 8,
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Active Assessment Run:</span>
          <select
            value={activeRunId}
            onChange={(e) => setActiveRunId(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
            data-testid="select-active-run"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.templateTitle} — {r.targetName} ({r.environment})
              </option>
            ))}
          </select>
          {activeRun && (
            <span
              style={{
                fontSize: "0.74rem",
                padding: "2px 8px",
                borderRadius: 12,
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: 600,
              }}
            >
              {activeRun.environment}
            </span>
          )}
        </div>

        {/* Real-time KPI Metric Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Progress:</span>
            <strong style={{ color: "var(--accent-cyan)" }}>{metrics.progressPercent}%</strong>
            <div
              style={{
                width: 70,
                height: 6,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${metrics.progressPercent}%`,
                  height: "100%",
                  backgroundColor: "var(--accent-cyan)",
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>

          <span
            style={{
              fontSize: "0.74rem",
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
            }}
          >
            Pass: {metrics.passCount}
          </span>
          <span
            style={{
              fontSize: "0.74rem",
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
            }}
          >
            Fail: {metrics.failCount}
          </span>
          <span
            style={{
              fontSize: "0.74rem",
              padding: "2px 8px",
              borderRadius: 4,
              backgroundColor: "rgba(168, 85, 247, 0.15)",
              color: "#a855f7",
            }}
          >
            Review: {metrics.needsReviewCount}
          </span>
        </div>
      </div>

      {/* Category Pills & Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          <button
            onClick={() => setSelectedCategory("all")}
            style={{
              padding: "5px 12px",
              borderRadius: 16,
              fontSize: "0.8rem",
              fontWeight: selectedCategory === "all" ? 700 : 500,
              background: selectedCategory === "all" ? "var(--accent-cyan)" : "var(--bg-card)",
              color: selectedCategory === "all" ? "#000000" : "var(--text-secondary)",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
            }}
          >
            All Playbooks
          </button>
          {ALL_SECURITY_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  fontSize: "0.8rem",
                  fontWeight: isCatActive ? 700 : 500,
                  background: isCatActive ? cat.color : "var(--bg-card)",
                  color: isCatActive ? "#ffffff" : "var(--text-secondary)",
                  border: isCatActive ? `1px solid ${cat.color}` : "1px solid var(--border-color)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {getCategoryIcon(cat.iconName, 12, isCatActive ? "#ffffff" : cat.color)}
                <span>{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            />
            <input
              type="text"
              placeholder="Search checklist items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "6px 10px 6px 30px",
                borderRadius: 6,
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                width: 220,
              }}
              data-testid="input-checklist-search"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
            }}
            data-testid="select-status-filter"
          >
            <option value="All">All Statuses ({activeTemplate?.items.length || 0})</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split-Pane Layout: Item List (Left) and Detailed Item Execution Workspace (Right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 16,
          flex: 1,
        }}
      >
        {/* Left Column: Checklist Item List */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            overflowY: "auto",
            maxHeight: "65vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border-color)",
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            <span>Playbook Items ({filteredItems.length})</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {activeTemplate?.standard}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredItems.map((item) => {
              const res = activeRun?.itemResults[item.id];
              const st = res?.status || "Not Started";
              const isSelected = selectedItem?.id === item.id;
              const badgeStyle = getStatusStyle(st);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-color)",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--bg-secondary)" : "transparent",
                    borderLeft: isSelected ? "3px solid var(--accent-cyan)" : "3px solid transparent",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                  data-testid={`checklist-item-row-${item.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.78rem",
                        color: "var(--accent-cyan)",
                        fontWeight: 700,
                      }}
                    >
                      {item.code}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: 10,
                        backgroundColor: badgeStyle.bg,
                        color: badgeStyle.text,
                        border: `1px solid ${badgeStyle.border}`,
                        fontWeight: 600,
                      }}
                    >
                      {st}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: isSelected ? 600 : 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.title}
                  </span>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                      {item.phase}
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color:
                          item.defaultSeverity === "Critical"
                            ? "#ef4444"
                            : item.defaultSeverity === "High"
                            ? "#f97316"
                            : "#eab308",
                        fontWeight: 600,
                      }}
                    >
                      {item.defaultSeverity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Checklist Item Execution Workspace */}
        {selectedItem ? (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflowY: "auto",
              maxHeight: "65vh",
            }}
            data-testid="checklist-item-detail"
          >
            {/* Item Title and Badges Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "var(--accent-cyan)",
                    }}
                  >
                    {selectedItem.code}
                  </span>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      padding: "2px 8px",
                      borderRadius: 4,
                      backgroundColor: "rgba(255, 255, 255, 0.06)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Phase: {selectedItem.phase}
                  </span>
                  {selectedItem.cwe && (
                    <span
                      style={{
                        fontSize: "0.74rem",
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {selectedItem.cwe}
                    </span>
                  )}
                </div>
                <h2 style={{ margin: "4px 0", fontSize: "1.15rem", fontWeight: 700 }}>
                  {selectedItem.title}
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {selectedItem.description}
                </p>
              </div>

              {/* Status Selector Dropdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Execution Status:
                </label>
                <select
                  value={currentItemRecord?.status || "Not Started"}
                  onChange={(e) =>
                    handleUpdateItemResult(selectedItem.id, {
                      status: e.target.value as ChecklistItemStatus,
                    })
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    backgroundColor: getStatusStyle(currentItemRecord?.status || "Not Started").bg,
                    color: getStatusStyle(currentItemRecord?.status || "Not Started").text,
                    border: `1px solid ${getStatusStyle(currentItemRecord?.status || "Not Started").border}`,
                    cursor: "pointer",
                  }}
                  data-testid="select-item-status"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ordered Methodology Procedure Steps */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={14} color="var(--accent-cyan)" />
                <span>Standard Procedure Steps</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.82rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                {selectedItem.procedureSteps.map((step, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Tools & Verification Criteria */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.8rem",
                }}
              >
                <strong style={{ display: "block", marginBottom: 4 }}>Recommended Tools:</strong>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {selectedItem.recommendedTools.map((t) => (
                    <span
                      key={t}
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        fontFamily: "monospace",
                        color: "var(--accent-cyan)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.8rem",
                }}
              >
                <strong style={{ display: "block", marginBottom: 4 }}>Verification Criteria:</strong>
                <span style={{ color: "var(--text-secondary)" }}>
                  {selectedItem.verificationCriteria}
                </span>
              </div>
            </div>

            {/* Evidence & Result Recording Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Method / Command Executed:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. curl -s -i 'https://...' | grep XSS"
                    value={currentItemRecord?.methodUsed || ""}
                    onChange={(e) =>
                      handleUpdateItemResult(selectedItem.id, { methodUsed: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "0.82rem",
                    }}
                    data-testid="input-item-method"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Tools Used:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Burp Suite, curl, nuclei"
                    value={currentItemRecord?.toolsUsed || ""}
                    onChange={(e) =>
                      handleUpdateItemResult(selectedItem.id, { toolsUsed: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "0.82rem",
                    }}
                    data-testid="input-item-tools"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.76rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Sanitized Evidence & Observed Response (Credentials automatically redacted):
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste terminal output, HTTP headers, or response payload here..."
                  value={currentItemRecord?.evidenceSnippet || ""}
                  onChange={(e) =>
                    handleUpdateItemResult(selectedItem.id, {
                      evidenceSnippet: sanitizeEvidence(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                  data-testid="textarea-item-evidence"
                />
              </div>

              {/* Action Buttons: Create Finding & Ask AI Mentor */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                <button
                  onClick={() => handleCreateFinding(selectedItem)}
                  className="btn btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    padding: "6px 12px",
                    color: "#ef4444",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                  }}
                  data-testid="btn-create-finding-from-item"
                >
                  <AlertTriangle size={14} />
                  <span>
                    {currentItemRecord?.findingId
                      ? `Linked: ${currentItemRecord.findingTitle || "Finding"}`
                      : "Flag as Vulnerability & Create Finding"}
                  </span>
                </button>

                {onLaunchAiMentor && (
                  <button
                    onClick={() =>
                      onLaunchAiMentor(
                        `How do I perform and verify [${selectedItem.code}] "${selectedItem.title}" in this assessment? Here are the details: ${selectedItem.description}`
                      )
                    }
                    className="btn btn-secondary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.82rem",
                      padding: "6px 12px",
                    }}
                    data-testid="btn-ask-ai-item"
                  >
                    <Sparkles size={14} color="var(--accent-cyan)" />
                    <span>Ask AI Mentor for Step Guidance</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--bg-card)",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            Select a checklist item on the left to review instructions and record assessment results.
          </div>
        )}
      </div>

      {/* Start New Run Modal */}
      {isNewRunModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          data-testid="new-run-modal"
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              padding: 24,
              borderRadius: 12,
              border: "1px solid var(--border-color)",
              width: 520,
              maxWidth: "92vw",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Start New Assessment Run
              </h3>
              <button
                onClick={() => setIsNewRunModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Playbook Template:
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              >
                {filteredTemplates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.standard})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Target:
                </label>
                {targets.length > 0 ? (
                  <select
                    value={newRunTargetId}
                    onChange={(e) => {
                      const t = targets.find((x) => x.id === e.target.value);
                      if (t) {
                        setNewRunTargetId(t.id);
                        setNewRunTargetName(t.name);
                        setNewRunTargetUrl(t.primary_url);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.primary_url})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newRunTargetName}
                    onChange={(e) => setNewRunTargetName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Environment:
                </label>
                <select
                  value={newRunEnv}
                  onChange={(e) => setNewRunEnv(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="Staging">Staging</option>
                  <option value="Production">Production</option>
                  <option value="Development">Development</option>
                  <option value="Lab">Authorized Lab</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Target URL / Asset Boundary:
              </label>
              <input
                type="text"
                value={newRunTargetUrl}
                onChange={(e) => setNewRunTargetUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Authorized Scope & Rules of Engagement:
              </label>
              <textarea
                rows={2}
                value={newRunScope}
                onChange={(e) => setNewRunScope(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setIsNewRunModalOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRun}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem" }}
                data-testid="btn-confirm-create-run"
              >
                Create & Begin Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
