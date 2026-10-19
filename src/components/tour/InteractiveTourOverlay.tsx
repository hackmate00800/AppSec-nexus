import React, { useEffect, useMemo } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useTour } from "../../context/TourContext";

export const InteractiveTourOverlay: React.FC = () => {
  const {
    isTourActive,
    activeTrack,
    currentStepIndex,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    endTour,
    targetRect,
    explanationMode,
    setExplanationMode,
  } = useTour();

  // Global keyboard shortcuts while tour is active
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        endTour();
      } else if (e.key === "ArrowRight" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTourActive, nextStep, prevStep, endTour]);

  // Compute popover position relative to targetRect
  const popoverStyle = useMemo<React.CSSProperties>(() => {
    const popoverWidth = 380;
    const padding = 16;

    if (!targetRect) {
      // Center fallback
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `min(${popoverWidth}px, 92vw)`,
        zIndex: 9999,
      };
    }

    const { top, left, bottom } = targetRect;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let computedTop = bottom + 12;
    let computedLeft = Math.max(padding, Math.min(windowWidth - popoverWidth - padding, left));

    // If bottom overflow, position above target
    if (computedTop + 240 > windowHeight && top > 250) {
      computedTop = Math.max(padding, top - 260);
    }

    return {
      position: "fixed",
      top: `${computedTop}px`,
      left: `${computedLeft}px`,
      width: `min(${popoverWidth}px, 92vw)`,
      zIndex: 9999,
    };
  }, [targetRect]);

  if (!isTourActive || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none" role="dialog" aria-modal="true">
      {/* SVG Spotlight Cutout Backdrop */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 9990 }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 8, 17, 0.75)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target Highlight Pulsing Ring */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: "8px",
            border: "2px solid #38bdf8",
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.5), inset 0 0 10px rgba(56, 189, 248, 0.2)",
            pointerEvents: "none",
            zIndex: 9995,
            animation: "pulse 2s infinite ease-in-out",
          }}
        />
      )}

      {/* Floating Popover Card */}
      <div
        style={popoverStyle}
        className="bg-slate-900 border border-sky-500/50 rounded-xl shadow-2xl p-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
      >
        {/* Header: Track title, Step Indicator & Close */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={14} className="text-sky-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-sky-400 truncate">
              {activeTrack?.title || "Product Tour"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <button
              onClick={endTour}
              title="Exit Tour (Esc)"
              aria-label="Exit Tour"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Step Title */}
        <h3 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-1.5">
          {currentStep.title}
        </h3>

        {/* Description based on Beginner vs Advanced mode */}
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {currentStep.description}
        </p>

        {/* Why it Matters & How to Use Pills */}
        <div className="space-y-2 mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
          <div>
            <strong className="text-sky-400 font-semibold flex items-center gap-1 mb-0.5">
              <Info size={11} /> Why It Matters:
            </strong>
            <span className="text-slate-300">{currentStep.whyItMatters}</span>
          </div>
          <div>
            <strong className="text-emerald-400 font-semibold flex items-center gap-1 mb-0.5">
              <CheckCircle2 size={11} /> How to Use:
            </strong>
            <span className="text-slate-300">{currentStep.howToUse}</span>
          </div>
        </div>

        {/* Action Hint */}
        {currentStep.nextActionHint && (
          <div className="text-[10px] text-slate-400 italic mb-3 flex items-center gap-1">
            <span>💡</span>
            <span>{currentStep.nextActionHint}</span>
          </div>
        )}

        {/* Explanation Mode Switcher & Navigation Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
          {/* Mode Pill Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            <button
              onClick={() => setExplanationMode("beginner")}
              className={`text-[10px] px-1 rounded transition-colors ${
                explanationMode === "beginner"
                  ? "text-sky-400 font-bold bg-slate-800"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Simple wording and non-technical explanations"
            >
              Beginner
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setExplanationMode("advanced")}
              className={`text-[10px] px-1 rounded transition-colors ${
                explanationMode === "advanced"
                  ? "text-sky-400 font-bold bg-slate-800"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Deep technical protocols and CWE details"
            >
              Advanced
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={skipTour}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            >
              Skip
            </button>

            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}

            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-sm"
            >
              <span>{isLastStep ? "Finish" : "Next"}</span>
              {!isLastStep && <ChevronRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
