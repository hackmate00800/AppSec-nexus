import React, { useEffect, useRef } from "react";

export interface ContextMenuItem {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  requiresAdmin?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  role: "Admin" | "Viewer" | string;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  role,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter items: hide actions requiring Admin if the role is not Admin
  const visibleItems = items.filter((item) => {
    if (item.requiresAdmin && role !== "Admin") {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (visibleItems.length === 0) {
    return null;
  }

  // Position adjustments to prevent overflowing window bounds
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Finding context menu"
      className="finding-context-menu"
      style={{
        position: "fixed",
        top: Math.max(10, adjustedY),
        left: Math.max(10, adjustedX),
        zIndex: 9999,
        background: "var(--bg-secondary, #1b2028)",
        border: "1px solid var(--border-color, #2d3748)",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
        padding: "6px",
        minWidth: "170px",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      <div
        style={{
          padding: "4px 8px",
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "var(--text-muted, #718096)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          borderBottom: "1px solid var(--border-color, #2d3748)",
          marginBottom: "4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Actions</span>
        <span
          style={{
            fontSize: "0.62rem",
            color: role === "Admin" ? "var(--accent-emerald, #10b981)" : "var(--accent-cyan, #06b6d4)",
            textTransform: "none",
          }}
        >
          {role}
        </span>
      </div>

      {visibleItems.map((item, index) => (
        <button
          key={item.id || `${item.label}-${index}`}
          role="menuitem"
          disabled={item.disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
          style={{
            background: "none",
            border: "none",
            borderRadius: "5px",
            padding: "6px 8px",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.78rem",
            color: item.danger
              ? "var(--accent-rose, #f43f5e)"
              : "var(--text-main, #f1f5f9)",
            cursor: item.disabled ? "not-allowed" : "pointer",
            opacity: item.disabled ? 0.5 : 1,
            transition: "background 0.15s ease",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.background = "var(--bg-tertiary, #283141)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          {item.icon && (
            <span style={{ display: "flex", alignItems: "center" }}>
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
