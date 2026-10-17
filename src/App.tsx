import React, { useState, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import {
  Shield,
  Terminal,
  Layers,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Target as TargetIcon,
  Lock,
  Unlock,
  Download,
  History,
  FileCode,
  ArrowDownCircle,
  Compass,
  UploadCloud,
  Search,
  ExternalLink,
  Puzzle,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Radio,
  BookOpen,
  GraduationCap,
  Activity,
  Monitor,
  Cpu
} from "lucide-react";
import "./App.css";
import { AnalyticsDashboard } from "./Analytics";
import { MentorChat } from "./MentorChat";
import { HostMobileAudit } from "./HostMobileAudit";
import { CyberAcademy } from "./academy/CyberAcademy";
import { OrchestrationHub } from "./orchestration/OrchestrationHub";
import { Target, ToolInfo, PluginInfo, FeedUpdateResult, Finding, ScanResult, FindingStatus, DiscoveredEndpoint, ModelPullProgress } from "./types";


export default function App() {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "targets" | "orchestration" | "tools" | "crawler" | "scanner" | "findings" | "importer" | "mentor" | "history" | "academy" | "hostmobile"
  >("analytics");

  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [toolHubTab, setToolHubTab] = useState<"tools" | "plugins">("tools");
  const [showPluginModal, setShowPluginModal] = useState<boolean>(false);
  const [pluginModalMode, setPluginModalMode] = useState<"form" | "json">("form");
  const [customToolName, setCustomToolName] = useState<string>("");
  const [customToolExe, setCustomToolExe] = useState<string>("");
  const [customToolRuntime, setCustomToolRuntime] = useState<string>("standalone");
  const [customToolDesc, setCustomToolDesc] = useState<string>("");
  const [customToolTimeout, setCustomToolTimeout] = useState<number>(30);
  const [newPluginJson, setNewPluginJson] = useState<string>("");
  const [pluginRegisterStatus, setPluginRegisterStatus] = useState<string>("");
  const [showIntegrationGuide, setShowIntegrationGuide] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<"cli" | "python" | "burp_zap" | "wireshark" | "mobile">("cli");
  const [selectedPluginToRun, setSelectedPluginToRun] = useState<string>("");
  const [isUpdatingFeeds, setIsUpdatingFeeds] = useState<boolean>(false);
  const [feedStatus, setFeedStatus] = useState<string>("");
  const [feedLastUpdated, setFeedLastUpdated] = useState<string>("");
  const [cisaKevCount, setCisaKevCount] = useState<number>(1250);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>([]);

  // Target creation form
  const [targetName, setTargetName] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [allowLocalLab, setAllowLocalLab] = useState(false);
  const [targetError, setTargetError] = useState("");

  // Scan execution
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string>("baseline");

  // Crawler state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlDepth, setCrawlDepth] = useState<number>(2);
  const [crawlMaxPages, setCrawlMaxPages] = useState<number>(25);
  const [crawlFilter, setCrawlFilter] = useState<string>("");

  // Report Importer state
  const [importFormat, setImportFormat] = useState<"zap_json" | "burp_xml" | "generic_json">("zap_json");
  const [importContent, setImportContent] = useState<string>("");
  const [importStatus, setImportStatus] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Findings filters & search
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>("ALL");
  const [findingStatusFilter, setFindingStatusFilter] = useState<string>("ALL");
  const [findingSearchQuery, setFindingSearchQuery] = useState<string>("");

  // AI Mentor state
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [aiMode, setAiMode] = useState<"beginner" | "advanced">("beginner");
  const [reportStatus, setReportStatus] = useState<string>("");
  const [pullingModel, setPullingModel] = useState<string>("");
  const [pullStatus, setPullStatus] = useState<string>("");
  const [pullProgress, setPullProgress] = useState<ModelPullProgress | null>(null);

  const isTauriApp = isTauri();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauriApp) {
      listen<ModelPullProgress>("ollama-pull-progress", (event) => {
        setPullProgress(event.payload);
        if (event.payload.done) {
          setPullStatus(`Model '${event.payload.model}' ready for offline use!`);
          setPullingModel("");
          invoke<[boolean, string[]]>("get_ai_status").then(([avail, models]) => {
            setAiAvailable(avail);
            setAiModels(models);
            setSelectedModel(event.payload.model);
          });
        } else if (event.payload.error) {
          setPullStatus(`Download failed: ${event.payload.error}`);
          setPullingModel("");
        }
      }).then((u) => {
        unlisten = u;
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauriApp]);

  useEffect(() => {
    if (selectedTarget && isTauriApp) {
      loadEndpoints(selectedTarget.id);
    }
  }, [selectedTarget]);

  async function loadInitialData() {
    if (!isTauriApp) {
      console.warn("Running in Web Preview mode. Displaying sample data.");
      setTools([
        {
          id: "baseline",
          name: "Native Baseline Security Checks",
          version: "1.0.0",
          category: "Passive / Headers",
          is_available: true,
          path: "internal://rust",
          description: "Built-in scanner checking CSP, CORS, HSTS, cookie flags, and robots.txt.",
        },
        {
          id: "nuclei",
          name: "ProjectDiscovery Nuclei",
          version: "3.11.1",
          category: "Vulnerability Scanner",
          is_available: true,
          path: "tools/bin/nuclei.exe",
          description: "Template-based vulnerability scanner for CVEs and exposures.",
        },
        {
          id: "httpx",
          name: "ProjectDiscovery httpx",
          version: "1.12.0",
          category: "Service & Tech Prober",
          is_available: true,
          path: "tools/bin/httpx.exe",
          description: "Fast HTTP prober for service reachability and tech detection.",
        },
        {
          id: "nmap",
          name: "Nmap Network Scanner",
          version: "7.92",
          category: "Port & Service Discovery",
          is_available: true,
          path: "tools/bin/nmap/nmap-7.92/nmap.exe",
          description: "Network discovery and service version audit.",
        },
      ]);
      return;
    }

    try {
      const toolsList = await invoke<ToolInfo[]>("get_tools");
      setTools(toolsList);

      const targetsList = await invoke<Target[]>("get_targets");
      setTargets(targetsList);
      if (targetsList.length > 0) {
        setSelectedTarget(targetsList[0]);
      }

      const findingsList = await invoke<Finding[]>("get_findings");
      setFindings(findingsList);

      const historyList = await invoke<ScanResult[]>("get_scan_history");
      setScanHistory(historyList);

      const [available, models] = await invoke<[boolean, string[]]>("get_ai_status");
      setAiAvailable(available);
      const sortedModels = [...models].sort((a, b) => {
        if (a.includes("1b")) return -1;
        if (b.includes("1b")) return 1;
        return a.localeCompare(b);
      });
      setAiModels(sortedModels);
      if (sortedModels.length > 0) {
        setSelectedModel(sortedModels[0]);
      }

      const pluginsList = await invoke<PluginInfo[]>("get_plugins");
      setPlugins(pluginsList);
      if (pluginsList.length > 0) {
        setSelectedPluginToRun(pluginsList[0].id);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  function loadPluginTemplate(type: "python" | "node" | "binary") {
    if (type === "python") {
      setNewPluginJson(JSON.stringify({
        id: "my-custom-scanner",
        name: "My Custom Python Scanner",
        version: "1.0.0",
        publisher: "Security Team",
        runtime: "python3",
        executable: "run.py",
        capabilities: ["custom_check", "api_audit"],
        permissions: {
          network: ["in_scope_target_only"],
          filesystem: ["none"],
          environment: ["none"]
        },
        timeout_seconds: 30,
        description: "Custom Python plugin that checks specific business logic or API endpoints."
      }, null, 2));
    } else if (type === "node") {
      setNewPluginJson(JSON.stringify({
        id: "my-node-scanner",
        name: "My Node.js Security Script",
        version: "1.0.0",
        publisher: "Security Team",
        runtime: "node",
        executable: "index.js",
        capabilities: ["custom_check"],
        permissions: {
          network: ["in_scope_target_only"],
          filesystem: ["none"],
          environment: ["none"]
        },
        timeout_seconds: 30,
        description: "Node.js plugin performing targeted HTTP assertions."
      }, null, 2));
    } else {
      setNewPluginJson(JSON.stringify({
        id: "custom-binary-tool",
        name: "Custom Binary Scanner",
        version: "1.0.0",
        publisher: "Security Team",
        runtime: "standalone",
        executable: "scanner.exe",
        capabilities: ["binary_audit"],
        permissions: {
          network: ["in_scope_target_only"],
          filesystem: ["none"],
          environment: ["none"]
        },
        timeout_seconds: 45,
        description: "Standalone compiled binary scanner adapter."
      }, null, 2));
    }
  }

  async function handleRegisterQuickTool() {
    if (!customToolName.trim() || !customToolExe.trim()) {
      setPluginRegisterStatus("Please enter both Tool Name and Executable/Command.");
      return;
    }
    const cleanId = customToolName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const manifest = {
      id: cleanId || `tool-${Date.now()}`,
      name: customToolName.trim(),
      version: "1.0.0",
      publisher: "Local Administrator",
      runtime: customToolRuntime,
      executable: customToolExe.trim(),
      capabilities: ["custom_security_scan", "cli_adapter"],
      permissions: {
        network: ["in_scope_target_only"],
        filesystem: ["none"],
        environment: ["none"]
      },
      timeout_seconds: customToolTimeout || 30,
      description: customToolDesc.trim() || "Custom security tool integrated via AppSec Nexus Universal CLI Adapter."
    };
    setNewPluginJson(JSON.stringify(manifest, null, 2));
    if (!isTauriApp) {
      setPluginRegisterStatus("Desktop environment required to register tools.");
      return;
    }
    setPluginRegisterStatus("Registering custom tool adapter...");
    try {
      const registered = await invoke<PluginInfo>("register_plugin", { manifestJson: JSON.stringify(manifest) });
      setPlugins((prev) => [...prev.filter((p) => p.id !== registered.id), registered]);
      setPluginRegisterStatus(`✓ Tool '${registered.name}' registered successfully!`);
      setTimeout(() => {
        setShowPluginModal(false);
        setPluginRegisterStatus("");
        setCustomToolName("");
        setCustomToolExe("");
        setCustomToolDesc("");
      }, 1200);
    } catch (err: any) {
      setPluginRegisterStatus(`Error: ${err.toString()}`);
    }
  }

  async function handleRegisterPlugin() {
    if (!newPluginJson.trim()) {
      setPluginRegisterStatus("Please enter or load a manifest JSON first.");
      return;
    }
    if (!isTauriApp) {
      setPluginRegisterStatus("Desktop environment required to register plugins.");
      return;
    }
    setPluginRegisterStatus("Validating and registering plugin...");
    try {
      const registered = await invoke<PluginInfo>("register_plugin", { manifestJson: newPluginJson });
      setPlugins((prev) => [...prev.filter((p) => p.id !== registered.id), registered]);
      setPluginRegisterStatus(`✓ Plugin '${registered.name}' registered successfully!`);
      setTimeout(() => {
        setShowPluginModal(false);
        setPluginRegisterStatus("");
        setNewPluginJson("");
      }, 1200);
    } catch (err: any) {
      setPluginRegisterStatus(`Error: ${err.toString()}`);
    }
  }

  async function handleSyncThreatFeeds() {
    if (!isTauriApp) {
      setFeedStatus("Desktop environment required to update threat feeds.");
      return;
    }
    setIsUpdatingFeeds(true);
    setFeedStatus("Syncing Nuclei CVE templates and CISA Known Exploited Vulnerabilities catalog...");
    try {
      const res = await invoke<FeedUpdateResult>("update_threat_feeds");
      setCisaKevCount(res.cisa_kev_count);
      setFeedLastUpdated(new Date().toLocaleTimeString());
      setFeedStatus(res.message);
      // Reload plugins in case new plugins were added
      const updatedPlugins = await invoke<PluginInfo[]>("get_plugins");
      setPlugins(updatedPlugins);
      setTimeout(() => setFeedStatus(""), 7000);
    } catch (err: any) {
      setFeedStatus(`Feed sync failed: ${err.toString()}`);
    } finally {
      setIsUpdatingFeeds(false);
    }
  }

  async function loadEndpoints(targetId: string) {
    try {
      const list = await invoke<DiscoveredEndpoint[]>("get_endpoints", { targetId });
      setEndpoints(list);
    } catch (err) {
      console.error("Failed to load endpoints:", err);
    }
  }

  async function handleCreateTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError("");
    if (!isTauriApp) {
      alert("Target creation requires the native desktop window.");
      return;
    }

    try {
      const newTarget = await invoke<Target>("create_target", {
        name: targetName || targetUrl,
        primaryUrl: targetUrl,
        allowLocalLab,
      });
      setTargets([newTarget, ...targets]);
      setSelectedTarget(newTarget);
      setTargetName("");
      setTargetUrl("");
    } catch (err: any) {
      setTargetError(err.toString());
    }
  }

  async function handleRunScan(toolId: string) {
    if (!selectedTarget) {
      alert("Please select or configure an authorized target first.");
      return;
    }

    if (!isTauriApp) {
      alert("Live scans require running inside the native desktop application (appsec-nexus.exe).");
      return;
    }

    setIsScanning(true);
    setActiveTool(toolId);
    setScanLogs([`Starting ${toolId} scan against ${selectedTarget.primary_url}...`]);

    try {
      const result = await invoke<ScanResult>("run_scan", {
        targetId: selectedTarget.id,
        tool: toolId,
      });

      setScanLogs((prev) => [...prev, ...result.logs, `Completed in ${result.duration_ms} ms.`]);

      const updatedFindings = await invoke<Finding[]>("get_findings");
      setFindings(updatedFindings);

      const updatedHistory = await invoke<ScanResult[]>("get_scan_history");
      setScanHistory(updatedHistory);
    } catch (err: any) {
      setScanLogs((prev) => [...prev, `[ERROR] Scan aborted: ${err.toString()}`]);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleRunCrawler() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    if (!isTauriApp) {
      alert("Crawler execution requires the native desktop window.");
      return;
    }

    setIsCrawling(true);
    try {
      const discovered = await invoke<DiscoveredEndpoint[]>("run_crawler", {
        targetId: selectedTarget.id,
        maxDepth: crawlDepth,
        maxPages: crawlMaxPages,
      });
      setEndpoints(discovered);

      // Reload findings in case sensitive exposure findings were found
      const updatedFindings = await invoke<Finding[]>("get_findings");
      setFindings(updatedFindings);
    } catch (err: any) {
      alert(`Crawler error: ${err.toString()}`);
    } finally {
      setIsCrawling(false);
    }
  }

  async function handleImportReport() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    if (!importContent.trim()) {
      alert("Please paste the report content first.");
      return;
    }

    setIsImporting(true);
    setImportStatus("");
    try {
      const count = await invoke<number>("import_external_report", {
        targetId: selectedTarget.id,
        format: importFormat,
        data: importContent,
      });

      setImportStatus(`Successfully ingested ${count} findings into SQLite database.`);
      setImportContent("");

      const updatedFindings = await invoke<Finding[]>("get_findings");
      setFindings(updatedFindings);
    } catch (err: any) {
      setImportStatus(`Import Error: ${err.toString()}`);
    } finally {
      setIsImporting(false);
    }
  }

  async function handleExportReport() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    try {
      const filename = await invoke<string>("export_report", {
        targetId: selectedTarget.id,
      });
      setReportStatus(`HTML report exported: ${filename}`);
      setTimeout(() => setReportStatus(""), 8000);
    } catch (err: any) {
      alert("Failed to export report: " + err.toString());
    }
  }

  async function handleExportJson() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    try {
      const filename = await invoke<string>("export_report_json", {
        targetId: selectedTarget.id,
      });
      setReportStatus(`JSON report exported: ${filename}`);
      setTimeout(() => setReportStatus(""), 8000);
    } catch (err: any) {
      alert("Failed to export JSON report: " + err.toString());
    }
  }

  async function handleUpdateFindingStatus(findingId: string, status: FindingStatus) {
    try {
      await invoke("update_finding_status", { findingId, status });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status } : f))
      );
    } catch (err: any) {
      console.error("Failed to update finding status:", err);
    }
  }

  async function handleRefreshAiStatus() {
    try {
      const [available, models] = await invoke<[boolean, string[]]>("get_ai_status");
      setAiAvailable(available);
      setAiModels(models);
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0]);
      }
    } catch (err: any) {
      console.error("Failed to refresh AI status:", err);
    }
  }

  async function handlePullModel(modelName: string) {
    setPullingModel(modelName);
    setPullStatus(`Connecting to local Ollama and downloading '${modelName}'...`);
    setPullProgress({
      model: modelName,
      status: "Connecting...",
      completed: 0,
      total: 0,
      percentage: 0,
      done: false
    });
    try {
      const msg = await invoke<string>("pull_ai_model", { model: modelName });
      setPullStatus(msg);
      await handleRefreshAiStatus();
    } catch (err: any) {
      setPullStatus(`Download failed: ${err.toString()}`);
    } finally {
      setPullingModel("");
    }
  }

  function handleExplainWithAi(finding: Finding) {
    setSelectedFinding(finding);
  }

  // Filtered Findings
  const filteredFindings = findings.filter((f) => {
    if (findingSeverityFilter !== "ALL" && f.severity !== findingSeverityFilter) {
      return false;
    }
    if (findingStatusFilter !== "ALL" && f.status !== findingStatusFilter) {
      return false;
    }
    if (findingSearchQuery.trim()) {
      const q = findingSearchQuery.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchAsset = f.affected_asset.toLowerCase().includes(q);
      const matchTool = f.source_tool.toLowerCase().includes(q);
      const matchCwe = (f.cwe || "").toLowerCase().includes(q);
      return matchTitle || matchAsset || matchTool || matchCwe;
    }
    return true;
  });

  // Filtered Endpoints
  const filteredEndpoints = endpoints.filter((ep) => {
    if (!crawlFilter.trim()) return true;
    const q = crawlFilter.toLowerCase();
    return (
      ep.url.toLowerCase().includes(q) ||
      ep.method.toLowerCase().includes(q) ||
      ep.source.toLowerCase().includes(q)
    );
  });

  // Severity Counts
  const critCount = findings.filter((f) => f.severity === "Critical").length;
  const highCount = findings.filter((f) => f.severity === "High").length;
  const medCount = findings.filter((f) => f.severity === "Medium").length;
  const lowCount = findings.filter((f) => f.severity === "Low").length;
  const infoCount = findings.filter((f) => f.severity === "Info").length;

  return (
    <div className="app-container">
      {/* Browser Warning Banner */}
      {!isTauriApp && (
        <div style={{ backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#facc15", padding: "6px 20px", fontSize: "0.8rem", textAlign: "center", borderBottom: "1px solid rgba(245, 158, 11, 0.4)" }}>
          ⚠️ You are viewing AppSec Nexus in a web browser preview. For native OS process execution, Nmap, and SQLite storage, switch to the <strong>appsec-nexus.exe</strong> desktop window.
        </div>
      )}

      {/* Top Header */}
      <header className="top-nav">
        <div className="brand">
          <Shield className="brand-icon" size={24} />
          <span>AppSec Nexus</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Desktop Platform</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {selectedTarget && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-dim)" }}>Target:</span>
              <span style={{ fontWeight: 600 }}>{selectedTarget.primary_url}</span>
              {selectedTarget.scope.allow_local_lab ? (
                <span className="badge badge-lab">
                  <Unlock size={12} /> Lab Mode (Private IPs Allowed)
                </span>
              ) : (
                <span className="badge badge-locked">
                  <Lock size={12} /> Scope Protected (SSRF Guard Active)
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: aiAvailable ? "var(--accent-emerald)" : "var(--accent-amber)",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {aiAvailable ? `Local AI: Online (${aiModels.length} models)` : "Local AI: Offline"}
            </span>
          </div>

          <button
            className="btn btn-danger"
            onClick={() => {
              setIsScanning(false);
              setIsCrawling(false);
              setScanLogs((prev) => [...prev, "[!] Emergency Kill Triggered: All active scan jobs terminated."]);
            }}
          >
            Emergency Stop
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="main-layout">
        {/* Navigation Sidebar */}
        <aside className="sidebar">
          <div
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <Activity size={18} color={activeTab === "analytics" ? "var(--accent-cyan)" : undefined} />
            <span>Security Analytics</span>
          </div>

          <div
            className={`nav-item ${activeTab === "targets" ? "active" : ""}`}
            onClick={() => setActiveTab("targets")}
          >
            <TargetIcon size={18} />
            <span>Target & Scope</span>
          </div>

          <div
            className={`nav-item ${activeTab === "orchestration" ? "active" : ""}`}
            onClick={() => setActiveTab("orchestration")}
          >
            <Cpu size={18} color={activeTab === "orchestration" ? "var(--accent-cyan)" : undefined} />
            <span>Universal Orchestration</span>
          </div>

          <div
            className={`nav-item ${activeTab === "tools" ? "active" : ""}`}
            onClick={() => setActiveTab("tools")}
          >
            <Layers size={18} />
            <span>Tools & Plugins ({tools.filter((t) => t.is_available).length + plugins.filter((p) => p.is_available).length} Ready)</span>
          </div>

          <div
            className={`nav-item ${activeTab === "crawler" ? "active" : ""}`}
            onClick={() => setActiveTab("crawler")}
          >
            <Compass size={18} />
            <span>Crawler & Endpoints ({endpoints.length})</span>
          </div>

          <div
            className={`nav-item ${activeTab === "scanner" ? "active" : ""}`}
            onClick={() => setActiveTab("scanner")}
          >
            <Terminal size={18} />
            <span>Scan Console</span>
          </div>

          <div
            className={`nav-item ${activeTab === "findings" ? "active" : ""}`}
            onClick={() => setActiveTab("findings")}
          >
            <AlertTriangle size={18} />
            <span>Findings ({findings.length})</span>
          </div>

          <div
            className={`nav-item ${activeTab === "importer" ? "active" : ""}`}
            onClick={() => setActiveTab("importer")}
          >
            <UploadCloud size={18} />
            <span>Import Reports</span>
          </div>

          <div
            className={`nav-item ${activeTab === "hostmobile" ? "active" : ""}`}
            onClick={() => setActiveTab("hostmobile")}
          >
            <Monitor size={18} color={activeTab === "hostmobile" ? "var(--accent-blue)" : undefined} />
            <span>Host & Mobile Audit</span>
          </div>

          <div
            className={`nav-item ${activeTab === "mentor" ? "active" : ""}`}
            onClick={() => setActiveTab("mentor")}
          >
            <Sparkles size={18} />
            <span>Local AI Mentor</span>
          </div>

          <div
            className={`nav-item ${activeTab === "academy" ? "active" : ""}`}
            onClick={() => setActiveTab("academy")}
          >
            <GraduationCap size={18} />
            <span>Cyber Academy</span>
          </div>

          <div
            className={`nav-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={18} />
            <span>Audit History ({scanHistory.length})</span>
          </div>
        </aside>

        {/* Center Workspace */}
        <main className="workspace">
          {/* TAB 0: SECURITY ANALYTICS */}
          {activeTab === "analytics" && (
            <AnalyticsDashboard
              targets={targets}
              selectedTarget={selectedTarget}
              onSelectTarget={(t) => setSelectedTarget(t)}
              findings={findings}
              endpoints={endpoints}
              scanHistory={scanHistory}
              onNavigateTab={(tab, filterSeverity) => {
                if (filterSeverity) {
                  setFindingSeverityFilter(filterSeverity);
                }
                setActiveTab(tab);
              }}
              onQuickScan={(toolId) => {
                handleRunScan(toolId);
              }}
              isScanning={isScanning}
            />
          )}

          {/* TAB 1: TARGETS & SCOPE */}
          {activeTab === "targets" && (
            <div>
              <div className="card">
                <h2 className="card-title">
                  <TargetIcon size={20} color="var(--accent-cyan)" />
                  Configure Authorized Target
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                  AppSec Nexus enforces strict scope validation. Any out-of-scope domain, redirect, or private IP will be blocked before any network request is transmitted.
                </p>

                <form onSubmit={handleCreateTarget} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                      Target Display Name
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. Acme Corp Staging API or OWASP Juice Shop Lab"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                      Target Address (Website URL, Domain, or Android .apk File Path)
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. example.com, https://app.example.com, or C:\downloads\app.apk"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                    <input
                      type="checkbox"
                      id="labMode"
                      checked={allowLocalLab}
                      onChange={(e) => setAllowLocalLab(e.target.checked)}
                    />
                    <label htmlFor="labMode" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                      Enable Local Lab Mode (allows loopback 127.0.0.1 and private subnets for testing local docker apps)
                    </label>
                  </div>

                  {targetError && (
                    <div style={{ color: "var(--accent-rose)", fontSize: "0.85rem", marginTop: "4px" }}>
                      [Scope Guard Block] {targetError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
                    Add & Lock Scope
                  </button>
                </form>
              </div>

              {/* Target List */}
              <div className="card">
                <h3 className="card-title">Authorized Targets ({targets.length})</h3>
                {targets.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No targets configured yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {targets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTarget(t)}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          backgroundColor: selectedTarget?.id === t.id ? "rgba(6, 182, 212, 0.12)" : "var(--bg-secondary)",
                          border: `1px solid ${selectedTarget?.id === t.id ? "var(--accent-cyan)" : "var(--border-color)"}`,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.primary_url}</div>
                        </div>
                        {t.scope.allow_local_lab ? (
                          <span className="badge badge-lab">Lab Mode</span>
                        ) : (
                          <span className="badge badge-locked">Protected Scope</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: UNIVERSAL TOOL & EXTENSION ORCHESTRATION */}
          {activeTab === "orchestration" && (
            <OrchestrationHub
              targets={targets}
              selectedTargetId={selectedTarget?.id || (targets[0]?.id ?? "")}
              onSelectTarget={(id) => {
                const found = targets.find((t) => t.id === id);
                if (found) setSelectedTarget(found);
              }}
              onNavigateToFindings={() => setActiveTab("findings")}
            />
          )}

          {/* TAB 2: TOOL HUB */}
          {activeTab === "tools" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={20} color="var(--accent-cyan)" /> Tool Hub & Security Plugins
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                    Native orchestration engines and extensible sandbox plugins for targeted web security assessments.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ display: "flex", background: "var(--bg-secondary)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <button
                      className={`btn ${toolHubTab === "tools" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "6px" }}
                      onClick={() => setToolHubTab("tools")}
                    >
                      <Layers size={14} /> Core Tools ({tools.length})
                    </button>
                    <button
                      className={`btn ${toolHubTab === "plugins" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "6px" }}
                      onClick={() => setToolHubTab("plugins")}
                    >
                      <Puzzle size={14} /> Security Plugins ({plugins.length})
                    </button>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
                    disabled={isUpdatingFeeds}
                    onClick={handleSyncThreatFeeds}
                  >
                    <RefreshCw size={14} className={isUpdatingFeeds ? "spin" : ""} color="var(--accent-cyan)" />
                    {isUpdatingFeeds ? "Syncing Feeds..." : "Sync Threat Feeds & CVEs"}
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
                    onClick={() => {
                      loadPluginTemplate("python");
                      setShowPluginModal(true);
                    }}
                  >
                    <PlusCircle size={15} color="var(--accent-cyan)" /> Register Plugin
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
                    onClick={() => setShowIntegrationGuide(true)}
                  >
                    <BookOpen size={15} color="var(--accent-cyan)" /> Integration Guide & Help
                  </button>
                </div>
              </div>

              {/* THREAT INTELLIGENCE FEED BANNER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Radio size={16} color="var(--accent-cyan)" />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent-cyan)" }}>
                      Live Vulnerability Intelligence:
                    </span>{" "}
                    <span style={{ fontSize: "0.82rem", color: "var(--text-main)" }}>
                      10,000+ Nuclei Community Templates • {cisaKevCount}+ CISA Known Exploited Vulnerabilities (KEV) Catalog
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                  {feedLastUpdated ? `Last Synced: ${feedLastUpdated}` : "Auto-Sync: Ready"}
                </div>
              </div>

              {feedStatus && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    backgroundColor: feedStatus.includes("failed") ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: feedStatus.includes("failed") ? "var(--accent-red)" : "var(--accent-emerald)",
                    border: `1px solid ${feedStatus.includes("failed") ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                  }}
                >
                  {feedStatus}
                </div>
              )}

              {/* VIEW 1: CORE TOOLS */}
              {toolHubTab === "tools" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                  {tools.map((tool) => (
                    <div key={tool.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{tool.name}</div>
                          <span
                            className={`badge ${tool.is_available ? "badge-locked" : "badge-critical"}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: tool.is_available ? "rgba(16, 185, 129, 0.15)" : undefined,
                              color: tool.is_available ? "var(--accent-emerald)" : undefined,
                              borderColor: tool.is_available ? "rgba(16, 185, 129, 0.4)" : undefined,
                            }}
                          >
                            {tool.is_available ? "✓ Installed & Ready" : "Missing Binary"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                          Category: {tool.category} • v{tool.version}
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>
                          {tool.description}
                        </p>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace" }} title={tool.path}>
                          {tool.path.length > 32 ? "..." + tool.path.slice(-28) : tool.path}
                        </span>
                        {tool.id === "ollama" ? (
                          <button
                            className="btn btn-secondary"
                            onClick={() => setActiveTab("mentor")}
                            style={{ display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <Sparkles size={14} color="var(--accent-cyan)" /> Open AI Mentor
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            disabled={!tool.is_available || isScanning}
                            onClick={() => {
                              setActiveTab("scanner");
                              handleRunScan(tool.id);
                            }}
                          >
                            <Play size={14} /> Run Check
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* VIEW 2: SECURITY PLUGINS */}
              {toolHubTab === "plugins" && (
                <div>
                  {plugins.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                      <Puzzle size={40} color="var(--text-dim)" style={{ margin: "0 auto 12px" }} />
                      <h3>No Plugins Detected</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "480px", margin: "8px auto" }}>
                        Plugins live in <code>tools/plugins/&lt;plugin-id&gt;/manifest.json</code>. Click 'Register Plugin' above to add one.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
                      {plugins.map((plugin) => (
                        <div key={plugin.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Puzzle size={16} color="var(--accent-cyan)" /> {plugin.name}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                                  v{plugin.version} • By {plugin.publisher}
                                </div>
                              </div>
                              <span
                                className="badge badge-locked"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                                  color: "var(--accent-emerald)",
                                  borderColor: "rgba(16, 185, 129, 0.4)",
                                }}
                              >
                                ✓ Active Plugin
                              </span>
                            </div>

                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
                              {plugin.description}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                              <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                                Runtime: {plugin.runtime}
                              </span>
                              <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                                Timeout: {plugin.timeout_seconds}s
                              </span>
                              {plugin.capabilities.map((cap) => (
                                <span key={cap} className="badge" style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.1)", color: "var(--accent-cyan)" }}>
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }} title={plugin.executable}>
                              {plugin.executable}
                            </span>
                            <button
                              className="btn btn-primary"
                              disabled={isScanning || !selectedTarget}
                              onClick={() => {
                                setActiveTab("scanner");
                                handleRunScan(plugin.id);
                              }}
                              style={{ display: "flex", alignItems: "center", gap: "6px" }}
                            >
                              <Play size={14} /> Run Plugin
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL: REGISTER NEW PLUGIN */}
              {showPluginModal && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="card"
                    style={{
                      width: "600px",
                      maxWidth: "92vw",
                      maxHeight: "90vh",
                      overflowY: "auto",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Puzzle size={18} color="var(--accent-cyan)" /> Integrate Local Tool / Plugin
                      </h3>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => {
                          setShowPluginModal(false);
                          setPluginRegisterStatus("");
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "12px" }}>
                      Easily hook any tool or script installed on your PC (e.g. <code>trivy</code>, <code>semgrep</code>, <code>gitleaks</code>, <code>tshark</code>, or custom scripts). AppSec Nexus automatically checks system PATH and runs them natively.
                    </p>

                    {/* MODE SWITCHER */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                      <button
                        className={`btn ${pluginModalMode === "form" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                        onClick={() => setPluginModalMode("form")}
                      >
                        Quick Tool Form (Recommended)
                      </button>
                      <button
                        className={`btn ${pluginModalMode === "json" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                        onClick={() => setPluginModalMode("json")}
                      >
                        Advanced JSON Editor
                      </button>
                    </div>

                    {pluginModalMode === "form" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                            Tool Name
                          </label>
                          <input
                            className="input-field"
                            placeholder="e.g. Trivy Container & SBOM Scanner"
                            value={customToolName}
                            onChange={(e) => setCustomToolName(e.target.value)}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                              Command Name or File Path
                            </label>
                            <input
                              className="input-field"
                              placeholder="e.g. trivy or C:\tools\scanner.exe or audit.py"
                              value={customToolExe}
                              onChange={(e) => setCustomToolExe(e.target.value)}
                            />
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                              Checks system PATH or file directory.
                            </span>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                              Runtime
                            </label>
                            <select
                              className="input-field"
                              value={customToolRuntime}
                              onChange={(e) => setCustomToolRuntime(e.target.value)}
                            >
                              <option value="standalone">Standalone / PATH CLI</option>
                              <option value="python3">Python 3 Script</option>
                              <option value="node">Node.js Script</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                              Timeout (s)
                            </label>
                            <input
                              type="number"
                              className="input-field"
                              value={customToolTimeout}
                              min={5}
                              max={300}
                              onChange={(e) => setCustomToolTimeout(parseInt(e.target.value) || 30)}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                            Description & Purpose
                          </label>
                          <input
                            className="input-field"
                            placeholder="e.g. Scans source code and containers for known CVEs"
                            value={customToolDesc}
                            onChange={(e) => setCustomToolDesc(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", alignSelf: "center" }}>Preset Templates:</span>
                          <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.75rem" }} onClick={() => loadPluginTemplate("python")}>
                            Python 3
                          </button>
                          <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.75rem" }} onClick={() => loadPluginTemplate("node")}>
                            Node.js
                          </button>
                          <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.75rem" }} onClick={() => loadPluginTemplate("binary")}>
                            Compiled Binary (.exe)
                          </button>
                        </div>

                        <textarea
                          rows={12}
                          value={newPluginJson}
                          onChange={(e) => setNewPluginJson(e.target.value)}
                          placeholder="Paste manifest.json content here..."
                          style={{
                            width: "100%",
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            backgroundColor: "#080c14",
                            color: "#a5f3fc",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            padding: "10px",
                            marginBottom: "12px",
                            resize: "vertical",
                          }}
                        />
                      </div>
                    )}

                    {pluginRegisterStatus && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          marginBottom: "12px",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          backgroundColor: pluginRegisterStatus.includes("Error") ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: pluginRegisterStatus.includes("Error") ? "var(--accent-red)" : "var(--accent-emerald)",
                          border: `1px solid ${pluginRegisterStatus.includes("Error") ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                        }}
                      >
                        {pluginRegisterStatus}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowPluginModal(false);
                          setPluginRegisterStatus("");
                        }}
                      >
                        Cancel
                      </button>
                      {pluginModalMode === "form" ? (
                        <button className="btn btn-primary" onClick={handleRegisterQuickTool}>
                          <CheckCircle2 size={14} /> Register & Enable Tool
                        </button>
                      ) : (
                        <button className="btn btn-primary" onClick={handleRegisterPlugin}>
                          <CheckCircle2 size={14} /> Validate & Register Manifest
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: UNIVERSAL TOOL INTEGRATION GUIDE */}
              {showIntegrationGuide && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(5px)",
                  }}
                >
                  <div
                    className="card"
                    style={{
                      width: "780px",
                      maxWidth: "94vw",
                      maxHeight: "88vh",
                      overflowY: "auto",
                      boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
                      border: "1px solid var(--border-color)",
                      padding: "24px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                        <BookOpen size={20} color="var(--accent-cyan)" /> Universal Tool Integration Playbook
                      </h3>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => setShowIntegrationGuide(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                      AppSec Nexus is designed as an open DevSecOps workbench. You can easily plug in any command-line scanner, network inspector, or custom script installed on your computer.
                    </p>

                    {/* GUIDE NAVIGATION TABS */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                      <button
                        className={`btn ${guideTab === "cli" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("cli")}
                      >
                        1. CLI & Standalone Tools
                      </button>
                      <button
                        className={`btn ${guideTab === "python" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("python")}
                      >
                        2. Python Security Scripts
                      </button>
                      <button
                        className={`btn ${guideTab === "burp_zap" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("burp_zap")}
                      >
                        3. Burp Suite & OWASP ZAP
                      </button>
                      <button
                        className={`btn ${guideTab === "wireshark" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("wireshark")}
                      >
                        4. Wireshark & PCAP Traffic
                      </button>
                      <button
                        className={`btn ${guideTab === "mobile" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("mobile")}
                      >
                        5. Android Mobile (APK)
                      </button>
                    </div>

                    {/* TAB CONTENT: 1. CLI TOOLS */}
                    {guideTab === "cli" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Integrating Standalone CLI Tools (Trivy, Semgrep, Gitleaks, etc.)
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Install the tool on your machine:</strong>
                            <div style={{ background: "#080c14", padding: "8px 12px", borderRadius: "6px", fontFamily: "monospace", marginTop: "4px" }}>
                              winget install AquaSecurity.Trivy<br />
                              pip install semgrep<br />
                              winget install gitleaks
                            </div>
                          </li>
                          <li>
                            <strong>Open the Tool Form:</strong> Click the <em>"Register Plugin"</em> button at the top of the Tool Hub.
                          </li>
                          <li>
                            <strong>Enter Tool Details:</strong>
                            <ul style={{ paddingLeft: "16px", marginTop: "4px" }}>
                              <li><strong>Tool Name:</strong> e.g. <code>Trivy Vulnerability Scanner</code></li>
                              <li><strong>Command Name:</strong> Enter the command name (e.g. <code>trivy</code>) or full file path (e.g. <code>C:\tools\scanner.exe</code>).</li>
                              <li><strong>Runtime:</strong> Select <code>Standalone / PATH CLI</code>.</li>
                            </ul>
                          </li>
                          <li>
                            <strong>Run the Scan:</strong> Select your target in the Scan Console and click <strong>Run Plugin</strong>. AppSec Nexus executes the command, streams console output live, and automatically parses any CVE or security alert keywords!
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* TAB CONTENT: 2. PYTHON SCRIPTS */}
                    {guideTab === "python" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Writing Custom Python Security Auditors
                        </h4>
                        <p style={{ color: "var(--text-muted)", marginBottom: "8px" }}>
                          Python plugins run using your local Python 3 installation. They receive the target address as the first argument (<code>sys.argv[1]</code>).
                        </p>
                        <div style={{ background: "#080c14", padding: "10px 14px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto" }}>
                          <span style={{ color: "var(--accent-cyan)" }}># sample_audit.py</span><br />
                          import sys, json, urllib.request<br /><br />
                          target = sys.argv[1]<br />
                          print(json.dumps(&#123;<br />
                          &nbsp;&nbsp;"target": target,<br />
                          &nbsp;&nbsp;"findings": [&#123;<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"title": "Custom Security Check Passed",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"severity": "Info",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"summary": "Audited target headers successfully.",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"evidence": "Response status 200 OK",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"cwe": "CWE-200",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"remediation": "No remediation required."<br />
                          &nbsp;&nbsp;&#125;],<br />
                          &nbsp;&nbsp;"logs": ["Audit complete!"]<br />
                          &#125;, indent=2))
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: 3. BURP SUITE & ZAP */}
                    {guideTab === "burp_zap" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Burp Suite & OWASP ZAP Ingestion & Proxy Chaining
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Upstream Proxy Inspection:</strong> Route browsers or testing scripts through Burp Suite at <code>http://127.0.0.1:8080</code> to view and intercept live HTTP history.
                          </li>
                          <li>
                            <strong>Export Findings from Burp Suite:</strong> In Burp, go to <em>Target &gt; Site map</em>, right-click on your target or issues list, and select <em>Export issues as XML</em>.
                          </li>
                          <li>
                            <strong>Export Findings from OWASP ZAP:</strong> In ZAP, select <em>Report &gt; Generate Report</em> and choose <em>JSON</em> format.
                          </li>
                          <li>
                            <strong>1-Click Import in AppSec Nexus:</strong> Navigate to the <strong>Import Reports</strong> tab, select your format, paste the content, and click <strong>Parse & Import Findings</strong>. All vulnerabilities are automatically ingested and paired with the local **Ollama AI Remediation** engine!
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* TAB CONTENT: 4. WIRESHARK & PCAP */}
                    {guideTab === "wireshark" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Wireshark & Network Packet Inspection
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Capture Network Packets:</strong> Use Wireshark or <code>tcpdump</code> to record network traffic, then save the capture as a <code>.pcap</code> or <code>.pcapng</code> file.
                          </li>
                          <li>
                            <strong>Configure Target in AppSec Nexus:</strong> In <em>Configure Authorized Target</em>, enter the full path to your capture file (e.g. <code>C:\captures\network_traffic.pcap</code>).
                          </li>
                          <li>
                            <strong>Execute PCAP Auditor:</strong> Select the <strong>Wireshark PCAP & Network Traffic Auditor</strong> plugin and click Run.
                          </li>
                          <li>
                            <strong>Automatic Leak Detection:</strong> The auditor flags unencrypted HTTP Basic Auth credentials, FTP/Telnet plaintext passwords, deprecated SSL 3.0 / TLS 1.0 sessions, and open cleartext ports.
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* TAB CONTENT: 5. MOBILE SECURITY */}
                    {guideTab === "mobile" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Android APK Static Security Auditing
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Add Target:</strong> In <em>Configure Authorized Target</em>, set the Target Address to the local <code>.apk</code> path (e.g. <code>C:\downloads\my_app.apk</code>).
                          </li>
                          <li>
                            <strong>Run Android APK Auditor:</strong> Select <code>android-apk-auditor</code> and start the audit.
                          </li>
                          <li>
                            <strong>Security Coverage:</strong> Automatically inspects AndroidManifest.xml flags (<code>debuggable</code>, <code>allowBackup</code>, <code>usesCleartextTraffic</code>), flags high-risk permissions (SMS, microphone, GPS), detects exported components (CWE-926), and extracts hardcoded API keys and tokens from <code>classes.dex</code> bytecode.
                          </li>
                        </ol>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                        Documentation file also saved at <code>docs/TOOL_INTEGRATION_GUIDE.md</code>
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowIntegrationGuide(false)}
                        >
                          Close Guide
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setShowIntegrationGuide(false);
                            setShowPluginModal(true);
                          }}
                        >
                          <PlusCircle size={14} /> Open Tool Registration
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CRAWLER & ENDPOINTS */}
          {activeTab === "crawler" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h2 className="card-title" style={{ margin: 0 }}>
                      <Compass size={20} color="var(--accent-cyan)" />
                      Bounded Low-Impact Crawler & Endpoint Discovery
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                      Safe HTML link discovery, form action harvesting, and sensitive path auditing (.git, .env, robots.txt, sitemaps).
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-dim)" }}>Depth:</span>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={crawlDepth}
                        onChange={(e) => setCrawlDepth(parseInt(e.target.value) || 2)}
                        style={{ width: "45px", padding: "4px 6px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-dim)" }}>Max Pages:</span>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={crawlMaxPages}
                        onChange={(e) => setCrawlMaxPages(parseInt(e.target.value) || 25)}
                        style={{ width: "55px", padding: "4px 6px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={isCrawling || !selectedTarget}
                      onClick={handleRunCrawler}
                    >
                      <Play size={14} /> {isCrawling ? "Crawling Target..." : "Start Discovery"}
                    </button>
                    {selectedTarget && (
                      <button className="btn btn-secondary" onClick={() => loadEndpoints(selectedTarget.id)}>
                        <RotateCcw size={14} /> Refresh
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter box */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "10px", top: "11px" }} />
                    <input
                      className="input-field"
                      placeholder="Filter discovered endpoints by path, method, or source..."
                      value={crawlFilter}
                      onChange={(e) => setCrawlFilter(e.target.value)}
                      style={{ paddingLeft: "32px", height: "36px", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                {endpoints.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", padding: "16px 0" }}>
                    No endpoints discovered yet. Click 'Start Discovery' above to crawl {selectedTarget?.primary_url || "target"}.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Discovered URL</th>
                        <th>Source</th>
                        <th>Content-Type</th>
                        <th>Discovered At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEndpoints.map((ep) => (
                        <tr key={ep.id}>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                color: ep.method === "POST" ? "var(--accent-amber)" : "var(--accent-cyan)",
                              }}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                ep.status_code === 200
                                  ? "badge-locked"
                                  : ep.status_code >= 400
                                  ? "badge-critical"
                                  : "badge-info"
                              }`}
                            >
                              {ep.status_code || "FORM"}
                            </span>
                          </td>
                          <td style={{ maxWidth: "380px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <a
                              href={ep.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "var(--text-main)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              {ep.url} <ExternalLink size={11} color="var(--text-dim)" />
                            </a>
                          </td>
                          <td>
                            <span className="badge badge-info">{ep.source}</span>
                          </td>
                          <td style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                            {ep.content_type || "N/A"}
                          </td>
                          <td style={{ color: "var(--text-dim)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                            {ep.discovered_at.slice(11, 19)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SCAN CONSOLE */}
          {activeTab === "scanner" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 className="card-title" style={{ margin: 0 }}>
                    <Terminal size={18} color="var(--accent-cyan)" /> Live Scan Terminal ({activeTool})
                  </h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("baseline")}
                    >
                      Baseline Scan
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("httpx")}
                    >
                      httpx Probe
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("nuclei")}
                    >
                      Nuclei Audit
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("nmap")}
                    >
                      Nmap Scan
                    </button>

                    {plugins.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "4px" }}>
                        <select
                          value={selectedPluginToRun}
                          onChange={(e) => setSelectedPluginToRun(e.target.value)}
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.82rem",
                            background: "var(--bg-secondary)",
                            color: "var(--accent-cyan)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                          }}
                        >
                          {plugins.map((p) => (
                            <option key={p.id} value={p.id}>
                              Plugin: {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-primary"
                          disabled={isScanning || !selectedPluginToRun}
                          onClick={() => handleRunScan(selectedPluginToRun)}
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <Play size={13} /> Run Plugin
                        </button>
                      </div>
                    )}

                    <button
                      className="btn btn-secondary"
                      onClick={() => setScanLogs([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="console-box" style={{ height: "450px" }}>
                  {scanLogs.length === 0 ? (
                    <div style={{ color: "var(--text-dim)" }}>
                      // Terminal ready. Select an authorized target and click any scan button above.
                    </div>
                  ) : (
                    scanLogs.map((log, i) => (
                      <div key={i} style={{ marginBottom: "3px" }}>
                        <span style={{ color: "var(--text-dim)", marginRight: "8px" }}>[{i + 1}]</span>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: UNIFIED FINDINGS */}
          {activeTab === "findings" && (
            <div>
              {/* Stat Cards */}
              <div className="stat-grid">
                <div className="stat-card" style={{ borderLeft: "4px solid var(--accent-rose)" }}>
                  <span className="stat-label">Critical</span>
                  <span className="stat-value" style={{ color: "var(--accent-rose)" }}>{critCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #fb923c" }}>
                  <span className="stat-label">High</span>
                  <span className="stat-value" style={{ color: "#fb923c" }}>{highCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #facc15" }}>
                  <span className="stat-label">Medium</span>
                  <span className="stat-value" style={{ color: "#facc15" }}>{medCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #60a5fa" }}>
                  <span className="stat-label">Low</span>
                  <span className="stat-value" style={{ color: "#60a5fa" }}>{lowCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #94a3b8" }}>
                  <span className="stat-label">Info</span>
                  <span className="stat-value" style={{ color: "#94a3b8" }}>{infoCount}</span>
                </div>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h2 className="card-title" style={{ margin: 0 }}>
                      <AlertTriangle size={20} color="var(--accent-amber)" />
                      Unified Findings & Deduplication Engine ({findings.length})
                    </h2>
                    {reportStatus && (
                      <div style={{ color: "var(--accent-emerald)", fontSize: "0.8rem", marginTop: "4px" }}>
                        ✓ {reportStatus}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleExportReport}
                      disabled={findings.length === 0}
                    >
                      <Download size={14} /> Export HTML
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportJson}
                      disabled={findings.length === 0}
                    >
                      <FileCode size={14} /> Export JSON
                    </button>
                    <button className="btn btn-secondary" onClick={loadInitialData}>
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="filter-bar">
                  <div style={{ position: "relative", minWidth: "220px", flex: 1 }}>
                    <Search size={14} color="var(--text-dim)" style={{ position: "absolute", left: "10px", top: "10px" }} />
                    <input
                      className="input-field"
                      placeholder="Search title, asset, tool, CWE..."
                      value={findingSearchQuery}
                      onChange={(e) => setFindingSearchQuery(e.target.value)}
                      style={{ paddingLeft: "30px", height: "34px", fontSize: "0.8rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Severity:</span>
                    {["ALL", "Critical", "High", "Medium", "Low", "Info"].map((sev) => (
                      <button
                        key={sev}
                        className={`filter-chip ${findingSeverityFilter === sev ? "active" : ""}`}
                        onClick={() => setFindingSeverityFilter(sev)}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Status:</span>
                    <select
                      value={findingStatusFilter}
                      onChange={(e) => setFindingStatusFilter(e.target.value)}
                      style={{
                        background: "var(--bg-primary)",
                        color: "var(--text-main)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="NeedsReview">Needs Review</option>
                      <option value="AcceptedRisk">Accepted Risk</option>
                      <option value="Fixed">Fixed</option>
                    </select>
                  </div>
                </div>

                {findings.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No findings yet. Run a baseline or tool scan to discover security insights.
                  </p>
                ) : filteredFindings.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No findings matching your filter criteria.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Vulnerability</th>
                        <th>Status</th>
                        <th>Source Tool</th>
                        <th>Affected Asset</th>
                        <th>CWE</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFindings.map((f) => (
                        <tr key={f.id} onClick={() => handleExplainWithAi(f)}>
                          <td>
                            <span
                              className={`badge ${
                                f.severity === "Critical"
                                  ? "badge-critical"
                                  : f.severity === "High"
                                  ? "badge-high"
                                  : f.severity === "Medium"
                                  ? "badge-medium"
                                  : "badge-low"
                              }`}
                            >
                              {f.severity}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{f.title}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              value={f.status}
                              onChange={(e) => handleUpdateFindingStatus(f.id, e.target.value as FindingStatus)}
                              style={{
                                background: "var(--bg-secondary)",
                                color: "var(--text-main)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                padding: "3px 6px",
                                fontSize: "0.75rem",
                              }}
                            >
                              <option value="New">New</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="NeedsReview">Needs Review</option>
                              <option value="AcceptedRisk">Accepted Risk</option>
                              <option value="Fixed">Fixed</option>
                            </select>
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{f.source_tool}</td>
                          <td style={{ color: "var(--text-dim)", fontSize: "0.8rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {f.affected_asset}
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
                              {f.cwe || "N/A"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExplainWithAi(f);
                              }}
                            >
                              <Sparkles size={12} /> AI Explain
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: IMPORT REPORTS */}
          {activeTab === "importer" && (
            <div>
              <div className="card">
                <h2 className="card-title">
                  <UploadCloud size={20} color="var(--accent-cyan)" />
                  Import Security Reports (OWASP ZAP, Burp Suite, Generic JSON)
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                  Ingest findings from external enterprise scanners into AppSec Nexus's unified SQLite database. Duplicate findings are automatically deduplicated using cryptographic SHA-256 fingerprinting.
                </p>

                <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                      Select Report Format
                    </label>
                    <select
                      className="input-field"
                      value={importFormat}
                      onChange={(e: any) => setImportFormat(e.target.value)}
                      style={{ width: "240px" }}
                    >
                      <option value="zap_json">OWASP ZAP (JSON Alert Export)</option>
                      <option value="burp_xml">Burp Suite Professional (XML Issues)</option>
                      <option value="generic_json">AppSec Nexus / Generic (JSON)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                    Paste Report Content (XML or JSON)
                  </label>
                  <textarea
                    className="textarea-field"
                    rows={12}
                    placeholder={
                      importFormat === "zap_json"
                        ? '{\n  "@version": "2.14.0",\n  "site": [\n    {\n      "@name": "https://example.com",\n      "alerts": [\n        { "alert": "Cross-Site Scripting", "riskcode": "3", "cweid": "79", "uri": "https://example.com/search" }\n      ]\n    }\n  ]\n}'
                        : importFormat === "burp_xml"
                        ? '<issues>\n  <issue>\n    <name>SQL Injection</name>\n    <severity>High</severity>\n    <host ip="93.184.216.34">https://example.com</host>\n    <path>/login</path>\n    <issueDetail>Error based SQL injection detected.</issueDetail>\n  </issue>\n</issues>'
                        : '[\n  {\n    "title": "Insecure Direct Object Reference",\n    "severity": "High",\n    "affected_asset": "https://example.com/api/users/12",\n    "evidence": "User ID parameter tampered without authorization.",\n    "source_tool": "Manual Audit",\n    "cwe": "CWE-639"\n  }\n]'
                    }
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    className="btn btn-primary"
                    disabled={isImporting || !selectedTarget || !importContent.trim()}
                    onClick={handleImportReport}
                  >
                    <UploadCloud size={14} /> {isImporting ? "Parsing & Ingesting..." : "Import into SQLite Database"}
                  </button>

                  {importStatus && (
                    <div style={{ fontSize: "0.85rem", color: importStatus.startsWith("Import Error") ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {importStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI MENTOR */}
          {activeTab === "mentor" && (
            <div className="card">
              <h2 className="card-title">
                <Sparkles size={20} color="var(--accent-cyan)" />
                Local AI Security Mentor (Offline & Private)
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                Powered by your local LLM runtime (Ollama / llama.cpp). All code analysis, stack trace explanations, and remediation advice stay 100% on your laptop.
              </p>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                    Explanation Persona
                  </label>
                  <select
                    className="input-field"
                    value={aiMode}
                    onChange={(e: any) => setAiMode(e.target.value)}
                    style={{ width: "240px" }}
                  >
                    <option value="beginner">Beginner / Learner Mode (Simple Analogies)</option>
                    <option value="advanced">Senior Pentester Mode (Remediation & Code)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                    Select Local Model
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      className="input-field"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      style={{ width: "240px" }}
                    >
                      {aiModels.length === 0 ? (
                        <option value="">No local models detected</option>
                      ) : (
                        aiModels.map((m) => (
                          <option key={m} value={m}>
                            {m} {m.includes("1b") ? "(Fast / Recommended)" : m.includes("8b") ? "(High RAM / 4.7GB)" : ""}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      className="btn btn-secondary"
                      onClick={handleRefreshAiStatus}
                      title="Refresh Ollama Models List"
                      style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                <div style={{ paddingBottom: "8px", fontSize: "0.8rem" }}>
                  {aiAvailable ? (
                    <span style={{ color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent-emerald)", display: "inline-block" }}></span>
                      ✓ Ollama Online & Ready ({aiModels.length} models installed)
                    </span>
                  ) : (
                    <span style={{ color: "var(--accent-rose)", display: "flex", alignItems: "center", gap: "4px" }}>
                      ● Ollama Offline (Run 'ollama serve')
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Model Download & Library Section */}
              <div style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "8px", padding: "14px", marginBottom: "18px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <ArrowDownCircle size={15} color="var(--accent-cyan)" /> Local Model Library & Quick Install:
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                  {[
                    { id: "llama3.2:1b", label: "Llama 3.2 (1B - 1.3GB Fast)" },
                    { id: "llama3:8b", label: "Llama 3 (8B - 4.7GB)" },
                    { id: "qwen2.5-coder:1.5b", label: "Qwen 2.5 Coder (1.5B - 1.0GB)" },
                    { id: "llama3.2:3b", label: "Llama 3.2 (3B - 2.0GB)" },
                    { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder (7B)" },
                    { id: "mistral:7b", label: "Mistral (7B)" }
                  ].map((model) => {
                    const isInstalled = aiModels.some(
                      (m) => m === model.id || m.startsWith(model.id.split(":")[0])
                    );
                    const isSelected = selectedModel.startsWith(model.id.split(":")[0]);
                    return (
                      <button
                        key={model.id}
                        className={`btn ${isSelected ? "btn-primary" : "btn-secondary"}`}
                        style={{
                          fontSize: "0.78rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          borderColor: isInstalled ? "var(--accent-emerald)" : undefined,
                        }}
                        disabled={Boolean(pullingModel)}
                        onClick={() => {
                          if (isInstalled) {
                            const exact =
                              aiModels.find(
                                (m) => m === model.id || m.startsWith(model.id.split(":")[0])
                              ) || model.id;
                            setSelectedModel(exact);
                          } else {
                            handlePullModel(model.id);
                          }
                        }}
                      >
                        {isInstalled ? (
                          <>
                            <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>✓</span>
                            <span>{model.label}</span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                opacity: 0.9,
                                backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(16, 185, 129, 0.2)",
                                color: isSelected ? "#fff" : "var(--accent-emerald)",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                fontWeight: 600,
                              }}
                            >
                              {isSelected ? "Active" : "Installed"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>Download {model.label}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Real-time Download Progress Bar */}
                {pullProgress && (
                  <div style={{ marginTop: "12px", background: "rgba(15, 23, 42, 0.7)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                        {pullProgress.model}: {pullProgress.status}
                      </span>
                      <span style={{ fontWeight: 700, color: pullProgress.done ? "var(--accent-emerald)" : "var(--accent-cyan)" }}>
                        {pullProgress.percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(pullProgress.percentage, 0))}%`,
                          height: "100%",
                          background: pullProgress.done ? "var(--accent-emerald)" : "linear-gradient(90deg, #06b6d4, #10b981)",
                          borderRadius: "4px",
                          transition: "width 0.2s ease-in-out"
                        }}
                      />
                    </div>

                    {pullProgress.total > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        <span>{(pullProgress.completed / (1024 * 1024)).toFixed(1)} MB / {(pullProgress.total / (1024 * 1024)).toFixed(1)} MB</span>
                        <span>{pullProgress.done ? "Complete ✓" : "Downloading layer..."}</span>
                      </div>
                    )}
                  </div>
                )}

                {pullStatus && !pullProgress && (
                  <div style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", marginTop: "8px" }}>
                    {pullStatus}
                  </div>
                )}
              </div>

              {/* Interactive AI Mentor Chat & Flowchart Engine */}
              <div style={{ marginTop: "16px" }}>
                <MentorChat
                  selectedFinding={selectedFinding}
                  selectedModel={selectedModel}
                  aiMode={aiMode}
                  aiAvailable={aiAvailable}
                  onSelectFinding={setSelectedFinding}
                />
              </div>
            </div>
          )}

          {/* TAB: HOST & MOBILE SECURITY AUDITOR */}
          {activeTab === "hostmobile" && (
            <HostMobileAudit
              targetId={selectedTarget?.id || "local-host"}
              onFindingsAdded={(newF) => {
                setFindings((prev) => [...newF, ...prev]);
              }}
              onNavigateFinding={(f) => {
                setSelectedFinding(f);
                setActiveTab("mentor");
              }}
            />
          )}

          {/* TAB 8: AUDIT & SCAN HISTORY */}
          {activeTab === "history" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    <History size={20} color="var(--accent-cyan)" />
                    Scan Audit History ({scanHistory.length})
                  </h2>
                  <button className="btn btn-secondary" onClick={loadInitialData}>
                    <RotateCcw size={14} /> Refresh
                  </button>
                </div>

                {scanHistory.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No scan executions recorded yet. Run a scan from the Tool Hub or Scan Console.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Target URL</th>
                        <th>Tool Used</th>
                        <th>Status</th>
                        <th>Findings Discovered</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanHistory.map((s, idx) => (
                        <tr key={s.scan_id || idx}>
                          <td style={{ fontWeight: 600 }}>{s.target_url}</td>
                          <td>
                            <span style={{ color: "var(--accent-cyan)", fontWeight: 500 }}>
                              {s.tool}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-locked">{s.status}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{s.findings_count} findings</td>
                          <td style={{ color: "var(--text-dim)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                            {s.duration_ms} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: CYBER ACADEMY & FOUNDATIONS */}
          {activeTab === "academy" && (
            <CyberAcademy
              onNavigateScanner={(toolId) => {
                setActiveTool(toolId);
                setActiveTab("scanner");
              }}
              onOpenAiMentor={() => {
                setActiveTab("mentor");
              }}
            />
          )}
        </main>

        {/* Right Collapsible AI Mentor Drawer (when finding selected) */}
        {selectedFinding && activeTab === "findings" && (
          <aside className="ai-drawer" style={{ width: "460px", maxWidth: "90vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} color="var(--accent-cyan)" /> AI Mentor & Flowcharts
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                  onClick={() => setActiveTab("mentor")}
                  title="Open Full Screen AI Mentor tab"
                >
                  Full Screen
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                  onClick={() => setSelectedFinding(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "2px" }}>
              {selectedFinding.title}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "10px" }}>
              CWE: {selectedFinding.cwe || "N/A"} • Tool: {selectedFinding.source_tool}
            </div>

            {/* Interactive Mentor Chat with Asking Box & Flowchart inside Drawer */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <MentorChat
                selectedFinding={selectedFinding}
                selectedModel={selectedModel}
                aiMode={aiMode}
                aiAvailable={aiAvailable}
                onSelectFinding={setSelectedFinding}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
