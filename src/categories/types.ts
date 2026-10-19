export type SecurityCategory =
  | "web"
  | "api"
  | "os"
  | "software"
  | "android"
  | "desktop"
  | "network"
  | "cloud"
  | "lab";

export type CategoryVerificationStatus =
  | "Confirmed"
  | "Likely"
  | "Potential"
  | "False Positive"
  | "Needs Manual Review"
  | "Not Tested";

export interface CategoryTool {
  id: string;
  name: string;
  category: SecurityCategory;
  description: string;
  commandTemplate: string;
  tags: string[];
  isAvailable: boolean;
  documentationUrl: string;
}

export interface CategoryMethodologyStep {
  stepNumber: number;
  phase: string;
  title: string;
  description: string;
  recommendedTools: string[];
  verificationCriteria: string;
  commonWeaknesses: string[];
}

export interface CategoryValidationCheck {
  id: string;
  title: string;
  cwe?: string;
  owaspId?: string;
  checkType: "automated" | "semi-automated" | "manual";
  verificationLogic: string;
  requiredEvidence: string;
  validationFunction: (input: CategoryValidationInput) => CategoryValidationResult;
}

export interface CategoryValidationInput {
  findingTitle: string;
  affectedAsset: string;
  rawEvidence: string;
  parameters?: Record<string, any>;
  observedStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBodySnippet?: string;
}

export interface CategoryValidationResult {
  status: CategoryVerificationStatus;
  confidenceScore: number; // 0 - 100
  hypothesis: string;
  actualObservation: string;
  supportingEvidence: string;
  contradictingEvidence: string;
  recommendedRemediation: string;
  suggestedRetestCommand: string;
}

export interface CategoryAiPersona {
  category: SecurityCategory;
  roleTitle: string;
  specialty: string;
  systemPrompt: string;
  starterPromptChips: Array<{
    label: string;
    text: string;
    depth: "beginner" | "intermediate" | "advanced" | "professional";
  }>;
}

export interface SecurityCategoryDefinition {
  id: SecurityCategory;
  name: string;
  shortLabel: string;
  iconName: string;
  color: string;
  gradient: string;
  description: string;
  standards: string[]; // e.g. ["OWASP Top 10", "WSTG v4.2"]
  tools: CategoryTool[];
  methodologyPhases: string[];
  methodologySteps: CategoryMethodologyStep[];
  validationChecks: CategoryValidationCheck[];
  aiPersona: CategoryAiPersona;
}
