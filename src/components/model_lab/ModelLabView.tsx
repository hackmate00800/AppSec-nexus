import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  UploadCloud,
  FileCheck,
  Send,
  Sparkles,
  Bot,
  RefreshCw,
  Sliders,
  Copy,
  Check,
} from "lucide-react";
import {
  HardwareDiagnosticReport,
  HereticJobConfig,
  HereticJobRecord,
  HereticJobLog,
  ExportValidationResult,
  ModelEvaluationResult,
} from "../../types/heretic";
import { hereticService } from "../../services/hereticService";

interface ModelLabViewProps {
  onAssignToMentor?: (modelName: string) => void;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({ onAssignToMentor }) => {
  const [activeSubTab, setActiveSubTab] = useState<"diagnostic" | "monitor" | "export" | "benchmark" | "chat">("diagnostic");

  // Diagnostics State
  const [report, setReport] = useState<HardwareDiagnosticReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupOutput, setSetupOutput] = useState<string | null>(null);

  // Job Configuration State
  const [jobConfig, setJobConfig] = useState<HereticJobConfig>({
    source_model: "Qwen/Qwen3-4B-Instruct-2507",
    output_dir: "",
    quantization: "bnb_4bit",
    device_map: "auto",
    n_trials: 50,
    max_weight: undefined,
    direction_index: undefined,
    skip_optimization: false,
    execution_mode: "native",
  });
  const [isStartingJob, setIsStartingJob] = useState(false);

  // Jobs & Monitoring State
  const [jobs, setJobs] = useState<HereticJobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<HereticJobLog[]>([]);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const [logFilter, setLogFilter] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Export & Import State
  const [exportValidation, setExportValidation] = useState<ExportValidationResult | null>(null);
  const [isValidatingExport, setIsValidatingExport] = useState(false);
  const [ollamaModelName, setOllamaModelName] = useState("cyberqwen-heretic:4b");
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    "You are AppSec Nexus AI, an advanced, highly skilled defensive cybersecurity assistant. You provide precise, rigorous, safe technical explanations, security architecture designs, threat modeling, vulnerability detection methodologies, and remediation code."
  );
  const [isImportingOllama, setIsImportingOllama] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);

  // Benchmark State
  const [evaluations, setEvaluations] = useState<ModelEvaluationResult[]>([]);
  const [evalTargetModel, setEvalTargetModel] = useState("cyberqwen-heretic:4b");
  const [isRunningEval, setIsRunningEval] = useState(false);
  const [activeEval, setActiveEval] = useState<ModelEvaluationResult | null>(null);
  const [selectedPromptDetail, setSelectedPromptDetail] = useState<any | null>(null);

  // Test Chat Sandbox State
  const [chatModel, setChatModel] = useState("cyberqwen-heretic:4b");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; isRefusal?: boolean }>>([
    {
      role: "assistant",
      content: "Hello! I am your locally abliterated cybersecurity assistant. Ask me anything regarding secure code review, vulnerability mitigation, AST defense, or offensive security methodology architecture.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load hardware report and jobs on mount
  useEffect(() => {
    loadHardwareDiagnostics();
    loadJobs();
    loadEvaluations();

    // Listen for live log streaming
    const unlistenLogPromise = hereticService.onLog((log) => {
      setLogs((prev) => {
        if (!selectedJobId || log.job_id === selectedJobId) {
          return [...prev, log];
        }
        return prev;
      });
    });

    // Listen for job updates
    const unlistenJobPromise = hereticService.onJobUpdated((updatedJob) => {
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === updatedJob.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedJob;
          return next;
        }
        return [updatedJob, ...prev];
      });
    });

    return () => {
      unlistenLogPromise.then((fn) => fn());
      unlistenJobPromise.then((fn) => fn());
    };
  }, [selectedJobId]);

  // Autoscroll terminal logs
  useEffect(() => {
    if (autoScrollLogs && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScrollLogs]);

  const loadHardwareDiagnostics = async () => {
    setIsLoadingReport(true);
    try {
      const rep = await hereticService.detectHardware();
      setReport(rep);
      // Auto-set execution mode if WSL is detected and recommended
      if (rep.wsl_installed && !rep.cuda_available) {
        setJobConfig((prev) => ({ ...prev, execution_mode: "wsl" }));
      }
    } catch (err) {
      console.error("Hardware detection error:", err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const loadJobs = async () => {
    try {
      const jList = await hereticService.getJobs();
      setJobs(jList);
      if (jList.length > 0 && !selectedJobId) {
        setSelectedJobId(jList[0].id);
        loadJobLogs(jList[0].id);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  const loadJobLogs = async (jobId: string) => {
    try {
      const fetchedLogs = await hereticService.getJobLogs(jobId);
      setLogs(fetchedLogs);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  const loadEvaluations = async () => {
    try {
      const evals = await hereticService.getEvaluations();
      if (evals && Array.isArray(evals)) {
        setEvaluations(evals);
        if (evals.length > 0 && !activeEval) {
          setActiveEval(evals[0]);
        }
      } else {
        setEvaluations([]);
      }
    } catch (err) {
      console.error("Failed to load evaluations:", err);
    }
  };

  const handleSetupEnvironment = async (useWsl: boolean) => {
    setSetupRunning(true);
    setSetupOutput(null);
    try {
      const res = await hereticService.setupEnvironment(useWsl);
      setSetupOutput(res);
      await loadHardwareDiagnostics();
    } catch (err: any) {
      setSetupOutput(`Setup failed: ${err}`);
    } finally {
      setSetupRunning(false);
    }
  };

  const handleStartJob = async () => {
    setIsStartingJob(true);
    try {
      const newJob = await hereticService.startJob(jobConfig);
      setJobs((prev) => [newJob, ...prev]);
      setSelectedJobId(newJob.id);
      setLogs([]);
      setActiveSubTab("monitor");
    } catch (err: any) {
      alert(`Failed to start job: ${err}`);
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (confirm("Are you sure you want to stop this Heretic job?")) {
      try {
        await hereticService.cancelJob(jobId);
        await loadJobs();
      } catch (err: any) {
        alert(`Failed to cancel job: ${err}`);
      }
    }
  };

  const handleValidateExport = async (outputPath: string) => {
    setIsValidatingExport(true);
    try {
      const res = await hereticService.validateExport(outputPath);
      setExportValidation(res);
    } catch (err: any) {
      alert(`Validation error: ${err}`);
    } finally {
      setIsValidatingExport(false);
    }
  };

  const handleImportToOllama = async () => {
    if (!selectedJobId) {
      alert("Please select a job first.");
      return;
    }
    setIsImportingOllama(true);
    setImportLogs([]);
    setImportSuccess(null);
    try {
      const res = await hereticService.importToOllama({
        job_id: selectedJobId,
        model_name: ollamaModelName,
        custom_system_prompt: customSystemPrompt,
      });
      setImportLogs(res.logs);
      setImportSuccess(res.success);
      if (res.success) {
        setChatModel(ollamaModelName);
        setEvalTargetModel(ollamaModelName);
      }
    } catch (err: any) {
      setImportSuccess(false);
      setImportLogs([`Error: ${err}`]);
    } finally {
      setIsImportingOllama(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedJobId) {
      alert("Please select a completed job.");
      return;
    }
    setIsRunningEval(true);
    try {
      const result = await hereticService.runEvaluation(evalTargetModel, selectedJobId);
      setActiveEval(result);
      setEvaluations((prev) => [result, ...prev]);
    } catch (err: any) {
      alert(`Benchmark execution failed: ${err}`);
    } finally {
      setIsRunningEval(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGeneratingChat) return;

    const userPrompt = inputMessage.trim();
    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: userPrompt }]);
    setIsGeneratingChat(true);

    try {
      // Direct call to Ollama endpoint
      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chatModel,
          prompt: userPrompt,
          system: customSystemPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.response || "No response received.";
      const isRefusal = reply.toLowerCase().startsWith("i cannot") || reply.toLowerCase().startsWith("i'm sorry");

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, isRefusal },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Inference Error: Make sure Ollama is running and model '${chatModel}' is imported.\nDetails: ${err.message}`,
        },
      ]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-950/40">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Heretic Model Lab</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                Abliteration & Optuna TPE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Create, evaluate, export, and benchmark local cybersecurity models via Ollama
            </p>
          </div>
        </div>

        {/* Subview Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab("diagnostic")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeSubTab === "diagnostic"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu size={14} />
            Hardware & Setup
          </button>
          <button
            onClick={() => {
              setActiveSubTab("monitor");
              if (selectedJobId) loadJobLogs(selectedJobId);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeSubTab === "monitor"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal size={14} />
            Job Monitor
            {jobs.some((j) => j.status === "running") && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveSubTab("export");
              if (selectedJob?.output_path) {
                handleValidateExport(selectedJob.output_path);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeSubTab === "export"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UploadCloud size={14} />
            Export & Ollama
          </button>
          <button
            onClick={() => setActiveSubTab("benchmark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeSubTab === "benchmark"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity size={14} />
            Evaluation Benchmark
          </button>
          <button
            onClick={() => setActiveSubTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              activeSubTab === "chat"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles size={14} />
            Test Chat
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* SUBTAB 1: HARDWARE DIAGNOSTICS & SETUP */}
        {activeSubTab === "diagnostic" && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Diagnostic Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cpu className="text-cyan-400" size={18} />
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                    Host Hardware & Tooling Diagnostics
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {report && (
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        report.compatibility_level === "supported"
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                          : report.compatibility_level === "supported_with_warnings"
                          ? "bg-amber-950/60 text-amber-300 border-amber-800"
                          : "bg-rose-950/60 text-rose-300 border-rose-800"
                      }`}
                    >
                      {report.compatibility_level === "supported"
                        ? "Compatible (CUDA Ready)"
                        : report.compatibility_level === "supported_with_warnings"
                        ? "Compatible (CPU / Offload)"
                        : "Blocked (Check Disk/RAM)"}
                    </span>
                  )}
                  <button
                    onClick={loadHardwareDiagnostics}
                    disabled={isLoadingReport}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
                    title="Refresh Diagnostics"
                  >
                    <RefreshCw size={14} className={isLoadingReport ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {report ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="text-xs text-slate-400">GPU / Display</div>
                    <div className="text-sm font-semibold text-slate-200 truncate" title={report.gpu_name}>
                      {report.gpu_name}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {report.cuda_available ? "NVIDIA CUDA Active" : "No CUDA (CPU Tensors)"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="text-xs text-slate-400">Host Memory (RAM)</div>
                    <div className="text-sm font-semibold text-slate-200">
                      {(report.ram_avail_mb / 1024).toFixed(1)} GB Free
                    </div>
                    <div className="text-xs text-slate-400">
                      of {(report.ram_total_mb / 1024).toFixed(1)} GB total
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="text-xs text-slate-400">Disk Space (C:)</div>
                    <div className="text-sm font-semibold text-slate-200">
                      {report.disk_free_gb.toFixed(1)} GB Free
                    </div>
                    <div className="text-xs text-slate-400">
                      of {report.disk_total_gb.toFixed(1)} GB total
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="text-xs text-slate-400">Environment Runtimes</div>
                    <div className="text-sm font-semibold text-slate-200 truncate">
                      {report.python_version || "Python Missing"}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {report.wsl_installed ? "WSL2 Active" : "WSL2 Not Found"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-sm">Inspecting system capabilities...</div>
              )}

              {/* Recommendations & Warnings */}
              {report && (report.warnings.length > 0 || report.recommendations.length > 0) && (
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  {report.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-300 bg-amber-950/30 p-2.5 rounded border border-amber-900/50">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                  {report.recommendations.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-cyan-300 bg-cyan-950/30 p-2.5 rounded border border-cyan-900/50">
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Environment Installation Action */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
                <div className="text-xs text-slate-400">
                  Heretic Package ({report?.heretic_installed ? "Detected" : "Not Detected"}):{" "}
                  <code className="text-cyan-300 font-mono">pip install heretic-llm</code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetupEnvironment(false)}
                    disabled={setupRunning}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
                  >
                    Setup Windows Native
                  </button>
                  {report?.wsl_installed && (
                    <button
                      onClick={() => handleSetupEnvironment(true)}
                      disabled={setupRunning}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-cyan-700 hover:bg-cyan-600 text-white transition shadow-sm"
                    >
                      Setup WSL2 Ubuntu
                    </button>
                  )}
                </div>
              </div>

              {setupOutput && (
                <pre className="p-3 bg-black/60 rounded text-xs font-mono text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                  {setupOutput}
                </pre>
              )}
            </div>

            {/* Launch Abliteration Job Form */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5">
                <Sliders className="text-cyan-400" size={18} />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Configure Abliteration Job
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Source Model (HuggingFace ID or Local Checkpoint)</label>
                  <input
                    type="text"
                    value={jobConfig.source_model}
                    onChange={(e) => setJobConfig({ ...jobConfig, source_model: e.target.value })}
                    placeholder="Qwen/Qwen3-4B-Instruct-2507 or local path"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400">Default: Qwen3-4B Instruct or teacher checkpoint</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Execution Mode</label>
                  <select
                    value={jobConfig.execution_mode}
                    onChange={(e) => setJobConfig({ ...jobConfig, execution_mode: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="native">Native Windows (Host Python)</option>
                    <option value="wsl">WSL2 Ubuntu (Recommended for Linux PyTorch)</option>
                  </select>
                  <span className="text-[11px] text-slate-400">WSL2 avoids Windows MSVC compiler issues</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Quantization</label>
                  <select
                    value={jobConfig.quantization}
                    onChange={(e) => setJobConfig({ ...jobConfig, quantization: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="bnb_4bit">bnb_4bit (Recommended for Low VRAM/RAM)</option>
                    <option value="bnb_8bit">bnb_8bit (Higher Precision)</option>
                    <option value="none">None (Full Precision FP16 - High RAM)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Number of Trials (Optuna TPE)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={jobConfig.n_trials}
                    onChange={(e) => setJobConfig({ ...jobConfig, n_trials: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400">20–50 trials for CPU execution; 100+ for fast GPUs</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Device Map</label>
                  <select
                    value={jobConfig.device_map}
                    onChange={(e) => setJobConfig({ ...jobConfig, device_map: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto">auto (Detect CUDA if present, fallback to CPU)</option>
                    <option value="cpu">cpu (Force CPU tensors)</option>
                    <option value="cuda">cuda (Force NVIDIA CUDA)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Custom Output Directory (Optional)</label>
                  <input
                    type="text"
                    value={jobConfig.output_dir}
                    onChange={(e) => setJobConfig({ ...jobConfig, output_dir: e.target.value })}
                    placeholder="Auto-generated in AppData/heretic_models"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Heretic will compute the refusal direction, abliterate target layers, and export Safetensors.
                </span>
                <button
                  onClick={handleStartJob}
                  disabled={isStartingJob}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/40 disabled:opacity-50"
                >
                  <Play size={14} className="fill-white" />
                  {isStartingJob ? "Launching Background Job..." : "Start Heretic Abliteration"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: JOB MONITOR & TERMINAL */}
        {activeSubTab === "monitor" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
            {/* Jobs Sidebar */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col h-full space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Abliteration Jobs</h3>
                <button onClick={loadJobs} className="text-slate-400 hover:text-slate-200">
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {jobs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No jobs recorded yet.</div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        loadJobLogs(job.id);
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                        selectedJobId === job.id
                          ? "bg-slate-800 border-cyan-500/50 shadow-sm"
                          : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-medium text-slate-200 truncate max-w-[140px]">
                          {job.source_model.split("/").pop()}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase ${
                            job.status === "running"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : job.status === "completed"
                              ? "bg-blue-950 text-blue-300 border border-blue-800"
                              : job.status === "failed"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Stage: {job.stage}</span>
                        <span>{new Date(job.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Terminal Window & Stage Tracker */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-cyan-400" />
                  <span className="font-mono text-slate-300">
                    Job ID: {selectedJob?.id.slice(0, 8) || "None"}
                  </span>
                  {selectedJob?.status === "running" && (
                    <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 bg-emerald-950/80 rounded border border-emerald-800 animate-pulse">
                      Live Output Streaming
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="Filter logs..."
                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 w-28 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScrollLogs}
                      onChange={(e) => setAutoScrollLogs(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700"
                    />
                    Autoscroll
                  </label>
                  {selectedJob?.status === "running" && (
                    <button
                      onClick={() => handleCancelJob(selectedJob.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 transition"
                    >
                      Cancel Job
                    </button>
                  )}
                </div>
              </div>

              {/* Stage Progress Bar */}
              {selectedJob && (
                <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 text-[11px] flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-slate-300">Stage:</span>
                    <span className="text-cyan-400 font-mono capitalize">{selectedJob.stage.replace(/_/g, " ")}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Mode: {selectedJob.execution_mode.toUpperCase()} | Q: {selectedJob.config.quantization}
                  </div>
                </div>
              )}

              {/* Terminal Logs Body */}
              <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1 bg-black/80">
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic">No output received yet. Logs will appear here once the subprocess outputs data.</div>
                ) : (
                  (logFilter ? logs.filter((l) => l.line.toLowerCase().includes(logFilter.toLowerCase())) : logs).map((l, i) => (
                    <div key={i} className="text-slate-300 leading-relaxed break-all">
                      <span className="text-slate-600 select-none mr-2">
                        {new Date(l.timestamp).toLocaleTimeString()}
                      </span>
                      {l.line}
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: EXPORT & OLLAMA IMPORT */}
        {activeSubTab === "export" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="text-cyan-400" size={18} />
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                    Model Artifacts Validation
                  </h2>
                </div>
                {selectedJob && (
                  <button
                    onClick={() => handleValidateExport(selectedJob.output_path)}
                    disabled={isValidatingExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    <RefreshCw size={13} className={isValidatingExport ? "animate-spin" : ""} />
                    Re-Validate Artifacts
                  </button>
                )}
              </div>

              {exportValidation ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Artifact Status & Format</div>
                      <div className="text-sm font-semibold text-slate-200 capitalize">
                        {exportValidation.artifact_format} ({exportValidation.is_valid ? "Valid" : "Invalid"})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Checkpoint Size</div>
                      <div className="text-sm font-mono text-cyan-400 font-semibold">
                        {(exportValidation.total_size_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      exportValidation.has_weights ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300" : "bg-rose-950/30 border-rose-800/60 text-rose-300"
                    }`}>
                      {exportValidation.has_weights ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      Weights (*.safetensors)
                    </div>
                    <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      exportValidation.has_config_json ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300" : "bg-rose-950/30 border-rose-800/60 text-rose-300"
                    }`}>
                      {exportValidation.has_config_json ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      config.json
                    </div>
                    <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      exportValidation.has_tokenizer ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300" : "bg-rose-950/30 border-rose-800/60 text-rose-300"
                    }`}>
                      {exportValidation.has_tokenizer ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      Tokenizer Files
                    </div>
                  </div>

                  {exportValidation.error && (
                    <div className="p-3 rounded bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                      {exportValidation.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Select a completed job to inspect and validate output weights.</div>
              )}
            </div>

            {/* Ollama Import Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="text-cyan-400" size={18} />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Import into Local Ollama Service
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Target Ollama Model Name</label>
                  <input
                    type="text"
                    value={ollamaModelName}
                    onChange={(e) => setOllamaModelName(e.target.value)}
                    placeholder="e.g. cyberqwen-heretic:4b"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Defensive System Prompt (Embedded in Modelfile)</label>
                  <textarea
                    rows={4}
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    className="w-full p-3 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-y"
                  />
                </div>

                {importSuccess !== null && (
                  <div
                    className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      importSuccess
                        ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                        : "bg-rose-950/40 border border-rose-800 text-rose-300"
                    }`}
                  >
                    {importSuccess ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{importSuccess ? "Model successfully imported into Ollama." : "Import failed. Review logs below."}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Executes <code className="text-cyan-300 font-mono">ollama create {ollamaModelName} -f Modelfile</code>
                  </span>
                  <button
                    onClick={handleImportToOllama}
                    disabled={isImportingOllama}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-950/40 disabled:opacity-50"
                  >
                    <UploadCloud size={15} />
                    {isImportingOllama ? "Creating Ollama Model..." : "Create Ollama Model"}
                  </button>
                </div>

                {importLogs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-xs font-semibold text-slate-300">Import Console Output</div>
                    <pre className="p-3 bg-black/80 rounded text-xs font-mono text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                      {importLogs.join("\n")}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: BENCHMARK EVALUATION */}
        {activeSubTab === "benchmark" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                    Defensive Cybersecurity Benchmark Suite
                  </h2>
                  <p className="text-xs text-slate-400">
                    10 standardized prompts evaluating over-refusal vs technical remediation capability
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {evaluations.length > 0 && (
                    <select
                      value={activeEval?.tested_at || ""}
                      onChange={(e) => {
                        const ev = evaluations.find((item) => item.tested_at === e.target.value);
                        if (ev) setActiveEval(ev);
                      }}
                      className="px-2 py-1.5 text-xs rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                    >
                      {evaluations.map((ev, i) => (
                        <option key={i} value={ev.tested_at}>
                          {ev.model_name} ({new Date(ev.tested_at).toLocaleTimeString()})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={evalTargetModel}
                    onChange={(e) => setEvalTargetModel(e.target.value)}
                    placeholder="Model name"
                    className="px-3 py-1.5 text-xs rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  />
                  <button
                    onClick={handleRunEvaluation}
                    disabled={isRunningEval}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
                  >
                    <Activity size={14} />
                    {isRunningEval ? "Evaluating..." : "Run Benchmark"}
                  </button>
                </div>
              </div>

              {/* Metric Cards */}
              {activeEval && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400">Refusal Rate</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400">
                      {activeEval.refusal_rate.toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {activeEval.refusal_count} of {activeEval.total_prompts} refused
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400">Technical Depth Score</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {activeEval.technical_quality_score.toFixed(1)} / 10.0
                    </div>
                    <div className="text-[11px] text-slate-400">Based on AST code & mitigation</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400">Answered Prompts</div>
                    <div className="text-2xl font-bold font-mono text-blue-400">
                      {activeEval.total_prompts - activeEval.refusal_count}
                    </div>
                    <div className="text-[11px] text-slate-400">Fully explained defensive guidance</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400">Target Model Tested</div>
                    <div className="text-sm font-bold font-mono text-slate-200 truncate mt-1">
                      {activeEval.model_name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(activeEval.tested_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Questions Table */}
              {activeEval && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Prompt Breakdown</h3>
                  <div className="rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-3">ID & Category</th>
                          <th className="p-3">Prompt Preview</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Code Present</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-950">
                        {activeEval.questions_tested.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-900/50">
                            <td className="p-3 font-mono font-medium text-slate-300">
                              <div>{q.id}</div>
                              <div className="text-[10px] text-slate-500 font-sans">{q.category}</div>
                            </td>
                            <td className="p-3 text-slate-300 max-w-sm truncate" title={q.prompt}>
                              {q.prompt}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded uppercase ${
                                q.was_refused
                                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              }`}>
                                {q.was_refused ? "Refused" : "Answered"}
                              </span>
                            </td>
                            <td className="p-3">
                              {q.has_remediation_code ? (
                                <span className="text-cyan-400 font-medium">Yes</span>
                              ) : (
                                <span className="text-slate-500">No</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setSelectedPromptDetail(q)}
                                className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                View Response
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 5: TEST CHAT SANDBOX */}
        {activeSubTab === "chat" && (
          <div className="max-w-4xl mx-auto h-[calc(100vh-14rem)] flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900 text-xs">
              <div className="flex items-center gap-2.5">
                <Bot size={16} className="text-cyan-400" />
                <span className="font-semibold text-slate-200">Model Sandbox:</span>
                <input
                  type="text"
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {onAssignToMentor && (
                <button
                  onClick={() => onAssignToMentor(chatModel)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-sm transition"
                >
                  <Sparkles size={13} />
                  Assign as Active AI Mentor
                </button>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 text-xs ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className="relative group max-w-xl">
                    <div
                      className={`p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-cyan-600 text-white rounded-br-none"
                          : msg.isRefusal
                          ? "bg-rose-950/40 border border-rose-800 text-rose-200 rounded-bl-none"
                          : "bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => copyToClipboard(msg.content, `msg-${idx}`)}
                        className="absolute top-2 right-2 p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition hover:text-white"
                        title="Copy message"
                      >
                        {copiedKey === `msg-${idx}` ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isGeneratingChat && (
                <div className="flex gap-3 text-xs items-center text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0 animate-pulse">
                    <Bot size={14} />
                  </div>
                  <span>Generating response...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask a technical defensive cybersecurity question..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isGeneratingChat || !inputMessage.trim()}
                className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Response Detail Modal */}
      {selectedPromptDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border border-slate-800 bg-slate-900 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="font-semibold text-sm text-slate-200">
                {selectedPromptDetail.id} - {selectedPromptDetail.category}
              </div>
              <button
                onClick={() => setSelectedPromptDetail(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto space-y-3 text-xs font-mono">
              <div className="text-slate-400 font-sans font-semibold">Prompt:</div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-300">
                {selectedPromptDetail.prompt}
              </div>
              <div className="text-slate-400 font-sans font-semibold">Response:</div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-200 whitespace-pre-wrap">
                {selectedPromptDetail.response}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelLabView;
