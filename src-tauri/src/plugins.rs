use crate::models::{Finding, FindingSeverity, PluginInfo, PluginPermissions, ScanResult};
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tokio::process::Command;
use uuid::Uuid;

pub struct PluginManager {
    plugins_dir: PathBuf,
}

#[derive(Deserialize)]
struct RawManifest {
    id: String,
    name: String,
    version: String,
    publisher: Option<String>,
    runtime: String,
    executable: String,
    capabilities: Option<Vec<String>>,
    permissions: Option<PluginPermissions>,
    timeout_seconds: Option<u64>,
    description: Option<String>,
}

#[derive(Deserialize)]
struct PluginOutputFinding {
    title: String,
    severity: String,
    confidence: Option<u8>,
    summary: String,
    evidence: String,
    cwe: Option<String>,
    remediation: String,
}

#[derive(Deserialize)]
struct PluginOutput {
    findings: Option<Vec<PluginOutputFinding>>,
    logs: Option<Vec<String>>,
}

impl PluginManager {
    pub fn new(plugins_dir: PathBuf) -> Self {
        Self { plugins_dir }
    }

    pub fn get_plugins(&self) -> Vec<PluginInfo> {
        let mut list = Vec::new();
        if !self.plugins_dir.exists() {
            let _ = std::fs::create_dir_all(&self.plugins_dir);
            return list;
        }

        if let Ok(entries) = std::fs::read_dir(&self.plugins_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let manifest_file = path.join("manifest.json");
                    if manifest_file.exists() {
                        if let Ok(content) = std::fs::read_to_string(&manifest_file) {
                            if let Ok(raw) = serde_json::from_str::<RawManifest>(&content) {
                                let exe_path = path.join(&raw.executable);
                                let is_available = exe_path.exists();
                                list.push(PluginInfo {
                                    id: raw.id,
                                    name: raw.name,
                                    version: raw.version,
                                    publisher: raw.publisher.unwrap_or_else(|| "Community".to_string()),
                                    runtime: raw.runtime,
                                    executable: raw.executable,
                                    capabilities: raw.capabilities.unwrap_or_default(),
                                    permissions: raw.permissions.unwrap_or_default(),
                                    timeout_seconds: raw.timeout_seconds.unwrap_or(30),
                                    description: raw.description.unwrap_or_default(),
                                    path: path.to_string_lossy().to_string(),
                                    is_available,
                                });
                            }
                        }
                    }
                }
            }
        }

        list.sort_by(|a, b| a.name.cmp(&b.name));
        list
    }

    pub fn register_plugin(&self, manifest_json: &str) -> Result<PluginInfo, String> {
        let raw: RawManifest = serde_json::from_str(manifest_json)
            .map_err(|e| format!("Invalid manifest JSON schema: {}", e))?;

        let plugin_dir = self.plugins_dir.join(&raw.id);
        std::fs::create_dir_all(&plugin_dir)
            .map_err(|e| format!("Failed to create plugin directory: {}", e))?;

        let manifest_path = plugin_dir.join("manifest.json");
        std::fs::write(&manifest_path, manifest_json)
            .map_err(|e| format!("Failed to save manifest: {}", e))?;

        let exe_path = plugin_dir.join(&raw.executable);
        let is_available = exe_path.exists();

        Ok(PluginInfo {
            id: raw.id,
            name: raw.name,
            version: raw.version,
            publisher: raw.publisher.unwrap_or_else(|| "Community".to_string()),
            runtime: raw.runtime,
            executable: raw.executable,
            capabilities: raw.capabilities.unwrap_or_default(),
            permissions: raw.permissions.unwrap_or_default(),
            timeout_seconds: raw.timeout_seconds.unwrap_or(30),
            description: raw.description.unwrap_or_default(),
            path: plugin_dir.to_string_lossy().to_string(),
            is_available,
        })
    }

    pub async fn run_plugin(
        &self,
        plugin_id: &str,
        target_id: &str,
        target_url: &str,
    ) -> Result<(ScanResult, Vec<Finding>), String> {
        let plugins = self.get_plugins();
        let plugin = plugins
            .into_iter()
            .find(|p| p.id == plugin_id)
            .ok_or_else(|| format!("Plugin '{}' not found in registry", plugin_id))?;

        let plugin_dir = Path::new(&plugin.path);
        let exe_path = plugin_dir.join(&plugin.executable);
        if !exe_path.exists() {
            return Err(format!(
                "Plugin executable '{}' missing at {:?}",
                plugin.executable, exe_path
            ));
        }

        let start = Instant::now();
        let timeout_duration = Duration::from_secs(plugin.timeout_seconds.max(5));

        let mut cmd = match plugin.runtime.to_lowercase().as_str() {
            "python" | "python3" => {
                let mut c = Command::new("python");
                c.arg(&exe_path).arg(target_url);
                c
            }
            "node" => {
                let mut c = Command::new("node");
                c.arg(&exe_path).arg(target_url);
                c
            }
            _ => {
                let mut c = Command::new(&exe_path);
                c.arg(target_url);
                c
            }
        };

        cmd.current_dir(plugin_dir);

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let output = tokio::time::timeout(timeout_duration, cmd.output())
            .await
            .map_err(|_| format!("Plugin execution timed out after {} seconds", plugin.timeout_seconds))?
            .map_err(|e| format!("Failed to spawn plugin process: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        let parsed: PluginOutput = serde_json::from_str(&stdout).map_err(|e| {
            format!(
                "Plugin output was not valid JSON: {}\nSTDOUT: {}\nSTDERR: {}",
                e, stdout, stderr
            )
        })?;

        let mut findings = Vec::new();
        if let Some(raw_findings) = parsed.findings {
            for rf in raw_findings {
                let sev = match rf.severity.to_lowercase().as_str() {
                    "critical" => FindingSeverity::Critical,
                    "high" => FindingSeverity::High,
                    "medium" => FindingSeverity::Medium,
                    "low" => FindingSeverity::Low,
                    _ => FindingSeverity::Info,
                };

                let finding = Finding::new(
                    target_id.to_string(),
                    rf.title,
                    sev,
                    rf.confidence.unwrap_or(80),
                    target_url.to_string(),
                    format!("{}\nSummary: {}", rf.evidence, rf.summary),
                    format!("Plugin: {}", plugin.name),
                    plugin.version.clone(),
                    rf.cwe,
                    rf.remediation,
                );
                findings.push(finding);
            }
        }

        let mut logs = parsed.logs.unwrap_or_default();
        if !stderr.trim().is_empty() {
            logs.push(format!("[Plugin stderr]: {}", stderr.trim()));
        }
        logs.insert(0, format!("Executed Plugin '{}' (v{}) via {}", plugin.name, plugin.version, plugin.runtime));
        logs.push(format!("Completed scan with {} finding(s) in {}ms", findings.len(), start.elapsed().as_millis()));

        let scan_result = ScanResult {
            scan_id: Uuid::new_v4().to_string(),
            target_url: target_url.to_string(),
            tool: format!("Plugin: {}", plugin.name),
            status: "Completed".to_string(),
            logs,
            findings_count: findings.len(),
            duration_ms: start.elapsed().as_millis() as u64,
        };

        Ok((scan_result, findings))
    }
}
