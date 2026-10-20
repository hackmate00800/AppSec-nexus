import { Finding, ValidationRecord } from "../types";
import { GenuineAuditResult, VerificationKpis } from "./types";

export class VerificationAuditEngine {
  /**
   * Computes authentic verification KPIs strictly from stored database entities.
   * Never fabricates placeholder numbers or mocks empty states.
   */
  public static computeKpis(findings: Finding[], records: ValidationRecord[]): VerificationKpis {
    const totalFindings = findings.length;

    let confirmed = 0;
    let potential = 0;
    let inconclusive = 0;
    let falsePositives = 0;
    let simulated = 0;
    let scanErrors = 0;
    let pendingVerification = 0;

    for (const f of findings) {
      if (f.is_simulated || f.provenance_kind === "Simulated") {
        simulated++;
      }

      const st = (f.verification_status || f.status || "").toLowerCase();
      if (st.includes("confirmed")) {
        confirmed++;
      } else if (st.includes("false_positive") || st.includes("falsepositive") || st.includes("refuted")) {
        falsePositives++;
      } else if (st.includes("inconclusive") || st.includes("unconfirmed")) {
        inconclusive++;
      } else if (st.includes("scanerror") || st.includes("validationfailed") || st.includes("error")) {
        scanErrors++;
      } else if (st.includes("potential") || st.includes("needsvalidation")) {
        potential++;
      }

      // If finding has never been validated in records and is not yet confirmed/refuted
      const isSim = f.is_simulated || f.provenance_kind === "Simulated";
      const hasRecord = records.some((r) => r.finding_id === f.id);
      if (!isSim && !hasRecord && !st.includes("confirmed") && !st.includes("false")) {
        pendingVerification++;
      }
    }

    const verifiedCount = confirmed + falsePositives + inconclusive;
    const coveragePercentage = totalFindings > 0 ? Math.round((verifiedCount / totalFindings) * 100) : 0;

    const totalDuration = records.reduce((acc, r) => acc + (r.duration_ms || 0), 0);
    const avgDurationMs = records.length > 0 ? Math.round(totalDuration / records.length) : 0;

    return {
      totalFindings,
      pendingVerification,
      confirmed,
      potential,
      inconclusive,
      falsePositives,
      simulated,
      scanErrors,
      coveragePercentage,
      avgDurationMs,
    };
  }

  /**
   * Performs a runtime and structural provenance audit across all findings.
   * Categorizes detectors and isolates demo or unverified heuristic findings.
   */
  public static auditFindings(findings: Finding[], _records: ValidationRecord[]): GenuineAuditResult {
    const totalFindings = findings.length;
    let liveCount = 0;
    let staticCount = 0;
    let externalToolCount = 0;
    let simulatedCount = 0;
    let unverifiedHeuristicsCount = 0;

    const detectorMap = new Map<
      string,
      {
        total: number;
        confirmed: number;
        potential: number;
        falsePositive: number;
        inconclusive: number;
        simulated: number;
      }
    >();

    const flaggedItems: GenuineAuditResult["flaggedItems"] = [];

    for (const f of findings) {
      const kind = f.provenance_kind || (f.is_simulated ? "Simulated" : "Live");
      if (kind === "Simulated" || f.is_simulated) {
        simulatedCount++;
      } else if (kind === "StaticAnalysis") {
        staticCount++;
      } else if (kind === "ExternalTool") {
        externalToolCount++;
      } else {
        liveCount++;
      }

      const det = f.source_tool || "BaselineScanner";
      const current = detectorMap.get(det) || {
        total: 0,
        confirmed: 0,
        potential: 0,
        falsePositive: 0,
        inconclusive: 0,
        simulated: 0,
      };

      current.total++;
      const st = (f.verification_status || f.status || "").toLowerCase();
      if (f.is_simulated || kind === "Simulated") {
        current.simulated++;
      } else if (st.includes("confirmed")) {
        current.confirmed++;
      } else if (st.includes("false") || st.includes("refuted")) {
        current.falsePositive++;
      } else if (st.includes("inconclusive") || st.includes("unconfirmed")) {
        current.inconclusive++;
      } else {
        current.potential++;
      }
      detectorMap.set(det, current);

      // Audit Heuristic Discrepancies
      const titleLower = f.title.toLowerCase();
      const evidenceLower = (f.evidence || "").toLowerCase();

      // Check 1: Missing security headers claiming XSS
      if (titleLower.includes("xss") || titleLower.includes("cross-site scripting")) {
        if (f.cwe === "CWE-79" && !evidenceLower.includes("<script") && !evidenceLower.includes("reflect") && evidenceLower.includes("header")) {
          unverifiedHeuristicsCount++;
          flaggedItems.push({
            findingId: f.id,
            title: f.title,
            reason: "Finding is classified as CWE-79 (XSS) but evidence only documents missing headers without active script reflection.",
            suggestedAction: "Reclassify to CWE-693 (Protection Mechanism Failure) or run an active XSS reflection probe.",
          });
        }
      }

      // Check 2: Simulated flag presence
      if (f.is_simulated || kind === "Simulated") {
        flaggedItems.push({
          findingId: f.id,
          title: f.title,
          reason: "Marked as Simulated / Demo finding. Provenance is synthetic fixture, not live target observation.",
          suggestedAction: "Isolate from production audits or verify against a live authorized target.",
        });
      }

      // Check 3: Findings missing any evidence string
      if (!f.evidence || f.evidence.trim().length === 0) {
        flaggedItems.push({
          findingId: f.id,
          title: f.title,
          reason: "Zero observation evidence stored in finding payload.",
          suggestedAction: "Mark Inconclusive until a live verification check captures real HTTP response headers or bodies.",
        });
      }
    }

    const detectorIntegrity: GenuineAuditResult["detectorIntegrity"] = [];
    detectorMap.forEach((data, detector) => {
      let verdict: GenuineAuditResult["detectorIntegrity"][0]["verdict"] = "Authentic Live";
      const detLower = detector.toLowerCase();

      if (data.simulated > 0 && data.simulated === data.total) {
        verdict = "Simulated Demo";
      } else if (detLower.includes("semgrep") || detLower.includes("bandit") || detLower.includes("flawfinder") || detLower.includes("gitleaks")) {
        verdict = "Static Matcher";
      } else if (detLower.includes("nuclei") || detLower.includes("sqlmap") || detLower.includes("nmap") || detLower.includes("zap") || detLower.includes("nikto")) {
        verdict = "Tool Subprocess";
      } else if (data.falsePositive > data.confirmed) {
        verdict = "Heuristic Gap";
      }

      detectorIntegrity.push({
        detector,
        ...data,
        verdict,
      });
    });

    return {
      totalFindings,
      liveCount,
      staticCount,
      externalToolCount,
      simulatedCount,
      unverifiedHeuristicsCount,
      detectorIntegrity,
      flaggedItems,
    };
  }

  /**
   * Redacts sensitive authorization tokens, cookies, passwords, and API keys.
   */
  public static sanitizeEvidence(raw: string): string {
    if (!raw) return "";
    return raw
      .replace(/(authorization:\s*(?:bearer|basic)\s+)[a-zA-Z0-9_\-\.\+/=]+/gi, "$1[REDACTED_AUTH_TOKEN]")
      .replace(/(["']?(?:password|passwd|api_key|token|secret|access_token|client_secret)["']?\s*(?:=|:)\s*["']?)[^"'\s&,;\}]+/gi, "$1[REDACTED_SECRET]")
      .replace(/(phpsessid|jsessionid|sessionid|connect\.sid|jwt|token)=[^;\s]+/gi, "$1=[REDACTED_COOKIE]");
  }
}
