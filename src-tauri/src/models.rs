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
