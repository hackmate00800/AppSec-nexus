import React, { useState, useEffect } from "react";
import { ScanEvent, Finding } from "../../types";
import { invoke } from "@tauri-apps/api/core";
import {
  Clock,
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Activity,
} from "lucide-react";

interface ScanTimelineViewerProps {
  scanId?: string;
  findingId?: string;
  findings?: Finding[];
  onSelectFinding?: (finding: Finding) => void;
}

export const ScanTimelineViewer: React.FC<ScanTimelineViewerProps> = ({
  scanId,
  findingId,
  findings = [],
  onSelectFinding,
}) => {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const fetchEvents = () => {
    setLoading(true);
    invoke<ScanEvent[]>("get_scan_events", {
      scanId: scanId || null,
      findingId: findingId || null,
      limit: 250,
    })
      .then((data) => {
        setEvents(data);
      })
      .catch((err) => {
        console.error("Failed to load scan events:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, [scanId, findingId]);

  const filteredEvents = events.filter((e) => {
    if (severityFilter !== "ALL" && e.severity.toLowerCase() !== severityFilter.toLowerCase()) {
      return false;
    }
    if (typeFilter !== "ALL" && e.event_type.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.message.toLowerCase().includes(q) ||
        e.component_or_tool.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        e.metadata_json.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyLogs = () => {
    const logText = filteredEvents
      .map(
        (e) =>
          `[${e.timestamp}] [${e.severity.toUpperCase()}] [${e.component_or_tool}] ${e.event_type}: ${e.message} ${e.duration_ms > 0 ? `(${e.duration_ms}ms)` : ""}`
      )
      .join("\n");
    navigator.clipboard.writeText(logText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="scan-timeline-viewer" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Controls Bar */}
      <div
        className="card"
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
            Scan Execution Activity Timeline ({events.length} Events)
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Search event logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                padding: "5px 8px 5px 28px",
                fontSize: "0.78rem",
                color: "var(--text-main)",
                width: "200px",
              }}
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              padding: "5px 8px",
              fontSize: "0.78rem",
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              padding: "5px 8px",
              fontSize: "0.78rem",
            }}
          >
            <option value="ALL">All Event Types</option>
            <option value="scan_created">scan_created</option>
            <option value="scope_validated">scope_validated</option>
            <option value="tool_executed">tool_executed</option>
            <option value="candidate_finding_created">candidate_finding_created</option>
            <option value="scan_completed">scan_completed</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyLogs}
            disabled={filteredEvents.length === 0}
            style={{ fontSize: "0.78rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}
            title="Copy sanitized plaintext event timeline to clipboard"
          >
            {isCopied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
            <span>{isCopied ? "Copied" : "Copy Logs"}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchEvents}
            style={{ fontSize: "0.78rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}
            title="Refresh event stream"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Events Timeline Container */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          Loading real-time scan event logs...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>
          <Clock size={32} color="var(--text-dim)" style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: "0.95rem" }}>No scan activity events match your filter criteria.</p>
          <p style={{ margin: "6px 0 0 0", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Execute a scan or tool adapter to stream live detection events into this timeline.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredEvents.map((evt) => {
              const isExpanded = expandedEventId === evt.id;
              const relatedFinding = evt.related_finding_id
                ? findings.find((f) => f.id === evt.related_finding_id)
                : null;

              return (
                <div
                  key={evt.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 6,
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background:
                            evt.severity === "success"
                              ? "rgba(16, 185, 129, 0.15)"
                              : evt.severity === "warning"
                              ? "rgba(245, 158, 11, 0.15)"
                              : evt.severity === "error"
                              ? "rgba(244, 63, 94, 0.15)"
                              : "rgba(6, 182, 212, 0.15)",
                          color:
                            evt.severity === "success"
                              ? "var(--accent-emerald)"
                              : evt.severity === "warning"
                              ? "var(--accent-amber)"
                              : evt.severity === "error"
                              ? "var(--accent-rose)"
                              : "var(--accent-cyan)",
                        }}
                      >
                        {evt.event_type}
                      </span>

                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {evt.message}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", padding: 0 }}
                        title="Toggle metadata JSON"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    <div>
                      Tool: <strong>{evt.component_or_tool}</strong>
                      {evt.duration_ms > 0 && ` • Duration: ${evt.duration_ms} ms`}
                      {evt.status && ` • Status: ${evt.status}`}
                    </div>

                    {relatedFinding && onSelectFinding && (
                      <button
                        type="button"
                        onClick={() => onSelectFinding(relatedFinding)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--accent-cyan)",
                          fontSize: "0.75rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 600,
                        }}
                      >
                        <span>View Finding: {relatedFinding.title}</span>
                        <ExternalLink size={11} />
                      </button>
                    )}
                  </div>

                  {/* Expandable Structured Metadata JSON */}
                  {isExpanded && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border-color)" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 4 }}>
                        Structured Event Metadata (JSON):
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 8,
                          background: "rgba(0, 0, 0, 0.4)",
                          borderRadius: 4,
                          fontSize: "0.75rem",
                          overflowX: "auto",
                          color: "var(--accent-cyan)",
                        }}
                      >
                        <code>{evt.metadata_json}</code>
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
