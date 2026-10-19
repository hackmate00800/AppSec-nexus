import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Layers,
  Wrench,
  CheckCircle2,
  Play,
  Sparkles,
  ExternalLink,
  FileCheck,
  Copy,
  Check,
  Download,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Power,
  Terminal,
  Upload,
  Code2,
  X,
  ArrowRight,
  Activity,
} from "lucide-react";
import { CategoryAssessmentWorkspace } from "../components/assessments/CategoryAssessmentWorkspace";
import {
  SecurityCategory,
  CategoryVerificationStatus,
  CategoryValidationResult,
} from "./types";
import { getCategoryDefinition } from "./registry";
import { getCategoryIcon } from "./CategorySelector";
import { dispatchCategoryValidation } from "./validationRules";
import {
  Target,
  Finding,
  ToolAdapterMetadata,
  ToolHealthCheckResult,
  AdapterOutput,
  WorkflowJob,
} from "../types";

export interface CategoryWorkflowViewProps {
  category: SecurityCategory;
  targets?: Target[];
  selectedTarget?: Target | null;
  onSelectTarget?: (target: Target) => void;
  findings?: Finding[];
  onFindingsAdded?: (newFindings: Finding[]) => void;
  onLaunchAiMentor?: (initialPrompt?: string) => void;
  onOpenChecklists?: () => void;
  onNavigateToOrchestration?: () => void;
  onNavigateToFindings?: () => void;
}

export const CategoryWorkflowView: React.FC<CategoryWorkflowViewProps> = ({
  category,
  targets = [],
  selectedTarget = null,
  onSelectTarget,
  findings = [],
  onFindingsAdded,
  onLaunchAiMentor,
  onOpenChecklists,
  onNavigateToOrchestration,
  onNavigateToFindings,
}) => {
  const catDef = getCategoryDefinition(category);
  const [activeTab, setActiveTab] = useState<"assessment" | "methodology" | "tools" | "validator" | "ai">("methodology");

  // Active target resolution
  const [currentTargetId, setCurrentTargetId] = useState<string>(
    selectedTarget?.id || (targets[0]?.id ?? "")
  );

  useEffect(() => {
    if (selectedTarget?.id) {
      setCurrentTargetId(selectedTarget.id);
    } else if (targets.length > 0 && !currentTargetId) {
      setCurrentTargetId(targets[0].id);
    }
  }, [selectedTarget, targets]);

  const activeTargetObj = targets.find((t) => t.id === currentTargetId) || selectedTarget || targets[0];

  // Tool adapters state
  const [adapters, setAdapters] = useState<ToolAdapterMetadata[]>([]);
  const [loadingAdapters, setLoadingAdapters] = useState(false);
  const [togglingTools, setTogglingTools] = useState<Record<string, boolean>>({});
  const [healthResults, setHealthResults] = useState<Record<string, ToolHealthCheckResult>>({});
  const [testingHealth, setTestingHealth] = useState<Record<string, boolean>>({});

  // Tool Execution Modal
  const [executingTool, setExecutingTool] = useState<ToolAdapterMetadata | null>(null);
  const [execTargetUrl, setExecTargetUrl] = useState<string>("");
  const [execParams, setExecParams] = useState<Record<string, string>>({});
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [toolExecOutput, setToolExecOutput] = useState<AdapterOutput | null>(null);
  const [toolExecError, setToolExecError] = useState<string | null>(null);

  // Workflow Pipeline Runner State
  const [isLaunchingPipeline, setIsLaunchingPipeline] = useState(false);
  const [activePipelineJob, setActivePipelineJob] = useState<WorkflowJob | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // OpenAPI / Postman Importer State (API category)
  const [apiSpecText, setApiSpecText] = useState("");
  const [parsedEndpoints, setParsedEndpoints] = useState<Array<{ method: string; path: string; summary?: string }>>([]);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Interactive Validation Workbench State
  const [selectedFindingToValidate, setSelectedFindingToValidate] = useState<string>("");
  const [testFindingTitle, setTestFindingTitle] = useState(
    category === "web"
      ? "SQL Injection in User Search Parameter"
      : category === "api"
      ? "BOLA in Customer Invoice Retrieval Endpoint"
      : category === "os"
      ? "Enabled SeImpersonatePrivilege on IIS Service Account"
      : category === "software"
      ? "Insecure Deserialization via pickle.loads"
      : category === "android"
      ? "Exported TransferActivity Without Permissions"
      : category === "desktop"
      ? "Missing ASLR and DEP Exploit Mitigations"
      : category === "network"
      ? "Cleartext Telnet Service Exposed on Port 23"
      : category === "lab"
      ? "Non-Destructive Target Lab Validation Probe"
      : "S3 Storage Bucket with Public Read Access"
  );
  const [testAsset, setTestAsset] = useState(
    activeTargetObj?.primary_url || "https://staging.internal.corp/api/v2"
  );
  const [testEvidence, setTestEvidence] = useState(
    category === "web"
      ? "HTTP 500: syntax error in SQL statement near '1''"
      : category === "api"
      ? 'HTTP/1.1 200 OK\nContent-Type: application/json\n{"account_id": "9842", "email": "victim@corp.com", "balance": 450000}'
      : category === "os"
      ? "Privilege Name: SeImpersonatePrivilege, State: Enabled"
      : category === "software"
      ? "data = pickle.loads(untrusted_stream.read())"
      : category === "android"
      ? '<activity android:name=".TransferActivity" android:exported="true" />'
      : category === "desktop"
      ? "DYNAMICBASE: false, NXCOMPAT: false"
      : category === "network"
      ? "Port 23/tcp open telnet Linux telnetd"
      : category === "lab"
      ? "Diagnostic HTTP 200 check: Target lab host responsive and within authorized scope"
      : '{"Effect": "Allow", "Principal": "*", "Action": "s3:GetObject"}'
  );
  const [validationResult, setValidationResult] = useState<CategoryValidationResult | null>(null);
  const [copiedRetest, setCopiedRetest] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveNotice, setStatusSaveNotice] = useState<string | null>(null);

  // Fetch real tool adapters from Tauri
  const loadAdapters = async () => {
    setLoadingAdapters(true);
    try {
      const data = await invoke<ToolAdapterMetadata[]>("get_tool_adapters");
      setAdapters(data);
    } catch {
      // In web fallback or testing, adapters state remains empty or mocked
    } finally {
      setLoadingAdapters(false);
    }
  };

  useEffect(() => {
    loadAdapters();
  }, [category]);

  // When active target changes, update affected asset in workbench
  useEffect(() => {
    if (activeTargetObj?.primary_url) {
      setTestAsset(activeTargetObj.primary_url);
    }
  }, [activeTargetObj]);

  // Map category to relevant tool IDs
  const getCategoryToolIds = (cat: SecurityCategory): string[] => {
    switch (cat) {
      case "web":
        return ["nuclei", "katana", "ffuf", "baseline", "burpsuite", "owasp_zap", "sqlmap"];
      case "api":
        return ["schemathesis", "httpx", "ffuf", "baseline", "burpsuite"];
      case "software":
        return ["semgrep", "gitleaks", "osv_scanner"];
      case "network":
        return ["nmap", "tshark", "wireshark"];
      case "cloud":
        return ["checkov", "trivy", "docker"];
      case "android":
        return ["jadx"];
      case "desktop":
        return ["baseline", "semgrep"];
      case "os":
        return ["baseline", "semgrep", "tshark"];
      case "lab":
        return ["nuclei", "httpx", "sqlmap", "burpsuite"];
      default:
        return [];
    }
  };

  // Associated workflow ID for each category
  const getCategoryWorkflowId = (cat: SecurityCategory): string => {
    switch (cat) {
      case "web":
        return "wf_web_pipeline";
      case "api":
        return "wf_api_pipeline";
      case "software":
        return "wf_software_pipeline";
      case "network":
        return "wf_network_pipeline";
      case "cloud":
        return "wf_cloud_pipeline";
      case "android":
        return "wf_android_pipeline";
      case "lab":
        return "wf_lab_pipeline";
      default:
        return "wf_full_audit";
    }
  };

  const relevantAdapters = adapters.filter((a) =>
    getCategoryToolIds(category).includes(a.id)
  );

  // Health Test Handler
  const handleTestHealth = async (toolId: string) => {
    setTestingHealth((prev) => ({ ...prev, [toolId]: true }));
    try {
      const res = await invoke<ToolHealthCheckResult>("test_tool_health", { toolId });
      setHealthResults((prev) => ({ ...prev, [toolId]: res }));
    } catch (err: any) {
      setHealthResults((prev) => ({
        ...prev,
        [toolId]: {
          healthy: false,
          detection_state: "health_check_failed" as any,
          detected_version: undefined,
          message: String(err),
          checked_at: new Date().toISOString(),
          latency_ms: 0,
        },
      }));
    } finally {
      setTestingHealth((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  // Enable/Disable Toggle Handler
  const handleToggleEnabled = async (toolId: string, currentEnabled: boolean) => {
    setTogglingTools((prev) => ({ ...prev, [toolId]: true }));
    try {
      const newEnabled = !currentEnabled;
      await invoke("toggle_tool_adapter_enabled", { toolId, enabled: newEnabled });
      setAdapters((prev) =>
        prev.map((a) => (a.id === toolId ? { ...a, is_enabled: newEnabled } : a))
      );
    } catch {
      // Toggle error handled gracefully
    } finally {
      setTogglingTools((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  // Open Tool Execution Modal
  const openToolRunModal = (tool: ToolAdapterMetadata) => {
    setExecutingTool(tool);
    setExecTargetUrl(activeTargetObj?.primary_url || "https://example.com");
    setExecParams({});
    setToolExecOutput(null);
    setToolExecError(null);
  };

  // Run Individual Tool
  const handleExecuteTool = async () => {
    if (!executingTool) return;
    setIsExecutingTool(true);
    setToolExecOutput(null);
    setToolExecError(null);

    try {
      const out = await invoke<AdapterOutput>("execute_orchestration_tool", {
        toolId: executingTool.id,
        input: {
          target_id: activeTargetObj?.id || "temp-target",
          target_url: execTargetUrl,
          parameters: execParams,
          timeout_seconds: 60,
        },
      });
      setToolExecOutput(out);
      if (out.findings && out.findings.length > 0 && onFindingsAdded) {
        onFindingsAdded(out.findings);
      }
    } catch (err: any) {
      setToolExecError(String(err));
    } finally {
      setIsExecutingTool(false);
    }
  };

  // Execute Category Pipeline
  const handleLaunchCategoryPipeline = async () => {
    const wfId = getCategoryWorkflowId(category);
    const targetUrl = activeTargetObj?.primary_url || "https://example.com";
    const targetId = activeTargetObj?.id || "temp-target";

    setIsLaunchingPipeline(true);
    setPipelineError(null);
    setActivePipelineJob(null);

    try {
      const job = await invoke<WorkflowJob>("start_workflow_job", {
        workflowId: wfId,
        targetId,
        targetUrl,
      });
      setActivePipelineJob(job);
    } catch (err: any) {
      setPipelineError(String(err));
    } finally {
      setIsLaunchingPipeline(false);
    }
  };

  // Parse OpenAPI / Postman spec
  const handleParseApiSpec = (overrideText?: string) => {
    try {
      let source = typeof overrideText === "string" ? overrideText : apiSpecText;
      if (!source) {
        const el = document.querySelector<HTMLTextAreaElement>('textarea[data-testid="textarea-api-spec"]');
        if (el?.value) source = el.value;
      }
      if (!source || !source.trim()) {
        setImportNotice("Please paste an OpenAPI JSON or Postman collection.");
        return;
      }
      const data = JSON.parse(source);
      const routes: Array<{ method: string; path: string; summary?: string }> = [];

      // Check if OpenAPI v3 or Swagger v2
      if (data.paths) {
        for (const [path, methods] of Object.entries(data.paths)) {
          if (typeof methods === "object" && methods !== null) {
            for (const [method, details] of Object.entries(methods as any)) {
              if (["get", "post", "put", "delete", "patch", "options", "head"].includes(method.toLowerCase())) {
                routes.push({
                  method: method.toUpperCase(),
                  path,
                  summary: (details as any).summary || (details as any).description,
                });
              }
            }
          }
        }
      }
      // Check if Postman Collection v2.1
      else if (data.item && Array.isArray(data.item)) {
        const parseItems = (items: any[]) => {
          for (const item of items) {
            if (item.request) {
              const method = item.request.method || "GET";
              const rawUrl = typeof item.request.url === "string" ? item.request.url : item.request.url?.raw || "/";
              routes.push({
                method,
                path: rawUrl,
                summary: item.name,
              });
            }
            if (item.item && Array.isArray(item.item)) {
              parseItems(item.item);
            }
          }
        };
        parseItems(data.item);
      }

      if (routes.length > 0) {
        setParsedEndpoints(routes);
        setImportNotice(`Successfully parsed ${routes.length} API endpoints from spec.`);
      } else {
        setImportNotice("No recognizable OpenAPI paths or Postman request items found in JSON.");
      }
    } catch {
      setImportNotice("Invalid JSON format. Please ensure valid OpenAPI JSON or Postman Collection format.");
    }
  };

  // File drop/upload for API spec
  const handleSpecFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setApiSpecText(text);
      };
      reader.readAsText(file);
    }
  };

  // Run validation workbench
  const handleRunValidation = () => {
    const res = dispatchCategoryValidation(category, {
      findingTitle: testFindingTitle,
      affectedAsset: testAsset,
      rawEvidence: testEvidence,
    });
    setValidationResult(res);
  };

  // Select existing finding to populate workbench
  const handleSelectFinding = (findingId: string) => {
    setSelectedFindingToValidate(findingId);
    const f = findings.find((item) => item.id === findingId);
    if (f) {
      setTestFindingTitle(f.title);
      setTestAsset(f.affected_asset);
      setTestEvidence(f.evidence || "No evidence recorded");
      setValidationResult(null);
    }
  };

  // Save verification status back to SQLite
  const handleSaveVerificationStatus = async () => {
    if (!selectedFindingToValidate || !validationResult) return;
    setSavingStatus(true);
    setStatusSaveNotice(null);

    try {
      const statusMap: Record<CategoryVerificationStatus, string> = {
        Confirmed: "Confirmed",
        Likely: "LikelyTruePositive",
        Potential: "NeedsReview",
        "False Positive": "FalsePositive",
        "Needs Manual Review": "NeedsReview",
        "Not Tested": "NeedsValidation",
      };
      const dbStatus = statusMap[validationResult.status] || "NeedsReview";

      await invoke("update_finding_status", {
        findingId: selectedFindingToValidate,
        status: dbStatus,
      });
      setStatusSaveNotice(`Successfully updated finding status to '${dbStatus}' in database.`);
    } catch (err: any) {
      setStatusSaveNotice(`Failed to update finding status: ${String(err)}`);
    } finally {
      setSavingStatus(false);
    }
  };

  // Export Comprehensive Category Assessment Report
  const handleExportCategoryReport = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    const targetUrl = activeTargetObj?.primary_url || "N/A";
    const allowedHosts = activeTargetObj?.scope.allowed_hosts?.join(", ") || "All Target Subdomains";
    const allowedPorts = activeTargetObj?.scope.allowed_ports?.join(", ") || "80, 443, 8080";

    const reportContent = `# AppSec Nexus — Category Security Assessment Report
**Security Domain:** ${catDef.name} (${catDef.shortLabel})
**Generated:** ${new Date().toUTCString()}
**Assessment Status:** COMPLETED
**Target Asset:** ${targetUrl}
**Authorized Scoping:**
- Primary URL: ${targetUrl}
- Allowed Hosts: ${allowedHosts}
- Allowed Ports: ${allowedPorts}
- Local Lab Permitted: ${activeTargetObj?.scope.allow_local_lab ? "Yes" : "No"}

---

## 1. Executive Summary & Standards Compliance
The **${catDef.name}** assessment was conducted per authoritative cybersecurity frameworks:
${catDef.standards.map((s) => `- **${s}**`).join("\n")}

${catDef.description}

---

## 2. Assessment Methodology & Checklist Execution
The security evaluation completed the following phases:
${catDef.methodologyPhases.map((phase, idx) => `### Phase ${idx + 1}: ${phase}`).join("\n\n")}

### Detailed Testing Steps:
${catDef.methodologySteps
  .map(
    (s) =>
      `#### Step ${s.stepNumber}: ${s.title} (${s.phase})
- **Description:** ${s.description}
- **Recommended Toolchain:** ${s.recommendedTools.join(", ")}
- **Verification Criteria:** ${s.verificationCriteria}
- **Common Weaknesses Audited:** ${s.commonWeaknesses.join(", ")}
`
  )
  .join("\n")}

---

## 3. Toolchain Ecosystem & Host Telemetry
The following security tools were evaluated and orchestrated for this assessment:
${catDef.tools
  .map(
    (t) =>
      `- **${t.name}** [${t.isAvailable ? "Ready" : "CLI/Adapter"}]
  - Command: \`${t.commandTemplate}\`
  - Documentation: ${t.documentationUrl}`
  )
  .join("\n")}

---

## 4. Category Findings & Verification Status
Total Findings Cataloged in Scope: ${findings.length}
${
  findings.length > 0
    ? findings
        .map(
          (f, idx) =>
            `### Finding #${idx + 1}: ${f.title}
- **Severity:** ${f.severity}
- **Affected Asset:** ${f.affected_asset}
- **CWE:** ${f.cwe || "N/A"}
- **Status:** ${f.status}
- **Validation Status:** ${f.validation_status || "Evaluated"}
- **Remediation:** ${f.remediation}
`
        )
        .join("\n")
    : "_No critical vulnerabilities discovered in scope._"
}

---

## 5. Category AI Mentor Strategic Recommendations
- **Domain Specialty:** ${catDef.aiPersona.specialty}
- **Governance Guidance:** Ensure all verified findings are remediated within SLA windows (Critical: 24h, High: 7d, Medium: 30d).
- **Retesting Policy:** Re-execute the specialized verification checks upon pull-request merge to validate remediation effectiveness.

*Report compiled by AppSec Nexus Category-Specific Intelligence Engine.*
`;

    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AppSec_${category.toUpperCase()}_Assessment_Report_${dateStr}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeColor = (status: CategoryVerificationStatus) => {
    switch (status) {
      case "Confirmed":
        return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.4)" };
      case "Likely":
        return { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.4)" };
      case "Potential":
        return { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308", border: "rgba(234, 179, 8, 0.4)" };
      case "False Positive":
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)" };
      case "Needs Manual Review":
        return { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "rgba(168, 85, 247, 0.4)" };
      case "Not Tested":
      default:
        return { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.4)" };
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "16px 20px",
        backgroundColor: "var(--bg-card)",
        borderRadius: 12,
        border: `1px solid ${catDef.color}33`,
        boxShadow: `0 4px 20px ${catDef.color}11`,
      }}
      data-testid={`category-workflow-${category}`}
    >
      {/* Category Banner Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: catDef.gradient,
              border: `1px solid ${catDef.color}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getCategoryIcon(catDef.iconName, 26, catDef.color)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {catDef.name}
              </h2>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: `${catDef.color}22`,
                  color: catDef.color,
                  fontWeight: 600,
                  border: `1px solid ${catDef.color}44`,
                }}
              >
                Specialized Engine Active
              </span>
            </div>
            <p
              style={{
                margin: "6px 0 10px 0",
                fontSize: "0.88rem",
                color: "var(--text-secondary)",
                maxWidth: 780,
                lineHeight: 1.45,
              }}
            >
              {catDef.description}
            </p>
            {/* Standards & Guidelines Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {catDef.standards.map((std) => (
                <span
                  key={std}
                  style={{
                    fontSize: "0.74rem",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {std}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Launch & Report Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {onLaunchAiMentor && (
            <button
              onClick={() => onLaunchAiMentor()}
              className="btn btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "8px 14px",
              }}
              data-testid="launch-category-ai-btn"
            >
              <Sparkles size={14} />
              <span>Ask {catDef.shortLabel} AI Mentor</span>
            </button>
          )}
          {onOpenChecklists && (
            <button
              onClick={onOpenChecklists}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "8px 14px",
              }}
              data-testid="open-category-playbook-btn"
            >
              <FileCheck size={14} />
              <span>Assessment Playbooks</span>
            </button>
          )}
          {onNavigateToFindings && (
            <button
              onClick={onNavigateToFindings}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "8px 14px",
              }}
              title="View verified findings in findings database"
            >
              <span>Findings ({findings.length})</span>
              <ArrowRight size={14} />
            </button>
          )}
          <button
            onClick={handleExportCategoryReport}
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              padding: "8px 14px",
            }}
            title="Export complete Category Security Assessment Report in Markdown"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Target Scoping Context Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 8,
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border-color)",
          fontSize: "0.82rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
            <ShieldCheck size={16} color="#10b981" />
            <span style={{ fontWeight: 600 }}>Active Scoped Target:</span>
          </div>

          {targets.length > 0 ? (
            <select
              value={currentTargetId}
              data-testid="select-active-target"
              onChange={(e) => {
                const newId = e.target.value;
                setCurrentTargetId(newId);
                const found = targets.find((t) => t.id === newId);
                if (found && onSelectTarget) onSelectTarget(found);
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.primary_url})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: "#f97316", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={14} />
              No targets configured. Using default staging asset.
            </span>
          )}

          {activeTargetObj && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                }}
              >
                {activeTargetObj.primary_url}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-secondary)",
                }}
              >
                Allowed Hosts: {activeTargetObj.scope?.allowed_hosts?.join(", ") || "Strict Host Only"}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: "0.72rem",
              fontWeight: 600,
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            Authorized Scope Enforced
          </span>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: 8,
        }}
      >
        <button
          onClick={() => setActiveTab("assessment")}
          style={{
            background: activeTab === "assessment" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "assessment" ? catDef.color : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "assessment" ? `2px solid ${catDef.color}` : "2px solid transparent",
            padding: "6px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-assessment"
        >
          <ShieldCheck size={14} />
          <span>Security Assessment Engine</span>
        </button>

        <button
          onClick={() => setActiveTab("methodology")}
          style={{
            background: activeTab === "methodology" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "methodology" ? catDef.color : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "methodology" ? `2px solid ${catDef.color}` : "2px solid transparent",
            padding: "6px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-methodology"
        >
          <Layers size={14} />
          <span>Methodology & Phases ({catDef.methodologySteps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tools")}
          style={{
            background: activeTab === "tools" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "tools" ? catDef.color : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "tools" ? `2px solid ${catDef.color}` : "2px solid transparent",
            padding: "6px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-tools"
        >
          <Wrench size={14} />
          <span>Toolchain ({relevantAdapters.length > 0 ? relevantAdapters.length : catDef.tools.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("validator")}
          style={{
            background: activeTab === "validator" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "validator" ? catDef.color : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "validator" ? `2px solid ${catDef.color}` : "2px solid transparent",
            padding: "6px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-validator"
        >
          <CheckCircle2 size={14} />
          <span>Verification Engine</span>
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          style={{
            background: activeTab === "ai" ? "var(--bg-secondary)" : "transparent",
            color: activeTab === "ai" ? catDef.color : "var(--text-secondary)",
            border: "none",
            borderBottom: activeTab === "ai" ? `2px solid ${catDef.color}` : "2px solid transparent",
            padding: "6px 12px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-ai"
        >
          <Sparkles size={14} />
          <span>AI Persona Context</span>
        </button>
      </div>

      {/* Tab 0: Category Assessment Engine */}
      {activeTab === "assessment" && (
        <div style={{ minHeight: "550px" }}>
          <CategoryAssessmentWorkspace
            currentTargetUrl={activeTargetObj?.primary_url}
            currentTargetId={currentTargetId}
            onNavigateToFindings={onNavigateToFindings}
          />
        </div>
      )}

      {/* Tab 1: Methodology & Phases */}
      {activeTab === "methodology" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Ordered Phases:
            </span>
            {catDef.methodologyPhases.map((phase, idx) => (
              <span
                key={phase}
                style={{
                  fontSize: "0.74rem",
                  padding: "1px 8px",
                  borderRadius: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {idx + 1}. {phase}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {catDef.methodologySteps.map((step) => (
              <div
                key={step.stepNumber}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: `${catDef.color}22`,
                        color: catDef.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      {step.stepNumber}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>{step.title}</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "1px 6px",
                        borderRadius: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {step.phase}
                    </span>
                  </div>
                </div>

                <p style={{ margin: "4px 0 8px 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {step.description}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Verification Criteria: </strong>
                    {step.verificationCriteria}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Common Weaknesses: </strong>
                    {step.commonWeaknesses.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Specialized Toolchain & Orchestration */}
      {activeTab === "tools" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Category Pipeline Orchestrator Banner */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              border: `1px solid ${catDef.color}44`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={16} color={catDef.color} />
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  Automated {catDef.name} Pipeline
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: `${catDef.color}22`,
                    color: catDef.color,
                  }}
                >
                  {getCategoryWorkflowId(category)}
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Coordinates multi-tool discovery, execution, finding deduplication, and persistence against{" "}
                <strong style={{ color: "var(--text-primary)" }}>{activeTargetObj?.primary_url || "selected target"}</strong>.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {onNavigateToOrchestration && (
                <button
                  onClick={onNavigateToOrchestration}
                  className="btn btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                  }}
                  title="Open full orchestration workbench"
                >
                  <span>Orchestration Hub</span>
                  <ArrowRight size={14} />
                </button>
              )}
              <button
                onClick={handleLaunchCategoryPipeline}
                disabled={isLaunchingPipeline}
                className="btn btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                }}
              >
                {isLaunchingPipeline ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Run Full Category Suite</span>
              </button>
            </div>
          </div>

          {loadingAdapters && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <RefreshCw size={12} className="animate-spin" />
              <span>Querying host tool adapters...</span>
            </div>
          )}

          {pipelineError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                fontSize: "0.82rem",
              }}
            >
              <strong>Pipeline Error: </strong> {pipelineError}
            </div>
          )}

          {activePipelineJob && (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                  Active Job: {activePipelineJob.workflow_name}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    color: "#10b981",
                  }}
                >
                  Status: {activePipelineJob.status}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Step Runs: {activePipelineJob.step_runs.length} | Discovered Findings:{" "}
                <strong style={{ color: "#ef4444" }}>{activePipelineJob.total_findings}</strong>
              </div>
              <div
                style={{
                  padding: 8,
                  borderRadius: 6,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                  maxHeight: 100,
                  overflowY: "auto",
                  color: "var(--accent-cyan)",
                }}
              >
                {activePipelineJob.logs.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}

          {/* Special API Spec Importer for API Category */}
          {category === "api" && (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Code2 size={16} color="#a855f7" />
                  <strong style={{ fontSize: "0.9rem" }}>Postman & OpenAPI Spec Importer</strong>
                </div>
                <label
                  className="btn btn-secondary"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Upload size={12} />
                  <span>Upload Spec File (.json)</span>
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleSpecFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <textarea
                rows={3}
                placeholder="Paste OpenAPI v3 / Swagger JSON or Postman Collection v2.1 JSON here..."
                value={apiSpecText}
                data-testid="textarea-api-spec"
                onChange={(e) => setApiSpecText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  fontFamily: "monospace",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={() => handleParseApiSpec()}
                  data-testid="btn-parse-api-spec"
                  className="btn btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  Parse Endpoints & Schema
                </button>
                {importNotice && (
                  <span style={{ fontSize: "0.78rem", color: "var(--accent-cyan)" }}>{importNotice}</span>
                )}
              </div>

              {parsedEndpoints.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    maxHeight: 140,
                    overflowY: "auto",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>
                    Discovered Endpoints ({parsedEndpoints.length}):
                  </div>
                  {parsedEndpoints.map((ep, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "0.75rem",
                        padding: "2px 0",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          fontSize: "0.7rem",
                          backgroundColor:
                            ep.method === "GET"
                              ? "rgba(16, 185, 129, 0.2)"
                              : ep.method === "POST"
                              ? "rgba(0, 240, 255, 0.2)"
                              : ep.method === "DELETE"
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(234, 179, 8, 0.2)",
                          color:
                            ep.method === "GET"
                              ? "#10b981"
                              : ep.method === "POST"
                              ? "#00f0ff"
                              : ep.method === "DELETE"
                              ? "#ef4444"
                              : "#eab308",
                        }}
                      >
                        {ep.method}
                      </span>
                      <span style={{ fontFamily: "monospace" }}>{ep.path}</span>
                      {ep.summary && (
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
                          — {ep.summary}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tools Grid: Adapters & Builtin Registry */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {relevantAdapters.length > 0
              ? relevantAdapters.map((adapter) => {
                  const isHealthy =
                    healthResults[adapter.id]?.healthy ??
                    (adapter.detection_state === "installed_and_ready" || adapter.is_available);
                  const healthRes = healthResults[adapter.id];

                  return (
                    <div
                      key={adapter.id}
                      style={{
                        padding: 14,
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{adapter.name}</span>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                            v{adapter.version} &bull; {adapter.category}
                          </div>
                        </div>

                        {/* Enable/Disable Toggle */}
                        <button
                          onClick={() => handleToggleEnabled(adapter.id, adapter.is_enabled)}
                          disabled={togglingTools[adapter.id]}
                          style={{
                            background: adapter.is_enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                            border: `1px solid ${adapter.is_enabled ? "#10b981" : "var(--border-color)"}`,
                            color: adapter.is_enabled ? "#10b981" : "var(--text-secondary)",
                            padding: "3px 8px",
                            borderRadius: 12,
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Power size={11} />
                          <span>{adapter.is_enabled ? "Enabled" : "Disabled"}</span>
                        </button>
                      </div>

                      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {adapter.description}
                      </p>

                      {/* Packaging & Install Source */}
                      {adapter.install_source && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: "rgba(0, 0, 0, 0.3)",
                            color: "var(--text-secondary)",
                            display: "inline-block",
                            alignSelf: "flex-start",
                          }}
                        >
                          Source: <strong style={{ color: "var(--text-primary)" }}>{adapter.install_source}</strong>
                        </div>
                      )}

                      {/* Status & Health Results */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: isHealthy ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: isHealthy ? "#10b981" : "#ef4444",
                            fontWeight: 600,
                          }}
                        >
                          {isHealthy ? "Installed & Ready" : "Misconfigured / Not Installed"}
                        </span>

                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleTestHealth(adapter.id)}
                            disabled={testingHealth[adapter.id]}
                            className="btn btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <RefreshCw size={11} className={testingHealth[adapter.id] ? "animate-spin" : ""} />
                            <span>Test Health</span>
                          </button>

                          <button
                            onClick={() => openToolRunModal(adapter)}
                            className="btn btn-primary"
                            style={{ padding: "3px 8px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Play size={11} />
                            <span>Run Tool</span>
                          </button>
                        </div>
                      </div>

                      {healthRes && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            padding: "4px 8px",
                            borderRadius: 4,
                            backgroundColor: healthRes.healthy ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                            color: healthRes.healthy ? "#10b981" : "#ef4444",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>{healthRes.message}</span>
                          <span>{healthRes.latency_ms} ms</span>
                        </div>
                      )}
                    </div>
                  );
                })
              : catDef.tools.map((tool) => (
                  <div
                    key={tool.id}
                    style={{
                      padding: 14,
                      backgroundColor: "var(--bg-secondary)",
                      borderRadius: 8,
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{tool.name}</span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: tool.isAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          color: tool.isAvailable ? "#10b981" : "var(--text-secondary)",
                        }}
                      >
                        {tool.isAvailable ? "Integrated" : "CLI Adapter"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {tool.description}
                    </p>
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.3)",
                        padding: "6px 8px",
                        borderRadius: 6,
                        fontFamily: "monospace",
                        fontSize: "0.76rem",
                        color: "var(--accent-cyan)",
                        overflowX: "auto",
                      }}
                    >
                      {tool.commandTemplate}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {tool.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: "0.68rem",
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "rgba(255, 255, 255, 0.04)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <a
                        href={tool.documentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "0.75rem",
                          color: catDef.color,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          textDecoration: "none",
                        }}
                      >
                        Docs <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* Tab 3: Vulnerability Verification Workbench */}
      {activeTab === "validator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: "rgba(0, 240, 255, 0.05)",
              border: "1px solid rgba(0, 240, 255, 0.2)",
              fontSize: "0.82rem",
              lineHeight: 1.45,
            }}
          >
            <strong>Category-Specific Verification Engine: </strong>
            Executes specialized verification checks tailored to {catDef.name} with 6 distinct status outcomes (
            <em>Confirmed, Likely, Potential, False Positive, Needs Manual Review, Not Tested</em>).
          </div>

          {/* Evaluate Existing Finding from Database */}
          {findings.length > 0 && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                Evaluate Live Finding:
              </span>
              <select
                value={selectedFindingToValidate}
                data-testid="select-live-finding"
                onChange={(e) => handleSelectFinding(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  borderRadius: 6,
                  backgroundColor: "rgba(0, 0, 0, 0.25)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.8rem",
                }}
              >
                <option value="">-- Or choose an existing finding to load evidence --</option>
                {findings.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.severity}] {f.title} ({f.affected_asset})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Finding Title / Check Name
              </label>
              <input
                type="text"
                value={testFindingTitle}
                onChange={(e) => setTestFindingTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
                data-testid="input-finding-title"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Affected Asset / Target
              </label>
              <input
                type="text"
                value={testAsset}
                onChange={(e) => setTestAsset(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
                data-testid="input-affected-asset"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
              Raw Evidence / Payload Snippet / Command Output
            </label>
            <textarea
              rows={3}
              value={testEvidence}
              onChange={(e) => setTestEvidence(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontFamily: "monospace",
              }}
              data-testid="textarea-raw-evidence"
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={handleRunValidation}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: "0.85rem",
              }}
              data-testid="btn-run-category-validation"
            >
              <Play size={14} />
              <span>Validate Finding ({catDef.shortLabel} Rules)</span>
            </button>

            {validationResult && selectedFindingToValidate && (
              <button
                onClick={handleSaveVerificationStatus}
                disabled={savingStatus}
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                }}
              >
                <CheckCircle2 size={14} color="#10b981" />
                <span>Save Status to Finding Record</span>
              </button>
            )}

            {statusSaveNotice && (
              <span style={{ fontSize: "0.78rem", color: "var(--accent-cyan)" }}>
                {statusSaveNotice}
              </span>
            )}
          </div>

          {/* Validation Result Display */}
          {validationResult && (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: "var(--bg-secondary)",
                border: `1px solid ${getStatusBadgeColor(validationResult.status).border}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
              data-testid="validation-result-panel"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 14,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      backgroundColor: getStatusBadgeColor(validationResult.status).bg,
                      color: getStatusBadgeColor(validationResult.status).text,
                      border: `1px solid ${getStatusBadgeColor(validationResult.status).border}`,
                    }}
                    data-testid="result-status-badge"
                  >
                    {validationResult.status}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Confidence Score: <strong style={{ color: "var(--text-primary)" }}>{validationResult.confidenceScore}%</strong>
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.85rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Hypothesis: </strong>
                <span style={{ color: "var(--text-secondary)" }}>{validationResult.hypothesis}</span>
              </div>

              <div style={{ fontSize: "0.85rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Actual Observation: </strong>
                <span style={{ color: "var(--text-secondary)" }}>{validationResult.actualObservation}</span>
              </div>

              <div style={{ fontSize: "0.85rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Supporting Evidence: </strong>
                <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                  {validationResult.supportingEvidence}
                </span>
              </div>

              <div style={{ fontSize: "0.85rem" }}>
                <strong style={{ color: "var(--text-primary)" }}>Recommended Remediation: </strong>
                <span style={{ color: "var(--text-secondary)" }}>{validationResult.recommendedRemediation}</span>
              </div>

              {validationResult.suggestedRetestCommand && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>
                    Suggested Retest Command:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--border-color)",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      color: "var(--accent-cyan)",
                    }}
                  >
                    <span>{validationResult.suggestedRetestCommand}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(validationResult.suggestedRetestCommand);
                        setCopiedRetest(true);
                        setTimeout(() => setCopiedRetest(false), 2000);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedRetest ? "#10b981" : "var(--text-secondary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {copiedRetest ? <Check size={14} /> : <Copy size={14} />}
                      <span style={{ fontSize: "0.72rem" }}>{copiedRetest ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Category AI Persona & Prompts */}
      {activeTab === "ai" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: "var(--bg-secondary)",
              border: `1px solid ${catDef.color}44`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} color={catDef.color} />
              <strong style={{ fontSize: "0.95rem" }}>{catDef.aiPersona.roleTitle}</strong>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 10 }}>
              <strong>Domain Specialty: </strong>{catDef.aiPersona.specialty}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                padding: 10,
                borderRadius: 6,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              {catDef.aiPersona.systemPrompt}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 8 }}>
              Starter Prompt Chips for {catDef.shortLabel}:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
              {catDef.aiPersona.starterPromptChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onLaunchAiMentor && onLaunchAiMentor(chip.text)}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                  data-testid={`prompt-chip-${idx}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.82rem", color: catDef.color }}>
                      {chip.label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "1px 5px",
                        borderRadius: 3,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {chip.depth}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                    "{chip.text}"
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Tool Execution Drawer/Modal */}
      {executingTool && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: 12,
              border: `1px solid ${catDef.color}66`,
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={18} color={catDef.color} />
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                  Execute {executingTool.name}
                </h3>
              </div>
              <button
                onClick={() => setExecutingTool(null)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Target URL
              </label>
              <input
                type="text"
                value={execTargetUrl}
                onChange={(e) => setExecTargetUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Custom Arguments (e.g. key=value or flags)
              </label>
              <input
                type="text"
                placeholder="e.g. severity=critical,high or paths=/api"
                value={execParams["extra_args"] || ""}
                onChange={(e) => setExecParams({ ...execParams, extra_args: e.target.value })}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setExecutingTool(null)}
                className="btn btn-secondary"
                style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              >
                Close
              </button>
              <button
                onClick={handleExecuteTool}
                disabled={isExecutingTool}
                data-testid="btn-modal-execute-tool"
                className="btn btn-primary"
                style={{ padding: "6px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
              >
                {isExecutingTool ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>{isExecutingTool ? "Executing..." : "Run Tool"}</span>
              </button>
            </div>

            {toolExecError && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  fontSize: "0.8rem",
                }}
              >
                <strong>Execution Failed:</strong> {toolExecError}
              </div>
            )}

            {toolExecOutput && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span>
                    Status: <strong style={{ color: "#10b981" }}>{toolExecOutput.status}</strong>
                  </span>
                  <span>Duration: {toolExecOutput.duration_ms} ms</span>
                  <span>Findings Discovered: <strong style={{ color: "#ef4444" }}>{toolExecOutput.findings?.length || 0}</strong></span>
                </div>

                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    padding: 8,
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: "0.76rem",
                    color: "var(--accent-cyan)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {toolExecOutput.logs?.length > 0
                    ? toolExecOutput.logs.join("\n")
                    : "[*] Command completed with no stdout stream."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
