import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

export interface SlidingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  position?: "right" | "left" | "bottom";
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  storageKey?: string;
}

export const SlidingDrawer: React.FC<SlidingDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  position = "right",
  initialWidth = 500,
  minWidth = 320,
  maxWidth = 960,
  resizable = true,
  isMaximized = false,
  onToggleMaximize,
  actions,
  children,
  className = "",
  storageKey,
}) => {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`appsec_drawer_${storageKey}`);
        if (saved) {
          const val = parseInt(saved, 10);
          if (!isNaN(val) && val >= minWidth && val <= maxWidth) return val;
        }
      } catch {
        // fallback
      }
    }
    return initialWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync width persistence
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(`appsec_drawer_${storageKey}`, width.toString());
      } catch {
        // ignore
      }
    }
  }, [width, storageKey]);

  // Escape key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Resize pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return;
      if (position === "right") {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
        setWidth(newWidth);
      } else if (position === "left") {
        const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
        setWidth(newWidth);
      }
    },
    [isResizing, position, minWidth, maxWidth]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isResizing) {
        setIsResizing(false);
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    },
    [isResizing]
  );

  if (!isOpen) return null;

  const effectiveWidth = isMaximized ? "100vw" : `${width}px`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Backdrop overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(2px)",
          transition: "opacity 0.2s ease",
          pointerEvents: "auto",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Workspace Drawer"}
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          right: position === "right" ? 0 : "auto",
          left: position === "left" ? 0 : "auto",
          width: effectiveWidth,
          maxWidth: isMaximized ? "100vw" : "94vw",
          backgroundColor: "var(--bg-primary)",
          borderLeft: position === "right" ? "1px solid var(--border-color)" : "none",
          borderRight: position === "left" ? "1px solid var(--border-color)" : "none",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
          transition: "width 0.2s ease-out",
          animation: position === "right" ? "slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)" : "slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 101,
          color: "var(--text-main)",
        }}
        className={className}
      >
        {/* Resize Handle */}
        {resizable && !isMaximized && (
          <div
            onPointerDown={handlePointerDown}
            title="Drag to resize drawer width"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: position === "right" ? "-3px" : "auto",
              right: position === "left" ? "-3px" : "auto",
              width: "6px",
              cursor: "col-resize",
              zIndex: 50,
              backgroundColor: isResizing ? "var(--accent-cyan)" : "transparent",
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isResizing) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(6, 182, 212, 0.4)";
            }}
            onMouseLeave={(e) => {
              if (!isResizing) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          />
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, paddingRight: "8px" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                {subtitle}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            {actions}

            {onToggleMaximize && (
              <button
                type="button"
                onClick={onToggleMaximize}
                title={isMaximized ? "Restore previous size" : "Maximize drawer"}
                className="icon-btn-subtle"
                style={{ padding: "6px" }}
              >
                {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Close drawer (Esc)"
              aria-label="Close drawer"
              className="icon-btn-subtle"
              style={{ padding: "6px" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px" }}>{children}</div>
      </aside>
    </div>
  );
};
