use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use chrono::Utc;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::time::Instant;
use tokio::process::Command;

#[derive(Clone)]
pub struct ExternalGuiTool {
    pub id: String,
    pub name: String,
    pub executable_names: Vec<String>,
    pub standard_windows_paths: Vec<String>,
    pub category: String,
    pub description: String,
    pub doc_url: String,
}

pub struct ExternalGuiAdapter {
    pub tool: ExternalGuiTool,
}

impl ExternalGuiAdapter {
    pub fn new_burp() -> Self {
        Self {
            tool: ExternalGuiTool {
                id: "burpsuite".to_string(),
                name: "PortSwigger Burp Suite".to_string(),
                executable_names: vec!["burp.exe".to_string(), "burpsuite.exe".to_string(), "BurpSuiteCommunity.exe".to_string()],
                standard_windows_paths: vec![
                    r"C:\Program Files\BurpSuiteCommunity\BurpSuiteCommunity.exe".to_string(),
                    r"C:\Program Files\BurpSuitePro\BurpSuitePro.exe".to_string(),
                    r"C:\Users\%USERNAME%\AppData\Local\Programs\BurpSuiteCommunity\BurpSuiteCommunity.exe".to_string(),
                ],
                category: "Interactive Interception Proxy".to_string(),
                description: "Industry-standard web vulnerability scanner, repeater, and HTTP interception proxy.".to_string(),
                doc_url: "https://portswigger.net/burp/documentation".to_string(),
            },
        }
    }

    pub fn new_zap() -> Self {
        Self {
            tool: ExternalGuiTool {
                id: "owasp_zap".to_string(),
                name: "OWASP ZAP (Zed Attack Proxy)".to_string(),
                executable_names: vec!["zap.bat".to_string(), "ZAP.exe".to_string(), "zap.sh".to_string()],
                standard_windows_paths: vec![
                    r"C:\Program Files\OWASP\Zed Attack Proxy\ZAP.exe".to_string(),
                    r"C:\Program Files (x86)\OWASP\Zed Attack Proxy\ZAP.exe".to_string(),
                ],
                category: "Open Source Web App Security Scanner".to_string(),
                description: "Free, open-source penetration testing tool for finding vulnerabilities in web applications during development and testing.".to_string(),
                doc_url: "https://www.zaproxy.org/docs/".to_string(),
            },
        }
    }

    pub fn new_wireshark() -> Self {
        Self {
            tool: ExternalGuiTool {
                id: "wireshark".to_string(),
                name: "Wireshark Packet Analyzer".to_string(),
                executable_names: vec!["wireshark.exe".to_string(), "Wireshark.exe".to_string()],
                standard_windows_paths: vec![
                    r"C:\Program Files\Wireshark\Wireshark.exe".to_string(),
                ],
                category: "Network Protocol Analyzer".to_string(),
                description: "Deep inspection of hundreds of network protocols, live packet capture, and offline network forensics.".to_string(),
                doc_url: "https://www.wireshark.org/docs/".to_string(),
            },
        }
    }

    fn find_executable(&self, custom_override: Option<&str>) -> Option<PathBuf> {
        if let Some(custom) = custom_override {
            let p = PathBuf::from(custom.trim());
            if p.exists() {
                return Some(p);
            }
        }

        for path_str in &self.tool.standard_windows_paths {
            let expanded = if path_str.contains("%USERNAME%") {
                if let Ok(user) = std::env::var("USERNAME") {
                    path_str.replace("%USERNAME%", &user)
                } else {
                    path_str.clone()
                }
            } else {
                path_str.clone()
            };
            let p = PathBuf::from(expanded);
            if p.exists() {
                return Some(p);
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                for exe_name in &self.tool.executable_names {
                    let direct = dir.join(exe_name);
                    if direct.exists() {
                        return Some(direct);
                    }
                }
            }
        }

        None
    }
}

impl SecurityToolAdapter for ExternalGuiAdapter {
    fn id(&self) -> &str {
        &self.tool.id
    }

    fn name(&self) -> &str {
        &self.tool.name
    }

    fn default_version(&self) -> &str {
        "Latest"
    }

    fn category(&self) -> &str {
        &self.tool.category
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::ExternalGui
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::GuiLauncher,
            ToolCapability::PassiveAudit,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        &self.tool.description
    }

    fn documentation_url(&self) -> &str {
        &self.tool.doc_url
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        self.find_executable(custom_override)
            .map(|p| p.to_string_lossy().to_string())
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if !p.exists() {
                return ToolDetectionState::Misconfigured;
            }
        }

        if self.find_executable(custom_override).is_some() {
            ToolDetectionState::InstalledAndReady
        } else {
            ToolDetectionState::NotInstalled
        }
    }

    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        let exe = self.find_executable(custom_override);
        let name = self.tool.name.clone();
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = match exe {
                Some(p) => p,
                None => {
                    return ToolHealthCheckResult {
                        healthy: false,
                        detection_state: ToolDetectionState::NotInstalled,
                        detected_version: None,
                        message: format!(
                            "{} was not detected in standard program directories. Set a custom path if installed elsewhere.",
                            name
                        ),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            ToolHealthCheckResult {
                healthy: true,
                detection_state: ToolDetectionState::InstalledAndReady,
                detected_version: Some("Desktop App (Ready to Launch)".to_string()),
                message: format!("Binary verified at: {}", exe_path.display()),
                checked_at: Utc::now().to_rfc3339(),
                latency_ms: start.elapsed().as_millis() as u64,
            }
        })
    }

    fn execute<'a>(
        &'a self,
        custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>> {
        let exe = self.find_executable(custom_override);
        let name = self.tool.name.clone();
        let tool_id = self.tool.id.clone();
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = exe.ok_or_else(|| {
                format!("{} executable not found on host", name)
            })?;

            #[cfg(target_os = "windows")]
            {
                let status = Command::new("cmd")
                    .args(&["/c", "start", "", &exe_path.to_string_lossy().to_string()])
                    .spawn();
                if let Err(e) = status {
                    return Err(format!("Failed to launch GUI application: {}", e));
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                let status = Command::new(&exe_path).spawn();
                if let Err(e) = status {
                    return Err(format!("Failed to launch GUI application: {}", e));
                }
            }

            let mut logs = Vec::new();
            logs.push(format!("[+] Successfully launched {} desktop UI window.", name));
            logs.push(format!("[*] Binary: {}", exe_path.display()));
            logs.push(format!("[*] Target context: {}", input.target_url));

            Ok(AdapterOutput {
                tool_id,
                target_url: input.target_url,
                status: "Success".to_string(),
                logs,
                findings: Vec::new(),
                endpoints: Vec::new(),
                artifacts: HashMap::new(),
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
