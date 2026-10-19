import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { TourTrack, TourStep, ExplanationMode } from "../types/tour";
import { TOUR_TRACKS } from "../help/tourData";
import { TabType } from "../App";

interface TourContextValue {
  // Tour State
  isTourActive: boolean;
  activeTrack: TourTrack | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  completedTracks: string[];
  explanationMode: ExplanationMode;
  targetRect: DOMRect | null;

  // Tour Controls
  startTour: (trackId?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  restartTour: () => void;
  setExplanationMode: (mode: ExplanationMode) => void;

  // Help Center & Workflows Modals
  isHelpCenterOpen: boolean;
  selectedArticleId: string | null;
  openHelpCenter: (articleId?: string) => void;
  closeHelpCenter: () => void;

  isWorkflowsOpen: boolean;
  activeWorkflowId: string | null;
  openWorkflows: (workflowId?: string) => void;
  closeWorkflows: () => void;
  workflowProgress: Record<string, string[]>;
  toggleWorkflowStep: (workflowId: string, stepId: string) => void;

  // Reset & Ask AI
  resetTourProgress: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const STORAGE_TOUR_COMPLETED = "appsec_tour_completed_tracks";
const STORAGE_EXPLANATION_MODE = "appsec_explanation_mode";
const STORAGE_WORKFLOW_PROGRESS = "appsec_guided_workflows_progress";

export const TourProvider: React.FC<{
  children: React.ReactNode;
  onNavigateTab?: (tab: TabType) => void;
  onOpenAiWithPrompt?: (prompt: string) => void;
}> = ({ children, onNavigateTab }) => {
  // Persisted state
  const [completedTracks, setCompletedTracks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TOUR_COMPLETED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [explanationMode, setExplanationModeState] = useState<ExplanationMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_EXPLANATION_MODE) as ExplanationMode) || "beginner";
    } catch {
      return "beginner";
    }
  });

  const [workflowProgress, setWorkflowProgress] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WORKFLOW_PROGRESS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active tour runtime state
  const [isTourActive, setIsTourActive] = useState(false);
  const [activeTrack, setActiveTrack] = useState<TourTrack | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Modals state
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TOUR_COMPLETED, JSON.stringify(completedTracks));
    } catch {
      // ignore
    }
  }, [completedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EXPLANATION_MODE, explanationMode);
    } catch {
      // ignore
    }
  }, [explanationMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WORKFLOW_PROGRESS, JSON.stringify(workflowProgress));
    } catch {
      // ignore
    }
  }, [workflowProgress]);

  const currentStep = useMemo(() => {
    if (!activeTrack || currentStepIndex < 0 || currentStepIndex >= activeTrack.steps.length) {
      return null;
    }
    return activeTrack.steps[currentStepIndex];
  }, [activeTrack, currentStepIndex]);

  const totalSteps = activeTrack ? activeTrack.steps.length : 0;

  // Calculate target bounding box and handle auto-tab navigation
  const updateTargetRect = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    // Auto-navigate to required tab if specified
    if (currentStep.tab && onNavigateTab) {
      onNavigateTab(currentStep.tab);
    }

    // Slight delay to allow DOM render after tab switch
    const timer = setTimeout(() => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // Fallback center box if element is not rendered
        setTargetRect(null);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [currentStep, onNavigateTab]);

  useEffect(() => {
    if (isTourActive) {
      updateTargetRect();
    }
  }, [isTourActive, currentStepIndex, updateTargetRect]);

  // Recalculate target rect on window resize / scroll
  useEffect(() => {
    if (!isTourActive) return;
    const handleRecalculate = () => {
      if (!currentStep) return;
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };
    window.addEventListener("resize", handleRecalculate, { passive: true });
    window.addEventListener("scroll", handleRecalculate, { passive: true });
    return () => {
      window.removeEventListener("resize", handleRecalculate);
      window.removeEventListener("scroll", handleRecalculate);
    };
  }, [isTourActive, currentStep]);

  // Tour controls
  const startTour = useCallback((trackId: string = "welcome") => {
    const track = TOUR_TRACKS.find((t) => t.id === trackId) || TOUR_TRACKS[0];
    setActiveTrack(track);
    setCurrentStepIndex(0);
    setIsTourActive(true);
    setIsHelpCenterOpen(false);
    setIsWorkflowsOpen(false);
  }, []);

  const endTour = useCallback(() => {
    if (activeTrack) {
      setCompletedTracks((prev) => (prev.includes(activeTrack.id) ? prev : [...prev, activeTrack.id]));
    }
    setIsTourActive(false);
    setActiveTrack(null);
    setCurrentStepIndex(0);
    setTargetRect(null);
  }, [activeTrack]);

  const nextStep = useCallback(() => {
    if (!activeTrack) return;
    if (currentStepIndex + 1 < activeTrack.steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      endTour();
    }
  }, [activeTrack, currentStepIndex, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  const restartTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
  }, []);

  const setExplanationMode = useCallback((mode: ExplanationMode) => {
    setExplanationModeState(mode);
  }, []);

  // Help Center controls
  const openHelpCenter = useCallback((articleId?: string) => {
    setSelectedArticleId(articleId || null);
    setIsHelpCenterOpen(true);
    setIsWorkflowsOpen(false);
    setIsTourActive(false);
  }, []);

  const closeHelpCenter = useCallback(() => {
    setIsHelpCenterOpen(false);
    setSelectedArticleId(null);
  }, []);

  // Guided Workflows controls
  const openWorkflows = useCallback((workflowId?: string) => {
    setActiveWorkflowId(workflowId || null);
    setIsWorkflowsOpen(true);
    setIsHelpCenterOpen(false);
    setIsTourActive(false);
  }, []);

  const closeWorkflows = useCallback(() => {
    setIsWorkflowsOpen(false);
    setActiveWorkflowId(null);
  }, []);

  const toggleWorkflowStep = useCallback((workflowId: string, stepId: string) => {
    setWorkflowProgress((prev) => {
      const current = prev[workflowId] || [];
      const updated = current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId];
      return { ...prev, [workflowId]: updated };
    });
  }, []);

  const resetTourProgress = useCallback(() => {
    setCompletedTracks([]);
    setWorkflowProgress({});
    localStorage.removeItem(STORAGE_TOUR_COMPLETED);
    localStorage.removeItem(STORAGE_WORKFLOW_PROGRESS);
  }, []);

  // Global custom event listeners for keyboard shortcuts and cross-component triggers
  useEffect(() => {
    const handleOpenHelp = () => openHelpCenter();
    const handleStartTour = (e: any) => startTour(e.detail?.trackId || "welcome");
    window.addEventListener("appsec:open-help", handleOpenHelp);
    window.addEventListener("appsec:start-tour", handleStartTour);
    return () => {
      window.removeEventListener("appsec:open-help", handleOpenHelp);
      window.removeEventListener("appsec:start-tour", handleStartTour);
    };
  }, [openHelpCenter, startTour]);

  const value: TourContextValue = {
    isTourActive,
    activeTrack,
    currentStepIndex,
    currentStep,
    totalSteps,
    completedTracks,
    explanationMode,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    endTour,
    restartTour,
    setExplanationMode,
    isHelpCenterOpen,
    selectedArticleId,
    openHelpCenter,
    closeHelpCenter,
    isWorkflowsOpen,
    activeWorkflowId,
    openWorkflows,
    closeWorkflows,
    workflowProgress,
    toggleWorkflowStep,
    resetTourProgress,
    onNavigateTab,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    // Safe mock fallback for isolated testing
    return {
      isTourActive: false,
      activeTrack: null,
      currentStepIndex: 0,
      currentStep: null,
      totalSteps: 0,
      completedTracks: [],
      explanationMode: "beginner",
      targetRect: null,
      startTour: () => {},
      nextStep: () => {},
      prevStep: () => {},
      skipTour: () => {},
      endTour: () => {},
      restartTour: () => {},
      setExplanationMode: () => {},
      isHelpCenterOpen: false,
      selectedArticleId: null,
      openHelpCenter: () => {},
      closeHelpCenter: () => {},
      isWorkflowsOpen: false,
      activeWorkflowId: null,
      openWorkflows: () => {},
      closeWorkflows: () => {},
      workflowProgress: {},
      toggleWorkflowStep: () => {},
      resetTourProgress: () => {},
    };
  }
  return ctx;
};
