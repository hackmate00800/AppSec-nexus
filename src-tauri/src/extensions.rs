use crate::models::{Finding, FindingSeverity};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::Instant;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExtensionLifecycleState {
    Discovered,
    Validated,
    Available,
    Enabled,
    Disabled,
    Removed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtensionPermissions {
    pub network: Vec<String>,
    pub filesystem: Vec<String>,
    pub environment: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionParamDef {
    pub name: String,
    pub param_type: String, // "string", "number", "boolean", "select"
    pub default_value: Option<String>,
    pub required: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifestV1 {
    pub manifest_version: u32,
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: String,
    pub description: String,
    pub category: String, // "scanner", "crawler", "enricher", "reporter", "integration"
    pub runtime: String,  // "python3", "standalone", "node", "docker", "api"
    pub entrypoint: String,
    pub capabilities: Vec<String>,
    pub permissions: ExtensionPermissions,
    pub parameters: Vec<ExtensionParamDef>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionRecord {
    pub manifest: ExtensionManifestV1,
    pub state: ExtensionLifecycleState,
    pub path: String,
    pub is_available: bool,
    pub installed_at: String,
    pub updated_at: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtensionExecutionInput {
    pub target_id: String,
    pub target_url: String,
    pub parameters: HashMap<String, String>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtensionExecutionOutput {
    pub extension_id: String,
    pub status: String,
    pub logs: Vec<String>,
    pub findings: Vec<Finding>,
    pub artifacts: HashMap<String, String>,
    pub duration_ms: u64,
}

pub struct ExtensionEngine {
    extensions_dir: PathBuf,
    registry: Arc<RwLock<HashMap<String, ExtensionRecord>>>,
}

impl ExtensionEngine {
    pub fn new(extensions_dir: PathBuf) -> Self {
        let _ = std::fs::create_dir_all(&extensions_dir);
        let engine = Self {
            extensions_dir,
            registry: Arc::new(RwLock::new(HashMap::new())),
        };
        engine.discover_local_extensions();
        engine
    }

    pub fn discover_local_extensions(&self) {
        let mut map = self.registry.write().unwrap();
        if !self.extensions_dir.exists() {
            return;
        }

        if let Ok(entries) = std::fs::read_dir(&self.extensions_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let manifest_file = path.join("manifest.json");
                    if manifest_file.exists() {
                        if let Ok(content) = std::fs::read_to_string(&manifest_file) {
                            if let Ok(manifest) = serde_json::from_str::<ExtensionManifestV1>(&content) {
                                let id = manifest.id.clone();
                                let mut is_available = true;
                                let mut error_message = None;

                                // Validate entrypoint
                                let entry_path = path.join(&manifest.entrypoint);
                                if !entry_path.exists() {
                                    is_available = false;
                                    error_message = Some(format!(
                                        "Entrypoint file '{}' not found in extension directory",
                                        manifest.entrypoint
                                    ));
                                }

                                let state = if is_available {
                                    ExtensionLifecycleState::Enabled
                                } else {
                                    ExtensionLifecycleState::Error
                                };

                                map.insert(
                                    id,
                                    ExtensionRecord {
                                        manifest,
                                        state,
                                        path: path.to_string_lossy().to_string(),
                                        is_available,
                                        installed_at: Utc::now().to_rfc3339(),
                                        updated_at: Utc::now().to_rfc3339(),
                                        error_message,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    pub fn get_extensions(&self) -> Vec<ExtensionRecord> {
        let map = self.registry.read().unwrap();
        map.values().cloned().collect()
    }

    pub fn get_extension(&self, id: &str) -> Option<ExtensionRecord> {
        let map = self.registry.read().unwrap();
        map.get(id).cloned()
    }

    pub fn set_state(&self, id: &str, new_state: ExtensionLifecycleState) -> Result<ExtensionRecord, String> {
        let mut map = self.registry.write().unwrap();
        let rec = map
            .get_mut(id)
            .ok_or_else(|| format!("Extension '{}' not found", id))?;

        rec.state = new_state;
        rec.updated_at = Utc::now().to_rfc3339();
        Ok(rec.clone())
    }

    pub fn register_manifest(&self, manifest_json: &str) -> Result<ExtensionRecord, String> {
        let manifest: ExtensionManifestV1 = serde_json::from_str(manifest_json)
            .map_err(|e| format!("Invalid extension manifest JSON: {}", e))?;

        if manifest.manifest_version != 1 {
            return Err(format!(
                "Unsupported manifest version: {}. Supported version: 1",
                manifest.manifest_version
            ));
        }

        let ext_dir = self.extensions_dir.join(&manifest.id);
        std::fs::create_dir_all(&ext_dir)
            .map_err(|e| format!("Failed to create extension folder: {}", e))?;

        let manifest_path = ext_dir.join("manifest.json");
        std::fs::write(&manifest_path, manifest_json)
            .map_err(|e| format!("Failed to write manifest.json: {}", e))?;

        let record = ExtensionRecord {
            manifest: manifest.clone(),
            state: ExtensionLifecycleState::Validated,
            path: ext_dir.to_string_lossy().to_string(),
            is_available: true,
            installed_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
            error_message: None,
        };

        let mut map = self.registry.write().unwrap();
        map.insert(manifest.id.clone(), record.clone());

        Ok(record)
    }

    pub async fn execute(
        &self,
        id: &str,
        input: ExtensionExecutionInput,
    ) -> Result<ExtensionExecutionOutput, String> {
        let start = Instant::now();
        let record = self
            .get_extension(id)
            .ok_or_else(|| format!("Extension '{}' not found", id))?;

        if record.state != ExtensionLifecycleState::Enabled {
            return Err(format!(
                "Extension '{}' is currently in '{:?}' state and cannot be executed.",
                id, record.state
            ));
        }

        let ext_dir = PathBuf::from(&record.path);
        let entry_path = ext_dir.join(&record.manifest.entrypoint);

        let mut logs = Vec::new();
        logs.push(format!(
            "[*] Executing extension: {} (v{})",
            record.manifest.name, record.manifest.version
        ));

        let mut findings = Vec::new();
        let mut artifacts = HashMap::new();

        match record.manifest.runtime.as_str() {
            "python3" | "python" => {
                let py_exe = Self::find_python();
                let mut cmd = Command::new(&py_exe);
                cmd.arg(&entry_path)
                    .arg("--target")
                    .arg(&input.target_url)
                    .current_dir(&ext_dir);

                for (k, v) in &input.parameters {
                    cmd.arg(format!("--{}", k)).arg(v);
                }

                let output = cmd
                    .output()
                    .await
                    .map_err(|e| format!("Extension python execution failed: {}", e))?;

                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    if trimmed.starts_with('{') {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                            if let Some(arr) = val["findings"].as_array() {
                                for f_val in arr {
                                    let title = f_val["title"].as_str().unwrap_or("Extension Finding").to_string();
                                    let sev_str = f_val["severity"].as_str().unwrap_or("info");
                                    let severity = match sev_str.to_lowercase().as_str() {
                                        "critical" => FindingSeverity::Critical,
                                        "high" => FindingSeverity::High,
                                        "medium" => FindingSeverity::Medium,
                                        "low" => FindingSeverity::Low,
                                        _ => FindingSeverity::Info,
                                    };
                                    let desc = f_val["description"].as_str().unwrap_or("").to_string();
                                    let rem = f_val["remediation"].as_str().unwrap_or("Remediate as instructed.").to_string();

                                    findings.push(Finding::new(
                                        input.target_id.clone(),
                                        title,
                                        severity,
                                        85,
                                        input.target_url.clone(),
                                        desc,
                                        record.manifest.id.clone(),
                                        record.manifest.version.clone(),
                                        None,
                                        rem,
                                    ));
                                }
                            }
                        }
                    } else {
                        logs.push(trimmed.to_string());
                    }
                }
            }
            _ => {
                logs.push(format!(
                    "[*] Generic execution for runtime: {}",
                    record.manifest.runtime
                ));
            }
        }

        artifacts.insert("findings_count".to_string(), findings.len().to_string());

        Ok(ExtensionExecutionOutput {
            extension_id: id.to_string(),
            status: "Success".to_string(),
            logs,
            findings,
            artifacts,
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    fn find_python() -> String {
        #[cfg(target_os = "windows")]
        {
            let candidates = [
                r"C:\Python314\python.exe",
                r"C:\Python313\python.exe",
                r"C:\Python312\python.exe",
                r"C:\Python311\python.exe",
            ];
            for c in &candidates {
                if Path::new(c).exists() {
                    return c.to_string();
                }
            }
        }
        "python".to_string()
    }
}
