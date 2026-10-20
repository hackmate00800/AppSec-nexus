use crate::db::Database;
use crate::heretic::export::validate_export_dir;
use crate::heretic::types::{
    HereticJobConfig, HereticJobLog, HereticJobRecord, HereticJobStage, HereticJobStatus,
};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Default, Clone)]
pub struct HereticJobSupervisor {
    // Maps job_id -> process ID (u32)
    active_pids: Arc<Mutex<HashMap<String, u32>>>,
}

impl HereticJobSupervisor {
    pub fn new() -> Self {
        Self {
            active_pids: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawns a background Heretic abliteration optimization job.
    pub async fn start_job(
        &self,
        app: AppHandle,
        db: Arc<Database>,
        mut config: HereticJobConfig,
    ) -> Result<HereticJobRecord, String> {
        let job_id = uuid::Uuid::new_v4().to_string();

        // Default output path if not provided
        if config.output_dir.trim().is_empty() {
            let app_data = std::env::var("LOCALAPPDATA")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let base = app_data.join("AppSecNexus").join("heretic_models").join(&job_id);
            config.output_dir = base.to_string_lossy().to_string();
        }

        let now = chrono::Utc::now().to_rfc3339();
        let initial_record = HereticJobRecord {
            id: job_id.clone(),
            source_model: config.source_model.clone(),
            output_path: config.output_dir.clone(),
            status: HereticJobStatus::Running,
            stage: HereticJobStage::PreflightCheck,
            execution_mode: config.execution_mode.clone(),
            config: config.clone(),
            created_at: now.clone(),
            started_at: Some(now),
            completed_at: None,
            duration_ms: 0,
            error_message: None,
            ollama_model_name: None,
            exported_files: Vec::new(),
        };

        if let Err(e) = db.insert_heretic_job(&initial_record) {
            return Err(format!("Failed to record job in database: {}", e));
        }

        let _ = app.emit("heretic:job_updated", &initial_record);

        // Spawn async background supervisor
        let active_pids_clone = Arc::clone(&self.active_pids);
        let supervisor = self.clone();
        let record_clone = initial_record.clone();

        tokio::spawn(async move {
            supervisor
                .run_job_process(app, db, record_clone, active_pids_clone)
                .await;
        });

        Ok(initial_record)
    }

    async fn run_job_process(
        &self,
        app: AppHandle,
        db: Arc<Database>,
        mut record: HereticJobRecord,
        active_pids: Arc<Mutex<HashMap<String, u32>>>,
    ) {
        let job_id = record.id.clone();
        let start_time = Instant::now();

        // Make sure output directory exists
        if let Err(e) = std::fs::create_dir_all(&record.output_path) {
            record.status = HereticJobStatus::Failed;
            record.error_message = Some(format!("Failed to create output directory: {}", e));
            let _ = db.update_heretic_job(&record);
            let _ = app.emit("heretic:job_updated", &record);
            return;
        }

        // Advance to preparing model stage
        record.stage = HereticJobStage::PreparingModel;
        let _ = db.update_heretic_job(&record);
        let _ = app.emit("heretic:job_updated", &record);

        // Build command
        let mut cmd = if record.execution_mode == "wsl" {
            let mut c = Command::new("wsl");
            c.arg("python3").arg("-m").arg("heretic");
            c
        } else {
            // Windows native: prefer `python -m heretic`, or `heretic`
            let mut c = Command::new("python");
            c.arg("-m").arg("heretic");
            c
        };

        cmd.arg("--model").arg(&record.config.source_model);
        cmd.arg("--output-dir").arg(&record.output_path);

        if !record.config.quantization.is_empty() && record.config.quantization != "none" {
            cmd.arg("--quantization").arg(&record.config.quantization);
        }

        cmd.arg("--device-map").arg(&record.config.device_map);
        cmd.arg("--n-trials").arg(record.config.n_trials.to_string());

        if record.config.skip_optimization {
            cmd.arg("--skip-optimization");
        }

        if let Some(w) = record.config.max_weight {
            cmd.arg("--max-weight").arg(w.to_string());
        }

        if let Some(d) = record.config.direction_index {
            cmd.arg("--direction-index").arg(d.to_string());
        }

        if let Some(ref toml_path) = record.config.custom_config_toml {
            cmd.arg("--config").arg(toml_path);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                record.status = HereticJobStatus::Failed;
                record.error_message = Some(format!(
                    "Failed to launch Heretic process. Verify Python and heretic are installed: {}",
                    e
                ));
                record.completed_at = Some(chrono::Utc::now().to_rfc3339());
                record.duration_ms = start_time.elapsed().as_millis() as u64;
                let _ = db.update_heretic_job(&record);
                let _ = app.emit("heretic:job_updated", &record);
                return;
            }
        };

        if let Some(pid) = child.id() {
            let mut pids = active_pids.lock().unwrap();
            pids.insert(job_id.clone(), pid);
        }

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let stdout_handle = {
            let db = Arc::clone(&db);
            let app = app.clone();
            let job_id = job_id.clone();
            tokio::spawn(async move {
                if let Some(out) = stdout {
                    let mut reader = BufReader::new(out).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        let now = chrono::Utc::now().to_rfc3339();
                        let _ = db.insert_heretic_job_log(&job_id, &line, &now);
                        let _ = app.emit(
                            "heretic:log",
                            HereticJobLog {
                                id: 0,
                                job_id: job_id.clone(),
                                line,
                                timestamp: now,
                            },
                        );
                    }
                }
            })
        };

        let stderr_handle = {
            let db = Arc::clone(&db);
            let app = app.clone();
            let job_id = job_id.clone();
            tokio::spawn(async move {
                if let Some(err) = stderr {
                    let mut reader = BufReader::new(err).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        let now = chrono::Utc::now().to_rfc3339();
                        let _ = db.insert_heretic_job_log(&job_id, &line, &now);
                        let _ = app.emit(
                            "heretic:log",
                            HereticJobLog {
                                id: 0,
                                job_id: job_id.clone(),
                                line,
                                timestamp: now,
                            },
                        );
                    }
                }
            })
        };

        // Transition to abliteration stage as processing begins
        record.stage = HereticJobStage::AbliterationOptimization;
        let _ = db.update_heretic_job(&record);
        let _ = app.emit("heretic:job_updated", &record);

        let status = child.wait().await;

        let _ = stdout_handle.await;
        let _ = stderr_handle.await;

        {
            let mut pids = active_pids.lock().unwrap();
            pids.remove(&job_id);
        }

        record.completed_at = Some(chrono::Utc::now().to_rfc3339());
        record.duration_ms = start_time.elapsed().as_millis() as u64;

        // Check if database status was set to Cancelled by user
        if let Ok(Some(current)) = db.get_heretic_job(&job_id) {
            if current.status == HereticJobStatus::Cancelled {
                return;
            }
        }

        match status {
            Ok(exit_status) if exit_status.success() => {
                record.stage = HereticJobStage::ValidatingArtifacts;
                let _ = db.update_heretic_job(&record);
                let _ = app.emit("heretic:job_updated", &record);

                let validation = validate_export_dir(&record.output_path);
                if validation.is_valid {
                    record.status = HereticJobStatus::Completed;
                    record.stage = HereticJobStage::ReadyForOllama;
                    record.exported_files = validation.files_found;
                    record.error_message = None;
                } else {
                    record.status = HereticJobStatus::Failed;
                    record.error_message = Some(format!(
                        "Optimization completed but artifact validation failed: {}",
                        validation.error.unwrap_or_else(|| "Unknown artifact error".to_string())
                    ));
                }
            }
            Ok(exit_status) => {
                record.status = HereticJobStatus::Failed;
                record.error_message = Some(format!(
                    "Heretic process exited with failure code {:?}",
                    exit_status.code()
                ));
            }
            Err(e) => {
                record.status = HereticJobStatus::Failed;
                record.error_message = Some(format!("Heretic child process error: {}", e));
            }
        }

        let _ = db.update_heretic_job(&record);
        let _ = app.emit("heretic:job_updated", &record);
    }

    /// Safely terminates a running Heretic job.
    pub fn cancel_job(&self, db: Arc<Database>, job_id: &str) -> Result<(), String> {
        let mut pids = self.active_pids.lock().unwrap();
        if let Some(pid) = pids.remove(job_id) {
            #[cfg(target_os = "windows")]
            {
                let mut cmd = std::process::Command::new("taskkill");
                cmd.args(["/PID", &pid.to_string(), "/T", "/F"]);
                let _ = cmd.output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("kill")
                    .args(["-9", &pid.to_string()])
                    .output();
            }
        }

        if let Ok(Some(mut job)) = db.get_heretic_job(job_id) {
            job.status = HereticJobStatus::Cancelled;
            job.completed_at = Some(chrono::Utc::now().to_rfc3339());
            job.error_message = Some("Job was cancelled by user.".to_string());
            let _ = db.update_heretic_job(&job);
        }

        Ok(())
    }
}
