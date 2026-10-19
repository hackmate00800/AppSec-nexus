use crate::models::{
    AiChatMessageRecord, AiTask, AiTaskStatus, AuditLogRecord, DiscoveredEndpoint, Finding,
    FindingSeverity, FindingStatus, FindingUpdatePayload, GeneratedReport, IssueCreatePayload,
    IssueHistoryItem, IssueNote, IssueRecord, IssueUpdatePayload, ReportGenerateParams,
    ScanEvent, ScanResult, Target,
};
use rusqlite::{params, Connection, Result};
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn init(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // High-performance SQLite tuning for low-spec PCs:
        // - WAL journal mode enables non-blocking concurrent reads and writes
        // - synchronous = NORMAL minimizes disk I/O without data loss risk in WAL
        // - temp_store = MEMORY avoids disk thrashing on slow HDDs
        // - cache_size = -8000 limits cache to 8MB RAM for bounded memory footprint
        let _ = conn.execute_batch("
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA temp_store = MEMORY;
            PRAGMA cache_size = -8000;
        ");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS targets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                primary_url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                scope_json TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS findings (
                id TEXT PRIMARY KEY,
                target_id TEXT NOT NULL,
                title TEXT NOT NULL,
                severity TEXT NOT NULL,
                confidence INTEGER NOT NULL,
                affected_asset TEXT NOT NULL,
                evidence TEXT NOT NULL,
                source_tool TEXT NOT NULL,
                tool_version TEXT NOT NULL,
                cwe TEXT,
                remediation TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                fingerprint TEXT UNIQUE,
                validation_status TEXT DEFAULT 'NEEDS_VALIDATION'
            )",
            [],
        )?;

        // Safe column migration for existing databases
        let _ = conn.execute(
            "ALTER TABLE findings ADD COLUMN validation_status TEXT DEFAULT 'NEEDS_VALIDATION'",
            [],
        );

        let _ = conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_findings_fingerprint ON findings(fingerprint)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_target_created ON findings(target_id, created_at DESC)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS validation_records (
                id TEXT PRIMARY KEY,
                finding_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                status TEXT NOT NULL,
                hypothesis TEXT NOT NULL,
                test_method TEXT NOT NULL,
                preconditions TEXT NOT NULL,
                expected_observation TEXT NOT NULL,
                actual_observation TEXT NOT NULL,
                supporting_evidence TEXT NOT NULL,
                contradicting_evidence TEXT NOT NULL,
                confidence_score INTEGER NOT NULL,
                confidence_rationale TEXT NOT NULL,
                executed_at TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                error_message TEXT
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_validation_finding ON validation_records(finding_id, executed_at DESC)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS scan_history (
                id TEXT PRIMARY KEY,
                target_url TEXT NOT NULL,
                tool TEXT NOT NULL,
                status TEXT NOT NULL,
                findings_count INTEGER NOT NULL,
                duration_ms INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_history_created ON scan_history(created_at DESC)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS scan_events (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL,
                job_id TEXT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                component_or_tool TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata_json TEXT NOT NULL DEFAULT '{}',
                duration_ms INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                related_finding_id TEXT,
                error_details TEXT
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_events_scan ON scan_events(scan_id, timestamp ASC)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_events_finding ON scan_events(related_finding_id)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_events_type ON scan_events(event_type)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS discovered_endpoints (
                id TEXT PRIMARY KEY,
                target_id TEXT NOT NULL,
                url TEXT NOT NULL,
                method TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                content_type TEXT,
                source TEXT NOT NULL,
                discovered_at TEXT NOT NULL,
                UNIQUE(target_id, url, method)
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_endpoints_target_discovered ON discovered_endpoints(target_id, discovered_at DESC)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tool_path_overrides (
                tool_id TEXT PRIMARY KEY,
                custom_path TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tool_states (
                tool_id TEXT PRIMARY KEY,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS workflow_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                definition_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS orchestration_jobs (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                workflow_name TEXT NOT NULL,
                target_id TEXT NOT NULL,
                target_url TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                duration_ms INTEGER NOT NULL,
                total_findings INTEGER NOT NULL,
                logs_json TEXT NOT NULL
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_jobs_started ON orchestration_jobs(started_at DESC)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS extension_registrations (
                id TEXT PRIMARY KEY,
                manifest_json TEXT NOT NULL,
                state TEXT NOT NULL,
                installed_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_tasks (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_preview TEXT NOT NULL,
                status TEXT NOT NULL,
                system_prompt TEXT,
                messages_json TEXT NOT NULL,
                result TEXT,
                error TEXT,
                created_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                duration_ms INTEGER NOT NULL
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_tasks_created ON ai_tasks(created_at DESC)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_tasks_conv ON ai_tasks(conversation_id)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS ai_chat_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                task_id TEXT
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_chat_conv ON ai_chat_messages(conversation_id, timestamp ASC)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details_json TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, timestamp DESC)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS issues (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                subtype TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                verification_status TEXT NOT NULL,
                affected_target_id TEXT,
                affected_target_name TEXT,
                affected_component TEXT NOT NULL,
                source TEXT NOT NULL,
                occurrence_count INTEGER NOT NULL DEFAULT 1,
                first_detected TEXT NOT NULL,
                last_detected TEXT NOT NULL,
                description TEXT NOT NULL,
                reproduction_steps TEXT,
                expected_behavior TEXT,
                actual_behavior TEXT,
                error_details TEXT,
                evidence TEXT,
                root_cause TEXT,
                impact_assessment TEXT,
                remediation_guidance TEXT,
                tags_json TEXT NOT NULL DEFAULT '[]',
                assigned_owner TEXT,
                notes_json TEXT NOT NULL DEFAULT '[]',
                related_finding_id TEXT,
                related_tool_id TEXT,
                history_json TEXT NOT NULL DEFAULT '[]',
                resolution_summary TEXT,
                resolved_at TEXT,
                fingerprint TEXT UNIQUE
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_issues_last_detected ON issues(last_detected DESC)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_issues_target ON issues(affected_target_id)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS burp_traffic (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                host TEXT NOT NULL,
                path TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                request_headers_json TEXT NOT NULL,
                request_body TEXT,
                response_headers_json TEXT NOT NULL,
                response_body TEXT,
                response_size INTEGER NOT NULL,
                latency_ms INTEGER NOT NULL,
                source TEXT NOT NULL,
                is_tls INTEGER NOT NULL,
                content_hash TEXT UNIQUE
            )",
            [],
        )?;
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_burp_traffic_time ON burp_traffic(timestamp DESC)",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_burp_traffic_host ON burp_traffic(host)",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS appsec_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Auto-seed findings into issues table if empty
        let issue_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM issues", [], |r| r.get(0))
            .unwrap_or(0);
        if issue_count == 0 {
            let stmt = conn.prepare("SELECT id, target_id, title, severity, affected_asset, evidence, source_tool, cwe, remediation, status, created_at, validation_status FROM findings").ok();
            if let Some(mut s) = stmt {
                let rows = s.query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                        row.get::<_, String>(5)?,
                        row.get::<_, String>(6)?,
                        row.get::<_, Option<String>>(7)?,
                        row.get::<_, String>(8)?,
                        row.get::<_, String>(9)?,
                        row.get::<_, String>(10)?,
                        row.get::<_, String>(11)?,
                    ))
                }).ok();
                if let Some(r_iter) = rows {
                    for item in r_iter.flatten() {
                        let (f_id, target_id, title, severity, asset, evidence, source_tool, cwe, remediation, status, created_at, val_status) = item;
                        let subtype = cwe.clone().unwrap_or_else(|| source_tool.clone());
                        let fp = IssueRecord::calculate_fingerprint("SecurityVulnerability", &subtype, &asset, &title);
                        let issue_id = format!("ISS-{}", &uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
                        let hist = serde_json::to_string(&vec![
                            IssueHistoryItem {
                                timestamp: created_at.clone(),
                                action: "DETECTED".into(),
                                actor: source_tool.clone(),
                                details: format!("Identified by security tool {}", source_tool),
                            }
                        ]).unwrap_or_else(|_| "[]".into());
                        let tags = serde_json::to_string(&vec!["security", &source_tool]).unwrap_or_else(|_| "[]".into());
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO issues (
                                id, title, category, subtype, severity, status, verification_status,
                                affected_target_id, affected_component, source, occurrence_count,
                                first_detected, last_detected, description, evidence, remediation_guidance,
                                tags_json, notes_json, related_finding_id, related_tool_id, history_json, fingerprint
                             ) VALUES (?1, ?2, 'SecurityVulnerability', ?3, ?4, ?5, ?6, ?7, ?8, 'Scanner', 1, ?9, ?9, ?10, ?11, ?12, ?13, '[]', ?14, ?15, ?16, ?17)",
                            params![
                                issue_id,
                                title,
                                subtype,
                                severity,
                                status,
                                val_status,
                                target_id,
                                asset,
                                created_at,
                                format!("Security vulnerability: {}", title),
                                evidence,
                                remediation,
                                tags,
                                f_id,
                                source_tool,
                                hist,
                                fp,
                            ]
                        );
                    }
                }
            }
        }

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn insert_target(&self, target: &Target) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let scope_json = serde_json::to_string(&target.scope).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO targets (id, name, primary_url, created_at, scope_json)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                target.id,
                target.name,
                target.primary_url,
                target.created_at,
                scope_json
            ],
        )?;
        Ok(())
    }

    pub fn get_targets(&self) -> Result<Vec<Target>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, primary_url, created_at, scope_json FROM targets ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], |row| {
            let scope_json: String = row.get(4)?;
            let scope = serde_json::from_str(&scope_json).unwrap_or_default();
            Ok(Target {
                id: row.get(0)?,
                name: row.get(1)?,
                primary_url: row.get(2)?,
                created_at: row.get(3)?,
                scope,
            })
        })?;

        let mut targets = Vec::new();
        for r in rows {
            if let Ok(t) = r {
                targets.push(t);
            }
        }
        Ok(targets)
    }

    pub fn insert_finding(&self, finding: &Finding) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let severity_str = match finding.severity {
            FindingSeverity::Critical => "Critical",
            FindingSeverity::High => "High",
            FindingSeverity::Medium => "Medium",
            FindingSeverity::Low => "Low",
            FindingSeverity::Info => "Info",
        };
        let status_str = match finding.status {
            FindingStatus::New => "New",
            FindingStatus::NeedsValidation => "NeedsValidation",
            FindingStatus::Validating => "Validating",
            FindingStatus::Confirmed => "Confirmed",
            FindingStatus::LikelyTruePositive => "LikelyTruePositive",
            FindingStatus::NeedsReview => "NeedsReview",
            FindingStatus::Unconfirmed => "Unconfirmed",
            FindingStatus::LikelyFalsePositive => "LikelyFalsePositive",
            FindingStatus::ValidationFailed => "ValidationFailed",
            FindingStatus::NotApplicable => "NotApplicable",
            FindingStatus::AcceptedRisk => "AcceptedRisk",
            FindingStatus::Fixed => "Fixed",
        };

        let fingerprint = if finding.fingerprint.is_empty() {
            Finding::calculate_fingerprint(&finding.target_id, &finding.title, &finding.affected_asset)
        } else {
            finding.fingerprint.clone()
        };

        let val_status = if finding.validation_status.is_empty() {
            "NEEDS_VALIDATION".to_string()
        } else {
            finding.validation_status.clone()
        };

        conn.execute(
            "INSERT INTO findings (id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at, fingerprint, validation_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
             ON CONFLICT(fingerprint) DO UPDATE SET
                evidence = excluded.evidence,
                tool_version = excluded.tool_version,
                created_at = excluded.created_at,
                validation_status = excluded.validation_status",
            params![
                finding.id,
                finding.target_id,
                finding.title,
                severity_str,
                finding.confidence,
                finding.affected_asset,
                finding.evidence,
                finding.source_tool,
                finding.tool_version,
                finding.cwe,
                finding.remediation,
                status_str,
                finding.created_at,
                fingerprint,
                val_status
            ],
        )?;

        // Automatically synchronize finding to issues table as SecurityVulnerability
        let subtype = finding.cwe.clone().unwrap_or_else(|| finding.source_tool.clone());
        let fp = IssueRecord::calculate_fingerprint("SecurityVulnerability", &subtype, &finding.affected_asset, &finding.title);
        let now = chrono::Utc::now().to_rfc3339();

        let existing_issue: Option<(String, u32, String)> = conn
            .query_row(
                "SELECT id, occurrence_count, history_json FROM issues WHERE fingerprint = ?1",
                params![fp],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .ok();

        if let Some((iss_id, occ_count, hist_json)) = existing_issue {
            let mut hist: Vec<IssueHistoryItem> = serde_json::from_str(&hist_json).unwrap_or_default();
            hist.push(IssueHistoryItem {
                timestamp: now.clone(),
                action: "REOCCURRENCE".into(),
                actor: finding.source_tool.clone(),
                details: format!("Re-observed during scan by {} (count: {})", finding.source_tool, occ_count + 1),
            });
            let new_hist = serde_json::to_string(&hist).unwrap_or_else(|_| "[]".into());
            let _ = conn.execute(
                "UPDATE issues SET occurrence_count = occurrence_count + 1, last_detected = ?1, history_json = ?2, evidence = ?3, remediation_guidance = ?4 WHERE id = ?5",
                params![now, new_hist, finding.evidence, finding.remediation, iss_id],
            );
        } else {
            let iss_id = format!("ISS-{}", &uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
            let hist = serde_json::to_string(&vec![IssueHistoryItem {
                timestamp: now.clone(),
                action: "DETECTED".into(),
                actor: finding.source_tool.clone(),
                details: format!("Initial automated detection by security tool {}", finding.source_tool),
            }]).unwrap_or_else(|_| "[]".into());
            let tags = serde_json::to_string(&vec!["security", &finding.source_tool]).unwrap_or_else(|_| "[]".into());
            let _ = conn.execute(
                "INSERT OR IGNORE INTO issues (
                    id, title, category, subtype, severity, status, verification_status,
                    affected_target_id, affected_component, source, occurrence_count,
                    first_detected, last_detected, description, evidence, remediation_guidance,
                    tags_json, notes_json, related_finding_id, related_tool_id, history_json, fingerprint
                 ) VALUES (?1, ?2, 'SecurityVulnerability', ?3, ?4, ?5, ?6, ?7, ?8, 'Scanner', 1, ?9, ?9, ?10, ?11, ?12, ?13, '[]', ?14, ?15, ?16, ?17)",
                params![
                    iss_id,
                    finding.title,
                    subtype,
                    severity_str,
                    status_str,
                    val_status,
                    finding.target_id,
                    finding.affected_asset,
                    now,
                    format!("Security vulnerability observed by {}: {}", finding.source_tool, finding.title),
                    finding.evidence,
                    finding.remediation,
                    tags,
                    finding.id,
                    finding.source_tool,
                    hist,
                    fp,
                ],
            );
        }

        Ok(())
    }

    pub fn get_findings(&self) -> Result<Vec<Finding>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at, COALESCE(fingerprint, ''), COALESCE(validation_status, 'NEEDS_VALIDATION') FROM findings ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            let sev_str: String = row.get(3)?;
            let severity = match sev_str.as_str() {
                "Critical" => FindingSeverity::Critical,
                "High" => FindingSeverity::High,
                "Medium" => FindingSeverity::Medium,
                "Low" => FindingSeverity::Low,
                _ => FindingSeverity::Info,
            };

            let stat_str: String = row.get(11)?;
            let status = match stat_str.as_str() {
                "Confirmed" | "CONFIRMED" => FindingStatus::Confirmed,
                "NeedsValidation" | "NEEDS_VALIDATION" => FindingStatus::NeedsValidation,
                "Validating" | "VALIDATING" => FindingStatus::Validating,
                "LikelyTruePositive" | "LIKELY_TRUE_POSITIVE" => FindingStatus::LikelyTruePositive,
                "NeedsReview" => FindingStatus::NeedsReview,
                "Unconfirmed" | "UNCONFIRMED" => FindingStatus::Unconfirmed,
                "LikelyFalsePositive" | "LIKELY_FALSE_POSITIVE" => FindingStatus::LikelyFalsePositive,
                "ValidationFailed" | "VALIDATION_FAILED" => FindingStatus::ValidationFailed,
                "NotApplicable" | "NOT_APPLICABLE" => FindingStatus::NotApplicable,
                "AcceptedRisk" => FindingStatus::AcceptedRisk,
                "Fixed" => FindingStatus::Fixed,
                _ => FindingStatus::New,
            };

            let val_status: String = row.get(14).unwrap_or_else(|_| "NEEDS_VALIDATION".to_string());

            Ok(Finding {
                id: row.get(0)?,
                target_id: row.get(1)?,
                title: row.get(2)?,
                severity,
                confidence: row.get(4)?,
                affected_asset: row.get(5)?,
                evidence: row.get(6)?,
                source_tool: row.get(7)?,
                tool_version: row.get(8)?,
                cwe: row.get(9)?,
                remediation: row.get(10)?,
                status,
                created_at: row.get(12)?,
                fingerprint: row.get(13)?,
                validation_status: val_status,
            })
        })?;

        let mut findings = Vec::new();
        for r in rows {
            if let Ok(f) = r {
                findings.push(f);
            }
        }
        Ok(findings)
    }

    pub fn insert_validation_record(&self, record: &crate::validator::ValidationRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO validation_records (id, finding_id, target_id, status, hypothesis, test_method, preconditions, expected_observation, actual_observation, supporting_evidence, contradicting_evidence, confidence_score, confidence_rationale, executed_at, duration_ms, error_message)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                record.id,
                record.finding_id,
                record.target_id,
                record.status,
                record.hypothesis,
                record.test_method,
                record.preconditions,
                record.expected_observation,
                record.actual_observation,
                record.supporting_evidence,
                record.contradicting_evidence,
                record.confidence_score as i64,
                record.confidence_rationale,
                record.executed_at,
                record.duration_ms as i64,
                record.error_message
            ],
        )?;
        Ok(())
    }

    pub fn get_validation_history(&self, finding_id: &str) -> Result<Vec<crate::validator::ValidationRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, finding_id, target_id, status, hypothesis, test_method, preconditions, expected_observation, actual_observation, supporting_evidence, contradicting_evidence, confidence_score, confidence_rationale, executed_at, duration_ms, error_message
             FROM validation_records WHERE finding_id = ?1 ORDER BY executed_at DESC"
        )?;

        let rows = stmt.query_map(params![finding_id], |row| {
            let conf: i64 = row.get(11)?;
            let dur: i64 = row.get(14)?;
            Ok(crate::validator::ValidationRecord {
                id: row.get(0)?,
                finding_id: row.get(1)?,
                target_id: row.get(2)?,
                status: row.get(3)?,
                hypothesis: row.get(4)?,
                test_method: row.get(5)?,
                preconditions: row.get(6)?,
                expected_observation: row.get(7)?,
                actual_observation: row.get(8)?,
                supporting_evidence: row.get(9)?,
                contradicting_evidence: row.get(10)?,
                confidence_score: conf as u8,
                confidence_rationale: row.get(12)?,
                executed_at: row.get(13)?,
                duration_ms: dur as u64,
                error_message: row.get(15)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                list.push(rec);
            }
        }
        Ok(list)
    }

    pub fn update_finding_validation(&self, finding_id: &str, status: &str, confidence: u8) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE findings SET status = ?1, validation_status = ?2, confidence = ?3 WHERE id = ?4",
            params![status, status, confidence, finding_id],
        )?;
        Ok(())
    }

    pub fn record_scan(&self, scan: &ScanResult) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO scan_history (id, target_url, tool, status, findings_count, duration_ms, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                scan.scan_id,
                scan.target_url,
                scan.tool,
                scan.status,
                scan.findings_count as i64,
                scan.duration_ms as i64,
                chrono::Utc::now().to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn get_scan_history(&self) -> Result<Vec<ScanResult>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, target_url, tool, status, findings_count, duration_ms FROM scan_history ORDER BY created_at DESC LIMIT 50"
        )?;

        let rows = stmt.query_map([], |row| {
            let duration_i64: i64 = row.get(5)?;
            let findings_i64: i64 = row.get(4)?;
            Ok(ScanResult {
                scan_id: row.get(0)?,
                target_url: row.get(1)?,
                tool: row.get(2)?,
                status: row.get(3)?,
                logs: Vec::new(),
                findings_count: findings_i64 as usize,
                duration_ms: duration_i64 as u64,
            })
        })?;

        let mut history = Vec::new();
        for r in rows {
            if let Ok(h) = r {
                history.push(h);
            }
        }
        Ok(history)
    }

    pub fn insert_scan_event(&self, event: &ScanEvent) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO scan_events (id, scan_id, job_id, timestamp, event_type, severity, component_or_tool, message, metadata_json, duration_ms, status, related_finding_id, error_details)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                event.id,
                event.scan_id,
                event.job_id,
                event.timestamp,
                event.event_type,
                event.severity,
                event.component_or_tool,
                event.message,
                event.metadata_json,
                event.duration_ms as i64,
                event.status,
                event.related_finding_id,
                event.error_details,
            ],
        )?;
        Ok(())
    }

    pub fn get_scan_events(
        &self,
        scan_id: Option<&str>,
        finding_id: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<ScanEvent>> {
        let conn = self.conn.lock().unwrap();
        let limit_val = limit.unwrap_or(200) as i64;

        let mut query = String::from("SELECT id, scan_id, job_id, timestamp, event_type, severity, component_or_tool, message, metadata_json, duration_ms, status, related_finding_id, error_details FROM scan_events WHERE 1=1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(s_id) = scan_id {
            query.push_str(" AND scan_id = ?");
            params_vec.push(Box::new(s_id.to_string()));
        }

        if let Some(f_id) = finding_id {
            query.push_str(" AND related_finding_id = ?");
            params_vec.push(Box::new(f_id.to_string()));
        }

        query.push_str(" ORDER BY timestamp ASC LIMIT ?");
        params_vec.push(Box::new(limit_val));

        let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map(&params_slice[..], |row| {
            let dur: i64 = row.get(9)?;
            Ok(ScanEvent {
                id: row.get(0)?,
                scan_id: row.get(1)?,
                job_id: row.get(2)?,
                timestamp: row.get(3)?,
                event_type: row.get(4)?,
                severity: row.get(5)?,
                component_or_tool: row.get(6)?,
                message: row.get(7)?,
                metadata_json: row.get(8)?,
                duration_ms: dur as u64,
                status: row.get(10)?,
                related_finding_id: row.get(11)?,
                error_details: row.get(12)?,
            })
        })?;

        let mut events = Vec::new();
        for r in rows {
            if let Ok(e) = r {
                events.push(e);
            }
        }
        Ok(events)
    }

    pub fn get_finding_by_id(&self, id: &str) -> Result<Option<Finding>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at, COALESCE(fingerprint, ''), COALESCE(validation_status, 'NEEDS_VALIDATION') FROM findings WHERE id = ?1 LIMIT 1"
        )?;

        let mut rows = stmt.query_map(params![id], |row| {
            let sev_str: String = row.get(3)?;
            let severity = match sev_str.as_str() {
                "Critical" => FindingSeverity::Critical,
                "High" => FindingSeverity::High,
                "Medium" => FindingSeverity::Medium,
                "Low" => FindingSeverity::Low,
                _ => FindingSeverity::Info,
            };

            let stat_str: String = row.get(11)?;
            let status = match stat_str.as_str() {
                "Confirmed" | "CONFIRMED" => FindingStatus::Confirmed,
                "NeedsValidation" | "NEEDS_VALIDATION" => FindingStatus::NeedsValidation,
                "Validating" | "VALIDATING" => FindingStatus::Validating,
                "LikelyTruePositive" | "LIKELY_TRUE_POSITIVE" => FindingStatus::LikelyTruePositive,
                "NeedsReview" | "NEEDS_REVIEW" => FindingStatus::NeedsReview,
                "Unconfirmed" | "UNCONFIRMED" => FindingStatus::Unconfirmed,
                "LikelyFalsePositive" | "LIKELY_FALSE_POSITIVE" => FindingStatus::LikelyFalsePositive,
                "ValidationFailed" | "VALIDATION_FAILED" => FindingStatus::ValidationFailed,
                "NotApplicable" | "NOT_APPLICABLE" => FindingStatus::NotApplicable,
                "AcceptedRisk" | "ACCEPTED_RISK" => FindingStatus::AcceptedRisk,
                "Fixed" | "FIXED" => FindingStatus::Fixed,
                _ => FindingStatus::New,
            };

            let conf_i64: i64 = row.get(4)?;
            Ok(Finding {
                id: row.get(0)?,
                target_id: row.get(1)?,
                title: row.get(2)?,
                severity,
                confidence: conf_i64 as u8,
                affected_asset: row.get(5)?,
                evidence: row.get(6)?,
                source_tool: row.get(7)?,
                tool_version: row.get(8)?,
                cwe: row.get(9)?,
                remediation: row.get(10)?,
                status,
                created_at: row.get(12)?,
                fingerprint: row.get(13)?,
                validation_status: row.get(14)?,
            })
        })?;

        if let Some(r) = rows.next() {
            Ok(Some(r?))
        } else {
            Ok(None)
        }
    }

    pub fn update_finding_status(&self, id: &str, status: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE findings SET status = ?1 WHERE id = ?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn insert_endpoint(&self, endpoint: &DiscoveredEndpoint) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO discovered_endpoints (id, target_id, url, method, status_code, content_type, source, discovered_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                endpoint.id,
                endpoint.target_id,
                endpoint.url,
                endpoint.method,
                endpoint.status_code,
                endpoint.content_type,
                endpoint.source,
                endpoint.discovered_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_endpoints(&self, target_id: &str) -> Result<Vec<DiscoveredEndpoint>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, target_id, url, method, status_code, content_type, source, discovered_at FROM discovered_endpoints WHERE target_id = ?1 ORDER BY discovered_at DESC"
        )?;
        let rows = stmt.query_map(params![target_id], |row| {
            Ok(DiscoveredEndpoint {
                id: row.get(0)?,
                target_id: row.get(1)?,
                url: row.get(2)?,
                method: row.get(3)?,
                status_code: row.get(4)?,
                content_type: row.get(5)?,
                source: row.get(6)?,
                discovered_at: row.get(7)?,
            })
        })?;

        let mut endpoints = Vec::new();
        for r in rows {
            if let Ok(ep) = r {
                endpoints.push(ep);
            }
        }
        Ok(endpoints)
    }

    pub fn save_tool_path_override(&self, tool_id: &str, custom_path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT OR REPLACE INTO tool_path_overrides (tool_id, custom_path, updated_at) VALUES (?1, ?2, ?3)",
            params![tool_id, custom_path, now],
        )?;
        Ok(())
    }

    pub fn get_tool_path_overrides(&self) -> Result<std::collections::HashMap<String, String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT tool_id, custom_path FROM tool_path_overrides")?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let path: String = row.get(1)?;
            Ok((id, path))
        })?;

        let mut map = std::collections::HashMap::new();
        for r in rows {
            if let Ok((id, path)) = r {
                map.insert(id, path);
            }
        }
        Ok(map)
    }

    pub fn delete_tool_path_override(&self, tool_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tool_path_overrides WHERE tool_id = ?1", params![tool_id])?;
        Ok(())
    }

    pub fn save_tool_enabled_state(&self, tool_id: &str, is_enabled: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT OR REPLACE INTO tool_states (tool_id, is_enabled, updated_at) VALUES (?1, ?2, ?3)",
            params![tool_id, if is_enabled { 1 } else { 0 }, now],
        )?;
        Ok(())
    }

    pub fn get_tool_enabled_states(&self) -> Result<std::collections::HashMap<String, bool>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT tool_id, is_enabled FROM tool_states")?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let enabled: i64 = row.get(1)?;
            Ok((id, enabled == 1))
        })?;

        let mut map = std::collections::HashMap::new();
        for r in rows {
            if let Ok((id, enabled)) = r {
                map.insert(id, enabled);
            }
        }
        Ok(map)
    }

    pub fn insert_ai_task(&self, task: &AiTask) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO ai_tasks (
                id, conversation_id, model, prompt_preview, status, system_prompt,
                messages_json, result, error, created_at, started_at, completed_at, duration_ms
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                task.id,
                task.conversation_id,
                task.model,
                task.prompt_preview,
                task.status.to_string(),
                task.system_prompt,
                task.messages_json,
                task.result,
                task.error,
                task.created_at,
                task.started_at,
                task.completed_at,
                task.duration_ms as i64,
            ],
        )?;
        Ok(())
    }

    pub fn update_ai_task(&self, task: &AiTask) -> Result<()> {
        self.insert_ai_task(task)
    }

    pub fn get_ai_tasks(&self, limit: Option<usize>) -> Result<Vec<AiTask>> {
        let conn = self.conn.lock().unwrap();
        let limit_val = limit.unwrap_or(50) as i64;
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, model, prompt_preview, status, system_prompt,
                    messages_json, result, error, created_at, started_at, completed_at, duration_ms
             FROM ai_tasks ORDER BY created_at DESC LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit_val], |row| {
            let status_str: String = row.get(4)?;
            let duration_i64: i64 = row.get(12)?;
            Ok(AiTask {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                model: row.get(2)?,
                prompt_preview: row.get(3)?,
                status: AiTaskStatus::from(status_str.as_str()),
                system_prompt: row.get(5)?,
                messages_json: row.get(6)?,
                result: row.get(7)?,
                error: row.get(8)?,
                created_at: row.get(9)?,
                started_at: row.get(10)?,
                completed_at: row.get(11)?,
                duration_ms: duration_i64.max(0) as u64,
            })
        })?;

        let mut tasks = Vec::new();
        for r in rows {
            if let Ok(t) = r {
                tasks.push(t);
            }
        }
        Ok(tasks)
    }

    pub fn get_ai_task(&self, task_id: &str) -> Result<Option<AiTask>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, model, prompt_preview, status, system_prompt,
                    messages_json, result, error, created_at, started_at, completed_at, duration_ms
             FROM ai_tasks WHERE id = ?1",
        )?;

        let mut rows = stmt.query_map(params![task_id], |row| {
            let status_str: String = row.get(4)?;
            let duration_i64: i64 = row.get(12)?;
            Ok(AiTask {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                model: row.get(2)?,
                prompt_preview: row.get(3)?,
                status: AiTaskStatus::from(status_str.as_str()),
                system_prompt: row.get(5)?,
                messages_json: row.get(6)?,
                result: row.get(7)?,
                error: row.get(8)?,
                created_at: row.get(9)?,
                started_at: row.get(10)?,
                completed_at: row.get(11)?,
                duration_ms: duration_i64.max(0) as u64,
            })
        })?;

        if let Some(r) = rows.next() {
            r.map(Some)
        } else {
            Ok(None)
        }
    }

    pub fn clear_ai_tasks(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ai_tasks", [])?;
        Ok(())
    }

    pub fn insert_chat_message(&self, msg: &AiChatMessageRecord) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO ai_chat_messages (id, conversation_id, role, content, timestamp, task_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![msg.id, msg.conversation_id, msg.role, msg.content, msg.timestamp, msg.task_id],
        )?;
        Ok(())
    }

    pub fn get_conversation_messages(&self, conv_id: &str) -> Result<Vec<AiChatMessageRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, timestamp, task_id
             FROM ai_chat_messages WHERE conversation_id = ?1 ORDER BY timestamp ASC",
        )?;

        let rows = stmt.query_map(params![conv_id], |row| {
            Ok(AiChatMessageRecord {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
                task_id: row.get(5)?,
            })
        })?;

        let mut messages = Vec::new();
        for r in rows {
            if let Ok(m) = r {
                messages.push(m);
            }
        }
        Ok(messages)
    }

    pub fn clear_conversation_messages(&self, conv_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ai_chat_messages WHERE conversation_id = ?1", params![conv_id])?;
        Ok(())
    }

    // =========================================================================
    // AUDIT LOG MANAGEMENT
    // =========================================================================
    pub fn log_audit_event(&self, entity_type: &str, entity_id: &str, action: &str, details_json: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO audit_logs (id, entity_type, entity_id, action, details_json, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, entity_type, entity_id, action, details_json, now],
        )?;
        Ok(())
    }

    pub fn get_audit_logs(&self, limit: Option<usize>) -> Result<Vec<AuditLogRecord>> {
        let conn = self.conn.lock().unwrap();
        let limit_val = limit.unwrap_or(100) as i64;
        let mut stmt = conn.prepare(
            "SELECT id, entity_type, entity_id, action, details_json, timestamp
             FROM audit_logs ORDER BY timestamp DESC LIMIT ?1"
        )?;
        let rows = stmt.query_map(params![limit_val], |row| {
            Ok(AuditLogRecord {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                action: row.get(3)?,
                details_json: row.get(4)?,
                timestamp: row.get(5)?,
            })
        })?;
        let mut logs = Vec::new();
        for r in rows {
            if let Ok(l) = r {
                logs.push(l);
            }
        }
        Ok(logs)
    }

    pub fn clear_audit_logs(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM audit_logs", [])?;
        Ok(())
    }

    // =========================================================================
    // TARGET CRUD & DATA INTEGRITY
    // =========================================================================
    pub fn update_target(&self, target: &Target) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let scope_json = serde_json::to_string(&target.scope).unwrap_or_default();
        conn.execute(
            "UPDATE targets SET name = ?1, primary_url = ?2, scope_json = ?3 WHERE id = ?4",
            params![target.name, target.primary_url, scope_json, target.id],
        )?;
        Ok(())
    }

    pub fn delete_target(&self, target_id: &str) -> Result<usize> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        // Safe cascading: remove validation records, findings, and endpoints
        tx.execute(
            "DELETE FROM validation_records WHERE target_id = ?1",
            params![target_id],
        )?;
        let deleted_findings = tx.execute(
            "DELETE FROM findings WHERE target_id = ?1",
            params![target_id],
        )?;
        tx.execute(
            "DELETE FROM discovered_endpoints WHERE target_id = ?1",
            params![target_id],
        )?;
        tx.execute("DELETE FROM targets WHERE id = ?1", params![target_id])?;
        tx.commit()?;
        Ok(deleted_findings)
    }

    // =========================================================================
    // FINDINGS CRUD & BULK OPERATIONS
    // =========================================================================
    pub fn update_finding(&self, id: &str, payload: &FindingUpdatePayload) -> Result<Option<Finding>> {
        let conn = self.conn.lock().unwrap();
        let sev_str = match payload.severity {
            FindingSeverity::Critical => "Critical",
            FindingSeverity::High => "High",
            FindingSeverity::Medium => "Medium",
            FindingSeverity::Low => "Low",
            FindingSeverity::Info => "Info",
        };
        let stat_str = match payload.status {
            FindingStatus::New => "New",
            FindingStatus::NeedsValidation => "NeedsValidation",
            FindingStatus::Validating => "Validating",
            FindingStatus::Confirmed => "Confirmed",
            FindingStatus::LikelyTruePositive => "LikelyTruePositive",
            FindingStatus::NeedsReview => "NeedsReview",
            FindingStatus::Unconfirmed => "Unconfirmed",
            FindingStatus::LikelyFalsePositive => "LikelyFalsePositive",
            FindingStatus::ValidationFailed => "ValidationFailed",
            FindingStatus::NotApplicable => "NotApplicable",
            FindingStatus::AcceptedRisk => "AcceptedRisk",
            FindingStatus::Fixed => "Fixed",
        };

        conn.execute(
            "UPDATE findings SET title = ?1, severity = ?2, confidence = ?3, affected_asset = ?4,
             evidence = ?5, cwe = ?6, remediation = ?7, status = ?8 WHERE id = ?9",
            params![
                payload.title,
                sev_str,
                payload.confidence,
                payload.affected_asset,
                payload.evidence,
                payload.cwe,
                payload.remediation,
                stat_str,
                id
            ],
        )?;

        drop(conn);
        let findings = self.get_findings()?;
        Ok(findings.into_iter().find(|f| f.id == id))
    }

    pub fn delete_finding(&self, finding_id: &str) -> Result<bool> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM validation_records WHERE finding_id = ?1", params![finding_id])?;
        let count = tx.execute("DELETE FROM findings WHERE id = ?1", params![finding_id])?;
        tx.commit()?;
        Ok(count > 0)
    }

    pub fn bulk_update_finding_status(&self, finding_ids: &[String], status: &str) -> Result<usize> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let mut updated = 0;
        for id in finding_ids {
            updated += tx.execute(
                "UPDATE findings SET status = ?1 WHERE id = ?2",
                params![status, id],
            )?;
        }
        tx.commit()?;
        Ok(updated)
    }

    pub fn bulk_delete_findings(&self, finding_ids: &[String]) -> Result<usize> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let mut deleted = 0;
        for id in finding_ids {
            tx.execute("DELETE FROM validation_records WHERE finding_id = ?1", params![id])?;
            deleted += tx.execute("DELETE FROM findings WHERE id = ?1", params![id])?;
        }
        tx.commit()?;
        Ok(deleted)
    }

    // =========================================================================
    // ENDPOINTS & SCAN HISTORY MANAGEMENT
    // =========================================================================
    pub fn delete_endpoint(&self, endpoint_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM discovered_endpoints WHERE id = ?1", params![endpoint_id])?;
        Ok(count > 0)
    }

    pub fn clear_endpoints(&self, target_id: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM discovered_endpoints WHERE target_id = ?1", params![target_id])?;
        Ok(count)
    }

    pub fn delete_scan_history(&self, scan_id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM scan_history WHERE id = ?1", params![scan_id])?;
        Ok(count > 0)
    }

    pub fn clear_scan_history(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM scan_history", [])?;
        Ok(())
    }

    // =========================================================================
    // ISSUE DOCUMENTATION & REPORTING SYSTEM
    // =========================================================================
    pub fn record_issue(&self, payload: &IssueCreatePayload) -> Result<IssueRecord> {
        let conn = self.conn.lock().unwrap();
        let subtype = payload.subtype.clone().unwrap_or_else(|| "General".into());
        let fp = IssueRecord::calculate_fingerprint(&payload.category, &subtype, &payload.affected_component, &payload.title);
        let now = chrono::Utc::now().to_rfc3339();
        let source = payload.source.clone().unwrap_or_else(|| "ManualReport".into());

        // Deduplication check
        let existing: Option<(String, u32, String, String)> = conn
            .query_row(
                "SELECT id, occurrence_count, history_json, status FROM issues WHERE fingerprint = ?1",
                params![fp],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .ok();

        if let Some((iss_id, occ_count, hist_json, cur_status)) = existing {
            let mut hist: Vec<IssueHistoryItem> = serde_json::from_str(&hist_json).unwrap_or_default();
            let new_count = occ_count + 1;
            hist.push(IssueHistoryItem {
                timestamp: now.clone(),
                action: "REOCCURRENCE".into(),
                actor: source.clone(),
                details: format!("Issue re-detected (occurrence #{})", new_count),
            });
            let new_hist = serde_json::to_string(&hist).unwrap_or_else(|_| "[]".into());

            // If previously resolved or closed, mark as RetestFailed
            let next_status = if cur_status == "Fixed" || cur_status == "Closed" {
                "RetestFailed".to_string()
            } else {
                cur_status
            };

            conn.execute(
                "UPDATE issues SET occurrence_count = ?1, last_detected = ?2, history_json = ?3, status = ?4,
                 error_details = COALESCE(?5, error_details), evidence = COALESCE(?6, evidence) WHERE id = ?7",
                params![new_count, now, new_hist, next_status, payload.error_details, payload.evidence, iss_id],
            )?;

            drop(conn);
            let _ = self.log_audit_event("issue", &iss_id, "UPDATE", &format!("Reoccurrence recorded for issue {}", iss_id));
            let updated = self.get_issue_by_id(&iss_id)?.expect("Issue must exist after update");
            return Ok(updated);
        }

        // Create new issue record
        let iss_id = format!("ISS-{}", &uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
        let status = payload.status.clone().unwrap_or_else(|| "Open".into());
        let verification = payload.verification_status.clone().unwrap_or_else(|| {
            if payload.category == "SecurityVulnerability" {
                "NeedsValidation".into()
            } else {
                "AutomatedObservation".into()
            }
        });

        let tags_json = match &payload.tags {
            Some(t) => serde_json::to_string(t).unwrap_or_else(|_| "[]".into()),
            None => "[]".into(),
        };

        let initial_history = vec![IssueHistoryItem {
            timestamp: now.clone(),
            action: "CREATED".into(),
            actor: source.clone(),
            details: format!("Initial issue report created from {}", source),
        }];
        let history_json = serde_json::to_string(&initial_history).unwrap_or_else(|_| "[]".into());

        conn.execute(
            "INSERT INTO issues (
                id, title, category, subtype, severity, status, verification_status,
                affected_target_id, affected_target_name, affected_component, source, occurrence_count,
                first_detected, last_detected, description, reproduction_steps, expected_behavior,
                actual_behavior, error_details, evidence, root_cause, impact_assessment,
                remediation_guidance, tags_json, assigned_owner, notes_json, related_finding_id,
                related_tool_id, history_json, fingerprint
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1, ?12, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, '[]', ?24, ?25, ?26, ?27)",
            params![
                iss_id,
                payload.title,
                payload.category,
                subtype,
                payload.severity,
                status,
                verification,
                payload.affected_target_id,
                payload.affected_target_name,
                payload.affected_component,
                source,
                now,
                payload.description,
                payload.reproduction_steps,
                payload.expected_behavior,
                payload.actual_behavior,
                payload.error_details,
                payload.evidence,
                payload.root_cause,
                payload.impact_assessment,
                payload.remediation_guidance,
                tags_json,
                payload.assigned_owner,
                payload.related_finding_id,
                payload.related_tool_id,
                history_json,
                fp,
            ],
        )?;

        drop(conn);
        let _ = self.log_audit_event("issue", &iss_id, "CREATE", &format!("Created issue {} ({})", payload.title, payload.category));
        let created = self.get_issue_by_id(&iss_id)?.expect("Issue must exist after creation");
        Ok(created)
    }

    pub fn get_issues(
        &self,
        target_id: Option<&str>,
        category: Option<&str>,
        severity: Option<&str>,
        status: Option<&str>,
        search: Option<&str>,
    ) -> Result<Vec<IssueRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut query = "SELECT id, title, category, subtype, severity, status, verification_status,
                                affected_target_id, affected_target_name, affected_component, source,
                                occurrence_count, first_detected, last_detected, description,
                                reproduction_steps, expected_behavior, actual_behavior, error_details,
                                evidence, root_cause, impact_assessment, remediation_guidance, tags_json,
                                assigned_owner, notes_json, related_finding_id, related_tool_id, history_json,
                                resolution_summary, resolved_at, fingerprint
                         FROM issues WHERE 1=1".to_string();

        let mut param_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(tid) = target_id {
            if !tid.is_empty() && tid != "ALL" {
                query.push_str(" AND affected_target_id = ?");
                param_values.push(Box::new(tid.to_string()));
            }
        }
        if let Some(cat) = category {
            if !cat.is_empty() && cat != "ALL" {
                query.push_str(" AND category = ?");
                param_values.push(Box::new(cat.to_string()));
            }
        }
        if let Some(sev) = severity {
            if !sev.is_empty() && sev != "ALL" {
                query.push_str(" AND severity = ?");
                param_values.push(Box::new(sev.to_string()));
            }
        }
        if let Some(st) = status {
            if !st.is_empty() && st != "ALL" {
                query.push_str(" AND status = ?");
                param_values.push(Box::new(st.to_string()));
            }
        }
        if let Some(s) = search {
            if !s.is_empty() {
                query.push_str(" AND (id LIKE ? OR title LIKE ? OR description LIKE ? OR affected_component LIKE ? OR error_details LIKE ?)");
                let pattern = format!("%{}%", s);
                param_values.push(Box::new(pattern.clone()));
                param_values.push(Box::new(pattern.clone()));
                param_values.push(Box::new(pattern.clone()));
                param_values.push(Box::new(pattern.clone()));
                param_values.push(Box::new(pattern));
            }
        }

        query.push_str(" ORDER BY last_detected DESC");

        let mut stmt = conn.prepare(&query)?;
        let params_slice: Vec<&dyn rusqlite::ToSql> = param_values.iter().map(|b| b.as_ref()).collect();

        let rows = stmt.query_map(params_slice.as_slice(), |r| {
            let occ_i64: i64 = r.get(11)?;
            Ok(IssueRecord {
                id: r.get(0)?,
                title: r.get(1)?,
                category: r.get(2)?,
                subtype: r.get(3)?,
                severity: r.get(4)?,
                status: r.get(5)?,
                verification_status: r.get(6)?,
                affected_target_id: r.get(7)?,
                affected_target_name: r.get(8)?,
                affected_component: r.get(9)?,
                source: r.get(10)?,
                occurrence_count: occ_i64 as u32,
                first_detected: r.get(12)?,
                last_detected: r.get(13)?,
                description: r.get(14)?,
                reproduction_steps: r.get(15)?,
                expected_behavior: r.get(16)?,
                actual_behavior: r.get(17)?,
                error_details: r.get(18)?,
                evidence: r.get(19)?,
                root_cause: r.get(20)?,
                impact_assessment: r.get(21)?,
                remediation_guidance: r.get(22)?,
                tags_json: r.get(23)?,
                assigned_owner: r.get(24)?,
                notes_json: r.get(25)?,
                related_finding_id: r.get(26)?,
                related_tool_id: r.get(27)?,
                history_json: r.get(28)?,
                resolution_summary: r.get(29)?,
                resolved_at: r.get(30)?,
                fingerprint: r.get(31)?,
            })
        })?;

        let mut issues = Vec::new();
        for res in rows {
            issues.push(res?);
        }
        Ok(issues)
    }

    pub fn get_issue_by_id(&self, id: &str) -> Result<Option<IssueRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, category, subtype, severity, status, verification_status,
                    affected_target_id, affected_target_name, affected_component, source,
                    occurrence_count, first_detected, last_detected, description,
                    reproduction_steps, expected_behavior, actual_behavior, error_details,
                    evidence, root_cause, impact_assessment, remediation_guidance, tags_json,
                    assigned_owner, notes_json, related_finding_id, related_tool_id, history_json,
                    resolution_summary, resolved_at, fingerprint
             FROM issues WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(r) = rows.next()? {
            let occ_i64: i64 = r.get(11)?;
            Ok(Some(IssueRecord {
                id: r.get(0)?,
                title: r.get(1)?,
                category: r.get(2)?,
                subtype: r.get(3)?,
                severity: r.get(4)?,
                status: r.get(5)?,
                verification_status: r.get(6)?,
                affected_target_id: r.get(7)?,
                affected_target_name: r.get(8)?,
                affected_component: r.get(9)?,
                source: r.get(10)?,
                occurrence_count: occ_i64 as u32,
                first_detected: r.get(12)?,
                last_detected: r.get(13)?,
                description: r.get(14)?,
                reproduction_steps: r.get(15)?,
                expected_behavior: r.get(16)?,
                actual_behavior: r.get(17)?,
                error_details: r.get(18)?,
                evidence: r.get(19)?,
                root_cause: r.get(20)?,
                impact_assessment: r.get(21)?,
                remediation_guidance: r.get(22)?,
                tags_json: r.get(23)?,
                assigned_owner: r.get(24)?,
                notes_json: r.get(25)?,
                related_finding_id: r.get(26)?,
                related_tool_id: r.get(27)?,
                history_json: r.get(28)?,
                resolution_summary: r.get(29)?,
                resolved_at: r.get(30)?,
                fingerprint: r.get(31)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_issue(&self, id: &str, payload: &IssueUpdatePayload) -> Result<IssueRecord> {
        let existing = self.get_issue_by_id(id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)?;

        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        let new_title = payload.title.as_deref().unwrap_or(&existing.title);
        let new_category = payload.category.as_deref().unwrap_or(&existing.category);
        let new_subtype = payload.subtype.as_deref().unwrap_or(&existing.subtype);
        let new_severity = payload.severity.as_deref().unwrap_or(&existing.severity);
        let new_status = payload.status.as_deref().unwrap_or(&existing.status);
        let new_verification = payload.verification_status.as_deref().unwrap_or(&existing.verification_status);
        let new_component = payload.affected_component.as_deref().unwrap_or(&existing.affected_component);
        let new_desc = payload.description.as_deref().unwrap_or(&existing.description);
        let new_repro = payload.reproduction_steps.as_deref().or(existing.reproduction_steps.as_deref());
        let new_expected = payload.expected_behavior.as_deref().or(existing.expected_behavior.as_deref());
        let new_actual = payload.actual_behavior.as_deref().or(existing.actual_behavior.as_deref());
        let new_err = payload.error_details.as_deref().or(existing.error_details.as_deref());
        let new_evidence = payload.evidence.as_deref().or(existing.evidence.as_deref());
        let new_root = payload.root_cause.as_deref().or(existing.root_cause.as_deref());
        let new_impact = payload.impact_assessment.as_deref().or(existing.impact_assessment.as_deref());
        let new_remediation = payload.remediation_guidance.as_deref().or(existing.remediation_guidance.as_deref());
        let new_tags = match &payload.tags {
            Some(t) => serde_json::to_string(t).unwrap_or_else(|_| existing.tags_json.clone()),
            None => existing.tags_json.clone(),
        };
        let new_owner = payload.assigned_owner.as_deref().or(existing.assigned_owner.as_deref());
        let new_res_summary = payload.resolution_summary.as_deref().or(existing.resolution_summary.as_deref());

        let resolved_at = if (new_status == "Fixed" || new_status == "Closed") && existing.resolved_at.is_none() {
            Some(now.clone())
        } else if new_status != "Fixed" && new_status != "Closed" {
            None
        } else {
            existing.resolved_at.clone()
        };

        let mut hist: Vec<IssueHistoryItem> = serde_json::from_str(&existing.history_json).unwrap_or_default();
        hist.push(IssueHistoryItem {
            timestamp: now.clone(),
            action: "EDITED".into(),
            actor: "User".into(),
            details: format!("Updated status to '{}', severity to '{}'", new_status, new_severity),
        });
        let new_hist_json = serde_json::to_string(&hist).unwrap_or_else(|_| "[]".into());

        conn.execute(
            "UPDATE issues SET
                title = ?1, category = ?2, subtype = ?3, severity = ?4, status = ?5,
                verification_status = ?6, affected_component = ?7, description = ?8,
                reproduction_steps = ?9, expected_behavior = ?10, actual_behavior = ?11,
                error_details = ?12, evidence = ?13, root_cause = ?14, impact_assessment = ?15,
                remediation_guidance = ?16, tags_json = ?17, assigned_owner = ?18,
                resolution_summary = ?19, resolved_at = ?20, history_json = ?21
             WHERE id = ?22",
            params![
                new_title, new_category, new_subtype, new_severity, new_status,
                new_verification, new_component, new_desc, new_repro, new_expected,
                new_actual, new_err, new_evidence, new_root, new_impact,
                new_remediation, new_tags, new_owner, new_res_summary, resolved_at,
                new_hist_json, id
            ],
        )?;

        drop(conn);
        let _ = self.log_audit_event("issue", id, "UPDATE", &format!("Updated issue fields for {}", id));
        let updated = self.get_issue_by_id(id)?.expect("Issue must exist after update");
        Ok(updated)
    }

    pub fn delete_issue(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM issues WHERE id = ?1", params![id])?;
        drop(conn);
        if count > 0 {
            let _ = self.log_audit_event("issue", id, "DELETE", &format!("Deleted issue {}", id));
        }
        Ok(count > 0)
    }

    pub fn bulk_update_issue_status(&self, ids: &[String], new_status: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        let resolved_at = if new_status == "Fixed" || new_status == "Closed" {
            Some(now.clone())
        } else {
            None
        };

        let mut updated = 0;
        for id in ids {
            updated += conn.execute(
                "UPDATE issues SET status = ?1, resolved_at = ?2 WHERE id = ?3",
                params![new_status, resolved_at, id],
            )?;
        }
        drop(conn);
        if updated > 0 {
            let _ = self.log_audit_event("issue", "bulk", "BULK_UPDATE", &format!("Bulk updated {} issues to status {}", updated, new_status));
        }
        Ok(updated)
    }

    pub fn bulk_delete_issues(&self, ids: &[String]) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut deleted = 0;
        for id in ids {
            deleted += conn.execute("DELETE FROM issues WHERE id = ?1", params![id])?;
        }
        drop(conn);
        if deleted > 0 {
            let _ = self.log_audit_event("issue", "bulk", "BULK_DELETE", &format!("Bulk deleted {} issues", deleted));
        }
        Ok(deleted)
    }

    pub fn add_issue_note(&self, id: &str, author: &str, text: &str) -> Result<IssueRecord> {
        let existing = self.get_issue_by_id(id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)?;
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        let mut notes: Vec<IssueNote> = serde_json::from_str(&existing.notes_json).unwrap_or_default();
        notes.push(IssueNote {
            id: uuid::Uuid::new_v4().to_string(),
            author: author.to_string(),
            text: text.to_string(),
            timestamp: now.clone(),
        });
        let new_notes_json = serde_json::to_string(&notes).unwrap_or_else(|_| "[]".into());

        let mut hist: Vec<IssueHistoryItem> = serde_json::from_str(&existing.history_json).unwrap_or_default();
        hist.push(IssueHistoryItem {
            timestamp: now,
            action: "NOTE_ADDED".into(),
            actor: author.to_string(),
            details: "Added internal investigation note".into(),
        });
        let new_hist_json = serde_json::to_string(&hist).unwrap_or_else(|_| "[]".into());

        conn.execute(
            "UPDATE issues SET notes_json = ?1, history_json = ?2 WHERE id = ?3",
            params![new_notes_json, new_hist_json, id],
        )?;

        drop(conn);
        let updated = self.get_issue_by_id(id)?.expect("Issue must exist after adding note");
        Ok(updated)
    }

    pub fn generate_issue_report(&self, params: &ReportGenerateParams) -> Result<GeneratedReport> {
        let all_issues = self.get_issues(params.target_id.as_deref(), None, None, None, None)?;

        let target_issues: Vec<IssueRecord> = match &params.issue_ids {
            Some(ids) if !ids.is_empty() => {
                let id_set: std::collections::HashSet<_> = ids.iter().collect();
                all_issues.into_iter().filter(|i| id_set.contains(&i.id)).collect()
            }
            _ => all_issues,
        };

        let report_id = format!("RPT-{}", &uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
        let now = chrono::Utc::now().to_rfc3339();

        // Calculate metrics
        let total = target_issues.len();
        let mut crit = 0; let mut high = 0; let mut med = 0; let mut low = 0; let mut info = 0;
        let mut sec_count = 0; let mut bug_count = 0; let mut tool_count = 0; let mut other_count = 0;
        let mut open_count = 0; let mut fixed_count = 0;

        for iss in &target_issues {
            match iss.severity.as_str() {
                "Critical" => crit += 1,
                "High" => high += 1,
                "Medium" => med += 1,
                "Low" => low += 1,
                _ => info += 1,
            }
            match iss.category.as_str() {
                "SecurityVulnerability" => sec_count += 1,
                "FunctionalBug" | "UiUxGlitch" => bug_count += 1,
                "ToolExecutionFailure" | "BackendApiError" => tool_count += 1,
                _ => other_count += 1,
            }
            if iss.status == "Fixed" || iss.status == "Closed" {
                fixed_count += 1;
            } else {
                open_count += 1;
            }
        }

        let metrics = serde_json::json!({
            "total": total,
            "critical": crit,
            "high": high,
            "medium": med,
            "low": low,
            "info": info,
            "security": sec_count,
            "bugs": bug_count,
            "tools": tool_count,
            "other": other_count,
            "open": open_count,
            "fixed": fixed_count
        });

        let scope_str = params.target_id.clone().unwrap_or_else(|| "All Platform Projects & Scopes".into());

        // Generate markdown content
        let mut md = String::new();
        md.push_str(&format!("# {}\n\n", params.title));
        md.push_str(&format!("**Report ID:** `{}`  \n", report_id));
        md.push_str(&format!("**Generated At:** {}  \n", now));
        md.push_str(&format!("**Template:** {}  \n", params.template));
        md.push_str(&format!("**Assessment Scope:** {}  \n\n", scope_str));
        md.push_str("---\n\n");

        if params.include_executive_summary {
            md.push_str("## 1. Executive Summary\n\n");
            md.push_str(&format!(
                "This assessment report encapsulates **{} documented issue(s)** across the configured evaluation scope. \
                Of these issues, **{}** represent critical or high exposures requiring immediate remediation attention. \
                A total of **{}** issues have been confirmed and fixed, leaving **{}** open or in progress.\n\n",
                total, crit + high, fixed_count, open_count
            ));
            md.push_str("| Metric | Count | Percentage |\n");
            md.push_str("| :--- | :--- | :--- |\n");
            md.push_str(&format!("| **Total Issues** | {} | 100% |\n", total));
            md.push_str(&format!("| **Critical Severity** | {} | {:.1}% |\n", crit, if total > 0 { (crit as f64 / total as f64) * 100.0 } else { 0.0 }));
            md.push_str(&format!("| **High Severity** | {} | {:.1}% |\n", high, if total > 0 { (high as f64 / total as f64) * 100.0 } else { 0.0 }));
            md.push_str(&format!("| **Medium Severity** | {} | {:.1}% |\n", med, if total > 0 { (med as f64 / total as f64) * 100.0 } else { 0.0 }));
            md.push_str(&format!("| **Low / Info** | {} | {:.1}% |\n", low + info, if total > 0 { ((low + info) as f64 / total as f64) * 100.0 } else { 0.0 }));
            md.push_str(&format!("| **Security Vulnerabilities** | {} | {:.1}% |\n", sec_count, if total > 0 { (sec_count as f64 / total as f64) * 100.0 } else { 0.0 }));
            md.push_str(&format!("| **Functional / UI Bugs** | {} | {:.1}% |\n", bug_count, if total > 0 { (bug_count as f64 / total as f64) * 100.0 } else { 0.0 }));
            md.push_str(&format!("| **Tool & Execution Errors** | {} | {:.1}% |\n\n", tool_count, if total > 0 { (tool_count as f64 / total as f64) * 100.0 } else { 0.0 }));
        }

        md.push_str("## 2. Issue Inventory & Categorized Breakdown\n\n");
        for (idx, iss) in target_issues.iter().enumerate() {
            md.push_str(&format!("### 2.{}. [{}] {}\n\n", idx + 1, iss.id, iss.title));
            md.push_str(&format!("- **Category:** `{}` ({})\n", iss.category, iss.subtype));
            md.push_str(&format!("- **Severity:** `{}` | **Status:** `{}` | **Verification:** `{}`\n", iss.severity, iss.status, iss.verification_status));
            md.push_str(&format!("- **Affected Component:** `{}`\n", iss.affected_component));
            md.push_str(&format!("- **Occurrence Count:** {} times (First: {}, Last: {})\n\n", iss.occurrence_count, iss.first_detected, iss.last_detected));
            md.push_str(&format!("**Description:**\n{}\n\n", iss.description));

            if let Some(repro) = &iss.reproduction_steps {
                if !repro.trim().is_empty() {
                    md.push_str(&format!("**Reproduction Steps:**\n{}\n\n", repro));
                }
            }

            if let Some(actual) = &iss.actual_behavior {
                if !actual.trim().is_empty() {
                    md.push_str(&format!("**Observed Behavior:** {}\n\n", actual));
                }
            }

            if params.include_evidence {
                if let Some(ev) = &iss.evidence {
                    if !ev.trim().is_empty() {
                        md.push_str("**Technical Evidence & Payload:**\n```\n");
                        md.push_str(ev);
                        md.push_str("\n```\n\n");
                    }
                }
                if let Some(err) = &iss.error_details {
                    if !err.trim().is_empty() {
                        md.push_str("**Error Details & Stack Trace:**\n```\n");
                        md.push_str(err);
                        md.push_str("\n```\n\n");
                    }
                }
            }

            if params.include_remediation {
                if let Some(rem) = &iss.remediation_guidance {
                    if !rem.trim().is_empty() {
                        md.push_str(&format!("**Remediation Recommendation:**\n{}\n\n", rem));
                    }
                }
                if let Some(root) = &iss.root_cause {
                    if !root.trim().is_empty() {
                        md.push_str(&format!("**Root Cause Analysis:** {}\n\n", root));
                    }
                }
            }

            if params.include_history && !iss.history_json.is_empty() && iss.history_json != "[]" {
                if let Ok(hist_items) = serde_json::from_str::<Vec<IssueHistoryItem>>(&iss.history_json) {
                    md.push_str("**Timeline & Activity Trail:**\n");
                    for h in hist_items {
                        md.push_str(&format!("- `{}` [**{}**] {}: {}\n", h.timestamp, h.action, h.actor, h.details));
                    }
                    md.push_str("\n");
                }
            }

            md.push_str("---\n\n");
        }

        md.push_str("## 3. Outstanding Limitations & Methodology\n\n");
        md.push_str("- Automated scanner observations are classified under `AutomatedObservation` until verified by security analysts.\n");
        md.push_str("- Findings with destructive potential undergo bounded validation under safe payload parameters.\n");
        md.push_str("- This report was generated autonomously by AppSec Nexus Issue Documentation & Reporting Engine.\n");

        Ok(GeneratedReport {
            id: report_id,
            title: params.title.clone(),
            template: params.template.clone(),
            generated_at: now,
            scope: scope_str,
            total_issues: total,
            metrics_json: metrics.to_string(),
            content: md,
            format: params.format.clone(),
        })
    }

    // -------------------------------------------------------------
    // BURP SUITE TRAFFIC & CONNECTOR METHODS
    // -------------------------------------------------------------

    pub fn insert_burp_traffic(
        &self,
        item: &crate::burp::BurpTrafficItem,
        content_hash: &str,
    ) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let req_headers = serde_json::to_string(&item.request_headers).unwrap_or_default();
        let res_headers = serde_json::to_string(&item.response_headers).unwrap_or_default();
        let rows = conn.execute(
            "INSERT OR IGNORE INTO burp_traffic (
                id, timestamp, method, url, host, path, status_code,
                request_headers_json, request_body, response_headers_json, response_body,
                response_size, latency_ms, source, is_tls, content_hash
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                item.id,
                item.timestamp,
                item.method,
                item.url,
                item.host,
                item.path,
                item.status_code,
                req_headers,
                item.request_body,
                res_headers,
                item.response_body,
                item.response_size,
                item.latency_ms,
                item.source,
                if item.is_tls { 1 } else { 0 },
                content_hash,
            ],
        )?;
        Ok(rows > 0)
    }

    pub fn get_burp_traffic(
        &self,
        limit: Option<usize>,
        offset: Option<usize>,
        search: Option<&str>,
        method: Option<&str>,
    ) -> Result<Vec<crate::burp::BurpTrafficItem>> {
        let conn = self.conn.lock().unwrap();
        let lim = limit.unwrap_or(200);
        let off = offset.unwrap_or(0);

        let mut query = "SELECT id, timestamp, method, url, host, path, status_code,
                         request_headers_json, request_body, response_headers_json, response_body,
                         response_size, latency_ms, source, is_tls FROM burp_traffic WHERE 1=1".to_string();
        let mut param_vals: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(m) = method {
            if !m.is_empty() && m != "ALL" {
                query.push_str(" AND UPPER(method) = ?");
                param_vals.push(Box::new(m.to_uppercase()));
            }
        }

        if let Some(s) = search {
            if !s.trim().is_empty() {
                query.push_str(" AND (url LIKE ? OR host LIKE ? OR path LIKE ? OR response_body LIKE ?)");
                let pattern = format!("%{}%", s.trim());
                param_vals.push(Box::new(pattern.clone()));
                param_vals.push(Box::new(pattern.clone()));
                param_vals.push(Box::new(pattern.clone()));
                param_vals.push(Box::new(pattern));
            }
        }

        query.push_str(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");
        param_vals.push(Box::new(lim as i64));
        param_vals.push(Box::new(off as i64));

        let mut stmt = conn.prepare(&query)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = param_vals.iter().map(|b| b.as_ref()).collect();

        let rows = stmt.query_map(param_refs.as_slice(), |row| {
            let req_hdr_raw: String = row.get(7)?;
            let res_hdr_raw: String = row.get(9)?;
            let req_headers = serde_json::from_str(&req_hdr_raw).unwrap_or_default();
            let res_headers = serde_json::from_str(&res_hdr_raw).unwrap_or_default();
            let is_tls_int: i32 = row.get(14)?;

            Ok(crate::burp::BurpTrafficItem {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                method: row.get(2)?,
                url: row.get(3)?,
                host: row.get(4)?,
                path: row.get(5)?,
                status_code: row.get(6)?,
                request_headers: req_headers,
                request_body: row.get(8)?,
                response_headers: res_headers,
                response_body: row.get(10)?,
                response_size: row.get(11)?,
                latency_ms: row.get(12)?,
                source: row.get(13)?,
                is_tls: is_tls_int != 0,
            })
        })?;

        let mut items = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                items.push(item);
            }
        }
        Ok(items)
    }

    pub fn clear_burp_traffic(&self) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM burp_traffic", [])?;
        Ok(rows)
    }

    pub fn delete_burp_traffic_item(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM burp_traffic WHERE id = ?1", params![id])?;
        Ok(rows > 0)
    }

    pub fn get_or_create_burp_token(&self) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let existing: Option<String> = conn
            .query_row(
                "SELECT value FROM appsec_settings WHERE key = 'burp_connector_token'",
                [],
                |row| row.get(0),
            )
            .ok();
        if let Some(tok) = existing {
            if !tok.trim().is_empty() {
                return Ok(tok);
            }
        }
        let new_token = format!("appsec_{}", uuid::Uuid::new_v4().simple());
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT OR REPLACE INTO appsec_settings (key, value, updated_at) VALUES ('burp_connector_token', ?1, ?2)",
            params![new_token, now],
        )?;
        Ok(new_token)
    }

    pub fn regenerate_burp_token(&self) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let new_token = format!("appsec_{}", uuid::Uuid::new_v4().simple());
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT OR REPLACE INTO appsec_settings (key, value, updated_at) VALUES ('burp_connector_token', ?1, ?2)",
            params![new_token, now],
        )?;
        Ok(new_token)
    }
}


