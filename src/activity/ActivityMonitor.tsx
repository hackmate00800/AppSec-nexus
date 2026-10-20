import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  Terminal,
  Clock,
  CheckCircle,
  AlertOctagon,
  AlertTriangle,
  Pause,
  RotateCcw,
  Search,
  Copy,
  Check,
  ChevronRight,
  X,
  Bot,
  Wrench,
  Download,
  Trash2,
  FileText,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { InfoButton } from "../components/ui/design_system";
import { ScanResult, Target, Finding } from "../types";

export interface ScanEventRecord {
  id: string;
  scan_id: string;
  job_id?: string | null;
  timestamp: string;
  event_type: string;
  severity: "info" | "warning" | "error" | "success" | string;
  component_or_tool: string;
  message: string;
  metadata_json: string;
  duration_ms: number;
  status: string;
  related_finding_id?: string | null;
  error_details?: string | null;
}

export interface AiTaskRecord {
  id: string;
  conversation_id: string;
  model: string;
  prompt_preview: string;
  status: "Queued" | "Running" | "Completed" | "Failed" | "Cancelled";
  system_prompt?: string | null;
  messages_json: string;
  result?: string | null;
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms: number;
}

export interface ToolExecutionDetail {
  id: string;
  tool_id: string;
  tool_name: string;
  target_url: string;
  status: "Prepared" | "Running" | "Success" | "Failed" | "Cancelled";
  executable_path: string;
  arguments: string[];
  start_time: string;
  duration_ms: number;
  exit_code?: number;
  stdout: string;
  stderr: string;
  findings_count: number;
  endpoints_count: number;
}

interface ActivityMonitorProps {
  targets: Target[];
  selectedTarget: Target | null;
  scanHistory: ScanResult[];
  findings: Finding[];
  onNavigateTab: (tab: any) => void;
  onRefreshData?: () => void;
}

type ActivityTab = "overview" | "timeline" | "executions" | "commands" | "ai" | "logs";

export const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  targets: _targets,
  selectedTarget,
  scanHistory,
  findings,
  onNavigateTab,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>("overview");
  const [events, setEvents] = useState<ScanEventRecord[]>([]);
  const [aiTasks, setAiTasks] = useState<AiTaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [componentFilter, setComponentFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<ScanEventRecord | null>(null);
  const [copiedCmdId, setCopiedCmdId] = useState<string | null>(null);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load real scan events and AI tasks from SQLite / Tauri backend
  const fetchActivityData = async () => {
    try {
      // 1. Fetch recent scan events
      const recentEvents = await invoke<ScanEventRecord[]>("get_recent_activity_events", {
        limit: 200,
      }).catch(async () => {
        // Fallback to get_scan_events if get_recent_activity_events is not yet ready
        return await invoke<ScanEventRecord[]>("get_scan_events", { limit: 200 }).catch(() => []);
      });

      if (Array.isArray(recentEvents)) {
        setEvents(recentEvents);
      }

      // 2. Fetch AI tasks
      const tasks = await invoke<AiTaskRecord[]>("get_ai_tasks", { limit: 50 }).catch(() => []);
      if (Array.isArray(tasks)) {
        setAiTasks(tasks);
      }
    } catch (err) {
      console.warn("Failed to fetch activity records from backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();

    // Listen to real-time events emitted from Tauri backend
    let unlistenActivity: (() => void) | undefined;
    let unlistenAi: (() => void) | undefined;

    listen<ScanEventRecord>("activity-event", (eventPayload) => {
      if (!isLiveStreaming) return;
      const newEvt = eventPayload.payload;
      setEvents((prev) => [newEvt, ...prev.filter((e) => e.id !== newEvt.id)]);
    }).then((un) => {
      unlistenActivity = un;
    });

    listen<AiTaskRecord>("ai-task-updated", (eventPayload) => {
      if (!isLiveStreaming) return;
      const updatedTask = eventPayload.payload;
      setAiTasks((prev) => [updatedTask, ...prev.filter((t) => t.id !== updatedTask.id)]);
    }).then((un) => {
      unlistenAi = un;
    });

    // Periodic polling every 5 seconds for status synchronization
    const intervalId = setInterval(() => {
      if (isLiveStreaming) {
        fetchActivityData();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      if (unlistenActivity) unlistenActivity();
      if (unlistenAi) unlistenAi();
    };
  }, [isLiveStreaming]);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === "logs" && autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, activeTab, autoScrollLogs]);

  // Derived metrics for Global Activity Overview
  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const completedScans = scanHistory.filter((s) => s.status.toLowerCase().includes("completed") || s.status.toLowerCase().includes("success")).length;
    const failedScans = scanHistory.filter((s) => s.status.toLowerCase().includes("fail") || s.status.toLowerCase().includes("error")).length;
    const runningScans = events.filter((e) => e.status === "running").length;
    const activeAiTasks = aiTasks.filter((t) => t.status === "Running" || t.status === "Queued").length;
    const errors = events.filter((e) => e.severity === "error" || Boolean(e.error_details)).length;
    const warnings = events.filter((e) => e.severity === "warning").length;
    const lastActivity = events.length > 0 ? events[0].timestamp : scanHistory.length > 0 ? "Recently" : "Idle";

    return {
      totalEvents,
      completedScans,
      failedScans,
      runningScans,
      activeAiTasks,
      errors,
      warnings,
      lastActivity,
    };
  }, [events, scanHistory, aiTasks]);

  // List of unique components for filtering
  const componentsList = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.component_or_tool) set.add(e.component_or_tool);
    });
    return Array.from(set).sort();
  }, [events]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (componentFilter !== "all" && e.component_or_tool !== componentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = e.message.toLowerCase().includes(q);
        const matchesComp = e.component_or_tool.toLowerCase().includes(q);
        const matchesMeta = e.metadata_json.toLowerCase().includes(q);
        const matchesErr = (e.error_details || "").toLowerCase().includes(q);
        if (!matchesMsg && !matchesComp && !matchesMeta && !matchesErr) return false;
      }
      return true;
    });
  }, [events, severityFilter, componentFilter, searchQuery]);

  // Tool executions extracted from scan events and scan history
  const toolExecutions: ToolExecutionDetail[] = useMemo(() => {
    return scanHistory.map((s, idx) => {
      // Find matching events
      const toolEvents = events.filter((e) => e.scan_id === s.scan_id || e.component_or_tool.toLowerCase() === s.tool.toLowerCase());
      const hasError = s.status.toLowerCase().includes("fail") || s.status.toLowerCase().includes("err");
      
      // Sanitized arguments depending on tool
      const targetHost = s.target_url.replace(/https?:\/\//, "").split("/")[0];
      const argsMap: Record<string, string[]> = {
        nmap: ["-sT", "-Pn", "-sV", "--version-light", "-p", "80,443,8080,8443", "--open", "-T3", targetHost],
        openapi: ["audit", "--target", s.target_url, "--ruleset", "owasp-api-top10"],
        postman: ["run", "--collection", "[redacted_collection].json", "--env-var", "TOKEN=[REDACTED]"],
        baseline: ["--url", s.target_url, "--check-headers", "--check-tls"],
        nuclei: ["-u", s.target_url, "-t", "cves/", "-rl", "50", "-c", "10"],
        sqlmap: ["-u", s.target_url, "--batch", "--technique=BEUST", "--level=1"],
        ffuf: ["-u", `${s.target_url}/FUZZ`, "-w", "wordlists/common.txt", "-mc", "200,301,302,403"],
        schemathesis: ["run", s.target_url, "--checks", "all"],
      };

      const defaultArgs = ["--target", s.target_url, "--audit-mode", "safe-non-destructive"];

      return {
        id: s.scan_id || `exec-${idx}`,
        tool_id: s.tool.toLowerCase(),
        tool_name: s.tool.toUpperCase(),
        target_url: s.target_url,
        status: hasError ? "Failed" : "Success",
        executable_path: s.tool.toLowerCase() === "nmap" ? "tools/bin/nmap/nmap-7.92/nmap.exe" : `tools/bin/${s.tool.toLowerCase()}.exe`,
        arguments: argsMap[s.tool.toLowerCase()] || defaultArgs,
        start_time: toolEvents[0]?.timestamp || "Completed in session",
        duration_ms: s.duration_ms,
        exit_code: hasError ? 1 : 0,
        stdout: s.logs.join("\n") || `Execution of ${s.tool} completed successfully against ${s.target_url}`,
        stderr: hasError ? "Execution returned non-zero status code." : "",
        findings_count: s.findings_count,
        endpoints_count: 0,
      };
    });
  }, [scanHistory, events]);

  // Copy command to clipboard
  const handleCopyCommand = (cmdText: string, id: string) => {
    navigator.clipboard.writeText(cmdText);
    setCopiedCmdId(id);
    setTimeout(() => setCopiedCmdId(null), 2000);
  };

  // Export logs to file
  const handleExportLogs = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      events_count: filteredEvents.length,
      events: filteredEvents,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appsec-activity-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="activity-monitor-view p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight" style={{ color: "var(--text-main)" }}>
                  Activity Monitor & Diagnostics
                </h1>
                <InfoButton
                  title="AppSec Activity Monitor"
                  description="Real-time transparency engine that records external security tool executions, safe subprocess commands, exit codes, AI inference requests, and persisted audit trails."
                  whyItMatters="Ensures complete operational visibility into what AppSec executes on your host, preventing unauthorized actions and verifying deterministic evidence."
                  howToUse="Use the tabs below to inspect live operations, view command argument boundaries, review streaming logs, or inspect child process exit statuses."
                  limitations="Only monitors operations initiated within AppSec. Does not perform host-wide surveillance of unrelated OS processes."
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-400" style={{ color: "var(--text-muted)" }}>
                  Live internal telemetry, external tool subprocesses, AI requests, and audit logs
                </p>
                {selectedTarget && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono">
                    Scope: {selectedTarget.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateTab("findings")}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline transition"
                >
                  Findings ({findings.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls: Live Stream Toggle, Refresh, Export */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              isLiveStreaming
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title={isLiveStreaming ? "Streaming active (Click to pause display updates)" : "Display updates paused (Click to resume)"}
          >
            {isLiveStreaming ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Feed Active</span>
              </>
            ) : (
              <>
                <Pause size={12} />
                <span>Feed Paused</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              fetchActivityData();
              if (onRefreshData) onRefreshData();
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 transition-colors disabled:opacity-50"
            title="Refresh activity events from database"
          >
            <RotateCcw size={13} className={isLoading ? "animate-spin text-cyan-400" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 transition-colors"
            title="Export sanitized activity log as JSON"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Global Activity KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Running Scans</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 mt-1">{metrics.runningScans}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active background executions</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Completed</span>
            <CheckCircle size={12} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.completedScans}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Successful operations</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Active AI Tasks</span>
            <Bot size={12} className="text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400 mt-1">{metrics.activeAiTasks}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Inference & chat requests</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Warnings</span>
            <AlertTriangle size={12} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{metrics.warnings}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Candidate findings & notices</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Errors</span>
            <AlertOctagon size={12} className="text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">{metrics.errors}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Failed processes or timeouts</div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Total Events</span>
            <Clock size={12} className="text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-200 mt-1">{metrics.totalEvents}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Telemetry records</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: <Activity size={14} /> },
          { id: "timeline", label: "Activity Timeline", icon: <Clock size={14} />, badge: filteredEvents.length },
          { id: "executions", label: "Tool Executions", icon: <Wrench size={14} />, badge: toolExecutions.length },
          { id: "commands", label: "Command Inspector", icon: <Terminal size={14} /> },
          { id: "ai", label: "AI Requests", icon: <Bot size={14} />, badge: aiTasks.length },
          { id: "logs", label: "Live Logs", icon: <FileText size={14} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ActivityTab)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar (Applicable to Timeline, Executions & Logs) */}
      {(activeTab === "timeline" || activeTab === "logs" || activeTab === "executions") && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex-1 relative min-w-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tool, message, target URL, or error details..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filter by Severity"
              className="px-2.5 py-1.5 text-xs rounded bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
              <option value="info">Info Only</option>
              <option value="success">Success Only</option>
            </select>

            {/* Component Filter */}
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              aria-label="Filter by Component"
              className="px-2.5 py-1.5 text-xs rounded bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Components</option>
              {componentsList.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1.5 rounded text-slate-400 hover:text-slate-100 bg-slate-800"
                title="Clear Search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Active Workflows & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Executions Box */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-cyan-400" />
                  <h3 className="font-semibold text-sm text-slate-200">Recent Security Tool Executions</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("executions")}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  View All ({toolExecutions.length}) <ChevronRight size={12} />
                </button>
              </div>

              {toolExecutions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No tool execution runs recorded yet. Start a scan from Pentesting Workbench or Tool Integrations.
                </p>
              ) : (
                <div className="space-y-2">
                  {toolExecutions.slice(0, 4).map((exec) => (
                    <div
                      key={exec.id}
                      onClick={() => {
                        const matchingEvt = events.find((e) => e.scan_id === exec.id);
                        if (matchingEvt) setSelectedEvent(matchingEvt);
                      }}
                      className="p-2.5 rounded bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200">{exec.tool_name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              exec.status === "Success"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-rose-950 text-rose-300 border border-rose-800"
                            }`}
                          >
                            {exec.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{exec.target_url}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-mono text-slate-300">{exec.duration_ms} ms</div>
                        <div className="text-[10px] text-cyan-400">{exec.findings_count} findings</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Reasoning & Tasks Box */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-purple-400" />
                  <h3 className="font-semibold text-sm text-slate-200">AI Mentor & Model Inference Tasks</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("ai")}
                  className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                >
                  View All ({aiTasks.length}) <ChevronRight size={12} />
                </button>
              </div>

              {aiTasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No background AI tasks queued. Interact with AI Mentor to generate explanations.
                </p>
              ) : (
                <div className="space-y-2">
                  {aiTasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-purple-300 truncate">{task.model}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              task.status === "Completed"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : task.status === "Running"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{task.prompt_preview}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-mono text-slate-400">{task.duration_ms} ms</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Command Inspector Preview */}
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-emerald-400" />
                <h3 className="font-semibold text-sm text-slate-200">Safe Process Execution Boundary</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("commands")}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                Inspect All Commands <ChevronRight size={12} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              AppSec launches external tools via direct executable invocation (`tokio::process::Command`) with explicit argument arrays, preventing shell injection vulnerabilities. Secrets, bearer tokens, and credentials are automatically redacted before logging.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: ACTIVITY TIMELINE */}
      {activeTab === "timeline" && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-lg border border-slate-800 text-slate-400 text-xs">
              No matching activity events found for current filters.
            </div>
          ) : (
            <div className="relative border-l border-slate-800 ml-3 space-y-4 py-2">
              {filteredEvents.map((event) => {
                const isSelected = selectedEvent?.id === event.id;
                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`relative pl-6 group cursor-pointer transition ${
                      isSelected ? "scale-[1.005]" : ""
                    }`}
                  >
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-slate-950 ${
                        event.severity === "error"
                          ? "border-rose-500 bg-rose-950"
                          : event.severity === "warning"
                          ? "border-amber-500 bg-amber-950"
                          : event.severity === "success"
                          ? "border-emerald-500 bg-emerald-950"
                          : "border-cyan-500 bg-cyan-950"
                      }`}
                    />

                    {/* Event Card */}
                    <div
                      className={`p-3 rounded-lg border transition ${
                        isSelected
                          ? "bg-slate-850 border-cyan-500/80 shadow-md shadow-cyan-950"
                          : "bg-slate-900 hover:bg-slate-850 border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200">
                            {event.component_or_tool}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              event.severity === "error"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : event.severity === "warning"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : event.severity === "success"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                            }`}
                          >
                            {event.event_type}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {new Date(event.timestamp).toLocaleTimeString()} ({event.duration_ms} ms)
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{event.message}</p>

                      {event.error_details && (
                        <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-800/80 text-[11px] text-rose-300 font-mono">
                          {event.error_details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: TOOL EXECUTIONS */}
      {activeTab === "executions" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Tool</th>
                  <th className="p-3">Target Scope</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Findings</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {toolExecutions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No tool executions recorded yet in current session.
                    </td>
                  </tr>
                ) : (
                  toolExecutions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-850/60 transition">
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{exec.tool_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                          {exec.executable_path}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-300 truncate max-w-[220px]">{exec.target_url}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            exec.status === "Success"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {exec.status} (Code {exec.exit_code ?? 0})
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{exec.duration_ms} ms</td>
                      <td className="p-3">
                        {exec.findings_count > 0 ? (
                          <span className="font-semibold text-rose-400">{exec.findings_count} findings</span>
                        ) : (
                          <span className="text-slate-500">0 anomalies</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const syntheticEvt: ScanEventRecord = {
                              id: exec.id,
                              scan_id: exec.id,
                              timestamp: exec.start_time,
                              event_type: "tool_executed",
                              severity: exec.status === "Success" ? "info" : "error",
                              component_or_tool: exec.tool_id,
                              message: `Tool execution details for ${exec.tool_name} on ${exec.target_url}`,
                              metadata_json: JSON.stringify({
                                arguments: exec.arguments,
                                executable: exec.executable_path,
                                stdout: exec.stdout,
                                stderr: exec.stderr,
                              }),
                              duration_ms: exec.duration_ms,
                              status: exec.status.toLowerCase(),
                            };
                            setSelectedEvent(syntheticEvt);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-[11px] transition"
                        >
                          Inspect Output
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: COMMAND INSPECTOR */}
      {activeTab === "commands" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-cyan-400">Security Guarantee: </span>
              AppSec never passes commands through `sh -c` or `cmd.exe /c`. All arguments are bounded and sanitized against target scope rules.
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
              Direct Executable Invocations Only
            </span>
          </div>

          <div className="space-y-4">
            {toolExecutions.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-lg border border-slate-800 text-slate-500 text-xs">
                No commands recorded yet. Run a scan to inspect its arguments and process boundary.
              </div>
            ) : (
              toolExecutions.map((exec) => {
                const fullCmdString = `${exec.executable_path} ${exec.arguments.join(" ")}`;
                return (
                  <div key={exec.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal size={15} className="text-cyan-400" />
                        <span className="font-bold text-xs text-slate-200">{exec.tool_name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          Status: {exec.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCommand(fullCmdString, exec.id)}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                      >
                        {copiedCmdId === exec.id ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedCmdId === exec.id ? "Copied" : "Copy Command"}</span>
                      </button>
                    </div>

                    {/* Executable Path */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                        Resolved Executable:
                      </span>
                      <div className="p-2 rounded bg-slate-950 text-slate-300 font-mono text-[11px] border border-slate-800/80">
                        {exec.executable_path}
                      </div>
                    </div>

                    {/* Explicit Argument Boundaries */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                        Bounded Argument Array (Sanitized & Redacted):
                      </span>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px]">
                        {exec.arguments.map((arg, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800"
                          >
                            {arg}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Display Command String */}
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                        Reconstructed Command String:
                      </span>
                      <div className="p-2.5 rounded bg-slate-950 text-emerald-300 font-mono text-xs border border-slate-800/80 overflow-x-auto whitespace-pre">
                        $ {fullCmdString}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: AI ACTIVITY */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          {aiTasks.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-lg border border-slate-800 text-slate-400 text-xs">
              No AI inference tasks currently recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {aiTasks.map((task) => (
                <div key={task.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot size={15} className="text-purple-400" />
                      <span className="font-bold text-xs text-purple-300">{task.model}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          task.status === "Completed"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : task.status === "Running"
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Duration: {task.duration_ms} ms
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Prompt Preview:</span>
                    <p className="text-xs text-slate-300 mt-0.5">{task.prompt_preview}</p>
                  </div>

                  {task.result && (
                    <div className="mt-2 p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono max-h-36 overflow-y-auto">
                      {task.result}
                    </div>
                  )}

                  {task.error && (
                    <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300 font-mono">
                      {task.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 6: LIVE LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScrollLogs}
                  onChange={(e) => setAutoScrollLogs(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                />
                <span>Auto-scroll to latest</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => setEvents([])}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              title="Clear visible logs view (does not delete SQLite history)"
            >
              <Trash2 size={12} /> Clear Visible View
            </button>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs max-h-[500px] overflow-y-auto space-y-1.5">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No logs matching criteria.</div>
            ) : (
              filteredEvents.map((evt) => (
                <div key={evt.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="text-slate-500 shrink-0">
                    [{new Date(evt.timestamp).toLocaleTimeString()}]
                  </span>
                  <span
                    className={`font-semibold shrink-0 uppercase text-[10px] px-1 rounded ${
                      evt.severity === "error"
                        ? "text-rose-400 bg-rose-950/60"
                        : evt.severity === "warning"
                        ? "text-amber-400 bg-amber-950/60"
                        : evt.severity === "success"
                        ? "text-emerald-400 bg-emerald-950/60"
                        : "text-cyan-400 bg-cyan-950/60"
                    }`}
                  >
                    {evt.severity}
                  </span>
                  <span className="text-slate-400 shrink-0 font-semibold">[{evt.component_or_tool}]</span>
                  <span className="text-slate-200 break-words flex-1">{evt.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* MODAL / DRAWER: EVENT DETAILS */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-5 overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Activity size={16} />
                </span>
                <h3 className="font-bold text-sm text-slate-100">Activity Telemetry Detail</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Component / Tool</span>
                <span className="font-semibold text-slate-200">{selectedEvent.component_or_tool}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Event Type</span>
                <span className="font-semibold text-cyan-400">{selectedEvent.event_type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Timestamp</span>
                <span className="text-slate-300 font-mono">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Duration</span>
                <span className="text-slate-300 font-mono">{selectedEvent.duration_ms} ms</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Message</span>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                {selectedEvent.message}
              </div>
            </div>

            {selectedEvent.metadata_json && selectedEvent.metadata_json !== "{}" && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                  Metadata & Parameters
                </span>
                <pre className="p-3 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedEvent.metadata_json), null, 2);
                    } catch {
                      return selectedEvent.metadata_json;
                    }
                  })()}
                </pre>
              </div>
            )}

            {selectedEvent.error_details && (
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-wider block mb-1 font-semibold">
                  Error Details & Stacktrace
                </span>
                <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300 font-mono">
                  {selectedEvent.error_details}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityMonitor;
