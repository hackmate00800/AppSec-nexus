import React from "react";
import {
  Shield,
  Search,
  Moon,
  Sun,
  Palette,
  Keyboard,
  History,
  AlertOctagon,
  Bot,
  Sparkles,
  X,
  Target as TargetIcon,
} from "lucide-react";
import { TabType } from "../../App";
import { Target, Finding } from "../../types";
import { NavigationBreadcrumbs } from "../ui/NavigationBreadcrumbs";
import { Tooltip } from "../ui/design_system";

interface AppTopNavProps {
  activeTab: TabType;
  onNavigateTab: (tab: TabType) => void;
  selectedTarget: Target | null;
  targets: Target[];
  onSelectTarget: (target: Target) => void;
  selectedFinding?: Finding | null;
  onCloseFinding?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
  onOpenAuditLogs: () => void;
  onOpenHelp: () => void;
  onEmergencyStop: () => void;
  currentTheme: string;
  onToggleTheme: () => void;
  hasRunningAiTask: boolean;
  activeAiTasksCount: number;
  onCancelActiveAiTask: () => void;
  isAiAnswerReady: boolean;
  onDismissAiNotification: () => void;
  workspacePreset?: string;
  onSelectPreset?: (preset: any) => void;
}

export const AppTopNav: React.FC<AppTopNavProps> = ({
  activeTab,
  onNavigateTab,
  selectedTarget,
  targets,
  onSelectTarget,
  selectedFinding,
  onCloseFinding,
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenAuditLogs,
  onEmergencyStop,
  currentTheme,
  onToggleTheme,
  hasRunningAiTask,
  onCancelActiveAiTask,
  isAiAnswerReady,
  onDismissAiNotification,
  workspacePreset,
  onSelectPreset,
}) => {
  return (
    <header className="top-nav h-11 px-3 bg-slate-950/95 border-b border-slate-800/80 flex items-center justify-between gap-3 select-none z-30 shrink-0">
      {/* Left: Brand + Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          onClick={() => onNavigateTab("analytics")}
          className="brand flex items-center gap-2 cursor-pointer group"
          data-tour="navbar-brand"
          title="AppSec Nexus Security Platform"
        >
          <div className="p-1 rounded bg-cyan-950 border border-cyan-800/80 text-cyan-400 group-hover:border-cyan-500 transition">
            <Shield className="brand-icon" size={14} />
          </div>
          <span className="text-xs font-bold text-slate-100 tracking-tight hidden sm:inline">
            AppSec Nexus
          </span>
          <span className="brand-subtitle sr-only">Desktop Platform</span>
          <span className="brand-version sr-only">v2.1 PRO</span>
        </div>

        <div className="h-3.5 w-px bg-slate-800 hidden md:block" />

        {/* Minimal Breadcrumbs */}
        <div className="hidden md:flex items-center min-w-0">
          <NavigationBreadcrumbs
            activeTab={activeTab}
            onNavigateTab={onNavigateTab}
            targets={targets}
            selectedTarget={selectedTarget}
            onSelectTarget={onSelectTarget}
            selectedFinding={selectedFinding}
            onCloseFinding={onCloseFinding}
          />
        </div>
      </div>

      {/* Center: Command Palette Trigger (Linear Style) */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={onOpenCommandPalette}
          className="command-palette-btn w-full flex items-center justify-between px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 transition group shadow-inner"
          data-tour="command-palette-btn"
          title="Open Command Palette (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={13} className="text-slate-500 group-hover:text-cyan-400 transition" />
            <span className="search-placeholder truncate">Search commands, findings, targets...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-950 rounded border border-slate-800 shrink-0">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Status Indicators & Quick Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Active Target Indicator */}
        {selectedTarget && (
          <div
            onClick={() => onNavigateTab("targets")}
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer max-w-[160px] truncate"
            title={`Active Target: ${selectedTarget.primary_url}`}
          >
            <TargetIcon size={12} className="text-cyan-400 shrink-0" />
            <span className="truncate font-mono">{selectedTarget.name || selectedTarget.primary_url}</span>
          </div>
        )}

        {/* Running AI Mentor Task Indicator */}
        {hasRunningAiTask && (
          <div
            onClick={() => onNavigateTab("mentor")}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 shadow-sm cursor-pointer hover:bg-cyan-900/60 transition"
            title="AI Mentor generating response in background. Click to view."
          >
            <Bot size={12} className="animate-pulse text-cyan-400" />
            <span className="font-medium hidden sm:inline">AI Generating...</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelActiveAiTask();
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded"
              title="Cancel background AI generation"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* AI Answer Ready Banner */}
        {isAiAnswerReady && !hasRunningAiTask && (
          <div
            onClick={() => {
              onNavigateTab("mentor");
              onDismissAiNotification();
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 cursor-pointer hover:bg-emerald-900/60 transition animate-in fade-in"
            title="AI Mentor answer ready! Click to jump to conversation."
          >
            <Sparkles size={12} className="text-emerald-400" />
            <span className="font-semibold hidden sm:inline">Answer Ready</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissAiNotification();
              }}
              className="p-0.5 text-slate-400 hover:text-white rounded"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* Workspace Layout Preset Selector */}
        {onSelectPreset && (
          <select
            value={workspacePreset || "default"}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="hidden xl:inline-block px-2 py-0.5 text-[11px] rounded bg-slate-900 border border-slate-800 text-slate-300 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
            title="Select Workspace Preset"
          >
            <option value="default">⚡ Default</option>
            <option value="compact">📐 Compact</option>
            <option value="analyst">🔬 Analyst</option>
            <option value="pentest">🛡️ Pentest</option>
            <option value="api">🌐 API Test</option>
            <option value="learning">🎓 Learning</option>
          </select>
        )}

        {/* Quick Theme Switch */}
        <Tooltip content="Toggle Theme (Dark / Light)" position="bottom">
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition"
            aria-label="Toggle theme"
          >
            {currentTheme === "arctic" || currentTheme === "github_light" ? (
              <Moon size={15} />
            ) : (
              <Sun size={15} />
            )}
          </button>
        </Tooltip>

        {/* Appearance & Personalization */}
        <Tooltip content="Appearance & Theme Studio" position="bottom">
          <button
            onClick={() => onNavigateTab("appearance")}
            className={`p-1.5 rounded-md transition ${
              activeTab === "appearance"
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            aria-label="Appearance settings"
          >
            <Palette size={15} />
          </button>
        </Tooltip>

        {/* Audit Log Modal Trigger */}
        <Tooltip content="System Audit Log" position="bottom">
          <button
            onClick={onOpenAuditLogs}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition hidden sm:inline-flex"
            aria-label="System audit log"
          >
            <History size={15} />
          </button>
        </Tooltip>

        {/* Shortcuts Cheat Sheet */}
        <Tooltip content="Keyboard Shortcuts (?)" position="bottom">
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts Cheat Sheet (Press ? or Ctrl+/)"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition hidden sm:inline-flex"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={15} />
          </button>
        </Tooltip>

        {/* Emergency Stop Button */}
        <Tooltip content="Halt all background scans and active probes (Ctrl+Shift+E)" position="bottom">
          <button
            onClick={onEmergencyStop}
            className="px-2 py-1 rounded text-[11px] font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 transition flex items-center gap-1 active:scale-[0.98]"
            title="Emergency Stop"
          >
            <AlertOctagon size={12} className="text-rose-400" />
            <span>Emergency Stop</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
};

export default AppTopNav;
