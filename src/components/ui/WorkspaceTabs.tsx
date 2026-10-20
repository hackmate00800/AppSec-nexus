import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Activity,
  Target as TargetIcon,
  Terminal,
  Cpu,
  Compass,
  Layers,
  Monitor,
  AlertTriangle,
  UploadCloud,
  Sparkles,
  GraduationCap,
  History,
  Palette,
  MoreHorizontal,
  FileCheck,
  Radio,
  ClipboardList,
  Workflow,
  Bot,
} from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";

interface WorkspaceTabsProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  className?: string;
}

interface TabMeta {
  id: string;
  label: string;
  icon: React.ReactNode;
  closable: boolean;
}

const ALL_TABS_META: Record<string, TabMeta> = {
  analytics: {
    id: "analytics",
    label: "Security Analytics",
    icon: <Activity size={14} />,
    closable: false, // Essential tab
  },
  targets: {
    id: "targets",
    label: "Target & Scope",
    icon: <TargetIcon size={14} />,
    closable: true,
  },
  scanner: {
    id: "scanner",
    label: "Scan Console",
    icon: <Terminal size={14} />,
    closable: true,
  },
  terminal: {
    id: "terminal",
    label: "Multi-Terminal",
    icon: <Terminal size={14} />,
    closable: true,
  },
  orchestration: {
    id: "orchestration",
    label: "Universal Orchestration",
    icon: <Cpu size={14} />,
    closable: true,
  },
  crawler: {
    id: "crawler",
    label: "Crawler & Surface",
    icon: <Compass size={14} />,
    closable: true,
  },
  tools: {
    id: "tools",
    label: "Tools & Plugins",
    icon: <Layers size={14} />,
    closable: true,
  },
  hostmobile: {
    id: "hostmobile",
    label: "Host & Mobile",
    icon: <Monitor size={14} />,
    closable: true,
  },
  findings: {
    id: "findings",
    label: "Findings & Triage",
    icon: <AlertTriangle size={14} />,
    closable: true,
  },
  verificationLab: {
    id: "verificationLab",
    label: "Verification Lab",
    icon: <ShieldCheck size={14} />,
    closable: true,
  },
  issues: {
    id: "issues",
    label: "Issues & Reports",
    icon: <ClipboardList size={14} />,
    closable: true,
  },
  importer: {
    id: "importer",
    label: "Import Reports",
    icon: <UploadCloud size={14} />,
    closable: true,
  },
  mentor: {
    id: "mentor",
    label: "AI Mentor",
    icon: <Sparkles size={14} />,
    closable: true,
  },
  academy: {
    id: "academy",
    label: "Cyber Academy",
    icon: <GraduationCap size={14} />,
    closable: true,
  },
  history: {
    id: "history",
    label: "Audit History",
    icon: <History size={14} />,
    closable: true,
  },
  appearance: {
    id: "appearance",
    label: "Appearance",
    icon: <Palette size={14} />,
    closable: true,
  },
  categoryWorkflow: {
    id: "categoryWorkflow",
    label: "Category Intel",
    icon: <Layers size={14} />,
    closable: true,
  },
  playbooks: {
    id: "playbooks",
    label: "Playbooks",
    icon: <FileCheck size={14} />,
    closable: true,
  },
  burp: {
    id: "burp",
    label: "Burp Suite",
    icon: <Radio size={14} />,
    closable: true,
  },
  methodologies: {
    id: "methodologies",
    label: "Methodology Explorer",
    icon: <Workflow size={14} />,
    closable: true,
  },
  modelLab: {
    id: "modelLab",
    label: "Model Lab (Heretic)",
    icon: <Bot size={14} />,
    closable: true,
  },
};

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({
  activeTab,
  onSelectTab,
  className = "",
}) => {
  const {
    tabOrder,
    closedTabs,
    reorderTabs,
    closeTab,
    reopenTab,
    restoreAllTabs,
    resetTabOrder,
  } = useWorkspace();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showRestoreMenu, setShowRestoreMenu] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Compute visible tabs in user-ordered sequence
  const visibleTabs = tabOrder.filter((id) => !closedTabs.includes(id));
  const hiddenTabs = Object.keys(ALL_TABS_META).filter((id) => closedTabs.includes(id));

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTabIndex(index);
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTabIndex === null || draggedTabIndex === index) return;
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, destIndex: number) => {
    e.preventDefault();
    if (draggedTabIndex !== null && draggedTabIndex !== destIndex) {
      // Find the indices in tabOrder
      const sourceTabId = visibleTabs[draggedTabIndex];
      const destTabId = visibleTabs[destIndex];
      const sourceOrderIndex = tabOrder.indexOf(sourceTabId);
      const destOrderIndex = tabOrder.indexOf(destTabId);
      if (sourceOrderIndex !== -1 && destOrderIndex !== -1) {
        reorderTabs(sourceOrderIndex, destOrderIndex);
      }
    }
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTabIndex(null);
    setDragOverIndex(null);
  };

  // Scroll helpers
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -160, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 160, behavior: "smooth" });
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Workspace Tabs"
      className={`workspace-tabs ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "var(--bg-primary)",
        borderBottom: "1px solid var(--border-color)",
        padding: "0 10px",
        height: "36px",
        minHeight: "36px",
        position: "relative",
        zIndex: 10,
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={scrollLeft}
        title="Scroll tabs left"
        className="icon-btn-subtle"
        style={{ flexShrink: 0 }}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="workspace-tabs-scroll"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          overflowX: "auto",
          flex: 1,
          scrollbarWidth: "none",
          height: "100%",
          padding: "0 4px",
        }}
      >
        {visibleTabs.map((tabId, index) => {
          const meta = ALL_TABS_META[tabId] || {
            id: tabId,
            label: tabId,
            icon: <Activity size={14} />,
            closable: true,
          };
          const isActive = activeTab === tabId;
          const isDragging = draggedTabIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={tabId}
              role="tab"
              aria-selected={isActive}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectTab(tabId)}
              title={`${meta.label} (Drag to reorder)`}
              className={`workspace-tab ${isActive ? "active" : ""}`}
              style={{
                opacity: isDragging ? 0.4 : 1,
                transform: isDragOver ? "scale(1.02)" : "none",
              }}
            >
              {/* Tab Icon */}
              <span style={{ display: "inline-flex", alignItems: "center", color: isActive ? "var(--accent-cyan)" : "var(--text-dim)", flexShrink: 0 }}>
                {meta.icon}
              </span>

              {/* Tab Label */}
              <span style={{ fontSize: "11px", fontWeight: isActive ? 600 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>
                {meta.label}
              </span>

              {/* Tab Close Button */}
              {meta.closable && (
                <button
                  type="button"
                  aria-label={`Close ${meta.label} tab`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tabId, activeTab, onSelectTab);
                  }}
                  className="workspace-tab-close"
                  title={`Close ${meta.label} tab`}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={scrollRight}
        title="Scroll tabs right"
        className="icon-btn-subtle"
        style={{ flexShrink: 0 }}
      >
        <ChevronRight size={14} />
      </button>

      {/* Add / Restore Closed Tabs Button */}
      <div style={{ position: "relative", flexShrink: 0, marginLeft: "4px" }}>
        <button
          type="button"
          onClick={() => setShowRestoreMenu((prev) => !prev)}
          title="Open or restore hidden tabs"
          className="icon-btn-subtle"
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 6px" }}
        >
          <Plus size={13} />
          {hiddenTabs.length > 0 && (
            <span style={{
              fontSize: "10px",
              padding: "1px 5px",
              borderRadius: "9999px",
              backgroundColor: "rgba(6, 182, 212, 0.2)",
              color: "var(--accent-cyan)",
              fontWeight: 600,
              fontFamily: "monospace",
            }}>
              {hiddenTabs.length}
            </span>
          )}
        </button>

        {/* Restore Tabs Dropdown Menu */}
        {showRestoreMenu && (
          <div
            className="workspace-dropdown-menu"
            style={{ right: 0, top: "100%", marginTop: "4px", width: "210px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-dim)",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span>Tabs & Workspaces</span>
              <button
                onClick={() => {
                  restoreAllTabs();
                  setShowRestoreMenu(false);
                }}
                style={{ fontSize: "10px", color: "var(--accent-cyan)", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                title="Restore all closed tabs"
              >
                <RotateCcw size={10} /> Restore All
              </button>
            </div>

            <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px 0" }}>
              {hiddenTabs.length === 0 ? (
                <div style={{ padding: "8px 12px", fontSize: "11px", color: "var(--text-dim)", fontStyle: "italic", textAlign: "center" }}>
                  All workspace tabs are open
                </div>
              ) : (
                hiddenTabs.map((id) => {
                  const meta = ALL_TABS_META[id];
                  if (!meta) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        reopenTab(id, onSelectTab);
                        setShowRestoreMenu(false);
                      }}
                      className="workspace-dropdown-item"
                    >
                      <span style={{ color: "var(--text-dim)", display: "flex", alignItems: "center" }}>{meta.icon}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.label}</span>
                      <Plus size={12} style={{ color: "var(--text-dim)" }} />
                    </button>
                  );
                })
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "4px", padding: "4px 8px" }}>
              <button
                type="button"
                onClick={() => {
                  resetTabOrder();
                  setShowRestoreMenu(false);
                }}
                style={{ width: "100%", padding: "4px 8px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center", borderRadius: "4px", background: "transparent", border: "none", cursor: "pointer" }}
              >
                Reset Tab Order to Default
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overflow Menu Button */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setShowOverflowMenu((prev) => !prev)}
          title="All open tabs"
          className="icon-btn-subtle"
        >
          <MoreHorizontal size={14} />
        </button>

        {showOverflowMenu && (
          <div
            className="workspace-dropdown-menu"
            style={{ right: 0, top: "100%", marginTop: "4px", width: "190px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "6px 12px",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-dim)",
              borderBottom: "1px solid var(--border-color)",
            }}>
              Active Tabs ({visibleTabs.length})
            </div>
            <div style={{ maxHeight: "240px", overflowY: "auto", padding: "4px 0" }}>
              {visibleTabs.map((id) => {
                const meta = ALL_TABS_META[id] || { id, label: id, icon: null };
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onSelectTab(id);
                      setShowOverflowMenu(false);
                    }}
                    className={`workspace-dropdown-item ${isActive ? "active" : ""}`}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}>{meta.icon}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
