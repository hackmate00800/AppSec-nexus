pub mod baseline;
pub mod docker;
pub mod external_gui;
pub mod httpx;
pub mod nmap;
pub mod nuclei;
pub mod ollama;
pub mod semgrep;
pub mod sqlmap;

use baseline::NativeBaselineAdapter;
use docker::DockerAdapter;
use external_gui::ExternalGuiAdapter;
use httpx::HttpxAdapter;
use nmap::NmapAdapter;
use nuclei::NucleiAdapter;
use ollama::OllamaAdapter;
use semgrep::SemgrepAdapter;
use sqlmap::SqlmapAdapter;

use crate::models::{DiscoveredEndpoint, Finding};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

/// Integration style for the security tool
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum IntegrationType {
    /// In-process native Rust implementation
    NativeEngine,
    /// Local CLI process with stdin/stdout parsing
    CliProcess,
    /// Local or remote HTTP REST/RPC service
    LocalHttpApi,
    /// Ephemeral or long-running Docker container
    DockerContainer,
    /// Desktop GUI application (Burp, ZAP, Wireshark)
    ExternalGui,
    /// File/report importer & passive log parser
    PassiveParser,
}

/// Bounded detection states according to the master plan
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ToolDetectionState {
    /// Detected, verified responsive and compatible
    InstalledAndReady,
    /// Path or binary located, but test failed or incompatible version
    Misconfigured,
    /// Binary exists or port listening, but required dependency/service is down
    DetectedUnavailable,
    /// Binary not found on host filesystem or standard search paths
    NotInstalled,
    /// Adapter defined as specification/reference, runner not yet compiled
    IntegrationNotImplemented,
    /// Tool is not supported on host OS (e.g. Linux-only tool on Windows)
    UnsupportedOs,
    /// Host requires administrative elevation or security approval
    PermissionRequired,
    /// Runtime verification or health probe returned an error
    HealthCheckFailed,
}

/// Capabilities supported by tools
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ToolCapability {
    PassiveAudit,
    PortScan,
    DnsDiscovery,
    HttpProbing,
    TechDetection,
    Crawling,
    VulnScan,
    SastScan,
    InjectionTesting,
    AiReasoning,
    ReportExport,
    GuiLauncher,
}

/// Health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolHealthCheckResult {
    pub healthy: bool,
    pub detection_state: ToolDetectionState,
    pub detected_version: Option<String>,
    pub message: String,
    pub checked_at: String,
    pub latency_ms: u64,
}

/// Adapter metadata presented to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolAdapterMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    pub category: String,
    pub integration_type: IntegrationType,
    pub capabilities: Vec<ToolCapability>,
    pub detection_state: ToolDetectionState,
    pub resolved_path: Option<String>,
    pub custom_path: Option<String>,
    pub is_available: bool,
    pub description: String,
    pub documentation_url: String,
    pub requires_docker: bool,
}

/// Standardized input for any tool adapter
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AdapterInput {
    pub target_id: String,
    pub target_url: String,
    pub parameters: HashMap<String, String>,
    pub timeout_seconds: Option<u64>,
}

/// Standardized output from any tool execution
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AdapterOutput {
    pub tool_id: String,
    pub target_url: String,
    pub status: String, // "Success", "Failed", "Cancelled", "Warning"
    pub logs: Vec<String>,
    pub findings: Vec<Finding>,
    pub endpoints: Vec<DiscoveredEndpoint>,
    pub artifacts: HashMap<String, String>,
    pub duration_ms: u64,
}

/// Universal Trait for Security Tool Adapters
pub trait SecurityToolAdapter: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn default_version(&self) -> &str;
    fn category(&self) -> &str;
    fn integration_type(&self) -> IntegrationType;
    fn capabilities(&self) -> Vec<ToolCapability>;
    fn description(&self) -> &str;
    fn documentation_url(&self) -> &str;

    /// Resolves executable path considering custom overrides and standard system locations
    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String>;

    /// Inspects host environment and determines exact detection state
    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState;

    /// Performs live health check / version query against host
    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>>;

    /// Executes tool against target within scope bounds
    fn execute<'a>(
        &'a self,
        custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>>;
}

/// Central registry managing all tool adapters
pub struct AdapterRegistry {
    adapters: HashMap<String, Box<dyn SecurityToolAdapter>>,
    custom_paths: Arc<RwLock<HashMap<String, String>>>,
}

impl AdapterRegistry {
    pub fn new(bin_dir: PathBuf) -> Self {
        let mut map: HashMap<String, Box<dyn SecurityToolAdapter>> = HashMap::new();

        // 1. Native baseline
        let b = NativeBaselineAdapter::new();
        map.insert(b.id().to_string(), Box::new(b));

        // 2. Nuclei
        let n = NucleiAdapter::new(bin_dir.clone());
        map.insert(n.id().to_string(), Box::new(n));

        // 3. httpx
        let h = HttpxAdapter::new(bin_dir.clone());
        map.insert(h.id().to_string(), Box::new(h));

        // 4. nmap
        let nm = NmapAdapter::new(bin_dir.clone());
        map.insert(nm.id().to_string(), Box::new(nm));

        // 5. ollama
        let o = OllamaAdapter::new();
        map.insert(o.id().to_string(), Box::new(o));

        // 6. docker
        let d = DockerAdapter::new();
        map.insert(d.id().to_string(), Box::new(d));

        // 7. semgrep
        let s = SemgrepAdapter::new();
        map.insert(s.id().to_string(), Box::new(s));

        // 8. sqlmap
        let sq = SqlmapAdapter::new();
        map.insert(sq.id().to_string(), Box::new(sq));

        // 9. External GUI Tools
        let burp = ExternalGuiAdapter::new_burp();
        map.insert(burp.id().to_string(), Box::new(burp));

        let zap = ExternalGuiAdapter::new_zap();
        map.insert(zap.id().to_string(), Box::new(zap));

        let wire = ExternalGuiAdapter::new_wireshark();
        map.insert(wire.id().to_string(), Box::new(wire));

        Self {
            adapters: map,
            custom_paths: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn list_adapters(&self) -> Vec<ToolAdapterMetadata> {
        let paths = self.custom_paths.read().unwrap();
        let mut list = Vec::new();

        for adapter in self.adapters.values() {
            let custom = paths.get(adapter.id()).map(|s| s.as_str());
            let detection_state = adapter.detect(custom);
            let is_available = detection_state == ToolDetectionState::InstalledAndReady;
            let resolved_path = adapter.resolve_path(custom);

            list.push(ToolAdapterMetadata {
                id: adapter.id().to_string(),
                name: adapter.name().to_string(),
                version: adapter.default_version().to_string(),
                category: adapter.category().to_string(),
                integration_type: adapter.integration_type(),
                capabilities: adapter.capabilities(),
                detection_state,
                resolved_path,
                custom_path: custom.map(|s| s.to_string()),
                is_available,
                description: adapter.description().to_string(),
                documentation_url: adapter.documentation_url().to_string(),
                requires_docker: adapter.integration_type() == IntegrationType::DockerContainer,
            });
        }

        // Keep deterministic order: baseline, nuclei, httpx, nmap, ollama, docker, semgrep, sqlmap, burp, zap, wireshark
        let order = [
            "baseline", "nuclei", "httpx", "nmap", "ollama", "docker", "semgrep", "sqlmap",
            "burpsuite", "owasp_zap", "wireshark",
        ];
        list.sort_by_key(|item| {
            order.iter().position(|&x| x == item.id).unwrap_or(999)
        });

        list
    }

    pub fn get_adapter(&self, id: &str) -> Option<&Box<dyn SecurityToolAdapter>> {
        self.adapters.get(id)
    }

    pub fn set_custom_path(&self, tool_id: String, path: String) {
        let mut paths = self.custom_paths.write().unwrap();
        if path.trim().is_empty() {
            paths.remove(&tool_id);
        } else {
            paths.insert(tool_id, path.trim().to_string());
        }
    }

    pub fn load_custom_paths(&self, paths: HashMap<String, String>) {
        let mut current = self.custom_paths.write().unwrap();
        *current = paths;
    }

    pub fn get_custom_path(&self, tool_id: &str) -> Option<String> {
        let paths = self.custom_paths.read().unwrap();
        paths.get(tool_id).cloned()
    }

    pub async fn health_check(&self, id: &str) -> Result<ToolHealthCheckResult, String> {
        let adapter = self
            .adapters
            .get(id)
            .ok_or_else(|| format!("Tool adapter '{}' not found", id))?;

        let custom = self.get_custom_path(id);
        Ok(adapter.health_check(custom.as_deref()).await)
    }

    pub async fn execute(
        &self,
        id: &str,
        input: AdapterInput,
    ) -> Result<AdapterOutput, String> {
        let adapter = self
            .adapters
            .get(id)
            .ok_or_else(|| format!("Tool adapter '{}' not found", id))?;

        let custom = self.get_custom_path(id);
        adapter.execute(custom.as_deref(), input).await
    }
}
