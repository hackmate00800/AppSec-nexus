pub mod evaluator;
pub mod export;
pub mod hardware;
pub mod jobs;
pub mod types;

use crate::heretic::types::{
    ExportValidationResult, HardwareDiagnosticReport, HereticJobConfig, HereticJobLog,
    HereticJobRecord, ModelEvaluationResult, OllamaImportParams, OllamaImportResult,
};
pub use jobs::HereticJobSupervisor;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, State};

/// Detect host hardware, GPU, VRAM, RAM, disk, Python, PyTorch, WSL, and Heretic installation status.
#[tauri::command]
pub async fn detect_heretic_hardware() -> Result<HardwareDiagnosticReport, String> {
    Ok(hardware::detect_hardware().await)
}

/// Helper command to install / configure Heretic environment via pip.
#[tauri::command]
pub async fn setup_heretic_environment(use_wsl: bool) -> Result<String, String> {
    hardware::install_or_update_heretic(use_wsl).await
}

/// Starts an abliteration optimization job supervised in the background.
#[tauri::command]
pub async fn start_heretic_job(
    app: AppHandle,
    state: State<'_, crate::AppState>,
    config: HereticJobConfig,
) -> Result<HereticJobRecord, String> {
    state
        .heretic_supervisor
        .start_job(app, Arc::clone(&state.db), config)
        .await
}

/// Lists all historical Heretic jobs.
#[tauri::command]
pub fn get_heretic_jobs(
    state: State<'_, crate::AppState>,
) -> Result<Vec<HereticJobRecord>, String> {
    state.db.get_heretic_jobs().map_err(|e| e.to_string())
}

/// Retrieves terminal logs for a specific job.
#[tauri::command]
pub fn get_heretic_job_logs(
    state: State<'_, crate::AppState>,
    job_id: String,
    limit: Option<usize>,
) -> Result<Vec<HereticJobLog>, String> {
    state
        .db
        .get_heretic_job_logs(&job_id, limit)
        .map_err(|e| e.to_string())
}

/// Cancels a running Heretic job.
#[tauri::command]
pub fn cancel_heretic_job(
    state: State<'_, crate::AppState>,
    job_id: String,
) -> Result<(), String> {
    state
        .heretic_supervisor
        .cancel_job(Arc::clone(&state.db), &job_id)
}

/// Validates an exported directory containing Safetensors and configuration files.
#[tauri::command]
pub fn validate_heretic_export(output_dir: String) -> Result<ExportValidationResult, String> {
    Ok(export::validate_export_dir(PathBuf::from(output_dir)))
}

/// Generates a Modelfile and creates an Ollama model using `ollama create`.
#[tauri::command]
pub fn import_heretic_to_ollama(
    state: State<'_, crate::AppState>,
    params: OllamaImportParams,
) -> Result<OllamaImportResult, String> {
    let job = state
        .db
        .get_heretic_job(&params.job_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Heretic job '{}' not found", params.job_id))?;

    let res = export::import_model_to_ollama(PathBuf::from(&job.output_path).as_path(), &params)?;
    if res.success {
        let mut updated = job;
        updated.ollama_model_name = Some(params.model_name.clone());
        let _ = state.db.update_heretic_job(&updated);
    }
    Ok(res)
}

/// Runs the 10-prompt defensive cybersecurity benchmark against a local Ollama model.
#[tauri::command]
pub async fn run_heretic_evaluation(
    state: State<'_, crate::AppState>,
    ollama_url: Option<String>,
    model_name: String,
    job_id: String,
) -> Result<ModelEvaluationResult, String> {
    let url = ollama_url.unwrap_or_else(|| "http://127.0.0.1:11434".to_string());
    let eval_res = evaluator::run_benchmark(&url, &model_name, &job_id).await?;
    let _ = state.db.insert_heretic_evaluation(&eval_res);
    Ok(eval_res)
}

/// Retrieves saved benchmark evaluations.
#[tauri::command]
pub fn get_heretic_evaluations(
    state: State<'_, crate::AppState>,
    model_name: Option<String>,
) -> Result<Vec<ModelEvaluationResult>, String> {
    state
        .db
        .get_heretic_evaluations(model_name.as_deref())
        .map_err(|e| e.to_string())
}
