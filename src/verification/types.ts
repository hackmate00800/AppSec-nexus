import { Finding, Target, ValidationRecord } from "../types";

export interface VerificationLabSettings {
  safeModeOnly: boolean;
  requireConfirmation: boolean;
  requestTimeoutMs: number;
  rateLimitDelayMs: number;
  redactSecrets: boolean;
  enforceScope: boolean;
  maxResponseBodyBytes: number;
}

export const DEFAULT_VERIFICATION_SETTINGS: VerificationLabSettings = {
  safeModeOnly: true,
  requireConfirmation: true,
  requestTimeoutMs: 5000,
  rateLimitDelayMs: 250,
  redactSecrets: true,
  enforceScope: true,
  maxResponseBodyBytes: 8192,
};

export interface VerificationFilterState {
  targetId: string;
  severity: string;
  status: string;
  search: string;
  detector: string;
  provenanceKind: string;
}

export interface VerificationKpis {
  totalFindings: number;
  pendingVerification: number;
  confirmed: number;
  potential: number;
  inconclusive: number;
  falsePositives: number;
  simulated: number;
  scanErrors: number;
  coveragePercentage: number;
  avgDurationMs: number;
}

export interface GenuineAuditResult {
  totalFindings: number;
  liveCount: number;
  staticCount: number;
  externalToolCount: number;
  simulatedCount: number;
  unverifiedHeuristicsCount: number;
  detectorIntegrity: Array<{
    detector: string;
    total: number;
    confirmed: number;
    potential: number;
    falsePositive: number;
    inconclusive: number;
    simulated: number;
    verdict: "Authentic Live" | "Static Matcher" | "Tool Subprocess" | "Simulated Demo" | "Heuristic Gap";
  }>;
  flaggedItems: Array<{
    findingId: string;
    title: string;
    reason: string;
    suggestedAction: string;
  }>;
}

export interface VerificationReportPayload {
  title: string;
  generatedAt: string;
  target?: Target;
  kpis: VerificationKpis;
  findings: Finding[];
  records: ValidationRecord[];
  safeModeEnforced: boolean;
  disclaimer: string;
}
