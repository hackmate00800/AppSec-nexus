import { FindingSeverity } from "../types";
import { SecurityCategory } from "../categories/types";

export type ChecklistItemStatus =
  | "Not Started"
  | "In Progress"
  | "Pass"
  | "Fail"
  | "Needs Review"
  | "Not Applicable"
  | "Blocked"
  | "Not Tested"
  | "Retest Required"
  | "Retest Passed"
  | "Retest Failed";

export interface ChecklistItemTemplate {
  id: string;
  code: string; // e.g. "WSTG-INP-01" or "API1:BOLA"
  title: string;
  category: SecurityCategory;
  phase: string;
  defaultSeverity: FindingSeverity;
  cwe?: string;
  owaspId?: string;
  description: string;
  procedureSteps: string[];
  recommendedTools: string[];
  verificationCriteria: string;
  remediationGuidance: string;
}

export interface PlaybookTemplate {
  id: string;
  title: string;
  category: SecurityCategory;
  standard: string; // e.g. "OWASP WSTG v4.2" or "OWASP API Top 10"
  version: string;
  description: string;
  prerequisites: string[];
  scopeGuidelines: string;
  items: ChecklistItemTemplate[];
}

export interface ItemExecutionRecord {
  itemId: string;
  status: ChecklistItemStatus;
  methodUsed?: string;
  toolsUsed?: string;
  evidenceSnippet?: string;
  findingId?: string; // Bidirectional link to findings
  findingTitle?: string;
  remediationNotes?: string;
  retestNotes?: string;
  updatedAt: string;
}

export interface AssessmentRun {
  id: string;
  templateId: string;
  templateTitle: string;
  category: SecurityCategory;
  targetId: string;
  targetName: string;
  targetUrl: string;
  environment: "Production" | "Staging" | "Development" | "Lab";
  authorizedScope: string;
  status: "Active" | "Completed" | "Archived";
  createdAt: string;
  completedAt?: string;
  itemResults: Record<string, ItemExecutionRecord>;
  notes?: string;
}

export interface AssessmentRunMetrics {
  totalItems: number;
  completedItems: number;
  passCount: number;
  failCount: number;
  needsReviewCount: number;
  notApplicableCount: number;
  blockedCount: number;
  retestCount: number;
  progressPercent: number;
  passRatePercent: number;
}
