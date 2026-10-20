import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  HardwareDiagnosticReport,
  HereticJobConfig,
  HereticJobRecord,
  HereticJobLog,
  ExportValidationResult,
  OllamaImportParams,
  OllamaImportResult,
  ModelEvaluationResult,
} from "../types/heretic";

export const hereticService = {
  async detectHardware(): Promise<HardwareDiagnosticReport> {
    if (!isTauri()) {
      return {
        os: "Windows 11 (x64) [Web Simulator]",
        gpu_name: "Intel(R) Iris(R) Xe Graphics (Simulated)",
        gpu_vram_mb: 1024,
        cuda_available: false,
        ram_total_mb: 16000,
        ram_avail_mb: 7500,
        disk_total_gb: 250,
        disk_free_gb: 98.5,
        python_version: "Python 3.12.3",
        python_path: "C:\\Python312\\python.exe",
        pytorch_version: "2.5.1+cpu",
        wsl_installed: true,
        wsl_distro: "Ubuntu (WSL2)",
        wsl_python_version: "Python 3.12.3",
        heretic_installed: false,
        heretic_version: undefined,
        compatibility_level: "supported_with_warnings",
        warnings: [
          "Integrated Graphics Detected: NVIDIA CUDA acceleration is not active. Heretic will run using CPU tensors and CPU offload.",
        ],
        recommendations: [
          "WSL2 Ubuntu detected. If native Windows dependency builds fail, execution mode 'wsl' provides full Linux PyTorch and bitsandbytes compatibility.",
          "Keep trial count lower (e.g. 20–50 trials) when running on CPU without dedicated CUDA.",
        ],
      };
    }
    return invoke<HardwareDiagnosticReport>("detect_heretic_hardware");
  },

  async setupEnvironment(useWsl: boolean = false): Promise<string> {
    if (!isTauri()) {
      return "Simulated environment setup completed.";
    }
    return invoke<string>("setup_heretic_environment", { useWsl });
  },

  async startJob(config: HereticJobConfig): Promise<HereticJobRecord> {
    if (!isTauri()) {
      return {
        id: "sim-" + Date.now(),
        source_model: config.source_model,
        output_path: config.output_dir || "C:\\AppSecNexus\\heretic_models\\sim",
        status: "running",
        stage: "abliteration_optimization",
        execution_mode: config.execution_mode,
        config,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        duration_ms: 0,
        exported_files: [],
      };
    }
    return invoke<HereticJobRecord>("start_heretic_job", { config });
  },

  async getJobs(): Promise<HereticJobRecord[]> {
    if (!isTauri()) return [];
    return invoke<HereticJobRecord[]>("get_heretic_jobs");
  },

  async getJobLogs(jobId: string, limit: number = 2000): Promise<HereticJobLog[]> {
    if (!isTauri()) return [];
    return invoke<HereticJobLog[]>("get_heretic_job_logs", { jobId, limit });
  },

  async cancelJob(jobId: string): Promise<void> {
    if (!isTauri()) return;
    return invoke<void>("cancel_heretic_job", { jobId });
  },

  async validateExport(outputDir: string): Promise<ExportValidationResult> {
    if (!isTauri()) {
      return {
        is_valid: true,
        artifact_format: "safetensors",
        total_size_bytes: 4294967296,
        files_found: ["model.safetensors (4096 MB)", "config.json (0.01 MB)", "tokenizer.json (1.2 MB)"],
        missing_files: [],
        has_config_json: true,
        has_tokenizer: true,
        has_weights: true,
      };
    }
    return invoke<ExportValidationResult>("validate_heretic_export", { outputDir });
  },

  async importToOllama(params: OllamaImportParams): Promise<OllamaImportResult> {
    if (!isTauri()) {
      return {
        success: true,
        model_name: params.model_name,
        modelfile_path: "Modelfile",
        logs: ["transferring model data", "creating model layer", "writing manifest", "success"],
      };
    }
    return invoke<OllamaImportResult>("import_heretic_to_ollama", { params });
  },

  async runEvaluation(
    modelName: string,
    jobId: string,
    ollamaUrl?: string
  ): Promise<ModelEvaluationResult> {
    if (!isTauri()) {
      return {
        job_id: jobId,
        model_name: modelName,
        tested_at: new Date().toISOString(),
        total_prompts: 10,
        refusal_count: 0,
        refusal_rate: 0.0,
        technical_quality_score: 9.2,
        questions_tested: [],
      };
    }
    return invoke<ModelEvaluationResult>("run_heretic_evaluation", {
      modelName,
      jobId,
      ollamaUrl,
    });
  },

  async getEvaluations(modelName?: string): Promise<ModelEvaluationResult[]> {
    if (!isTauri()) return [];
    return invoke<ModelEvaluationResult[]>("get_heretic_evaluations", { modelName });
  },

  onLog(callback: (log: HereticJobLog) => void): Promise<UnlistenFn> {
    return listen<HereticJobLog>("heretic:log", (event) => {
      callback(event.payload);
    });
  },

  onJobUpdated(callback: (job: HereticJobRecord) => void): Promise<UnlistenFn> {
    return listen<HereticJobRecord>("heretic:job_updated", (event) => {
      callback(event.payload);
    });
  },
};
