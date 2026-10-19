import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ToolAdapterMetadata,
  ToolHealthCheckResult,
  ExtensionRecord,
  WorkflowDefinition,
  WorkflowJob,
  Target,
  ToolCapability,
  SystemResourceStatus,
  AdapterOutput,
} from "../types";
import {
  Wrench,
  Cpu,
  Layers,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  ArrowRight,
  ShieldAlert,
  Search,
  ExternalLink,
  Code2,
  Lock,
  PauseCircle,
  FolderGit2,
  Server,
  Zap,
  HardDrive,
  Gauge,
  Power,
  Terminal,
  Check,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Eye,
} from "lucide-react";

interface OrchestrationHubProps {
  targets: Target[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  onNavigateToFindings: () => void;
}

type ToolCategoryTab = "all" | "web" | "sast" | "network" | "runtime" | "gui";
type ToolStatusFilter = "all" | "ready" | "action_needed" | "enabled_only";

export const OrchestrationHub: React.FC<OrchestrationHubProps> = ({
  targets,
  selectedTargetId,
  onSelectTarget,
  onNavigateToFindings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "tools" | "extensions" | "workflows" | "jobs"
  >("tools");

  // State
  const [adapters, setAdapters] = useState<ToolAdapterMetadata[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // System Hardware Telemetry
  const [systemResources, setSystemResources] = useState<SystemResourceStatus | null>(null);
  const [loadingResources, setLoadingResources] = useState<boolean>(false);

  // Health check modal / state
  const [healthResults, setHealthResults] = useState<Record<string, ToolHealthCheckResult>>({});
  const [testingHealth, setTestingHealth] = useState<Record<string, boolean>>({});

  // Tool Filters
  const [toolCategoryTab, setToolCategoryTab] = useState<ToolCategoryTab>("all");
  const [toolStatusFilter, setToolStatusFilter] = useState<ToolStatusFilter>("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [togglingTools, setTogglingTools] = useState<Record<string, boolean>>({});

  // Custom path modal
  const [editingPathTool, setEditingPathTool] = useState<ToolAdapterMetadata | null>(null);
  const [customPathInput, setCustomPathInput] = useState("");

  // Setup Guide modal
  const [guideTool, setGuideTool] = useState<ToolAdapterMetadata | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Tool Execution modal
  const [executingTool, setExecutingTool] = useState<ToolAdapterMetadata | null>(null);
  const [execTargetId, setExecTargetId] = useState<string>(selectedTargetId || (targets[0]?.id ?? ""));
  const [execTargetUrl, setExecTargetUrl] = useState<string>("");
  const [execParams, setExecParams] = useState<Record<string, string>>({});
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);
  const [toolExecOutput, setToolExecOutput] = useState<AdapterOutput | null>(null);
  const [toolExecError, setToolExecError] = useState<string | null>(null);

  // Extension Manifest Modal
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [newManifestJson, setNewManifestJson] = useState(`{
  "manifest_version": 1,
  "id": "custom-header-fuzzer",
  "name": "Custom Header Fuzzer Extension",
  "version": "1.0.0",
  "publisher": "Security Team",
  "description": "Fuzzes HTTP response headers for reflected input and cache poisoning indicators.",
  "category": "scanner",
  "runtime": "python3",
  "entrypoint": "fuzzer.py",
  "capabilities": ["http_probing", "vuln_scan"],
  "permissions": {
    "network": ["in_scope_target_only"],
    "filesystem": ["none"],
    "environment": ["none"]
  },
  "parameters": []
}`);

  // Workflow launch state
  const [launchingWfId, setLaunchingWfId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTargetId) {
      setExecTargetId(selectedTargetId);
      const target = targets.find((t) => t.id === selectedTargetId);
      if (target) setExecTargetUrl(target.primary_url);
    } else if (targets.length > 0) {
      setExecTargetId(targets[0].id);
      setExecTargetUrl(targets[0].primary_url);
    }
  }, [selectedTargetId, targets]);

  const loadAllData = async () => {
    await Promise.all([
      loadAdapters(),
      loadExtensions(),
      loadWorkflows(),
      loadJobs(),
      loadSystemResources(),
    ]);
  };

  const loadSystemResources = async () => {
    setLoadingResources(true);
    try {
      const data = await invoke<SystemResourceStatus>("get_system_resource_status");
      setSystemResources(data);
    } catch (e) {
      console.warn("Could not query host system resources:", e);
    } finally {
      setLoadingResources(false);
    }
  };

  const loadAdapters = async () => {
    try {
      const data = await invoke<ToolAdapterMetadata[]>("get_tool_adapters");
      setAdapters(data);
    } catch (e) {
      console.error("Failed to load tool adapters", e);
    }
  };

  const loadExtensions = async () => {
    try {
      const data = await invoke<ExtensionRecord[]>("get_extensions_v1");
      setExtensions(data);
    } catch (e) {
      console.error("Failed to load extensions", e);
    }
  };

  const loadWorkflows = async () => {
    try {
      const data = await invoke<WorkflowDefinition[]>("get_workflows");
      setWorkflows(data);
    } catch (e) {
      console.error("Failed to load workflows", e);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await invoke<WorkflowJob[]>("get_workflow_jobs");
      setJobs(data);
    } catch (e) {
      console.error("Failed to load workflow jobs", e);
    }
  };

  const handleToggleTool = async (adapter: ToolAdapterMetadata) => {
    const nextState = !adapter.is_enabled;
    setTogglingTools((prev) => ({ ...prev, [adapter.id]: true }));
    try {
      await invoke("toggle_tool_adapter_enabled", {
        toolId: adapter.id,
        enabled: nextState,
      });
      setAdapters((prev) =>
        prev.map((a) => (a.id === adapter.id ? { ...a, is_enabled: nextState } : a))
      );
    } catch (e) {
      alert("Failed to toggle tool enablement: " + e);
    } finally {
      setTogglingTools((prev) => ({ ...prev, [adapter.id]: false }));
    }
  };

  const handleTestHealth = async (toolId: string) => {
    setTestingHealth((prev) => ({ ...prev, [toolId]: true }));
    try {
      const res = await invoke<ToolHealthCheckResult>("run_tool_health_check", { toolId });
      setHealthResults((prev) => ({ ...prev, [toolId]: res }));
      await loadAdapters();
    } catch (e) {
      alert("Health check failed: " + e);
    } finally {
      setTestingHealth((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  const handleSaveCustomPath = async () => {
    if (!editingPathTool) return;
    try {
      await invoke("set_tool_path_override", {
        toolId: editingPathTool.id,
        customPath: customPathInput,
      });
      setEditingPathTool(null);
      await loadAdapters();
    } catch (e) {
      alert("Failed to save custom path: " + e);
    }
  };

  const handleToggleExtension = async (ext: ExtensionRecord) => {
    const newState = ext.state === "enabled" ? "disabled" : "enabled";
    try {
      await invoke("set_extension_state", { id: ext.manifest.id, stateName: newState });
      await loadExtensions();
    } catch (e) {
      alert("Failed to update extension state: " + e);
    }
  };

  const handleRegisterManifest = async () => {
    try {
      await invoke("register_extension_v1", { manifestJson: newManifestJson });
      setShowManifestModal(false);
      await loadExtensions();
    } catch (e) {
      alert("Invalid extension manifest: " + e);
    }
  };

  const handleStartWorkflow = async (workflowId: string) => {
    if (!selectedTargetId) {
      alert("Please select a target first before running a workflow.");
      return;
    }
    setLaunchingWfId(workflowId);
    try {
      const job = await invoke<WorkflowJob>("start_workflow_job", {
        workflowId,
        targetId: selectedTargetId,
      });
      setSelectedJobId(job.job_id);
      setActiveSubTab("jobs");
      await loadJobs();
    } catch (e) {
      alert("Failed to launch workflow: " + e);
    } finally {
      setLaunchingWfId(null);
    }
  };

  const handleApproveStep = async (jobId: string, stepId: string) => {
    try {
      await invoke("approve_workflow_step", { jobId, stepId });
      await loadJobs();
    } catch (e) {
      alert("Failed to approve step: " + e);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await invoke("cancel_workflow_job", { jobId });
      await loadJobs();
    } catch (e) {
      alert("Failed to cancel job: " + e);
    }
  };

  // Tool Direct Execution Logic
  const handleOpenExecuteModal = (adapter: ToolAdapterMetadata) => {
    setExecutingTool(adapter);
    setToolExecOutput(null);
    setToolExecError(null);

    const target = targets.find((t) => t.id === execTargetId) || targets[0];
    const initialUrl = target ? target.primary_url : "https://example.com";
    setExecTargetUrl(initialUrl);

    // Initial safe parameter defaults tailored to the tool
    const initialParams: Record<string, string> = {};
    if (adapter.id === "nuclei") {
      initialParams["severity"] = "low,medium,high,critical";
      initialParams["concurrency"] = "5";
      initialParams["rate_limit"] = "30";
    } else if (adapter.id === "katana") {
      initialParams["depth"] = "2";
      initialParams["max_pages"] = "20";
    } else if (adapter.id === "ffuf") {
      initialParams["wordlist"] = "tools/wordlists/common.txt";
      initialParams["rate"] = "25";
    } else if (adapter.id === "semgrep" || adapter.id === "gitleaks" || adapter.id === "checkov" || adapter.id === "trivy") {
      initialParams["path"] = ".";
    } else if (adapter.id === "tshark") {
      initialParams["duration_sec"] = "10";
      initialParams["max_packets"] = "50";
    } else if (adapter.id === "jadx") {
      initialParams["apk_path"] = "app.apk";
    }
    setExecParams(initialParams);
  };

  const handleExecuteTool = async () => {
    if (!executingTool) return;
    setIsExecutingTool(true);
    setToolExecError(null);
    setToolExecOutput(null);

    try {
      const output = await invoke<AdapterOutput>("execute_tool_adapter", {
        toolId: executingTool.id,
        targetId: execTargetId,
        targetUrl: execTargetUrl,
        parameters: execParams,
      });
      setToolExecOutput(output);
    } catch (err: any) {
      setToolExecError(typeof err === "string" ? err : err?.message || "Execution failed");
    } finally {
      setIsExecutingTool(false);
    }
  };

  // Helper mapping for categories
  const matchesCategoryTab = (adapter: ToolAdapterMetadata, tab: ToolCategoryTab): boolean => {
    if (tab === "all") return true;
    const cat = adapter.category.toLowerCase();
    const id = adapter.id.toLowerCase();

    if (tab === "web") {
      return (
        cat.includes("web") ||
        cat.includes("api") ||
        ["baseline", "nuclei", "httpx", "katana", "ffuf", "schemathesis", "sqlmap"].includes(id)
      );
    }
    if (tab === "sast") {
      return (
        cat.includes("sast") ||
        cat.includes("source") ||
        cat.includes("iac") ||
        cat.includes("secret") ||
        ["semgrep", "gitleaks", "osv_scanner", "trivy", "checkov"].includes(id)
      );
    }
    if (tab === "network") {
      return (
        cat.includes("network") ||
        cat.includes("android") ||
        ["nmap", "tshark", "jadx"].includes(id)
      );
    }
    if (tab === "runtime") {
      return (
        cat.includes("ai") ||
        cat.includes("runtime") ||
        ["ollama", "docker"].includes(id)
      );
    }
    if (tab === "gui") {
      return (
        adapter.integration_type === "external_gui" ||
        ["burpsuite", "owasp_zap", "wireshark"].includes(id)
      );
    }
    return true;
  };

  const matchesStatusFilter = (adapter: ToolAdapterMetadata, filter: ToolStatusFilter): boolean => {
    if (filter === "all") return true;
    if (filter === "ready") return adapter.is_available;
    if (filter === "action_needed") return !adapter.is_available;
    if (filter === "enabled_only") return adapter.is_enabled;
    return true;
  };

  const getFilteredAdapters = (): ToolAdapterMetadata[] => {
    return adapters.filter((a) => {
      const matchesCat = matchesCategoryTab(a, toolCategoryTab);
      const matchesStatus = matchesStatusFilter(a, toolStatusFilter);
      const matchesQuery =
        !filterQuery ||
        a.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(filterQuery.toLowerCase()) ||
        (a.install_source && a.install_source.toLowerCase().includes(filterQuery.toLowerCase()));
      return matchesCat && matchesStatus && matchesQuery;
    });
  };

  const getInstallInstructions = (toolId: string) => {
    switch (toolId) {
      case "nuclei":
      case "httpx":
      case "katana":
      case "osv_scanner":
        return {
          title: "Pre-Configured Portable Windows Binary",
          command: `# Tool executable is placed in project tools\\bin\n.\\tools\\bin\\${toolId}.exe -version`,
          note: "Binary is bundled directly in the AppSec local tools directory. Click 'Test Health' to verify execution.",
        };
      case "ffuf":
        return {
          title: "WinGet Package Manager",
          command: "winget install --id ffuf.ffuf -e --accept-source-agreements --accept-package-agreements",
          note: "Installs official x64 Windows binary into user WinGet packages.",
        };
      case "semgrep":
        return {
          title: "Python 3 Pip Package",
          command: "python -m pip install --user semgrep",
          note: "Installs Semgrep SAST into user Python Scripts directory. No administrator elevation needed.",
        };
      case "schemathesis":
        return {
          title: "Python 3 Pip Package",
          command: "python -m pip install --user schemathesis",
          note: "Installs Schemathesis API schema fuzzer for OpenAPI / REST / GraphQL.",
        };
      case "gitleaks":
        return {
          title: "WinGet Package Manager",
          command: "winget install --id Gitleaks.Gitleaks -e --accept-source-agreements --accept-package-agreements",
          note: "High-performance git repo and secret scanner for API keys and tokens.",
        };
      case "trivy":
        return {
          title: "WinGet Package Manager",
          command: "winget install --id AquaSecurity.Trivy -e --accept-source-agreements --accept-package-agreements",
          note: "Vulnerability and SBOM scanner for dependencies and container images.",
        };
      case "checkov":
        return {
          title: "Python 3 Pip Package",
          command: "python -m pip install --user checkov",
          note: "Static analysis for Infrastructure-as-Code (Terraform, Dockerfiles, CloudFormation).",
        };
      case "tshark":
        return {
          title: "Wireshark CLI & Npcap Driver",
          command: "winget install --id WiresharkFoundation.Wireshark -e",
          note: "Provides TShark and Npcap 1.88 packet capture driver at C:\\Program Files\\Wireshark\\tshark.exe.",
        };
      case "jadx":
        return {
          title: "Portable JADX + Oracle JDK 21",
          command: `# Download portable zip to tools\\jadx:\nInvoke-WebRequest -Uri "https://github.com/skylot/jadx/releases/download/v1.5.6/jadx-1.5.6.zip" -OutFile "jadx.zip"; Expand-Archive jadx.zip -DestinationPath tools\\jadx`,
          note: "Runs decompilation on existing Oracle JDK 21 without requiring administrator privileges.",
        };
      case "burpsuite":
        return {
          title: "Burp Suite Community Edition + Connector Hook",
          command: `# Launch Burp with AppSec Connector on port 41785:\nStart-Process "$env:LOCALAPPDATA\\Programs\\BurpSuite\\BurpSuite.exe"`,
          note: "Extension AppSec-Burp-Connector.jar enables live ingestion of HTTP Proxy history into AppSec.",
        };
      case "ollama":
        return {
          title: "Local Ollama LLM Service",
          command: "ollama serve\n# Download cybersecurity models:\nollama pull appsec-teacher-8b",
          note: "Runs private local LLM inference on loopback port 11434.",
        };
      case "docker":
        return {
          title: "Docker Desktop Engine",
          command: "Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'",
          note: "Used for ephemeral containerized security scanners and vulnerable labs.",
        };
      case "nmap":
        return {
          title: "Nmap Network Scanner",
          command: "winget install --id Insecure.Nmap -e --accept-source-agreements --accept-package-agreements",
          note: "If upstream certificate fails, use TShark or place portable nmap.exe in tools\\bin\\.",
        };
      default:
        return {
          title: "Standard Executable Installation",
          command: `# Add binary to PATH or specify Custom Path in AppSec:\nwhere.exe ${toolId}`,
          note: "Ensure binary is accessible from PowerShell or configure custom path in tool card.",
        };
    }
  };

  const getDetectionBadge = (state: string) => {
    switch (state) {
      case "installed_and_ready":
        return (
          <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} /> Installed & Ready
          </span>
        );
      case "detected_unavailable":
        return (
          <span className="badge badge-warning" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} /> Service Offline
          </span>
        );
      case "misconfigured":
        return (
          <span className="badge badge-high" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <AlertTriangle size={12} /> Path Misconfigured
          </span>
        );
      case "not_installed":
        return (
          <span className="badge badge-info" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <XCircle size={12} /> Not Installed
          </span>
        );
      default:
        return <span className="badge badge-low">{state}</span>;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <span className="badge badge-cyan pulse-anim" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Activity size={12} /> Executing
          </span>
        );
      case "waiting_approval":
        return (
          <span className="badge badge-warning pulse-anim" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <PauseCircle size={12} /> Approval Required
          </span>
        );
      case "completed":
        return (
          <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case "failed":
        return (
          <span className="badge badge-critical" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <XCircle size={12} /> Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="badge badge-low" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const formatCapability = (cap: ToolCapability) => {
    return cap.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const filteredAdapters = getFilteredAdapters();
  const selectedJob = jobs.find((j) => j.job_id === selectedJobId) || jobs[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Banner & Header */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wrench size={24} color="var(--accent-cyan)" />
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>
              Universal Security Tool & Ecosystem Orchestrator
            </h2>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            20 integrated security tools, live physical hardware telemetry, scoped execution bounds, and DAG pipelines.
          </p>
        </div>

        {/* Target Context Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Target Context:</span>
          <select
            className="input-field"
            value={selectedTargetId}
            onChange={(e) => onSelectTarget(e.target.value)}
            style={{ width: 230, padding: "6px 12px", fontSize: "0.85rem" }}
          >
            {targets.length === 0 ? (
              <option value="">No targets registered</option>
            ) : (
              targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.primary_url})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Sub Tabs Bar */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-color)", paddingBottom: 10, flexWrap: "wrap" }}>
        <button
          className={`tab-btn ${activeSubTab === "tools" ? "active" : ""}`}
          onClick={() => setActiveSubTab("tools")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8 }}
        >
          <Cpu size={16} />
          <span>Security Tool Ecosystem ({adapters.length})</span>
        </button>

        <button
          className={`tab-btn ${activeSubTab === "workflows" ? "active" : ""}`}
          onClick={() => setActiveSubTab("workflows")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8 }}
        >
          <FolderGit2 size={16} />
          <span>Workflow Studio / DAG ({workflows.length})</span>
        </button>

        <button
          className={`tab-btn ${activeSubTab === "jobs" ? "active" : ""}`}
          onClick={() => setActiveSubTab("jobs")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8 }}
        >
          <Activity size={16} />
          <span>Job Center & Runs ({jobs.length})</span>
          {jobs.some((j) => j.status === "waiting_approval") && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sev-high)" }} />
          )}
        </button>

        <button
          className={`tab-btn ${activeSubTab === "extensions" ? "active" : ""}`}
          onClick={() => setActiveSubTab("extensions")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8 }}
        >
          <Layers size={16} />
          <span>Extensions & Plugins ({extensions.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. TOOLS & ADAPTERS DASHBOARD */}
      {/* ========================================================= */}
      {activeSubTab === "tools" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* HARDWARE TELEMETRY & PHYSICAL CONSTRAINTS BANNER */}
          {systemResources && (
            <div
              className="card"
              style={{
                background: "var(--bg-card)",
                border: systemResources.disk_warning || systemResources.ram_warning
                  ? "1px solid rgba(255, 152, 0, 0.4)"
                  : "1px solid var(--border-color)",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Gauge size={20} color="var(--accent-cyan)" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                      Host Physical Hardware Telemetry & Safe Concurrency Bounds
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {systemResources.os} • Real-time Windows kernel resource probes
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={loadSystemResources}
                  disabled={loadingResources}
                  style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={12} className={loadingResources ? "spin-anim" : ""} />
                  {loadingResources ? "Checking..." : "Refresh Hardware Telemetry"}
                </button>
              </div>

              {/* Gauges Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16 }}>
                {/* Storage Gauge */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <HardDrive size={14} color="var(--accent-cyan)" /> C: Storage
                    </span>
                    <span
                      className={`badge ${systemResources.disk_warning ? "badge-high" : "badge-success"}`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {systemResources.disk_free_gb} GB Free
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (systemResources.disk_used_gb / (systemResources.disk_total_gb || 1)) * 100))}%`,
                        height: "100%",
                        background: systemResources.disk_warning ? "var(--sev-high)" : "var(--accent-cyan)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>Used: {systemResources.disk_used_gb} GB</span>
                    <span>Total: {systemResources.disk_total_gb} GB</span>
                  </div>
                </div>

                {/* RAM Gauge */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <Cpu size={14} color="var(--accent-cyan)" /> Physical RAM
                    </span>
                    <span
                      className={`badge ${systemResources.ram_warning ? "badge-high" : "badge-success"}`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {systemResources.ram_avail_mb} MB Free
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, (systemResources.ram_used_mb / (systemResources.ram_total_mb || 1)) * 100))}%`,
                        height: "100%",
                        background: systemResources.ram_warning ? "var(--sev-high)" : "var(--accent-cyan)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>Used: {systemResources.ram_used_mb} MB</span>
                    <span>Total: {systemResources.ram_total_mb} MB</span>
                  </div>
                </div>
              </div>

              {/* Physical Warning Alert */}
              {systemResources.warnings && systemResources.warnings.length > 0 && (
                <div
                  style={{
                    background: "rgba(255, 152, 0, 0.08)",
                    borderLeft: "3px solid var(--sev-high)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--sev-high)", display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={14} /> Active Hardware Boundaries & Safe Execution Policy
                  </div>
                  {systemResources.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                  <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                    Scans automatically cap artifact temp files to 200MB and run at reduced process concurrency to preserve host responsiveness.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY & STATUS FILTERS BAR */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Sliders size={12} /> Domain:
              </span>
              {[
                { id: "all", label: `All Tools (${adapters.length})` },
                { id: "web", label: `Web & API (${adapters.filter((a) => matchesCategoryTab(a, "web")).length})` },
                { id: "sast", label: `SAST & Secrets (${adapters.filter((a) => matchesCategoryTab(a, "sast")).length})` },
                { id: "network", label: `Network & Android (${adapters.filter((a) => matchesCategoryTab(a, "network")).length})` },
                { id: "runtime", label: `AI & Runtime (${adapters.filter((a) => matchesCategoryTab(a, "runtime")).length})` },
                { id: "gui", label: `External GUI (${adapters.filter((a) => matchesCategoryTab(a, "gui")).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  data-testid={`domain-tab-${tab.id}`}
                  onClick={() => setToolCategoryTab(tab.id as ToolCategoryTab)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.78rem",
                    borderRadius: 16,
                    border: toolCategoryTab === tab.id ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                    background: toolCategoryTab === tab.id ? "rgba(0, 240, 255, 0.15)" : "var(--bg-secondary)",
                    color: toolCategoryTab === tab.id ? "var(--accent-cyan)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontWeight: toolCategoryTab === tab.id ? 600 : 400,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status & Search row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Status:</span>
                {[
                  { id: "all", label: "All States" },
                  { id: "ready", label: "Installed & Ready" },
                  { id: "action_needed", label: "Action Needed" },
                  { id: "enabled_only", label: "Enabled Only" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setToolStatusFilter(s.id as ToolStatusFilter)}
                    style={{
                      padding: "3px 10px",
                      fontSize: "0.72rem",
                      borderRadius: 12,
                      border: toolStatusFilter === s.id ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                      background: toolStatusFilter === s.id ? "rgba(0, 240, 255, 0.1)" : "transparent",
                      color: toolStatusFilter === s.id ? "var(--accent-cyan)" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", width: 280 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search tools, packaging, capabilities..."
                    className="input-field"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    style={{ paddingLeft: 30, width: "100%", fontSize: "0.8rem", padding: "5px 10px 5px 30px" }}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={loadAdapters}
                  style={{ fontSize: "0.75rem", padding: "5px 12px" }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* TOOLS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16 }}>
            {filteredAdapters.map((adapter) => {
              const health = healthResults[adapter.id];
              const isTesting = testingHealth[adapter.id];
              const isToggling = togglingTools[adapter.id];

              return (
                <div
                  key={adapter.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                    border: !adapter.is_enabled
                      ? "1px dashed rgba(255, 255, 255, 0.15)"
                      : adapter.is_available
                      ? "1px solid rgba(0, 240, 255, 0.25)"
                      : "1px solid var(--border-color)",
                    background: "var(--bg-card)",
                    opacity: adapter.is_enabled ? 1 : 0.65,
                    boxShadow: adapter.is_available && adapter.is_enabled ? "0 2px 8px rgba(0, 240, 255, 0.05)" : "none",
                  }}
                >
                  <div>
                    {/* Card Header & Enable Switch */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{adapter.name}</h3>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>v{adapter.version}</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 500 }}>
                          {adapter.category}
                        </span>
                      </div>

                      {/* Enable/Disable Toggle Button */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          data-testid={`toggle-tool-${adapter.id}`}
                          onClick={() => handleToggleTool(adapter)}
                          disabled={isToggling}
                          title={adapter.is_enabled ? "Click to disable tool" : "Click to enable tool"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 12,
                            fontSize: "0.68rem",
                            cursor: "pointer",
                            background: adapter.is_enabled ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 255, 255, 0.06)",
                            border: adapter.is_enabled ? "1px solid rgba(0, 230, 118, 0.4)" : "1px solid var(--border-color)",
                            color: adapter.is_enabled ? "var(--sev-low)" : "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          <Power size={10} />
                          {adapter.is_enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    </div>

                    {/* Packaging / Install Source & Status Badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                      {getDetectionBadge(adapter.detection_state)}
                      {adapter.install_source && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            background: "rgba(0, 240, 255, 0.08)",
                            border: "1px solid rgba(0, 240, 255, 0.2)",
                            color: "var(--accent-cyan)",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {adapter.install_source}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p style={{ margin: "8px 0 10px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {adapter.description}
                    </p>

                    {/* Capabilities pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {adapter.capabilities.map((c) => (
                        <span
                          key={c}
                          style={{
                            fontSize: "0.68rem",
                            background: "rgba(255, 255, 255, 0.06)",
                            padding: "2px 8px",
                            borderRadius: 4,
                            color: "var(--text-muted)",
                          }}
                        >
                          {formatCapability(c)}
                        </span>
                      ))}
                    </div>

                    {/* Path info */}
                    <div
                      style={{
                        fontSize: "0.72rem",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        padding: "6px 10px",
                        borderRadius: 6,
                        fontFamily: "monospace",
                        color: adapter.resolved_path ? "var(--text-secondary)" : "var(--sev-high)",
                        wordBreak: "break-all",
                      }}
                    >
                      <strong>Resolved:</strong> {adapter.resolved_path || "Not found on host system"}
                      {adapter.custom_path && (
                        <div style={{ color: "var(--accent-cyan)", marginTop: 2 }}>
                          <strong>Custom Override:</strong> {adapter.custom_path}
                        </div>
                      )}
                    </div>

                    {/* Health check feedback if tested */}
                    {health && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: health.healthy ? "rgba(0, 230, 118, 0.1)" : "rgba(255, 82, 82, 0.1)",
                          borderLeft: `3px solid ${health.healthy ? "var(--sev-low)" : "var(--sev-high)"}`,
                          fontSize: "0.75rem",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: health.healthy ? "var(--sev-low)" : "var(--sev-high)" }}>
                          {health.healthy ? "✓ Verified Responsive" : "⚠ Health Probe Failed"} ({health.latency_ms} ms)
                        </div>
                        <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{health.message}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      {/* Execute Tool / Run Scan Button */}
                      <button
                        className="btn btn-primary"
                        data-testid={`run-tool-${adapter.id}`}
                        onClick={() => handleOpenExecuteModal(adapter)}
                        disabled={!adapter.is_available || !adapter.is_enabled}
                        style={{
                          fontSize: "0.75rem",
                          padding: "4px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Play size={12} /> Run Tool
                      </button>

                      {/* Test Health Button */}
                      <button
                        className="btn btn-secondary"
                        data-testid={`health-tool-${adapter.id}`}
                        onClick={() => handleTestHealth(adapter.id)}
                        disabled={isTesting}
                        style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Zap size={12} color="var(--accent-cyan)" />
                        {isTesting ? "Testing..." : "Health"}
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      {/* Install / Setup Guide Button */}
                      <button
                        className="btn btn-secondary"
                        data-testid={`guide-tool-${adapter.id}`}
                        onClick={() => setGuideTool(adapter)}
                        title="View Windows Installation & Setup Guide"
                        style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Terminal size={12} /> Guide
                      </button>

                      {/* Custom Path Button */}
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingPathTool(adapter);
                          setCustomPathInput(adapter.custom_path || adapter.resolved_path || "");
                        }}
                        title="Configure Custom Binary Path Override"
                        style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      >
                        Path
                      </button>

                      {/* External Docs */}
                      <a
                        href={adapter.documentation_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center" }}
                        title="Official Documentation"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. WORKFLOW STUDIO / VISUAL PIPELINE EDITOR */}
      {/* ========================================================= */}
      {activeSubTab === "workflows" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Curated Multi-Step Workflows</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                DAG multi-stage pipelines with automatic output piping, technology routing, and approval gates.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={loadWorkflows} style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
              Refresh Pipelines
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="card"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Pipeline Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                        {wf.name}
                      </h4>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
                        {wf.category}
                      </span>
                      {wf.is_builtin && (
                        <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>
                          Built-in
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 750 }}>
                      {wf.description}
                    </p>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleStartWorkflow(wf.id)}
                    disabled={launchingWfId === wf.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 18px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <Play size={14} />
                    {launchingWfId === wf.id ? "Launching..." : "Launch Pipeline"}
                  </button>
                </div>

                {/* Visual Step Pipeline / DAG */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", padding: "10px 0" }}>
                  {wf.steps.map((step, idx) => (
                    <React.Fragment key={step.step_id}>
                      <div
                        style={{
                          minWidth: 200,
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "var(--bg-secondary)",
                          border: step.requires_approval
                            ? "1px solid var(--sev-high)"
                            : "1px solid var(--border-color)",
                          boxShadow: step.requires_approval ? "0 0 10px rgba(255, 152, 0, 0.15)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Step {idx + 1}</span>
                          {step.requires_approval ? (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: "var(--sev-high)",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Lock size={10} /> Approval Gate
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.65rem", color: "var(--sev-low)" }}>Automatic</span>
                          )}
                        </div>

                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {step.name}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 6,
                            fontSize: "0.72rem",
                            color: "var(--accent-cyan)",
                          }}
                        >
                          <Server size={12} /> Tool: {step.tool_id}
                        </div>
                      </div>

                      {idx < wf.steps.length - 1 && (
                        <ArrowRight size={18} color="rgba(0, 240, 255, 0.6)" style={{ flexShrink: 0 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. LIVE JOB CENTER & MONITOR */}
      {/* ========================================================= */}
      {activeSubTab === "jobs" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
          {/* Job History List */}
          <div
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: "75vh",
              overflowY: "auto",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Execution Runs</h3>
              <button className="btn btn-secondary" onClick={loadJobs} style={{ fontSize: "0.72rem", padding: "3px 8px" }}>
                Refresh
              </button>
            </div>

            {jobs.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>
                No workflow jobs executed yet. Launch a pipeline from the Workflow Studio!
              </p>
            ) : (
              jobs.map((job) => {
                const isSelected = job.job_id === selectedJob?.job_id;
                return (
                  <div
                    key={job.job_id}
                    onClick={() => setSelectedJobId(job.job_id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isSelected ? "rgba(0, 240, 255, 0.12)" : "var(--bg-secondary)",
                      border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{job.workflow_name}</span>
                      {getJobStatusBadge(job.status)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {job.target_url}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>
                      <span>{new Date(job.started_at).toLocaleTimeString()}</span>
                      <span>Findings: {job.total_findings}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Job Details & Execution Progress */}
          {selectedJob ? (
            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Job Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>{selectedJob.workflow_name}</h3>
                    {getJobStatusBadge(selectedJob.status)}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Job ID: <code>{selectedJob.job_id}</code> | Target: <strong>{selectedJob.target_url}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {selectedJob.status === "running" && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCancelJob(selectedJob.job_id)}
                      style={{ fontSize: "0.8rem", color: "var(--sev-high)" }}
                    >
                      Cancel Job
                    </button>
                  )}
                  {selectedJob.total_findings > 0 && (
                    <button
                      className="btn btn-primary"
                      onClick={onNavigateToFindings}
                      style={{ fontSize: "0.8rem" }}
                    >
                      View Findings ({selectedJob.total_findings})
                    </button>
                  )}
                </div>
              </div>

              {/* Approval Gate Alert Banner if Waiting */}
              {selectedJob.status === "waiting_approval" && selectedJob.pending_approval_step && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 8,
                    background: "rgba(255, 152, 0, 0.12)",
                    border: "1px solid var(--sev-high)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <ShieldAlert size={28} color="var(--sev-high)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--sev-high)" }}>
                        Operator Authorization Required
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        Pipeline reached gate: <strong>{selectedJob.pending_approval_step}</strong>. Confirm authorization before active probing begins.
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleApproveStep(selectedJob.job_id, selectedJob.pending_approval_step!)}
                    style={{
                      background: "var(--sev-high)",
                      color: "#000",
                      fontWeight: 700,
                      padding: "8px 18px",
                      fontSize: "0.85rem",
                    }}
                  >
                    Approve Step & Resume
                  </button>
                </div>
              )}

              {/* Step Progress Execution List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-muted)" }}>Pipeline Step Status</h4>
                {selectedJob.step_runs.map((step, idx) => (
                  <div
                    key={step.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>#{idx + 1}</span>
                        <strong style={{ fontSize: "0.88rem" }}>{step.step_name}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)" }}>({step.tool_id})</span>
                      </div>
                      {step.artifacts && Object.keys(step.artifacts).length > 0 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          {Object.entries(step.artifacts).map(([k, v]) => (
                            <span key={k} style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                              <code>{k}</code>: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {step.duration_ms > 0 ? `${step.duration_ms} ms` : ""}
                      </span>
                      {getJobStatusBadge(step.status)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Real-time Job Console Logs */}
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem", color: "var(--text-muted)" }}>Pipeline Audit Log</h4>
                <div
                  style={{
                    background: "#080c14",
                    padding: 12,
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    color: "var(--accent-cyan)",
                    border: "1px solid rgba(0, 240, 255, 0.15)",
                  }}
                >
                  {selectedJob.logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: 2 }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "var(--text-muted)" }}>Select a job from the left to view details.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. EXTENSIONS & PLUGINS MANAGER */}
      {/* ========================================================= */}
      {activeSubTab === "extensions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Extension Manifest Lifecycle (V1)</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Future-proof pluggable sandboxed modules with explicit capabilities and runtime isolation.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowManifestModal(true)}
              style={{ fontSize: "0.8rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Code2 size={14} /> Register New Extension
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
            {extensions.map((ext) => (
              <div
                key={ext.manifest.id}
                className="card"
                style={{
                  background: "var(--bg-card)",
                  border: ext.state === "enabled" ? "1px solid rgba(0, 230, 118, 0.3)" : "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{ext.manifest.name}</h4>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        ID: <code>{ext.manifest.id}</code> | v{ext.manifest.version}
                      </span>
                    </div>
                    <span
                      className={`badge ${ext.state === "enabled" ? "badge-success" : "badge-low"}`}
                      style={{ textTransform: "capitalize" }}
                    >
                      {ext.state}
                    </span>
                  </div>

                  <p style={{ margin: "8px 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {ext.manifest.description}
                  </p>

                  <div style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", marginBottom: 8 }}>
                    <strong>Runtime:</strong> {ext.manifest.runtime} | <strong>Entrypoint:</strong> {ext.manifest.entrypoint}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ext.manifest.capabilities.map((c) => (
                      <span
                        key={c}
                        style={{
                          fontSize: "0.68rem",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>By: {ext.manifest.publisher}</span>
                  <button
                    className={`btn ${ext.state === "enabled" ? "btn-secondary" : "btn-primary"}`}
                    onClick={() => handleToggleExtension(ext)}
                    style={{ fontSize: "0.75rem", padding: "4px 12px" }}
                  >
                    {ext.state === "enabled" ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIRECT TOOL EXECUTION MODAL */}
      {/* ========================================================= */}
      {executingTool && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(100%, 650px)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Play size={18} color="var(--accent-cyan)" /> Execute Tool: {executingTool.name}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {executingTool.category} • {executingTool.install_source || "CLI Process"}
                </span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setExecutingTool(null)}
                style={{ fontSize: "0.75rem", padding: "4px 8px" }}
              >
                ✕ Close
              </button>
            </div>

            {/* Target & Scope Info */}
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Target Scope Authorization:</span>
                <span className="badge badge-success" style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldCheck size={12} /> Authorization Enforced
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select
                  className="input-field"
                  value={execTargetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setExecTargetId(id);
                    const t = targets.find((item) => item.id === id);
                    if (t) setExecTargetUrl(t.primary_url);
                  }}
                  style={{ flex: 1, fontSize: "0.82rem", padding: "6px 10px" }}
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.primary_url})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Target URL: <code style={{ color: "var(--accent-cyan)" }}>{execTargetUrl}</code>
              </div>
            </div>

            {/* Configurable Parameters */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>Execution Parameters:</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(execParams).map(([key, val]) => (
                  <div key={key}>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {key.replace(/_/g, " ")}:
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={val}
                      onChange={(e) => setExecParams({ ...execParams, [key]: e.target.value })}
                      style={{ width: "100%", fontSize: "0.8rem", padding: "4px 8px", marginTop: 2 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Action */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Timeout: 300s • Rate-limited safe process
              </span>
              <button
                className="btn btn-primary"
                onClick={handleExecuteTool}
                disabled={isExecutingTool}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  fontSize: "0.85rem",
                }}
              >
                <Play size={14} className={isExecutingTool ? "spin-anim" : ""} />
                {isExecutingTool ? "Executing Tool..." : "Run Safe Assessment"}
              </button>
            </div>

            {/* Error Message */}
            {toolExecError && (
              <div
                style={{
                  background: "rgba(255, 82, 82, 0.12)",
                  border: "1px solid var(--sev-high)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  color: "var(--sev-high)",
                  fontSize: "0.78rem",
                }}
              >
                ⚠ {toolExecError}
              </div>
            )}

            {/* Execution Result & Console */}
            {toolExecOutput && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`badge ${toolExecOutput.status === "Success" ? "badge-success" : "badge-high"}`}>
                      {toolExecOutput.status}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Duration: {toolExecOutput.duration_ms} ms
                    </span>
                  </div>

                  {toolExecOutput.findings.length > 0 && (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setExecutingTool(null);
                        onNavigateToFindings();
                      }}
                      style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Eye size={12} /> View Findings ({toolExecOutput.findings.length})
                    </button>
                  )}
                </div>

                {/* Console Log Output */}
                <div
                  style={{
                    background: "#080c14",
                    padding: 10,
                    borderRadius: 6,
                    maxHeight: 180,
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    color: "var(--accent-cyan)",
                    border: "1px solid rgba(0, 240, 255, 0.15)",
                  }}
                >
                  {toolExecOutput.logs.length === 0 ? (
                    <div style={{ color: "var(--text-muted)" }}>Execution completed with 0 console messages.</div>
                  ) : (
                    toolExecOutput.logs.map((log, idx) => <div key={idx}>{log}</div>)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* INSTALL & SETUP GUIDE MODAL */}
      {/* ========================================================= */}
      {guideTool && (() => {
        const info = getInstallInstructions(guideTool.id);
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
          >
            <div className="card" style={{ width: "min(100%, 580px)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
                    <Terminal size={18} color="var(--accent-cyan)" /> Setup Guide: {guideTool.name}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Method: {info.title}
                  </span>
                </div>
                <button className="btn btn-secondary" onClick={() => setGuideTool(null)} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                  ✕ Close
                </button>
              </div>

              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {info.note}
              </p>

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Windows PowerShell Installation Command:</label>
                <div
                  style={{
                    background: "#080c14",
                    padding: "10px 14px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    color: "var(--accent-cyan)",
                    border: "1px solid rgba(0, 240, 255, 0.2)",
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    position: "relative",
                  }}
                >
                  {info.command}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <a
                  href={guideTool.documentation_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <ExternalLink size={12} /> Official Project Releases & Documentation
                </a>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(info.command);
                      setCopiedCmd(true);
                      setTimeout(() => setCopiedCmd(false), 2000);
                    }}
                    style={{ fontSize: "0.78rem", padding: "5px 14px", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {copiedCmd ? <Check size={14} color="var(--sev-low)" /> : null}
                    {copiedCmd ? "Copied!" : "Copy Command"}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setGuideTool(null);
                      handleTestHealth(guideTool.id);
                    }}
                    style={{ fontSize: "0.78rem", padding: "5px 14px" }}
                  >
                    Test Health After Install
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* CUSTOM PATH OVERRIDE MODAL */}
      {/* ========================================================= */}
      {editingPathTool && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ width: 500, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Configure Custom Path: {editingPathTool.name}</h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Specify the absolute path to the executable binary or leave blank to restore automatic system detection.
            </p>

            <input
              type="text"
              placeholder="e.g. C:\Tools\bin\nuclei.exe or /usr/local/bin/nuclei"
              className="input-field"
              value={customPathInput}
              onChange={(e) => setCustomPathInput(e.target.value)}
              style={{ width: "100%", fontSize: "0.85rem" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button className="btn btn-secondary" onClick={() => setEditingPathTool(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveCustomPath}>
                Save Path Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REGISTER EXTENSION MANIFEST MODAL */}
      {/* ========================================================= */}
      {showManifestModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ width: 620, display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Register Extension Manifest (V1)</h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Paste valid JSON conforming to the APPSC Nexus Extension Manifest V1 schema.
            </p>

            <textarea
              className="input-field"
              rows={14}
              value={newManifestJson}
              onChange={(e) => setNewManifestJson(e.target.value)}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8rem" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowManifestModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRegisterManifest}>
                Register & Validate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
