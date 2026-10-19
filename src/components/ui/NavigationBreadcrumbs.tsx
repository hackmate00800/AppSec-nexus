import React from "react";
import {
  ChevronRight,
  ArrowLeft,
  Activity,
  Target as TargetIcon,
  Terminal,
  Cpu,
  Compass,
  Layers,
  Monitor,
  AlertTriangle,
  ClipboardList,
  UploadCloud,
  Sparkles,
  GraduationCap,
  History,
  Palette,
  FileCheck,
  Radio,
  Workflow,
} from "lucide-react";
import { TabType } from "../../App";
import { Target, Finding } from "../../types";

interface NavigationBreadcrumbsProps {
  activeTab: TabType;
  onNavigateTab: (tab: TabType) => void;
  targets: Target[];
  selectedTarget: Target | null;
  onSelectTarget: (target: Target) => void;
  selectedFinding?: Finding | null;
  onCloseFinding?: () => void;
}

const TAB_CONFIG: Record<string, { label: string; group: string; icon: React.ReactNode }> = {
  analytics: { label: "Security Analytics", group: "Operations", icon: <Activity size={14} /> },
  targets: { label: "Target & Scope", group: "Operations", icon: <TargetIcon size={14} /> },
  scanner: { label: "Scan Console", group: "Operations", icon: <Terminal size={14} /> },
  terminal: { label: "Multi-Terminal", group: "Operations", icon: <Terminal size={14} /> },
  orchestration: { label: "Universal Orchestration", group: "Operations", icon: <Cpu size={14} /> },
  crawler: { label: "Crawler & Surface", group: "Discovery & Audit", icon: <Compass size={14} /> },
  tools: { label: "Tools & Plugins", group: "Discovery & Audit", icon: <Layers size={14} /> },
  burp: { label: "Burp Suite", group: "Discovery & Audit", icon: <Radio size={14} /> },
  hostmobile: { label: "Host & Mobile", group: "Discovery & Audit", icon: <Monitor size={14} /> },
  findings: { label: "Vulnerability Findings", group: "Findings & Intel", icon: <AlertTriangle size={14} /> },
  issues: { label: "Issues & Reports", group: "Findings & Intel", icon: <ClipboardList size={14} /> },
  importer: { label: "Import Reports", group: "Findings & Intel", icon: <UploadCloud size={14} /> },
  categoryWorkflow: { label: "Category Intel", group: "Findings & Intel", icon: <Layers size={14} /> },
  playbooks: { label: "Playbooks", group: "Findings & Intel", icon: <FileCheck size={14} /> },
  mentor: { label: "AI Mentor", group: "AI & Learning", icon: <Sparkles size={14} /> },
  academy: { label: "Cyber Academy", group: "AI & Learning", icon: <GraduationCap size={14} /> },
  history: { label: "Audit History", group: "Platform", icon: <History size={14} /> },
  appearance: { label: "Appearance", group: "Platform", icon: <Palette size={14} /> },
  methodologies: { label: "Methodology Explorer", group: "AI & Learning", icon: <Workflow size={14} /> },
};

export const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({
  activeTab,
  onNavigateTab,
  targets,
  selectedTarget,
  onSelectTarget,
  selectedFinding,
  onCloseFinding,
}) => {
  const currentTab = TAB_CONFIG[activeTab] || {
    label: activeTab,
    group: "AppSec",
    icon: <Activity size={14} />,
  };

  return (
    <div
      className="navigation-breadcrumbs"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        marginBottom: "16px",
        fontSize: "12px",
        flexWrap: "wrap",
        gap: "10px",
      }}
    >
      {/* Left: Trail & Back button */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {selectedFinding && onCloseFinding && (
          <button
            onClick={onCloseFinding}
            className="btn btn-secondary"
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            title="Back to Findings list (Esc)"
          >
            <ArrowLeft size={13} />
            <span>Back to list</span>
          </button>
        )}

        <button
          onClick={() => onNavigateTab("analytics")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
            fontWeight: 500,
            padding: "2px 4px",
            borderRadius: "4px",
          }}
          title="Go to Security Analytics"
        >
          AppSec Nexus
        </button>

        <ChevronRight size={13} color="var(--text-dim)" />

        <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>
          {currentTab.group}
        </span>

        <ChevronRight size={13} color="var(--text-dim)" />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            color: selectedFinding ? "var(--text-muted)" : "var(--accent-cyan)",
            fontWeight: selectedFinding ? 500 : 600,
          }}
        >
          {currentTab.icon}
          <span>{currentTab.label}</span>
        </div>

        {selectedFinding && (
          <>
            <ChevronRight size={13} color="var(--text-dim)" />
            <span
              style={{
                color: "var(--accent-rose)",
                fontWeight: 600,
                maxWidth: "260px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={selectedFinding.title}
            >
              {selectedFinding.title}
            </span>
          </>
        )}
      </div>

      {/* Right: Target Scope Chip with quick switcher */}
      {targets.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>Active Scope:</span>
          <select
            value={selectedTarget?.id || ""}
            onChange={(e) => {
              const target = targets.find((t) => t.id === e.target.value);
              if (target) onSelectTarget(target);
            }}
            style={{
              background: "var(--bg-card)",
              color: "var(--accent-cyan)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              maxWidth: "220px",
            }}
            title="Switch active target scope"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.primary_url})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
