pub mod ai;
pub mod crawler;
pub mod db;
pub mod importers;
pub mod models;
pub mod reports;
pub mod scanners;
pub mod scope;
pub mod tools;


use ai::AiMentor;
use db::Database;
use models::{DiscoveredEndpoint, Finding, ScopeConfig, Target, ToolInfo};
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

    let scan_res = match tool.as_str() {
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
        "nmap" => {
            let (scan_res, findings) = state
                .tool_mgr
                .run_nmap(&target.id, &target.primary_url)
                .await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
            }

            Ok(scan_res)
        }
        _ => Err(format!("Unsupported tool '{}'", tool)),
    }?;

    let _ = state.db.record_scan(&scan_res);
    Ok(scan_res)
}

#[tauri::command]
fn get_scan_history(state: State<'_, AppState>) -> Result<Vec<models::ScanResult>, String> {
    state.db.get_scan_history().map_err(|e| e.to_string())
}

#[tauri::command]
fn export_report(state: State<'_, AppState>, target_id: String) -> Result<String, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    let findings = state.db.get_findings().map_err(|e| e.to_string())?;
    let target_findings: Vec<_> = findings
        .into_iter()
        .filter(|f| f.target_id == target_id)
        .collect();

    let html = reports::ReportGenerator::generate_html(&target, &target_findings);
    let sanitized_name = target.name.replace(|c: char| !c.is_alphanumeric(), "_");
    let filename = format!(
        "AppSec_Report_{}_{}.html",
        sanitized_name,
        chrono::Utc::now().format("%Y%m%d_%H%M%S")
    );

    std::fs::write(&filename, html)
        .map_err(|e| format!("Failed to write HTML report: {}", e))?;
    Ok(filename)
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

#[tauri::command]
fn update_finding_status(
    state: State<'_, AppState>,
    finding_id: String,
    status: String,
) -> Result<(), String> {
    state.db.update_finding_status(&finding_id, &status).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_report_json(state: State<'_, AppState>, target_id: String) -> Result<String, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    let findings = state.db.get_findings().map_err(|e| e.to_string())?;
    let target_findings: Vec<_> = findings
        .into_iter()
        .filter(|f| f.target_id == target_id)
        .collect();

    let json_val = serde_json::json!({
        "target": target,
        "findings_count": target_findings.len(),
        "findings": target_findings,
        "exported_at": chrono::Utc::now().to_rfc3339()
    });

    let json_string = serde_json::to_string_pretty(&json_val)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    let sanitized_name = target.name.replace(|c: char| !c.is_alphanumeric(), "_");
    let filename = format!(
        "AppSec_Findings_{}_{}.json",
        sanitized_name,
        chrono::Utc::now().format("%Y%m%d_%H%M%S")
    );

    std::fs::write(&filename, json_string)
        .map_err(|e| format!("Failed to write JSON report: {}", e))?;
    Ok(filename)
}

#[tauri::command]
async fn pull_ai_model(
    state: State<'_, AppState>,
    model: String,
) -> Result<String, String> {
    state.ai_mentor.pull_model(&model).await
}

#[tauri::command]
async fn run_crawler(
    state: State<'_, AppState>,
    target_id: String,
    max_depth: u32,
    max_pages: u32,
) -> Result<Vec<DiscoveredEndpoint>, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    let (endpoints, findings) = crawler::Crawler::crawl(
        &target.id,
        &target.primary_url,
        &target.scope,
        max_depth,
        max_pages,
    )
    .await?;

    for ep in &endpoints {
        let _ = state.db.insert_endpoint(ep);
    }

    for f in &findings {
        let _ = state.db.insert_finding(f);
    }

    Ok(endpoints)
}

#[tauri::command]
fn get_endpoints(
    state: State<'_, AppState>,
    target_id: String,
) -> Result<Vec<DiscoveredEndpoint>, String> {
    state.db.get_endpoints(&target_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_external_report(
    state: State<'_, AppState>,
    target_id: String,
    format: String,
    data: String,
) -> Result<usize, String> {
    let findings = importers::ReportImporter::parse_report(&target_id, &format, &data)?;
    let count = findings.len();
    for f in &findings {
        let _ = state.db.insert_finding(f);
    }
    Ok(count)
}


fn find_base_dir() -> PathBuf {
    // 1. Check current directory and parents
    if let Ok(cwd) = std::env::current_dir() {
        if cwd.join("tools").join("bin").exists() {
            return cwd;
        }
        let mut cur = cwd;
        while let Some(parent) = cur.parent() {
            if parent.join("tools").join("bin").exists() {
                return parent.to_path_buf();
            }
            cur = parent.to_path_buf();
        }
    }
    // 2. Check executable directory and parents
    if let Ok(exe) = std::env::current_exe() {
        let mut cur = exe;
        while let Some(parent) = cur.parent() {
            if parent.join("tools").join("bin").exists() {
                return parent.to_path_buf();
            }
            cur = parent.to_path_buf();
        }
    }
    // 3. Fallback to known development workspace if valid
    let fallback = PathBuf::from(r"c:\Users\ankit\OneDrive\Desktop\project\AppSec");
    if fallback.exists() {
        return fallback;
    }
    PathBuf::from(".")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let base_dir = find_base_dir();
    let tools_bin = base_dir.join("tools").join("bin");
    let db_path = base_dir.join("appsec.db");

    let db = match Database::init(&db_path.to_string_lossy()) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Database init failed at {:?}: {}. Using in-memory fallback.", db_path, e);
            Database::init(":memory:").expect("Failed to initialize SQLite fallback")
        }
    };
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
            explain_finding,
            export_report,
            get_scan_history,
            update_finding_status,
            export_report_json,
            pull_ai_model,
            run_crawler,
            get_endpoints,
            import_external_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
