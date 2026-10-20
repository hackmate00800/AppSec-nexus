import React, { useState, useEffect, useMemo } from "react";
import {
  Finding,
  Target,
  ValidationRecord,
  FindingDetectionTrace,
  ScanEvent,
  MethodologyDefinition,
} from "../../types";
import { invoke } from "@tauri-apps/api/core";
import {
  explainVulnerabilityForBeginner,
  BeginnerVulnerabilityExplanation,
} from "../../utils/vulnerabilityExplainer";
import {
  SeverityBadge,
  ValidationBadge,
  StatusBadge,
  ProvenanceBadge,
} from "../ui/Badge";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Terminal,
  Copy,
  Check,
  Search,
  Code2,
  Workflow,
  Loader2,
  Maximize2,
} from "lucide-react";

export interface FindingInlineDetailsAccordionProps {
  finding: Finding;
  target?: Target | null;
  onOpenMethodology?: (methodologyId: string) => void;
  onOpenAiMentor?: (prompt: string) => void;
  onValidateFinding?: (findingId: string) => Promise<ValidationRecord | void>;
  onFindingUpdated?: (finding: Finding) => void;
  onInspectFull?: () => void;
}

export const FindingInlineDetailsAccordion: React.FC<FindingInlineDetailsAccordionProps> = ({
  finding,
  target,
  onOpenMethodology,
  onOpenAiMentor,
  onValidateFinding,
  onFindingUpdated,
  onInspectFull,
}) => {
  // Trace and scan events state for this specific finding
  const [trace, setTrace] = useState<FindingDetectionTrace | null>(null);
  const [loadingTrace, setLoadingTrace] = useState<boolean>(true);
  const [methodology, setMethodology] = useState<MethodologyDefinition | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationRecord, setValidationRecord] = useState<ValidationRecord | null>(null);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);

  // Subsections toggle state: all 10 sections independently toggleable
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    location: true,
    evidence: true,
    detection: true,
    methodology: false,
    verification: true,
    risk: false,
    remediation: true,
    logs: false,
    ai_mentor: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const expandAllSections = () => {
    setOpenSections({
      summary: true,
      location: true,
      evidence: true,
      detection: true,
      methodology: true,
      verification: true,
      risk: true,
      remediation: true,
      logs: true,
      ai_mentor: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      summary: false,
      location: false,
      evidence: false,
      detection: false,
      methodology: false,
      verification: false,
      risk: false,
      remediation: false,
      logs: false,
      ai_mentor: false,
    });
  };

  // Beginner explanation synthesized deterministically from finding
  const explanation: BeginnerVulnerabilityExplanation = useMemo(() => {
    return explainVulnerabilityForBeginner(finding);
  }, [finding]);

  // Load detection trace and scan events specifically for this finding ID
  useEffect(() => {
    let isMounted = true;
    setLoadingTrace(true);

    invoke<FindingDetectionTrace>("get_finding_trace", { findingId: finding.id })
      .then((data) => {
        if (!isMounted) return;
        setTrace(data);
        if (data.verification_record) {
          setValidationRecord(data.verification_record);
        }
        if (data.scan_events && data.scan_events.length > 0) {
          setScanEvents(data.scan_events);
        }

        // Fetch methodology definition
        if (data.methodology_id) {
          invoke<MethodologyDefinition>("get_methodology_by_id", {
            id: data.methodology_id,
          })
            .then((m) => {
              if (isMounted) setMethodology(m);
            })
            .catch(() => {
              // Gracefully handle missing methodology definition
            });
        }
      })
      .catch((err) => {
        console.warn(`[FindingDetails] Trace load fallback for ${finding.id}:`, err);
      })
      .finally(() => {
        if (isMounted) setLoadingTrace(false);
      });

    // Also fetch scan events directly if not already in trace
    invoke<ScanEvent[]>("get_scan_events", { findingId: finding.id, limit: 50 })
      .then((events) => {
        if (isMounted && events && events.length > 0) {
          setScanEvents(events);
        }
      })
      .catch(() => {
        // Fallback for mock environments
      });

    return () => {
      isMounted = false;
    };
  }, [finding.id]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Handle live automated validation probe
  const handleRunValidation = async () => {
    setIsValidating(true);
    try {
      if (onValidateFinding) {
        const res = await onValidateFinding(finding.id);
        if (res) {
          setValidationRecord(res as ValidationRecord);
        }
      } else {
        const res = await invoke<ValidationRecord>("validate_finding", {
          findingId: finding.id,
        });
        if (res) {
          setValidationRecord(res);
          if (onFindingUpdated) {
            onFindingUpdated({
              ...finding,
              status: res.status as any,
              validation_status: res.status,
              confidence: res.confidence_score,
            });
          }
        }
      }
    } catch (err) {
      console.error("[FindingDetails] Validation probe failed:", err);
    } finally {
      setIsValidating(false);
    }
  };

  // Parse location details (distinguishing HTTP vs Source Code / File)
  const locationDetails = useMemo(() => {
    const rawAsset = finding.affected_asset || "";
    const isHttp =
      rawAsset.startsWith("http://") ||
      rawAsset.startsWith("https://") ||
      rawAsset.includes("/api/") ||
      rawAsset.includes("?");

    // Check if it's a source code path (contains extension or line number colon)
    const isSourceCode =
      rawAsset.includes(".ts") ||
      rawAsset.includes(".js") ||
      rawAsset.includes(".py") ||
      rawAsset.includes(".rs") ||
      rawAsset.includes(".go") ||
      rawAsset.includes(".java") ||
      rawAsset.includes(".json") ||
      rawAsset.includes(".yaml") ||
      rawAsset.includes(".yml") ||
      rawAsset.includes(".php");

    let parsedUrl = "";
    let endpoint = "";
    let queryParam = "";
    let method = "GET";
    let statusCode: string | number = "Not captured";
    let filePath = "";
    let lineNumber = "";

    if (isHttp) {
      try {
        const u = new URL(rawAsset.startsWith("http") ? rawAsset : `http://${rawAsset}`);
        parsedUrl = `${u.protocol}//${u.host}`;
        endpoint = u.pathname || "/";
        if (u.search) {
          const params = Array.from(u.searchParams.keys());
          queryParam = params.join(", ");
        }
      } catch {
        parsedUrl = target?.primary_url || rawAsset;
        endpoint = rawAsset;
      }

      // Check evidence for HTTP method and status code
      const ev = finding.evidence || "";
      const methodMatch = ev.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+([^\s]+)/m);
      if (methodMatch) {
        method = methodMatch[1];
        if (!endpoint || endpoint === "/") endpoint = methodMatch[2];
      }
      const statusMatch = ev.match(/HTTP\/[0-9.]+\s+([0-9]{3})/m);
      if (statusMatch) {
        statusCode = statusMatch[1];
      }
    } else if (isSourceCode || rawAsset.includes(":")) {
      const parts = rawAsset.split(":");
      filePath = parts[0];
      lineNumber = parts.length > 1 ? parts[1] : "1";
    } else {
      parsedUrl = target?.primary_url || "Target Application";
      endpoint = rawAsset;
    }

    return {
      isHttp,
      isSourceCode,
      rawAsset,
      parsedUrl,
      endpoint,
      queryParam,
      method,
      statusCode,
      filePath,
      lineNumber,
    };
  }, [finding.affected_asset, finding.evidence, target]);

  // Real sanitized evidence captured from target
  const realEvidence = useMemo(() => {
    const ev = (finding.evidence || trace?.raw_observed_result || "").trim();
    return ev;
  }, [finding.evidence, trace?.raw_observed_result]);

  return (
    <div
      className="finding-inline-details-accordion"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-accent)",
        borderRadius: "8px",
        margin: "8px 12px 14px 12px",
        padding: "16px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        color: "var(--text-main)",
      }}
      data-testid={`finding-details-dropdown-${finding.id}`}
    >
      {/* Accordion Top Control Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "var(--accent-cyan)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldCheck size={16} /> Detection Details & Real Target Trace
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "0.72rem",
              color: "var(--text-dim)",
              background: "var(--bg-secondary)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            ID: {finding.id}
          </span>
          <ProvenanceBadge
            type="detected_by"
            detail={`${finding.source_tool} ${finding.tool_version ? (finding.tool_version.startsWith("v") ? finding.tool_version : `v${finding.tool_version}`) : ""}`.trim()}
          />
          {finding.validation_status === "Confirmed" ? (
            <ProvenanceBadge type="observed" detail="Validated True Positive" />
          ) : (
            <ProvenanceBadge type="not_verified" detail={finding.validation_status || "Needs Validation"} />
          )}
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={expandAllSections}
            style={{ padding: "3px 8px", fontSize: "0.7rem" }}
            title="Expand all 10 subsections"
          >
            Expand All
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={collapseAllSections}
            style={{ padding: "3px 8px", fontSize: "0.7rem" }}
            title="Collapse all subsections"
          >
            Collapse All
          </button>
          {onInspectFull && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onInspectFull}
              style={{
                padding: "3px 8px",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                borderColor: "var(--accent-cyan)",
                color: "var(--accent-cyan)",
              }}
              title="Open full dedicated vulnerability view with live AI studio and timeline"
            >
              <Maximize2 size={11} />
              <span>Full Page Inspector</span>
            </button>
          )}
        </div>
      </div>

      {loadingTrace && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-dim)",
            fontSize: "0.75rem",
            padding: "4px 0",
          }}
        >
          <Loader2 size={13} className="animate-spin" color="var(--accent-cyan)" />
          <span>Synchronizing deterministic target trace and scan execution events...</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: FINDING SUMMARY
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("summary")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.summary}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              1. Finding Summary
            </span>
            <ProvenanceBadge type="observed" detail="Target State" />
            <ProvenanceBadge type="detected_by" detail={finding.source_tool} />
          </div>
          {openSections.summary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.summary && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                  {finding.title}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  {trace?.human_explanation ||
                    `AppSec identified ${finding.title} during automated security inspection by ${finding.source_tool}.`}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <SeverityBadge severity={finding.severity} size="sm" />
                <ValidationBadge status={finding.validation_status || finding.status} confidence={finding.confidence} size="sm" />
                <StatusBadge status={finding.status} size="sm" />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "8px",
                padding: "8px",
                background: "var(--bg-primary)",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Confidence Rating</span>
                <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{finding.confidence}% Deterministic</span>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Detected Timestamp</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.72rem" }}>
                  {new Date(finding.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Scanner Rule ID</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--accent-emerald)" }}>
                  {trace?.rule_id || finding.cwe || "Heuristic-Rule"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Source Tool & Version</span>
                <span style={{ fontSize: "0.75rem" }}>
                  {finding.source_tool} ({finding.tool_version || "latest"})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: AFFECTED LOCATION
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("location")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.location}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              2. Affected Location
            </span>
            <ProvenanceBadge type="observed" detail={locationDetails.isSourceCode ? "File/Code" : "Endpoint"} />
          </div>
          {openSections.location ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.location && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            {locationDetails.isSourceCode ? (
              // Source code / File finding layout
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    Source File:
                  </span>
                  <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)", wordBreak: "break-all" }}>
                    {locationDetails.filePath || locationDetails.rawAsset}
                  </span>
                  <ProvenanceBadge type="observed" />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    Line Number:
                  </span>
                  <span style={{ fontFamily: "monospace", color: "var(--accent-amber)" }}>
                    {locationDetails.lineNumber ? `Line ${locationDetails.lineNumber}` : "Not captured"}
                  </span>
                  <ProvenanceBadge type="observed" />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    Component Type:
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Source Code / Static Analysis
                  </span>
                  <ProvenanceBadge type="inferred" />
                </div>
              </div>
            ) : (
              // HTTP / Web Endpoint finding layout
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    Target Host/URL:
                  </span>
                  <span style={{ fontFamily: "monospace", color: "var(--text-main)", wordBreak: "break-all" }}>
                    {locationDetails.parsedUrl || target?.primary_url || "Not captured"}
                  </span>
                  <ProvenanceBadge type="observed" />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    Endpoint / Route:
                  </span>
                  <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)", wordBreak: "break-all" }}>
                    {locationDetails.endpoint || locationDetails.rawAsset}
                  </span>
                  <ProvenanceBadge type="observed" />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    HTTP Method:
                  </span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {locationDetails.method}
                  </span>
                  <ProvenanceBadge type="observed" />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    HTTP Status Code:
                  </span>
                  <span style={{ fontFamily: "monospace", color: "var(--accent-amber)" }}>
                    {locationDetails.statusCode}
                  </span>
                  <ProvenanceBadge type="observed" />
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>
                    Affected Parameter:
                  </span>
                  <span style={{ fontFamily: "monospace", color: locationDetails.queryParam ? "var(--accent-rose)" : "var(--text-dim)" }}>
                    {locationDetails.queryParam ? `Parameter '${locationDetails.queryParam}'` : "Not captured (Path or Header level issue)"}
                  </span>
                  {locationDetails.queryParam ? <ProvenanceBadge type="observed" /> : <ProvenanceBadge type="inferred" />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 3: ACTUAL EVIDENCE
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("evidence")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.evidence}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              3. Actual Evidence
            </span>
            <ProvenanceBadge type="observed" detail="Raw Scanner Artifact" />
          </div>
          {openSections.evidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.evidence && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Sanitized evidence payload captured from target during scan execution:
              </span>
              {realEvidence && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => copyToClipboard(realEvidence, "evidence")}
                  style={{ padding: "2px 6px", fontSize: "0.68rem", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  {copiedKey === "evidence" ? <Check size={11} color="var(--accent-emerald)" /> : <Copy size={11} />}
                  <span>{copiedKey === "evidence" ? "Copied" : "Copy Evidence"}</span>
                </button>
              )}
            </div>

            {realEvidence ? (
              <pre
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "10px",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "var(--accent-cyan)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  overflowWrap: "anywhere",
                  maxHeight: "220px",
                  maxWidth: "100%",
                  overflowX: "auto",
                  overflowY: "auto",
                  margin: 0,
                }}
              >
                {realEvidence}
              </pre>
            ) : (
              <div
                style={{
                  padding: "12px",
                  background: "var(--bg-primary)",
                  border: "1px dashed var(--border-color)",
                  borderRadius: "4px",
                  color: "var(--text-dim)",
                  fontStyle: "italic",
                  fontSize: "0.75rem",
                  textAlign: "center",
                }}
              >
                Not captured: Scanner tool output did not return raw HTTP stream or code payload.
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 4: HOW APPSEC DETECTED IT
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("detection")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.detection}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              4. How AppSec Detected It
            </span>
            <ProvenanceBadge type="detected_by" detail="3-Layer Trace" />
          </div>
          {openSections.detection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.detection && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Layer 1: What was executed */}
            <div
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Terminal size={13} color="#60a5fa" />
                <span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--text-main)" }}>
                  Layer 1: What the Scanner Actually Executed
                </span>
                <ProvenanceBadge type="detected_by" detail={finding.source_tool} />
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                {trace?.check_performed ||
                  `Executed ${finding.source_tool} with automated non-destructive test probe against target '${finding.affected_asset}'`}
              </div>
            </div>

            {/* Layer 2: What was observed */}
            <div
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Search size={13} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--text-main)" }}>
                  Layer 2: What the Scanner Observed
                </span>
                <ProvenanceBadge type="observed" />
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {realEvidence ? (
                  <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>
                    {realEvidence.slice(0, 300)}
                    {realEvidence.length > 300 ? "..." : ""}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
                    Observation pattern matched signature rule in target response.
                  </span>
                )}
              </div>
            </div>

            {/* Layer 3: Analytical deduction */}
            <div
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Workflow size={13} color="#a855f7" />
                <span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--text-main)" }}>
                  Layer 3: Analytical Deduction
                </span>
                <ProvenanceBadge type="inferred" />
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {trace?.human_explanation ||
                  `Inferred vulnerability class ${finding.cwe || finding.title} based on observed payload reflection and lack of defensive controls.`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 5: METHODOLOGY & TOOL
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("methodology")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.methodology}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              5. Methodology & Tool
            </span>
            <ProvenanceBadge type="inferred" detail="Framework Mapping" />
          </div>
          {openSections.methodology ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.methodology && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Tool & Engine</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {finding.source_tool} ({finding.tool_version || "latest"})
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Methodology Framework</span>
                <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                  {methodology?.name || trace?.methodology_name || "Deterministic Rule Evaluation"}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem", display: "block" }}>Methodology ID</span>
                <span style={{ fontFamily: "monospace", color: "var(--accent-purple)", fontSize: "0.72rem" }}>
                  {methodology?.id || trace?.methodology_id || "METH-SEC-EVAL"}
                </span>
              </div>
            </div>

            {/* Limitations */}
            <div style={{ marginTop: "4px" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>
                Known Methodology Limitations & Caveats:
              </span>
              <ul style={{ margin: "4px 0 0 16px", padding: 0, color: "var(--text-muted)", fontSize: "0.72rem" }}>
                {(methodology?.known_limitations || trace?.limitations || [
                  "Automated signature tests may produce false positives on non-standard framework outputs.",
                  "Absence of reflection does not completely rule out out-of-band execution.",
                ]).map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>

            {onOpenMethodology && (methodology?.id || trace?.methodology_id) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onOpenMethodology(methodology?.id || trace?.methodology_id || "")}
                style={{
                  alignSelf: "flex-start",
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "4px",
                }}
              >
                <BookOpen size={12} color="var(--accent-cyan)" />
                <span>Explore Full Methodology in Explorer</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 6: VERIFICATION RESULTS
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("verification")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.verification}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              6. Verification Results
            </span>
            {validationRecord?.status === "Confirmed" || finding.validation_status === "Confirmed" ? (
              <ProvenanceBadge type="observed" detail="Confirmed" />
            ) : (
              <ProvenanceBadge type="not_verified" detail={finding.validation_status || "Needs Validation"} />
            )}
          </div>
          {openSections.verification ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.verification && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Verification Status:</span>
                <ValidationBadge
                  status={validationRecord?.status || finding.validation_status || finding.status}
                  confidence={validationRecord?.confidence_score ?? finding.confidence}
                  size="sm"
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isValidating}
                onClick={handleRunValidation}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.7rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderColor: "var(--accent-emerald)",
                  color: "var(--accent-emerald)",
                }}
                title="Execute safe non-destructive automated verification probe"
              >
                {isValidating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <ShieldCheck size={12} />
                )}
                <span>{isValidating ? "Validating..." : "Run Independent Verification"}</span>
              </button>
            </div>

            {validationRecord ? (
              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Test Method: </span>
                  <span style={{ fontFamily: "monospace", color: "var(--text-main)" }}>
                    {validationRecord.test_method}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Hypothesis: </span>
                  <span style={{ color: "var(--text-muted)" }}>{validationRecord.hypothesis}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Expected Observation: </span>
                  <span style={{ color: "var(--text-muted)" }}>{validationRecord.expected_observation}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Actual Target Observation: </span>
                  <span style={{ color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                    {validationRecord.actual_observation}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-dim)" }}>Confidence Rationale: </span>
                  <span style={{ color: "var(--text-muted)" }}>{validationRecord.confidence_rationale}</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-primary)",
                  padding: "8px",
                  borderRadius: "4px",
                  color: "var(--text-dim)",
                  fontStyle: "italic",
                  fontSize: "0.72rem",
                }}
              >
                No independent validation probe recorded yet for this finding. Click "Run Independent Verification" above to dispatch a safe, scoped probe.
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 7: RISK & IMPACT
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("risk")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.risk}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              7. Risk & Impact
            </span>
            <ProvenanceBadge type="inferred" detail="Threat Modeling" />
          </div>
          {openSections.risk ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.risk && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ color: "var(--text-dim)", width: "110px", fontSize: "0.75rem" }}>CWE Classification:</span>
              <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)", fontWeight: 600 }}>
                {finding.cwe || "CWE-Unassigned"}
              </span>
              <ProvenanceBadge type="inferred" />
            </div>

            <div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>
                Realistic Severity Justification:
              </span>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {explanation.confidenceRationale ||
                  `Assigned ${finding.severity} severity based on asset exposure (${finding.affected_asset}) and potential impact on confidentiality and data integrity.`}
              </div>
            </div>

            <div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>
                Potential Attacker Action:
              </span>
              <div style={{ color: "var(--accent-rose)", fontSize: "0.75rem" }}>
                {explanation.whatAttackerCouldDo}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 8: HOW TO FIX IT
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("remediation")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.remediation}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              8. How to Fix It
            </span>
            <ProvenanceBadge type="inferred" detail="Engineering Remediation" />
          </div>
          {openSections.remediation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.remediation && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block", marginBottom: "3px" }}>
                Primary Actionable Fix:
              </span>
              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "8px 10px",
                  color: "var(--text-main)",
                  fontSize: "0.75rem",
                }}
              >
                {finding.remediation || explanation.remediation.primaryFix}
              </div>
            </div>

            <div>
              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block", marginBottom: "3px" }}>
                Safe Retest / Verification Step:
              </span>
              <div
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "8px 10px",
                  fontFamily: "monospace",
                  color: "var(--accent-emerald)",
                  fontSize: "0.72rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  overflowWrap: "anywhere",
                  maxWidth: "100%",
                }}
              >
                {explanation.remediation.safeRetestProcedure ||
                  `curl -i -s "${finding.affected_asset}" | grep -i "${finding.title}"`}
              </div>
            </div>

            {explanation.remediation.pitfalls && explanation.remediation.pitfalls.length > 0 && (
              <div>
                <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", fontWeight: 600 }}>
                  Common Pitfalls to Avoid:
                </span>
                <ul style={{ margin: "2px 0 0 16px", padding: 0, color: "var(--accent-amber)", fontSize: "0.72rem" }}>
                  {explanation.remediation.pitfalls.map((pitfall, i) => (
                    <li key={i}>{pitfall}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 9: SCAN LOGS
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("logs")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.logs}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              9. Scan Logs
            </span>
            <ProvenanceBadge type="observed" detail={`${scanEvents.length} Events`} />
          </div>
          {openSections.logs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.logs && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
                Chronological execution logs associated with this finding:
              </span>
              {scanEvents.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    copyToClipboard(
                      scanEvents.map((e) => `[${e.timestamp}] [${e.component_or_tool}] ${e.message}`).join("\n"),
                      "logs"
                    )
                  }
                  style={{ padding: "2px 6px", fontSize: "0.68rem", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  {copiedKey === "logs" ? <Check size={11} color="var(--accent-emerald)" /> : <Copy size={11} />}
                  <span>{copiedKey === "logs" ? "Copied" : "Copy Logs"}</span>
                </button>
              )}
            </div>

            {scanEvents.length > 0 ? (
              <div
                style={{
                  maxHeight: "160px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  padding: "6px",
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                }}
              >
                {scanEvents.map((ev) => (
                  <div key={ev.id} style={{ display: "flex", gap: "6px" }}>
                    <span style={{ color: "var(--text-dim)" }}>
                      [{new Date(ev.timestamp).toLocaleTimeString()}]
                    </span>
                    <span style={{ color: "var(--accent-cyan)" }}>[{ev.component_or_tool}]</span>
                    <span style={{ color: "var(--text-main)" }}>{ev.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "10px",
                  background: "var(--bg-primary)",
                  border: "1px dashed var(--border-color)",
                  borderRadius: "4px",
                  color: "var(--text-dim)",
                  fontStyle: "italic",
                  fontSize: "0.72rem",
                  textAlign: "center",
                }}
              >
                No discrete scan events recorded for this finding ID.
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 10: AI MENTOR EXPLANATION
          ========================================================================= */}
      <div
        className="accordion-subsection"
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => toggleSection("ai_mentor")}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-main)",
            textAlign: "left",
          }}
          aria-expanded={openSections.ai_mentor}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
              10. AI Mentor Explanation
            </span>
            <ProvenanceBadge type="ai_explanation" detail="Grounded in Real Scan Data" />
          </div>
          {openSections.ai_mentor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openSections.ai_mentor && (
          <div style={{ padding: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                background: "var(--bg-primary)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "4px",
                padding: "10px",
                fontSize: "0.78rem",
                color: "var(--text-main)",
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", color: "var(--accent-amber)" }}>
                <Sparkles size={14} />
                <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>
                  Beginner-Friendly Finding Breakdown:
                </span>
              </div>
              <p style={{ margin: "0 0 6px 0" }}>
                {explanation.whatIsIt}
              </p>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.75rem" }}>
                <strong>Why it matters on this target: </strong>
                {explanation.whyItHappens}
              </p>
            </div>

            {onOpenAiMentor && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    onOpenAiMentor(
                      `Explain '${finding.title}' detected on '${finding.affected_asset}' by ${finding.source_tool} in plain English. Evidence: ${realEvidence || "Observed"}.`
                    )
                  }
                  style={{ padding: "3px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Sparkles size={11} color="var(--accent-amber)" />
                  <span>Explain Simply</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    onOpenAiMentor(
                      `What is the technical root cause of '${finding.title}' on '${finding.affected_asset}', and how should developers fix it?`
                    )
                  }
                  style={{ padding: "3px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Code2 size={11} color="var(--accent-cyan)" />
                  <span>Root Cause</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    onOpenAiMentor(
                      `How can I safely reproduce and observe '${finding.title}' in an isolated local lab? Target was ${finding.affected_asset}.`
                    )
                  }
                  style={{ padding: "3px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                >
                  <Terminal size={11} color="var(--accent-emerald)" />
                  <span>Reproduce in Local Lab</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
