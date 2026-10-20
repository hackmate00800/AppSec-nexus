use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CompatibilityLevel {
    Supported,
    SupportedWithWarnings,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareDiagnosticReport {
    pub os: String,
    pub gpu_name: String,
    pub gpu_vram_mb: u64,
    pub cuda_available: bool,
    pub ram_total_mb: u64,
    pub ram_avail_mb: u64,
    pub disk_total_gb: f64,
    pub disk_free_gb: f64,
    pub python_version: Option<String>,
    pub python_path: Option<String>,
    pub pytorch_version: Option<String>,
    pub wsl_installed: bool,
    pub wsl_distro: Option<String>,
    pub wsl_python_version: Option<String>,
    pub heretic_installed: bool,
    pub heretic_version: Option<String>,
    pub compatibility_level: CompatibilityLevel,
    pub warnings: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HereticJobConfig {
    pub source_model: String,
    pub output_dir: String,
    pub quantization: String,   // "none", "bnb_4bit", "bnb_8bit"
    pub device_map: String,     // "auto", "cpu", "cuda"
    pub n_trials: u32,
    pub max_weight: Option<f32>,
    pub direction_index: Option<f32>,
    pub skip_optimization: bool,
    pub execution_mode: String, // "native", "wsl"
    pub custom_config_toml: Option<String>,
}

impl Default for HereticJobConfig {
    fn default() -> Self {
        Self {
            source_model: "Qwen/Qwen3-4B-Instruct-2507".to_string(),
            output_dir: String::new(),
            quantization: "bnb_4bit".to_string(),
            device_map: "auto".to_string(),
            n_trials: 50,
            max_weight: None,
            direction_index: None,
            skip_optimization: false,
            execution_mode: "native".to_string(),
            custom_config_toml: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HereticJobStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HereticJobStage {
    PreflightCheck,
    EnvironmentSetup,
    PreparingModel,
    AbliterationOptimization,
    ExportingWeights,
    ValidatingArtifacts,
    ReadyForOllama,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HereticJobRecord {
    pub id: String,
    pub source_model: String,
    pub output_path: String,
    pub status: HereticJobStatus,
    pub stage: HereticJobStage,
    pub execution_mode: String,
    pub config: HereticJobConfig,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_ms: u64,
    pub error_message: Option<String>,
    pub ollama_model_name: Option<String>,
    pub exported_files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportValidationResult {
    pub is_valid: bool,
    pub artifact_format: String, // "safetensors", "gguf", "unknown"
    pub total_size_bytes: u64,
    pub files_found: Vec<String>,
    pub missing_files: Vec<String>,
    pub has_config_json: bool,
    pub has_tokenizer: bool,
    pub has_weights: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaImportParams {
    pub job_id: String,
    pub model_name: String,
    pub custom_system_prompt: Option<String>,
    pub context_size: Option<u32>,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaImportResult {
    pub success: bool,
    pub model_name: String,
    pub modelfile_path: String,
    pub logs: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HereticJobLog {
    pub id: i64,
    pub job_id: String,
    pub line: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEvaluationQuestion {
    pub id: String,
    pub category: String,
    pub prompt: String,
    pub expected_behavior: String,
    pub refusal_prohibited: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluatedPromptDetail {
    pub id: String,
    pub category: String,
    pub prompt: String,
    pub response: String,
    pub was_refused: bool,
    pub has_remediation_code: bool,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEvaluationResult {
    pub job_id: String,
    pub model_name: String,
    pub tested_at: String,
    pub total_prompts: usize,
    pub refusal_count: usize,
    pub refusal_rate: f32,
    pub technical_quality_score: f32,
    pub questions_tested: Vec<EvaluatedPromptDetail>,
}
