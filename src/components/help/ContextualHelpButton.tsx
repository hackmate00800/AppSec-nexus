import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, BookOpen, Sparkles, CheckSquare } from "lucide-react";
import { useTour } from "../../context/TourContext";

export interface ContextualHelpButtonProps {
  articleId?: string;
  tourTrackId?: string;
  workflowId?: string;
  title?: string;
  tooltip?: string;
  size?: "sm" | "md";
  className?: string;
}

export const ContextualHelpButton: React.FC<ContextualHelpButtonProps> = ({
  articleId,
  tourTrackId,
  workflowId,
  title = "Help & Guidance",
  tooltip = "Learn how to use this feature",
  size = "sm",
  className = "",
}) => {
  const { openHelpCenter, startTour, openWorkflows } = useTour();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const hasMultipleActions =
    Number(Boolean(articleId)) + Number(Boolean(tourTrackId)) + Number(Boolean(workflowId)) > 1;

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMultipleActions) {
      setIsOpen((prev) => !prev);
    } else if (tourTrackId) {
      startTour(tourTrackId);
    } else if (articleId) {
      openHelpCenter(articleId);
    } else if (workflowId) {
      openWorkflows(workflowId);
    } else {
      openHelpCenter();
    }
  };

  const iconSize = size === "sm" ? 14 : 16;
  const padding = size === "sm" ? "3px 6px" : "5px 8px";

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        type="button"
        onClick={handleButtonClick}
        title={tooltip}
        aria-label={title}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          padding: padding,
          fontSize: "0.74rem",
          background: isOpen ? "var(--accent-primary-subtle)" : "rgba(255, 255, 255, 0.04)",
          color: isOpen ? "var(--accent-cyan)" : "var(--text-dim)",
          border: isOpen ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
          borderRadius: "6px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--accent-cyan)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
          }
        }}
      >
        <HelpCircle size={iconSize} />
        {size === "md" && <span>Help</span>}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 60,
            width: "220px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            backdropFilter: "blur(12px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: "4px 8px 6px",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: "4px",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--text-main)",
            }}
          >
            {title}
          </div>

          {articleId && (
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "6px 8px",
                fontSize: "0.75rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              onClick={() => {
                setIsOpen(false);
                openHelpCenter(articleId);
              }}
            >
              <BookOpen size={14} color="var(--accent-cyan)" />
              <span>Read Documentation</span>
            </button>
          )}

          {tourTrackId && (
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "6px 8px",
                fontSize: "0.75rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              onClick={() => {
                setIsOpen(false);
                startTour(tourTrackId);
              }}
            >
              <Sparkles size={14} color="var(--accent-primary)" />
              <span>Interactive Tour</span>
            </button>
          )}

          {workflowId && (
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "6px 8px",
                fontSize: "0.75rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              onClick={() => {
                setIsOpen(false);
                openWorkflows(workflowId);
              }}
            >
              <CheckSquare size={14} color="var(--accent-emerald)" />
              <span>Guided Checklist</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
