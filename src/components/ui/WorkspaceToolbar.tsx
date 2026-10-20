import React from "react";
import {
  LayoutGrid,
  Maximize2,
  Sliders,
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
      {/* Left: Minimized Panels Dock Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, overflowX: "auto" }}>
        {/* Minimized Panel Pills */}
        {minimizedPanels.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 500 }}>
              AppSec Workspace
            </span>
          </div>
        )}
      </div>

      {/* Center & Right Controls: Preset, Density, AI Copilot & Reset */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {/* Layout Presets Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <LayoutGrid size={13} style={{ color: "var(--text-dim)" }} />
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as WorkspacePreset)}
            aria-label="Workspace Layout Preset"
            style={{
              padding: "3px 8px",
              fontSize: "11px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              borderRadius: "4px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="default">Default Multi-Pane</option>
            <option value="triage_focused">Triage Focused</option>
            <option value="code_analysis">Code Analysis</option>
            <option value="minimal">Minimal Single-Pane</option>
            <option value="dual_view">Dual View</option>
          </select>
        </div>

        {/* Density Toggle Buttons */}
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "1px" }}>
          <button
            type="button"
            onClick={() => setDensity("compact")}
            title="Compact high-density view for maximum information visibility"
            className={`workspace-toolbar-btn ${density === "compact" ? "active" : ""}`}
            style={{ padding: "2px 7px", fontSize: "10px", borderRadius: "3px", height: "22px" }}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setDensity("normal")}
            title="Balanced comfortable view with generous line spacing"
            className={`workspace-toolbar-btn ${density === "normal" ? "active" : ""}`}
            style={{ padding: "2px 7px", fontSize: "10px", borderRadius: "3px", height: "22px" }}
          >
            Comfortable
          </button>
        </div>

        {/* AI Mentor Drawer Quick Access */}
        {onOpenAiDrawer && (
          <button
            type="button"
            onClick={onOpenAiDrawer}
            title="Open AI Mentor Sliding Panel"
            className="workspace-toolbar-btn"
            style={{ fontSize: "11px", padding: "3px 8px" }}
          >
            <Bot size={13} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: "11px" }}>AI Mentor</span>
          </button>
        )}

        {/* Advanced Layout Drawer */}
        {onOpenControlsDrawer && (
          <button
            type="button"
            onClick={onOpenControlsDrawer}
            title="Configure Panels & Docking"
            className="workspace-toolbar-btn"
            style={{ fontSize: "11px", padding: "3px 8px" }}
          >
            <Sliders size={13} />
            <span style={{ fontSize: "11px" }}>Panels</span>
          </button>
        )}

        {/* Reset Layout to Factory Defaults */}
        <button
          type="button"
          onClick={resetWorkspaceLayout}
          title="Reset Workspace Panes to Default"
          className="workspace-toolbar-btn"
          style={{ fontSize: "11px", padding: "3px 8px", color: "var(--text-dim)" }}
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </div>
  );
};
