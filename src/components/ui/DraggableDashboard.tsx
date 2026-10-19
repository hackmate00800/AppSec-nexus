import React, { useState, useEffect, useCallback } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  EyeOff,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  Pin,
  Maximize2,
  Minimize2,
} from "lucide-react";

export interface DashboardWidget {
  id: string;
  title: string;
  description?: string;
  defaultColSpan?: number; // 1 to 12
  render: () => React.ReactNode;
}

interface DraggableDashboardProps {
  widgets: DashboardWidget[];
  storageKey?: string;
  className?: string;
}

export const DraggableDashboard: React.FC<DraggableDashboardProps> = ({
  widgets,
  storageKey = "appsec_dashboard_layout",
  className = "",
}) => {
  // Load saved order and visibility
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_order`);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        const widgetIds = new Set(widgets.map((w) => w.id));
        const filtered = parsed.filter((id) => widgetIds.has(id));
        const missing = widgets.map((w) => w.id).filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
      }
    } catch {
      // fallback
    }
    return widgets.map((w) => w.id);
  });

  const [collapsedWidgets, setCollapsedWidgets] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_collapsed`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const [hiddenWidgets, setHiddenWidgets] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_hidden`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const [pinnedWidgets, setPinnedWidgets] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_pinned`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {};
  });

  const [maximizedWidgetId, setMaximizedWidgetId] = useState<string | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Persist order
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_order`, JSON.stringify(widgetOrder));
    } catch {
      // ignore
    }
  }, [widgetOrder, storageKey]);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_collapsed`, JSON.stringify(collapsedWidgets));
    } catch {
      // ignore
    }
  }, [collapsedWidgets, storageKey]);

  // Persist hidden state
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_hidden`, JSON.stringify(hiddenWidgets));
    } catch {
      // ignore
    }
  }, [hiddenWidgets, storageKey]);

  // Persist pinned state
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_pinned`, JSON.stringify(pinnedWidgets));
    } catch {
      // ignore
    }
  }, [pinnedWidgets, storageKey]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedWidgets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setHiddenWidgets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedWidgets((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      return next;
    });
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setMaximizedWidgetId((prev) => (prev === id ? null : id));
  }, []);

  // Keyboard accessible reordering
  const moveWidget = useCallback((id: string, direction: "up" | "down") => {
    setWidgetOrder((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setWidgetOrder(widgets.map((w) => w.id));
    setCollapsedWidgets({});
    setHiddenWidgets({});
    setPinnedWidgets({});
    setMaximizedWidgetId(null);
    try {
      localStorage.removeItem(`${storageKey}_order`);
      localStorage.removeItem(`${storageKey}_collapsed`);
      localStorage.removeItem(`${storageKey}_hidden`);
      localStorage.removeItem(`${storageKey}_pinned`);
    } catch {
      // ignore
    }
  }, [widgets, storageKey]);

  // Drag and drop handlers
  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    setWidgetOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggedWidgetId);
      const toIndex = next.indexOf(targetId);
      if (fromIndex >= 0 && toIndex >= 0) {
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggedWidgetId);
      }
      return next;
    });

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  // Map widgets to order: pinned widgets float to top while preserving relative order
  const widgetMap = new Map(widgets.map((w) => [w.id, w]));
  const visibleWidgets = widgetOrder
    .map((id) => widgetMap.get(id))
    .filter((w): w is DashboardWidget => Boolean(w && !hiddenWidgets[w.id]));

  // Separate pinned and unpinned
  const pinnedList = visibleWidgets.filter((w) => pinnedWidgets[w.id]);
  const unpinnedList = visibleWidgets.filter((w) => !pinnedWidgets[w.id]);
  const orderedWidgets = [...pinnedList, ...unpinnedList];

  return (
    <div className={`space-y-4 ${className}`} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 6px",
          color: "var(--text-muted)",
          fontSize: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LayoutGrid size={16} style={{ color: "var(--accent-cyan)" }} />
          <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Interactive Dashboard Layout</span>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            • Drag handles or use Up/Down buttons to reorder
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setShowCustomizeModal((v) => !v)}
            className="btn btn-secondary"
            style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Eye size={13} style={{ color: "var(--accent-cyan)" }} />
            <span>Customize ({orderedWidgets.length}/{widgets.length})</span>
          </button>
          <button
            onClick={resetLayout}
            title="Reset layout to default order"
            className="icon-btn-subtle"
            style={{ fontSize: "11px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Customize Drawer Modal */}
      {showCustomizeModal && (
        <div
          className="card"
          style={{
            padding: "14px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "8px",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
              Widget Visibility & Arrangement
            </span>
            <button
              onClick={() => setShowCustomizeModal(false)}
              className="icon-btn-subtle"
              style={{ fontSize: "12px", padding: "2px 6px" }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "8px",
            }}
          >
            {widgets.map((w) => {
              const isHidden = hiddenWidgets[w.id];
              return (
                <button
                  key={w.id}
                  onClick={() => toggleVisibility(w.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    border: "1px solid",
                    textAlign: "left",
                    cursor: "pointer",
                    background: isHidden ? "var(--bg-primary)" : "var(--accent-primary-subtle)",
                    borderColor: isHidden ? "var(--border-color)" : "var(--accent-cyan)",
                    color: isHidden ? "var(--text-dim)" : "var(--text-main)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>
                    {w.title}
                  </span>
                  {isHidden ? (
                    <EyeOff size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                  ) : (
                    <Eye size={14} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reorderable Widgets Container */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {orderedWidgets.map((w, index) => {
          const isCollapsed = Boolean(collapsedWidgets[w.id]);
          const isPinned = Boolean(pinnedWidgets[w.id]);
          const isMaximized = maximizedWidgetId === w.id;
          const isDraggingThis = draggedWidgetId === w.id;
          const isDragOverThis = dragOverWidgetId === w.id;

          // If a widget is maximized and this isn't it, hide other widgets
          if (maximizedWidgetId && !isMaximized) {
            return null;
          }

          return (
            <div
              key={w.id}
              onDragOver={(e) => handleDragOver(w.id, e)}
              onDrop={(e) => handleDrop(w.id, e)}
              className="dashboard-widget-card"
              style={{
                opacity: isDraggingThis ? 0.4 : 1,
                borderColor: isPinned
                  ? "var(--accent-cyan)"
                  : isDragOverThis
                  ? "var(--accent-cyan)"
                  : isDraggingThis
                  ? "var(--accent-cyan)"
                  : "var(--border-color)",
                boxShadow: isPinned
                  ? "0 0 12px rgba(6, 182, 212, 0.18)"
                  : isDragOverThis
                  ? "0 0 16px rgba(6, 182, 212, 0.25)"
                  : "var(--shadow-sm)",
                transition: "all 0.15s ease",
                border: "1px solid",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              {/* Widget Header with Drag Handle, Keyboard Reorder & Pin */}
              <div
                className="dashboard-widget-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  background: isPinned ? "rgba(6, 182, 212, 0.08)" : "var(--bg-secondary)",
                  borderBottom: isCollapsed ? "none" : "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(w.id, e)}
                    onDragEnd={handleDragEnd}
                    title="Drag to reorder card"
                    style={{
                      cursor: "grab",
                      padding: "2px",
                      marginLeft: "-4px",
                      color: "var(--text-dim)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <GripVertical size={16} />
                  </div>

                  {isPinned && (
                    <span title="Pinned card" style={{ display: "inline-flex", alignItems: "center" }}>
                      <Pin size={12} color="var(--accent-cyan)" style={{ fill: "var(--accent-cyan)" }} />
                    </span>
                  )}

                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                    {w.title}
                  </span>
                  {w.description && (
                    <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                      • {w.description}
                    </span>
                  )}
                </div>

                {/* Card Controls: Move Up, Move Down, Pin, Maximize, Collapse */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {/* Keyboard Reordering Controls */}
                  <button
                    onClick={() => moveWidget(w.id, "up")}
                    disabled={index === 0}
                    title="Move card up"
                    aria-label={`Move ${w.title} up`}
                    className="icon-btn-subtle"
                    style={{
                      padding: "2px 4px",
                      color: index === 0 ? "var(--text-dim)" : "var(--text-muted)",
                      opacity: index === 0 ? 0.3 : 1,
                    }}
                  >
                    <ArrowUp size={13} />
                  </button>

                  <button
                    onClick={() => moveWidget(w.id, "down")}
                    disabled={index === orderedWidgets.length - 1}
                    title="Move card down"
                    aria-label={`Move ${w.title} down`}
                    className="icon-btn-subtle"
                    style={{
                      padding: "2px 4px",
                      color: index === orderedWidgets.length - 1 ? "var(--text-dim)" : "var(--text-muted)",
                      opacity: index === orderedWidgets.length - 1 ? 0.3 : 1,
                    }}
                  >
                    <ArrowDown size={13} />
                  </button>

                  {/* Pin Toggle */}
                  <button
                    onClick={() => togglePin(w.id)}
                    title={isPinned ? "Unpin card" : "Pin card to top"}
                    aria-label={isPinned ? `Unpin ${w.title}` : `Pin ${w.title}`}
                    className="icon-btn-subtle"
                    style={{
                      padding: "2px 4px",
                      color: isPinned ? "var(--accent-cyan)" : "var(--text-muted)",
                    }}
                  >
                    <Pin size={13} style={isPinned ? { fill: "var(--accent-cyan)" } : undefined} />
                  </button>

                  {/* Maximize / Restore Toggle */}
                  <button
                    onClick={() => toggleMaximize(w.id)}
                    title={isMaximized ? "Restore card size" : "Maximize card"}
                    aria-label={isMaximized ? `Restore ${w.title}` : `Maximize ${w.title}`}
                    className="icon-btn-subtle"
                    style={{
                      padding: "2px 4px",
                      color: isMaximized ? "var(--accent-cyan)" : "var(--text-muted)",
                    }}
                  >
                    {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>

                  {/* Collapse Toggle */}
                  <button
                    onClick={() => toggleCollapse(w.id)}
                    title={isCollapsed ? "Expand widget" : "Collapse widget"}
                    aria-label={isCollapsed ? `Expand ${w.title}` : `Collapse ${w.title}`}
                    className="icon-btn-subtle"
                    style={{
                      padding: "2px 4px",
                      color: "var(--text-muted)",
                    }}
                  >
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>

              {/* Widget Content Body */}
              {!isCollapsed && (
                <div
                  className="dashboard-widget-content"
                  style={{
                    padding: "16px",
                    background: "var(--bg-card)",
                    maxHeight: isMaximized ? "75vh" : undefined,
                    overflowY: isMaximized ? "auto" : undefined,
                  }}
                >
                  {w.render()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
