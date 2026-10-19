import React, { useState, useRef, useEffect } from "react";
import {
  HelpCircle,
  Sparkles,
  BookOpen,
  CheckSquare,
  GraduationCap,
  Keyboard,
  RotateCcw,
  ChevronDown,
  Layers,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { useTour } from "../../context/TourContext";
import { TabType } from "../../App";

interface HeaderHelpMenuProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsModal?: () => void;
}

export const HeaderHelpMenu: React.FC<HeaderHelpMenuProps> = ({
  onNavigateTab,
  onOpenCommandPalette,
  onOpenShortcutsModal,
}) => {
  const {
    startTour,
    openHelpCenter,
    openWorkflows,
    resetTourProgress,
    explanationMode,
    setExplanationMode,
    completedTracks,
  } = useTour();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 10px",
          fontSize: "0.78rem",
          fontWeight: 600,
          backgroundColor: isOpen ? "var(--accent-primary-subtle)" : undefined,
          borderColor: isOpen ? "var(--accent-primary)" : undefined,
          color: isOpen ? "var(--accent-primary)" : "var(--text-main)",
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Help, Guided Tours, Knowledgebase, and Security Checklists"
        aria-expanded={isOpen}
      >
        <HelpCircle size={15} color="var(--accent-cyan)" />
        <span>Help & Guidance</span>
        <ChevronDown size={13} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 1000,
            width: "280px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            boxShadow: "0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 8px 12px -6px rgba(0, 0, 0, 0.4)",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            backdropFilter: "blur(14px)",
          }}
        >
          {/* Section: Main Interactive Help */}
          <div
            style={{
              padding: "4px 8px 6px",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-dim)",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: "4px",
            }}
          >
            Guided Experience & Learning
          </div>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "7px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "6px",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
              e.currentTarget.style.color = "var(--accent-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onClick={() => {
              setIsOpen(false);
              startTour("welcome");
            }}
          >
            <Sparkles size={16} color="var(--accent-cyan)" />
            <div style={{ flex: 1 }}>
              <div>Take a Tour</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 400 }}>
                Interactive visual walkthrough
              </div>
            </div>
            {completedTracks.length > 0 && (
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "var(--accent-emerald)",
                  fontWeight: 600,
                }}
              >
                {completedTracks.length} done
              </span>
            )}
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "7px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "6px",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
              e.currentTarget.style.color = "var(--accent-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onClick={() => {
              setIsOpen(false);
              openHelpCenter();
            }}
          >
            <BookOpen size={16} color="var(--accent-primary)" />
            <div style={{ flex: 1 }}>
              <div>Help Center & Articles</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 400 }}>
                Searchable documentation & guides
              </div>
            </div>
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "7px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "6px",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
              e.currentTarget.style.color = "var(--accent-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onClick={() => {
              setIsOpen(false);
              openWorkflows();
            }}
          >
            <CheckSquare size={16} color="var(--accent-emerald)" />
            <div style={{ flex: 1 }}>
              <div>Guided Checklists</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 400 }}>
                Interactive security procedures
              </div>
            </div>
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "7px 10px",
              fontSize: "0.8rem",
              fontWeight: 600,
              textAlign: "left",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "6px",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
              e.currentTarget.style.color = "var(--accent-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onClick={() => {
              setIsOpen(false);
              onNavigateTab("academy");
            }}
          >
            <GraduationCap size={16} color="var(--accent-cyan)" />
            <div style={{ flex: 1 }}>
              <div>Cyber Academy</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 400 }}>
                Interactive pentest training labs
              </div>
            </div>
          </button>

          {/* Section: Shortcuts & Quick Tours */}
          <div
            style={{
              padding: "6px 8px 4px",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-dim)",
              borderTop: "1px solid var(--border-color)",
              marginTop: "4px",
            }}
          >
            Feature Tours & Shortcuts
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", padding: "2px 4px" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 8px",
                fontSize: "0.72rem",
                borderRadius: "5px",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onClick={() => {
                setIsOpen(false);
                startTour("workspace");
              }}
            >
              <Layers size={13} color="var(--accent-cyan)" />
              <span>Workspace</span>
            </button>

            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 8px",
                fontSize: "0.72rem",
                borderRadius: "5px",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onClick={() => {
                setIsOpen(false);
                startTour("scanner");
              }}
            >
              <Terminal size={13} color="var(--accent-emerald)" />
              <span>Scanner</span>
            </button>

            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 8px",
                fontSize: "0.72rem",
                borderRadius: "5px",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onClick={() => {
                setIsOpen(false);
                startTour("findings");
              }}
            >
              <AlertTriangle size={13} color="var(--accent-amber)" />
              <span>Findings</span>
            </button>

            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 8px",
                fontSize: "0.72rem",
                borderRadius: "5px",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onClick={() => {
                setIsOpen(false);
                onOpenCommandPalette();
              }}
            >
              <Keyboard size={13} color="var(--accent-primary)" />
              <span>Ctrl+K</span>
            </button>

            {onOpenShortcutsModal && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 8px",
                  fontSize: "0.72rem",
                  borderRadius: "5px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--accent-cyan)",
                  cursor: "pointer",
                  gridColumn: "span 2",
                  justifyContent: "center",
                  fontWeight: 600,
                }}
                onClick={() => {
                  setIsOpen(false);
                  onOpenShortcutsModal();
                }}
              >
                <Keyboard size={13} color="var(--accent-cyan)" />
                <span>All Shortcuts (Press ?)</span>
              </button>
            )}
          </div>

          {/* Section: Explanation Mode & Reset */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 6px 4px",
              borderTop: "1px solid var(--border-color)",
              marginTop: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Mode:</span>
              <div
                style={{
                  display: "flex",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  style={{
                    padding: "2px 6px",
                    fontSize: "0.68rem",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      explanationMode === "beginner"
                        ? "var(--accent-primary)"
                        : "var(--bg-secondary)",
                    color:
                      explanationMode === "beginner"
                        ? "#020617"
                        : "var(--text-dim)",
                    fontWeight: explanationMode === "beginner" ? 700 : 400,
                  }}
                  onClick={() => setExplanationMode("beginner")}
                >
                  Beginner
                </button>
                <button
                  type="button"
                  style={{
                    padding: "2px 6px",
                    fontSize: "0.68rem",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      explanationMode === "advanced"
                        ? "var(--accent-primary)"
                        : "var(--bg-secondary)",
                    color:
                      explanationMode === "advanced"
                        ? "#020617"
                        : "var(--text-dim)",
                    fontWeight: explanationMode === "advanced" ? 700 : 400,
                  }}
                  onClick={() => setExplanationMode("advanced")}
                >
                  Advanced
                </button>
              </div>
            </div>

            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "transparent",
                border: "none",
                fontSize: "0.68rem",
                color: "var(--text-dim)",
                cursor: "pointer",
                padding: "2px 4px",
              }}
              onClick={() => {
                resetTourProgress();
              }}
              title="Clear tour completion flags and checklist state"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
