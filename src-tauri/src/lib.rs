pub mod adapters;
pub mod ai;
pub mod android_audit;
pub mod crawler;
pub mod db;
pub mod extensions;
pub mod feeds;
pub mod importers;
pub mod models;
pub mod orchestration;
pub mod plugins;
pub mod reports;
pub mod scanners;
pub mod scope;
pub mod tools;
pub mod windows_audit;

use ai::AiMentor;
use db::Database;
use feeds::ThreatFeedManager;
use models::{DiscoveredEndpoint, FeedUpdateResult, Finding, PluginInfo, ScopeConfig, Target, ToolInfo};
use plugins::PluginManager;
use scanners::BaselineScanner;
use scope::ScopeValidator;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tools::ToolManager;
use uuid::Uuid;

pub struct AppState {
    db: Arc<Database>,
    tool_mgr: ToolManager,
    plugin_mgr: PluginManager,
    feed_mgr: ThreatFeedManager,
    ai_mentor: AiMentor,
    adapter_registry: Arc<adapters::AdapterRegistry>,
    extension_engine: Arc<extensions::ExtensionEngine>,
    job_manager: Arc<orchestration::JobManager>,
}

#[tauri::command]
async fn update_threat_feeds(state: State<'_, AppState>) -> Result<FeedUpdateResult, String> {
    state.feed_mgr.sync_threat_feeds().await
}

#[tauri::command]
fn get_tools(state: State<'_, AppState>) -> Vec<ToolInfo> {
    state.tool_mgr.get_available_tools()
}

#[tauri::command]
fn get_plugins(state: State<'_, AppState>) -> Vec<PluginInfo> {
    state.plugin_mgr.get_plugins()
}

#[tauri::command]
fn register_plugin(state: State<'_, AppState>, manifest_json: String) -> Result<PluginInfo, String> {
    state.plugin_mgr.register_plugin(&manifest_json)
}

#[tauri::command]
async fn run_plugin(
    state: State<'_, AppState>,
    target_id: String,
    plugin_id: String,
) -> Result<models::ScanResult, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    ScopeValidator::validate_target(&target.primary_url, &target.scope)?;

    let (scan_res, findings) = state
        .plugin_mgr
        .run_plugin(&plugin_id, &target.id, &target.primary_url)
        .await?;

    for finding in &findings {
        let _ = state.db.insert_finding(finding);
    }
    let _ = state.db.record_scan(&scan_res);

    Ok(scan_res)
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
        other => {
            let plugin_id = other.strip_prefix("plugin:").unwrap_or(other);
            let (scan_res, findings) = state
                .plugin_mgr
                .run_plugin(plugin_id, &target.id, &target.primary_url)
                .await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
            }

            Ok(scan_res)
        }
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
async fn chat_with_mentor(
    state: State<'_, AppState>,
    model: String,
    system: Option<String>,
    messages: Vec<ai::ChatMessage>,
) -> Result<String, String> {
    state.ai_mentor.chat(&model, system.as_deref(), messages).await
}

#[tauri::command]
fn run_windows_audit(
    state: State<'_, AppState>,
    target_id: String,
) -> Result<windows_audit::WindowsAuditReport, String> {
    let report = windows_audit::WindowsAuditor::audit_system(&target_id);
    for finding in &report.findings {
        let _ = state.db.insert_finding(finding);
    }
    Ok(report)
}

#[tauri::command]
fn run_android_audit(
    state: State<'_, AppState>,
    target_id: String,
    manifest_content: String,
) -> Result<android_audit::AndroidAuditReport, String> {
    let report = android_audit::AndroidAuditor::audit_manifest(&target_id, &manifest_content);
    for finding in &report.findings {
        let _ = state.db.insert_finding(finding);
    }
    Ok(report)
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
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    model: String,
) -> Result<String, String> {
    state.ai_mentor.pull_model(&model, app).await
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

// -------------------------------------------------------------
// UNIVERSAL TOOL ADAPTER COMMANDS
// -------------------------------------------------------------

#[tauri::command]
fn get_tool_adapters(state: State<'_, AppState>) -> Vec<adapters::ToolAdapterMetadata> {
    state.adapter_registry.list_adapters()
}

#[tauri::command]
fn set_tool_path_override(
    state: State<'_, AppState>,
    tool_id: String,
    custom_path: String,
) -> Result<(), String> {
    let _ = state.db.save_tool_path_override(&tool_id, &custom_path);
    state.adapter_registry.set_custom_path(tool_id, custom_path);
    Ok(())
}

#[tauri::command]
async fn run_tool_health_check(
    state: State<'_, AppState>,
    tool_id: String,
) -> Result<adapters::ToolHealthCheckResult, String> {
    state.adapter_registry.health_check(&tool_id).await
}

#[tauri::command]
async fn execute_tool_adapter(
    state: State<'_, AppState>,
    tool_id: String,
    target_id: String,
    target_url: String,
    parameters: Option<HashMap<String, String>>,
) -> Result<adapters::AdapterOutput, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    ScopeValidator::validate_target(&target_url, &target.scope)?;

    let input = adapters::AdapterInput {
        target_id: target_id.clone(),
        target_url: target_url.clone(),
        parameters: parameters.unwrap_or_default(),
        timeout_seconds: Some(300),
    };

    let output = state.adapter_registry.execute(&tool_id, input).await?;

    for finding in &output.findings {
        let _ = state.db.insert_finding(finding);
    }
    for ep in &output.endpoints {
        let _ = state.db.insert_endpoint(ep);
    }

    Ok(output)
}

// -------------------------------------------------------------
// EXTENSION LIFECYCLE COMMANDS (V1)
// -------------------------------------------------------------

#[tauri::command]
fn get_extensions_v1(state: State<'_, AppState>) -> Vec<extensions::ExtensionRecord> {
    state.extension_engine.get_extensions()
}

#[tauri::command]
fn set_extension_state(
    state: State<'_, AppState>,
    id: String,
    state_name: String,
) -> Result<extensions::ExtensionRecord, String> {
    let new_state = match state_name.to_lowercase().as_str() {
        "enabled" => extensions::ExtensionLifecycleState::Enabled,
        "disabled" => extensions::ExtensionLifecycleState::Disabled,
        "available" => extensions::ExtensionLifecycleState::Available,
        "removed" => extensions::ExtensionLifecycleState::Removed,
        _ => return Err(format!("Invalid extension state: {}", state_name)),
    };
    state.extension_engine.set_state(&id, new_state)
}

#[tauri::command]
fn register_extension_v1(
    state: State<'_, AppState>,
    manifest_json: String,
) -> Result<extensions::ExtensionRecord, String> {
    state.extension_engine.register_manifest(&manifest_json)
}

// -------------------------------------------------------------
// WORKFLOW ORCHESTRATION COMMANDS
// -------------------------------------------------------------

#[tauri::command]
fn get_workflows(state: State<'_, AppState>) -> Vec<orchestration::WorkflowDefinition> {
    state.job_manager.get_workflows()
}

#[tauri::command]
fn save_workflow(
    state: State<'_, AppState>,
    workflow: orchestration::WorkflowDefinition,
) -> Result<orchestration::WorkflowDefinition, String> {
    state.job_manager.save_workflow(workflow)
}

#[tauri::command]
fn delete_workflow(state: State<'_, AppState>, workflow_id: String) -> Result<bool, String> {
    state.job_manager.delete_workflow(&workflow_id)
}

#[tauri::command]
async fn start_workflow_job(
    state: State<'_, AppState>,
    workflow_id: String,
    target_id: String,
) -> Result<orchestration::WorkflowJob, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    ScopeValidator::validate_target(&target.primary_url, &target.scope)?;

    state
        .job_manager
        .clone()
        .start_job(&workflow_id, &target.id, &target.primary_url)
        .await
}

#[tauri::command]
fn get_workflow_jobs(state: State<'_, AppState>) -> Vec<orchestration::WorkflowJob> {
    state.job_manager.get_jobs()
}

#[tauri::command]
fn get_workflow_job(
    state: State<'_, AppState>,
    job_id: String,
) -> Option<orchestration::WorkflowJob> {
    state.job_manager.get_job(&job_id)
}

#[tauri::command]
fn approve_workflow_step(
    state: State<'_, AppState>,
    job_id: String,
    step_id: String,
) -> Result<bool, String> {
    state.job_manager.approve_step(&job_id, &step_id)
}

#[tauri::command]
fn cancel_workflow_job(state: State<'_, AppState>, job_id: String) -> Result<bool, String> {
    state.job_manager.cancel_job(&job_id)
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
    let log_file = base_dir.join("appsec_startup.log");
    let _ = std::fs::write(
        &log_file,
        format!(
            "Starting AppSec Nexus PID {} at {:?}\nBase dir: {:?}\n",
            std::process::id(),
            std::time::SystemTime::now(),
            base_dir
        ),
    );

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS};
        use windows_sys::Win32::System::Threading::CreateMutexA;
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            FindWindowW, IsWindowVisible, SetForegroundWindow, ShowWindow, SW_RESTORE,
        };
        use std::os::windows::process::CommandExt;

        unsafe {
            let mutex_name = b"AppSecNexusLocalInstanceMutex\0";
            let handle = CreateMutexA(std::ptr::null(), 1, mutex_name.as_ptr());
            if GetLastError() == ERROR_ALREADY_EXISTS {
                let msg = format!(
                    "Another instance detected for PID {}. Checking if existing window is visible...\n",
                    std::process::id()
                );
                let _ = std::fs::OpenOptions::new()
                    .append(true)
                    .create(true)
                    .open(&log_file)
                    .and_then(|mut f| {
                        use std::io::Write;
                        let _ = f.write_all(msg.as_bytes());
                        f.flush()
                    });

                let win_title: Vec<u16> = "AppSec Nexus - Cybersecurity & Web Pentesting\0"
                    .encode_utf16()
                    .collect();
                let mut brought_to_front = false;
                for _ in 0..6 {
                    let hwnd = FindWindowW(std::ptr::null(), win_title.as_ptr());
                    if !hwnd.is_null() && IsWindowVisible(hwnd) != 0 {
                        ShowWindow(hwnd, SW_RESTORE);
                        SetForegroundWindow(hwnd);
                        brought_to_front = true;
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }

                if brought_to_front {
                    let msg = "Existing visible window focused successfully. Exiting secondary launcher.\n";
                    let _ = std::fs::OpenOptions::new()
                        .append(true)
                        .create(true)
                        .open(&log_file)
                        .and_then(|mut f| {
                            use std::io::Write;
                            let _ = f.write_all(msg.as_bytes());
                            f.flush()
                        });

                    if !handle.is_null() {
                        CloseHandle(handle);
                    }
                    return;
                }

                // If no visible window was found, the previous instance is an orphaned background zombie.
                // Terminate the stale background instance so the user can open the app fresh:
                let msg = "No visible window found for existing instance. Cleaning up stale process to launch fresh...\n";
                let _ = std::fs::OpenOptions::new()
                    .append(true)
                    .create(true)
                    .open(&log_file)
                    .and_then(|mut f| {
                        use std::io::Write;
                        let _ = f.write_all(msg.as_bytes());
                        f.flush()
                    });

                let current_pid = std::process::id();
                let _ = std::process::Command::new("taskkill")
                    .args(&["/F", "/FI", &format!("PID ne {}", current_pid), "/IM", "AppSec-Nexus.exe"])
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .output();

                if !handle.is_null() {
                    CloseHandle(handle);
                }
                std::thread::sleep(std::time::Duration::from_millis(300));
            }
        }
    }

    let hook_log = log_file.clone();
    std::panic::set_hook(Box::new(move |info| {
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            format!("{:?}", info.payload())
        };
        let msg = format!("PANIC: {}\nLocation: {:?}\n", payload, info.location());
        let _ = std::fs::OpenOptions::new().append(true).create(true).open(&hook_log).and_then(|mut f| {
            use std::io::Write;
            let _ = f.write_all(msg.as_bytes());
            f.flush()
        });
    }));

    let tools_bin = base_dir.join("tools").join("bin");
    let plugins_dir = base_dir.join("tools").join("plugins");
    let extensions_dir = base_dir.join("extensions");
    let db_path = base_dir.join("appsec.db");

    let db = match Database::init(&db_path.to_string_lossy()) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Database init failed at {:?}: {}. Using in-memory fallback.", db_path, e);
            Database::init(":memory:").expect("Failed to initialize SQLite fallback")
        }
    };
    let arc_db = Arc::new(db);
    let tool_mgr = ToolManager::new(tools_bin.clone());
    let plugin_mgr = PluginManager::new(plugins_dir);
    let feed_mgr = ThreatFeedManager::new(tools_bin.clone());
    let ai_mentor = AiMentor::new();

    let adapter_registry = Arc::new(adapters::AdapterRegistry::new(tools_bin.clone()));
    if let Ok(overrides) = arc_db.get_tool_path_overrides() {
        adapter_registry.load_custom_paths(overrides);
    }

    let extension_engine = Arc::new(extensions::ExtensionEngine::new(extensions_dir));
    let job_manager = Arc::new(orchestration::JobManager::new(
        adapter_registry.clone(),
        extension_engine.clone(),
        arc_db.clone(),
    ));

    let state = AppState {
        db: arc_db,
        tool_mgr,
        plugin_mgr,
        feed_mgr,
        ai_mentor,
        adapter_registry,
        extension_engine,
        job_manager,
    };

    let setup_log = log_file.clone();
    let event_log = log_file.clone();
    let run_log = log_file.clone();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(move |window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    let msg = format!("WINDOW CLOSE/DESTROY on {:?} - terminating process cleanly\n", window.label());
                    let _ = std::fs::OpenOptions::new().append(true).create(true).open(&event_log).and_then(|mut f| {
                        use std::io::Write;
                        let _ = f.write_all(msg.as_bytes());
                        f.flush()
                    });
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .setup(move |app| {
            use tauri::Manager;
            let win = app.get_webview_window("main");
            let msg = format!("SETUP: window 'main' exists = {}\n", win.is_some());
            let _ = std::fs::OpenOptions::new().append(true).create(true).open(&setup_log).and_then(|mut f| {
                use std::io::Write;
                let _ = f.write_all(msg.as_bytes());
                f.flush()
            });

            if let Some(w) = win {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
            Ok(())
        })
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            get_tools,
            get_plugins,
            register_plugin,
            run_plugin,
            update_threat_feeds,
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
            import_external_report,
            chat_with_mentor,
            run_windows_audit,
            run_android_audit,
            get_tool_adapters,
            set_tool_path_override,
            run_tool_health_check,
            execute_tool_adapter,
            get_extensions_v1,
            set_extension_state,
            register_extension_v1,
            get_workflows,
            save_workflow,
            delete_workflow,
            start_workflow_job,
            get_workflow_jobs,
            get_workflow_job,
            approve_workflow_step,
            cancel_workflow_job
        ]);

    let app = match builder.build(tauri::generate_context!()) {
        Ok(a) => a,
        Err(e) => {
            let msg = format!("BUILD ERROR: {:?}\n", e);
            let _ = std::fs::OpenOptions::new().append(true).create(true).open(&log_file).and_then(|mut f| {
                use std::io::Write;
                let _ = f.write_all(msg.as_bytes());
                f.flush()
            });
            return;
        }
    };

    app.run(move |_app_handle, event| {
        match &event {
            tauri::RunEvent::WindowEvent { label: _, event, .. } => {
                match event {
                    tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            tauri::RunEvent::ExitRequested { code: _, .. } => {
                let msg = "RUN EVENT ExitRequested - terminating process cleanly\n";
                let _ = std::fs::OpenOptions::new().append(true).create(true).open(&run_log).and_then(|mut f| {
                    use std::io::Write;
                    let _ = f.write_all(msg.as_bytes());
                    f.flush()
                });
                std::process::exit(0);
            }
            tauri::RunEvent::Exit => {
                let msg = "RUN EVENT Exit - exiting process cleanly\n";
                let _ = std::fs::OpenOptions::new().append(true).create(true).open(&run_log).and_then(|mut f| {
                    use std::io::Write;
                    let _ = f.write_all(msg.as_bytes());
                    f.flush()
                });
                std::process::exit(0);
            }
            _ => {}
        }
    });
}

