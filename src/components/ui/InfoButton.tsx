import React, { useState, useRef, useEffect } from "react";
import { Info, X, ExternalLink, ShieldAlert, Sparkles, BookOpen } from "lucide-react";

export interface InfoButtonProps {
  title: string;
  description: string;
  whyItMatters?: string;
  howToUse?: string;
  limitations?: string;
  docLink?: {
    label: string;
    targetTab?: string;
    onNavigate?: (tab: string) => void;
  };
  size?: number;
  className?: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export const InfoButton: React.FC<InfoButtonProps> = ({
  title,
  description,
  whyItMatters,
  howToUse,
  limitations,
  docLink,
  size = 13,
  className = "",
  placement = "bottom",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const placementClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2 sm:left-0 sm:translate-x-0",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={`More info about ${title}`}
        aria-expanded={isOpen}
        title={`Context help: ${title}`}
        className="p-1 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
      >
        <Info size={size} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={`absolute ${placementClasses[placement]} z-50 w-80 max-w-[90vw] p-3.5 rounded-lg bg-slate-900 text-slate-100 border border-slate-700/90 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150 text-left`}
          style={{
            backgroundColor: "var(--bg-card, #0f172a)",
            borderColor: "var(--border-color, #334155)",
            color: "var(--text-main, #f8fafc)",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-700/70">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 shrink-0">
                <Sparkles size={12} />
              </span>
              <span className="font-semibold text-xs truncate text-cyan-300">{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-0.5 text-slate-400 hover:text-slate-100 rounded transition-colors"
              aria-label="Close help popover"
            >
              <X size={13} />
            </button>
          </div>

          {/* Description */}
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div>
              <p className="text-slate-300" style={{ color: "var(--text-main, #f1f5f9)" }}>
                {description}
              </p>
            </div>

            {whyItMatters && (
              <div className="pt-1.5 border-t border-slate-800">
                <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                  Why It Matters
                </span>
                <p className="text-slate-300" style={{ color: "var(--text-muted, #cbd5e1)" }}>
                  {whyItMatters}
                </p>
              </div>
            )}

            {howToUse && (
              <div className="pt-1.5 border-t border-slate-800">
                <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                  How To Use
                </span>
                <p className="text-slate-300" style={{ color: "var(--text-muted, #cbd5e1)" }}>
                  {howToUse}
                </p>
              </div>
            )}

            {limitations && (
              <div className="pt-1.5 border-t border-slate-800">
                <div className="flex items-center gap-1 text-amber-400 font-semibold text-[10px] uppercase tracking-wider mb-0.5">
                  <ShieldAlert size={10} />
                  <span>Important Considerations</span>
                </div>
                <p className="text-amber-200/90 text-[10.5px]">
                  {limitations}
                </p>
              </div>
            )}

            {docLink && (
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (docLink.onNavigate && docLink.targetTab) {
                      docLink.onNavigate(docLink.targetTab);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  <BookOpen size={11} />
                  <span>{docLink.label}</span>
                  <ExternalLink size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoButton;
