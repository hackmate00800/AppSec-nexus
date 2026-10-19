import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface ResizableSplitPaneProps {
  primaryPane: React.ReactNode;
  secondaryPane: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  initialRatio?: number; // 0.1 to 0.9 (default 0.5)
  minPrimarySize?: number; // px
  minSecondarySize?: number; // px
  persistenceKey?: string; // localStorage key
  primaryTitle?: string;
  secondaryTitle?: string;
  className?: string;
  hideSecondary?: boolean;
}

export const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  primaryPane,
  secondaryPane,
  orientation = "horizontal",
  initialRatio = 0.5,
  minPrimarySize = 250,
  minSecondarySize = 300,
  persistenceKey,
  primaryTitle,
  secondaryTitle,
  className = "",
  hideSecondary = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load persisted split ratio or fallback to initialRatio
  const [ratio, setRatio] = useState<number>(() => {
    if (persistenceKey) {
      const saved = localStorage.getItem(`appsec_split_${persistenceKey}`);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 0.9) {
          return parsed;
        }
      }
    }
    return initialRatio;
  });

  const [isPrimaryCollapsed, setIsPrimaryCollapsed] = useState(false);
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);

  // Persist ratio on change
  useEffect(() => {
    if (persistenceKey) {
      localStorage.setItem(`appsec_split_${persistenceKey}`, ratio.toString());
    }
  }, [ratio, persistenceKey]);

  // Pointer drag handling
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let newRatio = ratio;
      if (orientation === "horizontal") {
        const offset = e.clientX - rect.left;
        const total = rect.width;
        if (total > 0) {
          const rawRatio = offset / total;
          const minPrimaryRatio = minPrimarySize / total;
          const maxPrimaryRatio = 1 - minSecondarySize / total;
          newRatio = Math.max(minPrimaryRatio, Math.min(maxPrimaryRatio, rawRatio));
        }
      } else {
        const offset = e.clientY - rect.top;
        const total = rect.height;
        if (total > 0) {
          const rawRatio = offset / total;
          const minPrimaryRatio = minPrimarySize / total;
          const maxPrimaryRatio = 1 - minSecondarySize / total;
          newRatio = Math.max(minPrimaryRatio, Math.min(maxPrimaryRatio, rawRatio));
        }
      }

      setRatio(newRatio);
      setIsPrimaryCollapsed(false);
      setIsSecondaryCollapsed(false);
    },
    [isDragging, orientation, minPrimarySize, minSecondarySize, ratio]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        setIsDragging(false);
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    },
    [isDragging]
  );

  // Keyboard navigation for divider handle accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.05;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setRatio((prev) => Math.max(0.15, prev - step));
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setRatio((prev) => Math.min(0.85, prev + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setRatio(0.2);
    } else if (e.key === "End") {
      e.preventDefault();
      setRatio(0.8);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setRatio(0.5);
    }
  };

  const resetSplit = () => {
    setRatio(initialRatio);
    setIsPrimaryCollapsed(false);
    setIsSecondaryCollapsed(false);
  };

  if (hideSecondary) {
    return (
      <div className={`w-full h-full ${className}`}>
        {primaryPane}
      </div>
    );
  }

  // Calculate actual flex/percentage values based on collapse state
  let primaryStyle: React.CSSProperties = { flex: ratio };
  let secondaryStyle: React.CSSProperties = { flex: 1 - ratio };

  if (isPrimaryCollapsed) {
    primaryStyle = { display: "none" };
    secondaryStyle = { flex: 1 };
  } else if (isSecondaryCollapsed) {
    primaryStyle = { flex: 1 };
    secondaryStyle = { display: "none" };
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative flex w-full h-full overflow-hidden select-none ${
        orientation === "horizontal" ? "flex-row" : "flex-col"
      } ${className}`}
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        flexDirection: orientation === "horizontal" ? "row" : "column",
      }}
    >
      {/* Primary Pane */}
      {!isPrimaryCollapsed && (
        <div
          style={{ ...primaryStyle, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "auto" }}
        >
          {primaryPane}
        </div>
      )}

      {/* Primary Docked Pill (when collapsed) */}
      {isPrimaryCollapsed && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "var(--bg-secondary)", borderRight: "1px solid var(--border-color)" }}>
          <button
            onClick={() => setIsPrimaryCollapsed(false)}
            title={`Restore ${primaryTitle || "Left Panel"}`}
            className="btn btn-secondary"
            style={{ fontSize: "11px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <ChevronRight size={14} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {primaryTitle || "Panel"}
            </span>
          </button>
        </div>
      )}

      {/* Resizable Divider Handle */}
      {!isPrimaryCollapsed && !isSecondaryCollapsed && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation={orientation}
          aria-valuenow={Math.round(ratio * 100)}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          onDoubleClick={resetSplit}
          title="Drag to resize panel, double-click to reset, or use arrow keys"
          className="split-pane-divider"
          style={{
            width: orientation === "horizontal" ? "6px" : "100%",
            height: orientation === "horizontal" ? "100%" : "6px",
            cursor: orientation === "horizontal" ? "col-resize" : "row-resize",
            backgroundColor: isDragging ? "var(--accent-cyan)" : "var(--border-color)",
            position: "relative",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            outline: "none",
          }}
        >
          {/* Subtle line indicator */}
          <div
            style={{
              width: orientation === "horizontal" ? "2px" : "24px",
              height: orientation === "horizontal" ? "24px" : "2px",
              borderRadius: "9999px",
              backgroundColor: "var(--text-dim)",
            }}
          />
        </div>
      )}

      {/* Secondary Docked Pill (when collapsed) */}
      {isSecondaryCollapsed && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-color)" }}>
          <button
            onClick={() => setIsSecondaryCollapsed(false)}
            title={`Restore ${secondaryTitle || "Right Panel"}`}
            className="btn btn-secondary"
            style={{ fontSize: "11px", padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <ChevronLeft size={14} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {secondaryTitle || "Inspector"}
            </span>
          </button>
        </div>
      )}

      {/* Secondary Pane */}
      {!isSecondaryCollapsed && (
        <div
          style={{ ...secondaryStyle, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "auto" }}
        >
          {secondaryPane}
        </div>
      )}
    </div>
  );
};
