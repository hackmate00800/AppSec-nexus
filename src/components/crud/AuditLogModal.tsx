import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AuditLogRecord } from "../../types";
import { History, X, Search, Trash2, RotateCcw } from "lucide-react";

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  async function loadLogs() {
    setIsLoading(true);
    try {
      const records = await invoke<AuditLogRecord[]>("get_audit_logs", { limit: 100 });
      setLogs(records || []);
    } catch (err) {
      console.warn("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearLogs() {
    if (window.confirm("Are you sure you want to clear the audit activity trail?")) {
      try {
        await invoke("clear_audit_logs");
        setLogs([]);
      } catch (err) {
        console.warn("Failed to clear audit logs:", err);
      }
    }
  }

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.details_json.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === "ALL" || l.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
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
          maxWidth: "800px",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
          padding: "20px",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-log-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <History size={18} color="var(--accent-cyan)" />
            <h3 id="audit-log-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              System Audit Trail & Data Mutation Log
            </h3>
            <span style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginLeft: "4px" }}>
              ({filteredLogs.length} of {logs.length} events)
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="btn btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.74rem" }}
              onClick={loadLogs}
              disabled={isLoading}
              title="Refresh audit events"
            >
              <RotateCcw size={13} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.74rem", color: "var(--accent-rose)" }}
              onClick={handleClearLogs}
              disabled={isLoading || logs.length === 0}
              title="Clear audit trail"
            >
              <Trash2 size={13} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: "4px 8px" }}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search size={14} color="var(--text-dim)" style={{ position: "absolute", left: "10px", top: "11px" }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search audit trail by entity, action, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "32px", height: "36px", minHeight: "36px", fontSize: "0.82rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {["ALL", "target", "finding", "endpoint", "scan"].map((ent) => (
              <button
                key={ent}
                type="button"
                className={`filter-chip ${entityFilter === ent ? "active" : ""}`}
                style={{ fontSize: "0.74rem", padding: "3px 8px" }}
                onClick={() => setEntityFilter(ent)}
              >
                {ent.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
              {isLoading ? "Loading audit events..." : "No data mutation events matching your criteria."}
            </div>
          ) : (
            <table className="data-table" style={{ margin: 0, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "150px" }}>Timestamp</th>
                  <th style={{ width: "90px" }}>Action</th>
                  <th style={{ width: "100px" }}>Entity</th>
                  <th>Mutation Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isDelete = log.action.includes("DELETE") || log.action.includes("CLEAR");
                  const isCreate = log.action.includes("CREATE");
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: isDelete
                              ? "rgba(239, 68, 68, 0.15)"
                              : isCreate
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(6, 182, 212, 0.15)",
                            color: isDelete
                              ? "var(--accent-rose)"
                              : isCreate
                              ? "var(--accent-emerald)"
                              : "var(--accent-cyan)",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {log.entity_type}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {log.details_json}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
