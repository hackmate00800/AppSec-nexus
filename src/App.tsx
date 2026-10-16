import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  Download
} from "lucide-react";
import "./App.css";
import { Target, ToolInfo, Finding, ScanResult } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"targets" | "tools" | "findings" | "scanner" | "mentor">("targets");
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // Target creation form
  const [targetName, setTargetName] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [allowLocalLab, setAllowLocalLab] = useState(false);
  const [targetError, setTargetError] = useState("");

  // Scan execution
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string>("baseline");

  // AI Mentor
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [aiMode, setAiMode] = useState<"beginner" | "advanced">("beginner");
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState<string>("");

  async function handleExportReport() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    try {
      const filename = await invoke<string>("export_report", {
        targetId: selectedTarget.id,
      });
      setReportStatus(`Report successfully exported: ${filename}`);
      setTimeout(() => setReportStatus(""), 8000);
    } catch (err: any) {
      alert("Failed to export report: " + err.toString());
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
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

      const [available, models] = await invoke<[boolean, string[]]>("get_ai_status");
      setAiAvailable(available);
      setAiModels(models);
      if (models.length > 0) {
        setSelectedModel(models[0]);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  async function handleCreateTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError("");
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

    setIsScanning(true);
    setActiveTool(toolId);
    setScanLogs([`Starting ${toolId} scan against ${selectedTarget.primary_url}...`]);

    try {
      const result = await invoke<ScanResult>("run_scan", {
        targetId: selectedTarget.id,
        tool: toolId,
      });

      setScanLogs((prev) => [...prev, ...result.logs, `Completed in ${result.duration_ms} ms.`]);

      // Refresh findings
      const updatedFindings = await invoke<Finding[]>("get_findings");
      setFindings(updatedFindings);
    } catch (err: any) {
      setScanLogs((prev) => [...prev, `[ERROR] Scan aborted: ${err.toString()}`]);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleExplainWithAi(finding: Finding) {
    setSelectedFinding(finding);
    setAiLoading(true);
    setAiExplanation("");

    try {
      const model = selectedModel || (aiModels.length > 0 ? aiModels[0] : "llama3");
      const explanation = await invoke<string>("explain_finding", {
        model,
        mode: aiMode,
        findingId: finding.id,
      });
      setAiExplanation(explanation);
    } catch (err: any) {
      setAiExplanation(
        `Local AI Mentor Note: Could not connect to local Ollama runtime. Make sure Ollama is running ('ollama serve') with a downloaded model.\n\nGuidance Summary for '${finding.title}':\n${finding.remediation}\n\nEvidence: ${finding.evidence}`
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="top-nav">
        <div className="brand">
          <Shield className="brand-icon" size={24} />
          <span>AppSec Nexus</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>v0.1.0</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {selectedTarget && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-dim)" }}>Active Target:</span>
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
              setScanLogs((prev) => [...prev, "[!] Emergency Kill Triggered: All child scan jobs terminated."]);
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
            <span>Tool Hub</span>
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
            className={`nav-item ${activeTab === "mentor" ? "active" : ""}`}
            onClick={() => setActiveTab("mentor")}
          >
            <Sparkles size={18} />
            <span>Local AI Mentor</span>
          </div>
        </aside>

        {/* Center Workspace */}
        <main className="workspace">
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
                      Primary URL (HTTP or HTTPS)
                    </label>
                    <input
                      className="input-field"
                      placeholder="https://example.com"
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Tool Hub & Adapters</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Security tools orchestrated by AppSec Nexus with automatic process timeouts and secret sanitization.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                {tools.map((tool) => (
                  <div key={tool.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{tool.name}</div>
                        <span className={`badge ${tool.is_available ? "badge-locked" : "badge-critical"}`}>
                          {tool.is_available ? "Ready" : "Missing Binary"}
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
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        {tool.path.slice(-25)}
                      </span>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SCAN CONSOLE */}
          {activeTab === "scanner" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 className="card-title" style={{ margin: 0 }}>
                    <Terminal size={18} color="var(--accent-cyan)" /> Live Scan Terminal ({activeTool})
                  </h3>
                  <div style={{ display: "flex", gap: "10px" }}>
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
                  </div>
                </div>

                <div className="console-box" style={{ height: "420px" }}>
                  {scanLogs.length === 0 ? (
                    <div style={{ color: "var(--text-dim)" }}>
                      // Terminal ready. Select an authorized target and click 'Run Check' above.
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

          {/* TAB 4: UNIFIED FINDINGS */}
          {activeTab === "findings" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h2 className="card-title" style={{ margin: 0 }}>
                      <AlertTriangle size={20} color="var(--accent-amber)" />
                      Unified Findings & Evidence ({findings.length})
                    </h2>
                    {reportStatus && (
                      <div style={{ color: "var(--accent-emerald)", fontSize: "0.8rem", marginTop: "4px" }}>
                        ✓ {reportStatus}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleExportReport}
                      disabled={findings.length === 0}
                    >
                      <Download size={14} /> Export HTML Report
                    </button>
                    <button className="btn btn-secondary" onClick={loadInitialData}>
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                {findings.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No findings yet. Run a baseline or tool scan to discover security insights.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Vulnerability</th>
                        <th>Source Tool</th>
                        <th>Affected Asset</th>
                        <th>CWE</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map((f) => (
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
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{f.source_tool}</td>
                          <td style={{ color: "var(--text-dim)", fontSize: "0.8rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

          {/* TAB 5: AI MENTOR */}
          {activeTab === "mentor" && (
            <div className="card">
              <h2 className="card-title">
                <Sparkles size={20} color="var(--accent-cyan)" />
                Local AI Security Mentor (Offline & Private)
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                Powered by your local LLM runtime (Ollama / llama.cpp). All code analysis, stack trace explanations, and remediation advice stay 100% on your laptop.
              </p>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                    Explanation Persona
                  </label>
                  <select
                    className="input-field"
                    value={aiMode}
                    onChange={(e: any) => setAiMode(e.target.value)}
                    style={{ width: "220px" }}
                  >
                    <option value="beginner">Beginner / Learner Mode (Simple Analogies)</option>
                    <option value="advanced">Senior Pentester Mode (Remediation & Code)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                    Select Local Model
                  </label>
                  <select
                    className="input-field"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{ width: "220px" }}
                  >
                    {aiModels.length === 0 ? (
                      <option value="">No local models detected</option>
                    ) : (
                      aiModels.map((m) => <option key={m} value={m}>{m}</option>)
                    )}
                  </select>
                </div>
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
