use serde::{Deserialize, Serialize};

// User role enum for permission handling
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum UserRole {
    Admin,
    Viewer,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::Viewer
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScopeConfig {
    pub allowed_hosts: Vec<String>,
    pub allowed_prefixes: Vec<String>,
    pub allowed_ports: Vec<u16>,
    pub excluded_paths: Vec<String>,
    pub allow_local_lab: bool,
}

impl Default for ScopeConfig {
    fn default() -> Self {
        Self {
            allowed_hosts: Vec::new(),
            allowed_prefixes: Vec::new(),
            allowed_ports: vec![80, 443, 8080, 8443, 3000, 5000],
            excluded_paths: vec![
                "/logout".to_string(),
                "/signout".to_string(),
                "/delete".to_string(),
            ],
            allow_local_lab: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Target {
    pub id: String,
    pub name: String,
    pub primary_url: String,
    pub created_at: String,
    pub scope: ScopeConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FindingSeverity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FindingStatus {
    New,
    NeedsValidation,
    Validating,
    Confirmed,
    LikelyTruePositive,
    NeedsReview,
    Unconfirmed,
    LikelyFalsePositive,
    ValidationFailed,
    NotApplicable,
    AcceptedRisk,
    Fixed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub id: String,
    pub target_id: String,
    pub title: String,
    pub severity: FindingSeverity,
    pub confidence: u8, // 0 - 100%
    pub affected_asset: String,
    pub evidence: String,
    pub source_tool: String,
    pub tool_version: String,
    pub cwe: Option<String>,
    pub remediation: String,
    pub status: FindingStatus,
    pub created_at: String,
    pub fingerprint: String,
    #[serde(default = "default_validation_status")]
    pub validation_status: String,
}

fn default_validation_status() -> String {
    "NEEDS_VALIDATION".to_string()
}

impl Finding {
    pub fn new(
        target_id: String,
        title: String,
        severity: FindingSeverity,
        confidence: u8,
        affected_asset: String,
        evidence: String,
        source_tool: String,
        tool_version: String,
        cwe: Option<String>,
        remediation: String,
    ) -> Self {
        let fingerprint = Self::calculate_fingerprint(&target_id, &title, &affected_asset);
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            target_id,
            title,
            severity,
            confidence,
            affected_asset,
            evidence,
            source_tool,
            tool_version,
            cwe,
            remediation,
            status: FindingStatus::NeedsValidation,
            created_at: chrono::Utc::now().to_rfc3339(),
            fingerprint,
            validation_status: "NEEDS_VALIDATION".to_string(),
        }
    }

    pub fn calculate_fingerprint(target_id: &str, title: &str, affected_asset: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(target_id.as_bytes());
        hasher.update(b":");
        hasher.update(title.as_bytes());
        hasher.update(b":");
        hasher.update(affected_asset.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub category: String,
    pub is_available: bool,
    pub path: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub scan_id: String,
    pub target_url: String,
    pub tool: String,
    pub status: String,
    pub logs: Vec<String>,
    pub findings_count: usize,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredEndpoint {
    pub id: String,
    pub target_id: String,
    pub url: String,
    pub method: String,
    pub status_code: u16,
    pub content_type: Option<String>,
    pub source: String,
    pub discovered_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPermissions {
    pub network: Vec<String>,
    pub filesystem: Vec<String>,
    pub environment: Vec<String>,
}

impl Default for PluginPermissions {
    fn default() -> Self {
        Self {
            network: vec!["in_scope_target_only".to_string()],
            filesystem: vec!["none".to_string()],
            environment: vec!["none".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: String,
    pub runtime: String, // "python3", "standalone", "node"
    pub executable: String,
    pub capabilities: Vec<String>,
    pub permissions: PluginPermissions,
    pub timeout_seconds: u64,
    pub description: String,
    pub path: String,
    pub is_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedUpdateResult {
    pub success: bool,
    pub nuclei_updated: bool,
    pub nuclei_output: String,
    pub cisa_kev_count: usize,
    pub last_updated: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekProviderStatus {
    pub is_configured: bool,
    pub endpoint: String,
    pub model: String,
    pub status: String, // "configured", "not_configured", "available", "auth_failed", "rate_limited", "quota_exceeded", "temporarily_unavailable"
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AiTaskStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for AiTaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Queued => write!(f, "Queued"),
            Self::Running => write!(f, "Running"),
            Self::Completed => write!(f, "Completed"),
            Self::Failed => write!(f, "Failed"),
            Self::Cancelled => write!(f, "Cancelled"),
        }
    }
}

impl From<&str> for AiTaskStatus {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "running" => Self::Running,
            "completed" => Self::Completed,
            "failed" => Self::Failed,
            "cancelled" | "canceled" => Self::Cancelled,
            _ => Self::Queued,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiTask {
    pub id: String,
    pub conversation_id: String,
    pub model: String,
    pub prompt_preview: String,
    pub status: AiTaskStatus,
    pub system_prompt: Option<String>,
    pub messages_json: String,
    pub result: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiChatMessageRecord {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
    pub task_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogRecord {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub details_json: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindingUpdatePayload {
    pub title: String,
    pub severity: FindingSeverity,
    pub confidence: u8,
    pub affected_asset: String,
    pub evidence: String,
    pub cwe: Option<String>,
    pub remediation: String,
    pub status: FindingStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueHistoryItem {
    pub timestamp: String,
    pub action: String,
    pub actor: String,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueNote {
    pub id: String,
    pub author: String,
    pub text: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueRecord {
    pub id: String,
    pub title: String,
    pub category: String,
    pub subtype: String,
    pub severity: String,
    pub status: String,
    pub verification_status: String,
    pub affected_target_id: Option<String>,
    pub affected_target_name: Option<String>,
    pub affected_component: String,
    pub source: String,
    pub occurrence_count: u32,
    pub first_detected: String,
    pub last_detected: String,
    pub description: String,
    pub reproduction_steps: Option<String>,
    pub expected_behavior: Option<String>,
    pub actual_behavior: Option<String>,
    pub error_details: Option<String>,
    pub evidence: Option<String>,
    pub root_cause: Option<String>,
    pub impact_assessment: Option<String>,
    pub remediation_guidance: Option<String>,
    pub tags_json: String,
    pub assigned_owner: Option<String>,
    pub notes_json: String,
    pub related_finding_id: Option<String>,
    pub related_tool_id: Option<String>,
    pub history_json: String,
    pub resolution_summary: Option<String>,
    pub resolved_at: Option<String>,
    pub fingerprint: String,
}

impl IssueRecord {
    pub fn calculate_fingerprint(category: &str, subtype: &str, affected_component: &str, title: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(category.trim().to_lowercase().as_bytes());
        hasher.update(b":");
        hasher.update(subtype.trim().to_lowercase().as_bytes());
        hasher.update(b":");
        hasher.update(affected_component.trim().to_lowercase().as_bytes());
        hasher.update(b":");
        hasher.update(title.trim().to_lowercase().as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueCreatePayload {
    pub title: String,
    pub category: String,
    pub subtype: Option<String>,
    pub severity: String,
    pub status: Option<String>,
    pub verification_status: Option<String>,
    pub affected_target_id: Option<String>,
    pub affected_target_name: Option<String>,
    pub affected_component: String,
    pub source: Option<String>,
    pub description: String,
    pub reproduction_steps: Option<String>,
    pub expected_behavior: Option<String>,
    pub actual_behavior: Option<String>,
    pub error_details: Option<String>,
    pub evidence: Option<String>,
    pub root_cause: Option<String>,
    pub impact_assessment: Option<String>,
    pub remediation_guidance: Option<String>,
    pub tags: Option<Vec<String>>,
    pub assigned_owner: Option<String>,
    pub related_finding_id: Option<String>,
    pub related_tool_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueUpdatePayload {
    pub title: Option<String>,
    pub category: Option<String>,
    pub subtype: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub verification_status: Option<String>,
    pub affected_component: Option<String>,
    pub description: Option<String>,
    pub reproduction_steps: Option<String>,
    pub expected_behavior: Option<String>,
    pub actual_behavior: Option<String>,
    pub error_details: Option<String>,
    pub evidence: Option<String>,
    pub root_cause: Option<String>,
    pub impact_assessment: Option<String>,
    pub remediation_guidance: Option<String>,
    pub tags: Option<Vec<String>>,
    pub assigned_owner: Option<String>,
    pub resolution_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportGenerateParams {
    pub title: String,
    pub template: String,
    pub target_id: Option<String>,
    pub issue_ids: Option<Vec<String>>,
    pub include_executive_summary: bool,
    pub include_evidence: bool,
    pub include_remediation: bool,
    pub include_history: bool,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedReport {
    pub id: String,
    pub title: String,
    pub template: String,
    pub generated_at: String,
    pub scope: String,
    pub total_issues: usize,
    pub metrics_json: String,
    pub content: String,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanEvent {
    pub id: String,
    pub scan_id: String,
    pub job_id: Option<String>,
    pub timestamp: String,
    pub event_type: String,
    pub severity: String,
    pub component_or_tool: String,
    pub message: String,
    pub metadata_json: String,
    pub duration_ms: u64,
    pub status: String,
    pub related_finding_id: Option<String>,
    pub error_details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindingDetectionTrace {
    pub finding_id: String,
    pub scan_id: Option<String>,
    pub detection_timestamp: String,
    pub target_url: String,
    pub tool_name: String,
    pub tool_version: String,
    pub rule_id: String,
    pub rule_description: String,
    pub methodology_id: String,
    pub methodology_name: String,
    pub location_examined: String,
    pub check_performed: String,
    pub raw_observed_result: String,
    pub evidence_summary: String,
    pub human_explanation: String,
    pub verification_status: String,
    pub verification_record: Option<crate::validator::ValidationRecord>,
    pub limitations: Vec<String>,
    pub scan_events: Vec<ScanEvent>,
}

// =========================================================================
// Category-Specific Taxonomy Engine & Assessment Execution Models
// =========================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxonomyDomainRecord {
    pub id: String,
    pub title: String,
    pub description: String,
    pub version: String,
    pub order_index: u32,
    pub icon_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxonomyCategoryRecord {
    pub id: String,
    pub domain_id: String,
    pub title: String,
    pub description: String,
    pub applicable_technologies_json: String,
    pub order_index: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseDefinition {
    pub id: String,
    pub category_id: String,
    pub domain_id: String,
    pub phase: String,
    pub subphase: String,
    pub title: String,
    pub description: String,
    pub objective: String,
    pub cwe: Option<String>,
    pub owasp_id: Option<String>,
    pub severity_guidance: String, // "Critical", "High", "Medium", "Low", "Info"
    pub safety_level: String, // "NonDestructive", "ActiveSafe", "IntrusiveRequiresApproval"
    pub manual_procedure: String,
    pub automated_tool_adapter: Option<String>,
    pub command_example: Option<String>,
    pub expected_secure_behavior: String,
    pub failure_indicators: String,
    pub pass_criteria: String,
    pub fail_criteria: String,
    pub inconclusive_criteria: String,
    pub not_applicable_criteria: String,
    pub evidence_requirements: String,
    pub remediation_guidance: String,
    pub safe_retest_procedure: String,
    pub references_json: String,
    pub applicable_tech_json: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentTemplateRecord {
    pub id: String,
    pub name: String,
    pub domain_id: String,
    pub category_id: String,
    pub description: String,
    pub version: String,
    pub is_builtin: bool,
    pub test_case_ids_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentRunRecord {
    pub id: String,
    pub title: String,
    pub target_id: String,
    pub target_url: String,
    pub domain_id: String,
    pub category_id: String,
    pub template_id: String,
    pub template_version: String,
    pub status: String, // "Pending", "Running", "Completed", "Cancelled"
    pub started_at: String,
    pub completed_at: Option<String>,
    pub total_tests: usize,
    pub passed_tests: usize,
    pub failed_tests: usize,
    pub inconclusive_tests: usize,
    pub not_applicable_tests: usize,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCaseExecutionRecord {
    pub id: String,
    pub assessment_run_id: String,
    pub test_case_id: String,
    pub status: String, // "NotStarted", "Passed", "Failed", "Inconclusive", "NotApplicable", "Skipped"
    pub execution_mode: String, // "Manual", "Automated", "ToolAssisted"
    pub observed_evidence: Option<String>,
    pub operator_notes: Option<String>,
    pub related_finding_id: Option<String>,
    pub executed_at: Option<String>,
    pub duration_ms: u64,
}

