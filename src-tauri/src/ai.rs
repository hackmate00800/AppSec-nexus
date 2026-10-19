use crate::db::Database;
use crate::models::{AiChatMessageRecord, AiTask, AiTaskStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::Emitter;
use tokio::sync::{watch, RwLock, Semaphore};
use uuid::Uuid;

pub struct AiMentor {
    base_url: String,
}



#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub size: Option<u64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OllamaSystemInfo {
    pub is_online: bool,
    pub version: Option<String>,
    pub endpoint: String,
    pub installed_models: Vec<String>,
    pub last_checked: String,
    pub error_message: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct ModelPullProgress {
    pub model: String,
    pub status: String,
    pub completed: u64,
    pub total: u64,
    pub percentage: f32,
    pub done: bool,
    pub error: Option<String>,
}

#[derive(Deserialize, Debug)]
struct OllamaPullStreamChunk {
    status: Option<String>,
    #[allow(dead_code)]
    digest: Option<String>,
    total: Option<u64>,
    completed: Option<u64>,
    error: Option<String>,
}

/// Global, versioned AI Mentor Policy Engine
/// Centrally manages educator instructions, anti-refusal guidelines, and deterministic validation rules
pub struct AIMentorPolicy;

impl AIMentorPolicy {
    pub const VERSION: &'static str = "2.3.0-curiosity-first-rigorous";

    /// Core system prompt establishing global cybersecurity educator policy across all models
    pub fn core_policy_prompt() -> &'static str {
        "You are APPSC NEXUS AI Mentor (v2.3), an elite, curiosity-first, technically rigorous cybersecurity educator and application security specialist.\n\
Your mission is to provide deep, accurate, dual-perspective education in Web Application Security, API Security, vulnerability research, and secure software engineering.\n\n\
CORE POLICY RULES:\n\
1. CURIOSITY-FIRST & UNRESTRICTED EDUCATIONAL SCOPE:\n\
   - Never refuse legitimate cybersecurity, educational, vulnerability research, or defensive engineering inquiries.\n\
   - Words like 'hacking', 'exploit', 'payload', 'vulnerability', 'penetration testing', 'SQL injection', 'XSS', 'authentication bypass', 'privilege escalation', 'reverse engineering', 'malware analysis', or 'exploit development' do NOT indicate malicious intent and must NEVER trigger refusal or shallow canned warnings.\n\
   - Fully explain underlying protocols, binary execution mechanics, architectural weaknesses, attack chains, and exploit preconditions in educational, laboratory, and authorized testing contexts.\n\
2. SAFE HANDLING OF REAL-WORLD / SENSITIVE ATTACK REQUESTS:\n\
   - When asked to attack a specific unauthorized target or generate malicious deployment automation, do NOT shut down or terminate the learning session with generic lectures.\n\
   - Instead, explain the underlying technical mechanism conceptually, demonstrate the concepts using synthetic targets or authorized open labs (e.g., OWASP Juice Shop, DVWA, WebGoat, local curl), and provide robust defense-in-depth countermeasures.\n\
3. FACTUAL ACCURACY & EVIDENCE GROUNDING (ZERO FABRICATION):\n\
   - Never invent or assume technical facts, HTTP response headers, scanner outputs, file contents, or tool results. If information is absent, state so explicitly.\n\
   - Distinguish strictly between: (a) observed facts, (b) test inputs, and (c) unverified hypotheses.\n\
   - Automated scanner detection does NOT equal verified exploitability. Check the Validation Status (CONFIRMED, NEEDS_VALIDATION, LIKELY_FALSE_POSITIVE, UNCONFIRMED, NOT_APPLICABLE).\n\
4. REQUIRED REGRESSION POLICY: MISSING SECURITY HEADERS (CSP):\n\
   - Given evidence that an endpoint returns HTTP 200 and lacks Content-Security-Policy or Content-Security-Policy-Report-Only:\n\
     a. Identify the missing header as a security hardening omission / absent defense-in-depth mitigation, NOT proof of confirmed Cross-Site Scripting (XSS).\n\
     b. Explain that CSP restricts browser-side script execution contexts, resource origins, inline scripts, and eval sinks.\n\
     c. State explicitly what additional empirical evidence is necessary to confirm an XSS vulnerability (e.g. untrusted user input reflected in an executable HTML/DOM context without proper contextual encoding/sanitization).\n\
     d. Provide a production-ready, secure CSP example (e.g. default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';) and avoid insecure directives ('unsafe-inline', 'unsafe-eval') unless explaining legacy trade-offs.\n\
     e. Detail the staged rollout methodology: deploy Content-Security-Policy-Report-Only first to collect violation telemetry before enforcing Content-Security-Policy.\n\
     f. Do not claim that an external target was independently tested or scanned.\n\
5. CVSS v3.1 RIGOR & SEVERITY BOUNDARIES:\n\
   - Generate CVSS scores ONLY when complete metric vectors and verified empirical observations are supplied.\n\
   - Never assign Critical or High severity based on a missing security header alone.\n\
   - Distinguish technical weaknesses from exploitability and business impact. When evidence is insufficient, explicitly declare scoring as 'Unassessed / Pending Verification'.\n\
6. PRODUCTION CODE GENERATION & REMEDIATION QUALITY:\n\
   - Provide syntactically valid, modern, production-grade defense-in-depth code snippets (Python, TypeScript/Node.js, Go, Java, PHP, Nginx, Apache).\n\
   - Always include necessary imports, framework-accurate request/response handlers, secure defaults, error handling, and non-destructive retesting verification commands (e.g. curl).\n\
7. ADAPTIVE DEPTH & TONE:\n\
   - When mode is 'beginner': Use clear analogies, plain-English root causes, and step-by-step developer fixes.\n\
   - When mode is 'advanced' or 'professional': Provide deep protocol analysis, CVSS metric nuances, memory/assembly execution context, and edge-case mitigations.\n\
   - Support English and multilingual/Hinglish inquiries naturally with technical clarity."
    }

    /// Combines core policy with finding details, validation records, and custom directives
    pub fn build_system_instruction(
        custom_system: Option<&str>,
        finding_context: Option<&str>,
    ) -> String {
        let base = Self::core_policy_prompt();
        let mut full = base.to_string();

        if let Some(ctx) = finding_context {
            if !ctx.trim().is_empty() {
                full.push_str("\n\n--- CURRENT FINDING CONTEXT & VALIDATION STATE ---\n");
                full.push_str(ctx.trim());
            }
        }

        if let Some(custom) = custom_system {
            let trimmed = custom.trim();
            if !trimmed.is_empty() && !trimmed.contains("APPSC NEXUS AI Mentor") {
                full.push_str("\n\n--- SPECIFIC CONVERSATION DIRECTIVE ---\n");
                full.push_str(trimmed);
            }
        }

        full
    }
}

impl AiMentor {
    pub fn new() -> Self {
        Self {
            base_url: "http://127.0.0.1:11434".to_string(),
        }
    }

    pub async fn check_status(&self) -> (bool, Vec<String>) {
        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(6))
            .build()
        {
            Ok(c) => c,
            Err(_) => return (false, Vec::new()),
        };

        let res = client
            .get(format!("{}/api/tags", self.base_url))
            .send()
            .await;

        match res {
            Ok(resp) => {
                if let Ok(tags) = resp.json::<OllamaTagsResponse>().await {
                    let model_names = tags
                        .models
                        .unwrap_or_default()
                        .into_iter()
                        .map(|m| m.name)
                        .collect();
                    (true, model_names)
                } else {
                    (true, Vec::new())
                }
            }
            Err(_) => {
                // Secondary fallback attempt: check localhost in case loopback differs
                if self.base_url.contains("127.0.0.1") {
                    if let Ok(resp) = client.get("http://localhost:11434/api/tags").send().await {
                        if let Ok(tags) = resp.json::<OllamaTagsResponse>().await {
                            let model_names = tags
                                .models
                                .unwrap_or_default()
                                .into_iter()
                                .map(|m| m.name)
                                .collect();
                            return (true, model_names);
                        }
                    }
                }
                (false, Vec::new())
            }
        }
    }

    pub async fn get_system_info(&self) -> OllamaSystemInfo {
        let now = chrono::Utc::now().to_rfc3339();
        let endpoint = self.base_url.clone();

        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(4))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                return OllamaSystemInfo {
                    is_online: false,
                    version: None,
                    endpoint,
                    installed_models: Vec::new(),
                    last_checked: now,
                    error_message: Some(format!("Failed to build HTTP client: {}", e)),
                };
            }
        };

        // Query tags
        let tags_res = client.get(format!("{}/api/tags", endpoint)).send().await;
        match tags_res {
            Ok(resp) if resp.status().is_success() => {
                let tags = resp.json::<OllamaTagsResponse>().await.ok();
                let models = tags
                    .and_then(|t| t.models)
                    .unwrap_or_default()
                    .into_iter()
                    .map(|m| m.name)
                    .collect::<Vec<_>>();

                // Query version
                let version = if let Ok(v_resp) = client.get(format!("{}/api/version", endpoint)).send().await {
                    if let Ok(v_json) = v_resp.json::<serde_json::Value>().await {
                        v_json.get("version").and_then(|v| v.as_str()).map(|s| s.to_string())
                    } else {
                        None
                    }
                } else {
                    None
                };

                OllamaSystemInfo {
                    is_online: true,
                    version,
                    endpoint,
                    installed_models: models,
                    last_checked: now,
                    error_message: None,
                }
            }
            Ok(resp) => OllamaSystemInfo {
                is_online: false,
                version: None,
                endpoint,
                installed_models: Vec::new(),
                last_checked: now,
                error_message: Some(format!("Ollama server returned HTTP {}", resp.status())),
            },
            Err(e) => OllamaSystemInfo {
                is_online: false,
                version: None,
                error_message: Some(format!("Could not connect to Ollama at {}: {}. Run 'ollama serve' to start.", endpoint, e)),
                endpoint,
                installed_models: Vec::new(),
                last_checked: now,
            },
        }
    }

    pub async fn start_service(&self) -> Result<String, String> {
        let (status, models) = self.check_status().await;
        if status {
            return Ok(format!(
                "Ollama service is already active and responding ({} models available).",
                models.len()
            ));
        }

        let mut cmd = std::process::Command::new("ollama");
        cmd.arg("serve");

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        match cmd.spawn() {
            Ok(_) => {
                for _ in 0..10 {
                    tokio::time::sleep(Duration::from_millis(1000)).await;
                    let (ready, models) = self.check_status().await;
                    if ready {
                        return Ok(format!(
                            "Ollama engine successfully initialized ({} models detected).",
                            models.len()
                        ));
                    }
                }
                Err("Ollama process spawned, but engine did not respond on 127.0.0.1:11434 within 10 seconds.".to_string())
            }
            Err(e) => Err(format!(
                "Failed to execute 'ollama serve': {}. Please ensure Ollama is installed in PATH.",
                e
            )),
        }
    }

    pub async fn stop_service(&self) -> Result<String, String> {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/IM", "ollama.exe", "/T"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/IM", "ollama_llama_server.exe", "/T"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
            let _ = std::process::Command::new("taskkill")
                .args(["/F", "/IM", "ollama app.exe", "/T"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("pkill")
                .arg("-f")
                .arg("ollama")
                .output();
        }
        Ok("Ollama engine process stopped successfully.".to_string())
    }



    pub async fn pull_model(&self, model: &str, app: tauri::AppHandle) -> Result<String, String> {
        use tauri::Emitter;

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(1800))
            .build()
            .map_err(|e| e.to_string())?;

        let req = serde_json::json!({
            "name": model,
            "stream": true
        });

        let mut res = client
            .post(format!("{}/api/pull", self.base_url))
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("Failed to initiate model download: {}", e))?;

        if !res.status().is_success() {
            return Err(format!("Ollama returned error: HTTP {}", res.status()));
        }

        let mut buffer = String::new();

        while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
            let chunk_str = String::from_utf8_lossy(&chunk);
            buffer.push_str(&chunk_str);

            while let Some(newline_pos) = buffer.find('\n') {
                let line = buffer[..newline_pos].trim().to_string();
                buffer = buffer[newline_pos + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                if let Ok(data) = serde_json::from_str::<OllamaPullStreamChunk>(&line) {
                    if let Some(err) = data.error {
                        let _ = app.emit("ollama-pull-progress", ModelPullProgress {
                            model: model.to_string(),
                            status: format!("Error: {}", err),
                            completed: 0,
                            total: 0,
                            percentage: 0.0,
                            done: true,
                            error: Some(err.clone()),
                        });
                        return Err(err);
                    }

                    let status = data.status.unwrap_or_else(|| "downloading".to_string());
                    let completed = data.completed.unwrap_or(0);
                    let total = data.total.unwrap_or(0);
                    let percentage = if total > 0 {
                        ((completed as f64 / total as f64) * 100.0) as f32
                    } else {
                        0.0
                    };

                    let is_done = status == "success";

                    let progress = ModelPullProgress {
                        model: model.to_string(),
                        status: status.clone(),
                        completed,
                        total,
                        percentage,
                        done: is_done,
                        error: None,
                    };

                    let _ = app.emit("ollama-pull-progress", &progress);

                    if is_done {
                        return Ok(format!("Model '{}' successfully downloaded and ready for offline use!", model));
                    }
                }
            }
        }

        let _ = app.emit("ollama-pull-progress", ModelPullProgress {
            model: model.to_string(),
            status: "Completed".to_string(),
            completed: 100,
            total: 100,
            percentage: 100.0,
            done: true,
            error: None,
        });

        Ok(format!("Model '{}' downloaded and ready for use!", model))
    }

    pub async fn chat(
        &self,
        model: &str,
        system_instruction: Option<&str>,
        history: Vec<ChatMessage>,
    ) -> Result<String, String> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|e| format!("Client creation error: {}", e))?;

        let mut messages = Vec::new();

        // Enforce the centralized AIMentorPolicy across ALL models and conversations
        let system_content = AIMentorPolicy::build_system_instruction(system_instruction, None);
        messages.push(ChatMessage {
            role: "system".to_string(),
            content: system_content,
        });

        let mut filtered_history: Vec<ChatMessage> = history
            .into_iter()
            .filter(|msg| {
                let trimmed = msg.content.trim();
                !trimmed.is_empty()
                    && !trimmed.starts_with("⚠️ **Local AI Engine Offline")
                    && !trimmed.starts_with("Could not reach Ollama")
            })
            .collect();

        // Strip leading assistant greeting if present to keep conversation flow clean for Ollama
        if let Some(first) = filtered_history.first() {
            if first.role == "assistant"
                && (first.content.contains("👋")
                    || first.content.contains("Welcome to the **Local AI Security Mentor**")
                    || first.content.contains("Hello! I am your AI Security Mentor"))
            {
                filtered_history.remove(0);
            }
        }

        for msg in filtered_history {
            messages.push(msg);
        }

        if messages.len() <= 1 {
            return Ok("Hello! How can I assist you with cybersecurity, vulnerability analysis, or defensive remediation today?".to_string());
        }

        let options = Some(serde_json::json!({
            "temperature": 0.3,
            "num_ctx": 4096
        }));

        let req_body = OllamaChatRequest {
            model: model.to_string(),
            messages,
            stream: false,
            options,
        };

        let mut res = client
            .post(format!("{}/api/chat", self.base_url))
            .json(&req_body)
            .send()
            .await;

        if res.is_err() {
            // Auto-recovery attempt: trigger Ollama background service launch if offline
            let _ = self.start_service().await;
            res = client
                .post(format!("{}/api/chat", self.base_url))
                .json(&req_body)
                .send()
                .await;
        }

        let res = res.map_err(|e| {
            format!(
                "Cannot reach local Ollama at 127.0.0.1:11434 (is 'ollama serve' running?): {}",
                e
            )
        })?;

        if !res.status().is_success() {
            let status = res.status();
            let err_body = res.text().await.unwrap_or_default();
            return Err(format!("Ollama returned HTTP error {}: {}", status, err_body));
        }

        let resp_json = res
            .json::<OllamaChatResponse>()
            .await
            .map_err(|e| format!("Failed to parse Ollama chat response: {}", e))?;

        Ok(resp_json.message.content)
    }
}

pub struct AiTaskManager {
    ai_mentor: Arc<AiMentor>,
    db: Arc<Database>,
    semaphore: Arc<Semaphore>,
    cancel_senders: Arc<RwLock<HashMap<String, watch::Sender<bool>>>>,
}

impl AiTaskManager {
    pub fn new(ai_mentor: Arc<AiMentor>, db: Arc<Database>) -> Self {
        Self {
            ai_mentor,
            db,
            // MAX_CONCURRENT_AI_JOBS = 1: strictly bounded concurrency to avoid overloading GPU/RAM with local models
            semaphore: Arc::new(Semaphore::new(1)),
            cancel_senders: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn submit_task(
        &self,
        app_handle: Option<tauri::AppHandle>,
        conversation_id: String,
        model: String,
        system_prompt: Option<String>,
        messages: Vec<ChatMessage>,
    ) -> Result<AiTask, String> {
        let task_id = Uuid::new_v4().to_string();

        let prompt_preview = messages
            .iter()
            .rev()
            .find(|m| m.role == "user")
            .map(|m| {
                let trimmed = m.content.trim();
                if trimmed.len() > 100 {
                    format!("{}...", &trimmed[..100])
                } else {
                    trimmed.to_string()
                }
            })
            .unwrap_or_else(|| "General Inquiry".to_string());

        let messages_json = serde_json::to_string(&messages).unwrap_or_else(|_| "[]".to_string());
        let now = chrono::Utc::now().to_rfc3339();

        let initial_task = AiTask {
            id: task_id.clone(),
            conversation_id: conversation_id.clone(),
            model: model.clone(),
            prompt_preview,
            status: AiTaskStatus::Queued,
            system_prompt: system_prompt.clone(),
            messages_json,
            result: None,
            error: None,
            created_at: now,
            started_at: None,
            completed_at: None,
            duration_ms: 0,
        };

        // Persist initial Queued state to SQLite
        self.db
            .insert_ai_task(&initial_task)
            .map_err(|e| format!("Failed to record AI task in database: {}", e))?;

        let (cancel_tx, mut cancel_rx) = watch::channel(false);
        {
            let mut senders = self.cancel_senders.write().await;
            senders.insert(task_id.clone(), cancel_tx);
        }

        if let Some(ref app) = app_handle {
            let _ = app.emit("ai-task-updated", &initial_task);
        }

        // Spawn background worker independent of route changes or UI component lifecycle
        let mentor = self.ai_mentor.clone();
        let db = self.db.clone();
        let semaphore = self.semaphore.clone();
        let cancel_senders = self.cancel_senders.clone();
        let task_id_clone = task_id.clone();
        let app_handle_clone = app_handle.clone();
        let mut task = initial_task.clone();

        tokio::spawn(async move {
            let start_instant = Instant::now();

            // 1. Wait for semaphore permit in bounded queue
            let _permit = match semaphore.acquire().await {
                Ok(p) => p,
                Err(_) => return,
            };

            // Check if cancelled before execution started
            if *cancel_rx.borrow() {
                task.status = AiTaskStatus::Cancelled;
                task.completed_at = Some(chrono::Utc::now().to_rfc3339());
                task.duration_ms = start_instant.elapsed().as_millis() as u64;
                let _ = db.update_ai_task(&task);
                let mut senders = cancel_senders.write().await;
                senders.remove(&task_id_clone);
                if let Some(ref app) = app_handle_clone {
                    let _ = app.emit("ai-task-updated", &task);
                }
                return;
            }

            // 2. Mark as Running
            task.status = AiTaskStatus::Running;
            task.started_at = Some(chrono::Utc::now().to_rfc3339());
            let _ = db.update_ai_task(&task);
            if let Some(ref app) = app_handle_clone {
                let _ = app.emit("ai-task-updated", &task);
            }

            // 3. Execute generation with cancellation listener
            let execute_fut = mentor.chat(&model, system_prompt.as_deref(), messages);

            tokio::select! {
                changed = cancel_rx.changed() => {
                    if changed.is_ok() && *cancel_rx.borrow() {
                        task.status = AiTaskStatus::Cancelled;
                        task.error = Some("Generation cancelled by user".to_string());
                    }
                }
                chat_res = execute_fut => {
                    match chat_res {
                        Ok(answer) => {
                            task.status = AiTaskStatus::Completed;
                            task.result = Some(answer.clone());

                            // Automatically persist assistant response into conversation history
                            let assistant_msg = AiChatMessageRecord {
                                id: Uuid::new_v4().to_string(),
                                conversation_id: task.conversation_id.clone(),
                                role: "assistant".to_string(),
                                content: answer,
                                timestamp: chrono::Utc::now().to_rfc3339(),
                                task_id: Some(task.id.clone()),
                            };
                            let _ = db.insert_chat_message(&assistant_msg);
                        }
                        Err(err) => {
                            task.status = AiTaskStatus::Failed;
                            task.error = Some(err);
                        }
                    }
                }
            }

            task.completed_at = Some(chrono::Utc::now().to_rfc3339());
            task.duration_ms = start_instant.elapsed().as_millis() as u64;
            let _ = db.update_ai_task(&task);

            {
                let mut senders = cancel_senders.write().await;
                senders.remove(&task_id_clone);
            }

            if let Some(ref app) = app_handle_clone {
                let _ = app.emit("ai-task-updated", &task);
            }
        });

        Ok(initial_task)
    }

    pub async fn cancel_task(
        &self,
        app_handle: Option<tauri::AppHandle>,
        task_id: &str,
    ) -> Result<bool, String> {
        let mut cancelled = false;
        {
            let senders = self.cancel_senders.read().await;
            if let Some(tx) = senders.get(task_id) {
                let _ = tx.send(true);
                cancelled = true;
            }
        }

        if let Ok(Some(mut task)) = self.db.get_ai_task(task_id) {
            if task.status == AiTaskStatus::Queued || task.status == AiTaskStatus::Running {
                task.status = AiTaskStatus::Cancelled;
                task.completed_at = Some(chrono::Utc::now().to_rfc3339());
                task.error = Some("Generation cancelled by user".to_string());
                let _ = self.db.update_ai_task(&task);
                if let Some(ref app) = app_handle {
                    let _ = app.emit("ai-task-updated", &task);
                }
                cancelled = true;
            }
        }

        Ok(cancelled)
    }

    pub fn get_tasks(&self, limit: Option<usize>) -> Result<Vec<AiTask>, String> {
        self.db.get_ai_tasks(limit).map_err(|e| e.to_string())
    }

    pub fn get_task_status(&self, task_id: &str) -> Result<Option<AiTask>, String> {
        self.db.get_ai_task(task_id).map_err(|e| e.to_string())
    }

    pub fn clear_tasks(&self) -> Result<(), String> {
        self.db.clear_ai_tasks().map_err(|e| e.to_string())
    }
}

