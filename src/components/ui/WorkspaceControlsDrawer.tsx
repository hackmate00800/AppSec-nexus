import React from "react";
import {
  Sliders,
  RotateCcw,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Layers,
  LayoutGrid,
  Sparkles,
  Plus,
} from "lucide-react";
import { SlidingDrawer } from "./SlidingDrawer";
import { useWorkspace } from "../../context/WorkspaceContext";
import { WorkspacePreset, WorkspaceDensity } from "../../types";

interface WorkspaceControlsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onSelectTab: (tabId: string) => void;
}

export const WorkspaceControlsDrawer: React.FC<WorkspaceControlsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const {
    panels,
    togglePanelVisibility,
    minimizePanel,
    restorePanel,
    preset,
    setPreset,
    density,
    setDensity,
    closedTabs,
    reopenTab,
    restoreAllTabs,
    resetWorkspaceLayout,
  } = useWorkspace();

  return (
    <SlidingDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          Workspace Controls & Layout Preferences
        </span>
      }
      subtitle="Customize panels, tabs, split views, density, and presets"
      initialWidth={480}
      storageKey="controls_drawer"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", color: "var(--text-main)" }}>
        {/* Section 1: Workspace Presets */}
        <div>
          <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <LayoutGrid size={14} style={{ color: "var(--accent-cyan)" }} />
            Workspace Presets
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            {[
              { id: "default", label: "⚡ Default", desc: "Balanced workspace" },
              { id: "compact", label: "📐 Compact IDE", desc: "Max screen real estate" },
              { id: "analyst", label: "🔬 Security Analyst", desc: "Triage & inspect findings" },
              { id: "pentest", label: "🛡️ Pentest Console", desc: "Scanning & live network" },
              { id: "api", label: "🌐 API Security", desc: "Crawling & endpoints" },
              { id: "learning", label: "🎓 Cyber Academy", desc: "Visual labs & curriculum" },
            ].map((p) => {
              const isActive = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as WorkspacePreset)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid",
                    textAlign: "left",
                    cursor: "pointer",
                    backgroundColor: isActive ? "var(--accent-primary-subtle)" : "var(--bg-card)",
                    borderColor: isActive ? "var(--accent-cyan)" : "var(--border-color)",
                    color: isActive ? "var(--accent-cyan)" : "var(--text-main)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Density Options */}
        <div>
          <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Layers size={14} style={{ color: "var(--accent-cyan)" }} />
            Display Density
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {(["compact", "normal", "spacious"] as WorkspaceDensity[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "capitalize",
                  textAlign: "center",
                  cursor: "pointer",
                  backgroundColor: density === d ? "var(--accent-primary-subtle)" : "var(--bg-card)",
                  borderColor: density === d ? "var(--accent-cyan)" : "var(--border-color)",
                  color: density === d ? "var(--accent-cyan)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Modular Panel Management */}
        <div>
          <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Sliders size={14} style={{ color: "var(--accent-cyan)" }} />
            Modular Panels & Docks
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.values(panels).map((panel) => (
              <div
                key={panel.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>{panel.title}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    Status: {panel.minimized ? "Minimized to Dock" : panel.maximized ? "Maximized" : panel.visible ? "Visible" : "Hidden"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {/* Toggle Visibility */}
                  <button
                    type="button"
                    onClick={() => togglePanelVisibility(panel.id)}
                    title={panel.visible ? "Hide panel" : "Show panel"}
                    className="icon-btn-subtle"
                    style={{ padding: "6px" }}
                  >
                    {panel.visible ? <Eye size={14} style={{ color: "var(--accent-cyan)" }} /> : <EyeOff size={14} style={{ color: "var(--text-dim)" }} />}
                  </button>

                  {/* Minimize / Restore */}
                  {panel.visible && (
                    <button
                      type="button"
                      onClick={() =>
                        panel.minimized ? restorePanel(panel.id) : minimizePanel(panel.id)
                      }
                      title={panel.minimized ? "Restore from dock" : "Minimize to dock"}
                      className="icon-btn-subtle"
                      style={{ padding: "6px" }}
                    >
                      {panel.minimized ? <Maximize2 size={13} style={{ color: "var(--accent-cyan)" }} /> : <Minimize2 size={13} style={{ color: "var(--text-dim)" }} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Closed / Hidden Tabs Recovery */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkles size={14} style={{ color: "var(--accent-cyan)" }} />
              Tab Management & Recovery
            </h3>
            {closedTabs.length > 0 && (
              <button
                type="button"
                onClick={restoreAllTabs}
                style={{ fontSize: "11px", color: "var(--accent-cyan)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RotateCcw size={10} /> Restore All
              </button>
            )}
          </div>

          {closedTabs.length === 0 ? (
            <div style={{ padding: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "11px", color: "var(--text-dim)", textAlign: "center", fontStyle: "italic" }}>
              All workspace tabs are open and visible in the tab strip.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
              {closedTabs.map((tabId) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => {
                    reopenTab(tabId, onSelectTab);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    fontSize: "12px",
                    color: "var(--text-main)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  <span>{tabId}</span>
                  <Plus size={13} style={{ color: "var(--accent-cyan)" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Reset All Workspace Layout */}
        <div style={{ paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
          <button
            type="button"
            onClick={() => {
              resetWorkspaceLayout();
              onClose();
            }}
            className="btn btn-secondary"
            style={{ width: "100%", padding: "10px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <RotateCcw size={14} />
            Reset Entire Workspace to Factory Default
          </button>
        </div>
      </div>
    </SlidingDrawer>
  );
};
