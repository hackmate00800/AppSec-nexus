use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FindingStatus {
    New,
    Confirmed,
    NeedsReview,
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
            status: FindingStatus::New,
            created_at: chrono::Utc::now().to_rfc3339(),
            fingerprint,
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

