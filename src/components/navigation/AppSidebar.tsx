import React, { useState } from "react";
import {
  Activity,
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
          icon: <Activity size={15} />,
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
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-400">
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
            <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
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
          id: "findings",
          label: "Findings",
          icon: <AlertTriangle size={15} />,
          badge:
            findingsCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/80">
                {findingsCount}
              </span>
            ) : undefined,
          tooltip: "Vulnerability Findings & Evidence",
          dataTour: "sidebar-findings",
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
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          ) : undefined,
          tooltip: "Interactive AI Mentor & Security Copilot",
        },
        {
          id: "history",
          label: "Conversation History",
          icon: <History size={15} />,
          badge:
            scanHistoryCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-400">
                {scanHistoryCount}
              </span>
            ) : undefined,
          tooltip: "Conversation History & Audit Logs",
        },
        {
          id: "modelLab",
          label: "Model Lab",
          icon: <Bot size={15} />,
          badge: (
            <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
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
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
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
      className="sidebar relative flex flex-col bg-slate-950 border-r border-slate-800/80 select-none z-20 shrink-0 transition-all duration-150"
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
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 transition-colors ${
            isResizing ? "bg-cyan-500 shadow-md shadow-cyan-500/50" : "hover:bg-cyan-500/50 bg-transparent"
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
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors group cursor-pointer"
                >
                  <span>{group.label}</span>
                  <span className="text-slate-500 group-hover:text-slate-300">
                    {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </span>
                </button>
              ) : (
                <div className="w-full h-px bg-slate-800 my-2" />
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
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left relative ${
                          isActive
                            ? "bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/20 shadow-sm shadow-cyan-950"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        {/* Active Accent Indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan-400 rounded-r" />
                        )}

                        <span
                          className={`shrink-0 transition-colors ${
                            isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-300"
                          }`}
                        >
                          {item.icon}
                        </span>

                        {!isCollapsed && (
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="truncate">{item.label}</span>
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
      <div className="p-2 border-t border-slate-800/80 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {!isCollapsed && <span className="truncate">Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
