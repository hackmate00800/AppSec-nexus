use crate::adapters::{AdapterInput, AdapterRegistry};
use crate::db::Database;
use crate::extensions::ExtensionEngine;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, RwLock};
use std::time::Instant;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Pending,
    Running,
    WaitingApproval,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    WaitingApproval,
    Running,
    Completed,
    Failed,
    Skipped,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStepDefinition {
    pub step_id: String,
    pub name: String,
    pub tool_id: String, // "baseline", "httpx", "nuclei", "nmap", "ollama", "docker", "semgrep", "sqlmap" or extension ID
    pub depends_on: Vec<String>,
    pub input_mapping: HashMap<String, String>,
    pub requires_approval: bool,
    pub timeout_seconds: u64,
    pub continue_on_failure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: Vec<String>,
    pub steps: Vec<WorkflowStepDefinition>,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStepRun {
    pub id: String,
    pub job_id: String,
    pub step_id: String,
    pub step_name: String,
    pub tool_id: String,
    pub status: StepStatus,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub duration_ms: u64,
    pub findings_count: usize,
    pub logs: Vec<String>,
    pub error_message: Option<String>,
    pub artifacts: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowJob {
    pub job_id: String,
    pub workflow_id: String,
    pub workflow_name: String,
    pub target_id: String,
    pub target_url: String,
    pub status: JobStatus,
    pub current_step_id: Option<String>,
    pub pending_approval_step: Option<String>,
    pub step_runs: Vec<WorkflowStepRun>,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub duration_ms: u64,
    pub total_findings: usize,
    pub logs: Vec<String>,
}

pub struct ActiveJobController {
    pub cancel_flag: Arc<AtomicBool>,
    pub approve_channel: Arc<tokio::sync::Notify>,
}

pub struct JobManager {
    workflows: Arc<RwLock<HashMap<String, WorkflowDefinition>>>,
    active_jobs: Arc<RwLock<HashMap<String, WorkflowJob>>>,
    job_controllers: Arc<Mutex<HashMap<String, ActiveJobController>>>,
    adapter_registry: Arc<AdapterRegistry>,
    extension_engine: Arc<ExtensionEngine>,
    db: Arc<Database>,
}

impl JobManager {
    pub fn new(
        adapter_registry: Arc<AdapterRegistry>,
        extension_engine: Arc<ExtensionEngine>,
        db: Arc<Database>,
    ) -> Self {
        let mut default_workflows = HashMap::new();

        // 1. Full Attack Surface & Vulnerability Pipeline
        let full_audit = WorkflowDefinition {
            id: "wf_full_audit".to_string(),
            name: "Full Attack Surface & Vulnerability Assessment".to_string(),
            description: "Automated multi-stage reconnaissance: Native security header inspection, httpx service probing, Nuclei vulnerability detection, and Ollama AI remediation synthesis.".to_string(),
            category: "Comprehensive Pentest".to_string(),
            tags: vec!["full-audit".to_string(), "automated".to_string(), "nuclei".to_string(), "ai".to_string()],
            steps: vec![
                WorkflowStepDefinition {
                    step_id: "step_baseline".to_string(),
                    name: "1. Baseline Security & Cookie Audit".to_string(),
                    tool_id: "baseline".to_string(),
                    depends_on: vec![],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 60,
                    continue_on_failure: true,
                },
                WorkflowStepDefinition {
                    step_id: "step_httpx".to_string(),
                    name: "2. HTTP Probing & Tech Fingerprinting".to_string(),
                    tool_id: "httpx".to_string(),
                    depends_on: vec!["step_baseline".to_string()],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 90,
                    continue_on_failure: true,
                },
                WorkflowStepDefinition {
                    step_id: "step_nuclei".to_string(),
                    name: "3. Nuclei Vulnerability Discovery".to_string(),
                    tool_id: "nuclei".to_string(),
                    depends_on: vec!["step_httpx".to_string()],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 180,
                    continue_on_failure: true,
                },
                WorkflowStepDefinition {
                    step_id: "step_ollama".to_string(),
                    name: "4. AI Defensive Remediation Synthesis".to_string(),
                    tool_id: "ollama".to_string(),
                    depends_on: vec!["step_nuclei".to_string()],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 90,
                    continue_on_failure: true,
                },
            ],
            is_builtin: true,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        default_workflows.insert(full_audit.id.clone(), full_audit);

        // 2. Passive Reconnaissance & Security Headers
        let passive_recon = WorkflowDefinition {
            id: "wf_passive_recon".to_string(),
            name: "Passive Reconnaissance & Header Analysis".to_string(),
            description: "Non-intrusive target analysis validating CSP, CORS, HSTS, Secure cookies, and web server technologies.".to_string(),
            category: "Passive Recon".to_string(),
            tags: vec!["passive".to_string(), "headers".to_string(), "stealth".to_string()],
            steps: vec![
                WorkflowStepDefinition {
                    step_id: "step_baseline".to_string(),
                    name: "1. Baseline Headers & Policy Audit".to_string(),
                    tool_id: "baseline".to_string(),
                    depends_on: vec![],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 60,
                    continue_on_failure: false,
                },
                WorkflowStepDefinition {
                    step_id: "step_httpx".to_string(),
                    name: "2. Web Server & Tech Stack Identification".to_string(),
                    tool_id: "httpx".to_string(),
                    depends_on: vec!["step_baseline".to_string()],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 60,
                    continue_on_failure: false,
                },
            ],
            is_builtin: true,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        default_workflows.insert(passive_recon.id.clone(), passive_recon);

        // 3. Network Perimeter & Port Inspection
        let port_perimeter = WorkflowDefinition {
            id: "wf_port_perimeter".to_string(),
            name: "Network Perimeter & Port Inspection".to_string(),
            description: "Performs TCP port discovery across standard web and management ports via Nmap, followed by HTTP service verification.".to_string(),
            category: "Network & Port Audit".to_string(),
            tags: vec!["nmap".to_string(), "ports".to_string(), "infrastructure".to_string()],
            steps: vec![
                WorkflowStepDefinition {
                    step_id: "step_nmap".to_string(),
                    name: "1. Nmap Port & Service Scan".to_string(),
                    tool_id: "nmap".to_string(),
                    depends_on: vec![],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 120,
                    continue_on_failure: false,
                },
                WorkflowStepDefinition {
                    step_id: "step_httpx".to_string(),
                    name: "2. HTTP Service Probing".to_string(),
                    tool_id: "httpx".to_string(),
                    depends_on: vec!["step_nmap".to_string()],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 90,
                    continue_on_failure: true,
                },
            ],
            is_builtin: true,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        default_workflows.insert(port_perimeter.id.clone(), port_perimeter);

        // 4. Controlled Active Vulnerability Assessment (With Approval Gate)
        let controlled_active = WorkflowDefinition {
            id: "wf_controlled_active".to_string(),
            name: "Controlled Active Pentest (With Approval Gate)".to_string(),
            description: "Runs passive discovery, pauses at an explicit human authorization gate, and only executes active Nuclei vulnerability checks upon operator approval.".to_string(),
            category: "Active Audit (Gated)".to_string(),
            tags: vec!["active".to_string(), "approval-gate".to_string(), "governed".to_string()],
            steps: vec![
                WorkflowStepDefinition {
                    step_id: "step_httpx".to_string(),
                    name: "1. Target Fingerprint & Verification".to_string(),
                    tool_id: "httpx".to_string(),
                    depends_on: vec![],
                    input_mapping: HashMap::new(),
                    requires_approval: false,
                    timeout_seconds: 60,
                    continue_on_failure: false,
                },
                WorkflowStepDefinition {
                    step_id: "step_nuclei_active".to_string(),
                    name: "2. Active Nuclei Vulnerability Probe [APPROVAL REQUIRED]".to_string(),
                    tool_id: "nuclei".to_string(),
                    depends_on: vec!["step_httpx".to_string()],
                    input_mapping: HashMap::new(),
                    requires_approval: true,
                    timeout_seconds: 180,
                    continue_on_failure: false,
                },
            ],
            is_builtin: true,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };
        default_workflows.insert(controlled_active.id.clone(), controlled_active);

        Self {
            workflows: Arc::new(RwLock::new(default_workflows)),
            active_jobs: Arc::new(RwLock::new(HashMap::new())),
            job_controllers: Arc::new(Mutex::new(HashMap::new())),
            adapter_registry,
            extension_engine,
            db,
        }
    }

    pub fn get_workflows(&self) -> Vec<WorkflowDefinition> {
        let map = self.workflows.read().unwrap();
        let mut list: Vec<WorkflowDefinition> = map.values().cloned().collect();
        list.sort_by(|a, b| a.name.cmp(&b.name));
        list
    }

    pub fn get_workflow(&self, id: &str) -> Option<WorkflowDefinition> {
        let map = self.workflows.read().unwrap();
        map.get(id).cloned()
    }

    pub fn save_workflow(&self, wf: WorkflowDefinition) -> Result<WorkflowDefinition, String> {
        let mut map = self.workflows.write().unwrap();
        let mut record = wf;
        record.updated_at = Utc::now().to_rfc3339();
        if record.id.is_empty() {
            record.id = format!("wf_{}", Uuid::new_v4().simple());
            record.created_at = Utc::now().to_rfc3339();
            record.is_builtin = false;
        }
        map.insert(record.id.clone(), record.clone());
        Ok(record)
    }

    pub fn delete_workflow(&self, id: &str) -> Result<bool, String> {
        let mut map = self.workflows.write().unwrap();
        if let Some(wf) = map.get(id) {
            if wf.is_builtin {
                return Err("Built-in system workflows cannot be deleted.".to_string());
            }
        }
        Ok(map.remove(id).is_some())
    }

    pub fn get_jobs(&self) -> Vec<WorkflowJob> {
        let map = self.active_jobs.read().unwrap();
        let mut list: Vec<WorkflowJob> = map.values().cloned().collect();
        list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        list
    }

    pub fn get_job(&self, job_id: &str) -> Option<WorkflowJob> {
        let map = self.active_jobs.read().unwrap();
        map.get(job_id).cloned()
    }

    pub fn cancel_job(&self, job_id: &str) -> Result<bool, String> {
        let controllers = self.job_controllers.lock().unwrap();
        if let Some(ctrl) = controllers.get(job_id) {
            ctrl.cancel_flag.store(true, Ordering::SeqCst);
            ctrl.approve_channel.notify_waiters();
        }

        let mut jobs = self.active_jobs.write().unwrap();
        if let Some(job) = jobs.get_mut(job_id) {
            job.status = JobStatus::Cancelled;
            job.finished_at = Some(Utc::now().to_rfc3339());
            job.logs.push("[!] Workflow execution cancelled by operator.".to_string());
            return Ok(true);
        }
        Ok(false)
    }

    pub fn approve_step(&self, job_id: &str, step_id: &str) -> Result<bool, String> {
        let mut jobs = self.active_jobs.write().unwrap();
        let job = jobs
            .get_mut(job_id)
            .ok_or_else(|| format!("Job '{}' not found", job_id))?;

        if job.status != JobStatus::WaitingApproval {
            return Err("Job is not currently waiting for operator approval.".to_string());
        }

        if let Some(ref pending) = job.pending_approval_step {
            if pending != step_id {
                return Err(format!(
                    "Cannot approve step '{}'; pending step is '{}'.",
                    step_id, pending
                ));
            }
        }

        job.status = JobStatus::Running;
        job.pending_approval_step = None;
        job.logs.push(format!("[+] Operator approval granted for step '{}'. Resuming pipeline.", step_id));

        let controllers = self.job_controllers.lock().unwrap();
        if let Some(ctrl) = controllers.get(job_id) {
            ctrl.approve_channel.notify_waiters();
        }

        Ok(true)
    }

    pub async fn start_job(
        self: Arc<Self>,
        workflow_id: &str,
        target_id: &str,
        target_url: &str,
    ) -> Result<WorkflowJob, String> {
        let wf = self
            .get_workflow(workflow_id)
            .ok_or_else(|| format!("Workflow '{}' not found", workflow_id))?;

        let job_id = format!("job_{}", Uuid::new_v4().simple());
        let cancel_flag = Arc::new(AtomicBool::new(false));
        let approve_channel = Arc::new(tokio::sync::Notify::new());

        let mut step_runs = Vec::new();
        for step in &wf.steps {
            step_runs.push(WorkflowStepRun {
                id: format!("step_run_{}", Uuid::new_v4().simple()),
                job_id: job_id.clone(),
                step_id: step.step_id.clone(),
                step_name: step.name.clone(),
                tool_id: step.tool_id.clone(),
                status: StepStatus::Pending,
                started_at: None,
                finished_at: None,
                duration_ms: 0,
                findings_count: 0,
                logs: Vec::new(),
                error_message: None,
                artifacts: HashMap::new(),
            });
        }

        let job = WorkflowJob {
            job_id: job_id.clone(),
            workflow_id: wf.id.clone(),
            workflow_name: wf.name.clone(),
            target_id: target_id.to_string(),
            target_url: target_url.to_string(),
            status: JobStatus::Running,
            current_step_id: None,
            pending_approval_step: None,
            step_runs,
            started_at: Utc::now().to_rfc3339(),
            finished_at: None,
            duration_ms: 0,
            total_findings: 0,
            logs: vec![format!(
                "[*] Workflow '{}' initiated against target {}",
                wf.name, target_url
            )],
        };

        {
            let mut active = self.active_jobs.write().unwrap();
            active.insert(job_id.clone(), job.clone());

            let mut controllers = self.job_controllers.lock().unwrap();
            controllers.insert(
                job_id.clone(),
                ActiveJobController {
                    cancel_flag: cancel_flag.clone(),
                    approve_channel: approve_channel.clone(),
                },
            );
        }

        // Spawn background orchestration task
        let manager_clone = self.clone();
        let target_url_str = target_url.to_string();
        let target_id_str = target_id.to_string();

        tokio::spawn(async move {
            manager_clone
                .run_orchestration_loop(
                    job_id,
                    wf,
                    target_id_str,
                    target_url_str,
                    cancel_flag,
                    approve_channel,
                )
                .await;
        });

        Ok(job)
    }

    async fn run_orchestration_loop(
        &self,
        job_id: String,
        wf: WorkflowDefinition,
        target_id: String,
        target_url: String,
        cancel_flag: Arc<AtomicBool>,
        approve_channel: Arc<tokio::sync::Notify>,
    ) {
        let job_start = Instant::now();
        let mut job_artifacts: HashMap<String, String> = HashMap::new();
        job_artifacts.insert("target_url".to_string(), target_url.clone());
        job_artifacts.insert("target_id".to_string(), target_id.clone());

        for step in wf.steps {
            // Check cancellation
            if cancel_flag.load(Ordering::SeqCst) {
                let mut jobs = self.active_jobs.write().unwrap();
                if let Some(j) = jobs.get_mut(&job_id) {
                    j.status = JobStatus::Cancelled;
                    j.finished_at = Some(Utc::now().to_rfc3339());
                    j.duration_ms = job_start.elapsed().as_millis() as u64;
                    j.logs.push("[!] Pipeline stopped due to cancellation.".to_string());
                }
                return;
            }

            // Check approval gate
            if step.requires_approval {
                {
                    let mut jobs = self.active_jobs.write().unwrap();
                    if let Some(j) = jobs.get_mut(&job_id) {
                        j.status = JobStatus::WaitingApproval;
                        j.current_step_id = Some(step.step_id.clone());
                        j.pending_approval_step = Some(step.step_id.clone());
                        j.logs.push(format!(
                            "[!] Approval Gate: Step '{}' requires operator authorization before proceeding.",
                            step.name
                        ));

                        if let Some(step_run) = j.step_runs.iter_mut().find(|s| s.step_id == step.step_id) {
                            step_run.status = StepStatus::WaitingApproval;
                        }
                    }
                }

                // Wait for approval signal or cancellation
                loop {
                    approve_channel.notified().await;
                    if cancel_flag.load(Ordering::SeqCst) {
                        let mut jobs = self.active_jobs.write().unwrap();
                        if let Some(j) = jobs.get_mut(&job_id) {
                            j.status = JobStatus::Cancelled;
                            j.finished_at = Some(Utc::now().to_rfc3339());
                            j.duration_ms = job_start.elapsed().as_millis() as u64;
                        }
                        return;
                    }

                    let jobs = self.active_jobs.read().unwrap();
                    if let Some(j) = jobs.get(&job_id) {
                        if j.status == JobStatus::Running && j.pending_approval_step.is_none() {
                            break;
                        }
                    }
                }
            }

            // Mark step running
            let step_start = Instant::now();
            {
                let mut jobs = self.active_jobs.write().unwrap();
                if let Some(j) = jobs.get_mut(&job_id) {
                    j.current_step_id = Some(step.step_id.clone());
                    j.logs.push(format!("[*] Starting step: {}", step.name));

                    if let Some(step_run) = j.step_runs.iter_mut().find(|s| s.step_id == step.step_id) {
                        step_run.status = StepStatus::Running;
                        step_run.started_at = Some(Utc::now().to_rfc3339());
                    }
                }
            }

            // Prepare piped inputs
            let mut step_params = HashMap::new();
            for (k, v) in &step.input_mapping {
                let resolved = if v.starts_with("{{") && v.ends_with("}}") {
                    let key = v.trim_start_matches("{{").trim_end_matches("}}").trim();
                    job_artifacts.get(key).cloned().unwrap_or_default()
                } else {
                    v.clone()
                };
                step_params.insert(k.clone(), resolved);
            }

            let input = AdapterInput {
                target_id: target_id.clone(),
                target_url: target_url.clone(),
                parameters: step_params,
                timeout_seconds: Some(step.timeout_seconds),
            };

            // Execute via AdapterRegistry or ExtensionEngine
            let step_result = if self.adapter_registry.get_adapter(&step.tool_id).is_some() {
                self.adapter_registry.execute(&step.tool_id, input).await
            } else {
                // Try extension
                let ext_input = crate::extensions::ExtensionExecutionInput {
                    target_id: target_id.clone(),
                    target_url: target_url.clone(),
                    parameters: HashMap::new(),
                    timeout_seconds: Some(step.timeout_seconds),
                };
                match self.extension_engine.execute(&step.tool_id, ext_input).await {
                    Ok(ext_out) => Ok(crate::adapters::AdapterOutput {
                        tool_id: step.tool_id.clone(),
                        target_url: target_url.clone(),
                        status: ext_out.status,
                        logs: ext_out.logs,
                        findings: ext_out.findings,
                        endpoints: Vec::new(),
                        artifacts: ext_out.artifacts,
                        duration_ms: ext_out.duration_ms,
                    }),
                    Err(e) => Err(e),
                }
            };

            let step_duration = step_start.elapsed().as_millis() as u64;

            // Handle step result
            match step_result {
                Ok(output) => {
                    // Pipe findings to database
                    for finding in &output.findings {
                        let _ = self.db.insert_finding(finding);
                    }
                    // Pipe endpoints to database
                    for ep in &output.endpoints {
                        let _ = self.db.insert_endpoint(ep);
                    }

                    // Accumulate artifacts for downstream steps
                    for (k, v) in output.artifacts.clone() {
                        job_artifacts.insert(format!("{}.{}", step.step_id, k), v.clone());
                        job_artifacts.insert(k, v);
                    }

                    let mut jobs = self.active_jobs.write().unwrap();
                    if let Some(j) = jobs.get_mut(&job_id) {
                        j.total_findings += output.findings.len();
                        j.logs.push(format!(
                            "[+] Step '{}' completed in {} ms ({} findings).",
                            step.name,
                            step_duration,
                            output.findings.len()
                        ));

                        if let Some(step_run) = j.step_runs.iter_mut().find(|s| s.step_id == step.step_id) {
                            step_run.status = StepStatus::Completed;
                            step_run.finished_at = Some(Utc::now().to_rfc3339());
                            step_run.duration_ms = step_duration;
                            step_run.findings_count = output.findings.len();
                            step_run.logs = output.logs;
                            step_run.artifacts = output.artifacts;
                        }
                    }
                }
                Err(err) => {
                    let mut jobs = self.active_jobs.write().unwrap();
                    if let Some(j) = jobs.get_mut(&job_id) {
                        j.logs.push(format!("[-] Step '{}' failed: {}", step.name, err));

                        if let Some(step_run) = j.step_runs.iter_mut().find(|s| s.step_id == step.step_id) {
                            step_run.status = StepStatus::Failed;
                            step_run.finished_at = Some(Utc::now().to_rfc3339());
                            step_run.duration_ms = step_duration;
                            step_run.error_message = Some(err.clone());
                        }

                        if !step.continue_on_failure {
                            j.status = JobStatus::Failed;
                            j.finished_at = Some(Utc::now().to_rfc3339());
                            j.duration_ms = job_start.elapsed().as_millis() as u64;
                            j.logs.push("[!] Workflow terminated due to step failure.".to_string());
                            return;
                        }
                    }
                }
            }
        }

        // Workflow completed successfully
        let mut jobs = self.active_jobs.write().unwrap();
        if let Some(j) = jobs.get_mut(&job_id) {
            j.status = JobStatus::Completed;
            j.current_step_id = None;
            j.finished_at = Some(Utc::now().to_rfc3339());
            j.duration_ms = job_start.elapsed().as_millis() as u64;
            j.logs.push(format!(
                "[+] Workflow finished successfully in {} ms. Total findings: {}",
                j.duration_ms, j.total_findings
            ));
        }

        // Clean up controller
        let mut controllers = self.job_controllers.lock().unwrap();
        controllers.remove(&job_id);
    }
}
