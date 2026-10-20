import { useState } from "react";
import {
  FileCode,
  Database,
  Code,
  Shield,
  Terminal,
  Send,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface VirtualLabsWorkspaceProps {
  onNavigateVerificationLab?: () => void;
  onOpenAiMentor?: (query: string) => void;
}

export function VirtualLabsWorkspace({
  onNavigateVerificationLab,
  onOpenAiMentor,
}: VirtualLabsWorkspaceProps) {
  const [activeLabTab, setActiveLabTab] = useState<
    "http" | "sqli" | "xss" | "cors" | "terminal" | "verification_bridge"
  >("http");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Lab Category Selector */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          padding: "8px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        {[
          { id: "http", label: "HTTP Request/Response Explorer", icon: FileCode },
          { id: "sqli", label: "Safe SQLi Query Sandbox", icon: Database },
          { id: "xss", label: "Context-Aware XSS Simulator", icon: Code },
          { id: "cors", label: "CORS Misconfiguration Tester", icon: Shield },
          { id: "terminal", label: "Command Shell Simulator", icon: Terminal },
          { id: "verification_bridge", label: "Vulnerability Verification Lab Bridge", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeLabTab === item.id;
          return (
            <button
              key={item.id}
              className={`filter-chip ${isActive ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
              }}
              onClick={() => setActiveLabTab(item.id as any)}
            >
              <Icon size={14} color={isActive ? "var(--accent-cyan)" : undefined} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lab Contents */}
      {activeLabTab === "http" && <HttpExplorerLab onOpenAiMentor={onOpenAiMentor} />}
      {activeLabTab === "sqli" && <SqlInjectionSandbox onOpenAiMentor={onOpenAiMentor} />}
      {activeLabTab === "xss" && <XssContextSimulator onOpenAiMentor={onOpenAiMentor} />}
      {activeLabTab === "cors" && <CorsTesterSandbox onOpenAiMentor={onOpenAiMentor} />}
      {activeLabTab === "terminal" && <CommandShellSandbox onOpenAiMentor={onOpenAiMentor} />}
      {activeLabTab === "verification_bridge" && (
        <VerificationLabBridge onNavigateVerificationLab={onNavigateVerificationLab} />
      )}
    </div>
  );
}

// ============================================================================
// 1. HTTP REQUEST / RESPONSE EXPLORER LAB
// ============================================================================
function HttpExplorerLab({ onOpenAiMentor }: { onOpenAiMentor?: (query: string) => void }) {
  const [method, setMethod] = useState<string>("GET");
  const [path, setPath] = useState<string>("/api/v1/profile?id=42");
  const [headers, setHeaders] = useState<string>(
    "Host: vulnerable-bank.local\nUser-Agent: AppSec-Academy-Client/2.0\nAccept: application/json\nCookie: session_id=eyJhbGciOiJIUzI1NiJ9.user42"
  );
  const [body, setBody] = useState<string>('{\n  "status": "active"\n}');
  const [isSent, setIsSent] = useState<boolean>(false);

  const presets = [
    {
      name: "Standard GET Profile",
      method: "GET",
      path: "/api/v1/profile?id=42",
      headers: "Host: vulnerable-bank.local\nUser-Agent: AppSec-Academy-Client/2.0\nAccept: application/json\nCookie: session_id=eyJhbGciOiJIUzI1NiJ9.user42",
      body: "",
    },
    {
      name: "POST Login Auth",
      method: "POST",
      path: "/api/v1/login",
      headers: "Host: vulnerable-bank.local\nContent-Type: application/json\nUser-Agent: Mozilla/5.0",
      body: '{\n  "username": "admin",\n  "password": "SecretPassword123!"\n}',
    },
    {
      name: "SQLi Auth Bypass Probe",
      method: "POST",
      path: "/api/v1/login",
      headers: "Host: vulnerable-bank.local\nContent-Type: application/json",
      body: '{\n  "username": "admin\' OR \'1\'=\'1\' --",\n  "password": "any"\n}',
    },
    {
      name: "CORS Preflight (OPTIONS)",
      method: "OPTIONS",
      path: "/api/v1/transfer",
      headers: "Host: vulnerable-bank.local\nOrigin: https://evil-attacker.com\nAccess-Control-Request-Method: POST\nAccess-Control-Request-Headers: authorization",
      body: "",
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setMethod(preset.method);
    setPath(preset.path);
    setHeaders(preset.headers);
    setBody(preset.body);
    setIsSent(false);
  };

  const getSimulatedResponse = () => {
    if (method === "OPTIONS") {
      return {
        status: "204 No Content",
        headers: "Access-Control-Allow-Origin: https://evil-attacker.com\nAccess-Control-Allow-Credentials: true\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\nAccess-Control-Allow-Headers: authorization, content-type\nVary: Origin",
        body: "",
        highlight: "CRITICAL: Server blindly reflects attacker Origin and allows credentials!",
      };
    }
    if (body.includes("' OR '1'='1'")) {
      return {
        status: "200 OK",
        headers: "Content-Type: application/json; charset=utf-8\nSet-Cookie: session_id=adm_token_999; Path=/; HttpOnly\nCache-Control: no-store",
        body: '{\n  "authenticated": true,\n  "role": "superadmin",\n  "message": "Welcome Administrator! Authentication bypassed via boolean tautology."\n}',
        highlight: "VULNERABILITY CONFIRMED: Raw SQL injection bypassed username check.",
      };
    }
    if (method === "POST" && path.includes("login")) {
      return {
        status: "200 OK",
        headers: "Content-Type: application/json\nSet-Cookie: session_id=user_token_123; Path=/",
        body: '{\n  "authenticated": true,\n  "username": "admin",\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."\n}',
        highlight: "Normal successful authentication response.",
      };
    }
    return {
      status: "200 OK",
      headers: "Content-Type: application/json; charset=utf-8\nETag: W/\"3a-18e47458\"\nConnection: keep-alive",
      body: '{\n  "userId": 42,\n  "name": "Jane Doe",\n  "email": "jane.doe@vulnerable-bank.local",\n  "balance": "$12,450.00",\n  "role": "auditor"\n}',
      highlight: "Standard HTTP 200 response with JSON entity body.",
    };
  };

  const resp = getSimulatedResponse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Presets Bar */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Load Preset Scenarios:
        </span>
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => applyPreset(p)}
            style={{
              padding: "4px 10px",
              fontSize: "0.75rem",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Editor & Viewer Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Left: Request Builder */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent-cyan)" }}>
              HTTP Request Builder
            </span>
            <button
              onClick={() => setIsSent(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "0.8rem",
                fontWeight: 600,
                backgroundColor: "var(--accent-cyan)",
                color: "#0f172a",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <Send size={14} />
              Send Request
            </button>
          </div>

          {/* Method and Path */}
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setIsSent(false);
              }}
              style={{
                padding: "6px 10px",
                fontSize: "0.8rem",
                fontWeight: 700,
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: method === "POST" ? "var(--accent-emerald)" : method === "GET" ? "var(--accent-cyan)" : "var(--accent-amber)",
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setIsSent(false);
              }}
              placeholder="/endpoint/path"
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--text-main)",
              }}
            />
          </div>

          {/* Headers */}
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Request Headers (one per line)
            </label>
            <textarea
              rows={4}
              value={headers}
              onChange={(e) => {
                setHeaders(e.target.value);
                setIsSent(false);
              }}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--text-main)",
                resize: "vertical",
              }}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Request Body (JSON / Form Data)
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setIsSent(false);
              }}
              placeholder="Leave empty for GET requests"
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--text-main)",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        {/* Right: Simulated Server Response */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent-emerald)" }}>
              Server Response & Security Analysis
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: isSent ? "rgba(16, 185, 129, 0.1)" : "var(--bg-primary)",
                color: isSent ? "var(--accent-emerald)" : "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {isSent ? `HTTP/1.1 ${resp.status}` : "Awaiting Send..."}
            </span>
          </div>

          {isSent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Highlight callout */}
              <div
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: resp.highlight.includes("CRITICAL") || resp.highlight.includes("VULNERABILITY")
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(16, 185, 129, 0.1)",
                  border: `1px solid ${
                    resp.highlight.includes("CRITICAL") || resp.highlight.includes("VULNERABILITY")
                      ? "rgba(239, 68, 68, 0.3)"
                      : "rgba(16, 185, 129, 0.3)"
                  }`,
                  fontSize: "0.8rem",
                  color: resp.highlight.includes("CRITICAL") || resp.highlight.includes("VULNERABILITY")
                    ? "var(--accent-rose)"
                    : "var(--accent-emerald)",
                  fontWeight: 600,
                }}
              >
                {resp.highlight}
              </div>

              {/* Raw Response Headers */}
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Response Headers:
                </span>
                <pre
                  style={{
                    margin: 0,
                    padding: "8px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.75rem",
                    color: "var(--text-main)",
                    overflowX: "auto",
                  }}
                >
                  {resp.headers}
                </pre>
              </div>

              {/* Response Body */}
              {resp.body && (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Response Payload Body:
                  </span>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.75rem",
                      color: "var(--accent-cyan)",
                      overflowX: "auto",
                    }}
                  >
                    {resp.body}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                gap: "8px",
                padding: "32px",
              }}
            >
              <FileCode size={36} opacity={0.4} />
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Click "Send Request" to inspect the HTTP exchange.</p>
            </div>
          )}

          {/* Ask AI helper */}
          {onOpenAiMentor && (
            <button
              onClick={() => onOpenAiMentor(`Explain the following HTTP request and response in simple Hinglish terms:\n\n${method} ${path}\n${headers}\n\nResponse:\n${resp.status}\n${resp.headers}\n${resp.body}`)}
              style={{
                marginTop: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "0.75rem",
                backgroundColor: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: "var(--accent-cyan)",
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              <Sparkles size={12} />
              Ask AI Mentor to Explain This HTTP Exchange
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. SAFE SQLi QUERY SANDBOX
// ============================================================================
function SqlInjectionSandbox({ onOpenAiMentor }: { onOpenAiMentor?: (query: string) => void }) {
  const [userInput, setUserInput] = useState<string>("admin' OR '1'='1' --");

  const samplePayloads = [
    { label: "Normal Username", val: "john_doe" },
    { label: "Single Quote Probe", val: "admin'" },
    { label: "Classic Tautology Bypass", val: "admin' OR '1'='1' --" },
    { label: "Always-True Numeric", val: "' OR 1=1 #" },
    { label: "UNION Injection Probe", val: "' UNION SELECT 1, 'admin', 'password_hash' --" },
  ];

  const isVulnerableActive = userInput.includes("'") || userInput.includes("--") || userInput.includes("#");

  const rawConcatenatedQuery = `SELECT * FROM users WHERE username = '${userInput}' AND password = 'userPassword123';`;
  const parameterizedQuery = `SELECT * FROM users WHERE username = ? AND password = ?;\n// Parameters: [ "${userInput}", "userPassword123" ]`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Intro Explanation */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <Database size={20} color="var(--accent-cyan)" />
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-main)" }}>
            Safe SQL Injection (SQLi) Sandbox
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
          See exactly how string concatenation creates SQL injection vulnerabilities by breaking out of data syntax into code commands, and why Parameterized Prepared Statements completely prevent this.
        </p>

        {/* Quick payload buttons */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Test Payloads:</span>
          {samplePayloads.map((p) => (
            <button
              key={p.label}
              onClick={() => setUserInput(p.val)}
              style={{
                padding: "3px 8px",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                backgroundColor: userInput === p.val ? "var(--accent-cyan)" : "var(--bg-primary)",
                color: userInput === p.val ? "#0f172a" : "var(--text-main)",
                fontWeight: userInput === p.val ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Field */}
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          padding: "16px",
        }}
      >
        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
          User Input (Form Username Field):
        </label>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "0.9rem",
            fontFamily: "monospace",
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            color: "var(--text-main)",
          }}
        />
      </div>

      {/* Comparison Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Vulnerable Engine */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: `1px solid ${isVulnerableActive ? "rgba(239, 68, 68, 0.4)" : "var(--border-color)"}`,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-rose)" }}>
              ❌ Vulnerable: Raw String Concatenation
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: isVulnerableActive ? "rgba(239, 68, 68, 0.2)" : "var(--bg-primary)",
                color: isVulnerableActive ? "var(--accent-rose)" : "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {isVulnerableActive ? "EXPLOITED" : "SAFE INPUT"}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.8rem",
              color: isVulnerableActive ? "var(--accent-rose)" : "var(--text-main)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {rawConcatenatedQuery}
          </pre>

          <div style={{ fontSize: "0.8rem", lineHeight: "1.5", color: "var(--text-muted)" }}>
            {isVulnerableActive ? (
              <div>
                <strong style={{ color: "var(--accent-rose)" }}>Impact: </strong>
                The closing apostrophe broke out of the literal string. The <code>OR '1'='1'</code> condition makes the WHERE clause evaluate to TRUE for every single database row. The trailing comment <code>--</code> strips away the password check entirely.
              </div>
            ) : (
              <div>
                Input does not break out of SQL string syntax because no quotes or meta-characters were entered.
              </div>
            )}
          </div>
        </div>

        {/* Secure Engine */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-emerald)" }}>
              ✅ Secure: Parameterized Prepared Statement
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                color: "var(--accent-emerald)",
                fontWeight: 600,
              }}
            >
              IMMUNE TO SQLi
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.8rem",
              color: "var(--accent-emerald)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {parameterizedQuery}
          </pre>

          <div style={{ fontSize: "0.8rem", lineHeight: "1.5", color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--accent-emerald)" }}>Why it is immune: </strong>
            The database engine pre-compiles the SQL syntax with placeholders (<code>?</code>) before receiving the user input. The input is treated strictly as literal text data, never as executable SQL code.
          </div>
        </div>
      </div>

      {onOpenAiMentor && (
        <button
          onClick={() => onOpenAiMentor(`Explain the SQL Injection payload '${userInput}' and how parameterized queries prevent it in simple Hinglish terms.`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "0.75rem",
            backgroundColor: "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            color: "var(--accent-cyan)",
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          <Sparkles size={12} />
          Ask AI Mentor to Explain This SQLi Query
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 3. CONTEXT-AWARE XSS SIMULATOR
// ============================================================================
function XssContextSimulator({ onOpenAiMentor }: { onOpenAiMentor?: (query: string) => void }) {
  const [context, setContext] = useState<"html_body" | "attribute" | "script">("html_body");
  const [payload, setPayload] = useState<string>("<script>alert(1)</script>");

  const presets = [
    { label: "Classic Script Tag", val: "<script>alert(1)</script>" },
    { label: "Img Error Event", val: "<img src=x onerror=alert('XSS')>" },
    { label: "Attribute Breakout", val: '" onfocus="alert(1)" autofocus="' },
    { label: "Script Variable Breakout", val: '"; alert(1); //' },
  ];

  const getRenderResult = () => {
    if (context === "html_body") {
      const isExecuted = payload.toLowerCase().includes("<script>") || payload.toLowerCase().includes("<img src=x onerror");
      return {
        template: `<div>User: ${payload}</div>`,
        escaped: `<div>User: ${payload.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`,
        executed: isExecuted,
        explanation: isExecuted
          ? "The raw '<' and '>' characters tell the browser parser to open an HTML element tag, executing JavaScript."
          : "Standard text without open tags is treated as inert text nodes.",
      };
    }
    if (context === "attribute") {
      const isExecuted = payload.includes('"') && (payload.toLowerCase().includes("onerror") || payload.toLowerCase().includes("onfocus"));
      return {
        template: `<input type="text" name="name" value="${payload}">`,
        escaped: `<input type="text" name="name" value="${payload.replace(/"/g, "&quot;")}">`,
        executed: isExecuted,
        explanation: isExecuted
          ? "The double-quote '\"' breaks out of the 'value' attribute, allowing attacker to inject new event handlers like 'onfocus'."
          : "Without quotes, input remains confined inside the value attribute.",
      };
    }
    // Script context
    const isExecuted = payload.includes('";') || payload.includes("';");
    return {
      template: `<script>\n  var currentUser = "${payload}";\n</script>`,
      escaped: `<script>\n  var currentUser = "\\x22; alert(1); //";\n</script>`,
      executed: isExecuted,
      explanation: isExecuted
        ? "The quotes and semicolon terminate the JavaScript string statement and execute the injected function call."
        : "Standard string inside quotes.",
    };
  };

  const res = getRenderResult();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Context Selection Bar */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Code size={20} color="var(--accent-cyan)" />
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-main)" }}>
            Context-Aware Cross-Site Scripting (XSS) Simulator
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Notice how the correct defense depends entirely on <em>where</em> the data is reflected: HTML Body, Attribute Value, or JavaScript Block.
        </p>

        {/* Context switch */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "html_body", label: "1. HTML Body Context (<div>...</div>)" },
            { id: "attribute", label: '2. Attribute Context (<input value="...">' },
            { id: "script", label: "3. Script Block Context (<script>let x='...'</script>)" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setContext(c.id as any)}
              className={`filter-chip ${context === c.id ? "active" : ""}`}
              style={{ fontSize: "0.8rem", padding: "6px 12px" }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payload Input */}
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Injection Payload:
        </label>
        <input
          type="text"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: "0.85rem",
            fontFamily: "monospace",
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            color: "var(--text-main)",
          }}
        />

        {/* Presets */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setPayload(p.val)}
              style={{
                padding: "3px 8px",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-main)",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Output Comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Unencoded */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: `1px solid ${res.executed ? "rgba(239, 68, 68, 0.4)" : "var(--border-color)"}`,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-rose)" }}>
              ❌ Without Contextual Encoding (Vulnerable)
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: res.executed ? "rgba(239, 68, 68, 0.2)" : "var(--bg-primary)",
                color: res.executed ? "var(--accent-rose)" : "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {res.executed ? "CODE EXECUTED" : "INERT"}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.75rem",
              color: res.executed ? "var(--accent-rose)" : "var(--text-main)",
              overflowX: "auto",
            }}
          >
            {res.template}
          </pre>

          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {res.explanation}
          </p>
        </div>

        {/* Encoded */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-emerald)" }}>
              ✅ With Contextual Encoding (Neutralized)
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                color: "var(--accent-emerald)",
                fontWeight: 600,
              }}
            >
              SAFE STRING
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.75rem",
              color: "var(--accent-emerald)",
              overflowX: "auto",
            }}
          >
            {res.escaped}
          </pre>

          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Harmful characters like <code>&lt;</code>, <code>&gt;</code>, or <code>&quot;</code> are converted to harmless HTML entities or hex escapes, forcing the browser to render them purely as text.
          </p>
        </div>
      </div>

      {onOpenAiMentor && (
        <button
          onClick={() => onOpenAiMentor(`Explain why contextual output encoding is needed for XSS in ${context} context with payload '${payload}' in simple Hinglish.`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "0.75rem",
            backgroundColor: "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            color: "var(--accent-cyan)",
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          <Sparkles size={12} />
          Ask AI Mentor to Explain This XSS Context
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 4. CORS TESTER SANDBOX
// ============================================================================
function CorsTesterSandbox({ onOpenAiMentor }: { onOpenAiMentor?: (query: string) => void }) {
  const [originHeader, setOriginHeader] = useState<string>("https://evil-attacker.site");
  const [serverPolicy, setServerPolicy] = useState<"wildcard" | "reflect" | "strict">("reflect");
  const [allowCredentials, setAllowCredentials] = useState<boolean>(true);

  const getEvaluation = () => {
    if (serverPolicy === "strict") {
      return {
        status: "SECURE",
        color: "var(--accent-emerald)",
        responseHeader: "Access-Control-Allow-Origin: https://appsec-authorized.com",
        explanation: "Server strictly checks origin against an allowlist. Third-party domains cannot read API responses.",
      };
    }
    if (serverPolicy === "wildcard") {
      if (allowCredentials) {
        return {
          status: "BROWSER BLOCKED",
          color: "var(--accent-amber)",
          responseHeader: "Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true",
          explanation: "Browsers reject 'Access-Control-Allow-Origin: *' when 'Access-Control-Allow-Credentials: true' is present to protect authenticated cookies.",
        };
      }
      return {
        status: "PUBLIC READ",
        color: "var(--accent-cyan)",
        responseHeader: "Access-Control-Allow-Origin: *",
        explanation: "Any domain can read public content, but no authenticated credentials/cookies are shared.",
      };
    }
    // Reflect
    if (allowCredentials) {
      return {
        status: "CRITICAL VULNERABILITY",
        color: "var(--accent-rose)",
        responseHeader: `Access-Control-Allow-Origin: ${originHeader}\nAccess-Control-Allow-Credentials: true\nVary: Origin`,
        explanation: `Attacker on ${originHeader} can trigger background requests via fetch() with user cookies, reading private banking details or PII!`,
      };
    }
    return {
      status: "MEDIUM RISK",
      color: "var(--accent-amber)",
      responseHeader: `Access-Control-Allow-Origin: ${originHeader}`,
      explanation: `Server reflects any Origin, allowing unauthorized unauthenticated cross-origin reading.`,
    };
  };

  const evalRes = getEvaluation();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          padding: "16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <Shield size={20} color="var(--accent-cyan)" />
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-main)" }}>
            CORS Misconfiguration Tester
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Simulate how browsers enforce Cross-Origin Resource Sharing and why dynamically reflecting arbitrary <code>Origin</code> headers with credentials enabled leads to complete account compromise.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Controls */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Attacker Origin Header:
          </label>
          <input
            type="text"
            value={originHeader}
            onChange={(e) => setOriginHeader(e.target.value)}
            style={{
              padding: "8px",
              fontSize: "0.85rem",
              fontFamily: "monospace",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              color: "var(--text-main)",
            }}
          />

          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Server CORS Handling Policy:
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "strict", label: "Strict Allowlist" },
              { id: "wildcard", label: "Wildcard (*)" },
              { id: "reflect", label: "Blind Origin Reflection" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setServerPolicy(p.id as any)}
                className={`filter-chip ${serverPolicy === p.id ? "active" : ""}`}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px" }}>
            <input
              type="checkbox"
              checked={allowCredentials}
              onChange={(e) => setAllowCredentials(e.target.checked)}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--text-main)" }}>
              Include Access-Control-Allow-Credentials: true
            </span>
          </label>
        </div>

        {/* Live Evaluation */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: `1px solid ${evalRes.color}`,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: evalRes.color }}>
              Status: {evalRes.status}
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.75rem",
              color: evalRes.color,
              whiteSpace: "pre-wrap",
            }}
          >
            {evalRes.responseHeader}
          </pre>

          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
            {evalRes.explanation}
          </p>
        </div>
      </div>

      {onOpenAiMentor && (
        <button
          onClick={() => onOpenAiMentor(`Explain CORS policy '${serverPolicy}' with Origin '${originHeader}' and credentials '${allowCredentials}' in simple Hinglish.`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "0.75rem",
            backgroundColor: "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            color: "var(--accent-cyan)",
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          <Sparkles size={12} />
          Ask AI Mentor to Explain This CORS Configuration
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 5. COMMAND SHELL SIMULATOR
// ============================================================================
function CommandShellSandbox({ onOpenAiMentor }: { onOpenAiMentor?: (query: string) => void }) {
  const [command, setCommand] = useState<string>("whoami");
  const [history, setHistory] = useState<Array<{ cmd: string; output: string }>>([
    { cmd: "whoami", output: "appsec_student (UID: 1001, GID: 1001, Groups: lab_students)" },
  ]);

  const commandDatabase: Record<string, string> = {
    whoami: "appsec_student (UID: 1001, GID: 1001, Groups: lab_students)",
    id: "uid=1001(appsec_student) gid=1001(lab_students) groups=1001(lab_students),27(sudo-lab)",
    pwd: "/home/appsec_student/pentest_lab",
    "ls -la": "total 28\ndrwxr-xr-x 4 appsec_student lab_students 4096 Oct 20 20:00 .\ndrwxr-xr-x 3 root           root         4096 Oct 20 19:40 ..\n-rw-r--r-- 1 appsec_student lab_students  220 Oct 20 19:40 .bash_logout\n-rw-r--r-- 1 appsec_student lab_students 3771 Oct 20 19:40 .bashrc\n-r--r----- 1 root           lab_students   32 Oct 20 19:55 flag.txt\ndrwxr-xr-x 2 appsec_student lab_students 4096 Oct 20 20:05 scripts",
    dir: " Volume in drive C has no label.\n Directory of C:\\Users\\appsec_student\\lab\n\n20/10/2026  08:00 PM    <DIR>          .\n20/10/2026  08:00 PM    <DIR>          ..\n20/10/2026  07:55 PM                32 flag.txt\n20/10/2026  08:05 PM    <DIR>          scripts\n               1 File(s)             32 bytes\n               3 Dir(s)  142,520,381,440 bytes free",
    "cat /etc/passwd": "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nappsec_student:x:1001:1001:AppSec Student,,,:/home/appsec_student:/bin/bash",
    "ping -c 2 localhost": "PING localhost (127.0.0.1) 56(84) bytes of data.\n64 bytes from localhost (127.0.0.1): icmp_seq=1 ttl=64 time=0.038 ms\n64 bytes from localhost (127.0.0.1): icmp_seq=2 ttl=64 time=0.041 ms\n\n--- localhost ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss, time 1024ms\nrtt min/avg/max/mdev = 0.038/0.039/0.041/0.001 ms",
    "nmap --version": "Nmap version 7.94 ( https://nmap.org )\nPlatform: x86_64-pc-windows-msvc\nCompiled with: nmap-liblua-5.3.5 openssl-3.0.7 zlib-1.2.13",
    "curl -I http://localhost:8080": "HTTP/1.1 200 OK\nServer: nginx/1.24.0\nDate: Tue, 20 Oct 2026 20:55:00 GMT\nContent-Type: text/html; charset=UTF-8\nConnection: keep-alive\nX-Frame-Options: SAMEORIGIN\nX-Content-Type-Options: nosniff",
  };

  const handleRun = () => {
    const trimmed = command.trim();
    if (!trimmed) return;
    const out = commandDatabase[trimmed] || `bash: command not found: ${trimmed}. Try: whoami, id, pwd, ls -la, dir, cat /etc/passwd, ping -c 2 localhost, nmap --version, curl -I http://localhost:8080`;
    setHistory((prev) => [...prev, { cmd: trimmed, output: out }]);
    setCommand("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          padding: "16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Terminal size={20} color="var(--accent-cyan)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-main)" }}>
              Command Shell Simulator (Safe Practice Sandbox)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Learn essential security and enumeration commands without risking your local machine.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {onOpenAiMentor && (
            <button
              onClick={() => onOpenAiMentor(`Explain the output and security implications of running security reconnaissance command '${command || "whoami"}' in Linux and Windows environments.`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                fontSize: "0.75rem",
                backgroundColor: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "var(--accent-cyan)",
                cursor: "pointer",
              }}
            >
              <Sparkles size={12} />
              Ask AI Mentor
            </button>
          )}

          <button
            onClick={() => setHistory([])}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={12} />
            Clear Terminal
          </button>
        </div>
      </div>

      {/* Suggested Command Chips */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {Object.keys(commandDatabase).map((cmd) => (
          <button
            key={cmd}
            onClick={() => setCommand(cmd)}
            style={{
              padding: "4px 8px",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--accent-cyan)",
              cursor: "pointer",
            }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Terminal Window */}
      <div
        style={{
          backgroundColor: "#090d16",
          borderRadius: "8px",
          border: "1px solid #1e293b",
          padding: "16px",
          fontFamily: "Consolas, Menlo, monospace",
          fontSize: "0.85rem",
          minHeight: "260px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", gap: "8px", color: "#38bdf8" }}>
              <span>appsec_student@pentest-lab:~$</span>
              <span style={{ color: "#f8fafc", fontWeight: 600 }}>{h.cmd}</span>
            </div>
            <pre style={{ margin: 0, color: "#94a3b8", whiteSpace: "pre-wrap", paddingLeft: "12px" }}>
              {h.output}
            </pre>
          </div>
        ))}

        {/* Input line */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", marginTop: "auto" }}>
          <span>appsec_student@pentest-lab:~$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRun();
            }}
            placeholder="Type command and press Enter..."
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "#f8fafc",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. BRIDGE TO VULNERABILITY VERIFICATION LAB
// ============================================================================
function VerificationLabBridge({
  onNavigateVerificationLab,
}: {
  onNavigateVerificationLab?: () => void;
}) {
  return (
    <div
      style={{
        padding: "32px",
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "rgba(56, 189, 248, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldCheck size={32} color="var(--accent-cyan)" />
      </div>

      <div style={{ maxWidth: "600px" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem", color: "var(--text-main)" }}>
          Connect to AppSec Vulnerability Verification Lab
        </h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6" }}>
          Transition from theoretical sandboxes to <strong>evidence-based testing</strong>. Use AppSec's dedicated Vulnerability Verification Lab to test actual target findings, eliminate false positives, and inspect live HTTP request/response proofs of concept.
        </p>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        {onNavigateVerificationLab && (
          <button
            onClick={onNavigateVerificationLab}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "0.85rem",
              fontWeight: 600,
              backgroundColor: "var(--accent-cyan)",
              color: "#0f172a",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Open Vulnerability Verification Lab
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
