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
  Copy,
  Check,
  Activity
} from "lucide-react";
import "./App.css";
import { AnalyticsDashboard } from "./Analytics";
import { Target, ToolInfo, PluginInfo, FeedUpdateResult, Finding, ScanResult, FindingStatus, DiscoveredEndpoint, ModelPullProgress } from "./types";


export default function App() {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "targets" | "tools" | "crawler" | "scanner" | "findings" | "importer" | "mentor" | "history" | "academy"
  >("analytics");
  const [academyTab, setAcademyTab] = useState<"cyber" | "networking" | "linux" | "windows" | "differences" | "scenarios" | "commands">("cyber");
  const [copiedCmd, setCopiedCmd] = useState<string>("");

  function copyCmd(cmdText: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cmdText);
      setCopiedCmd(cmdText);
      setTimeout(() => setCopiedCmd(""), 2000);
    }
  }

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
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
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

  async function handleExplainWithAi(finding: Finding) {
    setSelectedFinding(finding);
    setAiLoading(true);
    setAiExplanation("");

    try {
      const model = selectedModel || (aiModels.length > 0 ? aiModels[0] : "llama3.2:1b");
      const explanation = await invoke<string>("explain_finding", {
        model,
        mode: aiMode,
        findingId: finding.id,
      });
      setAiExplanation(explanation);
    } catch (err: any) {
      const errMsg = err?.toString() || "Unknown error";
      const isTimeout = errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("timed out");
      const isConn = errMsg.toLowerCase().includes("connect") || errMsg.toLowerCase().includes("refused");
      let advice = "";
      if (isTimeout) {
        advice = "\n\n💡 Performance Tip: Model inference timed out. Large models (like 8B) require substantial RAM and CPU time to load. Please switch to 'llama3.2:1b' (1.3GB) in the model dropdown above for fast, lightweight responses.";
      } else if (isConn) {
        advice = "\n\n💡 Connection Tip: Could not reach Ollama at 127.0.0.1:11434. Please ensure Ollama is running ('ollama serve').";
      }

      setAiExplanation(
        `Local AI Mentor Error: ${errMsg}${advice}\n\nFallback Guidance Summary for '${finding.title}':\n${finding.remediation}\n\nEvidence: ${finding.evidence}`
      );
    } finally {
      setAiLoading(false);
    }
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

              {selectedFinding ? (
                <div style={{ marginTop: "16px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "8px" }}>
                  <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "8px" }}>
                    Selected Finding: {selectedFinding.title}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                    Asset: {selectedFinding.affected_asset} • Evidence: {selectedFinding.evidence}
                  </div>

                  <button
                    className="btn btn-primary"
                    disabled={aiLoading}
                    onClick={() => handleExplainWithAi(selectedFinding)}
                  >
                    <Sparkles size={14} /> {aiLoading ? "Consulting Local AI..." : "Generate Mentor Guidance"}
                  </button>

                  {aiExplanation && (
                    <div style={{ marginTop: "16px", padding: "16px", background: "#050811", borderRadius: "8px", border: "1px solid var(--border-color)", whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "0.88rem" }}>
                      {aiExplanation}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                  Select any finding from the 'Findings' tab to consult the AI Mentor.
                </div>
              )}
            </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                      <GraduationCap size={24} color="var(--accent-cyan)" /> Cybersecurity, Networking & OS Academy
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                      Foundational knowledge and master cheat sheets for Web Security, Computer Networking, Linux, and Windows.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                      onClick={() => {
                        setActiveTab("mentor");
                        setAiExplanation("🎓 Welcome to your Personal Cybersecurity AI Tutor!\n\nI can teach you any topic step-by-step:\n1. OWASP Top 10 Web Vulnerabilities\n2. TCP/IP, OSI 7-Layer Model & Subnetting\n3. Linux System Administration & Privilege Security\n4. Windows Active Directory, Kerberos & Sysmon\n\nPick any topic from the Cyber Academy tab, or ask me any question here to get started!");
                      }}
                    >
                      <Sparkles size={14} color="var(--accent-cyan)" /> Ask AI Tutor
                    </button>
                  </div>
                </div>

                {/* ACADEMY SUBTABS */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <button
                    className={`btn ${academyTab === "cyber" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("cyber")}
                  >
                    🛡️ 1. Cyber Core & OWASP
                  </button>
                  <button
                    className={`btn ${academyTab === "networking" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("networking")}
                  >
                    🌐 2. Networking & OSI
                  </button>
                  <button
                    className={`btn ${academyTab === "linux" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("linux")}
                  >
                    🐧 3. Linux Security
                  </button>
                  <button
                    className={`btn ${academyTab === "windows" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("windows")}
                  >
                    🪟 4. Windows & Kerberos
                  </button>
                  <button
                    className={`btn ${academyTab === "differences" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("differences")}
                  >
                    ⚖️ 5. Key Differences & Tables
                  </button>
                  <button
                    className={`btn ${academyTab === "scenarios" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("scenarios")}
                  >
                    🚨 6. Real-World Breach Scenarios
                  </button>
                  <button
                    className={`btn ${academyTab === "commands" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.82rem", padding: "6px 12px" }}
                    onClick={() => setAcademyTab("commands")}
                  >
                    📋 7. Command Cheat Sheets
                  </button>
                </div>
              </div>

              {/* MODULE 1: CYBERSECURITY FOUNDATIONS */}
              {academyTab === "cyber" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* CIA TRIAD & CORE PRINCIPLES */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      The Core Security Pillars & Design Principles
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "4px" }}>Confidentiality (C)</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          Ensures sensitive data is readable only by authorized entities. Enforced via encryption (AES-256, TLS 1.3) and strict Access Control Lists (ACLs).
                        </div>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "4px" }}>Integrity (I)</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          Guarantees that information has not been modified or tampered with. Enforced via cryptographic hashing (SHA-256 HMAC) and digital signatures.
                        </div>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-amber)", marginBottom: "4px" }}>Availability (A)</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          Guarantees authorized users have continuous access to systems and data. Protected by backups, redundancy, rate-limiting, and DDoS scrubbing.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                      <div style={{ background: "rgba(6, 182, 212, 0.08)", padding: "12px", borderRadius: "6px", borderLeft: "3px solid var(--accent-cyan)" }}>
                        <strong style={{ fontSize: "0.85rem", color: "var(--accent-cyan)" }}>Zero Trust Architecture:</strong>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                          "Never Trust, Always Verify." Every entity, whether inside or outside the internal network perimeter, must be authenticated, authorized, and continuously validated before access is granted.
                        </p>
                      </div>
                      <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "12px", borderRadius: "6px", borderLeft: "3px solid var(--accent-emerald)" }}>
                        <strong style={{ fontSize: "0.85rem", color: "var(--accent-emerald)" }}>Defense-in-Depth:</strong>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                          Layering multiple distinct defensive controls (Perimeter Firewall &rarr; WAF &rarr; TLS 1.3 &rarr; Micro-segmentation &rarr; RBAC &rarr; DB Field Encryption) so single-point failures never lead to total breach.
                        </p>
                      </div>
                      <div style={{ background: "rgba(245, 158, 11, 0.08)", padding: "12px", borderRadius: "6px", borderLeft: "3px solid var(--accent-amber)" }}>
                        <strong style={{ fontSize: "0.85rem", color: "var(--accent-amber)" }}>Principle of Least Privilege (PoLP):</strong>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                          Every user, service account, and background daemon must be restricted to the exact bare minimum set of permissions required to execute its legitimate function.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DIAGRAM: STRIDE THREAT MODELING */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      STRIDE Threat Modeling Architecture (Visual Matrix)
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                      Developed by Microsoft, STRIDE is the industry standard framework for identifying threats during application architecture design:
                    </p>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto", border: "1px solid var(--border-color)", lineHeight: "1.4" }}>
                      <pre style={{ margin: 0, color: "#a5f3fc" }}>{`+-------------------------------------------------------------------------------------------------+
| Threat Category        | Security Property  | Attacker Action Example         | Defensive Countermeasure |
+------------------------+--------------------+---------------------------------+--------------------------+
| [S] Spoofing           | Authenticity       | Impersonating legitimate user   | Strong MFA, PKI Client   |
| [T] Tampering          | Integrity          | Altering wire transaction sums  | SHA-256 HMAC, Signatures |
| [R] Repudiation        | Non-Repudiation    | Denying having sent a request   | Append-only audit logs   |
| [I] Info Disclosure    | Confidentiality    | Leaking customer credentials    | AES-256, TLS 1.3 encrypt |
| [D] Denial of Service  | Availability       | SYN flood crashing web app      | Rate limiting, WAF       |
| [E] Elevation of Priv  | Authorization      | SUID root or token escalation   | Least privilege, AppArmor|
+-------------------------------------------------------------------------------------------------+`}</pre>
                    </div>
                  </div>

                  {/* OWASP TOP 10 WITH CODE EXAMPLES */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      OWASP Top 10 Web Vulnerabilities & Code Hardening
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {/* SQLi */}
                      <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", borderLeft: "4px solid var(--accent-rose)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>1. SQL Injection (SQLi) &bull; CWE-89</span>
                          <span className="badge badge-critical">Critical &bull; CVSS 9.8</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "6px 0 10px 0" }}>
                          Attacker manipulates database queries by supplying untrusted input that concatenates directly into raw SQL syntax, enabling unauthorized data dumping or administrative authentication bypass.
                        </p>
                        <div style={{ background: "#080c14", padding: "10px 14px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", border: "1px solid var(--border-color)" }}>
                          <div style={{ color: "var(--accent-rose)", marginBottom: "4px" }}>
                            <strong>❌ Vulnerable (Raw String Concatenation):</strong>
                          </div>
                          <code>query = f"SELECT id, email FROM users WHERE username = '&#123;user_input&#125;'"</code>
                          <div style={{ color: "var(--accent-emerald)", marginTop: "8px", marginBottom: "4px" }}>
                            <strong>✅ Secure (Parameterized Prepared Statement):</strong>
                          </div>
                          <code>query = "SELECT id, email FROM users WHERE username = %s" ; cursor.execute(query, (user_input,))</code>
                        </div>
                      </div>

                      {/* XSS */}
                      <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", borderLeft: "4px solid var(--accent-amber)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>2. Cross-Site Scripting (XSS) &bull; CWE-79</span>
                          <span className="badge badge-high">High &bull; CVSS 7.5</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "6px 0 10px 0" }}>
                          Application accepts untrusted user input and embeds it into browser HTML without sanitization, allowing attacker JavaScript to run in the victim's session context and exfiltrate session cookies.
                        </p>
                        <div style={{ background: "#080c14", padding: "10px 14px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", border: "1px solid var(--border-color)" }}>
                          <div style={{ color: "var(--accent-rose)", marginBottom: "4px" }}>
                            <strong>❌ Vulnerable:</strong> <code>element.innerHTML = userInput;</code>
                          </div>
                          <div style={{ color: "var(--accent-emerald)", marginTop: "6px", marginBottom: "4px" }}>
                            <strong>✅ Secure:</strong> <code>element.textContent = userInput;</code>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", marginTop: "6px" }}>
                            Enforce HTTP header: <code>Content-Security-Policy: default-src 'self'; script-src 'self';</code> + Cookie flag <code>HttpOnly</code>.
                          </div>
                        </div>
                      </div>

                      {/* SSRF */}
                      <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", borderLeft: "4px solid var(--accent-amber)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>3. Server-Side Request Forgery (SSRF) &bull; CWE-918</span>
                          <span className="badge badge-high">High &bull; CVSS 8.6</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "6px 0 10px 0" }}>
                          Server fetches remote resources using user-supplied URLs without verifying destination IP addresses. Attackers target link-local cloud metadata (<code style={{ color: "var(--accent-cyan)" }}>http://169.254.169.254/latest/meta-data/</code>) to extract IAM cloud tokens.
                        </p>
                        <div style={{ background: "#080c14", padding: "10px 14px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", border: "1px solid var(--border-color)" }}>
                          <strong>Defense Architecture:</strong> Resolve DNS &rarr; verify destination IP is NOT in RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) or 169.254.0.0/16 &rarr; require AWS IMDSv2 token header.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 2: NETWORKING MASTERY */}
              {academyTab === "networking" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* OSI TABLE */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      OSI 7-Layer Model vs TCP/IP Protocol Stack
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Layer</th>
                            <th>OSI Name</th>
                            <th>Data Unit (PDU)</th>
                            <th>Key Protocols</th>
                            <th>Primary Security Concerns & Attacks</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>7</strong></td>
                            <td>Application</td>
                            <td>Data / Message</td>
                            <td>HTTP, HTTPS, DNS, SSH, SMTP</td>
                            <td>SQLi, XSS, CSRF, SSRF, Auth Bypass</td>
                          </tr>
                          <tr>
                            <td><strong>6</strong></td>
                            <td>Presentation</td>
                            <td>Formatted Data</td>
                            <td>TLS/SSL, ASCII, JSON, JPEG</td>
                            <td>Insecure deserialization, weak cipher negotiation</td>
                          </tr>
                          <tr>
                            <td><strong>5</strong></td>
                            <td>Session</td>
                            <td>Sessions</td>
                            <td>RPC, NetBIOS, Sockets</td>
                            <td>Session hijacking, credential token replay</td>
                          </tr>
                          <tr>
                            <td><strong>4</strong></td>
                            <td>Transport</td>
                            <td>Segments (TCP) / Datagrams (UDP)</td>
                            <td>TCP, UDP</td>
                            <td>SYN Flood DDoS, Port Scanning, RST hijacking</td>
                          </tr>
                          <tr>
                            <td><strong>3</strong></td>
                            <td>Network</td>
                            <td>Packets</td>
                            <td>IPv4, IPv6, ICMP, IPsec</td>
                            <td>IP spoofing, ICMP redirect, route poisoning</td>
                          </tr>
                          <tr>
                            <td><strong>2</strong></td>
                            <td>Data Link</td>
                            <td>Frames</td>
                            <td>Ethernet (MAC), Wi-Fi (802.11), ARP</td>
                            <td>ARP poisoning, MAC address flooding, Rogue AP</td>
                          </tr>
                          <tr>
                            <td><strong>1</strong></td>
                            <td>Physical</td>
                            <td>Bits / Electrical Pulses</td>
                            <td>Fiber, Twisted Pair Cables, Radio</td>
                            <td>Physical wiretapping, rogue hardware implants</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DIAGRAM: TCP 3-WAY HANDSHAKE */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      TCP 3-Way Handshake & 4-Way Teardown (Sequence Diagram)
                    </h3>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto", border: "1px solid var(--border-color)", lineHeight: "1.4" }}>
                      <pre style={{ margin: 0, color: "#a5f3fc" }}>{`         TCP Connection Establishment (3-Way Handshake)
  CLIENT                                                 SERVER
    |                                                      |
    | ────────── SYN (Seq = 100) ────────────────────────> |  1. Client sends SYN (Synchronize initial sequence)
    |                                                      |
    | <───────── SYN-ACK (Seq = 300, Ack = 101) ────────── |  2. Server responds with SYN + ACK
    |                                                      |
    | ────────── ACK (Seq = 101, Ack = 301) ─────────────> |  3. Client acknowledges. Connection ESTABLISHED!
    |                                                      |
    | <====== Bi-Directional Reliable Data Stream ======>  |
    |                                                      |
         TCP Connection Termination (4-Way Teardown)
    |                                                      |
    | ────────── FIN (Seq = 500) ────────────────────────> |  1. Client requests orderly connection close
    |                                                      |
    | <───────── ACK (Ack = 501) ───────────────────────── |  2. Server acknowledges receipt
    |                                                      |
    | <───────── FIN (Seq = 700) ───────────────────────── |  3. Server completes sending and closes
    |                                                      |
    | ────────── ACK (Ack = 701) ────────────────────────> |  4. Client acknowledges. State CLOSED!`}</pre>
                    </div>
                  </div>

                  {/* DIAGRAM: TLS 1.3 HANDSHAKE */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      TLS 1.3 Cryptographic Handshake (1-RTT Sequence)
                    </h3>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto", border: "1px solid var(--border-color)", lineHeight: "1.4" }}>
                      <pre style={{ margin: 0, color: "#6ee7b7" }}>{`Client                                                   Server
  |                                                        |
  | ── ClientHello (Supported Ciphers + ECDH Key Share) ─> |  1. Client proposes ciphers & ephemeral public key
  |                                                        |
  | <─ ServerHello (Chosen Cipher + Server Key Share) ──── |  2. Server returns matching ECDH key share
  | <─ {EncryptedExtensions} ───────────────────────────── |  3. Subsequent handshake messages ENCRYPTED!
  | <─ {Certificate} + {CertificateVerify} ─────────────── |  4. Server sends X.509 cert and digital signature
  | <─ {Finished} ──────────────────────────────────────── |  5. Server validates handshake authenticity
  |                                                        |
  | ── {Finished} ───────────────────────────────────────> |  6. Client confirms key derivation.
  |                                                        |
  | <============= Encrypted Application Data ============>|     Full Session Encrypted (AES-GCM-256)!`}</pre>
                    </div>
                  </div>

                  {/* SUBNETTING TABLE & PORTS */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      Subnetting, CIDR & Common Port Reference
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          CIDR Calculation: Hosts = 2^(32 - Prefix) - 2
                        </div>
                        <table className="data-table" style={{ fontSize: "0.78rem" }}>
                          <thead>
                            <tr>
                              <th>CIDR</th>
                              <th>Subnet Mask</th>
                              <th>Usable Hosts</th>
                              <th>Typical Use</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><code>/30</code></td>
                              <td>255.255.255.252</td>
                              <td><strong>2</strong></td>
                              <td>Router point-to-point links</td>
                            </tr>
                            <tr>
                              <td><code>/28</code></td>
                              <td>255.255.255.240</td>
                              <td><strong>14</strong></td>
                              <td>Isolated DMZ cluster</td>
                            </tr>
                            <tr>
                              <td><code>/24</code></td>
                              <td>255.255.255.0</td>
                              <td><strong>254</strong></td>
                              <td>Standard office LAN</td>
                            </tr>
                            <tr>
                              <td><code>/16</code></td>
                              <td>255.255.0.0</td>
                              <td><strong>65,534</strong></td>
                              <td>Cloud VPC (AWS/Azure)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          RFC 1918 Private Ranges & Key Ports
                        </div>
                        <ul style={{ fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "16px", margin: "0 0 10px 0" }}>
                          <li><code>10.0.0.0/8</code> (10.0.0.0 &ndash; 10.255.255.255)</li>
                          <li><code>172.16.0.0/12</code> (172.16.0.0 &ndash; 172.31.255.255)</li>
                          <li><code>192.168.0.0/16</code> (192.168.0.0 &ndash; 192.168.255.255)</li>
                          <li><code>169.254.0.0/16</code> (Link-Local & Cloud Metadata)</li>
                        </ul>
                        <div style={{ background: "#080c14", padding: "8px 12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.76rem" }}>
                          Port 22: SSH &bull; Port 53: DNS &bull; Port 80: HTTP<br />
                          Port 88: Kerberos &bull; Port 443: HTTPS &bull; Port 445: SMB<br />
                          Port 3389: RDP &bull; Port 8080: Alternate Web
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 3: LINUX SECURITY */}
              {academyTab === "linux" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* PERMISSIONS MATRIX */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      Linux File Permissions & Octal Calculation Matrix
                    </h3>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.8rem", overflowX: "auto", border: "1px solid var(--border-color)", marginBottom: "12px" }}>
                      <pre style={{ margin: 0, color: "#fde047" }}>{`Permission String:  -   r w x   r - x   r - -
                    │   └──┬──┘ └──┬──┘ └──┬──┘
                    │      │       │       └── Others: Read (4)
                    │      │       └────────── Group: Read + Execute (4 + 1 = 5)
                    │      └────────────────── User/Owner: Read + Write + Execute (4 + 2 + 1 = 7)
                    └───────────────────────── File Type: (-) Regular file, (d) Directory`}</pre>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "4px" }}>Read (r) = 4</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Open and view file content; or list contents inside a directory.</div>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "4px" }}>Write (w) = 2</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Modify file content; or add, rename, and delete files inside a folder.</div>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
                        <div style={{ fontWeight: 600, color: "var(--accent-rose)", marginBottom: "4px" }}>Execute (x) = 1</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Run executable binary or script; or traverse (cd) into a directory.</div>
                      </div>
                    </div>

                    {/* SPECIAL BITS: SUID, SGID, STICKY */}
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", border: "1px solid var(--border-color)" }}>
                      <div style={{ color: "var(--accent-rose)", fontWeight: 700, marginBottom: "4px" }}>
                        Special Permission Bits (Privilege Context):
                      </div>
                      &bull; <strong>SUID (4000)</strong>: Executes with file owner privileges (e.g. <code>chmod 4755 /usr/bin/passwd</code> runs as root).<br />
                      &bull; <strong>SGID (2000)</strong>: Executes with group privileges; new files created in directory inherit parent group.<br />
                      &bull; <strong>Sticky Bit (1000)</strong>: In world-writable directories (e.g. <code>/tmp</code>), only owner or root can delete files.
                    </div>
                  </div>

                  {/* LINUX FILESYSTEM HIERARCHY */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      Linux Filesystem Hierarchy Architecture
                    </h3>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto", border: "1px solid var(--border-color)", lineHeight: "1.4" }}>
                      <pre style={{ margin: 0, color: "#93c5fd" }}>{`/ (Root Directory)
 ├── /bin & /sbin      ──> Essential user & system administrator executable binaries
 ├── /etc              ──> System configuration files (/etc/passwd, /etc/shadow, /etc/ssh/)
 ├── /proc             ──> Virtual filesystem exposing live kernel & process memory (/proc/[pid]/)
 ├── /sys              ──> Virtual filesystem exposing hardware devices and kernel drivers
 ├── /var/log          ──> System event & audit logs (/var/log/auth.log, /var/log/syslog)
 ├── /dev              ──> Device nodes (/dev/null, /dev/urandom, /dev/sda1)
 └── /home & /root     ──> User personal directories and root superuser home`}</pre>
                    </div>
                  </div>

                  {/* LINUX DEFENSE COMMANDS WITH COPY BUTTONS */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      Essential Linux Defense & Auditing Commands
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Command</th>
                            <th>Action</th>
                            <th>Investigation & Threat Context</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { cmd: "ss -tulpn", desc: "List open listening ports & process IDs", reason: "Identifies rogue services or backdoors" },
                            { cmd: "lsof -i :80", desc: "Find exact process holding port 80", reason: "Verifies authentic web server executable" },
                            { cmd: "find / -perm -4000 -type f 2>/dev/null", desc: "Audit all SUID binaries on filesystem", reason: "Detects privilege escalation vectors" },
                            { cmd: "awk -F: '($3 == 0) {print $1}' /etc/passwd", desc: "Find rogue accounts with UID 0", reason: "Catches backdoor root user creation" },
                            { cmd: "tail -f /var/log/auth.log", desc: "Monitor live authentication attempts", reason: "Detects brute-force SSH and sudo abuse" },
                            { cmd: "last -n 20", desc: "Show recent user login history", reason: "Audits administrative logon sessions" }
                          ].map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <code>{item.cmd}</code>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: "2px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                                    onClick={() => copyCmd(item.cmd)}
                                  >
                                    {copiedCmd === item.cmd ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                                    {copiedCmd === item.cmd ? "Copied" : "Copy"}
                                  </button>
                                </div>
                              </td>
                              <td>{item.desc}</td>
                              <td>{item.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 4: WINDOWS SECURITY */}
              {academyTab === "windows" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* RING 3 VS RING 0 DIAGRAM */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      Windows Architecture: User Mode (Ring 3) vs Kernel Mode (Ring 0)
                    </h3>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto", border: "1px solid var(--border-color)", lineHeight: "1.4" }}>
                      <pre style={{ margin: 0, color: "#67e8f9" }}>{`+-----------------------------------------------------------------------------------+
| USER MODE (Ring 3)                                                                |
|   Applications (Browsers, IDEs)    Windows Services (svchost.exe, lsass.exe)      |
|   Subsystem DLLs (kernel32.dll, user32.dll, ntdll.dll)                            |
+-----------------------------------------------------------------------------------+
                                │  (Syscall Gate: SYSENTER / SYSCALL instruction)
+-----------------------------------------------------------------------------------+
| KERNEL MODE (Ring 0)                                                              |
|   Executive Subsystems (Process Manager, Memory Mgr, Security Reference Monitor)  |
|   NT Kernel (ntoskrnl.exe)                                                        |
|   Hardware Abstraction Layer (HAL.dll) & Device Drivers (.sys)                    |
+-----------------------------------------------------------------------------------+`}</pre>
                    </div>
                  </div>

                  {/* KERBEROS 5 PROTOCOL DIAGRAM */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      Kerberos 5 Active Directory Authentication Flow (Sequence Diagram)
                    </h3>
                    <div style={{ background: "#080c14", padding: "12px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto", border: "1px solid var(--border-color)", lineHeight: "1.4" }}>
                      <pre style={{ margin: 0, color: "#f472b6" }}>{`Client                      Domain Controller (KDC)                 Target File Server
  |                                   |                                     |
  | ── 1. AS-REQ (Auth Request) ────> |                                     |
  | <─ 2. AS-REP (Returns TGT) ────── |                                     |
  |                                   |                                     |
  | ── 3. TGS-REQ (Sends TGT) ──────> |                                     |
  | <─ 4. TGS-REP (Service Ticket) ── |                                     |
  |                                                                         |
  | ── 5. AP-REQ (Presents Service Ticket to Target Server) ──────────────> |
  | <─ 6. AP-REP (Mutual Authentication Complete; Session Encrypted!) ───── |`}</pre>
                    </div>
                  </div>

                  {/* EVENT IDS & SYSMON */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      Critical Windows Security Event IDs & Sysmon Cheat Sheet
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Channel</th>
                            <th>Event ID</th>
                            <th>Meaning</th>
                            <th>Threat Detection Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Security</td>
                            <td><code>4624</code></td>
                            <td>Successful Logon</td>
                            <td>Audit logon types: 2 (Interactive), 3 (Network/SMB), 10 (RDP)</td>
                          </tr>
                          <tr>
                            <td>Security</td>
                            <td><code>4625</code></td>
                            <td>Failed Logon Attempt</td>
                            <td>Spikes indicate brute-force or password spraying attacks</td>
                          </tr>
                          <tr>
                            <td>Security</td>
                            <td><code>4672</code></td>
                            <td>Special Privileges Assigned</td>
                            <td>Detects administrator elevation</td>
                          </tr>
                          <tr>
                            <td>Security</td>
                            <td><code>4688</code></td>
                            <td>Process Creation</td>
                            <td>Audit process execution trees and command line arguments</td>
                          </tr>
                          <tr>
                            <td>Sysmon</td>
                            <td><code>Event 1</code></td>
                            <td>Process Create</td>
                            <td>Captures command line flags, parent PID, and SHA-256 hashes</td>
                          </tr>
                          <tr>
                            <td>Sysmon</td>
                            <td><code>Event 3</code></td>
                            <td>Network Connection</td>
                            <td>Detects outbound C2 beaconing from unexpected binaries</td>
                          </tr>
                          <tr>
                            <td>Sysmon</td>
                            <td><code>Event 11</code></td>
                            <td>File Created</td>
                            <td>Detects malware drops and ransomware file creation in AppData</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* POWERSHELL COMMANDS */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
                      Essential PowerShell Incident Response & Auditing Commands
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>PowerShell Command</th>
                            <th>Threat Hunting Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {
                              cmd: 'Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess',
                              desc: 'Audit listening TCP ports and correlate with process IDs'
                            },
                            {
                              cmd: "Get-WmiObject win32_service | Where-Object {$_.PathName -notlike '\"*' -and $_.PathName -like '* *'} | Select-Object Name, PathName",
                              desc: 'Identify unquoted Windows service path vulnerabilities for privilege escalation'
                            },
                            {
                              cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 15 | Select-Object TimeCreated, Message",
                              desc: 'Inspect recent failed logon events to detect brute force attempts'
                            },
                            {
                              cmd: 'Get-LocalGroupMember -Group "Administrators"',
                              desc: 'Audit members of the local Administrators group for unauthorized users'
                            },
                            {
                              cmd: 'Get-ChildItem -Path "$env:LOCALAPPDATA" -Recurse -File | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-1)} | Select-Object FullName -First 20',
                              desc: 'Locate recently modified files in AppData (common malware drop location)'
                            }
                          ].map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <code style={{ fontSize: "0.76rem" }}>{item.cmd}</code>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: "2px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                                    onClick={() => copyCmd(item.cmd)}
                                  >
                                    {copiedCmd === item.cmd ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                                    {copiedCmd === item.cmd ? "Copied" : "Copy"}
                                  </button>
                                </div>
                              </td>
                              <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 5: KEY DIFFERENCES & COMPARISON TABLES */}
              {academyTab === "differences" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* DIFF 1: VULN VS THREAT VS EXPLOIT VS RISK */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      1. Vulnerability vs. Threat vs. Exploit vs. Risk
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Dimension</th>
                            <th>Vulnerability</th>
                            <th>Threat</th>
                            <th>Exploit</th>
                            <th>Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Definition</strong></td>
                            <td>The flaw or security hole</td>
                            <td>The malicious actor or hazard</td>
                            <td>The weaponized tool or payload</td>
                            <td>The potential business loss</td>
                          </tr>
                          <tr>
                            <td><strong>In Your Control?</strong></td>
                            <td><strong style={{ color: "var(--accent-emerald)" }}>Yes</strong> (You can patch)</td>
                            <td><strong style={{ color: "var(--accent-rose)" }}>No</strong> (Adversaries exist)</td>
                            <td><strong style={{ color: "var(--accent-rose)" }}>No</strong> (Payloads circulate)</td>
                            <td><strong style={{ color: "var(--accent-emerald)" }}>Yes</strong> (You can mitigate)</td>
                          </tr>
                          <tr>
                            <td><strong>Concrete Example</strong></td>
                            <td>Missing sanitization in SQL query</td>
                            <td>Organized cybercrime group</td>
                            <td><code>' OR 1=1;--</code> payload script</td>
                            <td>High risk of $1M regulatory breach fine</td>
                          </tr>
                          <tr>
                            <td><strong>Defensive Action</strong></td>
                            <td>Code review, SCA/DAST, patching</td>
                            <td>Threat intel, geo-blocking, WAF</td>
                            <td>WAF signatures, IPS filtering</td>
                            <td>Defense-in-depth, cyber insurance</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DIFF 2: ENCODING VS ENCRYPTION VS HASHING */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      2. Encoding vs. Encryption vs. Hashing vs. Obfuscation
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Operation</th>
                            <th>Primary Goal</th>
                            <th>Requires Key?</th>
                            <th>Reversible?</th>
                            <th>Standard Algorithms</th>
                            <th>Security Impact</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Encoding</strong></td>
                            <td>Data format compatibility</td>
                            <td>No</td>
                            <td>Yes (Trivial)</td>
                            <td>Base64, URL-encoding (%20), ASCII</td>
                            <td><span className="badge badge-critical">Never provides security!</span></td>
                          </tr>
                          <tr>
                            <td><strong>Encryption</strong></td>
                            <td>Data Confidentiality</td>
                            <td><strong>Yes</strong></td>
                            <td>Yes (With key)</td>
                            <td>AES-256-GCM, ChaCha20, RSA-4096</td>
                            <td><span className="badge badge-low">Protects data in transit/rest</span></td>
                          </tr>
                          <tr>
                            <td><strong>Hashing</strong></td>
                            <td>Data Integrity & Passwords</td>
                            <td>No</td>
                            <td><strong>No</strong> (One-way)</td>
                            <td>SHA-256, Argon2id, bcrypt, SHA-3</td>
                            <td><span className="badge badge-low">Tamper verification; must use salts</span></td>
                          </tr>
                          <tr>
                            <td><strong>Obfuscation</strong></td>
                            <td>Slow reverse engineering</td>
                            <td>No</td>
                            <td>Yes (With effort)</td>
                            <td>ProGuard, JS Obfuscator, VMProtect</td>
                            <td><span className="badge badge-medium">Obscurity only; never rely alone</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DIFF 3: TCP VS UDP */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      3. TCP vs. UDP (Transport Protocols)
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Feature</th>
                            <th>TCP (Transmission Control Protocol)</th>
                            <th>UDP (User Datagram Protocol)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Connection Model</strong></td>
                            <td>Connection-oriented (Explicit 3-Way Handshake)</td>
                            <td>Connectionless (Fire-and-forget datagrams)</td>
                          </tr>
                          <tr>
                            <td><strong>Reliability</strong></td>
                            <td><strong>Guaranteed</strong>: Packet ACKs and automatic retransmission</td>
                            <td><strong>Unreliable</strong>: Lost packets dropped without notification</td>
                          </tr>
                          <tr>
                            <td><strong>Packet Ordering</strong></td>
                            <td>Strict in-order reassembly via sequence numbers</td>
                            <td>Packets can arrive in arbitrary order</td>
                          </tr>
                          <tr>
                            <td><strong>Header Size</strong></td>
                            <td>20 to 60 bytes (Complex flags and state fields)</td>
                            <td>8 bytes (Source/dest port, length, checksum)</td>
                          </tr>
                          <tr>
                            <td><strong>Typical Applications</strong></td>
                            <td>HTTPS (Web), SSH (Shell), SFTP (Files), Databases</td>
                            <td>DNS queries (Port 53), VoIP calls, Live Video, Gaming, DHCP</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DIFF 4: SYMMETRIC VS ASYMMETRIC CRYPTO */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      4. Symmetric vs. Asymmetric Cryptography
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Dimension</th>
                            <th>Symmetric Encryption</th>
                            <th>Asymmetric (Public Key) Encryption</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Key Mechanism</strong></td>
                            <td>Single shared secret key for encryption and decryption</td>
                            <td>Key pair: Public key (encrypt) + Private key (decrypt)</td>
                          </tr>
                          <tr>
                            <td><strong>Speed & Efficiency</strong></td>
                            <td>Extremely fast (Hardware-accelerated with AES-NI)</td>
                            <td>100x to 1000x slower (Complex elliptic curve math)</td>
                          </tr>
                          <tr>
                            <td><strong>Key Exchange</strong></td>
                            <td>Difficult: Must transmit secret key securely</td>
                            <td>Trivial: Public key can be openly published to the internet</td>
                          </tr>
                          <tr>
                            <td><strong>Primary Usage</strong></td>
                            <td>Bulk payload encryption (TLS data streams, disk BitLocker)</td>
                            <td>Key exchange (ECDH), digital signatures, SSH identities</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* DIFF 5: NTLM VS KERBEROS */}
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      5. NTLM vs. Kerberos 5 (Windows Authentication)
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ fontSize: "0.82rem" }}>
                        <thead>
                          <tr>
                            <th>Feature</th>
                            <th>NTLM (NT LAN Manager)</th>
                            <th>Kerberos 5 (Active Directory)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Architecture</strong></td>
                            <td>3-Way Challenge-Response (Type 1, 2, 3)</td>
                            <td>Centralized Ticket-Granting Service (KDC / TGT)</td>
                          </tr>
                          <tr>
                            <td><strong>Mutual Authentication</strong></td>
                            <td>No: Only client authenticates; server identity unverified</td>
                            <td><strong>Yes</strong>: Mutual authentication between client and server</td>
                          </tr>
                          <tr>
                            <td><strong>Pass-the-Hash Risk</strong></td>
                            <td><strong style={{ color: "var(--accent-rose)" }}>High</strong>: NTLM responses easily relayed over SMB</td>
                            <td><strong style={{ color: "var(--accent-emerald)" }}>Mitigated</strong>: Time-stamped tickets prevent replay</td>
                          </tr>
                          <tr>
                            <td><strong>Port / Protocol</strong></td>
                            <td>SMB / RPC (Ports 445, 135)</td>
                            <td>Kerberos (TCP/UDP Port 88)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 6: REAL-WORLD BREACH SCENARIOS */}
              {academyTab === "scenarios" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* SCENARIO 1: EQUIFAX */}
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-rose)", margin: 0 }}>
                        Case 1: Equifax Apache Struts Breach (CVE-2017-5638)
                      </h3>
                      <span className="badge badge-critical">147 Million Records Leaked</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Attack Vector:</strong> OGNL expression injection in Apache Struts Jakarta Multipart parser via crafted <code>Content-Type</code> headers.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Root Cause:</strong> The security patch had been available for 2 months, but unmaintained asset inventory delayed deployment.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Architecture Flaw:</strong> Flat internal network allowed compromised web server to query 48 unrelated internal database clusters.
                      </div>
                    </div>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px 14px", borderRadius: "6px", borderLeft: "3px solid var(--accent-emerald)", fontSize: "0.82rem" }}>
                      <strong>Defensive Lessons:</strong> Automated Software Composition Analysis (SCA) to discover vulnerable third-party dependencies + strict internal micro-segmentation.
                    </div>
                  </div>

                  {/* SCENARIO 2: CAPITAL ONE */}
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-amber)", margin: 0 }}>
                        Case 2: Capital One AWS Cloud Metadata SSRF Breach
                      </h3>
                      <span className="badge badge-high">100 Million Card Applications</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Attack Vector:</strong> Server-Side Request Forgery (SSRF) flaw in a misconfigured ModSecurity WAF EC2 instance.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Root Cause:</strong> The EC2 instance queried AWS IMDSv1 at <code>169.254.169.254</code> to extract temporary IAM administrative credentials.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Permission Defect:</strong> The WAF IAM role had overly broad permissions (<code>s3:ListAllMyBuckets</code> and read access to all customer S3 buckets).
                      </div>
                    </div>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px 14px", borderRadius: "6px", borderLeft: "3px solid var(--accent-emerald)", fontSize: "0.82rem" }}>
                      <strong>Defensive Lessons:</strong> Enforce AWS IMDSv2 (requires session token headers that SSRF cannot spoof) + Least Privilege on IAM roles.
                    </div>
                  </div>

                  {/* SCENARIO 3: TARGET HVAC */}
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-amber)", margin: 0 }}>
                        Case 3: Target Third-Party HVAC Vendor Credential Pivot
                      </h3>
                      <span className="badge badge-high">40 Million Payment Cards</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Initial Access:</strong> Phishing email carrying Citadel malware compromised credentials of a third-party HVAC refrigeration contractor.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Lateral Movement:</strong> Contractor had access to Target billing portal, but no network isolation separated the billing portal from Point-of-Sale (POS) terminals.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Exploitation:</strong> Attackers deployed RAM memory-scraping malware across cash register registers to capture unencrypted card swipes.
                      </div>
                    </div>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px 14px", borderRadius: "6px", borderLeft: "3px solid var(--accent-emerald)", fontSize: "0.82rem" }}>
                      <strong>Defensive Lessons:</strong> Enforce Zero Trust network segmentation between vendor portals and PCI-DSS cardholder environments + Mandatory MFA on all external contractor logins.
                    </div>
                  </div>

                  {/* SCENARIO 4: SOLARWINDS */}
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", margin: 0 }}>
                        Case 4: SolarWinds Sunburst CI/CD Supply-Chain Backdoor
                      </h3>
                      <span className="badge badge-critical">18,000 Enterprise Customers</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Attack Vector:</strong> Compromised internal TeamCity build server; injected backdoor DLL into official software update during compilation.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Bypassed Defense:</strong> The malicious artifact was signed with legitimate SolarWinds digital certificates, bypassing anti-virus integrity checks.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Egress C2:</strong> The DLL remained dormant for two weeks, then initiated DNS-based C2 communication to receive stage-2 payloads.
                      </div>
                    </div>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px 14px", borderRadius: "6px", borderLeft: "3px solid var(--accent-emerald)", fontSize: "0.82rem" }}>
                      <strong>Defensive Lessons:</strong> Reproducible, deterministic CI/CD builds + strict egress filtering to prevent infrastructure servers from beaconing outbound.
                    </div>
                  </div>

                  {/* SCENARIO 5: NOTPETYA */}
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-rose)", margin: 0 }}>
                        Case 5: NotPetya Ransomware & Fast Lateral Movement
                      </h3>
                      <span className="badge badge-critical">$10 Billion Global Damage</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Initial Infection:</strong> Poisoned software update for Ukrainian accounting package (M.E.Doc).
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Lateral Propagation:</strong> Dumped credentials from memory via Mimikatz, combined with EternalBlue (MS17-010 SMB exploit) to infect entire LANs within seconds.
                      </div>
                      <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                        <strong>Destructive Payload:</strong> Overwrote Master Boot Record (MBR) and encrypted file tables without retaining recovery keys.
                      </div>
                    </div>
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "10px 14px", borderRadius: "6px", borderLeft: "3px solid var(--accent-emerald)", fontSize: "0.82rem" }}>
                      <strong>Defensive Lessons:</strong> Completely disable legacy SMBv1 + enable Windows Credential Guard to prevent memory dumping of LSASS credentials.
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 7: MASTER COMMAND CHEAT SHEETS */}
              {academyTab === "commands" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="card">
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                      Essential Cybersecurity & System Administration Command Matrix
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                      Click the "Copy" button beside any command to immediately copy it to your clipboard for execution in your local terminal or PowerShell prompt.
                    </p>

                    {/* SECTION: LINUX AUDITING */}
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "8px", fontSize: "0.9rem" }}>
                        🐧 Linux Defense & Auditing Commands
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table className="data-table" style={{ fontSize: "0.8rem" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "45%" }}>Command</th>
                              <th>Function & Security Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { cmd: "ss -tulpn", desc: "List all listening TCP/UDP sockets with process IDs" },
                              { cmd: "lsof -i :80", desc: "Identify process holding web port 80" },
                              { cmd: "find / -perm -4000 -type f 2>/dev/null", desc: "Audit all SUID root binaries on disk" },
                              { cmd: "find / -writable -type d 2>/dev/null", desc: "Find world-writable directories (privilege escalation risks)" },
                              { cmd: "awk -F: '($3 == 0) {print $1}' /etc/passwd", desc: "Audit for rogue backdoor accounts with UID 0 (root)" },
                              { cmd: "tail -n 50 /var/log/auth.log", desc: "Inspect recent SSH and sudo authentication attempts" },
                              { cmd: "lastlog", desc: "Show most recent login timestamp for every user on the system" },
                              { cmd: "ps aux | grep -i root", desc: "List all processes currently running with root privileges" }
                            ].map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <code>{item.cmd}</code>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: "2px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                                      onClick={() => copyCmd(item.cmd)}
                                    >
                                      {copiedCmd === item.cmd ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                                      {copiedCmd === item.cmd ? "Copied" : "Copy"}
                                    </button>
                                  </div>
                                </td>
                                <td style={{ color: "var(--text-muted)" }}>{item.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION: WINDOWS POWERSHELL */}
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "8px", fontSize: "0.9rem" }}>
                        🪟 Windows PowerShell Incident Response Commands
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table className="data-table" style={{ fontSize: "0.8rem" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "55%" }}>PowerShell Command</th>
                              <th>Function & Security Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              {
                                cmd: "Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess",
                                desc: "List all listening ports and owning process IDs"
                              },
                              {
                                cmd: "Get-WmiObject win32_service | Where-Object {$_.PathName -notlike '\"*' -and $_.PathName -like '* *'} | Select-Object Name, PathName",
                                desc: "Scan for unquoted service paths (privilege escalation vector)"
                              },
                              {
                                cmd: "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625} -MaxEvents 15 | Select-Object TimeCreated, Message",
                                desc: "Detect brute-force logon attempts in Windows Security log"
                              },
                              {
                                cmd: 'Get-LocalGroupMember -Group "Administrators"',
                                desc: "Audit all members with local administrator rights"
                              },
                              {
                                cmd: 'Get-ChildItem -Path "$env:LOCALAPPDATA" -Recurse -File | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-1)} | Select-Object FullName -First 20',
                                desc: "Find files modified in user AppData in the last 24 hours"
                              },
                              {
                                cmd: "Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer",
                                desc: "Inspect network adapters, gateway, and DNS configuration"
                              }
                            ].map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <code>{item.cmd}</code>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: "2px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                                      onClick={() => copyCmd(item.cmd)}
                                    >
                                      {copiedCmd === item.cmd ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                                      {copiedCmd === item.cmd ? "Copied" : "Copy"}
                                    </button>
                                  </div>
                                </td>
                                <td style={{ color: "var(--text-muted)" }}>{item.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION: NETWORKING & DIAGNOSTICS */}
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "8px", fontSize: "0.9rem" }}>
                        🌐 Network Diagnostic & Protocol Commands
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table className="data-table" style={{ fontSize: "0.8rem" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "45%" }}>Command</th>
                              <th>Function & Security Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { cmd: "ping -c 4 8.8.8.8", desc: "Check network reachability, latency, and packet loss" },
                              { cmd: "traceroute 1.1.1.1", desc: "Trace routing hops between host and target (tracert on Windows)" },
                              { cmd: "nslookup -type=TXT example.com", desc: "Query DNS TXT records for SPF, DKIM, and domain verification" },
                              { cmd: "dig example.com +trace", desc: "Trace full DNS resolution from root servers down to authoritative answer" },
                              { cmd: "curl -Iv https://example.com", desc: "Inspect raw TLS negotiation, certificate issuer, and HTTP response headers" },
                              { cmd: "curl -s -D - -o /dev/null https://example.com", desc: "Audit security headers (HSTS, CSP, X-Frame-Options)" },
                              { cmd: "tcpdump -nn -i eth0 port 443", desc: "Live capture packet headers on encrypted HTTPS port" }
                            ].map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <code>{item.cmd}</code>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: "2px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                                      onClick={() => copyCmd(item.cmd)}
                                    >
                                      {copiedCmd === item.cmd ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                                      {copiedCmd === item.cmd ? "Copied" : "Copy"}
                                    </button>
                                  </div>
                                </td>
                                <td style={{ color: "var(--text-muted)" }}>{item.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Collapsible AI Mentor Drawer (when finding selected) */}
        {selectedFinding && activeTab === "findings" && (
          <aside className="ai-drawer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} color="var(--accent-cyan)" /> AI Mentor Advice
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                onClick={() => setSelectedFinding(null)}
              >
                Close
              </button>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              {selectedFinding.title}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "12px" }}>
              CWE: {selectedFinding.cwe || "N/A"} • Tool: {selectedFinding.source_tool}
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <button
                className={`btn ${aiMode === "beginner" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                onClick={() => {
                  setAiMode("beginner");
                  handleExplainWithAi(selectedFinding);
                }}
              >
                Beginner Concept
              </button>
              <button
                className={`btn ${aiMode === "advanced" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                onClick={() => {
                  setAiMode("advanced");
                  handleExplainWithAi(selectedFinding);
                }}
              >
                Code Remediation
              </button>
            </div>

            <div style={{ fontSize: "0.82rem", background: "#050811", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", whiteSpace: "pre-wrap", lineHeight: "1.5", flex: 1, overflowY: "auto" }}>
              {aiLoading ? "Local AI is analyzing the finding..." : aiExplanation || selectedFinding.remediation}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
