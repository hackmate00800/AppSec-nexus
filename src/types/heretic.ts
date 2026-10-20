export type CompatibilityLevel = "supported" | "supported_with_warnings" | "blocked";

export interface HardwareDiagnosticReport {
  os: string;
  gpu_name: string;
  gpu_vram_mb: number;
  cuda_available: boolean;
  ram_total_mb: number;
  ram_avail_mb: number;
  disk_total_gb: number;
  disk_free_gb: number;
  python_version?: string;
  python_path?: string;
  pytorch_version?: string;
  wsl_installed: boolean;
  wsl_distro?: string;
  wsl_python_version?: string;
  heretic_installed: boolean;
  heretic_version?: string;
  compatibility_level: CompatibilityLevel;
  warnings: string[];
  recommendations: string[];
}

export interface HereticJobConfig {
  source_model: string;
  output_dir: string;
  quantization: string;   // "none" | "bnb_4bit" | "bnb_8bit"
  device_map: string;     // "auto" | "cpu" | "cuda"
  n_trials: number;
  max_weight?: number;
  direction_index?: number;
  skip_optimization: boolean;
  execution_mode: string; // "native" | "wsl"
  custom_config_toml?: string;
}

export type HereticJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type HereticJobStage =
  | "preflight_check"
  | "environment_setup"
  | "preparing_model"
  | "abliteration_optimization"
  | "exporting_weights"
  | "validating_artifacts"
  | "ready_for_ollama";

export interface HereticJobRecord {
  id: string;
  source_model: string;
  output_path: string;
  status: HereticJobStatus;
  stage: HereticJobStage;
  execution_mode: string;
  config: HereticJobConfig;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms: number;
  error_message?: string;
  ollama_model_name?: string;
  exported_files: string[];
}

export interface HereticJobLog {
  id: number;
  job_id: string;
  line: string;
  timestamp: string;
}

export interface ExportValidationResult {
  is_valid: boolean;
  artifact_format: string;
  total_size_bytes: number;
  files_found: string[];
  missing_files: string[];
  has_config_json: boolean;
  has_tokenizer: boolean;
  has_weights: boolean;
  error?: string;
}

export interface OllamaImportParams {
  job_id: string;
  model_name: string;
  custom_system_prompt?: string;
  context_size?: number;
  temperature?: number;
}

export interface OllamaImportResult {
  success: boolean;
  model_name: string;
  modelfile_path: string;
  logs: string[];
  error?: string;
}

export interface EvaluatedPromptDetail {
  id: string;
  category: string;
  prompt: string;
  response: string;
  was_refused: boolean;
  has_remediation_code: boolean;
  duration_ms: number;
}

export interface ModelEvaluationResult {
  job_id: string;
  model_name: string;
  tested_at: string;
  total_prompts: number;
  refusal_count: number;
  refusal_rate: number;
  technical_quality_score: number;
  questions_tested: EvaluatedPromptDetail[];
}
