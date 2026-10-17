use crate::models::{Finding, FindingSeverity};
use regex::Regex;
use serde_json::Value;

pub struct ReportImporter;

impl ReportImporter {
    pub fn parse_report(
        target_id: &str,
        format: &str,
        content: &str,
    ) -> Result<Vec<Finding>, String> {
        match format.to_lowercase().as_str() {
            "zap_json" | "zap" => Self::parse_zap_json(target_id, content),
            "burp_xml" | "burp" => Self::parse_burp_xml(target_id, content),
            "generic_json" | "nexus_json" | "json" => Self::parse_generic_json(target_id, content),
            _ => Err(format!(
                "Unsupported report format: '{}'. Supported: 'burp_xml', 'zap_json', 'generic_json'",
                format
            )),
        }
    }

    fn parse_zap_json(target_id: &str, content: &str) -> Result<Vec<Finding>, String> {
        let root: Value = serde_json::from_str(content)
            .map_err(|e| format!("Invalid ZAP JSON format: {}", e))?;

        let mut findings = Vec::new();

        // ZAP report format has "site": [ { "alerts": [ ... ] } ]
        if let Some(sites) = root.get("site").and_then(|s| s.as_array()) {
            for site in sites {
                if let Some(alerts) = site.get("alerts").and_then(|a| a.as_array()) {
                    for alert in alerts {
                        let title = alert["alert"]
                            .as_str()
                            .unwrap_or("ZAP Security Alert")
                            .to_string();

                        let risk_code = alert["riskcode"].as_str().unwrap_or("0");
                        let severity = match risk_code {
                            "3" => FindingSeverity::High,
                            "2" => FindingSeverity::Medium,
                            "1" => FindingSeverity::Low,
                            _ => FindingSeverity::Info,
                        };

                        let confidence = alert["confidence"]
                            .as_str()
                            .unwrap_or("2")
                            .parse::<u8>()
                            .unwrap_or(2)
                            * 30; // Scale 1-3 to approx 30-90%

                        let affected_asset = alert["uri"].as_str().unwrap_or("").to_string();
                        let desc = alert["desc"].as_str().unwrap_or("");
                        let evidence_str = alert["evidence"].as_str().unwrap_or("");
                        let solution = alert["solution"].as_str().unwrap_or("Review and apply OWASP remediation guidelines.");
                        let cwe_id = alert["cweid"].as_str().filter(|c| !c.is_empty()).map(|c| format!("CWE-{}", c));

                        let evidence = if evidence_str.is_empty() {
                            desc.to_string()
                        } else {
                            format!("{}\n\nEvidence match: {}", desc, evidence_str)
                        };

                        findings.push(Finding::new(
                            target_id.to_string(),
                            title,
                            severity,
                            confidence.min(100),
                            affected_asset,
                            evidence,
                            "OWASP ZAP (Imported)".to_string(),
                            "2.14+".to_string(),
                            cwe_id,
                            solution.to_string(),
                        ));
                    }
                }
            }
        } else {
            return Err("Expected 'site' array in OWASP ZAP JSON export".to_string());
        }

        Ok(findings)
    }

    fn parse_burp_xml(target_id: &str, content: &str) -> Result<Vec<Finding>, String> {
        let issue_re = Regex::new(r"(?s)<issue>(.*?)</issue>").unwrap();
        let name_re = Regex::new(r"<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</name>").unwrap();
        let severity_re = Regex::new(r"<severity>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</severity>").unwrap();
        let host_re = Regex::new(r"<host[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</host>").unwrap();
        let path_re = Regex::new(r"<path[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</path>").unwrap();
        let detail_re = Regex::new(r"<issueDetail>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</issueDetail>").unwrap();
        let background_re = Regex::new(r"<issueBackground>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</issueBackground>").unwrap();
        let remediation_re = Regex::new(r"<remediationBackground>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</remediationBackground>").unwrap();
        let cwe_re = Regex::new(r"(?i)CWE-(\d+)").unwrap();

        let mut findings = Vec::new();

        for cap in issue_re.captures_iter(content) {
            let block = &cap[1];

            let title = name_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_else(|| "Burp Suite Issue".to_string());

            let sev_str = severity_re
                .captures(block)
                .map(|m| m[1].trim().to_lowercase())
                .unwrap_or_default();

            let severity = match sev_str.as_str() {
                "critical" => FindingSeverity::Critical,
                "high" => FindingSeverity::High,
                "medium" => FindingSeverity::Medium,
                "low" => FindingSeverity::Low,
                _ => FindingSeverity::Info,
            };

            let host = host_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_default();

            let path = path_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_default();

            let affected_asset = if !host.is_empty() {
                format!("{}{}", host, path)
            } else {
                path
            };

            let detail = detail_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .or_else(|| background_re.captures(block).map(|m| m[1].trim().to_string()))
                .unwrap_or_else(|| "Exported from Burp Suite assessment.".to_string());

            let remediation = remediation_re
                .captures(block)
                .map(|m| m[1].trim().to_string())
                .unwrap_or_else(|| "Consult vendor and security best practices for remediation.".to_string());

            let cwe = cwe_re
                .captures(block)
                .map(|m| format!("CWE-{}", &m[1]));

            findings.push(Finding::new(
                target_id.to_string(),
                title,
                severity,
                90,
                affected_asset,
                detail,
                "Burp Suite (Imported)".to_string(),
                "Pro/Community".to_string(),
                cwe,
                remediation,
            ));
        }

        if findings.is_empty() {
            return Err("No <issue> blocks found in Burp Suite XML data".to_string());
        }

        Ok(findings)
    }

    fn parse_generic_json(target_id: &str, content: &str) -> Result<Vec<Finding>, String> {
        let mut findings = Vec::new();

        // 1. First try parsing as a single standard JSON array or { "findings": [...] }
        if let Ok(val) = serde_json::from_str::<Value>(content) {
            let array_opt = if let Some(arr) = val.as_array() {
                Some(arr.clone())
            } else if let Some(arr) = val.get("findings").and_then(|f| f.as_array()) {
                Some(arr.clone())
            } else {
                None
            };

            if let Some(array) = array_opt {
                for item in array {
                    Self::extract_single_json_finding(target_id, &item, &mut findings);
                }
                if !findings.is_empty() {
                    return Ok(findings);
                }
            }
        }

        // 2. Fallback: Parse line-by-line JSON (JSONL format, e.g. Nuclei, Trivy, Semgrep outputs)
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if let Ok(item) = serde_json::from_str::<Value>(trimmed) {
                Self::extract_single_json_finding(target_id, &item, &mut findings);
            }
        }

        if findings.is_empty() {
            return Err("Expected JSON array of findings, object with 'findings' key, or line-delimited JSON (JSONL)".to_string());
        }

        Ok(findings)
    }

    fn extract_single_json_finding(target_id: &str, item: &Value, findings: &mut Vec<Finding>) {
        // Detect Nuclei JSON structure: { "template-id": "...", "info": { "name": "...", "severity": "..." } }
        if let Some(info) = item.get("info") {
            let title = info["name"]
                .as_str()
                .or_else(|| item["template-id"].as_str())
                .unwrap_or("Nuclei Security Finding")
                .to_string();

            let sev_str = info["severity"].as_str().unwrap_or("info");
            let severity = match sev_str.to_lowercase().as_str() {
                "critical" => FindingSeverity::Critical,
                "high" => FindingSeverity::High,
                "medium" => FindingSeverity::Medium,
                "low" => FindingSeverity::Low,
                _ => FindingSeverity::Info,
            };

            let asset = item["matched-at"]
                .as_str()
                .or_else(|| item["host"].as_str())
                .unwrap_or("")
                .to_string();

            let extracted_results = item["extracted-results"]
                .as_array()
                .map(|a| a.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "))
                .unwrap_or_default();

            let description = info["description"].as_str().unwrap_or("");
            let evidence = if extracted_results.is_empty() {
                description.to_string()
            } else {
                format!("{}\n\nExtracted: {}", description, extracted_results)
            };

            let cwe = info.get("classification")
                .and_then(|c| c.get("cwe-id"))
                .and_then(|cwe_val| {
                    if let Some(s) = cwe_val.as_str() {
                        Some(s.to_string())
                    } else if let Some(arr) = cwe_val.as_array() {
                        arr.first().and_then(|v| v.as_str()).map(|s| s.to_string())
                    } else {
                        None
                    }
                });

            let remediation = info["remediation"]
                .as_str()
                .or_else(|| info.get("reference").and_then(|r| r.as_array()).and_then(|a| a.first()).and_then(|v| v.as_str()))
                .unwrap_or("Apply security patch and follow vendor recommendations.")
                .to_string();

            findings.push(Finding::new(
                target_id.to_string(),
                title,
                severity,
                90,
                asset,
                evidence,
                "Nuclei (Imported)".to_string(),
                "3.x".to_string(),
                cwe,
                remediation,
            ));
            return;
        }

        // Standard Generic AppSec Nexus JSON Finding
        let title = item["title"].as_str().unwrap_or("Imported Finding").to_string();
        let sev_str = item["severity"].as_str().unwrap_or("Info");
        let severity = match sev_str.to_lowercase().as_str() {
            "critical" => FindingSeverity::Critical,
            "high" => FindingSeverity::High,
            "medium" => FindingSeverity::Medium,
            "low" => FindingSeverity::Low,
            _ => FindingSeverity::Info,
        };
        let asset = item["affected_asset"].as_str().unwrap_or("").to_string();
        let evidence = item["evidence"].as_str().unwrap_or("").to_string();
        let tool = item["source_tool"].as_str().unwrap_or("External").to_string();
        let ver = item["tool_version"].as_str().unwrap_or("1.0").to_string();
        let cwe = item["cwe"].as_str().map(|s| s.to_string());
        let rem = item["remediation"].as_str().unwrap_or("Review and remediate.").to_string();

        findings.push(Finding::new(
            target_id.to_string(),
            title,
            severity,
            85,
            asset,
            evidence,
            tool,
            ver,
            cwe,
            rem,
        ));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_burp_xml() {
        let sample_burp = r#"
        <issues>
          <issue>
            <name><![CDATA[Cross-site Scripting (Reflected)]]></name>
            <severity>High</severity>
            <host ip="104.18.26.124">https://target.com</host>
            <path>/search?q=test</path>
            <issueDetail><![CDATA[Reflected XSS parameter detected in 'q'.]]></issueDetail>
            <issueBackground>XSS allows client code execution.</issueBackground>
            <remediationBackground>Sanitize all user inputs.</remediationBackground>
            <vulnerabilityClassifications>CWE-79</vulnerabilityClassifications>
          </issue>
        </issues>
        "#;

        let findings = ReportImporter::parse_report("target-123", "burp_xml", sample_burp).unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].title, "Cross-site Scripting (Reflected)");
        assert_eq!(findings[0].severity, FindingSeverity::High);
        assert_eq!(findings[0].affected_asset, "https://target.com/search?q=test");
        assert_eq!(findings[0].cwe, Some("CWE-79".to_string()));
    }

    #[test]
    fn test_parse_zap_json() {
        let sample_zap = r#"{
            "@version": "2.14.0",
            "site": [
                {
                    "@name": "https://target.com",
                    "alerts": [
                        {
                            "pluginid": "10038",
                            "alert": "Content Security Policy (CSP) Header Not Set",
                            "riskcode": "2",
                            "confidence": "3",
                            "riskdesc": "Medium (High)",
                            "desc": "CSP header missing.",
                            "uri": "https://target.com/index.html",
                            "cweid": "693",
                            "solution": "Add Content-Security-Policy."
                        }
                    ]
                }
            ]
        }"#;

        let findings = ReportImporter::parse_report("target-123", "zap_json", sample_zap).unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].title, "Content Security Policy (CSP) Header Not Set");
        assert_eq!(findings[0].severity, FindingSeverity::Medium);
        assert_eq!(findings[0].cwe, Some("CWE-693".to_string()));
    }

    #[test]
    fn test_parse_generic_json() {
        let sample_json = r#"[
            {
                "title": "Exposed .env Secret",
                "severity": "Critical",
                "affected_asset": "https://target.com/.env",
                "evidence": "DB_PASSWORD=secret",
                "cwe": "CWE-200"
            }
        ]"#;

        let findings = ReportImporter::parse_report("target-123", "generic_json", sample_json).unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].severity, FindingSeverity::Critical);
        assert_eq!(findings[0].title, "Exposed .env Secret");
    }
}

