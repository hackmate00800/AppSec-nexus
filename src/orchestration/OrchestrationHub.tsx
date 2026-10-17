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
} from "lucide-react";

interface OrchestrationHubProps {
  targets: Target[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  onNavigateToFindings: () => void;
}

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

  // Health check modal / state
  const [healthResults, setHealthResults] = useState<Record<string, ToolHealthCheckResult>>({});
  const [testingHealth, setTestingHealth] = useState<Record<string, boolean>>({});

  // Custom path modal
  const [editingPathTool, setEditingPathTool] = useState<ToolAdapterMetadata | null>(null);
  const [customPathInput, setCustomPathInput] = useState("");

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
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    await Promise.all([loadAdapters(), loadExtensions(), loadWorkflows(), loadJobs()]);
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

  const handleTestHealth = async (toolId: string) => {
    setTestingHealth((prev) => ({ ...prev, [toolId]: true }));
    try {
      const res = await invoke<ToolHealthCheckResult>("run_tool_health_check", { toolId });
      setHealthResults((prev) => ({ ...prev, [toolId]: res }));
      // Reload adapters to reflect fresh state
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

  const selectedJob = jobs.find((j) => j.job_id === selectedJobId) || jobs[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header & Sub-Nav */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "linear-gradient(135deg, rgba(16, 26, 45, 0.95), rgba(10, 16, 30, 0.95))",
          border: "1px solid rgba(0, 240, 255, 0.2)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wrench size={24} color="var(--accent-cyan)" />
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>
              Universal Tool & Extension Orchestration Platform
            </h2>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Modular security adapter contracts, bounded Windows detection, DAG multi-step workflows, and approval gates.
          </p>
        </div>

        {/* Target Selector Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Target Context:</span>
          <select
            className="input-field"
            value={selectedTargetId}
            onChange={(e) => onSelectTarget(e.target.value)}
            style={{ width: 220, padding: "6px 12px", fontSize: "0.85rem" }}
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
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
        <button
          className={`tab-btn ${activeSubTab === "tools" ? "active" : ""}`}
          onClick={() => setActiveSubTab("tools")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8 }}
        >
          <Cpu size={16} />
          <span>Security Tools & Adapters ({adapters.length})</span>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 320 }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search tools, capabilities, tags..."
                className="input-field"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{ paddingLeft: 34, width: "100%", fontSize: "0.85rem" }}
              />
            </div>
            <button
              className="btn btn-secondary"
              onClick={loadAdapters}
              style={{ fontSize: "0.8rem", padding: "6px 14px" }}
            >
              Refresh Adapters
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
            {adapters
              .filter(
                (a) =>
                  a.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
                  a.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
                  a.category.toLowerCase().includes(filterQuery.toLowerCase())
              )
              .map((adapter) => {
                const health = healthResults[adapter.id];
                const isTesting = testingHealth[adapter.id];

                return (
                  <div
                    key={adapter.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 12,
                      border: adapter.is_available
                        ? "1px solid rgba(0, 240, 255, 0.25)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      background: "rgba(16, 24, 40, 0.65)",
                    }}
                  >
                    <div>
                      {/* Card Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>{adapter.name}</h3>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>v{adapter.version}</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 500 }}>
                            {adapter.category}
                          </span>
                        </div>
                        {getDetectionBadge(adapter.detection_state)}
                      </div>

                      {/* Description */}
                      <p style={{ margin: "8px 0 10px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {adapter.description}
                      </p>

                      {/* Capabilities pills */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {adapter.capabilities.map((c) => (
                          <span
                            key={c}
                            style={{
                              fontSize: "0.7rem",
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
                          background: "rgba(0, 0, 0, 0.25)",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontFamily: "monospace",
                          color: adapter.resolved_path ? "var(--text-secondary)" : "var(--sev-high)",
                          wordBreak: "break-all",
                        }}
                      >
                        <strong>Resolved:</strong> {adapter.resolved_path || "Not found on host"}
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

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        paddingTop: 10,
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleTestHealth(adapter.id)}
                        disabled={isTesting}
                        style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Zap size={12} color="var(--accent-cyan)" />
                        {isTesting ? "Testing..." : "Test Health"}
                      </button>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditingPathTool(adapter);
                            setCustomPathInput(adapter.custom_path || adapter.resolved_path || "");
                          }}
                          style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                        >
                          Custom Path
                        </button>

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
                  background: "rgba(16, 24, 40, 0.75)",
                  border: "1px solid rgba(0, 240, 255, 0.18)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
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
                          background: "rgba(10, 16, 30, 0.8)",
                          border: step.requires_approval
                            ? "1px solid var(--sev-high)"
                            : "1px solid rgba(255, 255, 255, 0.12)",
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
              background: "rgba(16, 24, 40, 0.75)",
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
                      background: isSelected ? "rgba(0, 240, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid rgba(255, 255, 255, 0.06)",
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
                background: "rgba(16, 24, 40, 0.75)",
                border: "1px solid rgba(0, 240, 255, 0.2)",
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
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
            {extensions.map((ext) => (
              <div
                key={ext.manifest.id}
                className="card"
                style={{
                  background: "rgba(16, 24, 40, 0.7)",
                  border: ext.state === "enabled" ? "1px solid rgba(0, 230, 118, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
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
                          background: "rgba(255, 255, 255, 0.06)",
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
