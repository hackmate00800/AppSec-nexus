use crate::models::{DiscoveredEndpoint, Finding, FindingSeverity, FindingStatus, ScanResult, Target};
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
                fingerprint TEXT UNIQUE
            )",
            [],
        )?;

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
            FindingStatus::Confirmed => "Confirmed",
            FindingStatus::NeedsReview => "NeedsReview",
            FindingStatus::AcceptedRisk => "AcceptedRisk",
            FindingStatus::Fixed => "Fixed",
        };

        let fingerprint = if finding.fingerprint.is_empty() {
            Finding::calculate_fingerprint(&finding.target_id, &finding.title, &finding.affected_asset)
        } else {
            finding.fingerprint.clone()
        };

        conn.execute(
            "INSERT INTO findings (id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at, fingerprint)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(fingerprint) DO UPDATE SET
                evidence = excluded.evidence,
                tool_version = excluded.tool_version,
                created_at = excluded.created_at",
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
                fingerprint
            ],
        )?;
        Ok(())
    }

    pub fn get_findings(&self) -> Result<Vec<Finding>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at, COALESCE(fingerprint, '') FROM findings ORDER BY created_at DESC"
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
                "Confirmed" => FindingStatus::Confirmed,
                "NeedsReview" => FindingStatus::NeedsReview,
                "AcceptedRisk" => FindingStatus::AcceptedRisk,
                "Fixed" => FindingStatus::Fixed,
                _ => FindingStatus::New,
            };

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
}


