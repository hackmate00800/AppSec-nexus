import React, { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Activity,
  Send,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Sparkles,
  Copy,
  Check,
  Search,
  Server,
  HelpCircle,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Download,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  PlugZap,
  Layers,
  FileCode,
  Info,
  X,
} from "lucide-react";
import { Finding, Target } from "../types";
import {
  BurpConnectionConfig,
  BurpConnectionStatus,
  BurpRepeaterRequest,
  BurpRepeaterResponse,
  BurpTrafficItem,
  BurpConnectorStatus,
  BurpTrafficIngestionEvent,
} from "./types";
import {
  loadBurpConfig,
  saveBurpConfig,
  testBurpConnection,
  sendRepeaterRequest,
  parseBurpXmlFindings,
  loadTrafficItems,
  saveTrafficItems,
  getSampleTraffic,
  getBurpConnectorStatus,
  regenerateBurpConnectorToken,
  fetchBurpTraffic,
  clearBurpTrafficDb,
  deleteBurpTrafficItemDb,
  importBurpTrafficJson,
  importBurpFindingsJson,
  listenToBurpTrafficEvents,
  redactSensitiveText,
} from "./burpService";

interface BurpIntegrationViewProps {
  activeTarget?: Target | null;
  findings?: Finding[];
  onImportFindings?: (findings: Finding[]) => void;
  onNavigateToMentor?: (prompt: string) => void;
}

export const BurpIntegrationView: React.FC<BurpIntegrationViewProps> = ({
  activeTarget,
  findings = [],
  onImportFindings,
  onNavigateToMentor,
}) => {
  // Connection state
  const [config, setConfig] = useState<BurpConnectionConfig>(loadBurpConfig);
  const [status, setStatus] = useState<BurpConnectionStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Sub-tabs: traffic | repeater | connector | importer | guide
  const [activeSubTab, setActiveSubTab] = useState<"traffic" | "repeater" | "connector" | "importer" | "guide">("traffic");

  // Loopback Connector state
  const [connectorStatus, setConnectorStatus] = useState<BurpConnectorStatus | null>(null);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Traffic Inspector state
  const [traffic, setTraffic] = useState<BurpTrafficItem[]>(() => {
    return loadTrafficItems();
  });
  const [selectedTraffic, setSelectedTraffic] = useState<BurpTrafficItem | null>(() => {
    const items = loadTrafficItems();
    return items.length > 0 ? items[0] : null;
  });
  const [trafficSearch, setTrafficSearch] = useState("");
  const [trafficMethodFilter, setTrafficMethodFilter] = useState("ALL");
  const [trafficStatusFilter, setTrafficStatusFilter] = useState("ALL");
  const [trafficInspectorTab, setTrafficInspectorTab] = useState<"request" | "response">("request");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealSecrets, setRevealSecrets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modals
  const [showCreateFindingModal, setShowCreateFindingModal] = useState(false);
  const [showImportTrafficModal, setShowImportTrafficModal] = useState(false);
  const [rawTrafficJsonInput, setRawTrafficJsonInput] = useState("");
  const [trafficImportError, setTrafficImportError] = useState<string | null>(null);

  // Manual finding creation state
  const [newFindingTitle, setNewFindingTitle] = useState("");
  const [newFindingSev, setNewFindingSev] = useState("Medium");
  const [newFindingUrl, setNewFindingUrl] = useState("");
  const [newFindingCwe, setNewFindingCwe] = useState("CWE-200");
  const [newFindingRemediation, setNewFindingRemediation] = useState("");
  const [newFindingEvidence, setNewFindingEvidence] = useState("");

  // Repeater Workbench state
  const [repeaterMethod, setRepeaterMethod] = useState("GET");
  const [repeaterUrl, setRepeaterUrl] = useState(activeTarget?.primary_url || "https://example.com/api/v1/user");
  const [repeaterHeaders, setRepeaterHeaders] = useState("Accept: application/json\nUser-Agent: AppSec-Nexus/1.0");
  const [repeaterBody, setRepeaterBody] = useState("");
  const [repeaterUseProxy, setRepeaterUseProxy] = useState(true);
  const [isSendingRepeater, setIsSendingRepeater] = useState(false);
  const [repeaterResponse, setRepeaterResponse] = useState<BurpRepeaterResponse | null>(null);
  const [repeaterError, setRepeaterError] = useState<string | null>(null);

  // Importer state (XML and JSON)
  const [importerFormat, setImporterFormat] = useState<"xml" | "json">("xml");
  const [xmlInput, setXmlInput] = useState("");
  const [jsonFindingsInput, setJsonFindingsInput] = useState("");
  const [parsedIssues, setParsedIssues] = useState<Finding[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Auto-test connectivity & fetch connector status on initial mount
  useEffect(() => {
    handleTestConnection();
    loadConnectorState();
    loadPersistentTraffic();

    // Setup listener for real-time traffic events from Burp extension
    let unlistenFn: (() => void) | null = null;
    listenToBurpTrafficEvents((evt: BurpTrafficIngestionEvent) => {
      if (evt.latest_item) {
        setTraffic((prev) => [evt.latest_item!, ...prev]);
        setSelectedTraffic((cur) => cur || evt.latest_item!);
        setLiveToast(`Ingested ${evt.count} new transaction(s) via Burp Extension!`);
        setTimeout(() => setLiveToast(null), 4000);
      }
      loadConnectorState();
    }).then((unsub) => {
      unlistenFn = unsub;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  const loadConnectorState = async () => {
    try {
      const st = await getBurpConnectorStatus();
      setConnectorStatus(st);
    } catch {
      // fallback
    }
  };

  const loadPersistentTraffic = async () => {
    try {
      const items = await fetchBurpTraffic(200);
      if (items && items.length > 0) {
        setTraffic(items);
        setSelectedTraffic((cur) => cur || items[0]);
      }
    } catch {
      // fallback
    }
  };

  // Update target URL in repeater when activeTarget changes
  useEffect(() => {
    if (activeTarget?.primary_url && !repeaterUrl.startsWith("http")) {
      setRepeaterUrl(activeTarget.primary_url);
    }
  }, [activeTarget]);

  const handleTestConnection = async (overridePort?: number) => {
    const portToTest = overridePort !== undefined ? overridePort : config.port;
    setIsTesting(true);
    try {
      const res = await testBurpConnection(config.host, portToTest);
      setStatus(res);
      if (overridePort !== undefined) {
        const nextCfg = { ...config, port: overridePort };
        setConfig(nextCfg);
        saveBurpConfig(nextCfg);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    saveBurpConfig(config);
    setShowConfigDrawer(false);
    handleTestConnection();
  };

  const handleRegenerateToken = async () => {
    setIsRegeneratingToken(true);
    try {
      const newToken = await regenerateBurpConnectorToken();
      if (connectorStatus) {
        setConnectorStatus({ ...connectorStatus, token: newToken });
      }
      setLiveToast("Generated new Burp Connector Token. Update in Burp extension tab.");
      setTimeout(() => setLiveToast(null), 4000);
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  // Filtered traffic items
  const filteredTraffic = useMemo(() => {
    return traffic.filter((item) => {
      if (trafficMethodFilter !== "ALL" && item.method.toUpperCase() !== trafficMethodFilter) {
        return false;
      }
      if (trafficStatusFilter !== "ALL") {
        const code = item.status_code;
        if (trafficStatusFilter === "2xx" && (code < 200 || code >= 300)) return false;
        if (trafficStatusFilter === "3xx" && (code < 300 || code >= 400)) return false;
        if (trafficStatusFilter === "4xx" && (code < 400 || code >= 500)) return false;
        if (trafficStatusFilter === "5xx" && code < 500) return false;
      }
      if (trafficSearch.trim()) {
        const q = trafficSearch.toLowerCase();
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          item.path.toLowerCase().includes(q) ||
          (item.response_body && item.response_body.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [traffic, trafficSearch, trafficMethodFilter, trafficStatusFilter]);

  const totalPages = Math.ceil(filteredTraffic.length / pageSize) || 1;
  const paginatedTraffic = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTraffic.slice(start, start + pageSize);
  }, [filteredTraffic, currentPage, pageSize]);

  // Copy helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Delete individual traffic item
  const handleDeleteTrafficItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteBurpTrafficItemDb(id);
    } catch {
      // fallback
    }
    setTraffic((prev) => prev.filter((t) => t.id !== id));
    if (selectedTraffic?.id === id) {
      setSelectedTraffic(null);
    }
  };

  // Send request from traffic table to Repeater
  const sendTrafficToRepeater = (item: BurpTrafficItem) => {
    setRepeaterMethod(item.method);
    setRepeaterUrl(item.url);

    // Format headers
    const headerLines = Object.entries(item.request_headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    setRepeaterHeaders(headerLines);
    setRepeaterBody(item.request_body || "");
    setActiveSubTab("repeater");
  };

  // Open modal to create a finding from current traffic item
  const openCreateFindingModal = (item: BurpTrafficItem) => {
    setNewFindingTitle(`Vulnerability in ${item.path}`);
    setNewFindingSev(item.status_code >= 500 ? "High" : item.status_code === 403 ? "Medium" : "Low");
    setNewFindingUrl(item.url);
    setNewFindingCwe("CWE-200");
    setNewFindingRemediation("Validate all user inputs and configure strict authorization controls.");
    const ev = `Method: ${item.method} ${item.url}\nStatus: ${item.status_code}\n\nRequest Headers:\n${Object.entries(item.request_headers).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nResponse Body:\n${item.response_body ? item.response_body.slice(0, 500) : "<Empty>"}`;
    setNewFindingEvidence(revealSecrets ? ev : redactSensitiveText(ev));
    setShowCreateFindingModal(true);
  };

  const handleSaveManualFinding = () => {
    if (!newFindingTitle.trim()) return;
    const targetId = activeTarget?.id || "default-target";
    const finding: Finding = {
      id: `burp-manual-${Date.now()}`,
      target_id: targetId,
      title: newFindingTitle.trim(),
      severity: newFindingSev as any,
      confidence: 85,
      affected_asset: newFindingUrl.trim() || "Target Asset",
      evidence: revealSecrets ? newFindingEvidence : redactSensitiveText(newFindingEvidence),
      source_tool: "Burp Community (Manual Evidence)",
      tool_version: "1.0",
      cwe: newFindingCwe.trim() ? newFindingCwe.trim() : undefined,
      remediation: newFindingRemediation.trim() || "Remediate according to OWASP guidelines.",
      status: "NeedsValidation" as any,
      created_at: new Date().toISOString(),
      fingerprint: `burp:manual:${newFindingTitle}:${newFindingUrl}`,
      validation_status: "NEEDS_VALIDATION",
    };

    if (onImportFindings) {
      onImportFindings([finding]);
    }
    setShowCreateFindingModal(false);
    setLiveToast(`Finding '${finding.title}' saved to project (NeedsValidation).`);
    setTimeout(() => setLiveToast(null), 3000);
  };

  // Export traffic transactions as JSON file
  const handleExportTrafficJson = () => {
    const payload = JSON.stringify(traffic, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appsec_burp_traffic_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON traffic from file/modal
  const handleImportTrafficJson = async () => {
    setTrafficImportError(null);
    try {
      const count = await importBurpTrafficJson(rawTrafficJsonInput);
      await loadPersistentTraffic();
      setShowImportTrafficModal(false);
      setRawTrafficJsonInput("");
      setLiveToast(`Successfully imported ${count} transaction(s) into AppSec Nexus!`);
      setTimeout(() => setLiveToast(null), 3000);
    } catch (err: any) {
      setTrafficImportError(err?.message || "Failed to parse traffic JSON");
    }
  };

  // Send traffic or finding to AI Mentor
  const handleAnalyzeTrafficInMentor = (item: BurpTrafficItem) => {
    if (!onNavigateToMentor) return;
    const reqHeadersText = Object.entries(item.request_headers).map(([k, v]) => `${k}: ${v}`).join("\n");
    const resHeadersText = Object.entries(item.response_headers).map(([k, v]) => `${k}: ${v}`).join("\n");
    const reqBodyText = item.request_body ? item.request_body.slice(0, 800) : "<Empty>";
    const resBodyText = item.response_body ? item.response_body.slice(0, 800) : "<Empty>";

    const prompt = `[Burp Suite Traffic Inspection]
Method: ${item.method}
URL: ${item.url}
Status Code: ${item.status_code}
Latency: ${item.latency_ms}ms
Source: ${item.source}

Request Headers:
${revealSecrets ? reqHeadersText : redactSensitiveText(reqHeadersText)}

Request Body:
${revealSecrets ? reqBodyText : redactSensitiveText(reqBodyText)}

Response Headers:
${revealSecrets ? resHeadersText : redactSensitiveText(resHeadersText)}

Response Body:
${revealSecrets ? resBodyText : redactSensitiveText(resBodyText)}

Please conduct a defensive application security analysis:
1. Architecture & Flow: Describe the request/response transaction.
2. Suspicious Input Handling: Highlight unexpected parameter behaviors, error reflections, or missing validations.
3. Vulnerability Hypotheses: Identify potential vulnerability classes (e.g. IDOR, Auth bypass, SQLi, CORS misconfiguration, CSRF, sensitive leakage).
4. Direct Evidence vs Hypotheses: Clearly differentiate confirmed evidence from theoretical assumptions.
5. Authorized Verification Next Steps: Provide safe, repeatable manual curl/repeater commands to verify the behavior.
6. Remediation & Validation: Provide OWASP-aligned remediation code and post-fix validation steps.`;

    onNavigateToMentor(prompt);
  };

  // Send repeater request
  const handleExecuteRepeater = async () => {
    setIsSendingRepeater(true);
    setRepeaterError(null);
    setRepeaterResponse(null);

    try {
      const headersMap: Record<string, string> = {};
      repeaterHeaders.split("\n").forEach((line) => {
        const idx = line.indexOf(":");
        if (idx > 0) {
          const k = line.substring(0, idx).trim();
          const v = line.substring(idx + 1).trim();
          if (k) headersMap[k] = v;
        }
      });

      const req: BurpRepeaterRequest = {
        method: repeaterMethod,
        url: repeaterUrl,
        headers: headersMap,
        body: repeaterBody.trim() ? repeaterBody : undefined,
        use_proxy: repeaterUseProxy,
        proxy_host: config.host,
        proxy_port: config.port,
        timeout_seconds: 15,
      };

      const res = await sendRepeaterRequest(req);
      setRepeaterResponse(res);

      // Append to captured traffic log
      const urlObj = new URL(repeaterUrl.startsWith("http") ? repeaterUrl : `https://${repeaterUrl}`);
      const newTrafficItem: BurpTrafficItem = {
        id: `repeater-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        method: repeaterMethod,
        url: repeaterUrl,
        host: urlObj.host,
        path: urlObj.pathname + urlObj.search,
        status_code: res.status_code,
        request_headers: headersMap,
        request_body: req.body,
        response_headers: res.headers,
        response_body: res.body,
        response_size: res.content_length,
        latency_ms: res.latency_ms,
        source: "Repeater",
        is_tls: urlObj.protocol === "https:",
      };

      setTraffic((prev) => [newTrafficItem, ...prev]);
      saveTrafficItems([newTrafficItem, ...traffic]);
    } catch (err: any) {
      setRepeaterError(err?.message || "Failed to execute repeater request");
    } finally {
      setIsSendingRepeater(false);
    }
  };

  // Parse Burp XML
  const handleParseXml = async () => {
    if (!xmlInput.trim()) {
      setImportError("Please paste Burp Suite XML data into the field.");
      return;
    }

    setIsParsing(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const targetId = activeTarget?.id || "default-target";
      const issues = await parseBurpXmlFindings(targetId, xmlInput);
      setParsedIssues(issues);
      setImportMessage(`Successfully parsed ${issues.length} issue(s) from Burp XML report.`);
    } catch (err: any) {
      setImportError(err?.message || "Failed to parse Burp XML data");
    } finally {
      setIsParsing(false);
    }
  };

  // Parse Burp JSON findings
  const handleParseJsonFindings = async () => {
    if (!jsonFindingsInput.trim()) {
      setImportError("Please paste findings JSON into the field.");
      return;
    }

    setIsParsing(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const targetId = activeTarget?.id || "default-target";
      const parsed = JSON.parse(jsonFindingsInput);
      const rawList = Array.isArray(parsed) ? parsed : parsed.findings || parsed.issues || [parsed];

      const issues: Finding[] = rawList.map((item: any, idx: number) => {
        const rawEv = item.evidence || item.description || "Reported by Burp Community Extension";
        return {
          id: `burp-json-${Date.now()}-${idx}`,
          target_id: targetId,
          title: item.title || "Burp Suite Finding",
          severity: (item.severity || "Info") as any,
          confidence: item.confidence || 80,
          affected_asset: item.affected_asset || item.url || "Target Asset",
          evidence: redactSensitiveText(rawEv),
          source_tool: "Burp Community Extension",
          tool_version: "1.0",
          cwe: item.cwe || undefined,
          remediation: item.remediation || "Remediate per OWASP standards.",
          status: "NeedsValidation" as any,
          created_at: new Date().toISOString(),
          fingerprint: `burp:json:${targetId}:${item.title}:${item.affected_asset || item.url}`,
          validation_status: "NEEDS_VALIDATION",
        };
      });

      setParsedIssues(issues);
      setImportMessage(`Successfully parsed ${issues.length} issue(s) from JSON.`);
    } catch (err: any) {
      setImportError(err?.message || "Failed to parse JSON findings");
    } finally {
      setIsParsing(false);
    }
  };

  // Commit parsed findings to target repository
  const handleCommitFindings = async () => {
    if (parsedIssues.length === 0) return;
    const targetId = activeTarget?.id || "default-target";
    if (jsonFindingsInput.trim()) {
      try {
        await importBurpFindingsJson(targetId, jsonFindingsInput);
      } catch {
        // Handled in onImportFindings
      }
    }
    if (onImportFindings) {
      onImportFindings(parsedIssues);
      setImportMessage(`Committed ${parsedIssues.length} finding(s) to target findings.`);
      setParsedIssues([]);
      setXmlInput("");
      setJsonFindingsInput("");
    }
  };

  // Format header display with redaction toggle
  const formatHeaders = (headers: Record<string, string>) => {
    return Object.entries(headers).map(([k, v]) => {
      const displayVal = revealSecrets ? v : redactSensitiveText(v);
      return (
        <div key={k} style={{ lineHeight: 1.4, wordBreak: "break-all" }}>
          <span style={{ color: "var(--accent-blue, #38bdf8)", fontWeight: 600 }}>{k}:</span> {displayVal}
        </div>
      );
    });
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toast Notification */}
      {liveToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: "12px 18px",
            background: "rgba(16, 185, 129, 0.95)",
            color: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          {liveToast}
        </div>
      )}

      {/* 1. HEADER SECTION & STATUS BAR */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))",
                border: "1px solid rgba(249, 115, 22, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-orange, #f97316)",
              }}
            >
              <Radio size={22} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Burp Suite Community Integration
                </h2>

                {/* Connection Status Pill */}
                {status?.is_connected ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                    Connected ({config.port}) {status.latency_ms !== undefined && `• ${status.latency_ms}ms`}
                  </span>
                ) : status?.port_conflict_detected ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    <AlertTriangle size={12} />
                    Port Conflict ({status.port})
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />
                    Disconnected ({config.port})
                  </span>
                )}

                {/* Local Ingestion Connector Pill */}
                {connectorStatus?.is_running && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#38bdf8",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    <PlugZap size={12} />
                    Ingestion Loopback :41785
                  </span>
                )}
              </div>

              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Interception proxy listener, request repeater workbench, Montoya Java extension connector, and AI Mentor bridge.
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleTestConnection()}
              disabled={isTesting}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
            >
              <RefreshCw size={14} className={isTesting ? "animate-spin" : ""} />
              {isTesting ? "Pinging..." : "Test Connectivity"}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
            >
              <Server size={14} />
              Proxy Settings
            </button>
          </div>
        </div>

        {/* Port Conflict Alert (e.g. Jenkins on 8080) */}
        {status?.port_conflict_detected && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 8,
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <AlertTriangle size={18} color="var(--accent-amber, #f59e0b)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--accent-amber, #f59e0b)" }}>
                  Port {status.port} Conflict Detected — {status.conflicting_service}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-main)", marginTop: 2 }}>
                  {status.message}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                className="btn btn-primary"
                onClick={() => handleTestConnection(8081)}
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              >
                Switch to Port 8081
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleTestConnection(8082)}
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              >
                Switch to Port 8082
              </button>
            </div>
          </div>
        )}

        {/* Community Edition Capabilities Transparency Card */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            fontSize: "0.78rem",
          }}
        >
          <div>
            <span style={{ color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={13} /> Community Edition Supported:
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Manual Proxy HTTP/HTTPS interception, live Montoya extension traffic ingestion, request/response inspection, Repeater workbench testing, and AI Mentor dissection.
            </span>
          </div>
          <div>
            <span style={{ color: "var(--accent-amber, #f59e0b)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Info size={13} /> Professional-Only Capabilities Excluded:
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Burp Professional's automated vulnerability scanner and Pro scan orchestration APIs are not available in Community Edition. AppSec Nexus provides real verification without simulated scans.
            </span>
          </div>
        </div>

        {/* Configuration Drawer */}
        {showConfigDrawer && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 8,
              background: "var(--bg-main, #141414)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)" }}>
              Burp Suite Proxy Configuration
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Proxy Host IP
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="127.0.0.1"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                  Proxy Port
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 8080 })}
                  placeholder="8080 or 8081"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setShowConfigDrawer(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveConfig}>
                Save & Ping Proxy
              </button>
            </div>
          </div>
        )}

        {/* Sub-tabs Navigation */}
        <div style={{ display: "flex", gap: 8, marginTop: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 8, flexWrap: "wrap" }}>
          <button
            className={`btn ${activeSubTab === "traffic" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("traffic")}
            style={{ fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Activity size={14} />
            Traffic Inspector ({traffic.length})
          </button>
          <button
            className={`btn ${activeSubTab === "repeater" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("repeater")}
            style={{ fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Send size={14} />
            Repeater Workbench
          </button>
          <button
            className={`btn ${activeSubTab === "connector" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("connector")}
            style={{ fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <PlugZap size={14} />
            Extension Connector
          </button>
          <button
            className={`btn ${activeSubTab === "importer" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("importer")}
            style={{ fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <UploadCloud size={14} />
            Burp XML Importer {parsedIssues && parsedIssues.length > 0 ? `(${parsedIssues.length})` : ""}
          </button>
          <button
            className={`btn ${activeSubTab === "guide" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("guide")}
            style={{ fontSize: "0.84rem", display: "flex", alignItems: "center", gap: 6 }}
          >
            <HelpCircle size={14} />
            Setup & CA Cert Guide
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB: TRAFFIC INSPECTOR */}
      {activeSubTab === "traffic" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, minHeight: 560 }}>
          {/* Left Pane: Traffic Table */}
          <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 14 }}>
            {/* Filter & Action Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Filter URL, host, or path..."
                    value={trafficSearch}
                    onChange={(e) => {
                      setTrafficSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ paddingLeft: 30, fontSize: "0.82rem" }}
                  />
                </div>

                <select
                  className="input-field"
                  value={trafficMethodFilter}
                  onChange={(e) => {
                    setTrafficMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: 110, fontSize: "0.82rem" }}
                >
                  <option value="ALL">All Methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>

                <select
                  className="input-field"
                  value={trafficStatusFilter}
                  onChange={(e) => {
                    setTrafficStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: 95, fontSize: "0.82rem" }}
                >
                  <option value="ALL">All Status</option>
                  <option value="2xx">2xx</option>
                  <option value="3xx">3xx</option>
                  <option value="4xx">4xx</option>
                  <option value="5xx">5xx</option>
                </select>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className={`btn ${revealSecrets ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setRevealSecrets(!revealSecrets)}
                    style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    title={revealSecrets ? "Redact sensitive tokens" : "Reveal raw secrets"}
                  >
                    {revealSecrets ? <EyeOff size={13} /> : <Eye size={13} />}
                    {revealSecrets ? "Redact Secrets" : "Reveal Secrets"}
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowImportTrafficModal(true)}
                    style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    title="Import JSON traffic from Burp extension"
                  >
                    <Download size={13} />
                    Import JSON
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={handleExportTrafficJson}
                    style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    title="Export all captured traffic to JSON"
                  >
                    <FileCode size={13} />
                    Export JSON
                  </button>
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    await clearBurpTrafficDb();
                    setTraffic([]);
                    setSelectedTraffic(null);
                  }}
                  title="Clear Traffic Records"
                  style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#f87171" }}
                >
                  <Trash2 size={13} />
                  Clear
                </button>
              </div>
            </div>

            {/* Traffic Rows */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {paginatedTraffic.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                  No traffic captured matching filters.
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const samples = getSampleTraffic(activeTarget?.primary_url);
                        setTraffic(samples);
                        setSelectedTraffic(samples[0]);
                        saveTrafficItems(samples);
                      }}
                      style={{ fontSize: "0.8rem" }}
                    >
                      Load Sample Traffic
                    </button>
                  </div>
                </div>
              ) : (
                paginatedTraffic.map((item) => {
                  const isSelected = selectedTraffic?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTraffic(item)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: isSelected ? "rgba(249, 115, 22, 0.15)" : "var(--bg-main, #141414)",
                        border: isSelected ? "1px solid var(--accent-orange, #f97316)" : "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              item.method === "GET"
                                ? "rgba(59, 130, 246, 0.2)"
                                : item.method === "POST"
                                ? "rgba(16, 185, 129, 0.2)"
                                : item.method === "DELETE"
                                ? "rgba(244, 63, 94, 0.2)"
                                : "rgba(245, 158, 11, 0.2)",
                            color:
                              item.method === "GET"
                                ? "#60a5fa"
                                : item.method === "POST"
                                ? "#34d399"
                                : item.method === "DELETE"
                                ? "#f87171"
                                : "#fbbf24",
                          }}
                        >
                          {item.method}
                        </span>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: "var(--text-main)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.path}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "flex", gap: 8 }}>
                            <span>{item.host}</span>
                            <span>•</span>
                            <span>{item.timestamp}</span>
                            <span>•</span>
                            <span>{item.source}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              item.status_code >= 200 && item.status_code < 300
                                ? "rgba(16, 185, 129, 0.15)"
                                : item.status_code >= 300 && item.status_code < 400
                                ? "rgba(59, 130, 246, 0.15)"
                                : item.status_code >= 400 && item.status_code < 500
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(244, 63, 94, 0.15)",
                            color:
                              item.status_code >= 200 && item.status_code < 300
                                ? "#10b981"
                                : item.status_code >= 300 && item.status_code < 400
                                ? "#3b82f6"
                                : item.status_code >= 400 && item.status_code < 500
                                ? "#f59e0b"
                                : "#f43f5e",
                          }}
                        >
                          {item.status_code}
                        </span>

                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", minWidth: 42, textAlign: "right" }}>
                          {item.latency_ms}ms
                        </span>

                        <button
                          className="btn btn-secondary"
                          onClick={(e) => handleDeleteTrafficItem(e, item.id)}
                          title="Delete transaction"
                          style={{
                            padding: "2px 5px",
                            fontSize: "0.7rem",
                            color: "#f87171",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {filteredTraffic.length > pageSize && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px solid var(--border-color)",
                  fontSize: "0.78rem",
                  color: "var(--text-dim)",
                }}
              >
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredTraffic.length)} of {filteredTraffic.length}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{ padding: "2px 6px" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ padding: "2px 8px", fontWeight: 600, color: "var(--text-main)" }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{ padding: "2px 6px" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane: Split Request/Response Inspector */}
          <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 14 }}>
            {selectedTraffic ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Selected Item Toolbar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "1px solid var(--border-color)",
                    paddingBottom: 10,
                    marginBottom: 10,
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", wordBreak: "break-all" }}>
                      {selectedTraffic.method} {selectedTraffic.url}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 2 }}>
                      Status: {selectedTraffic.status_code} • Latency: {selectedTraffic.latency_ms}ms • Size: {selectedTraffic.response_size} bytes
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => sendTrafficToRepeater(selectedTraffic)}
                      style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                      title="Send to Repeater"
                    >
                      <Send size={12} />
                      Repeater
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => openCreateFindingModal(selectedTraffic)}
                      style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                      title="Create finding from this traffic"
                    >
                      <PlusCircle size={12} />
                      Create Finding
                    </button>

                    {onNavigateToMentor && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAnalyzeTrafficInMentor(selectedTraffic)}
                        style={{ fontSize: "0.75rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                        title="Analyze with AI Mentor"
                      >
                        <Sparkles size={12} />
                        AI Mentor
                      </button>
                    )}
                  </div>
                </div>

                {/* Secret Redaction Banner */}
                {revealSecrets ? (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      color: "#fbbf24",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={13} />
                    Unredacted Mode: Raw tokens and session cookies are displayed. Keep confidential.
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      color: "#34d399",
                      fontSize: "0.74rem",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ShieldCheck size={13} />
                    Safe Mode: Authorization tokens and session cookies auto-redacted by default.
                  </div>
                )}

                {/* Sub-Inspector Tabs (Request vs Response) */}
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <button
                    className={`btn ${trafficInspectorTab === "request" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setTrafficInspectorTab("request")}
                    style={{ fontSize: "0.78rem", padding: "3px 10px" }}
                  >
                    Request
                  </button>
                  <button
                    className={`btn ${trafficInspectorTab === "response" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setTrafficInspectorTab("response")}
                    style={{ fontSize: "0.78rem", padding: "3px 10px" }}
                  >
                    Response ({selectedTraffic.status_code})
                  </button>
                </div>

                {/* Inspector Body Content */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {trafficInspectorTab === "request" ? (
                    <>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                            Request Headers
                          </span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              const raw = Object.entries(selectedTraffic.request_headers).map(([k, v]) => `${k}: ${v}`).join("\n");
                              copyToClipboard(revealSecrets ? raw : redactSensitiveText(raw), "req_hdr");
                            }}
                            style={{ padding: "1px 6px", fontSize: "0.7rem" }}
                          >
                            {copiedField === "req_hdr" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                          </button>
                        </div>
                        <div
                          style={{
                            background: "var(--bg-main, #0d0d0d)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: 8,
                            fontFamily: "monospace",
                            fontSize: "0.76rem",
                            maxHeight: 140,
                            overflowY: "auto",
                          }}
                        >
                          {formatHeaders(selectedTraffic.request_headers)}
                        </div>
                      </div>

                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                            Request Body
                          </span>
                          {selectedTraffic.request_body && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => copyToClipboard(revealSecrets ? selectedTraffic.request_body! : redactSensitiveText(selectedTraffic.request_body!), "req_body")}
                              style={{ padding: "1px 6px", fontSize: "0.7rem" }}
                            >
                              {copiedField === "req_body" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                            </button>
                          )}
                        </div>
                        <pre
                          style={{
                            background: "var(--bg-main, #0d0d0d)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: 10,
                            fontFamily: "monospace",
                            fontSize: "0.78rem",
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            color: "var(--text-main)",
                            flex: 1,
                            minHeight: 120,
                            overflowY: "auto",
                          }}
                        >
                          {selectedTraffic.request_body
                            ? revealSecrets
                              ? selectedTraffic.request_body
                              : redactSensitiveText(selectedTraffic.request_body)
                            : "<No request body>"}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                            Response Headers
                          </span>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              const raw = Object.entries(selectedTraffic.response_headers).map(([k, v]) => `${k}: ${v}`).join("\n");
                              copyToClipboard(revealSecrets ? raw : redactSensitiveText(raw), "res_hdr");
                            }}
                            style={{ padding: "1px 6px", fontSize: "0.7rem" }}
                          >
                            {copiedField === "res_hdr" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                          </button>
                        </div>
                        <div
                          style={{
                            background: "var(--bg-main, #0d0d0d)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: 8,
                            fontFamily: "monospace",
                            fontSize: "0.76rem",
                            maxHeight: 140,
                            overflowY: "auto",
                          }}
                        >
                          {formatHeaders(selectedTraffic.response_headers)}
                        </div>
                      </div>

                      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                            Response Payload
                          </span>
                          {selectedTraffic.response_body && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => copyToClipboard(revealSecrets ? selectedTraffic.response_body! : redactSensitiveText(selectedTraffic.response_body!), "res_body")}
                              style={{ padding: "1px 6px", fontSize: "0.7rem" }}
                            >
                              {copiedField === "res_body" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                            </button>
                          )}
                        </div>
                        <pre
                          style={{
                            background: "var(--bg-main, #0d0d0d)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 6,
                            padding: 10,
                            fontFamily: "monospace",
                            fontSize: "0.78rem",
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            color: "var(--text-main)",
                            flex: 1,
                            minHeight: 140,
                            overflowY: "auto",
                          }}
                        >
                          {selectedTraffic.response_body
                            ? revealSecrets
                              ? selectedTraffic.response_body
                              : redactSensitiveText(selectedTraffic.response_body)
                            : "<Empty response body>"}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                Select a transaction from the traffic table to inspect headers, payload, and AI Mentor remediation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUB-TAB: REPEATER WORKBENCH */}
      {activeSubTab === "repeater" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, minHeight: 520 }}>
          {/* Left: Request Composer */}
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                Request Composer
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-dim)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={repeaterUseProxy}
                  onChange={(e) => setRepeaterUseProxy(e.target.checked)}
                />
                Route via Burp Proxy ({config.port})
              </label>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <select
                className="input-field"
                value={repeaterMethod}
                onChange={(e) => setRepeaterMethod(e.target.value)}
                style={{ width: 110, fontWeight: 700 }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>

              <input
                type="text"
                className="input-field"
                placeholder="https://example.com/api/v1/resource"
                value={repeaterUrl}
                onChange={(e) => setRepeaterUrl(e.target.value)}
                style={{ flex: 1, fontFamily: "monospace", fontSize: "0.84rem" }}
              />

              <button
                className="btn btn-primary"
                onClick={handleExecuteRepeater}
                disabled={isSendingRepeater}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px" }}
              >
                <Play size={14} className={isSendingRepeater ? "animate-spin" : ""} />
                {isSendingRepeater ? "Sending..." : "Send"}
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Request Headers (Key: Value)
              </label>
              <textarea
                className="textarea-field"
                rows={5}
                placeholder="Content-Type: application/json\nAuthorization: Bearer ..."
                value={repeaterHeaders}
                onChange={(e) => setRepeaterHeaders(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Request Body (Payload)
              </label>
              <textarea
                className="textarea-field"
                rows={7}
                placeholder='{\n  "query": "value"\n}'
                value={repeaterBody}
                onChange={(e) => setRepeaterBody(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: "0.8rem", flex: 1 }}
              />
            </div>
          </div>

          {/* Right: Server Response */}
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                Server Response
              </div>
              {repeaterResponse && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background:
                        repeaterResponse.status_code >= 200 && repeaterResponse.status_code < 300
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(244, 63, 94, 0.2)",
                      color:
                        repeaterResponse.status_code >= 200 && repeaterResponse.status_code < 300
                          ? "#34d399"
                          : "#f87171",
                    }}
                  >
                    HTTP {repeaterResponse.status_code} {repeaterResponse.status_text}
                  </span>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                    {repeaterResponse.latency_ms}ms • {repeaterResponse.content_length} bytes
                  </span>
                  {onNavigateToMentor && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        const prompt = `[Repeater Response Dissection]
Target: ${repeaterMethod} ${repeaterUrl}
Status: ${repeaterResponse.status_code} ${repeaterResponse.status_text}
Latency: ${repeaterResponse.latency_ms}ms

Response Headers:
${Object.entries(repeaterResponse.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}

Response Body:
${repeaterResponse.body.slice(0, 1000)}

Please evaluate this server response:
1. Did the server handle the input safely or did it expose error stack traces / unescaped reflections?
2. What defensive headers are missing?
3. Suggest next test iterations for this parameter.`;
                        onNavigateToMentor(prompt);
                      }}
                      style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                    >
                      <Sparkles size={12} />
                      AI Mentor
                    </button>
                  )}
                </div>
              )}
            </div>

            {repeaterError && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#f87171",
                  fontSize: "0.82rem",
                }}
              >
                {repeaterError}
              </div>
            )}

            {repeaterResponse ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                    Response Headers
                  </div>
                  <div
                    style={{
                      background: "var(--bg-main, #0d0d0d)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      padding: 8,
                      fontFamily: "monospace",
                      fontSize: "0.78rem",
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {Object.entries(repeaterResponse.headers).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: "var(--accent-purple, #a855f7)", fontWeight: 600 }}>{k}:</span> {v}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                      Response Body
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => copyToClipboard(repeaterResponse.body, "rep_body")}
                      style={{ padding: "1px 6px", fontSize: "0.72rem" }}
                    >
                      {copiedField === "rep_body" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <pre
                    style={{
                      background: "var(--bg-main, #0d0d0d)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 6,
                      padding: 10,
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxHeight: 260,
                      overflowY: "auto",
                      color: "var(--text-main)",
                      flex: 1,
                    }}
                  >
                    {repeaterResponse.body}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                Click "Send" to execute the request through Burp Suite Proxy and view the response here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SUB-TAB: EXTENSION CONNECTOR WORKBENCH */}
      {activeSubTab === "connector" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Connector Status Card */}
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
              AppSec Nexus Local Loopback Connector
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              The AppSec desktop core hosts a high-speed, authenticated loopback server strictly bound to <code>127.0.0.1:41785</code>.
              Your installed Burp Suite Community Extension pushes intercepted traffic and findings directly into AppSec in real time.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {/* Connector Address */}
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                  Backend Loopback Endpoint
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "0.95rem", color: "#38bdf8", fontWeight: 600 }}>
                  http://{connectorStatus?.host || "127.0.0.1"}:{connectorStatus?.port || 41785}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={12} /> Bound to loopback (Local only)
                </div>
              </div>

              {/* Authentication Token */}
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                    Auth Token (X-AppSec-Token)
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={handleRegenerateToken}
                    disabled={isRegeneratingToken}
                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                  >
                    Regenerate
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    className="input-field"
                    value={connectorStatus?.token || "appsec_token_loading"}
                    style={{ fontFamily: "monospace", fontSize: "0.8rem", flex: 1 }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => copyToClipboard(connectorStatus?.token || "", "token")}
                    style={{ padding: "6px 10px" }}
                    title="Copy Token"
                  >
                    {copiedField === "token" ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Telemetry */}
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                  Ingestion Telemetry
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {traffic.length} Captured Transaction(s)
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: 2 }}>
                  Last transaction: {connectorStatus?.last_ingested_at ? new Date(connectorStatus.last_ingested_at).toLocaleTimeString() : "Ready"}
                </div>
              </div>
            </div>
          </div>

          {/* How to Load Extension in Burp Suite */}
          <div className="card" style={{ padding: 18 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={16} color="var(--accent-orange, #f97316)" />
              How to Load AppSec Nexus Extension in Burp Suite Community Edition
            </h4>

            {/* Precompiled JAR location */}
            <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 6, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <span style={{ fontSize: "0.74rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  Pre-compiled Montoya Extension JAR:
                </span>
                <div style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-main)", marginTop: 2 }}>
                  c:\Users\ankit\OneDrive\Desktop\project\AppSec\burp-extension\AppSec-Burp-Connector.jar
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => copyToClipboard("c:\\Users\\ankit\\OneDrive\\Desktop\\project\\AppSec\\burp-extension\\AppSec-Burp-Connector.jar", "jar_path")}
                style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
              >
                {copiedField === "jar_path" ? <Check size={12} color="#10b981" /> : <Copy size={12} />} Copy Path
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 6, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
                <strong style={{ color: "var(--accent-orange, #f97316)" }}>Step 1: Open Burp Extensions Tab</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                  In your locally running Burp Suite Community Edition window, click the <strong>Extensions</strong> tab, then select the <strong>Installed</strong> sub-tab.
                </p>
              </div>

              <div style={{ padding: 12, borderRadius: 6, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
                <strong style={{ color: "var(--accent-orange, #f97316)" }}>Step 2: Add Java Extension</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Click the <strong>Add</strong> button. Set <em>Extension type</em> to <strong>Java</strong>, and click <strong>Select file</strong>. Choose <code>AppSec-Burp-Connector.jar</code> and click <strong>Next</strong>.
                </p>
              </div>

              <div style={{ padding: 12, borderRadius: 6, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
                <strong style={{ color: "var(--accent-orange, #f97316)" }}>Step 3: Connect & Ingest</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Switch to the newly added <strong>AppSec Nexus</strong> top-level tab in Burp. Paste your Auth Token, click <strong>Test Connection</strong>, and check <strong>Enable Live Ingestion</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB: BURP FINDINGS IMPORTER */}
      {activeSubTab === "importer" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Burp Suite Findings & Issues Importer
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Import verified XML or JSON findings exported from Burp Suite Community extensions or external scan reports.
                </p>
              </div>

              {/* Format Switcher */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={`btn ${importerFormat === "xml" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setImporterFormat("xml");
                    setParsedIssues([]);
                  }}
                  style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                >
                  Burp XML Format
                </button>
                <button
                  className={`btn ${importerFormat === "json" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setImporterFormat("json");
                    setParsedIssues([]);
                  }}
                  style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                >
                  Burp Extension JSON
                </button>
              </div>
            </div>

            {importerFormat === "xml" ? (
              <>
                <textarea
                  className="textarea-field"
                  rows={8}
                  placeholder='<issues burpVersion="2024.x" exportTime="...">&#10;  <issue>&#10;    <name>SQL Injection</name>&#10;    <severity>High</severity>&#10;    <confidence>Certain</confidence>&#10;    <host ip="10.0.0.1">https://example.com</host>&#10;    <path>/login</path>&#10;    <issueDetail>Parameter "user" is vulnerable to SQL injection.</issueDetail>&#10;  </issue>&#10;</issues>'
                  value={xmlInput}
                  onChange={(e) => setXmlInput(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setXmlInput(`<issues burpVersion="2024.1.1">
  <issue>
    <name><![CDATA[SQL Injection (Boolean-based Blind)]]></name>
    <severity>High</severity>
    <confidence>Certain</confidence>
    <host ip="104.21.5.12">https://api.enterprise.local</host>
    <path>/v1/catalog?category=db_test</path>
    <issueDetail><![CDATA[The parameter 'category' was found to be vulnerable to boolean-based blind SQL injection with payload: AND 1=1. Header Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.demo_token_12345]]></issueDetail>
    <remediationBackground>Use parameterized queries with prepared statements for all database operations.</remediationBackground>
    <vulnerabilityClassifications>CWE-89</vulnerabilityClassifications>
  </issue>
  <issue>
    <name><![CDATA[Cross-Site Scripting (Reflected)]]></name>
    <severity>Medium</severity>
    <confidence>Firm</confidence>
    <host ip="104.21.5.12">https://api.enterprise.local</host>
    <path>/search?q=&lt;script&gt;</path>
    <issueDetail><![CDATA[User-supplied parameter q is reflected verbatim in the response body without sanitization. Cookie: session=adm_session_token_xyz987]]></issueDetail>
    <remediationBackground>Context-aware encode and sanitize all user input before outputting in HTML.</remediationBackground>
    <vulnerabilityClassifications>CWE-79</vulnerabilityClassifications>
  </issue>
</issues>`);
                    }}
                    style={{ fontSize: "0.78rem" }}
                  >
                    Load Sample Burp XML
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleParseXml}
                    disabled={isParsing}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <UploadCloud size={14} className={isParsing ? "animate-spin" : ""} />
                    {isParsing ? "Parsing..." : "Parse Burp XML"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  className="textarea-field"
                  rows={8}
                  placeholder='[&#10;  {&#10;    "title": "Broken Access Control in /admin/users",&#10;    "severity": "High",&#10;    "confidence": 90,&#10;    "url": "https://example.com/admin/users",&#10;    "evidence": "Access was granted to non-admin bearer token",&#10;    "cwe": "CWE-284"&#10;  }&#10;]'
                  value={jsonFindingsInput}
                  onChange={(e) => setJsonFindingsInput(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setJsonFindingsInput(`[
  {
    "title": "Server-Side Request Forgery (SSRF) via Webhook URL",
    "severity": "Critical",
    "confidence": 95,
    "url": "https://api.enterprise.local/v1/webhooks/subscribe",
    "parameter": "callback_url",
    "evidence": "POST request with callback_url=http://169.254.169.254/latest/meta-data/ returned cloud credentials. Header Authorization: Bearer secret_admin_token_xyz",
    "cwe": "CWE-918",
    "remediation": "Restrict outgoing webhook calls to an allowlist of permitted IP ranges and disable loopback / link-local metadata queries."
  },
  {
    "title": "Insecure Direct Object Reference (IDOR) on Invoice ID",
    "severity": "High",
    "confidence": 85,
    "url": "https://api.enterprise.local/v1/invoices/99241",
    "evidence": "Manipulating parameter invoice_id permitted accessing other tenant invoices.",
    "cwe": "CWE-639",
    "remediation": "Enforce object-level access control checks verifying that the requesting user owns the requested invoice."
  }
]`);
                    }}
                    style={{ fontSize: "0.78rem" }}
                  >
                    Load Sample JSON Findings
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleParseJsonFindings}
                    disabled={isParsing}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <UploadCloud size={14} className={isParsing ? "animate-spin" : ""} />
                    {isParsing ? "Parsing..." : "Parse JSON Findings"}
                  </button>
                </div>
              </>
            )}

            {importError && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 6,
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#f87171",
                  fontSize: "0.82rem",
                }}
              >
                {importError}
              </div>
            )}

            {importMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 6,
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#34d399",
                  fontSize: "0.82rem",
                }}
              >
                {importMessage}
              </div>
            )}
          </div>

          {/* Parsed Findings Preview */}
          {parsedIssues && parsedIssues.length > 0 && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>
                    Parsed Findings ({parsedIssues.length})
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    Previewing findings before committing to target findings repository. All findings will be tagged as <code>NeedsValidation</code>.
                    {findings.length > 0 && ` (Target currently has ${findings.length} findings)`}
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleCommitFindings}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}
                >
                  <CheckCircle2 size={14} />
                  Save {parsedIssues.length} Findings to Project
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {parsedIssues.map((issue, idx) => {
                  const isExisting = findings.some(
                    (f) =>
                      (issue.fingerprint && f.fingerprint === issue.fingerprint) ||
                      f.title.toLowerCase() === issue.title.toLowerCase()
                  );
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "var(--bg-main, #141414)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background:
                                issue.severity === "Critical" || issue.severity === "High"
                                  ? "rgba(244, 63, 94, 0.2)"
                                  : "rgba(245, 158, 11, 0.2)",
                              color:
                                issue.severity === "Critical" || issue.severity === "High"
                                  ? "#f87171"
                                  : "#fbbf24",
                            }}
                          >
                            {issue.severity}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                            {issue.title}
                          </span>
                          {issue.cwe && (
                            <span style={{ fontSize: "0.74rem", color: "var(--accent-purple, #c084fc)" }}>
                              ({issue.cwe})
                            </span>
                          )}
                          {isExisting && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "rgba(59, 130, 246, 0.2)",
                                color: "#60a5fa",
                                border: "1px solid rgba(59, 130, 246, 0.4)",
                              }}
                            >
                              Already in Project
                            </span>
                          )}
                        </div>

                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                        }}
                      >
                        NeedsValidation
                      </span>
                    </div>

                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", wordBreak: "break-all" }}>
                      <strong>Asset:</strong> {issue.affected_asset}
                    </div>

                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.3)", padding: 6, borderRadius: 4, fontFamily: "monospace" }}>
                      {issue.evidence.slice(0, 200)}...
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. SUB-TAB: SETUP & CA CERT GUIDE */}
      {activeSubTab === "guide" && (
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
              Configuring Local Burp Suite with AppSec Nexus
            </h3>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Follow these three practical steps to configure Burp Suite Proxy and trust PortSwigger's CA certificate.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {/* Step 1 */}
            <div style={{ padding: 14, borderRadius: 8, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-orange, #f97316)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700 }}>
                  1
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                  Change Burp Proxy Port (Avoid Conflict)
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px" }}>
                Burp Suite Community is detected on your machine. Because <strong>Port 8080 is bound to Jenkins</strong>,
                configure Burp's Proxy Listener to port <strong>8081</strong>:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                <li>Open Burp Suite & navigate to <strong>Proxy</strong> → <strong>Proxy settings</strong>.</li>
                <li>Under <strong>Proxy listeners</strong>, select the listener and click <strong>Edit</strong>.</li>
                <li>Change <strong>Bind to port</strong> to <code>8081</code> and check <strong>Running</strong>.</li>
              </ul>
            </div>

            {/* Step 2 */}
            <div style={{ padding: 14, borderRadius: 8, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-orange, #f97316)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700 }}>
                  2
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                  Configure Browser Proxy
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px" }}>
                Route web browser HTTP/HTTPS traffic through the active Burp Suite Proxy:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                <li>Use <strong>FoxyProxy</strong> (Chrome/Firefox) or manual proxy settings.</li>
                <li>Set HTTP Proxy: <code>127.0.0.1</code> Port: <code>8081</code></li>
                <li>Set SSL / HTTPS Proxy: <code>127.0.0.1</code> Port: <code>8081</code></li>
                <li>Or click Burp's built-in <strong>"Open Browser"</strong> button under Proxy tab.</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div style={{ padding: 14, borderRadius: 8, background: "var(--bg-main, #141414)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-orange, #f97316)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700 }}>
                  3
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                  Install PortSwigger CA Certificate
                </div>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px" }}>
                To inspect encrypted HTTPS traffic without certificate security warnings:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                <li>With the proxy enabled in browser, navigate to <code>http://burp/cert</code>.</li>
                <li>Download <strong>cacert.der</strong>.</li>
                <li>Double click the certificate or open Windows Certificate Manager (<code>certmgr.msc</code>).</li>
                <li>Import it into <strong>Trusted Root Certification Authorities</strong>.</li>
              </ul>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sparkles size={20} color="var(--accent-blue, #3b82f6)" />
              <div style={{ fontSize: "0.84rem", color: "var(--text-main)" }}>
                <strong>Need interactive assistance?</strong> The AppSec AI Mentor can guide you through verifying your Burp
                Suite proxy listener and interpreting raw HTTP transactions.
              </div>
            </div>
            {onNavigateToMentor && (
              <button
                className="btn btn-primary"
                onClick={() => onNavigateToMentor("How do I configure my local Burp Suite Community edition proxy listener and certificate on Windows with AppSec Nexus?")}
                style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}
              >
                Ask AI Mentor
              </button>
            )}
          </div>
        </div>
      )}

      {/* CREATE MANUAL FINDING MODAL */}
      {showCreateFindingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 580,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                Create Finding from Burp Traffic
              </h3>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateFindingModal(false)}
                style={{ padding: "4px 8px" }}
              >
                <X size={14} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              The finding will be saved to your active target repository with attached request/response evidence and marked with status <code>NeedsValidation</code>.
            </p>

            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Finding Title
              </label>
              <input
                type="text"
                className="input-field"
                value={newFindingTitle}
                onChange={(e) => setNewFindingTitle(e.target.value)}
                placeholder="e.g. Information Disclosure in API Response"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Severity
                </label>
                <select
                  className="input-field"
                  value={newFindingSev}
                  onChange={(e) => setNewFindingSev(e.target.value)}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Info">Info</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  CWE Identifier
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newFindingCwe}
                  onChange={(e) => setNewFindingCwe(e.target.value)}
                  placeholder="CWE-200"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Affected Asset URL
              </label>
              <input
                type="text"
                className="input-field"
                value={newFindingUrl}
                onChange={(e) => setNewFindingUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Attached Evidence (Redacted by default)
              </label>
              <textarea
                className="textarea-field"
                rows={5}
                value={newFindingEvidence}
                onChange={(e) => setNewFindingEvidence(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: "0.78rem" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.76rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                Remediation Guidance
              </label>
              <input
                type="text"
                className="input-field"
                value={newFindingRemediation}
                onChange={(e) => setNewFindingRemediation(e.target.value)}
                placeholder="OWASP remediation recommendations..."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateFindingModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveManualFinding}>
                Save Finding (NeedsValidation)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT TRAFFIC JSON MODAL */}
      {showImportTrafficModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 580,
              padding: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
                Import Burp Traffic JSON
              </h3>
              <button
                className="btn btn-secondary"
                onClick={() => setShowImportTrafficModal(false)}
                style={{ padding: "4px 8px" }}
              >
                <X size={14} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Paste JSON traffic exported from the AppSec Burp Suite extension or saved JSON file. Duplicate requests will be automatically skipped based on SHA-256 fingerprinting.
            </p>

            <textarea
              className="textarea-field"
              rows={8}
              placeholder='[&#10;  {&#10;    "method": "POST",&#10;    "url": "https://example.com/api/login",&#10;    "status_code": 200,&#10;    "request_headers": { ... },&#10;    "response_body": "..."&#10;  }&#10;]'
              value={rawTrafficJsonInput}
              onChange={(e) => setRawTrafficJsonInput(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: "0.78rem" }}
            />

            {trafficImportError && (
              <div
                style={{
                  padding: 8,
                  borderRadius: 6,
                  background: "rgba(244, 63, 94, 0.15)",
                  color: "#f87171",
                  fontSize: "0.8rem",
                }}
              >
                {trafficImportError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowImportTrafficModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleImportTrafficJson}>
                Import Transactions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
