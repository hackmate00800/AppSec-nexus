export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  questions: Question[];
}

export interface CodeSnippet {
  language: string;
  code: string;
  caption?: string;
  isVulnerable?: boolean;
}

export interface ScannerIntegrationLink {
  toolId: string;
  toolName: string;
  scanType: "passive" | "active" | "host" | "mobile" | "crawl";
  sampleTarget?: string;
  suggestedAction: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  pathId: string;
  stageId?: string;
  title: string;
  fullForm?: string;
  level: SkillLevel;
  estimatedMinutes: number;
  objectives: string[];
  prerequisites: string[];
  summary: string;
  beginnerExplanation: string;
  hinglishExplanation?: string;
  realWorldAnalogy?: string;
  whyItExists?: string;
  cybersecurityConnection?: string;
  technicalDeepDive: string;
  diagramAscii?: string;
  codeExamples?: CodeSnippet[];
  commonMistakes: string[];
  practicalExercise?: string;
  applicationTask?: string;
  authoritativeReferences: { title: string; url: string; isOfficial: boolean }[];
  quiz?: Quiz;
  relatedVulnerabilityIds?: string[];
  scannerIntegration?: ScannerIntegrationLink;
}

export interface Module {
  id: string;
  pathId: string;
  title: string;
  description: string;
  iconName: string;
  lessons: Lesson[];
}

export interface LearningPath {
  id: string;
  stageNumber?: number;
  stageCode?: string;
  title: string;
  subtitle: string;
  level: SkillLevel;
  iconName: string;
  category: "foundations" | "offensive" | "defensive" | "architecture" | "specialized";
  estimatedHours: number;
  prerequisitePathIds: string[];
  description: string;
  modules: Module[];
}

export interface VulnerabilityEntry {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  cwe?: string;
  cvssBaseScore: number;
  cvssVector?: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  definition: string;
  technicalExplanation: string;
  rootCause: string;
  prerequisites: string[];
  vulnerableCode: CodeSnippet;
  attackFlow: string[];
  detectionMethodology: string;
  manualValidationSteps: string[];
  pocDemo: string;
  expectedObservations: string;
  falsePositiveConsiderations: string;
  secureCodeFix: CodeSnippet;
  defenseInDepth: string[];
  retestSteps: string[];
  relatedVulnerabilities: string[];
  officialReferences: { title: string; url: string }[];
  scannerCheck?: {
    toolName: string;
    checkId: string;
    description: string;
  };
  businessImpact?: string;
  documentationTemplate?: string;
  validationLabId?: string;
  capabilityBadge?: "native_scanner" | "tool_adapter" | "educational_reference";
}

export interface EssentialCommand {
  command: string;
  description: string;
  context: string;
}

export interface ToolEntry {
  id: string;
  name: string;
  category: "web_scanner" | "recon" | "proxy" | "network" | "sast" | "fuzzer" | "mobile";
  licenseType: "Open Source" | "Community / Free" | "Commercial";
  website: string;
  description: string;
  installationGuide: {
    windows: string;
    linux: string;
    packageManager?: string;
  };
  workflow: string[];
  essentialCommands: EssentialCommand[];
  outputInterpretation: string;
  limitationsAndFalsePositives: string[];
  integratedInAppSecNexus: boolean;
  appsecNexusToolId?: string;
}

export interface MethodologyFramework {
  id: string;
  name: string;
  organization: string;
  version: string;
  purpose: string;
  whenToUse: string;
  prerequisites: string[];
  scopeAndLimitations: string;
  inputs: string[];
  expectedOutputs: string[];
  limitations: string[];
  practicalExample: string;
  reportingRequirements: string[];
  relatedStandards: string[];
  corePhases: {
    phaseNumber: number;
    title: string;
    description: string;
    deliverables: string[];
    activities?: string[];
    toolsUsed?: string[];
  }[];
  officialUrl: string;
}

export type ConceptDomain =
  | "cybersecurity"
  | "ethical_hacking"
  | "web_pentest"
  | "api_security"
  | "defensive_controls";

export interface ConceptExample {
  scenario: string;
  codeOrConfig?: string;
  explanation: string;
}

export interface LearningResource {
  title: string;
  url: string;
  type: "standard" | "rfc" | "documentation" | "book" | "guide";
  isOfficial: boolean;
}

export interface ConceptEntry {
  id: string;
  name: string;
  domain: ConceptDomain;
  difficulty: SkillLevel;
  definition: string;
  purpose: string;
  prerequisites: string[];
  technicalExplanation: string;
  examples: ConceptExample[];
  practicalApplications: string[];
  relatedConceptIds: string[];
  commonMistakes: string[];
  learningResources: LearningResource[];
  linkedTools?: string[];
  linkedCwe?: string[];
  linkedMitre?: string[];
  linkedVulnerabilityId?: string;
  capabilityType: "native_scanner" | "tool_adapter" | "educational_only";
}

export interface WorkflowStage {
  stageNumber: number;
  name: string;
  category: string;
  objective: string;
  inputs: string[];
  activities: string[];
  toolsUsed: string[];
  expectedOutputs: string[];
  safetyAndScopePrecautions: string[];
  appsecNexusIntegration?: {
    isSupported: boolean;
    featureName: string;
    actionDescription: string;
  };
}

export interface PracticalLab {
  id: string;
  title: string;
  difficulty: SkillLevel;
  category: "Web" | "API" | "Host" | "Mobile" | "Network";
  estimatedMinutes: number;
  scenarioDescription: string;
  objectives: string[];
  setupInstructions: string[];
  stepByStepWalkthrough: {
    step: number;
    title: string;
    instruction: string;
    commandOrPayload?: string;
    expectedResult: string;
  }[];
  hints: string[];
  validationCriteria: string;
  cleanupInstructions: string;
  targetRecommendation: string;
  warningNotice: string;
}

export interface CertificationInfo {
  id: string;
  title: string;
  issuer: string;
  level: SkillLevel;
  category: "Foundations" | "Offensive / Pentesting" | "Defensive / SOC" | "Management / Architecture" | "Cloud";
  targetAudience: string;
  examFormat: string;
  prerequisites: string;
  estimatedCost: string;
  officialUrl: string;
  isVerified: boolean;
  freeAlternatives: string[];
  relatedJobRoles: string[];
  lastVerifiedDate: string;
}

export interface CareerRoadmap {
  id: string;
  roleTitle: string;
  targetAudience: string;
  salaryRangeUS: string;
  keyResponsibilities: string[];
  essentialSkills: string[];
  recommendedCertifications: string[];
  learningPathIds: string[];
}

export interface UserAcademyState {
  completedLessonIds: string[];
  activePathId: string;
  quizScores: Record<string, { score: number; total: number; passed: boolean; completedAt: string }>;
  bookmarks: string[];
  notes: Record<string, string>; // lessonId -> markdown note text
  lastVisitedLessonId?: string;
  explanationMode?: "beginner" | "hinglish" | "technical" | "analogy";
}

export interface GlossaryEntry {
  id: string;
  term: string;
  fullForm?: string;
  category: "networking" | "web" | "security" | "pentest" | "cryptography" | "system";
  englishDefinition: string;
  hinglishDefinition: string;
  whyItExists: string;
  realWorldAnalogy: string;
  relatedTerms?: string[];
  cwe?: string;
  relatedTools?: string[];
}
