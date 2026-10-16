mod ai;
mod db;
mod models;
mod scanners;
mod scope;
mod tools;

use ai::AiMentor;
use db::Database;
use models::{Finding, ScopeConfig, Target, ToolInfo};
use scanners::BaselineScanner;
use scope::ScopeValidator;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tools::ToolManager;
use uuid::Uuid;

pub struct AppState {
    db: Arc<Database>,
    tool_mgr: ToolManager,
    ai_mentor: AiMentor,
}

#[tauri::command]
fn get_tools(state: State<'_, AppState>) -> Vec<ToolInfo> {
    state.tool_mgr.get_available_tools()
}

#[tauri::command]
fn get_targets(state: State<'_, AppState>) -> Result<Vec<Target>, String> {
    state.db.get_targets().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_target(
    state: State<'_, AppState>,
    name: String,
    primary_url: String,
    allow_local_lab: bool,
) -> Result<Target, String> {
    let mut scope = ScopeConfig::default();
    scope.allow_local_lab = allow_local_lab;

    // Validate URL upfront
    let validated_url = ScopeValidator::validate_target(&primary_url, &scope)?;

    let target = Target {
        id: Uuid::new_v4().to_string(),
        name,
        primary_url: validated_url,
        created_at: chrono::Utc::now().to_rfc3339(),
        scope,
    };

    state.db.insert_target(&target).map_err(|e| e.to_string())?;
    Ok(target)
}

#[tauri::command]
async fn run_scan(
    state: State<'_, AppState>,
    target_id: String,
    tool: String,
) -> Result<models::ScanResult, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    // Scope check before executing any scan
    ScopeValidator::validate_target(&target.primary_url, &target.scope)?;

    match tool.as_str() {
        "baseline" => {
            let start = std::time::Instant::now();
            let findings = BaselineScanner::scan_url(&target.id, &target.primary_url).await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
            }

            let log_lines = vec![
                format!("Initiated Baseline Security Scan against {}", target.primary_url),
                format!("Checked HTTP security headers (CSP, CORS, HSTS, X-Frame-Options)"),
                format!("Checked Set-Cookie security flags (HttpOnly, Secure)"),
                format!("Audited robots.txt sensitive paths"),
                format!("Scan completed: {} findings recorded", findings.len()),
            ];

            Ok(models::ScanResult {
                scan_id: Uuid::new_v4().to_string(),
                target_url: target.primary_url,
                tool: "BaselineScanner".to_string(),
                status: "Completed".to_string(),
                logs: log_lines,
                findings_count: findings.len(),
                duration_ms: start.elapsed().as_millis() as u64,
            })
        }
        "httpx" => {
            state.tool_mgr.run_httpx(&target.primary_url).await
        }
        "nuclei" => {
            let (scan_res, findings) = state
                .tool_mgr
                .run_nuclei(&target.id, &target.primary_url)
                .await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
            }

            Ok(scan_res)
        }
        _ => Err(format!("Unsupported tool '{}'", tool)),
    }
}

#[tauri::command]
fn get_findings(state: State<'_, AppState>) -> Result<Vec<Finding>, String> {
    state.db.get_findings().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_ai_status(state: State<'_, AppState>) -> Result<(bool, Vec<String>), String> {
    Ok(state.ai_mentor.check_status().await)
}

#[tauri::command]
async fn explain_finding(
    state: State<'_, AppState>,
    model: String,
    mode: String,
    finding_id: String,
) -> Result<String, String> {
    let findings = state.db.get_findings().map_err(|e| e.to_string())?;
    let finding = findings
        .into_iter()
        .find(|f| f.id == finding_id)
        .ok_or_else(|| "Finding not found".to_string())?;

    let sev_str = format!("{:?}", finding.severity);
    state
        .ai_mentor
        .explain_finding(
            &model,
            &mode,
            &finding.title,
            &sev_str,
            &finding.evidence,
            &finding.affected_asset,
            finding.cwe.as_deref(),
        )
        .await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut base_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    // If running from src-tauri, step up to project root
    if base_dir.ends_with("src-tauri") {
        base_dir.pop();
    }
    let tools_bin = base_dir.join("tools").join("bin");
    let db_path = base_dir.join("appsec.db");

    let db = Database::init(&db_path.to_string_lossy()).expect("Failed to initialize SQLite database");
    let tool_mgr = ToolManager::new(tools_bin);
    let ai_mentor = AiMentor::new();

    let state = AppState {
        db: Arc::new(db),
        tool_mgr,
        ai_mentor,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_tools,
            get_targets,
            create_target,
            run_scan,
            get_findings,
            get_ai_status,
            explain_finding
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
