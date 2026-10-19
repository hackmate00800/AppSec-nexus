export type TaxonomySkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface TaxonomyReference {
  title: string;
  url: string;
  publisher: "OWASP" | "NIST" | "MITRE" | "CIS" | "Microsoft" | "Linux" | "Android" | "RFC" | "Standard" | "Community";
  versionOrDate?: string;
  isOfficial: boolean;
}

export interface ProcedureStep {
  stepNumber: number;
  title: string;
  objective: string;
  readOnly: boolean;
  commandOrPayload?: string;
  explanation: string;
  expectedObservation: string;
  evidenceCollection: string;
}

export interface TaxonomyProcedure {
  id: string;
  title: string;
  summary: string;
  prerequisites: string[];
  safetyPrecautions: string[];
  scopeRequirements: string[];
  steps: ProcedureStep[];
  validationCriteria: string;
  falsePositiveAnalysis: string;
  severityAndImpact: {
    cvssScore?: number;
    severityLevel: "Critical" | "High" | "Medium" | "Low" | "Info";
    businessImpact: string;
    confidentiality: "High" | "Medium" | "Low" | "None";
    integrity: "High" | "Medium" | "Low" | "None";
    availability: "High" | "Medium" | "Low" | "None";
  };
  remediation: {
    summary: string;
    codeOrConfigExample?: string;
    language?: string;
    defenseInDepth: string[];
  };
  retestProcedure: {
    steps: string[];
    passCondition: string;
    residualRiskNotes: string;
  };
  tools: string[];
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TopicAssessment {
  id: string;
  title: string;
  passingScorePercent: number;
  questions: AssessmentQuestion[];
}

export interface TaxonomyTopic {
  id: string;
  title: string;
  description: string;
  skillLevel: TaxonomySkillLevel;
  estimatedMinutes: number;
  technologies: string[];
  prerequisites: string[];
  learningObjectives: string[];
  // Universal 23-point learning structure fields
  definition: string;
  purpose: string;
  technicalFoundations: string;
  typesAndSubtypes: { name: string; description: string; indicator?: string }[];
  architectureDataFlow?: string;
  threatModel?: string;
  commonWeaknesses: string[];
  defensiveControls: string[];
  assessmentMethodology: string;
  procedure?: TaxonomyProcedure;
  practicalExercises?: string[];
  assessment?: TopicAssessment;
  relatedCwe?: string[];
  relatedMitreAttack?: string[];
  relatedVulnerabilityIds?: string[];
  references: TaxonomyReference[];
  lastReviewedDate: string;
}

export interface TaxonomySubPhase {
  id: string;
  title: string;
  description: string;
  topics: TaxonomyTopic[];
}

export interface TaxonomyPhase {
  id: string;
  phaseNumber: number;
  title: string;
  description: string;
  subPhases: TaxonomySubPhase[];
}

export interface TaxonomyDiscipline {
  id: string;
  title: string;
  description: string;
  iconName: string;
  phases: TaxonomyPhase[];
}

export interface TaxonomyDomain {
  id: string;
  title: string;
  shortName: string;
  description: string;
  category: "foundations" | "systems" | "network" | "application" | "operations" | "governance";
  iconName: string;
  isBeginnerRecommended?: boolean;
  disciplines: TaxonomyDiscipline[];
}

export interface TaxonomyUserProgress {
  completedTopicIds: string[];
  bookmarkedTopicIds: string[];
  notes: Record<string, string>; // topicId -> note content
  quizScores: Record<string, { score: number; total: number; passed: boolean; completedAt: string }>;
  activeTopicId?: string;
}
