use crate::models::{Finding, FindingSeverity, Target};

pub struct ReportGenerator;

impl ReportGenerator {
    pub fn generate_html(target: &Target, findings: &[Finding]) -> String {
        let crit_count = findings.iter().filter(|f| f.severity == FindingSeverity::Critical).count();
        let high_count = findings.iter().filter(|f| f.severity == FindingSeverity::High).count();
        let med_count = findings.iter().filter(|f| f.severity == FindingSeverity::Medium).count();
        let low_count = findings.iter().filter(|f| f.severity == FindingSeverity::Low).count();
        let info_count = findings.iter().filter(|f| f.severity == FindingSeverity::Info).count();

        let date_str = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC").to_string();

        let risk_score = if crit_count > 0 {
            "CRITICAL RISK"
        } else if high_count > 0 {
            "HIGH RISK"
        } else if med_count > 0 {
            "MEDIUM RISK"
        } else {
            "LOW / INFORMATIONAL"
        };

        let risk_color = if crit_count > 0 {
            "#f43f5e"
        } else if high_count > 0 {
            "#fb923c"
        } else if med_count > 0 {
            "#facc15"
        } else {
            "#10b981"
        };

        let mut findings_html = String::new();
        for f in findings {
            let (badge_bg, badge_fg) = match f.severity {
                FindingSeverity::Critical => ("#ffe4e6", "#e11d48"),
                FindingSeverity::High => ("#ffedd5", "#ea580c"),
                FindingSeverity::Medium => ("#fef9c3", "#ca8a04"),
                FindingSeverity::Low => ("#dbeafe", "#2563eb"),
                FindingSeverity::Info => ("#f1f5f9", "#475569"),
            };

            findings_html.push_str(&format!(
                r#"
                <div class="finding-card">
                    <div class="finding-header">
                        <span class="badge" style="background-color: {badge_bg}; color: {badge_fg}; font-weight: 700;">{:?}</span>
                        <h3 style="margin: 0; font-size: 1.1rem; color: #0f172a;">{}</h3>
                    </div>
                    <div class="finding-meta">
                        <span><strong>Asset:</strong> {}</span> • 
                        <span><strong>Source Tool:</strong> {} (v{})</span> • 
                        <span><strong>CWE:</strong> {}</span>
                    </div>
                    <div class="finding-section">
                        <h4>Evidence</h4>
                        <pre>{}</pre>
                    </div>
                    <div class="finding-section">
                        <h4>Remediation Guidance</h4>
                        <div class="remediation-box">{}</div>
                    </div>
                </div>
                "#,
                f.severity,
                html_escape(&f.title),
                html_escape(&f.affected_asset),
                html_escape(&f.source_tool),
                html_escape(&f.tool_version),
                html_escape(f.cwe.as_deref().unwrap_or("N/A")),
                html_escape(&f.evidence),
                html_escape(&f.remediation)
            ));
        }

        format!(
            r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AppSec Nexus Security Assessment Report - {}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
        }}
        .report-container {{
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
        }}
        .header {{
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 28px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin: 24px 0;
        }}
        .metric-box {{
            background: #f1f5f9;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }}
        .metric-number {{
            font-size: 1.8rem;
            font-weight: 800;
        }}
        .metric-label {{
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }}
        .finding-card {{
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: #ffffff;
        }}
        .finding-header {{
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }}
        .badge {{
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
        }}
        .finding-meta {{
            font-size: 0.82rem;
            color: #64748b;
            margin-bottom: 14px;
        }}
        .finding-section h4 {{
            margin: 12px 0 6px 0;
            font-size: 0.88rem;
            color: #334155;
            text-transform: uppercase;
        }}
        pre {{
            background: #0f172a;
            color: #38bdf8;
            padding: 12px;
            border-radius: 6px;
            font-size: 0.82rem;
            overflow-x: auto;
            white-space: pre-wrap;
            font-family: monospace;
        }}
        .remediation-box {{
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            padding: 12px;
            border-radius: 6px;
            font-size: 0.88rem;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 0.75rem;
            color: #94a3b8;
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1 style="margin: 0; color: #0f172a;">AppSec Nexus Security Assessment Report</h1>
            <p style="color: #64748b; margin-top: 6px;">Target: <strong>{} ({})</strong></p>
            <p style="color: #64748b; font-size: 0.85rem;">Generated on {}</p>
            <div style="display: inline-block; padding: 6px 14px; border-radius: 6px; background-color: {}; color: white; font-weight: 700; font-size: 0.9rem; margin-top: 10px;">
                Overall Rating: {}
            </div>
        </div>

        <h2>Executive Summary</h2>
        <p>This automated security assessment was performed using <strong>AppSec Nexus</strong>. The assessment covered authorized target endpoints, passive header hygiene, cookie protections, and automated vulnerability scanning.</p>

        <div class="metrics-grid">
            <div class="metric-box">
                <div class="metric-number" style="color: #e11d48;">{}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric-box">
                <div class="metric-number" style="color: #ea580c;">{}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric-box">
                <div class="metric-number" style="color: #ca8a04;">{}</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric-box">
                <div class="metric-number" style="color: #2563eb;">{}</div>
                <div class="metric-label">Low</div>
            </div>
            <div class="metric-box">
                <div class="metric-number" style="color: #475569;">{}</div>
                <div class="metric-label">Info</div>
            </div>
        </div>

        <h2>Discovered Findings (Total: {})</h2>
        {}

        <div class="footer">
            Report generated by AppSec Nexus Desktop Security Platform • Confidential & Authorized Pentest Document
        </div>
    </div>
</body>
</html>"#,
            html_escape(&target.name),
            html_escape(&target.name),
            html_escape(&target.primary_url),
            date_str,
            risk_color,
            risk_score,
            crit_count,
            high_count,
            med_count,
            low_count,
            info_count,
            findings.len(),
            findings_html
        )
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
