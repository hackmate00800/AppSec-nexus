import React, { useState } from "react";
import {
  Activity,
  LayoutDashboard,
  Target as TargetIcon,
  Terminal,
  Layers,
  AlertTriangle,
  ClipboardList,
  UploadCloud,
  Sparkles,
  GraduationCap,
  History,
  Palette,
  FileCheck,
  Radio,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  BookA,
  Wrench,
  Search,
} from "lucide-react";
import { TabType } from "../../App";
import { Tooltip } from "../ui/design_system";

interface NavItemDef {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  tooltip: string;
  dataTour?: string;
}

interface NavGroupDef {
  id: string;
  label: string;
  items: NavItemDef[];
}

interface AppSidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  isResizing: boolean;
  onResizePointerDown: (e: React.PointerEvent) => void;
  findingsCount: number;
  endpointsCount: number;
  readyToolsCount: number;
  scanHistoryCount: number;
  hasRunningAiTask: boolean;
  unverifiedFindingsCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  width,
  isResizing,
  onResizePointerDown,
  findingsCount,
  endpointsCount,
  readyToolsCount,
  scanHistoryCount,
  hasRunningAiTask,
  unverifiedFindingsCount = 0,
}) => {
  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    sec_ops: false,
    knowledge_research: false,
    ai_workspace: false,
    app_management: false,
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const navGroups: NavGroupDef[] = [
    {
      id: "sec_ops",
      label: "Security Operations",
      items: [
        {
          id: "analytics",
          label: "Dashboard",
          icon: <LayoutDashboard size={15} />,
          tooltip: "Security Analytics & Posture Dashboard",
        },
        {
          id: "targets",
          label: "Projects & Targets",
          icon: <TargetIcon size={15} />,
          tooltip: "Projects and Authorized Target Inventory",
          dataTour: "sidebar-target",
        },
        {
          id: "webPentest",
          label: "Pentesting Workbench",
          icon: <Shield size={15} />,
          badge:
            endpointsCount > 0 ? (
              <span className="sidebar-badge">
                {endpointsCount}
              </span>
            ) : undefined,
          tooltip: "Authorized Web Application & API Pentesting Workbench",
        },
        {
          id: "tools",
          label: "Tool Integrations",
          icon: <Wrench size={15} />,
          badge: (
            <span className="sidebar-badge sidebar-badge-success">
              {readyToolsCount > 0 ? readyToolsCount : 20}
            </span>
          ),
          tooltip: "Dedicated GUI for Every Supported Security Tool",
        },
        {
          id: "scanner",
          label: "Scan Jobs",
          icon: <Terminal size={15} />,
          tooltip: "Active Scan Jobs & Execution Console",
          dataTour: "sidebar-scanner",
        },
        {
          id: "activity",
          label: "Activity Monitor",
          icon: <Activity size={15} />,
          badge:
            scanHistoryCount > 0 ? (
              <span className="sidebar-badge">
                {scanHistoryCount}
              </span>
            ) : undefined,
          tooltip: "Real-time Telemetry, Safe Command Inspector & Tool Execution Monitor",
          dataTour: "sidebar-activity",
        },
        {
          id: "findings",
          label: "Findings",
          icon: <AlertTriangle size={15} />,
          badge:
            findingsCount > 0 ? (
              <span className="sidebar-badge sidebar-badge-alert font-bold">
                {findingsCount}
              </span>
            ) : undefined,
          tooltip: "Vulnerability Findings & Evidence",
          dataTour: "sidebar-findings",
        },
        {
          id: "verificationLab",
          label: "Vulnerability Verification Lab",
          icon: <ShieldCheck size={15} />,
          badge:
            unverifiedFindingsCount > 0 ? (
              <span className="sidebar-badge sidebar-badge-accent">
                {unverifiedFindingsCount}
              </span>
            ) : undefined,
          tooltip: "Evidence-Based Vulnerability Verification & False-Positive Elimination",
          dataTour: "sidebar-verification-lab",
        },
        {
          id: "issues",
          label: "Reports",
          icon: <ClipboardList size={15} />,
          tooltip: "Issue Management & Exportable Security Reports",
        },
      ],
    },
    {
      id: "knowledge_research",
      label: "Knowledge and Research",
      items: [
        {
          id: "academy",
          label: "Cyber Academy",
          icon: <GraduationCap size={15} />,
          tooltip: "Complete Cyber Academy Curriculum (Beginner to Advanced)",
        },
        {
          id: "documentationCenter",
          label: "Security Intelligence Center",
          icon: <BookOpen size={15} />,
          tooltip: "Security Documentation Center (NIST, MITRE, OWASP, CISA)",
        },
        {
          id: "vulnerabilityExplorer",
          label: "Vulnerability Explorer",
          icon: <Search size={15} />,
          tooltip: "Vulnerability Explorer (Search CVEs, CWEs, CVSS, and KEV)",
        },
        {
          id: "zeroDayResearch",
          label: "Zero-Day Research",
          icon: <ShieldAlert size={15} />,
          tooltip: "Zero-Day Research Workspace & Patch Diff Analysis",
        },
        {
          id: "methodologies",
          label: "Methodologies & Workflows",
          icon: <FileCheck size={15} />,
          tooltip: "Attack & Defense Playbooks and Methodology Explorer",
        },
        {
          id: "diagramLibrary",
          label: "Diagram Library",
          icon: <Layers size={15} />,
          tooltip: "Interactive Diagram Library & Visual Flows",
        },
        {
          id: "glossaryLibrary",
          label: "Glossary & Reference",
          icon: <BookA size={15} />,
          tooltip: "Cybersecurity Glossary & Reference Library",
        },
      ],
    },
    {
      id: "ai_workspace",
      label: "AI Workspace",
      items: [
        {
          id: "mentor",
          label: "AI Mentor",
          icon: <Sparkles size={15} />,
          badge: hasRunningAiTask ? (
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent-primary)" }} />
          ) : undefined,
          tooltip: "Interactive AI Mentor & Security Copilot",
        },
        {
          id: "history",
          label: "Conversation History",
          icon: <History size={15} />,
          tooltip: "Conversation History & Audit Logs",
        },
        {
          id: "modelLab",
          label: "Model Lab",
          icon: <Bot size={15} />,
          badge: (
            <span className="sidebar-badge sidebar-badge-accent">
              Heretic
            </span>
          ),
          tooltip: "Heretic Model Lab & Abliteration Pipeline",
        },
      ],
    },
    {
      id: "app_management",
      label: "Application Management",
      items: [
        {
          id: "appearance",
          label: "Settings & Appearance",
          icon: <Palette size={15} />,
          tooltip: "Settings, Theme, Appearance & Layout",
        },
        {
          id: "importer",
          label: "Import Reports",
          icon: <UploadCloud size={15} />,
          tooltip: "Import External Scanner Reports",
        },
        {
          id: "burp",
          label: "Integrations & Proxy",
          icon: <Radio size={15} />,
          badge: (
            <span className="sidebar-badge sidebar-badge-warning">
              Burp
            </span>
          ),
          tooltip: "Burp Suite & Interception Proxy Integrations",
        },
      ],
    },
  ];

  return (
    <aside
      className="sidebar relative flex flex-col select-none z-20 shrink-0 transition-all duration-150"
      style={{
        width: isCollapsed ? 60 : `${width}px`,
        minWidth: isCollapsed ? 60 : `${width}px`,
      }}
    >
      {/* Resizable drag divider on right edge */}
      {!isCollapsed && (
        <div
          onPointerDown={onResizePointerDown}
          onDoubleClick={onToggleCollapse}
          title="Drag to resize sidebar width, double-click to collapse"
          className={`sidebar-resizer-line absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 ${
            isResizing ? "is-resizing" : ""
          }`}
        />
      )}

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {navGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.id] && !isCollapsed;

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Header (Expanded mode only) */}
              {!isCollapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="sidebar-group-header group"
                >
                  <span>{group.label}</span>
                  <span className="group-chevron">
                    {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                </button>
              ) : (
                <div className="sidebar-group-divider" />
              )}

              {/* Group Nav Items */}
              {!isGroupCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;

                    const buttonContent = (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        data-tour={item.dataTour}
                        className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                      >
                        {/* Active Accent Indicator */}
                        {isActive && <div className="active-pill-indicator" />}

                        <span className="sidebar-nav-icon">
                          {item.icon}
                        </span>

                        {!isCollapsed && (
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="sidebar-nav-label">{item.label}</span>
                            {item.badge && <span className="ml-1.5 shrink-0">{item.badge}</span>}
                          </div>
                        )}
                      </button>
                    );

                    return isCollapsed ? (
                      <Tooltip key={item.id} content={item.tooltip}>
                        {buttonContent}
                      </Tooltip>
                    ) : (
                      <React.Fragment key={item.id}>{buttonContent}</React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer with Collapse/Expand button */}
      <div className="sidebar-footer">
        <button
          onClick={onToggleCollapse}
          className="sidebar-footer-btn"
          title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {!isCollapsed && <span className="truncate">Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
