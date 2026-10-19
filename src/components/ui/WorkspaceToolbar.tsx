import React from "react";
import {
  LayoutGrid,
  Maximize2,
  Sliders,
  PanelLeft,
  Bot,
  RotateCcw,
} from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { WorkspacePreset } from "../../types";

interface WorkspaceToolbarProps {
  onOpenAiDrawer?: () => void;
  onOpenControlsDrawer?: () => void;
  className?: string;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  onOpenAiDrawer,
  onOpenControlsDrawer,
  className = "",
}) => {
  const {
    minimizedPanels,
    restorePanel,
    preset,
    setPreset,
    density,
    setDensity,
    isSidebarCollapsed,
    toggleSidebar,
    resetWorkspaceLayout,
  } = useWorkspace();

  return (
    <div
      className={`workspace-toolbar ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 14px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        minHeight: "36px",
        gap: "10px",
        boxSizing: "border-box",
        overflowX: "auto",
      }}
    >
      {/* Left: Sidebar Toggle & Minimized Panels Dock Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, overflowX: "auto" }}>
        {/* Toggle Sidebar Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          className={`workspace-toolbar-btn ${isSidebarCollapsed ? "active" : ""}`}
        >
          <PanelLeft size={13} />
          <span style={{ fontSize: "11px" }}>{isSidebarCollapsed ? "Expand" : "Collapse"}</span>
        </button>

        {/* Minimized Panel Pills */}
        {minimizedPanels.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "8px", borderLeft: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "10px", textTransform: "uppercase", fontFamily: "var(--font-mono, monospace)", color: "var(--text-dim)", letterSpacing: "0.05em" }}>
              Docked ({minimizedPanels.length}):
            </span>
            {minimizedPanels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => restorePanel(panel.id)}
                title={`Click to restore ${panel.title}`}
                className="workspace-toolbar-btn"
                style={{ fontSize: "11px", padding: "3px 8px" }}
              >
                <Maximize2 size={11} style={{ color: "var(--accent-cyan)" }} />
                <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{panel.title}</span>
                <span style={{ fontSize: "9px", color: "var(--accent-cyan)", fontFamily: "monospace" }}>Restore</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Layout Preset, Density, and Workspace Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {/* Quick AI Floating Assistant Trigger */}
        {onOpenAiDrawer && (
          <button
            type="button"
            onClick={onOpenAiDrawer}
            title="Summon Quick AI Mentor Assistant Drawer"
            className="workspace-toolbar-btn"
            style={{
              backgroundColor: "rgba(6, 182, 212, 0.12)",
              color: "var(--accent-cyan)",
              borderColor: "rgba(6, 182, 212, 0.35)",
            }}
          >
            <Bot size={13} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Quick AI</span>
          </button>
        )}

        {/* Density Selector */}
        <div className="workspace-density-group">
          <button
            type="button"
            onClick={() => setDensity("compact")}
            className={`workspace-density-btn ${density === "compact" ? "active" : ""}`}
            title="Compact high-density view"
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setDensity("normal")}
            className={`workspace-density-btn ${density === "normal" ? "active" : ""}`}
            title="Balanced comfortable view"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setDensity("spacious")}
            className={`workspace-density-btn ${density === "spacious" ? "active" : ""}`}
            title="Spacious learning & presentation view"
          >
            Spacious
          </button>
        </div>

        {/* Workspace Preset Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <LayoutGrid size={13} style={{ color: "var(--text-dim)" }} />
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as WorkspacePreset)}
            aria-label="Workspace Layout Preset"
            className="workspace-select"
            title="Select workspace layout preset"
          >
            <option value="default">⚡ Default Workspace</option>
            <option value="compact">📐 Compact IDE</option>
            <option value="analyst">🔬 Security Analyst</option>
            <option value="pentest">🛡️ Pentest Console</option>
            <option value="api">🌐 API Security</option>
            <option value="learning">🎓 Cyber Academy</option>
          </select>
        </div>

        {/* Workspace Customization Drawer Trigger */}
        {onOpenControlsDrawer && (
          <button
            type="button"
            onClick={onOpenControlsDrawer}
            title="Open Workspace Panels & Preferences Drawer"
            className="workspace-toolbar-btn"
          >
            <Sliders size={12} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: "11px" }}>Customize</span>
          </button>
        )}

        {/* Reset Workspace Layout */}
        <button
          type="button"
          onClick={resetWorkspaceLayout}
          title="Reset all panels, tabs, and drawers to factory default"
          className="icon-btn-subtle"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
};
