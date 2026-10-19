import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Terminal as TerminalIcon,
  Play,
  Square,
  Trash2,
  Copy,
  Check,
  Search,
  Plus,
  X,
  Edit2,
  Download,
  Split,
  Columns,
  Maximize2,
  Minimize2,
  Clock,
} from "lucide-react";
import { Target, Finding, DiscoveredEndpoint, AdapterOutput, ToolAdapterMetadata } from "../types";

export type TerminalStream = "stdout" | "stderr" | "info" | "warn" | "error" | "system";

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  stream: TerminalStream;
  text: string;
}

export type SessionStatus = "idle" | "running" | "completed" | "failed" | "terminated";

export interface TerminalSession {
  id: string;
  name: string;
  status: SessionStatus;
  toolId?: string;
  command?: string;
  targetUrl?: string;
  pid: number;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  exitCode?: number | null;
  logs: TerminalLogEntry[];
  autoScroll: boolean;
  filterQuery: string;
  streamFilter: "all" | "output" | "errors" | "system";
}

export type TerminalLayoutMode = "single" | "split-vertical" | "split-horizontal";

export interface MultiTerminalWorkspaceProps {
  targets: Target[];
  selectedTargetId?: string | null;
  onSelectTargetId?: (id: string) => void;
  onFindingsDiscovered?: (findings: Finding[]) => void;
  onEndpointsDiscovered?: (endpoints: DiscoveredEndpoint[]) => void;
  initialToolId?: string;
  availableTools?: ToolAdapterMetadata[];
}

const DEFAULT_TOOLS: { id: string; name: string; category: string; defaultArgs: string }[] = [
  { id: "nmap", name: "Nmap Network Scanner", category: "Network", defaultArgs: "-sV -sC -T4" },
  { id: "nuclei", name: "Nuclei Vulnerability Scanner", category: "Web / API", defaultArgs: "-severity critical,high,medium -tags cve" },
  { id: "katana", name: "Katana Web Crawler", category: "Web / API", defaultArgs: "-d 3 -jc -kf all" },
  { id: "ffuf", name: "ffuf Fast Fuzzer", category: "Web / API", defaultArgs: "-w common.txt -mc 200,301,302,403" },
  { id: "httpx", name: "httpx HTTP Prober", category: "Web / API", defaultArgs: "-status-code -tech-detect -title" },
  { id: "semgrep", name: "Semgrep SAST Engine", category: "Software", defaultArgs: "--config auto --error" },
  { id: "gitleaks", name: "Gitleaks Secret Scanner", category: "Software", defaultArgs: "detect --verbose --redact" },
  { id: "trivy", name: "Trivy Container & FS Scanner", category: "Cloud", defaultArgs: "fs --security-checks vuln,config ." },
  { id: "sqlmap", name: "sqlmap SQL Injection Engine", category: "Web / API", defaultArgs: "--batch --random-agent --level=2" },
  { id: "checkov", name: "Checkov IaC Scanner", category: "Cloud", defaultArgs: "-d . --framework all" },
  { id: "osv-scanner", name: "OSV-Scanner Dependency Auditor", category: "Software", defaultArgs: "-r ." },
  { id: "schemathesis", name: "Schemathesis API Fuzzer", category: "API", defaultArgs: "run --checks all" },
  { id: "tshark", name: "TShark Packet Dissector", category: "Network", defaultArgs: "-i any -c 50" },
  { id: "docker", name: "Docker Security Auditor", category: "Cloud", defaultArgs: "ps -a --format json" },
  { id: "burp", name: "Burp Suite Ingestion", category: "Web", defaultArgs: "--proxy 127.0.0.1:8080" },
];

let nextSessionSeq = 1;
function generatePid(): number {
  return 10000 + Math.floor(Math.random() * 89999);
}

function createInitialSession(name?: string, toolId?: string, targetUrl?: string): TerminalSession {
  const seq = nextSessionSeq++;
  const sessionName = name || (toolId ? `${toolId.toUpperCase()} Session` : `Terminal ${seq}`);
  const pid = generatePid();
  const timestamp = new Date().toLocaleTimeString();

  return {
    id: `term_sess_${Date.now()}_${seq}`,
    name: sessionName,
    status: "idle",
    toolId: toolId || undefined,
    targetUrl: targetUrl || undefined,
    pid,
    logs: [
      {
        id: `log_init_${Date.now()}_1`,
        timestamp,
        stream: "system",
        text: `AppSec Multi-Terminal Environment initialized. Session ID: ${sessionName} [PID: ${pid}]`,
      },
      {
        id: `log_init_${Date.now()}_2`,
        timestamp,
        stream: "info",
        text: `Type 'help' for terminal commands or select a security tool adapter above to begin execution.`,
      },
    ],
    autoScroll: true,
    filterQuery: "",
    streamFilter: "all",
  };
}

export const MultiTerminalWorkspace: React.FC<MultiTerminalWorkspaceProps> = ({
  targets,
  selectedTargetId,
  onSelectTargetId,
  onFindingsDiscovered,
  onEndpointsDiscovered,
  initialToolId,
  availableTools,
}) => {
  const toolsList = useMemo(() => {
    if (availableTools && availableTools.length > 0) {
      return availableTools.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        defaultArgs: DEFAULT_TOOLS.find((dt) => dt.id === t.id)?.defaultArgs || "",
      }));
    }
    return DEFAULT_TOOLS;
  }, [availableTools]);

  // Sessions state
  const [sessions, setSessions] = useState<TerminalSession[]>(() => [
    createInitialSession("Primary Terminal", initialToolId, targets[0]?.primary_url),
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || "");
  const [secondarySessionId, setSecondarySessionId] = useState<string>("");

  // Layout mode: "single" | "split-vertical" | "split-horizontal"
  const [layoutMode, setLayoutMode] = useState<TerminalLayoutMode>("single");
  const [isMaximized, setIsMaximized] = useState(false);

  // Selected tool runner state
  const [selectedToolId, setSelectedToolId] = useState<string>(
    initialToolId || DEFAULT_TOOLS[0].id
  );
  const [targetId, setTargetId] = useState<string>(selectedTargetId || targets[0]?.id || "");
  const [customArgs, setCustomArgs] = useState<string>(
    DEFAULT_TOOLS.find((t) => t.id === (initialToolId || DEFAULT_TOOLS[0].id))?.defaultArgs || ""
  );

  // Rename session modal state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // CLI Command prompt input state per session
  const [commandInputs, setCommandInputs] = useState<Record<string, string>>({});
  const [commandHistories, setCommandHistories] = useState<Record<string, string[]>>({});
  const [historyIndices, setHistoryIndices] = useState<Record<string, number>>({});

  // Copy feedback state
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Ticker for running sessions
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasRunning = sessions.some((s) => s.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Update target when prop changes
  useEffect(() => {
    if (selectedTargetId && selectedTargetId !== targetId) {
      setTargetId(selectedTargetId);
    }
  }, [selectedTargetId]);

  // Active target object
  const activeTarget = useMemo(() => {
    return targets.find((t) => t.id === targetId) || targets[0] || null;
  }, [targets, targetId]);

  // Active session
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  // Secondary session for split pane
  const secondarySession = useMemo(() => {
    if (layoutMode === "single") return null;
    return sessions.find((s) => s.id === secondarySessionId) || sessions.find((s) => s.id !== activeSessionId) || null;
  }, [sessions, layoutMode, secondarySessionId, activeSessionId]);

  // Switch tool default args when tool changes
  const handleSelectTool = (id: string) => {
    setSelectedToolId(id);
    const def = DEFAULT_TOOLS.find((t) => t.id === id);
    if (def) {
      setCustomArgs(def.defaultArgs);
    }
  };

  // Add new session
  const handleAddSession = (name?: string, toolId?: string) => {
    const newSess = createInitialSession(name, toolId, activeTarget?.primary_url);
    setSessions((prev) => [...prev, newSess]);
    setActiveSessionId(newSess.id);
  };

  // Close session
  const handleCloseSession = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sessionToClose = sessions.find((s) => s.id === id);
    if (sessionToClose?.status === "running") {
      const confirmClose = window.confirm(
        `Session "${sessionToClose.name}" is currently running a process (PID ${sessionToClose.pid}). Do you want to terminate and close it?`
      );
      if (!confirmClose) return;
    }

    if (sessions.length <= 1) {
      // Re-initialize with 1 fresh session if closing the last one
      const fresh = createInitialSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }

    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining[remaining.length - 1]?.id || "");
    }
    if (secondarySessionId === id) {
      setSecondarySessionId("");
    }
  };

  // Rename session
  const handleStartRename = (session: TerminalSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSessionId(session.id);
    setRenameInput(session.name);
  };

  const handleSaveRename = () => {
    if (!editingSessionId || !renameInput.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === editingSessionId ? { ...s, name: renameInput.trim() } : s))
    );
    setEditingSessionId(null);
  };

  // Append log to a specific session
  const appendLog = (sessionId: string, stream: TerminalStream, text: string) => {
    const newEntry: TerminalLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      stream,
      text,
    };
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        // Limit buffer to 1500 lines per session to protect host RAM
        const nextLogs = s.logs.length >= 1500 ? [...s.logs.slice(-1200), newEntry] : [...s.logs, newEntry];
        return {
          ...s,
          logs: nextLogs,
        };
      })
    );
  };

  // Clear session logs
  const handleClearSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          logs: [
            {
              id: `log_cleared_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              stream: "system",
              text: `Terminal buffer cleared. [PID: ${s.pid}]`,
            },
          ],
        };
      })
    );
  };

  // Copy session logs
  const handleCopyLogs = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const plainText = session.logs.map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.text}`).join("\n");
    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedSessionId(sessionId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    });
  };

  // Export session logs
  const handleExportLogs = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const content = [
      `=============================================================`,
      ` AppSec Multi-Terminal Output Log: ${session.name}`,
      ` Status: ${session.status.toUpperCase()} | PID: ${session.pid}`,
      ` Target: ${session.targetUrl || "N/A"} | Tool: ${session.toolId || "CLI"}`,
      ` Started: ${session.startedAt ? new Date(session.startedAt).toISOString() : "N/A"}`,
      ` Duration: ${session.durationMs ? `${session.durationMs}ms` : "N/A"} | Exit Code: ${session.exitCode ?? "N/A"}`,
      `=============================================================`,
      "",
      ...session.logs.map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.text}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `terminal_${session.name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Terminate session process
  const handleTerminateSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== "running") return;

    appendLog(sessionId, "error", `[PROCESS TERMINATED] SIGKILL signal sent to PID ${session.pid}. Subprocess halted.`);
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const now = Date.now();
        const duration = s.startedAt ? now - s.startedAt : 0;
        return {
          ...s,
          status: "terminated",
          endedAt: now,
          durationMs: duration,
          exitCode: -1,
        };
      })
    );
  };

  // Execute Tool Adapter in a given session
  const executeToolInSession = async (
    targetSessionId: string,
    toolId: string,
    target: Target | null,
    argsString: string
  ) => {
    if (!target) {
      appendLog(targetSessionId, "error", "Execution aborted: No authorized target selected.");
      return;
    }

    const toolDef = DEFAULT_TOOLS.find((t) => t.id === toolId);
    const toolName = toolDef?.name || toolId;
    const startTime = Date.now();
    const pid = generatePid();

    // Mark session as running
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetSessionId) return s;
        return {
          ...s,
          status: "running",
          toolId,
          targetUrl: target.primary_url,
          command: `${toolId} ${argsString}`,
          pid,
          startedAt: startTime,
          endedAt: undefined,
          durationMs: undefined,
          exitCode: null,
          name: s.name.startsWith("Terminal") ? `${toolDef?.id.toUpperCase() || toolId} Scan` : s.name,
        };
      })
    );

    appendLog(targetSessionId, "system", `[PROCESS SPAWNED] Initializing ${toolName} (PID: ${pid})`);
    appendLog(targetSessionId, "info", `Target: ${target.name} (${target.primary_url}) [Scope: Authorized]`);
    appendLog(targetSessionId, "info", `Command Flags: ${argsString || "(default configuration)"}`);

    // Parse parameters
    const parameters: Record<string, string> = {};
    if (argsString.trim()) {
      parameters["args"] = argsString.trim();
    }

    try {
      // Execute via Tauri adapter backend
      const result = await invoke<AdapterOutput>("execute_tool_adapter", {
        toolId,
        targetId: target.id,
        targetUrl: target.primary_url,
        parameters,
      });

      const endTime = Date.now();
      const durationMs = result.duration_ms || endTime - startTime;

      // Stream logs from adapter output
      if (result.logs && result.logs.length > 0) {
        for (const logLine of result.logs) {
          const isErr = logLine.toLowerCase().includes("error") || logLine.toLowerCase().includes("failed");
          const isWarn = logLine.toLowerCase().includes("warn");
          appendLog(targetSessionId, isErr ? "stderr" : isWarn ? "warn" : "stdout", logLine);
        }
      } else {
        appendLog(targetSessionId, "stdout", `${toolName} execution completed without standard stream output.`);
      }

      // Check findings
      if (result.findings && result.findings.length > 0) {
        appendLog(
          targetSessionId,
          "info",
          `[EVIDENCE DETECTED] ${result.findings.length} security finding(s) discovered and validated.`
        );
        if (onFindingsDiscovered) {
          onFindingsDiscovered(result.findings);
        }
      }

      // Check endpoints
      if (result.endpoints && result.endpoints.length > 0) {
        appendLog(
          targetSessionId,
          "info",
          `[SURFACE DISCOVERY] ${result.endpoints.length} unique endpoint(s) mapped.`
        );
        if (onEndpointsDiscovered) {
          onEndpointsDiscovered(result.endpoints);
        }
      }

      const isSuccess = result.status.toLowerCase() === "success";
      const exitCode = isSuccess ? 0 : 1;

      appendLog(
        targetSessionId,
        isSuccess ? "system" : "error",
        `[PROCESS TERMINATED] Exit code: ${exitCode} | Duration: ${durationMs}ms | Status: ${result.status}`
      );

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          return {
            ...s,
            status: isSuccess ? "completed" : "failed",
            endedAt: endTime,
            durationMs,
            exitCode,
          };
        })
      );
    } catch (err: any) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const errMsg = typeof err === "string" ? err : err?.message || JSON.stringify(err);

      appendLog(targetSessionId, "stderr", `Adapter execution exception: ${errMsg}`);
      appendLog(targetSessionId, "error", `[PROCESS HALTED] Exit code: 1 | Duration: ${durationMs}ms`);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          return {
            ...s,
            status: "failed",
            endedAt: endTime,
            durationMs,
            exitCode: 1,
          };
        })
      );
    }
  };

  // Launch tool from Quick Runner
  const handleLaunchTool = (inNewSession: boolean = false) => {
    if (!activeTarget) {
      alert("Please select or configure an authorized target scope first.");
      return;
    }

    let targetSessId = activeSessionId;
    if (inNewSession || !activeSession || activeSession.status === "running") {
      const toolDef = DEFAULT_TOOLS.find((t) => t.id === selectedToolId);
      const newSess = createInitialSession(`${toolDef?.name || selectedToolId} Session`, selectedToolId, activeTarget.primary_url);
      setSessions((prev) => [...prev, newSess]);
      targetSessId = newSess.id;
      setActiveSessionId(newSess.id);
    }

    executeToolInSession(targetSessId, selectedToolId, activeTarget, customArgs);
  };

  // Command prompt handler
  const handleCommandSubmit = (sessionId: string, e: React.FormEvent) => {
    e.preventDefault();
    const rawCmd = (commandInputs[sessionId] || "").trim();
    if (!rawCmd) return;

    // Reset input
    setCommandInputs((prev) => ({ ...prev, [sessionId]: "" }));

    // Record history
    setCommandHistories((prev) => {
      const cur = prev[sessionId] || [];
      return { ...prev, [sessionId]: [...cur, rawCmd] };
    });
    setHistoryIndices((prev) => ({ ...prev, [sessionId]: -1 }));

    // Echo command
    appendLog(sessionId, "stdout", `user@appsec-nexus:~$ ${rawCmd}`);

    const parts = rawCmd.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
        appendLog(sessionId, "info", "Available AppSec Terminal Commands:");
        appendLog(sessionId, "info", "  help                   - Display this command manual");
        appendLog(sessionId, "info", "  clear                  - Clear current terminal screen");
        appendLog(sessionId, "info", "  tools                  - List all available security tool adapters");
        appendLog(sessionId, "info", "  targets                - Display active target and authorized scope");
        appendLog(sessionId, "info", "  ps                     - List all active terminal processes and PIDs");
        appendLog(sessionId, "info", "  kill <pid>             - Halt and terminate process with given PID");
        appendLog(sessionId, "info", "  run <toolId> [args...] - Launch tool adapter on current target");
        appendLog(sessionId, "info", "  whoami                 - Display operator identity and scope privileges");
        break;

      case "clear":
      case "cls":
        handleClearSession(sessionId);
        break;

      case "whoami":
        appendLog(sessionId, "stdout", "operator: AppSec Security Analyst");
        appendLog(sessionId, "stdout", `role: Authorized Security Assessor`);
        appendLog(sessionId, "stdout", `active_scope: ${activeTarget ? `${activeTarget.name} (${activeTarget.primary_url})` : "None configured"}`);
        break;

      case "targets":
        appendLog(sessionId, "info", `Authorized Targets (${targets.length}):`);
        targets.forEach((t) => {
          const isAct = t.id === activeTarget?.id;
          appendLog(sessionId, "stdout", `  ${isAct ? "▶ " : "  "}[${t.id}] ${t.name} -> ${t.primary_url} (${t.scope})`);
        });
        break;

      case "tools":
        appendLog(sessionId, "info", `Registered Tool Adapters (${DEFAULT_TOOLS.length}):`);
        DEFAULT_TOOLS.forEach((t) => {
          appendLog(sessionId, "stdout", `  • ${t.id.padEnd(14)} [${t.category}] - ${t.name}`);
        });
        break;

      case "ps":
        appendLog(sessionId, "info", "Active Terminal Sessions:");
        sessions.forEach((s) => {
          const runTime = s.status === "running" && s.startedAt ? `${Math.round((Date.now() - s.startedAt) / 1000)}s` : s.durationMs ? `${s.durationMs}ms` : "-";
          appendLog(sessionId, "stdout", `  PID: ${s.pid} | Session: "${s.name}" | Status: ${s.status.toUpperCase()} | Time: ${runTime}`);
        });
        break;

      case "kill":
        if (args.length === 0) {
          appendLog(sessionId, "error", "Usage: kill <pid>");
          return;
        }
        const targetPid = parseInt(args[0], 10);
        const targetSession = sessions.find((s) => s.pid === targetPid);
        if (!targetSession) {
          appendLog(sessionId, "error", `No session found with PID ${targetPid}`);
        } else if (targetSession.status !== "running") {
          appendLog(sessionId, "warn", `Session with PID ${targetPid} is not currently running.`);
        } else {
          handleTerminateSession(targetSession.id);
          appendLog(sessionId, "info", `Terminated process with PID ${targetPid} in session "${targetSession.name}".`);
        }
        break;

      case "run":
        if (args.length === 0) {
          appendLog(sessionId, "error", "Usage: run <toolId> [arguments...]");
          appendLog(sessionId, "info", `Example: run nmap -sV -T4`);
          return;
        }
        const toolToRun = args[0].toLowerCase();
        const foundTool = DEFAULT_TOOLS.find((t) => t.id === toolToRun);
        if (!foundTool) {
          appendLog(sessionId, "error", `Unknown tool adapter '${toolToRun}'. Type 'tools' for available adapters.`);
          return;
        }
        const runArgs = args.slice(1).join(" ") || foundTool.defaultArgs;
        executeToolInSession(sessionId, foundTool.id, activeTarget, runArgs);
        break;

      default:
        appendLog(sessionId, "stderr", `appsec: command not recognized: '${cmd}'. Type 'help' for available commands.`);
        break;
    }
  };

  // Command history navigation (Up / Down)
  const handleKeyDownPrompt = (sessionId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    const history = commandHistories[sessionId] || [];
    if (history.length === 0) return;

    const curIndex = historyIndices[sessionId] ?? -1;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = curIndex === -1 ? history.length - 1 : Math.max(0, curIndex - 1);
      setHistoryIndices((prev) => ({ ...prev, [sessionId]: nextIndex }));
      setCommandInputs((prev) => ({ ...prev, [sessionId]: history[nextIndex] || "" }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (curIndex === -1) return;
      const nextIndex = curIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndices((prev) => ({ ...prev, [sessionId]: -1 }));
        setCommandInputs((prev) => ({ ...prev, [sessionId]: "" }));
      } else {
        setHistoryIndices((prev) => ({ ...prev, [sessionId]: nextIndex }));
        setCommandInputs((prev) => ({ ...prev, [sessionId]: history[nextIndex] || "" }));
      }
    }
  };

  // Render individual terminal pane component
  const renderTerminalPane = (session: TerminalSession, _isSecondaryPane: boolean = false) => {
    // Filtered logs
    const filteredLogs = session.logs.filter((l) => {
      if (session.streamFilter === "output" && l.stream !== "stdout") return false;
      if (session.streamFilter === "errors" && l.stream !== "stderr" && l.stream !== "error") return false;
      if (session.streamFilter === "system" && l.stream !== "system" && l.stream !== "info") return false;
      if (session.filterQuery.trim()) {
        return l.text.toLowerCase().includes(session.filterQuery.toLowerCase());
      }
      return true;
    });

    const runDuration =
      session.status === "running" && session.startedAt
        ? Math.round((Date.now() - session.startedAt) / 1000)
        : session.durationMs
        ? Math.round(session.durationMs / 1000)
        : null;

    const statusBadgeColor =
      session.status === "running"
        ? "var(--accent-emerald)"
        : session.status === "completed"
        ? "var(--accent-cyan)"
        : session.status === "failed"
        ? "var(--accent-rose)"
        : session.status === "terminated"
        ? "var(--accent-rose)"
        : "var(--text-dim)";

    return (
      <div
        key={session.id}
        className="terminal-pane"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
          minHeight: "420px",
          background: "#080c14",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {/* Pane Toolbar Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-color)",
            fontSize: "12px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {/* Left: Session identity and status */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: statusBadgeColor,
                boxShadow: session.status === "running" ? `0 0 8px ${statusBadgeColor}` : "none",
              }}
            />
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
              {session.name}
            </span>
            <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>
              [PID: {session.pid}]
            </span>

            {runDuration !== null && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                <Clock size={11} />
                {runDuration}s
              </span>
            )}

            {session.exitCode !== undefined && session.exitCode !== null && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: session.exitCode === 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                  color: session.exitCode === 0 ? "var(--accent-emerald)" : "var(--accent-rose)",
                  fontWeight: 600,
                }}
              >
                code {session.exitCode}
              </span>
            )}
          </div>

          {/* Right: Pane controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Search Filter */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={12} style={{ position: "absolute", left: "6px", color: "var(--text-dim)" }} />
              <input
                type="text"
                value={session.filterQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSessions((prev) =>
                    prev.map((s) => (s.id === session.id ? { ...s, filterQuery: q } : s))
                  );
                }}
                placeholder="Filter logs..."
                style={{
                  padding: "3px 6px 3px 22px",
                  fontSize: "11px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  color: "var(--text-main)",
                  width: "110px",
                }}
              />
              {session.filterQuery && (
                <button
                  onClick={() =>
                    setSessions((prev) =>
                      prev.map((s) => (s.id === session.id ? { ...s, filterQuery: "" } : s))
                    )
                  }
                  style={{
                    position: "absolute",
                    right: "4px",
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Stream Filter Dropdown */}
            <select
              value={session.streamFilter}
              onChange={(e) => {
                const sf = e.target.value as any;
                setSessions((prev) =>
                  prev.map((s) => (s.id === session.id ? { ...s, streamFilter: sf } : s))
                );
              }}
              style={{
                padding: "3px 6px",
                fontSize: "11px",
                background: "var(--bg-card)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
              }}
              title="Filter by stream type"
            >
              <option value="all">All Streams</option>
              <option value="output">Output Only</option>
              <option value="errors">Errors Only</option>
              <option value="system">System Only</option>
            </select>

            {/* Copy Button */}
            <button
              onClick={() => handleCopyLogs(session.id)}
              className="icon-btn-subtle"
              style={{ padding: "4px 6px", fontSize: "11px" }}
              title="Copy session output to clipboard"
            >
              {copiedSessionId === session.id ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
            </button>

            {/* Export Button */}
            <button
              onClick={() => handleExportLogs(session.id)}
              className="icon-btn-subtle"
              style={{ padding: "4px 6px", fontSize: "11px" }}
              title="Download session log file"
            >
              <Download size={13} />
            </button>

            {/* Clear Button */}
            <button
              onClick={() => handleClearSession(session.id)}
              className="icon-btn-subtle"
              style={{ padding: "4px 6px", fontSize: "11px" }}
              title="Clear terminal screen"
            >
              <Trash2 size={13} />
            </button>

            {/* Terminate Button */}
            {session.status === "running" && (
              <button
                onClick={() => handleTerminateSession(session.id)}
                className="btn btn-danger"
                style={{ padding: "3px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                title="Halt and kill running process (SIGKILL)"
              >
                <Square size={11} />
                <span>Kill</span>
              </button>
            )}
          </div>
        </div>

        {/* Terminal Output Log Area */}
        <div
          className="terminal-output-scroll"
          style={{
            flex: 1,
            padding: "12px",
            overflowY: "auto",
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontSize: "12px",
            lineHeight: "1.55",
            color: "#e2e8f0",
            maxHeight: isMaximized ? "75vh" : "550px",
            minHeight: "300px",
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ color: "var(--text-dim)", padding: "12px 0" }}>
              // Terminal buffer empty. No lines matching current filter.
            </div>
          ) : (
            filteredLogs.map((entry, idx) => {
              let streamColor = "#94a3b8"; // stdout default
              let prefix = "OUT";

              if (entry.stream === "stderr" || entry.stream === "error") {
                streamColor = "#f43f5e";
                prefix = "ERR";
              } else if (entry.stream === "warn") {
                streamColor = "#f59e0b";
                prefix = "WRN";
              } else if (entry.stream === "info") {
                streamColor = "#38bdf8";
                prefix = "INF";
              } else if (entry.stream === "system") {
                streamColor = "#10b981";
                prefix = "SYS";
              }

              return (
                <div
                  key={entry.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    wordBreak: "break-all",
                    padding: "1px 0",
                  }}
                >
                  <span style={{ color: "#475569", userSelect: "none", fontSize: "11px", minWidth: "55px" }}>
                    {entry.timestamp}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "0 4px",
                      borderRadius: "3px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: streamColor,
                      fontWeight: 600,
                      userSelect: "none",
                    }}
                  >
                    {prefix}
                  </span>
                  <span style={{ color: streamColor, flex: 1 }}>{entry.text}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Interactive Command Prompt */}
        <form
          onSubmit={(e) => handleCommandSubmit(session.id, e)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: "#05080f",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <span style={{ color: "var(--accent-cyan)", fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>
            user@appsec-nexus:~$
          </span>
          <input
            type="text"
            value={commandInputs[session.id] || ""}
            onChange={(e) => setCommandInputs((prev) => ({ ...prev, [session.id]: e.target.value }))}
            onKeyDown={(e) => handleKeyDownPrompt(session.id, e)}
            placeholder="Type 'help', 'tools', 'targets', 'run <tool>', 'ps', 'kill <pid>'..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f8fafc",
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontSize: "12px",
            }}
          />
          <button
            type="submit"
            className="icon-btn-subtle"
            style={{ padding: "4px 8px", fontSize: "11px", color: "var(--accent-cyan)" }}
            title="Execute command (Enter)"
          >
            <Play size={12} />
          </button>
        </form>
      </div>
    );
  };

  return (
    <div
      className={`multi-terminal-workspace ${isMaximized ? "maximized-view" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* 1. Header & Quick Tool Runner Card */}
      <div className="card" style={{ padding: "14px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <TerminalIcon size={20} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)" }}>
                Multi-Terminal Orchestration & Tool Execution
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Concurrent terminal sessions, live subprocess streaming, real tool execution, and process lifecycle controls.
              </p>
            </div>
          </div>

          {/* Layout Mode Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-dim)", marginRight: "4px" }}>Layout:</span>
            <button
              onClick={() => setLayoutMode("single")}
              className={`btn ${layoutMode === "single" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              title="Single terminal view"
            >
              <span>Single</span>
            </button>
            <button
              onClick={() => {
                setLayoutMode("split-vertical");
                if (sessions.length < 2) {
                  handleAddSession();
                }
              }}
              className={`btn ${layoutMode === "split-vertical" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              title="Side-by-side vertical split view"
            >
              <Columns size={12} />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => {
                setLayoutMode("split-horizontal");
                if (sessions.length < 2) {
                  handleAddSession();
                }
              }}
              className={`btn ${layoutMode === "split-horizontal" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              title="Stacked horizontal split view"
            >
              <Split size={12} style={{ transform: "rotate(90deg)" }} />
              <span>Stacked</span>
            </button>

            <button
              onClick={() => setIsMaximized((v) => !v)}
              className="icon-btn-subtle"
              style={{ padding: "5px", marginLeft: "6px" }}
              title={isMaximized ? "Restore view" : "Maximize terminal workspace"}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Quick Tool Runner Selector Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1 }}>
            {/* Target Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 600 }}>Target:</span>
              <select
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  if (onSelectTargetId) onSelectTargetId(e.target.value);
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  minWidth: "160px",
                }}
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.primary_url})
                  </option>
                ))}
              </select>
            </div>

            {/* Tool Adapter Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 600 }}>Tool:</span>
              <select
                value={selectedToolId}
                onChange={(e) => handleSelectTool(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  background: "var(--bg-secondary)",
                  color: "var(--accent-cyan)",
                  fontWeight: 600,
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  minWidth: "170px",
                }}
              >
                {toolsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} [{t.category}]
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Arguments Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "180px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 600 }}>Args:</span>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="Optional CLI flags (e.g. -sV -T4)..."
                style={{
                  flex: 1,
                  padding: "5px 10px",
                  fontSize: "12px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => handleLaunchTool(false)}
              disabled={activeSession?.status === "running"}
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "6px 14px",
              }}
              title="Execute selected tool in current terminal session"
            >
              <Play size={13} />
              <span>Run in Active</span>
            </button>

            <button
              onClick={() => handleLaunchTool(true)}
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "6px 12px",
              }}
              title="Launch tool in a new concurrent terminal session"
            >
              <Plus size={13} />
              <span>Run in New Tab</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Terminal Sessions Bar (Tabs Strip) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "2px",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {/* Session Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, overflowX: "auto" }}>
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isSecondary = s.id === secondarySessionId && layoutMode !== "single";

            const dotColor =
              s.status === "running"
                ? "var(--accent-emerald)"
                : s.status === "completed"
                ? "var(--accent-cyan)"
                : s.status === "failed" || s.status === "terminated"
                ? "var(--accent-rose)"
                : "var(--text-dim)";

            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                onDoubleClick={(e) => handleStartRename(s, e)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "6px 12px",
                  background: isActive ? "var(--bg-card)" : isSecondary ? "var(--bg-secondary)" : "transparent",
                  border: isActive
                    ? "1px solid var(--accent-cyan)"
                    : isSecondary
                    ? "1px dashed var(--accent-blue)"
                    : "1px solid transparent",
                  borderBottom: "none",
                  borderRadius: "6px 6px 0 0",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: isActive ? "var(--text-main)" : "var(--text-muted)",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s ease",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: dotColor,
                    boxShadow: s.status === "running" ? `0 0 6px ${dotColor}` : "none",
                  }}
                />

                <span>{s.name}</span>

                <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  #{s.pid}
                </span>

                {/* Inline rename or close */}
                <button
                  onClick={(e) => handleStartRename(s, e)}
                  className="icon-btn-subtle"
                  style={{ padding: "1px 2px", color: "var(--text-dim)" }}
                  title="Rename session"
                >
                  <Edit2 size={10} />
                </button>

                <button
                  onClick={(e) => handleCloseSession(s.id, e)}
                  className="icon-btn-subtle"
                  style={{ padding: "1px 2px", color: "var(--text-dim)" }}
                  title="Close session"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}

          {/* New Tab Button */}
          <button
            onClick={() => handleAddSession()}
            className="icon-btn-subtle"
            style={{
              padding: "5px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              borderRadius: "4px",
            }}
            title="Create new terminal session"
          >
            <Plus size={13} />
            <span>New Session</span>
          </button>
        </div>

        {/* Secondary Pane Selector (when in split mode) */}
        {layoutMode !== "single" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
            <span style={{ color: "var(--text-dim)" }}>Pane 2:</span>
            <select
              value={secondarySessionId || (sessions.find((s) => s.id !== activeSessionId)?.id || "")}
              onChange={(e) => setSecondarySessionId(e.target.value)}
              style={{
                padding: "2px 8px",
                fontSize: "11px",
                background: "var(--bg-card)",
                color: "var(--accent-blue)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
              }}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (#{s.pid})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Rename Modal */}
      {editingSessionId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            background: "var(--bg-card)",
            border: "1px solid var(--accent-cyan)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Rename Session:</span>
          <input
            type="text"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") setEditingSessionId(null);
            }}
            autoFocus
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-main)",
              width: "220px",
            }}
          />
          <button onClick={handleSaveRename} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }}>
            Save
          </button>
          <button onClick={() => setEditingSessionId(null)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "11px" }}>
            Cancel
          </button>
        </div>
      )}

      {/* 4. Terminal Panes Rendering Area */}
      {layoutMode === "single" && activeSession && (
        <div style={{ flex: 1, minHeight: "450px" }}>
          {renderTerminalPane(activeSession, false)}
        </div>
      )}

      {layoutMode === "split-vertical" && activeSession && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            flex: 1,
            minHeight: "450px",
          }}
        >
          {renderTerminalPane(activeSession, false)}
          {secondarySession && renderTerminalPane(secondarySession, true)}
        </div>
      )}

      {layoutMode === "split-horizontal" && activeSession && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flex: 1,
            minHeight: "650px",
          }}
        >
          {renderTerminalPane(activeSession, false)}
          {secondarySession && renderTerminalPane(secondarySession, true)}
        </div>
      )}
    </div>
  );
};
