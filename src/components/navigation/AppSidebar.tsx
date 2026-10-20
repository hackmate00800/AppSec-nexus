import React, { useState } from "react";
import {
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
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
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
    workspace: false,
    security_tools: false,
    ai_workspace: false,
    system: false,
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const navGroups: NavGroupDef[] = [
    {
      id: "workspace",
      label: "Workspace",
      items: [
        {
          id: "analytics",
          label: "Security Analytics",
          icon: <Activity size={15} />,
          tooltip: "Security Analytics & Posture",
        },
        {
          id: "targets",
          label: "Target & Scope",
          icon: <TargetIcon size={15} />,
          tooltip: "Target & Scope",
          dataTour: "sidebar-target",
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
          tooltip: "Vulnerability Findings",
          dataTour: "sidebar-findings",
        },
        {
          id: "issues",
          label: "Issues & Reports",
          icon: <ClipboardList size={15} />,
          tooltip: "Issue Documentation & Reports",
        },
        {
          id: "history",
          label: "Audit History",
          icon: <History size={15} />,
          badge:
            scanHistoryCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-400">
                {scanHistoryCount}
              </span>
            ) : undefined,
          tooltip: "Audit History",
        },
      ],
    },
    {
      id: "security_tools",
      label: "Security Tools",
      items: [
        {
          id: "scanner",
          label: "Scan Console",
          icon: <Terminal size={15} />,
          tooltip: "Live Scan Console",
          dataTour: "sidebar-scanner",
        },
        {
          id: "orchestration",
          label: "Universal Orchestration",
          icon: <Cpu size={15} />,
          tooltip: "Scan Pipelines & Autonomous Workflows",
        },
        {
          id: "crawler",
          label: "Crawler & Surface",
          icon: <Compass size={15} />,
          badge:
            endpointsCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-400">
                {endpointsCount}
              </span>
            ) : undefined,
          tooltip: "Crawler & Discovered Endpoints",
        },
        {
          id: "categoryWorkflow",
          label: "Category Intel",
          icon: <Layers size={15} />,
          tooltip: "Category-Based Workflow",
        },
        {
          id: "playbooks",
          label: "Playbooks & Checklists",
          icon: <FileCheck size={15} />,
          tooltip: "Manual Testing Checklists",
        },
        {
          id: "methodologies",
          label: "Methodology Explorer",
          icon: <BookOpen size={15} />,
          tooltip: "Methodology Transparency",
        },
        {
          id: "tools",
          label: "Tools & Plugins",
          icon: <Layers size={15} />,
          badge:
            readyToolsCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                {readyToolsCount}
              </span>
            ) : undefined,
          tooltip: "Security Tools Inventory",
        },
        {
          id: "terminal",
          label: "Multi-Terminal",
          icon: <Terminal size={15} />,
          tooltip: "Multi-Terminal Orchestration & Tool Execution",
        },
        {
          id: "burp",
          label: "Burp Suite",
          icon: <Radio size={15} />,
          badge: (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
              Proxy
            </span>
          ),
          tooltip: "Burp Suite Local Integration",
        },
        {
          id: "hostmobile",
          label: "Host & Mobile",
          icon: <Monitor size={15} />,
          tooltip: "Host & Mobile Audit",
        },
      ],
    },
    {
      id: "ai_workspace",
      label: "AI Workspace",
      items: [
        {
          id: "mentor",
          label: "Local AI Mentor",
          icon: <Sparkles size={15} />,
          badge: hasRunningAiTask ? (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          ) : undefined,
          tooltip: "Interactive AI Mentor & Security Copilot",
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
        {
          id: "importer",
          label: "Import Reports",
          icon: <UploadCloud size={15} />,
          tooltip: "Import Scanner Reports",
        },
      ],
    },
    {
      id: "system",
      label: "Platform",
      items: [
        {
          id: "academy",
          label: "Cyber Academy",
          icon: <GraduationCap size={15} />,
          tooltip: "Cyber Academy & OWASP Cheat Sheets",
        },
        {
          id: "appearance",
          label: "Appearance",
          icon: <Palette size={15} />,
          tooltip: "Appearance & Personalization",
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
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-300 cursor-pointer rounded transition"
                >
                  <span>{group.label}</span>
                  {isGroupCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </div>
              ) : (
                <div className="my-2 border-t border-slate-800/60 mx-1" />
              )}

              {/* Group Items */}
              {!isGroupCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;

                    const itemButton = (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        title={item.tooltip}
                        data-tour={item.dataTour}
                        className={`nav-item w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left group ${
                          isCollapsed ? "justify-center px-0 h-9" : ""
                        } ${
                          isActive
                            ? "active bg-slate-900 text-cyan-300 font-semibold border-l-2 border-cyan-500 rounded-l-none pl-2 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                        }`}
                      >
                        <span
                          className={`shrink-0 transition-colors ${
                            isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span className={`sidebar-label truncate flex-1 ${isCollapsed ? "sr-only" : ""}`}>
                          {item.label}
                        </span>
                        {!isCollapsed && item.badge && (
                          <span className="shrink-0">{item.badge}</span>
                        )}
                      </button>
                    );

                    return isCollapsed ? (
                      <Tooltip key={item.id} content={item.tooltip} position="right">
                        {itemButton}
                      </Tooltip>
                    ) : (
                      itemButton
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Sidebar Collapse Toggle Bar */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] text-slate-400 font-mono px-2">
            AppSec v2.1 PRO
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className={`sidebar-collapse-btn p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition ${
            isCollapsed ? "w-full flex items-center justify-center" : ""
          }`}
          title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
