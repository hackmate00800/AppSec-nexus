import { TabType } from "../App";

export type ExplanationMode = "beginner" | "advanced";

export interface TourStep {
  id: string;
  targetSelector: string; // CSS or data-tour selector, e.g. '[data-tour="navbar-brand"]'
  tab?: TabType; // If provided, tour automatically switches to this tab before highlighting
  title: string;
  description: string;
  whyItMatters: string;
  howToUse: string;
  nextActionHint: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  category?: string;
  interactiveAction?: string;
}

export interface TourTrack {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: string;
  steps: TourStep[];
}

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  prerequisites?: string[];
  stepByStep: string[];
  expectedOutput: string;
  troubleshooting: string[];
  relatedFeatures: string[];
  beginnerText?: string;
  advancedText?: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  details: string;
  actionTab?: TabType;
  actionLabel?: string;
}

export interface GuidedWorkflow {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
}
