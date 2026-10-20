pub mod adapters;
pub mod ai;
pub mod android_audit;
pub mod burp;
pub mod crawler;
pub mod db;
pub mod extensions;
pub mod feeds;
pub mod heretic;
pub mod importers;
pub mod methodologies;
pub mod models;
pub mod orchestration;
pub mod plugins;
pub mod reports;
pub mod scanners;
pub mod scope;
pub mod system_resources;
pub mod tools;
pub mod validator;
pub mod windows_audit;

use ai::AiMentor;
use db::Database;
use feeds::ThreatFeedManager;
use models::{
    AssessmentRunRecord, AssessmentTemplateRecord, AuditLogRecord, DiscoveredEndpoint,
    FeedUpdateResult, Finding, FindingDetectionTrace, FindingSeverity, FindingStatus,
    FindingUpdatePayload, GeneratedReport, IssueCreatePayload, IssueRecord, IssueUpdatePayload,
    PluginInfo, ReportGenerateParams, ScanEvent, ScopeConfig, Target, TaxonomyCategoryRecord,
    TaxonomyDomainRecord, TestCaseDefinition, TestCaseExecutionRecord, ToolInfo, UserRole,
};
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
    ai_mentor: Arc<AiMentor>,
    ai_task_mgr: Arc<ai::AiTaskManager>,
    adapter_registry: Arc<adapters::AdapterRegistry>,
    extension_engine: Arc<extensions::ExtensionEngine>,
    job_manager: Arc<orchestration::JobManager>,
    pub heretic_supervisor: Arc<heretic::HereticJobSupervisor>,
    pub current_user_role: UserRole,
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
    let scope = ScopeConfig {
        allow_local_lab,
        ..Default::default()
    };

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
    let _ = state.db.log_audit_event(
        "target",
        &target.id,
        "CREATE",
        &format!("Created target '{}' ({})", target.name, target.primary_url),
    );
    Ok(target)
}

#[tauri::command]
fn update_target(
    state: State<'_, AppState>,
    id: String,
    name: String,
    primary_url: String,
    allow_local_lab: bool,
) -> Result<Target, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let existing = targets
        .into_iter()
        .find(|t| t.id == id)
        .ok_or_else(|| "Target not found".to_string())?;

    let scope = ScopeConfig {
        allow_local_lab,
        ..existing.scope
    };

    let validated_url = ScopeValidator::validate_target(&primary_url, &scope)?;

    let updated = Target {
        id: id.clone(),
        name: name.clone(),
        primary_url: validated_url.clone(),
        created_at: existing.created_at,
        scope,
    };

    state.db.update_target(&updated).map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event(
        "target",
        &id,
        "UPDATE",
        &format!("Updated target to '{}' ({})", name, validated_url),
    );
    Ok(updated)
}

#[tauri::command]
fn delete_target(state: State<'_, AppState>, id: String) -> Result<usize, String> {
    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == id)
        .ok_or_else(|| "Target not found".to_string())?;

    let deleted_findings = state.db.delete_target(&id).map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event(
        "target",
        &id,
        "DELETE",
        &format!("Deleted target '{}' ({}) and {} dependent findings", target.name, target.primary_url, deleted_findings),
    );
    Ok(deleted_findings)
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

    let scan_id = Uuid::new_v4().to_string();

    // 1. Record Scan Created Event
    let _ = state.db.insert_scan_event(&ScanEvent {
        id: Uuid::new_v4().to_string(),
        scan_id: scan_id.clone(),
        job_id: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
        event_type: "scan_created".to_string(),
        severity: "info".to_string(),
        component_or_tool: tool.clone(),
        message: format!("Scan initialized for target '{}' ({}) via {}", target.name, target.primary_url, tool),
        metadata_json: serde_json::json!({ "target_id": target.id, "primary_url": target.primary_url }).to_string(),
        duration_ms: 0,
        status: "success".to_string(),
        related_finding_id: None,
        error_details: None,
    });

    // 2. Scope check & event
    ScopeValidator::validate_target(&target.primary_url, &target.scope)?;

    let _ = state.db.insert_scan_event(&ScanEvent {
        id: Uuid::new_v4().to_string(),
        scan_id: scan_id.clone(),
        job_id: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
        event_type: "scope_validated".to_string(),
        severity: "info".to_string(),
        component_or_tool: "ScopeValidator".to_string(),
        message: format!("Target boundary validated: '{}' is authorized within active scope configuration", target.primary_url),
        metadata_json: serde_json::json!({ "allowed_hosts": target.scope.allowed_hosts, "allowed_ports": target.scope.allowed_ports }).to_string(),
        duration_ms: 2,
        status: "success".to_string(),
        related_finding_id: None,
        error_details: None,
    });

    let mut scan_res = match tool.as_str() {
        "baseline" => {
            let start = std::time::Instant::now();
            let findings = BaselineScanner::scan_url(&target.id, &target.primary_url).await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
                let _ = state.db.insert_scan_event(&ScanEvent {
                    id: Uuid::new_v4().to_string(),
                    scan_id: scan_id.clone(),
                    job_id: None,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    event_type: "candidate_finding_created".to_string(),
                    severity: match finding.severity {
                        FindingSeverity::Critical | FindingSeverity::High => "warning".to_string(),
                        _ => "info".to_string(),
                    },
                    component_or_tool: "BaselineScanner".to_string(),
                    message: format!("Discovered finding: '{}' on {}", finding.title, finding.affected_asset),
                    metadata_json: serde_json::json!({ "cwe": finding.cwe, "confidence": finding.confidence }).to_string(),
                    duration_ms: 0,
                    status: "success".to_string(),
                    related_finding_id: Some(finding.id.clone()),
                    error_details: None,
                });
            }

            let log_lines = vec![
                format!("Initiated Baseline Security Scan against {}", target.primary_url),
                format!("Checked HTTP security headers (CSP, CORS, HSTS, X-Frame-Options)"),
                format!("Checked Set-Cookie security flags (HttpOnly, Secure)"),
                format!("Audited robots.txt sensitive paths"),
                format!("Scan completed: {} findings recorded", findings.len()),
            ];

            Ok(models::ScanResult {
                scan_id: scan_id.clone(),
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
            let (mut s_res, findings) = state
                .tool_mgr
                .run_nuclei(&target.id, &target.primary_url)
                .await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
                let _ = state.db.insert_scan_event(&ScanEvent {
                    id: Uuid::new_v4().to_string(),
                    scan_id: scan_id.clone(),
                    job_id: None,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    event_type: "candidate_finding_created".to_string(),
                    severity: "warning".to_string(),
                    component_or_tool: "Nuclei".to_string(),
                    message: format!("Nuclei template match: '{}' on {}", finding.title, finding.affected_asset),
                    metadata_json: serde_json::json!({ "cwe": finding.cwe, "confidence": finding.confidence }).to_string(),
                    duration_ms: 0,
                    status: "success".to_string(),
                    related_finding_id: Some(finding.id.clone()),
                    error_details: None,
                });
            }
            s_res.scan_id = scan_id.clone();
            Ok(s_res)
        }
        "nmap" => {
            let (mut s_res, findings) = state
                .tool_mgr
                .run_nmap(&target.id, &target.primary_url)
                .await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
                let _ = state.db.insert_scan_event(&ScanEvent {
                    id: Uuid::new_v4().to_string(),
                    scan_id: scan_id.clone(),
                    job_id: None,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    event_type: "candidate_finding_created".to_string(),
                    severity: "info".to_string(),
                    component_or_tool: "Nmap".to_string(),
                    message: format!("Nmap service discovery finding: '{}' on {}", finding.title, finding.affected_asset),
                    metadata_json: serde_json::json!({ "cwe": finding.cwe, "confidence": finding.confidence }).to_string(),
                    duration_ms: 0,
                    status: "success".to_string(),
                    related_finding_id: Some(finding.id.clone()),
                    error_details: None,
                });
            }
            s_res.scan_id = scan_id.clone();
            Ok(s_res)
        }
        other => {
            let plugin_id = other.strip_prefix("plugin:").unwrap_or(other);
            let (mut s_res, findings) = state
                .plugin_mgr
                .run_plugin(plugin_id, &target.id, &target.primary_url)
                .await?;

            for finding in &findings {
                let _ = state.db.insert_finding(finding);
                let _ = state.db.insert_scan_event(&ScanEvent {
                    id: Uuid::new_v4().to_string(),
                    scan_id: scan_id.clone(),
                    job_id: None,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    event_type: "candidate_finding_created".to_string(),
                    severity: "info".to_string(),
                    component_or_tool: other.to_string(),
                    message: format!("Plugin finding: '{}' on {}", finding.title, finding.affected_asset),
                    metadata_json: serde_json::json!({ "cwe": finding.cwe }).to_string(),
                    duration_ms: 0,
                    status: "success".to_string(),
                    related_finding_id: Some(finding.id.clone()),
                    error_details: None,
                });
            }
            s_res.scan_id = scan_id.clone();
            Ok(s_res)
        }
    }?;

    scan_res.scan_id = scan_id.clone();
    let _ = state.db.record_scan(&scan_res);

    // Scan completed event
    let _ = state.db.insert_scan_event(&ScanEvent {
        id: Uuid::new_v4().to_string(),
        scan_id,
        job_id: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
        event_type: "scan_completed".to_string(),
        severity: "success".to_string(),
        component_or_tool: scan_res.tool.clone(),
        message: format!("Scan '{}' completed in {}ms. {} findings recorded.", scan_res.tool, scan_res.duration_ms, scan_res.findings_count),
        metadata_json: serde_json::json!({ "findings_count": scan_res.findings_count, "duration_ms": scan_res.duration_ms }).to_string(),
        duration_ms: scan_res.duration_ms,
        status: "success".to_string(),
        related_finding_id: None,
        error_details: None,
    });

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
async fn get_deepseek_status(state: State<'_, AppState>) -> Result<models::DeepSeekProviderStatus, String> {
    Ok(state.ai_mentor.check_deepseek_status().await)
}

#[tauri::command]
async fn get_ollama_system_info(state: State<'_, AppState>) -> Result<crate::ai::OllamaSystemInfo, String> {
    Ok(state.ai_mentor.get_system_info().await)
}

#[tauri::command]
async fn start_ollama_service(state: State<'_, AppState>) -> Result<String, String> {
    state.ai_mentor.start_service().await
}

#[tauri::command]
async fn stop_ollama_service(state: State<'_, AppState>) -> Result<String, String> {
    state.ai_mentor.stop_service().await
}




#[tauri::command]
async fn validate_finding(
    state: State<'_, AppState>,
    finding_id: String,
) -> Result<validator::ValidationRecord, String> {
    if state.current_user_role != UserRole::Admin {
        return Err("Permission denied: only admins may validate findings".into());
    }
    let findings = state.db.get_findings().map_err(|e| e.to_string())?;
    let finding = findings
        .into_iter()
        .find(|f| f.id == finding_id)
        .ok_or_else(|| "Finding not found".to_string())?;

    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == finding.target_id)
        .unwrap_or_else(|| Target {
            id: finding.target_id.clone(),
            name: "Default Target".to_string(),
            primary_url: finding.affected_asset.clone(),
            created_at: chrono::Utc::now().to_rfc3339(),
            scope: ScopeConfig {
                allow_local_lab: true,
                ..Default::default()
            },
        });

    let record = validator::VulnerabilityValidator::validate_finding(&target, &finding).await?;

    // Save validation record to database
    let _ = state.db.insert_validation_record(&record);

    // Update finding validation status and confidence in findings table
    let _ = state.db.update_finding_validation(&finding.id, &record.status, record.confidence_score);

    Ok(record)
}

#[tauri::command]
async fn validate_all_findings(
    state: State<'_, AppState>,
    target_id: String,
) -> Result<Vec<validator::ValidationRecord>, String> {
    let findings = state.db.get_findings().map_err(|e| e.to_string())?;
    let target_findings: Vec<_> = findings
        .into_iter()
        .filter(|f| f.target_id == target_id || target_id == "all" || target_id.is_empty())
        .collect();

    let targets = state.db.get_targets().map_err(|e| e.to_string())?;

    let mut records = Vec::new();
    for finding in target_findings {
        let target = targets
            .iter()
            .find(|t| t.id == finding.target_id)
            .cloned()
            .unwrap_or_else(|| Target {
                id: finding.target_id.clone(),
                name: "Default Target".to_string(),
                primary_url: finding.affected_asset.clone(),
                created_at: chrono::Utc::now().to_rfc3339(),
                scope: ScopeConfig {
                    allow_local_lab: true,
                    ..Default::default()
                },
            });

        if let Ok(rec) = validator::VulnerabilityValidator::validate_finding(&target, &finding).await {
            let _ = state.db.insert_validation_record(&rec);
            let _ = state.db.update_finding_validation(&finding.id, &rec.status, rec.confidence_score);
            records.push(rec);
        }
    }

    Ok(records)
}

#[tauri::command]
fn get_validation_history(
    state: State<'_, AppState>,
    finding_id: String,
) -> Result<Vec<validator::ValidationRecord>, String> {
    state.db.get_validation_history(&finding_id).map_err(|e| e.to_string())
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
async fn submit_ai_task(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    conversation_id: String,
    model: String,
    system: Option<String>,
    messages: Vec<ai::ChatMessage>,
) -> Result<models::AiTask, String> {
    state
        .ai_task_mgr
        .submit_task(Some(app_handle), conversation_id, model, system, messages)
        .await
}

#[tauri::command]
fn get_ai_tasks(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<models::AiTask>, String> {
    state.ai_task_mgr.get_tasks(limit)
}

#[tauri::command]
fn get_ai_task_status(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<Option<models::AiTask>, String> {
    state.ai_task_mgr.get_task_status(&task_id)
}

#[tauri::command]
async fn cancel_ai_task(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    task_id: String,
) -> Result<bool, String> {
    state.ai_task_mgr.cancel_task(Some(app_handle), &task_id).await
}

#[tauri::command]
fn clear_ai_tasks(state: State<'_, AppState>) -> Result<(), String> {
    state.ai_task_mgr.clear_tasks()
}

#[tauri::command]
fn get_conversation_messages(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<Vec<models::AiChatMessageRecord>, String> {
    state
        .db
        .get_conversation_messages(&conversation_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_conversation_message(
    state: State<'_, AppState>,
    conversation_id: String,
    role: String,
    content: String,
    task_id: Option<String>,
) -> Result<models::AiChatMessageRecord, String> {
    let msg = models::AiChatMessageRecord {
        id: Uuid::new_v4().to_string(),
        conversation_id,
        role,
        content,
        timestamp: chrono::Utc::now().to_rfc3339(),
        task_id,
    };
    state
        .db
        .insert_chat_message(&msg)
        .map_err(|e| e.to_string())?;
    Ok(msg)
}

#[tauri::command]
fn clear_conversation_messages(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(), String> {
    state
        .db
        .clear_conversation_messages(&conversation_id)
        .map_err(|e| e.to_string())
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
fn get_current_user_role(state: State<'_, AppState>) -> String {
    match state.current_user_role {
        UserRole::Admin => "Admin".to_string(),
        UserRole::Viewer => "Viewer".to_string(),
    }
}

#[tauri::command]
fn update_finding_status(
    state: State<'_, AppState>,
    finding_id: String,
    status: String,
) -> Result<(), String> {
    if state.current_user_role != UserRole::Admin {
        return Err("Permission denied: only admins may update finding status".into());
    }
    state.db.update_finding_status(&finding_id, &status).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_finding(
    state: State<'_, AppState>,
    target_id: String,
    title: String,
    severity: String,
    confidence: u8,
    affected_asset: String,
    evidence: String,
    source_tool: String,
    cwe: Option<String>,
    remediation: String,
    status: Option<String>,
) -> Result<Finding, String> {
    let sev = match severity.as_str() {
        "Critical" => FindingSeverity::Critical,
        "High" => FindingSeverity::High,
        "Medium" => FindingSeverity::Medium,
        "Low" => FindingSeverity::Low,
        _ => FindingSeverity::Info,
    };
    let stat = match status.as_deref().unwrap_or("NeedsReview") {
        "Confirmed" => FindingStatus::Confirmed,
        "Fixed" => FindingStatus::Fixed,
        "AcceptedRisk" => FindingStatus::AcceptedRisk,
        "LikelyFalsePositive" => FindingStatus::LikelyFalsePositive,
        "NeedsValidation" => FindingStatus::NeedsValidation,
        _ => FindingStatus::NeedsReview,
    };

    let mut finding = Finding::new(
        target_id.clone(),
        title.clone(),
        sev,
        confidence,
        affected_asset.clone(),
        evidence,
        source_tool,
        "manual-1.0".to_string(),
        cwe,
        remediation,
    );
    finding.status = stat;

    state.db.insert_finding(&finding).map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event(
        "finding",
        &finding.id,
        "CREATE",
        &format!("Created finding '{}' ({:?}) on {}", title, finding.severity, affected_asset),
    );
    Ok(finding)
}

#[tauri::command]
fn update_finding(
    state: State<'_, AppState>,
    finding_id: String,
    payload: FindingUpdatePayload,
) -> Result<Finding, String> {
    let updated = state
        .db
        .update_finding(&finding_id, &payload)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Finding not found".to_string())?;

    let _ = state.db.log_audit_event(
        "finding",
        &finding_id,
        "UPDATE",
        &format!("Updated finding '{}' ({:?}, {:?})", payload.title, payload.severity, payload.status),
    );
    Ok(updated)
}

#[tauri::command]
fn delete_finding(
    state: State<'_, AppState>,
    finding_id: Option<String>,
    id: Option<String>,
) -> Result<bool, String> {
    let target_id = finding_id
        .or(id)
        .ok_or_else(|| "Missing required parameter: findingId or id".to_string())?;
    let deleted = state.db.delete_finding(&target_id).map_err(|e| e.to_string())?;
    if deleted {
        let _ = state.db.log_audit_event("finding", &target_id, "DELETE", "Deleted finding and validation history");
    }
    Ok(deleted)
}

#[tauri::command]
fn bulk_update_finding_status(
    state: State<'_, AppState>,
    finding_ids: Option<Vec<String>>,
    ids: Option<Vec<String>>,
    status: Option<String>,
    new_status: Option<String>,
) -> Result<usize, String> {
    if state.current_user_role != UserRole::Admin {
        return Err("Permission denied: only admins may bulk update findings".into());
    }
    let target_ids = finding_ids
        .or(ids)
        .ok_or_else(|| "Missing required parameter: findingIds or ids".to_string())?;
    let target_status = status
        .or(new_status)
        .ok_or_else(|| "Missing required parameter: status or newStatus".to_string())?;
    let count = state
        .db
        .bulk_update_finding_status(&target_ids, &target_status)
        .map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event(
        "finding",
        "bulk",
        "BULK_UPDATE",
        &format!("Updated {} findings to status '{}'", count, target_status),
    );
    Ok(count)
}

#[tauri::command]
fn bulk_delete_findings(
    state: State<'_, AppState>,
    finding_ids: Option<Vec<String>>,
    ids: Option<Vec<String>>,
) -> Result<usize, String> {
    let target_ids = finding_ids
        .or(ids)
        .ok_or_else(|| "Missing required parameter: findingIds or ids".to_string())?;
    let count = state
        .db
        .bulk_delete_findings(&target_ids)
        .map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event(
        "finding",
        "bulk",
        "BULK_DELETE",
        &format!("Bulk deleted {} findings", count),
    );
    Ok(count)
}

#[tauri::command]
fn create_endpoint(
    state: State<'_, AppState>,
    target_id: String,
    url: String,
    method: String,
    status_code: u16,
    content_type: Option<String>,
    source: String,
) -> Result<DiscoveredEndpoint, String> {
    let ep = DiscoveredEndpoint {
        id: Uuid::new_v4().to_string(),
        target_id: target_id.clone(),
        url: url.clone(),
        method: method.to_uppercase(),
        status_code,
        content_type,
        source,
        discovered_at: chrono::Utc::now().to_rfc3339(),
    };
    state.db.insert_endpoint(&ep).map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event("endpoint", &ep.id, "CREATE", &format!("Added endpoint {} {}", ep.method, ep.url));
    Ok(ep)
}

#[tauri::command]
fn delete_endpoint(
    state: State<'_, AppState>,
    endpoint_id: Option<String>,
    id: Option<String>,
) -> Result<bool, String> {
    let target_id = endpoint_id
        .or(id)
        .ok_or_else(|| "Missing required parameter: endpointId or id".to_string())?;
    let deleted = state.db.delete_endpoint(&target_id).map_err(|e| e.to_string())?;
    if deleted {
        let _ = state.db.log_audit_event("endpoint", &target_id, "DELETE", "Deleted endpoint");
    }
    Ok(deleted)
}

#[tauri::command]
fn clear_endpoints(state: State<'_, AppState>, target_id: String) -> Result<usize, String> {
    let count = state.db.clear_endpoints(&target_id).map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event("endpoint", &target_id, "CLEAR", &format!("Cleared {} endpoints for target", count));
    Ok(count)
}

#[tauri::command]
fn delete_scan_history(
    state: State<'_, AppState>,
    scan_id: Option<String>,
    id: Option<String>,
) -> Result<bool, String> {
    let target_id = scan_id
        .or(id)
        .ok_or_else(|| "Missing required parameter: scanId or id".to_string())?;
    let deleted = state.db.delete_scan_history(&target_id).map_err(|e| e.to_string())?;
    if deleted {
        let _ = state.db.log_audit_event("scan", &target_id, "DELETE", "Deleted scan history record");
    }
    Ok(deleted)
}

#[tauri::command]
fn clear_scan_history(state: State<'_, AppState>) -> Result<(), String> {
    state.db.clear_scan_history().map_err(|e| e.to_string())?;
    let _ = state.db.log_audit_event("scan", "all", "CLEAR", "Cleared all scan execution records");
    Ok(())
}

#[tauri::command]
fn get_audit_logs(state: State<'_, AppState>, limit: Option<usize>) -> Result<Vec<AuditLogRecord>, String> {
    state.db.get_audit_logs(limit).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_audit_logs(state: State<'_, AppState>) -> Result<(), String> {
    state.db.clear_audit_logs().map_err(|e| e.to_string())
}

#[tauri::command]
fn record_issue(state: State<'_, AppState>, payload: IssueCreatePayload) -> Result<IssueRecord, String> {
    state.db.record_issue(&payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_issues(
    state: State<'_, AppState>,
    target_id: Option<String>,
    category: Option<String>,
    severity: Option<String>,
    status: Option<String>,
    search: Option<String>,
) -> Result<Vec<IssueRecord>, String> {
    state
        .db
        .get_issues(
            target_id.as_deref(),
            category.as_deref(),
            severity.as_deref(),
            status.as_deref(),
            search.as_deref(),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_issue_by_id(state: State<'_, AppState>, id: String) -> Result<Option<IssueRecord>, String> {
    state.db.get_issue_by_id(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_issue(
    state: State<'_, AppState>,
    id: String,
    payload: IssueUpdatePayload,
) -> Result<IssueRecord, String> {
    state.db.update_issue(&id, &payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_issue(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    state.db.delete_issue(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn bulk_update_issue_status(
    state: State<'_, AppState>,
    ids: Vec<String>,
    status: String,
) -> Result<usize, String> {
    state.db.bulk_update_issue_status(&ids, &status).map_err(|e| e.to_string())
}

#[tauri::command]
fn bulk_delete_issues(state: State<'_, AppState>, ids: Vec<String>) -> Result<usize, String> {
    state.db.bulk_delete_issues(&ids).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_issue_note(
    state: State<'_, AppState>,
    id: String,
    author: String,
    text: String,
) -> Result<IssueRecord, String> {
    state.db.add_issue_note(&id, &author, &text).map_err(|e| e.to_string())
}

#[tauri::command]
fn generate_issue_report(
    state: State<'_, AppState>,
    params: ReportGenerateParams,
) -> Result<GeneratedReport, String> {
    state.db.generate_issue_report(&params).map_err(|e| e.to_string())
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
fn get_system_resource_status() -> system_resources::SystemResourceStatus {
    system_resources::query_system_resources()
}

#[tauri::command]
fn toggle_tool_adapter_enabled(
    state: State<'_, AppState>,
    tool_id: String,
    enabled: bool,
) -> Result<(), String> {
    let _ = state.db.save_tool_enabled_state(&tool_id, enabled);
    state.adapter_registry.set_enabled(tool_id, enabled);
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

    let scan_id = Uuid::new_v4().to_string();

    let _ = state.db.insert_scan_event(&ScanEvent {
        id: Uuid::new_v4().to_string(),
        scan_id: scan_id.clone(),
        job_id: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
        event_type: "tool_executed".to_string(),
        severity: "info".to_string(),
        component_or_tool: tool_id.clone(),
        message: format!("Executing tool adapter '{}' against target '{}'", tool_id, target_url),
        metadata_json: serde_json::json!({ "target_id": target_id, "target_url": target_url }).to_string(),
        duration_ms: 0,
        status: "running".to_string(),
        related_finding_id: None,
        error_details: None,
    });

    let input = adapters::AdapterInput {
        target_id: target_id.clone(),
        target_url: target_url.clone(),
        parameters: parameters.unwrap_or_default(),
        timeout_seconds: Some(300),
    };

    let output = state.adapter_registry.execute(&tool_id, input).await?;

    for finding in &output.findings {
        let _ = state.db.insert_finding(finding);
        let _ = state.db.insert_scan_event(&ScanEvent {
            id: Uuid::new_v4().to_string(),
            scan_id: scan_id.clone(),
            job_id: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
            event_type: "candidate_finding_created".to_string(),
            severity: match finding.severity {
                FindingSeverity::Critical | FindingSeverity::High => "warning".to_string(),
                _ => "info".to_string(),
            },
            component_or_tool: tool_id.clone(),
            message: format!("Tool adapter {} produced finding: '{}'", tool_id, finding.title),
            metadata_json: serde_json::json!({ "cwe": finding.cwe, "confidence": finding.confidence }).to_string(),
            duration_ms: 0,
            status: "success".to_string(),
            related_finding_id: Some(finding.id.clone()),
            error_details: None,
        });
    }
    for ep in &output.endpoints {
        let _ = state.db.insert_endpoint(ep);
    }

    let _ = state.db.insert_scan_event(&ScanEvent {
        id: Uuid::new_v4().to_string(),
        scan_id,
        job_id: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
        event_type: "scan_completed".to_string(),
        severity: "success".to_string(),
        component_or_tool: tool_id.clone(),
        message: format!("Tool adapter {} completed in {}ms. Found {} findings and {} endpoints.", tool_id, output.duration_ms, output.findings.len(), output.endpoints.len()),
        metadata_json: serde_json::json!({ "findings_count": output.findings.len(), "duration_ms": output.duration_ms }).to_string(),
        duration_ms: output.duration_ms,
        status: "success".to_string(),
        related_finding_id: None,
        error_details: None,
    });

    Ok(output)
}

#[tauri::command]
fn get_methodologies() -> Vec<methodologies::MethodologyDefinition> {
    methodologies::MethodologyRegistry::get_all()
}

#[tauri::command]
fn get_methodology_by_id(id: String) -> Option<methodologies::MethodologyDefinition> {
    methodologies::MethodologyRegistry::find_by_id(&id)
}

#[tauri::command]
fn get_scan_events(
    state: State<'_, AppState>,
    scan_id: Option<String>,
    finding_id: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<ScanEvent>, String> {
    state.db.get_scan_events(scan_id.as_deref(), finding_id.as_deref(), limit).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_finding_trace(
    state: State<'_, AppState>,
    finding_id: String,
) -> Result<FindingDetectionTrace, String> {
    let finding = state
        .db
        .get_finding_by_id(&finding_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Finding not found".to_string())?;

    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target_url = targets
        .iter()
        .find(|t| t.id == finding.target_id)
        .map(|t| t.primary_url.clone())
        .unwrap_or_else(|| finding.affected_asset.clone());

    let methodology = methodologies::MethodologyRegistry::find_for_finding(
        &finding.title,
        &finding.source_tool,
        finding.cwe.as_deref(),
    );

    let val_records = state.db.get_validation_history(&finding_id).unwrap_or_default();
    let latest_val = val_records.into_iter().next();

    let scan_events = state.db.get_scan_events(None, Some(&finding_id), Some(50)).unwrap_or_default();

    let sanitized_evidence = validator::VulnerabilityValidator::sanitize_evidence(&finding.evidence);

    let human_explanation = if !sanitized_evidence.is_empty() {
        format!(
            "AppSec discovered '{}' because {} (rule '{}') inspected '{}' under the {} methodology and observed: {}",
            finding.title,
            finding.source_tool,
            finding.cwe.as_deref().unwrap_or(&methodology.id),
            finding.affected_asset,
            methodology.name,
            sanitized_evidence
        )
    } else {
        format!(
            "AppSec flagged this finding via {} under methodology {}. The tool reported a candidate issue for '{}'.",
            finding.source_tool, methodology.name, finding.affected_asset
        )
    };

    Ok(FindingDetectionTrace {
        finding_id: finding.id.clone(),
        scan_id: scan_events.first().map(|e| e.scan_id.clone()),
        detection_timestamp: finding.created_at.clone(),
        target_url,
        tool_name: finding.source_tool.clone(),
        tool_version: finding.tool_version.clone(),
        rule_id: finding.cwe.clone().unwrap_or_else(|| format!("{}-RULE", methodology.id)),
        rule_description: format!("Deterministic check for {} under {}", finding.title, methodology.name),
        methodology_id: methodology.id.clone(),
        methodology_name: methodology.name.clone(),
        location_examined: finding.affected_asset.clone(),
        check_performed: methodology.detection_logic.clone(),
        raw_observed_result: sanitized_evidence.clone(),
        evidence_summary: sanitized_evidence,
        human_explanation,
        verification_status: finding.validation_status.clone(),
        verification_record: latest_val,
        limitations: methodology.known_limitations.clone(),
        scan_events,
    })
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

#[tauri::command]
async fn test_burp_proxy_connection(host: String, port: u16) -> burp::BurpConnectionStatus {
    burp::BurpService::test_connection(&host, port).await
}

#[tauri::command]
async fn send_burp_repeater_request(
    request: burp::BurpRepeaterRequest,
) -> Result<burp::BurpRepeaterResponse, String> {
    burp::BurpService::send_repeater_request(request).await
}

#[tauri::command]
fn parse_burp_xml_findings(
    target_id: String,
    xml_content: String,
) -> Result<Vec<Finding>, String> {
    burp::BurpService::parse_burp_xml(&target_id, &xml_content)
}

#[tauri::command]
fn import_burp_findings(
    state: State<'_, AppState>,
    target_id: String,
    xml_content: String,
) -> Result<usize, String> {
    let findings = burp::BurpService::parse_burp_xml(&target_id, &xml_content)?;
    let count = findings.len();
    for f in &findings {
        let _ = state.db.insert_finding(f);
    }
    Ok(count)
}

#[tauri::command]
fn get_burp_connector_status() -> burp::BurpConnectorStatus {
    burp::get_connector_status()
}

#[tauri::command]
fn regenerate_burp_connector_token(state: State<'_, AppState>) -> Result<String, String> {
    let token = state.db.regenerate_burp_token().map_err(|e| e.to_string())?;
    burp::update_connector_token(&token);
    Ok(token)
}

#[tauri::command]
fn get_burp_traffic(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
    search: Option<String>,
    method: Option<String>,
) -> Result<Vec<burp::BurpTrafficItem>, String> {
    state
        .db
        .get_burp_traffic(limit, offset, search.as_deref(), method.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_burp_traffic(state: State<'_, AppState>) -> Result<usize, String> {
    state.db.clear_burp_traffic().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_burp_traffic_item(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    state.db.delete_burp_traffic_item(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_burp_traffic_json(state: State<'_, AppState>, content: String) -> Result<usize, String> {
    let items = burp::BurpService::parse_burp_json_traffic(&content)?;
    let mut imported = 0;
    for item in &items {
        let hash = burp::BurpService::compute_traffic_hash(item);
        if state.db.insert_burp_traffic(item, &hash).unwrap_or(false) {
            imported += 1;
        }
    }
    Ok(imported)
}

#[tauri::command]
fn import_burp_findings_json(
    state: State<'_, AppState>,
    target_id: String,
    content: String,
) -> Result<usize, String> {
    let findings = burp::BurpService::parse_burp_json_findings(&target_id, &content)?;
    let count = findings.len();
    for f in &findings {
        let _ = state.db.insert_finding(f);
    }
    Ok(count)
}

// =========================================================================
// Taxonomy Engine & Assessment Execution Tauri Commands
// =========================================================================

#[tauri::command]
fn get_taxonomy_domains(state: State<'_, AppState>) -> Result<Vec<TaxonomyDomainRecord>, String> {
    state.db.get_taxonomy_domains().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_taxonomy_categories(
    state: State<'_, AppState>,
    domain_id: Option<String>,
) -> Result<Vec<TaxonomyCategoryRecord>, String> {
    state.db.get_taxonomy_categories(domain_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_test_cases(
    state: State<'_, AppState>,
    category_id: Option<String>,
    domain_id: Option<String>,
) -> Result<Vec<TestCaseDefinition>, String> {
    state.db.get_test_cases(category_id, domain_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_assessment_templates(
    state: State<'_, AppState>,
    category_id: Option<String>,
) -> Result<Vec<AssessmentTemplateRecord>, String> {
    state.db.get_assessment_templates(category_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_assessment_runs(
    state: State<'_, AppState>,
    target_id: Option<String>,
) -> Result<Vec<AssessmentRunRecord>, String> {
    state.db.get_assessment_runs(target_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_test_executions(
    state: State<'_, AppState>,
    assessment_run_id: String,
) -> Result<Vec<TestCaseExecutionRecord>, String> {
    state.db.get_test_executions(&assessment_run_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_assessment_run(
    state: State<'_, AppState>,
    title: String,
    target_id: String,
    domain_id: String,
    category_id: String,
    template_id: String,
) -> Result<AssessmentRunRecord, String> {
    if state.current_user_role != UserRole::Admin {
        return Err("Permission denied: only admins may start an assessment run".into());
    }

    let targets = state.db.get_targets().map_err(|e| e.to_string())?;
    let target = targets
        .into_iter()
        .find(|t| t.id == target_id)
        .ok_or_else(|| "Target not found".to_string())?;

    let templates = state.db.get_assessment_templates(Some(category_id.clone())).map_err(|e| e.to_string())?;
    let template = templates
        .into_iter()
        .find(|tpl| tpl.id == template_id)
        .ok_or_else(|| "Assessment template not found".to_string())?;

    let run_id = format!("RUN-{}", &Uuid::new_v4().to_string()[..8].to_uppercase());
    let now = chrono::Utc::now().to_rfc3339();

    // Parse template test case IDs
    let test_case_ids: Vec<String> = serde_json::from_str(&template.test_case_ids_json).unwrap_or_default();
    let total_tests = test_case_ids.len();

    let run = AssessmentRunRecord {
        id: run_id.clone(),
        title,
        target_id: target.id,
        target_url: target.primary_url,
        domain_id,
        category_id,
        template_id: template.id,
        template_version: template.version,
        status: "Running".to_string(),
        started_at: now.clone(),
        completed_at: None,
        total_tests,
        passed_tests: 0,
        failed_tests: 0,
        inconclusive_tests: 0,
        not_applicable_tests: 0,
        notes: String::new(),
    };

    state.db.insert_assessment_run(&run).map_err(|e| e.to_string())?;

    // Pre-populate individual test case execution rows in "NotStarted" status
    for tc_id in test_case_ids {
        let exec_id = format!("EXEC-{}", &Uuid::new_v4().to_string()[..8].to_uppercase());
        let exec = TestCaseExecutionRecord {
            id: exec_id,
            assessment_run_id: run_id.clone(),
            test_case_id: tc_id,
            status: "NotStarted".to_string(),
            execution_mode: "Manual".to_string(),
            observed_evidence: None,
            operator_notes: None,
            related_finding_id: None,
            executed_at: None,
            duration_ms: 0,
        };
        let _ = state.db.update_test_execution(&exec);
    }

    let _ = state.db.log_audit_event(
        "assessment_run",
        &run_id,
        "CREATE",
        &format!("Initialized assessment run '{}' against {}", run.title, run.target_url),
    );

    Ok(run)
}

#[tauri::command]
fn update_test_case_execution(
    state: State<'_, AppState>,
    assessment_run_id: String,
    test_case_id: String,
    status: String,
    execution_mode: String,
    observed_evidence: Option<String>,
    operator_notes: Option<String>,
) -> Result<TestCaseExecutionRecord, String> {
    if state.current_user_role != UserRole::Admin {
        return Err("Permission denied: only admins may record test execution results".into());
    }

    let executions = state.db.get_test_executions(&assessment_run_id).map_err(|e| e.to_string())?;
    let existing = executions
        .into_iter()
        .find(|ex| ex.test_case_id == test_case_id);

    let exec_id = existing
        .as_ref()
        .map(|e| e.id.clone())
        .unwrap_or_else(|| format!("EXEC-{}", &Uuid::new_v4().to_string()[..8].to_uppercase()));

    let updated = TestCaseExecutionRecord {
        id: exec_id,
        assessment_run_id: assessment_run_id.clone(),
        test_case_id,
        status,
        execution_mode,
        observed_evidence,
        operator_notes,
        related_finding_id: existing.and_then(|e| e.related_finding_id),
        executed_at: Some(chrono::Utc::now().to_rfc3339()),
        duration_ms: 0,
    };

    state.db.update_test_execution(&updated).map_err(|e| e.to_string())?;

    // Recompute parent assessment_run stats
    let all_execs = state.db.get_test_executions(&assessment_run_id).map_err(|e| e.to_string())?;
    let runs = state.db.get_assessment_runs(None).map_err(|e| e.to_string())?;
    if let Some(mut run) = runs.into_iter().find(|r| r.id == assessment_run_id) {
        run.passed_tests = all_execs.iter().filter(|e| e.status == "Passed").count();
        run.failed_tests = all_execs.iter().filter(|e| e.status == "Failed").count();
        run.inconclusive_tests = all_execs.iter().filter(|e| e.status == "Inconclusive").count();
        run.not_applicable_tests = all_execs.iter().filter(|e| e.status == "NotApplicable").count();
        if all_execs.iter().all(|e| e.status != "NotStarted") {
            run.status = "Completed".to_string();
            run.completed_at = Some(chrono::Utc::now().to_rfc3339());
        }
        let _ = state.db.insert_assessment_run(&run);
    }

    Ok(updated)
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
                    .args(["/F", "/FI", &format!("PID ne {}", current_pid), "/IM", "AppSec-Nexus.exe"])
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
    let connector_db = arc_db.clone();
    let tool_mgr = ToolManager::new(tools_bin.clone());
    let plugin_mgr = PluginManager::new(plugins_dir);
    let feed_mgr = ThreatFeedManager::new(tools_bin.clone());
    let ai_mentor = Arc::new(AiMentor::new());
    let ai_task_mgr = Arc::new(ai::AiTaskManager::new(ai_mentor.clone(), arc_db.clone()));

    let adapter_registry = Arc::new(adapters::AdapterRegistry::new(tools_bin.clone()));
    if let Ok(overrides) = arc_db.get_tool_path_overrides() {
        adapter_registry.load_custom_paths(overrides);
    }
    if let Ok(states) = arc_db.get_tool_enabled_states() {
        adapter_registry.load_enabled_states(states);
    }

    let extension_engine = Arc::new(extensions::ExtensionEngine::new(extensions_dir));
    let job_manager = Arc::new(orchestration::JobManager::new(
        adapter_registry.clone(),
        extension_engine.clone(),
        arc_db.clone(),
    ));
    let heretic_supervisor = Arc::new(heretic::HereticJobSupervisor::new());

    let state = AppState {
        db: arc_db,
        tool_mgr,
        plugin_mgr,
        feed_mgr,
        ai_mentor,
        ai_task_mgr,
        adapter_registry,
        extension_engine,
        job_manager,
        heretic_supervisor,
        current_user_role: UserRole::Admin,
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

            let conn_db = connector_db.clone();
            let conn_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                burp::start_burp_connector_server(conn_db, Some(conn_handle)).await;
            });

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
            get_deepseek_status,
            get_ollama_system_info,
            start_ollama_service,
            stop_ollama_service,
            export_report,
            get_scan_history,
            update_finding_status,
            export_report_json,
            pull_ai_model,
            run_crawler,
            get_endpoints,
            import_external_report,
            chat_with_mentor,
            submit_ai_task,
            get_ai_tasks,
            get_ai_task_status,
            cancel_ai_task,
            clear_ai_tasks,
            get_conversation_messages,
            save_conversation_message,
            clear_conversation_messages,
            run_windows_audit,
            run_android_audit,
            get_system_resource_status,
            get_tool_adapters,
            toggle_tool_adapter_enabled,
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
            cancel_workflow_job,
            validate_finding,
            validate_all_findings,
            get_validation_history,
            update_target,
            delete_target,
            create_finding,
            update_finding,
            delete_finding,
            bulk_update_finding_status,
            bulk_delete_findings,
            create_endpoint,
            delete_endpoint,
            clear_endpoints,
            delete_scan_history,
            clear_scan_history,
            get_audit_logs,
            clear_audit_logs,
            record_issue,
            get_issues,
            get_issue_by_id,
            update_issue,
            delete_issue,
            bulk_update_issue_status,
            bulk_delete_issues,
            add_issue_note,
            generate_issue_report,
            test_burp_proxy_connection,
            send_burp_repeater_request,
            parse_burp_xml_findings,
            import_burp_findings,
            get_burp_connector_status,
            regenerate_burp_connector_token,
            get_burp_traffic,
            clear_burp_traffic,
            delete_burp_traffic_item,
            import_burp_traffic_json,
            import_burp_findings_json,
            get_methodologies,
            get_methodology_by_id,
            get_scan_events,
            get_finding_trace,
            get_current_user_role,
            get_taxonomy_domains,
            get_taxonomy_categories,
            get_test_cases,
            get_assessment_templates,
            get_assessment_runs,
            get_test_executions,
            create_assessment_run,
            update_test_case_execution,
            heretic::detect_heretic_hardware,
            heretic::setup_heretic_environment,
            heretic::start_heretic_job,
            heretic::get_heretic_jobs,
            heretic::get_heretic_job_logs,
            heretic::cancel_heretic_job,
            heretic::validate_heretic_export,
            heretic::import_heretic_to_ollama,
            heretic::run_heretic_evaluation,
            heretic::get_heretic_evaluations
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
            tauri::RunEvent::WindowEvent {
                event: tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed,
                ..
            } => {
                std::process::exit(0);
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

