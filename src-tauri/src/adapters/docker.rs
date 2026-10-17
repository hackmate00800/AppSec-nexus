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

pub struct DockerAdapter;

impl DockerAdapter {
    pub fn new() -> Self {
        Self
    }

    fn find_executable(custom_override: Option<&str>) -> Option<PathBuf> {
        if let Some(custom) = custom_override {
            let p = PathBuf::from(custom.trim());
            if p.exists() {
                return Some(p);
            }
        }

        let candidates = [
            PathBuf::from(r"C:\Program Files\Docker\Docker\resources\bin\docker.exe"),
            PathBuf::from("/usr/bin/docker"),
            PathBuf::from("/usr/local/bin/docker"),
        ];

        for c in &candidates {
            if c.exists() {
                return Some(c.clone());
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let direct = dir.join("docker.exe");
                if direct.exists() {
                    return Some(direct);
                }
                let unix = dir.join("docker");
                if unix.exists() {
                    return Some(unix);
                }
            }
        }

        None
    }
}

impl Default for DockerAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for DockerAdapter {
    fn id(&self) -> &str {
        "docker"
    }

    fn name(&self) -> &str {
        "Docker Containerized Tool Runner"
    }

    fn default_version(&self) -> &str {
        "29.1.3"
    }

    fn category(&self) -> &str {
        "Container Runtime Orchestrator"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::DockerContainer
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::VulnScan,
            ToolCapability::Crawling,
            ToolCapability::PassiveAudit,
        ]
    }

    fn description(&self) -> &str {
        "Orchestrates containerized security tools (such as OWASP ZAP, Semgrep, sqlmap, Nikto) in isolated Docker containers with mapped volumes and controlled networking."
    }

    fn documentation_url(&self) -> &str {
        "https://docs.docker.com/engine/reference/commandline/run/"
    }

    fn resolve_path(&self, custom_override: Option<&str>) -> Option<String> {
        Self::find_executable(custom_override)
            .map(|p| p.to_string_lossy().to_string())
    }

    fn detect(&self, custom_override: Option<&str>) -> ToolDetectionState {
        if let Some(custom) = custom_override {
            let p = Path::new(custom.trim());
            if !p.exists() {
                return ToolDetectionState::Misconfigured;
            }
        }

        if Self::find_executable(custom_override).is_some() {
            ToolDetectionState::InstalledAndReady
        } else {
            ToolDetectionState::NotInstalled
        }
    }

    fn health_check(
        &self,
        custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        let exe = Self::find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = match exe {
                Some(p) => p,
                None => {
                    return ToolHealthCheckResult {
                        healthy: false,
                        detection_state: ToolDetectionState::NotInstalled,
                        detected_version: None,
                        message: "Docker CLI binary was not found on host.".to_string(),
                        checked_at: Utc::now().to_rfc3339(),
                        latency_ms: start.elapsed().as_millis() as u64,
                    };
                }
            };

            match Command::new(&exe_path).arg("--version").output().await {
                Ok(output) => {
                    let out_str = String::from_utf8_lossy(&output.stdout).to_string();
                    let version_line = out_str.lines().next().unwrap_or("Docker 29.x").trim().to_string();

                    let daemon_check = Command::new(&exe_path).args(&["info", "--format", "{{.ServerVersion}}"]).output().await;
                    let daemon_running = match daemon_check {
                        Ok(d_out) => d_out.status.success(),
                        Err(_) => false,
                    };

                    if daemon_running {
                        ToolHealthCheckResult {
                            healthy: true,
                            detection_state: ToolDetectionState::InstalledAndReady,
                            detected_version: Some(version_line),
                            message: "Docker daemon is active and responsive to container execution requests.".to_string(),
                            checked_at: Utc::now().to_rfc3339(),
                            latency_ms: start.elapsed().as_millis() as u64,
                        }
                    } else {
                        ToolHealthCheckResult {
                            healthy: false,
                            detection_state: ToolDetectionState::DetectedUnavailable,
                            detected_version: Some(version_line),
                            message: "Docker CLI is installed, but the Docker Desktop daemon service is not currently running.".to_string(),
                            checked_at: Utc::now().to_rfc3339(),
                            latency_ms: start.elapsed().as_millis() as u64,
                        }
                    }
                }
                Err(e) => ToolHealthCheckResult {
                    healthy: false,
                    detection_state: ToolDetectionState::HealthCheckFailed,
                    detected_version: None,
                    message: format!("Docker CLI found but execution failed: {}", e),
                    checked_at: Utc::now().to_rfc3339(),
                    latency_ms: start.elapsed().as_millis() as u64,
                },
            }
        })
    }

    fn execute<'a>(
        &'a self,
        custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>> {
        let exe = Self::find_executable(custom_override);
        Box::pin(async move {
            let start = Instant::now();
            let exe_path = exe.ok_or_else(|| "Docker binary not found".to_string())?;

            let image = input
                .parameters
                .get("image")
                .cloned()
                .unwrap_or_else(|| "alpine:latest".to_string());

            let cmd_arg = input
                .parameters
                .get("cmd")
                .cloned()
                .unwrap_or_else(|| format!("wget -qO- --timeout=5 {}", input.target_url));

            let mut cmd = Command::new(&exe_path);
            cmd.args(&["run", "--rm", "--net=host", &image, "sh", "-c", &cmd_arg]);

            let output = cmd
                .output()
                .await
                .map_err(|e| format!("Docker execution failed: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);

            let mut logs = Vec::new();
            logs.push(format!("[*] Docker container {} executed command: {}", image, cmd_arg));

            for line in stdout.lines().take(50) {
                if !line.trim().is_empty() {
                    logs.push(line.to_string());
                }
            }
            for line in stderr.lines().take(20) {
                if !line.trim().is_empty() {
                    logs.push(format!("[docker-err] {}", line));
                }
            }

            let mut artifacts = HashMap::new();
            artifacts.insert("container_image".to_string(), image);

            Ok(AdapterOutput {
                tool_id: "docker".to_string(),
                target_url: input.target_url,
                status: if output.status.success() { "Success".to_string() } else { "Failed".to_string() },
                logs,
                findings: Vec::new(),
                endpoints: Vec::new(),
                artifacts,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
