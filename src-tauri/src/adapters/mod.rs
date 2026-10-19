pub mod baseline;
pub mod checkov;
pub mod docker;
pub mod external_gui;
pub mod ffuf;
pub mod gitleaks;
pub mod httpx;
pub mod jadx;
pub mod katana;
pub mod nmap;
pub mod nuclei;
pub mod ollama;
pub mod osv_scanner;
pub mod schemathesis;
pub mod semgrep;
pub mod sqlmap;
pub mod trivy;
pub mod tshark;

use baseline::NativeBaselineAdapter;
use checkov::CheckovAdapter;
use docker::DockerAdapter;
use external_gui::ExternalGuiAdapter;
use ffuf::FfufAdapter;
use gitleaks::GitleaksAdapter;
use httpx::HttpxAdapter;
use jadx::JadxAdapter;
use katana::KatanaAdapter;
use nmap::NmapAdapter;
use nuclei::NucleiAdapter;
use ollama::OllamaAdapter;
use osv_scanner::OsvScannerAdapter;
use schemathesis::SchemathesisAdapter;
use semgrep::SemgrepAdapter;
use sqlmap::SqlmapAdapter;
use trivy::TrivyAdapter;
use tshark::TsharkAdapter;

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
    pub is_enabled: bool,
    pub install_source: Option<String>,
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

    fn install_source(&self) -> Option<String> {
        match self.id() {
            "baseline" => Some("Built-in Native Rust Engine".to_string()),
            "nuclei" => Some("Local Portable Binary (tools/bin)".to_string()),
            "httpx" => Some("Local Portable Binary (tools/bin)".to_string()),
            "katana" => Some("Local Portable Binary (tools/bin)".to_string()),
            "ffuf" => Some("WinGet Package (ffuf.ffuf)".to_string()),
            "schemathesis" => Some("Python pip (schemathesis)".to_string()),
            "semgrep" => Some("Python pip (semgrep)".to_string()),
            "gitleaks" => Some("WinGet Package (Gitleaks.Gitleaks)".to_string()),
            "osv_scanner" => Some("Google Portable Binary (tools/bin)".to_string()),
            "trivy" => Some("WinGet Package (AquaSecurity.Trivy)".to_string()),
            "checkov" => Some("Python pip (checkov)".to_string()),
            "nmap" => Some("Local System Nmap / Zenmap CLI".to_string()),
            "tshark" => Some("Wireshark & Npcap 1.88 Driver".to_string()),
            "jadx" => Some("Portable JADX 1.5.6 + JDK 21".to_string()),
            "ollama" => Some("Local Ollama Service (:11434)".to_string()),
            "docker" => Some("Docker Desktop CLI & Daemon".to_string()),
            "sqlmap" => Some("Python pip / Git CLI".to_string()),
            "burpsuite" => Some("Burp Suite Community Edition + Montoya Connector".to_string()),
            "owasp_zap" => Some("OWASP ZAP Desktop".to_string()),
            "wireshark" => Some("Wireshark GUI Desktop".to_string()),
            _ => None,
        }
    }

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
    enabled_states: Arc<RwLock<HashMap<String, bool>>>,
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

        // 4. katana
        let kat = KatanaAdapter::new(bin_dir.clone());
        map.insert(kat.id().to_string(), Box::new(kat));

        // 5. ffuf
        let f = FfufAdapter::new(bin_dir.clone());
        map.insert(f.id().to_string(), Box::new(f));

        // 6. schemathesis
        let st = SchemathesisAdapter::new();
        map.insert(st.id().to_string(), Box::new(st));

        // 7. semgrep
        let s = SemgrepAdapter::new();
        map.insert(s.id().to_string(), Box::new(s));

        // 8. gitleaks
        let gl = GitleaksAdapter::new();
        map.insert(gl.id().to_string(), Box::new(gl));

        // 9. osv_scanner
        let osv = OsvScannerAdapter::new(bin_dir.clone());
        map.insert(osv.id().to_string(), Box::new(osv));

        // 10. trivy
        let tr = TrivyAdapter::new();
        map.insert(tr.id().to_string(), Box::new(tr));

        // 11. checkov
        let ck = CheckovAdapter::new();
        map.insert(ck.id().to_string(), Box::new(ck));

        // 12. nmap
        let nm = NmapAdapter::new(bin_dir.clone());
        map.insert(nm.id().to_string(), Box::new(nm));

        // 13. tshark
        let tsh = TsharkAdapter::new();
        map.insert(tsh.id().to_string(), Box::new(tsh));

        // 14. jadx
        let jdx = JadxAdapter::new(bin_dir.clone());
        map.insert(jdx.id().to_string(), Box::new(jdx));

        // 15. ollama
        let o = OllamaAdapter::new();
        map.insert(o.id().to_string(), Box::new(o));

        // 16. docker
        let d = DockerAdapter::new();
        map.insert(d.id().to_string(), Box::new(d));

        // 17. sqlmap
        let sq = SqlmapAdapter::new();
        map.insert(sq.id().to_string(), Box::new(sq));

        // 18. External GUI Tools
        let burp = ExternalGuiAdapter::new_burp();
        map.insert(burp.id().to_string(), Box::new(burp));

        let zap = ExternalGuiAdapter::new_zap();
        map.insert(zap.id().to_string(), Box::new(zap));

        let wire = ExternalGuiAdapter::new_wireshark();
        map.insert(wire.id().to_string(), Box::new(wire));

        Self {
            adapters: map,
            custom_paths: Arc::new(RwLock::new(HashMap::new())),
            enabled_states: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn list_adapters(&self) -> Vec<ToolAdapterMetadata> {
        let paths = self.custom_paths.read().unwrap();
        let states = self.enabled_states.read().unwrap();
        let mut list = Vec::new();

        for adapter in self.adapters.values() {
            let custom = paths.get(adapter.id()).map(|s| s.as_str());
            let detection_state = adapter.detect(custom);
            let is_available = detection_state == ToolDetectionState::InstalledAndReady;
            let resolved_path = adapter.resolve_path(custom);
            let is_enabled = *states.get(adapter.id()).unwrap_or(&true);

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
                is_enabled,
                install_source: adapter.install_source(),
                description: adapter.description().to_string(),
                documentation_url: adapter.documentation_url().to_string(),
                requires_docker: adapter.integration_type() == IntegrationType::DockerContainer,
            });
        }

        // Keep deterministic categorized order:
        // Web & API -> SAST & Code -> Network & Android -> AI & Runtime -> External GUI
        let order = [
            "baseline", "nuclei", "httpx", "katana", "ffuf", "schemathesis",
            "semgrep", "gitleaks", "osv_scanner", "trivy", "checkov",
            "nmap", "tshark", "jadx", "ollama", "docker", "sqlmap",
            "burpsuite", "owasp_zap", "wireshark",
        ];
        list.sort_by_key(|item| {
            order.iter().position(|&x| x == item.id).unwrap_or(999)
        });

        list
    }

    pub fn is_enabled(&self, tool_id: &str) -> bool {
        let states = self.enabled_states.read().unwrap();
        *states.get(tool_id).unwrap_or(&true)
    }

    pub fn set_enabled(&self, tool_id: String, enabled: bool) {
        let mut states = self.enabled_states.write().unwrap();
        states.insert(tool_id, enabled);
    }

    pub fn load_enabled_states(&self, states: HashMap<String, bool>) {
        let mut current = self.enabled_states.write().unwrap();
        *current = states;
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
        if !self.is_enabled(id) {
            return Err(format!("Security tool '{}' is currently disabled in Tool Settings. Enable it before running scans.", id));
        }

        let adapter = self
            .adapters
            .get(id)
            .ok_or_else(|| format!("Tool adapter '{}' not found", id))?;

        let custom = self.get_custom_path(id);
        adapter.execute(custom.as_deref(), input).await
    }
}
