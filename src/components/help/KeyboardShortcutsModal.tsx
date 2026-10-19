import React, { useState, useMemo, useEffect } from "react";
import {
  Keyboard,
  X,
  Search,
  Navigation,
  Sliders,
  Sparkles,
} from "lucide-react";

export interface ShortcutItem {
  keyCombo: string[];
  description: string;
  category: "Navigation" | "Workspace & Layout" | "Actions & Security";
  tag?: string;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // Navigation
  {
    keyCombo: ["Ctrl", "1"],
    description: "Switch to Security Analytics & Posture",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "2"],
    description: "Switch to Target & Scope Configuration",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "3"],
    description: "Switch to Scan Console & Execution Logs",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "4"],
    description: "Switch to Universal Orchestration Hub",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "5"],
    description: "Switch to Crawler & Discovered Endpoints",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "6"],
    description: "Switch to Security Tools & Plugins Hub",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "7"],
    description: "Switch to Host & Mobile Security Audit",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "8"],
    description: "Switch to Vulnerability Findings & Triage",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "9"],
    description: "Switch to Local AI Mentor & Cyber Academy",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "0"],
    description: "Switch to Cyber Academy Curriculum & Labs",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", ","],
    description: "Switch to Appearance & Personalization Settings",
    category: "Navigation",
  },
  {
    keyCombo: ["Ctrl", "Alt", "B"],
    description: "Switch to Burp Suite Proxy & Repeater Workbench",
    category: "Navigation",
  },

  // Workspace & Layout
  {
    keyCombo: ["Ctrl", "B"],
    description: "Toggle Navigation Sidebar (Collapse / Expand)",
    category: "Workspace & Layout",
    tag: "Essential",
  },
  {
    keyCombo: ["Ctrl", "M"],
    description: "Summon / Toggle Quick AI Assistant Drawer",
    category: "Workspace & Layout",
    tag: "AI",
  },
  {
    keyCombo: ["Ctrl", "Shift", "D"],
    description: "Open Workspace Panels & Layout Preferences Drawer",
    category: "Workspace & Layout",
  },
  {
    keyCombo: ["Ctrl", "Shift", "T"],
    description: "Restore Most Recently Closed Workspace Tab",
    category: "Workspace & Layout",
  },
  {
    keyCombo: ["Ctrl", "Shift", "W"],
    description: "Close Active Workspace Tab",
    category: "Workspace & Layout",
  },
  {
    keyCombo: ["Ctrl", "Shift", "R"],
    description: "Reset Workspace Layout, Tabs & Drawers to Default",
    category: "Workspace & Layout",
  },

  // Actions & Security
  {
    keyCombo: ["Ctrl", "K"],
    description: "Open Global Command Palette & Fuzzy Search",
    category: "Actions & Security",
    tag: "Search",
  },
  {
    keyCombo: ["Ctrl", "H"],
    description: "Open AppSec Nexus Help Center & Knowledgebase",
    category: "Actions & Security",
  },
  {
    keyCombo: ["F1"],
    description: "Summon Contextual Help & Guidance Procedures",
    category: "Actions & Security",
  },
  {
    keyCombo: ["Ctrl", "Shift", "E"],
    description: "Emergency Stop: Immediately abort all running scans",
    category: "Actions & Security",
    tag: "Danger",
  },
  {
    keyCombo: ["Ctrl", "Shift", "S"],
    description: "Trigger Quick Security Scan on selected target",
    category: "Actions & Security",
  },
  {
    keyCombo: ["Ctrl", "Shift", "N"],
    description: "Create New Authorized Security Target",
    category: "Actions & Security",
  },
  {
    keyCombo: ["Ctrl", "Shift", "P"],
    description: "Launch Interactive Product Tour & Guide",
    category: "Actions & Security",
  },
  {
    keyCombo: ["?"],
    description: "Show this Keyboard Shortcuts cheat sheet",
    category: "Actions & Security",
    tag: "Help",
  },
  {
    keyCombo: ["Esc"],
    description: "Close any active modal, sliding drawer, or palette",
    category: "Actions & Security",
  },
];

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState("");

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter shortcuts based on query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SHORTCUTS_DATA;
    return SHORTCUTS_DATA.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.keyCombo.some((k) => k.toLowerCase().includes(q))
    );
  }, [search]);

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, ShortcutItem[]>();
    for (const item of filtered) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "85vh",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 45px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--text-main)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "var(--accent-primary-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-cyan)",
              }}
            >
              <Keyboard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                AppSec Nexus Keyboard Shortcuts
              </h2>
              <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                Speed up penetration testing, triage, and navigation across the platform
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="icon-btn-subtle"
            title="Close (Esc)"
            style={{ padding: "6px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-primary)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Search size={15} style={{ color: "var(--text-dim)" }} />
          <input
            type="text"
            placeholder="Search shortcuts (e.g., 'sidebar', 'ctrl+b', 'findings', 'scan')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-main)",
              fontSize: "0.85rem",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="icon-btn-subtle"
              style={{ padding: "2px 6px", fontSize: "11px" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Body / Shortcuts List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {Array.from(categories.entries()).map(([category, items]) => (
            <div key={category}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent-cyan)",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {category === "Navigation" && <Navigation size={13} />}
                {category === "Workspace & Layout" && <Sliders size={13} />}
                {category === "Actions & Security" && <Sparkles size={13} />}
                <span>{category}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--text-dim)",
                    fontWeight: 500,
                  }}
                >
                  ({items.length})
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "8px",
                }}
              >
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      gap: "10px",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-main)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.description}
                      </span>
                      {item.tag && (
                        <span
                          style={{
                            fontSize: "0.64rem",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            backgroundColor:
                              item.tag === "Danger"
                                ? "rgba(244, 63, 94, 0.2)"
                                : item.tag === "AI"
                                ? "rgba(6, 182, 212, 0.2)"
                                : "rgba(255, 255, 255, 0.08)",
                            color:
                              item.tag === "Danger"
                                ? "var(--accent-rose)"
                                : item.tag === "AI"
                                ? "var(--accent-cyan)"
                                : "var(--text-muted)",
                          }}
                        >
                          {item.tag}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0,
                      }}
                    >
                      {item.keyCombo.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && (
                            <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>+</span>
                          )}
                          <kbd
                            style={{
                              padding: "2px 7px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              fontFamily: "var(--font-mono, monospace)",
                              backgroundColor: "var(--bg-card)",
                              color: "var(--accent-cyan)",
                              border: "1px solid var(--border-accent)",
                              borderRadius: "4px",
                              boxShadow: "0 2px 0 rgba(0, 0, 0, 0.4)",
                            }}
                          >
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "36px 0",
                color: "var(--text-dim)",
                fontSize: "0.85rem",
              }}
            >
              No shortcuts found matching &ldquo;{search}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            fontSize: "0.76rem",
            color: "var(--text-dim)",
          }}
        >
          <span>
            Tip: Press <kbd style={{ padding: "1px 5px", borderRadius: "3px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}>?</kbd> anytime to open this cheat sheet.
          </span>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "4px 12px" }}
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
