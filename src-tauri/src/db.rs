use crate::models::{Finding, FindingSeverity, FindingStatus, Target};
use rusqlite::{params, Connection, Result};
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn init(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;

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
                created_at TEXT NOT NULL
            )",
            [],
        )?;

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

        conn.execute(
            "INSERT OR REPLACE INTO findings (id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
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
                finding.created_at
            ],
        )?;
        Ok(())
    }

    pub fn get_findings(&self) -> Result<Vec<Finding>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, target_id, title, severity, confidence, affected_asset, evidence, source_tool, tool_version, cwe, remediation, status, created_at FROM findings ORDER BY created_at DESC"
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
}
