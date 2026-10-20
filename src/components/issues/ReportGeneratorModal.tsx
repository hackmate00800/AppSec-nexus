import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { IssueRecord, Target, GeneratedReport } from "../../types";
import {
  FileText,
  X,
  Download,
  Printer,
  Copy,
  Check,
} from "lucide-react";

interface ReportGeneratorModalProps {
  isOpen: boolean;
  issues: IssueRecord[];
  selectedIssueIds: Set<string>;
  targets: Target[];
  currentTargetId: string | null;
  onClose: () => void;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  issues,
  selectedIssueIds,
  targets,
  currentTargetId,
  onClose,
}) => {
  const [reportTitle, setReportTitle] = useState("AppSec Nexus Comprehensive Issue & Security Report");
  const [template, setTemplate] = useState("executive");
  const [scopeMode, setScopeMode] = useState<"all" | "selected" | "target">(
    selectedIssueIds.size > 0 ? "selected" : "all"
  );
  const [selectedTargetId, setSelectedTargetId] = useState(currentTargetId || "");
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeRemediation, setIncludeRemediation] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen, template, scopeMode, selectedTargetId, includeExecutiveSummary, includeEvidence, includeRemediation, includeHistory]);

  if (!isOpen) return null;

  const getFilteredIssueIds = (): string[] | undefined => {
    if (scopeMode === "selected" && selectedIssueIds.size > 0) {
      return Array.from(selectedIssueIds);
    }
    return undefined;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const issueIds = getFilteredIssueIds();
      const targetId = scopeMode === "target" ? selectedTargetId : undefined;

      const report = await invoke<GeneratedReport>("generate_issue_report", {
        params: {
          title: reportTitle.trim(),
          template,
          target_id: targetId,
          issue_ids: issueIds,
          include_executive_summary: includeExecutiveSummary,
          include_evidence: includeEvidence,
          include_remediation: includeRemediation,
          include_history: includeHistory,
          format: "markdown",
        },
      });
      setGeneratedReport(report);
    } catch (err) {
      console.error("Failed to generate report:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedReport.id.toLowerCase()}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const scopeIssues = (() => {
      if (scopeMode === "selected" && selectedIssueIds.size > 0) {
        return issues.filter((i) => selectedIssueIds.has(i.id));
      }
      if (scopeMode === "target" && selectedTargetId) {
        return issues.filter((i) => i.affected_target_id === selectedTargetId);
      }
      return issues;
    })();

    const reportData = {
      report_id: generatedReport?.id || `RPT-${Date.now()}`,
      title: reportTitle,
      template,
      generated_at: new Date().toISOString(),
      metrics: generatedReport ? JSON.parse(generatedReport.metrics_json || "{}") : {},
      issues: scopeIssues,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appsec-issues-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const scopeIssues = (() => {
      if (scopeMode === "selected" && selectedIssueIds.size > 0) {
        return issues.filter((i) => selectedIssueIds.has(i.id));
      }
      if (scopeMode === "target" && selectedTargetId) {
        return issues.filter((i) => i.affected_target_id === selectedTargetId);
      }
      return issues;
    })();

    const headers = [
      "Issue ID",
      "Title",
      "Category",
      "Subtype",
      "Severity",
      "Status",
      "Verification",
      "Affected Component",
      "Source",
      "Occurrences",
      "First Detected",
      "Last Detected",
      "Owner",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = scopeIssues.map((i) => [
      escapeCsv(i.id),
      escapeCsv(i.title),
      escapeCsv(i.category),
      escapeCsv(i.subtype),
      escapeCsv(i.severity),
      escapeCsv(i.status),
      escapeCsv(i.verification_status),
      escapeCsv(i.affected_component),
      escapeCsv(i.source),
      escapeCsv(i.occurrence_count),
      escapeCsv(i.first_detected),
      escapeCsv(i.last_detected),
      escapeCsv(i.assigned_owner || "Unassigned"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appsec-issues-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    if (!generatedReport) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              padding: 40px;
              max-width: 900px;
              margin: 0 auto;
              line-height: 1.6;
            }
            h1 { font-size: 24px; color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
            h2 { font-size: 18px; color: #0369a1; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            h3 { font-size: 15px; color: #334155; margin-top: 16px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background: #f1f5f9; color: #0f172a; font-weight: 600; }
            pre, code { font-family: monospace; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
            pre { padding: 12px; overflow-x: auto; font-size: 12px; }
            code { padding: 2px 4px; }
            @media print {
              body { padding: 0; }
              @page { margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 24px;">
            <span style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 1px;">
              AppSec Nexus Security Platform • Formal Issue Report
            </span>
          </div>
          <pre style="background: transparent; border: none; font-family: inherit; white-space: pre-wrap; font-size: 14px;">${generatedReport.content}</pre>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleCopyReport = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "960px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          padding: 0,
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={18} color="var(--accent-cyan)" />
            <h3 id="report-modal-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Professional Issue & Vulnerability Report Generator
            </h3>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px" }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body: Left Controls, Right Preview */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left Column: Config Panel */}
          <div
            style={{
              width: "360px",
              borderRight: "1px solid var(--border-color)",
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              background: "rgba(0, 0, 0, 0.15)",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Report Document Title
              </label>
              <input
                type="text"
                className="input-field"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title..."
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Report Template Style
              </label>
              <select
                className="input-field"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="executive">Executive Summary & Risk Overview</option>
                <option value="technical_vulnerability">Technical Security Vulnerability Report</option>
                <option value="bug_glitch">Bug, Glitch & Operational Defect Report</option>
                <option value="project_summary">Comprehensive Project Issue Audit</option>
                <option value="scan_execution">Scan & Tool Execution Failure Log</option>
                <option value="remediation_retest">Remediation, Patching & Retest Status</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
                Assessment Scope
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="scopeMode"
                    checked={scopeMode === "all"}
                    onChange={() => setScopeMode("all")}
                  />
                  <span>All Platform Issues ({issues.length})</span>
                </label>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="scopeMode"
                    checked={scopeMode === "selected"}
                    onChange={() => setScopeMode("selected")}
                  />
                  <span>Selected Issues Only ({selectedIssueIds.size} selected)</span>
                </label>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="scopeMode"
                    checked={scopeMode === "target"}
                    onChange={() => setScopeMode("target")}
                  />
                  <span>Specific Target Project</span>
                </label>
              </div>

              {scopeMode === "target" && (
                <select
                  className="input-field"
                  style={{ marginTop: "6px" }}
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                >
                  <option value="">Select target...</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "8px" }}>
                Sections to Include
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeExecutiveSummary}
                    onChange={(e) => setIncludeExecutiveSummary(e.target.checked)}
                  />
                  <span>Executive Summary & Metrics</span>
                </label>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeEvidence}
                    onChange={(e) => setIncludeEvidence(e.target.checked)}
                  />
                  <span>Technical Evidence & Payloads</span>
                </label>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeRemediation}
                    onChange={(e) => setIncludeRemediation(e.target.checked)}
                  />
                  <span>Remediation & Defensive Guidance</span>
                </label>
                <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeHistory}
                    onChange={(e) => setIncludeHistory(e.target.checked)}
                  />
                  <span>Retest & Audit History Trail</span>
                </label>
              </div>
            </div>

            {/* Export Actions Box */}
            <div
              style={{
                marginTop: "auto",
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-cyan)", textTransform: "uppercase" }}>
                Export Deliverable
              </span>
              <button
                className="btn btn-primary"
                onClick={handlePrintPdf}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.82rem" }}
              >
                <Printer size={14} />
                <span>Print / Save as PDF</span>
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportMarkdown}
                  style={{ fontSize: "0.78rem", padding: "6px" }}
                >
                  <Download size={13} style={{ marginRight: "4px" }} /> Markdown (.md)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportJson}
                  style={{ fontSize: "0.78rem", padding: "6px" }}
                >
                  <Download size={13} style={{ marginRight: "4px" }} /> JSON (.json)
                </button>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleExportCsv}
                style={{ fontSize: "0.78rem", padding: "6px" }}
              >
                <Download size={13} style={{ marginRight: "4px" }} /> Tabular CSV Spreadsheet (.csv)
              </button>
            </div>
          </div>

          {/* Right Column: Live Document Preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "#080c14",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                {generatedReport ? `Preview: ${generatedReport.id} (${generatedReport.total_issues} issues documented)` : "Generating report preview..."}
              </span>
              <button
                className="btn btn-secondary"
                onClick={handleCopyReport}
                style={{ padding: "4px 8px", fontSize: "0.74rem" }}
              >
                {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                <span style={{ marginLeft: "4px" }}>{copied ? "Copied" : "Copy Markdown"}</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {isGenerating ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)" }}>
                  <span>Synthesizing report records...</span>
                </div>
              ) : generatedReport ? (
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "monospace",
                    fontSize: "0.82rem",
                    lineHeight: "1.6",
                    color: "var(--text-main)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {generatedReport.content}
                </pre>
              ) : (
                <p style={{ color: "var(--text-dim)" }}>No report generated.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
