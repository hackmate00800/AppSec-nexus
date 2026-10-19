import React, { useState, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  IssueRecord,
  IssueStatus,
  Target,
} from "../../types";
import { SeverityBadge, StatusBadge } from "../ui/Badge";
import { ConfirmationModal } from "../crud/ConfirmationModal";
import { IssueDetailModal } from "./IssueDetailModal";
import { IssueCreateModal } from "./IssueCreateModal";
import { IssueEditModal } from "./IssueEditModal";
import { ReportGeneratorModal } from "./ReportGeneratorModal";
import {
  ClipboardList,
  PlusCircle,
  FileText,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Columns,
  LayoutGrid,
  Trash2,
  Download,
  Eye,
  Edit2,
  RefreshCw,
} from "lucide-react";

interface IssueCenterProps {
  targets: Target[];
  currentTargetId: string | null;
  onRefreshIssues?: () => void;
}

export const IssueCenter: React.FC<IssueCenterProps> = ({
  targets,
  currentTargetId,
}) => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [targetFilter, setTargetFilter] = useState<string>(currentTargetId || "ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<"severity" | "title" | "occurrences" | "last_detected">("last_detected");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Multi-select
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [bulkStatusTarget, setBulkStatusTarget] = useState<IssueStatus>("Confirmed");

  // Modals state
  const [viewingIssue, setViewingIssue] = useState<IssueRecord | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<IssueRecord | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<IssueRecord | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // View mode & Kanban state
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<IssueStatus | null>(null);

  const handleDropIssueToStatus = async (issueId: string, newStatus: IssueStatus) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    );
    try {
      await invoke("bulk_update_issue_status", { ids: [issueId], status: newStatus });
    } catch (err) {
      console.error("Failed to update issue status via drag and drop:", err);
    }
  };

  const advanceStatus = (issue: IssueRecord, direction: "next" | "prev") => {
    const STATUS_KEYS: IssueStatus[] = ["Investigating", "Confirmed", "Fixed", "Closed"];
    const curIdx = STATUS_KEYS.indexOf(issue.status as IssueStatus);
    if (curIdx === -1) return;
    const targetIdx = direction === "next" ? curIdx + 1 : curIdx - 1;
    if (targetIdx >= 0 && targetIdx < STATUS_KEYS.length) {
      handleDropIssueToStatus(issue.id, STATUS_KEYS[targetIdx]);
    }
  };

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<IssueRecord[]>("get_issues", {
        targetId: targetFilter !== "ALL" ? targetFilter : undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setIssues(data);
    } catch (err) {
      console.error("Failed to fetch issues:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [categoryFilter, severityFilter, statusFilter, targetFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIssues();
  };

  const handleClearFilters = () => {
    setCategoryFilter("ALL");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
    setTargetFilter("ALL");
    setSearchQuery("");
  };

  // Metrics computation
  const metrics = useMemo(() => {
    let critHigh = 0;
    let secCount = 0;
    let bugCount = 0;
    let toolCount = 0;
    let fixedCount = 0;

    for (const iss of issues) {
      if (iss.severity === "Critical" || iss.severity === "High") {
        critHigh++;
      }
      if (iss.category === "SecurityVulnerability") {
        secCount++;
      } else if (iss.category === "FunctionalBug" || iss.category === "UiUxGlitch") {
        bugCount++;
      } else if (iss.category === "ToolExecutionFailure" || iss.category === "BackendApiError") {
        toolCount++;
      }
      if (iss.status === "Fixed" || iss.status === "Closed") {
        fixedCount++;
      }
    }

    const fixedRate = issues.length > 0 ? Math.round((fixedCount / issues.length) * 100) : 0;

    return {
      total: issues.length,
      critHigh,
      secCount,
      bugCount,
      toolCount,
      fixedCount,
      fixedRate,
    };
  }, [issues]);

  // Client-side sorting
  const SEVERITY_WEIGHTS: Record<string, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  };

  const sortedIssues = useMemo(() => {
    const list = [...issues];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "severity":
          comparison = (SEVERITY_WEIGHTS[b.severity] || 0) - (SEVERITY_WEIGHTS[a.severity] || 0);
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "occurrences":
          comparison = b.occurrence_count - a.occurrence_count;
          break;
        case "last_detected":
        default:
          comparison = new Date(b.last_detected).getTime() - new Date(a.last_detected).getTime();
          break;
      }
      return sortDirection === "asc" ? -comparison : comparison;
    });
    return list;
  }, [issues, sortField, sortDirection]);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / pageSize));
  const paginatedIssues = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedIssues.slice(start, start + pageSize);
  }, [sortedIssues, page, pageSize]);

  const handleSort = (field: "severity" | "title" | "occurrences" | "last_detected") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleToggleSelectAll = () => {
    const pageIds = paginatedIssues.map((i) => i.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIssueIds.has(id));
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplyBulkStatus = async () => {
    if (selectedIssueIds.size === 0) return;
    const ids = Array.from(selectedIssueIds);
    try {
      await invoke("bulk_update_issue_status", { ids, status: bulkStatusTarget });
      setIssues((prev) =>
        prev.map((i) => (selectedIssueIds.has(i.id) ? { ...i, status: bulkStatusTarget } : i))
      );
      setSelectedIssueIds(new Set());
    } catch (err) {
      console.error("Bulk status update failed:", err);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIssueIds.size === 0) return;
    const ids = Array.from(selectedIssueIds);
    try {
      await invoke("bulk_delete_issues", { ids });
      setIssues((prev) => prev.filter((i) => !selectedIssueIds.has(i.id)));
      setSelectedIssueIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    }
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingIssue) return;
    try {
      await invoke("delete_issue", { id: deletingIssue.id });
      setIssues((prev) => prev.filter((i) => i.id !== deletingIssue.id));
      if (viewingIssue?.id === deletingIssue.id) {
        setViewingIssue(null);
      }
      setDeletingIssue(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleExportAllJson = () => {
    const blob = new Blob([JSON.stringify(issues, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appsec-all-issues-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* 1. Top Section Header */}
      <div className="card" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ClipboardList size={24} color="var(--accent-cyan)" />
              <h2 className="card-title" style={{ margin: 0, fontSize: "1.3rem" }}>
                Issue Documentation & Tracking Center
              </h2>
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: "0.84rem", color: "var(--text-dim)" }}>
              Unified defect, bug, and vulnerability tracking across security scanners, functional workflows, UI/UX, database, and tool failures.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg-secondary)",
                padding: "2px",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                gap: "2px",
              }}
            >
              <button
                className={`btn ${viewMode === "table" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setViewMode("table")}
                style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                title="Display issues in detailed table view"
              >
                <LayoutGrid size={13} />
                <span>Table</span>
              </button>
              <button
                className={`btn ${viewMode === "kanban" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setViewMode("kanban")}
                style={{ padding: "5px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                title="Display issues in interactive Drag-and-Drop Kanban Board"
              >
                <Columns size={13} />
                <span>Kanban</span>
              </button>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setIsCreateOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <PlusCircle size={15} />
              <span>Report New Issue</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setIsReportModalOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FileText size={15} />
              <span>Generate Formal Report</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportAllJson}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              title="Export all issues to JSON"
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={fetchIssues}
              title="Refresh issue records"
              style={{ padding: "7px 10px" }}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* 2. Metrics Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>Total Documented</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)" }}>{metrics.total}</div>
          </div>
          <div style={{ background: "rgba(244, 63, 94, 0.05)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--accent-rose)", textTransform: "uppercase", fontWeight: 700 }}>Critical & High</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-rose)" }}>{metrics.critHigh}</div>
          </div>
          <div style={{ background: "rgba(6, 182, 212, 0.05)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", textTransform: "uppercase", fontWeight: 700 }}>Security Vulns</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{metrics.secCount}</div>
          </div>
          <div style={{ background: "rgba(245, 158, 11, 0.05)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--accent-amber)", textTransform: "uppercase", fontWeight: 700 }}>Bugs & Glitches</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-amber)" }}>{metrics.bugCount}</div>
          </div>
          <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", textTransform: "uppercase", fontWeight: 700 }}>Resolution Rate</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{metrics.fixedRate}%</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Category Pills */}
      <div className="card" style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          {[
            { id: "ALL", label: "All Categories" },
            { id: "SecurityVulnerability", label: "Security Vulns" },
            { id: "FunctionalBug", label: "Bugs" },
            { id: "UiUxGlitch", label: "UI / UX" },
            { id: "BackendApiError", label: "Backend / API" },
            { id: "DatabaseIssue", label: "Database" },
            { id: "ToolExecutionFailure", label: "Tool Failures" },
            { id: "PerformanceIssue", label: "Performance" },
            { id: "ConfigurationIssue", label: "Config" },
            { id: "ManualReport", label: "Manual" },
          ].map((pill) => (
            <button
              key={pill.id}
              className={`filter-chip ${categoryFilter === pill.id ? "active" : ""}`}
              onClick={() => {
                setCategoryFilter(pill.id);
                setPage(1);
              }}
              style={{ fontSize: "0.76rem", padding: "4px 10px" }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <form onSubmit={handleSearchSubmit} style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search
              size={14}
              color="var(--text-dim)"
              style={{ position: "absolute", left: "10px", top: "10px" }}
            />
            <input
              type="text"
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, title, affected component, or error text..."
              style={{ paddingLeft: "30px", height: "34px", fontSize: "0.8rem" }}
            />
          </form>

          <select
            className="input-field"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "130px", height: "34px", fontSize: "0.8rem" }}
            aria-label="Filter by Severity"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Info">Info</option>
          </select>

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "130px", height: "34px", fontSize: "0.8rem" }}
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Investigating">Investigating</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Fixed">Fixed</option>
            <option value="AcceptedRisk">Accepted Risk</option>
            <option value="RetestFailed">Retest Failed</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            className="input-field"
            value={targetFilter}
            onChange={(e) => {
              setTargetFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "160px", height: "34px", fontSize: "0.8rem" }}
            aria-label="Filter by Project Scope"
          >
            <option value="ALL">All Target Scopes</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {(categoryFilter !== "ALL" || severityFilter !== "ALL" || statusFilter !== "ALL" || targetFilter !== "ALL" || searchQuery) && (
            <button
              className="btn btn-secondary"
              onClick={handleClearFilters}
              style={{ height: "34px", fontSize: "0.78rem" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Multi-Select Bulk Actions Bar */}
      {selectedIssueIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "rgba(6, 182, 212, 0.1)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            borderRadius: "8px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-cyan)" }}>
              {selectedIssueIds.size} issue(s) selected
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: "3px 8px", fontSize: "0.74rem" }}
              onClick={() => setSelectedIssueIds(new Set())}
            >
              Deselect All
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Bulk Status:</span>
            <select
              className="input-field"
              value={bulkStatusTarget}
              onChange={(e) => setBulkStatusTarget(e.target.value as IssueStatus)}
              style={{ width: "130px", height: "30px", fontSize: "0.78rem" }}
            >
              <option value="Investigating">Investigating</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Fixed">Fixed</option>
              <option value="AcceptedRisk">Accepted Risk</option>
              <option value="Closed">Closed</option>
            </select>
            <button
              className="btn btn-primary"
              style={{ height: "30px", padding: "0 10px", fontSize: "0.78rem" }}
              onClick={handleApplyBulkStatus}
            >
              Apply
            </button>
            <button
              className="btn btn-secondary"
              style={{ height: "30px", padding: "0 10px", fontSize: "0.78rem", color: "var(--accent-rose)" }}
              onClick={() => setIsBulkDeleteModalOpen(true)}
            >
              <Trash2 size={13} style={{ marginRight: "4px" }} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* 5. Issue Data Presentation: Table View vs Kanban Board */}
      {viewMode === "table" ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {sortedIssues.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-dim)" }}>
            <ClipboardList size={38} color="var(--text-dim)" style={{ margin: "0 auto 12px auto", opacity: 0.6 }} />
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", color: "var(--text-main)" }}>
              No Issues Found
            </h3>
            <p style={{ margin: 0, fontSize: "0.82rem" }}>
              {categoryFilter !== "ALL" || severityFilter !== "ALL" || searchQuery
                ? "Try adjusting your category, severity, or search query filter."
                : "No defects, bugs, or security vulnerabilities have been documented yet. Run a scan or click 'Report New Issue'."}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "38px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={
                        paginatedIssues.length > 0 &&
                        paginatedIssues.every((i) => selectedIssueIds.has(i.id))
                      }
                      onChange={handleToggleSelectAll}
                      style={{ cursor: "pointer" }}
                      aria-label="Select all issues on page"
                    />
                  </th>
                  <th
                    style={{ width: "105px", cursor: "pointer" }}
                    onClick={() => handleSort("severity")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Severity</span>
                      {sortField === "severity" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} opacity={0.4} />
                      )}
                    </div>
                  </th>
                  <th
                    style={{ minWidth: "240px", cursor: "pointer" }}
                    onClick={() => handleSort("title")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Issue ID & Summary</span>
                      {sortField === "title" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} opacity={0.4} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "140px" }}>Category</th>
                  <th style={{ minWidth: "180px" }}>Affected Component</th>
                  <th
                    style={{ width: "100px", cursor: "pointer" }}
                    onClick={() => handleSort("occurrences")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Count</span>
                      {sortField === "occurrences" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} opacity={0.4} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "115px" }}>Status</th>
                  <th
                    style={{ width: "140px", cursor: "pointer" }}
                    onClick={() => handleSort("last_detected")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Last Seen</span>
                      {sortField === "last_detected" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} opacity={0.4} />
                      )}
                    </div>
                  </th>
                  <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIssues.map((iss) => (
                  <tr
                    key={iss.id}
                    onClick={() => setViewingIssue(iss)}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(e) => handleToggleSelectOne(iss.id, e)} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIssueIds.has(iss.id)}
                        onChange={() => {}}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <SeverityBadge severity={iss.severity as any} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.74rem",
                            color: "var(--accent-cyan)",
                            background: "rgba(6, 182, 212, 0.1)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {iss.id}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.85rem" }}>
                          {iss.title}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>
                        {iss.category}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "0.76rem",
                          color: "var(--text-muted)",
                          display: "block",
                          maxWidth: "240px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={iss.affected_component}
                      >
                        {iss.affected_component}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "10px",
                          background: iss.occurrence_count > 1 ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          color: iss.occurrence_count > 1 ? "var(--accent-amber)" : "var(--text-dim)",
                        }}
                      >
                        {iss.occurrence_count}x
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={iss.status as any} />
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                      {new Date(iss.last_detected).toLocaleDateString()} {new Date(iss.last_detected).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 7px" }}
                          onClick={() => setViewingIssue(iss)}
                          title="View Issue Details"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 7px" }}
                          onClick={() => setEditingIssue(iss)}
                          title="Edit Issue"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 7px", color: "var(--accent-rose)" }}
                          onClick={() => setDeletingIssue(iss)}
                          title="Delete Issue"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination Controls */}
        {sortedIssues.length > 0 && (
          <div
            style={{
              padding: "10px 18px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              background: "rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--text-dim)" }}>
              <span>
                Showing {sortedIssues.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, sortedIssues.length)} of {sortedIssues.length} issues
              </span>
              <span>•</span>
              <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "0.78rem",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                Previous
              </button>
              <span style={{ fontSize: "0.76rem", color: "var(--text-dim)", padding: "0 4px" }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      ) : (
        /* Kanban Drag-and-Drop Board */
        <div
          className="kanban-board-container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "14px",
            alignItems: "flex-start",
          }}
        >
          {[
            { status: "Investigating" as IssueStatus, title: "Investigating", color: "var(--accent-amber)" },
            { status: "Confirmed" as IssueStatus, title: "Confirmed", color: "var(--accent-rose)" },
            { status: "Fixed" as IssueStatus, title: "Fixed", color: "var(--accent-emerald)" },
            { status: "Closed" as IssueStatus, title: "Closed / Accepted", color: "var(--text-dim)" },
          ].map((col) => {
            const colIssues = sortedIssues.filter((i) => {
              if (col.status === "Closed") {
                return i.status === "Closed" || i.status === "AcceptedRisk";
              }
              return i.status === col.status;
            });
            const isDragOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== col.status) setDragOverColumn(col.status);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === col.status) setDragOverColumn(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedId = e.dataTransfer.getData("text/plain") || draggedIssueId;
                  setDragOverColumn(null);
                  setDraggedIssueId(null);
                  if (droppedId) {
                    handleDropIssueToStatus(droppedId, col.status);
                  }
                }}
                className="kanban-column"
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${isDragOver ? col.color : "var(--border-color)"}`,
                  boxShadow: isDragOver ? `0 0 16px rgba(6, 182, 212, 0.25)` : "var(--shadow-sm)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  minHeight: "420px",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "8px",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: col.color,
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>
                      {col.title}
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "10px",
                        background: "var(--bg-secondary)",
                        color: "var(--text-dim)",
                      }}
                    >
                      {colIssues.length}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                    Drop cards here
                  </span>
                </div>

                {/* Column Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  {colIssues.length === 0 ? (
                    <div
                      style={{
                        padding: "28px 12px",
                        textAlign: "center",
                        color: "var(--text-dim)",
                        fontSize: "0.75rem",
                        border: "1px dashed var(--border-color)",
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.05)",
                      }}
                    >
                      No issues in this stage. Drag an issue card here.
                    </div>
                  ) : (
                    colIssues.map((iss) => {
                      const isDragging = draggedIssueId === iss.id;
                      return (
                        <div
                          key={iss.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedIssueId(iss.id);
                            e.dataTransfer.setData("text/plain", iss.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggedIssueId(null);
                            setDragOverColumn(null);
                          }}
                          style={{
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            padding: "10px 12px",
                            opacity: isDragging ? 0.35 : 1,
                            cursor: "grab",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            boxShadow: "var(--shadow-sm)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* Card top */}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                              <GripVertical size={13} color="var(--text-dim)" style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  color: "var(--text-main)",
                                  lineHeight: "1.3",
                                }}
                              >
                                {iss.title}
                              </span>
                            </div>
                            <SeverityBadge severity={iss.severity} />
                          </div>

                          {/* Card metadata */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                            <span style={{ padding: "1px 5px", borderRadius: "4px", background: "var(--bg-card)", color: "var(--text-muted)" }}>
                              {iss.category}
                            </span>
                            {iss.occurrence_count > 1 && (
                              <span style={{ padding: "1px 5px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)", fontWeight: 700 }}>
                                {iss.occurrence_count}x
                              </span>
                            )}
                            {(iss.affected_target_name || iss.affected_target_id) && (
                              <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {iss.affected_target_name || iss.affected_target_id}
                              </span>
                            )}
                          </div>

                          {/* Card bottom actions: move prev/next, view, delete */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderTop: "1px solid var(--border-color)",
                              paddingTop: "6px",
                              marginTop: "2px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <button
                                onClick={() => advanceStatus(iss, "prev")}
                                className="icon-btn-subtle"
                                style={{ padding: "3px 5px", fontSize: "10px" }}
                                title="Move status backward (Keyboard accessible)"
                              >
                                <ArrowLeft size={11} />
                              </button>
                              <button
                                onClick={() => advanceStatus(iss, "next")}
                                className="icon-btn-subtle"
                                style={{ padding: "3px 5px", fontSize: "10px" }}
                                title="Move status forward (Keyboard accessible)"
                              >
                                <ArrowRight size={11} />
                              </button>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <button
                                onClick={() => setViewingIssue(iss)}
                                className="icon-btn-subtle"
                                style={{ padding: "3px 5px" }}
                                title="View details"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => setDeletingIssue(iss)}
                                className="icon-btn-subtle"
                                style={{ padding: "3px 5px", color: "var(--accent-rose)" }}
                                title="Delete issue"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Modals */}
      <IssueDetailModal
        isOpen={Boolean(viewingIssue)}
        issue={viewingIssue}
        onClose={() => setViewingIssue(null)}
        onEdit={(iss) => {
          setViewingIssue(null);
          setEditingIssue(iss);
        }}
        onDelete={(iss) => {
          setViewingIssue(null);
          setDeletingIssue(iss);
        }}
        onUpdate={(updated) => {
          setViewingIssue(updated);
          setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        }}
      />

      <IssueCreateModal
        isOpen={isCreateOpen}
        targets={targets}
        onCreated={(created) => {
          setIssues((prev) => [created, ...prev]);
        }}
        onClose={() => setIsCreateOpen(false)}
      />

      <IssueEditModal
        isOpen={Boolean(editingIssue)}
        issue={editingIssue}
        onSave={(updated) => {
          setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setEditingIssue(null);
        }}
        onClose={() => setEditingIssue(null)}
      />

      <ReportGeneratorModal
        isOpen={isReportModalOpen}
        issues={issues}
        selectedIssueIds={selectedIssueIds}
        targets={targets}
        currentTargetId={currentTargetId}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Delete Single Confirmation */}
      <ConfirmationModal
        isOpen={Boolean(deletingIssue)}
        title="Delete Documented Issue"
        message="Are you sure you want to permanently delete this issue and its activity history?"
        recordIdentifier={deletingIssue ? `[${deletingIssue.id}] ${deletingIssue.title}` : ""}
        confirmLabel="Delete Issue"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteSingle}
        onClose={() => setDeletingIssue(null)}
      />

      {/* Delete Bulk Confirmation */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        title="Bulk Delete Documented Issues"
        message={`Are you sure you want to permanently delete ${selectedIssueIds.size} selected issues?`}
        recordIdentifier={`${selectedIssueIds.size} issues selected for deletion`}
        confirmLabel="Delete Selected"
        confirmVariant="danger"
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  );
};
