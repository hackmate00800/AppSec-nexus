use super::{
    AdapterInput, AdapterOutput, IntegrationType, SecurityToolAdapter, ToolCapability,
    ToolDetectionState, ToolHealthCheckResult,
};
use crate::models::FindingSeverity;
use crate::scanners::BaselineScanner;
use chrono::Utc;
use std::collections::HashMap;
use std::pin::Pin;
use std::time::Instant;

pub struct NativeBaselineAdapter;

impl NativeBaselineAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl Default for NativeBaselineAdapter {
    fn default() -> Self {
        Self::new()
    }
}

impl SecurityToolAdapter for NativeBaselineAdapter {
    fn id(&self) -> &str {
        "baseline"
    }

    fn name(&self) -> &str {
        "Native Baseline Security Checks"
    }

    fn default_version(&self) -> &str {
        "1.0.0"
    }

    fn category(&self) -> &str {
        "Passive / Headers / Cookies"
    }

    fn integration_type(&self) -> IntegrationType {
        IntegrationType::NativeEngine
    }

    fn capabilities(&self) -> Vec<ToolCapability> {
        vec![
            ToolCapability::PassiveAudit,
            ToolCapability::HttpProbing,
            ToolCapability::ReportExport,
        ]
    }

    fn description(&self) -> &str {
        "In-process Rust security auditor analyzing HTTP response headers, CSP directives, CORS policies, secure cookie attributes, and robots.txt disclosures."
    }

    fn documentation_url(&self) -> &str {
        "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html"
    }

    fn resolve_path(&self, _custom_override: Option<&str>) -> Option<String> {
        Some("internal://rust/native_baseline".to_string())
    }

    fn detect(&self, _custom_override: Option<&str>) -> ToolDetectionState {
        ToolDetectionState::InstalledAndReady
    }

    fn health_check(
        &self,
        _custom_override: Option<&str>,
    ) -> Pin<Box<dyn std::future::Future<Output = ToolHealthCheckResult> + Send + '_>> {
        Box::pin(async move {
            ToolHealthCheckResult {
                healthy: true,
                detection_state: ToolDetectionState::InstalledAndReady,
                detected_version: Some("1.0.0 (Native In-Memory)".to_string()),
                message: "Native Rust security scanner engine is compiled and operating normally."
                    .to_string(),
                checked_at: Utc::now().to_rfc3339(),
                latency_ms: 1,
            }
        })
    }

    fn execute<'a>(
        &'a self,
        _custom_override: Option<&'a str>,
        input: AdapterInput,
    ) -> Pin<Box<dyn std::future::Future<Output = Result<AdapterOutput, String>> + Send + 'a>> {
        Box::pin(async move {
            let start = Instant::now();
            let target_id = if input.target_id.is_empty() {
                "default_target".to_string()
            } else {
                input.target_id
            };

            let raw_findings = BaselineScanner::scan_url(&target_id, &input.target_url)
                .await
                .map_err(|e| format!("Native baseline scan failed: {}", e))?;

            let mut findings = Vec::new();
            let mut logs = Vec::new();
            let mut critical_count = 0;
            let mut high_count = 0;
            let mut medium_count = 0;

            logs.push(format!(
                "[*] Initiating native HTTP baseline audit against {}",
                input.target_url
            ));

            for f in raw_findings {
                match f.severity {
                    FindingSeverity::Critical => critical_count += 1,
                    FindingSeverity::High => high_count += 1,
                    FindingSeverity::Medium => medium_count += 1,
                    _ => {}
                }
                logs.push(format!("[+] Found: {} ({:?})", f.title, f.severity));
                findings.push(f);
            }

            logs.push(format!(
                "[*] Baseline completed in {} ms with {} findings.",
                start.elapsed().as_millis(),
                findings.len()
            ));

            let mut artifacts = HashMap::new();
            artifacts.insert("findings_count".to_string(), findings.len().to_string());
            artifacts.insert("critical_count".to_string(), critical_count.to_string());
            artifacts.insert("high_count".to_string(), high_count.to_string());
            artifacts.insert("medium_count".to_string(), medium_count.to_string());
            artifacts.insert("scanned_url".to_string(), input.target_url.clone());

            Ok(AdapterOutput {
                tool_id: self.id().to_string(),
                target_url: input.target_url,
                status: "Success".to_string(),
                logs,
                findings,
                endpoints: Vec::new(),
                artifacts,
                duration_ms: start.elapsed().as_millis() as u64,
            })
        })
    }
}
