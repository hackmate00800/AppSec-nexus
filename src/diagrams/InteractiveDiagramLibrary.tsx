import React, { useState } from "react";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Search,
  Sparkles,
  Shield,
  BookOpen,
  Info,
  AlertTriangle,
} from "lucide-react";

export interface InteractiveDiagramDef {
  id: string;
  title: string;
  category: "Architecture & OS" | "Networking & Protocols" | "Web & Browser" | "Vulnerability & Exploitation" | "Security Lifecycle";
  mermaidCode: string;
  whatItRepresents: string;
  howToRead: string;
  nodesBreakdown: { node: string; description: string; securityImplication: string }[];
  commonFailures: string[];
  defensiveControls: string[];
  academyLessonId: string;
  academyLessonTitle: string;
}

export const DIAGRAM_COLLECTION: InteractiveDiagramDef[] = [
  {
    id: "diag-osi-tcp",
    title: "OSI 7-Layer vs. TCP/IP 4-Layer Reference Architecture",
    category: "Networking & Protocols",
    mermaidCode: `graph LR
  subgraph OSI["OSI 7-Layer Model"]
    L7["7. Application"]
    L6["6. Presentation"]
    L5["5. Session"]
    L4["4. Transport"]
    L3["3. Network"]
    L2["2. Data Link"]
    L1["1. Physical"]
  end
  subgraph TCPIP["TCP/IP 4-Layer Model"]
    T4["Application (HTTP, DNS, SSH)"]
    T3["Transport (TCP, UDP)"]
    T2["Internet (IP, ICMP)"]
    T1["Network Access (Ethernet, Wi-Fi)"]
  end
  L7 --> T4
  L6 --> T4
  L5 --> T4
  L4 --> T3
  L3 --> T2
  L2 --> T1
  L1 --> T1`,
    whatItRepresents: "Mapping of conceptual OSI 7-layer networking abstractions against practical TCP/IP 4-layer implementations.",
    howToRead: "Data originates at Layer 7 (Application) on the client, encapsulates downward with headers added at each layer, travels across the physical medium (Layer 1), and decapsulates upward on the receiver.",
    nodesBreakdown: [
      { node: "Application (Layer 7 / TCP 4)", description: "User protocols like HTTP/HTTPS, DNS, SSH, SMTP.", securityImplication: "Vulnerable to SQLi, XSS, BOLA, CSRF, and application logic bugs." },
      { node: "Transport (Layer 4 / TCP 3)", description: "TCP (stateful, reliable) and UDP (stateless, fast).", securityImplication: "Vulnerable to SYN floods, sequence number prediction, port scanning." },
      { node: "Internet / Network (Layer 3 / TCP 2)", description: "IP addressing and packet routing.", securityImplication: "Vulnerable to IP spoofing, routing poisoning, ICMP tunneling." },
      { node: "Network Access (Layer 2-1 / TCP 1)", description: "MAC addresses, Ethernet frames, physical cables/radio.", securityImplication: "Vulnerable to ARP spoofing, MAC flooding, Wi-Fi deauth attacks." },
    ],
    commonFailures: [
      "Assuming transport layer encryption (TLS) protects against application layer injection (SQLi).",
      "Treating IP addresses as unforgeable identity without cryptographic authentication.",
    ],
    defensiveControls: [
      "End-to-end TLS 1.3 encryption across all communication links.",
      "Strict network segmentation and stateful firewalls inspecting Layer 4-7 traffic.",
    ],
    academyLessonId: "les-1-1-1",
    academyLessonTitle: "OSI 7-Layer vs. TCP/IP 4-Layer Models",
  },
  {
    id: "diag-tcp-handshake",
    title: "TCP 3-Way Handshake & Connection Teardown Lifecycle",
    category: "Networking & Protocols",
    mermaidCode: `sequenceDiagram
  autonumber
  participant Client as Client Browser
  participant Server as Web Server
  Note over Client,Server: Connection Establishment (3-Way Handshake)
  Client->>Server: SYN (seq=X)
  Server->>Client: SYN-ACK (seq=Y, ack=X+1)
  Client->>Server: ACK (ack=Y+1)
  Note over Client,Server: Established State (Data Exchange)
  Client->>Server: HTTP Request / Payload
  Server->>Client: HTTP Response / Payload
  Note over Client,Server: Connection Teardown (4-Way Termination)
  Client->>Server: FIN (seq=Z)
  Server->>Client: ACK
  Server->>Client: FIN
  Client->>Server: ACK`,
    whatItRepresents: "The state machine and sequence of flags (SYN, SYN-ACK, ACK, FIN) governing TCP transport connections.",
    howToRead: "Read top-to-bottom: client initiates with SYN, server responds with SYN-ACK, client confirms with ACK, followed by bidirectional data transmission and orderly FIN-ACK termination.",
    nodesBreakdown: [
      { node: "Step 1: SYN", description: "Client selects random initial sequence number X and requests connection.", securityImplication: "Threat actors flood servers with uncompleted SYNs (SYN Flood DoS)." },
      { node: "Step 2: SYN-ACK", description: "Server allocates connection state buffer, acknowledges X+1, and transmits sequence number Y.", securityImplication: "Predictable sequence numbers allow blind connection hijacking." },
      { node: "Step 3: ACK", description: "Client confirms handshake. Socket transition to ESTABLISHED.", securityImplication: "Port scanners verify open ports when SYN-ACK is received." },
    ],
    commonFailures: [
      "Exhausting kernel connection tables via incomplete SYN handshakes without SYN Cookies enabled.",
      "Allowing asymmetric routing leading to dropped stateful firewall connections.",
    ],
    defensiveControls: [
      "Enable Linux `tcp_syncookies` in sysctl to withstand SYN flood attacks.",
      "Configure aggressive connection timeouts for half-open sockets.",
    ],
    academyLessonId: "les-1-1-2",
    academyLessonTitle: "TCP Handshake & Transport Layer Security",
  },
  {
    id: "diag-https-tls",
    title: "HTTPS / TLS 1.3 Cryptographic Handshake Lifecycle",
    category: "Networking & Protocols",
    mermaidCode: `sequenceDiagram
  autonumber
  participant Client as Client
  participant Server as Server
  Note over Client,Server: 1-RTT TLS 1.3 Negotiation
  Client->>Server: ClientHello (Cipher Suites + Key Share + SNI)
  Server->>Client: ServerHello (Key Share Selected)
  Server->>Client: EncryptedExtensions + Certificate + CertificateVerify + Finished
  Note over Client,Server: Symmetric Session Key Derived (AES-256-GCM / ChaCha20)
  Client->>Server: Finished
  Client->>Server: Encrypted Application Data (HTTP GET /)
  Server->>Client: Encrypted Application Data (HTTP 200 OK)`,
    whatItRepresents: "Modern 1-RTT TLS 1.3 handshake establishing forward-secret encrypted communications between client and server.",
    howToRead: "In TLS 1.3, client sends supported cipher suites and key share in the very first message. Server immediately responds with key share and encrypted certificate, enabling symmetric encryption in just one round-trip time (1-RTT).",
    nodesBreakdown: [
      { node: "ClientHello", description: "Contains supported TLS versions, cipher suites, Diffie-Hellman key shares, and Server Name Indication (SNI).", securityImplication: "Cleartext SNI exposes target domain name to network observers unless ECH (Encrypted Client Hello) is supported." },
      { node: "ServerHello & Certificate", description: "Server selects cipher suite, provides ephemeral public key share, and transmits X.509 certificate chain.", securityImplication: "Expired, self-signed, or mismatched domain certificates trigger browser security warnings (CWE-295)." },
      { node: "Finished & Encrypted Traffic", description: "Both parties derive shared secret using ECDHE (Elliptic Curve Diffie-Hellman Ephemeral).", securityImplication: "Provides Perfect Forward Secrecy (PFS); past traffic cannot be decrypted even if server private key is compromised later." },
    ],
    commonFailures: [
      "Allowing fallback to legacy SSLv3, TLS 1.0, or TLS 1.1 cipher suites vulnerable to POODLE or BEAST.",
      "Failing to enforce HSTS, leaving first request vulnerable to SSL stripping.",
    ],
    defensiveControls: [
      "Enforce TLS 1.2 and TLS 1.3 exclusively with forward-secret AEAD ciphers (AES-GCM / ChaCha20-Poly1305).",
      "Enable HSTS header with `max-age=31536000; includeSubDomains; preload`.",
    ],
    academyLessonId: "les-5-1-1",
    academyLessonTitle: "TLS Handshake, Cryptography & Security Headers",
  },
  {
    id: "diag-sqli-flow",
    title: "SQL Injection: Vulnerable String Concatenation vs. Parameterized Queries",
    category: "Vulnerability & Exploitation",
    mermaidCode: `graph TD
  subgraph Attacker["Vulnerable Flow (CWE-89)"]
    A1["Attacker Input: ' OR '1'='1"] --> A2["String Concatenation in SQL Query"]
    A2 --> A3["Database Parser interprets input as SQL Code"]
    A3 --> A4["Condition evaluates to TRUE: Authentication Bypass"]
  end
  subgraph Defense["Hardened Flow (Prepared Statement)"]
    D1["User Input: ' OR '1'='1"] --> D2["Pre-compiled Query Plan: SELECT * FROM users WHERE pass = ?"]
    D2 --> D3["Input bound strictly as literal DATA parameter"]
    D3 --> D4["Query safely denied: Input matched as literal string"]
  end`,
    whatItRepresents: "Root cause mechanism of SQL injection compared against compiler-level defense via prepared statements.",
    howToRead: "Left branch shows how raw concatenation allows input to break out of data context into code context. Right branch shows how prepared statements pre-compile the SQL grammar so user input can never alter query logic.",
    nodesBreakdown: [
      { node: "String Concatenation", description: "Developer writes `SELECT * FROM users WHERE user = '\" + input + \"'\"`.", securityImplication: "Quotes inside input terminate the string literal and inject arbitrary SQL syntax." },
      { node: "Database Parser", description: "Parser compiles query after input insertion, executing malicious clauses.", securityImplication: "Attacker can dump tables, alter records, or execute `xp_cmdshell`." },
      { node: "Prepared Statement", description: "Database pre-compiles query structure with placeholders (?) before input arrives.", securityImplication: "Input is treated strictly as data; quotes are literal characters, neutralizing injection." },
    ],
    commonFailures: [
      "Using blacklists or regex replacements (e.g. stripping quotes) which can be bypassed with URL encoding, comments, or alternate encodings.",
      "Concatenating column or table names into prepared statements where placeholders are unsupported.",
    ],
    defensiveControls: [
      "Use parameterized queries (Prepared Statements) for 100% of SQL operations.",
      "Apply principle of least privilege to database service accounts (disable DROP, ALTER, and administrative procedures).",
    ],
    academyLessonId: "les-7-1-1",
    academyLessonTitle: "SQL Injection & Parameterized Query Defense",
  },
  {
    id: "diag-xss-csp",
    title: "Cross-Site Scripting (XSS) Reflection vs. Content-Security-Policy (CSP)",
    category: "Vulnerability & Exploitation",
    mermaidCode: `graph TD
  subgraph Vuln["Reflected XSS Flow (CWE-79)"]
    X1["Attacker crafts malicious URL with &lt;script&gt;"] --> X2["Victim clicks link and sends request"]
    X2 --> X3["Vulnerable server echoes script into HTML response"]
    X3 --> X4["Victim browser executes script in site's origin"]
    X4 --> X5["Script exfiltrates document.cookie to Attacker server"]
  end
  subgraph Secure["Mitigated Flow (Output Encoding + CSP)"]
    S1["Server encodes &lt; as &amp;lt; and &gt; as &amp;gt;"] --> S2["CSP Header: script-src 'self'"]
    S2 --> S3["Browser renders payload as visible text, blocks execution"]
    S3 --> S4["HttpOnly cookie flag prevents JavaScript access"]
  end`,
    whatItRepresents: "How untrusted user input executes within victim browsers and how defense-in-depth (Encoding, CSP, HttpOnly) prevents exploitation.",
    howToRead: "Top shows the attack path from malicious link to session hijacking. Bottom shows how context-aware encoding prevents script interpretation and CSP provides a second layer of defense.",
    nodesBreakdown: [
      { node: "Script Echo", description: "Server reflects user input without contextual HTML entity encoding.", securityImplication: "Browser parses injected `<script>` tag as executable code." },
      { node: "Cookie Exfiltration", description: "Malicious script accesses `document.cookie` and sends it to external server.", securityImplication: "Full account takeover if session cookie lacks `HttpOnly` flag." },
      { node: "Content-Security-Policy", description: "Header `script-src 'self'` restricts executable scripts to authorized domains.", securityImplication: "Blocks inline scripts and unauthorized external script sources." },
    ],
    commonFailures: [
      "Encoding for HTML body context when input is inserted into a JavaScript variable or HTML attribute context.",
      "Allowing `unsafe-inline` or wildcard `*` in Content-Security-Policy.",
    ],
    defensiveControls: [
      "Apply contextual output encoding (HTML, attribute, JavaScript, CSS).",
      "Enforce strict Content Security Policy without `unsafe-inline`.",
      "Set `HttpOnly` and `SameSite=Lax` on all session cookies.",
    ],
    academyLessonId: "les-7-1-2",
    academyLessonTitle: "Cross-Site Scripting (XSS) & Content Security Policy",
  },
  {
    id: "diag-bola-idor",
    title: "Broken Object Level Authorization (BOLA / IDOR) API Failure",
    category: "Vulnerability & Exploitation",
    mermaidCode: `sequenceDiagram
  autonumber
  participant Attacker as Authenticated User (ID: 1042)
  participant API as API Gateway / Controller
  participant DB as Application Database
  Attacker->>API: GET /api/v1/orders/5890 (Belongs to User 2001)
  Note over API: Broken Authorization: Only checks if user is logged in
  API->>DB: SELECT * FROM orders WHERE id = 5890
  DB-->>API: Returns sensitive order & PII for User 2001
  API-->>Attacker: HTTP 200 OK with User 2001's Order Data
  Note over Attacker,API: Fixed Flow: Enforce Data Layer Ownership
  Attacker->>API: GET /api/v1/orders/5890
  Note over API: Verified: order.user_id (2001) !== request.user_id (1042)
  API-->>Attacker: HTTP 403 Forbidden (Unauthorized Access)`,
    whatItRepresents: "Root cause of OWASP API #1 vulnerability: verifying authentication without enforcing object-level authorization.",
    howToRead: "Top sequence illustrates how user 1042 reads user 2001's private orders by manipulating the ID. Bottom sequence shows correct authorization enforcement returning HTTP 403.",
    nodesBreakdown: [
      { node: "ID Parameter", description: "Direct numerical identifier `/orders/5890` exposed in route path or query.", securityImplication: "Predictable IDs make bulk enumeration and scraping trivial." },
      { node: "Missing Ownership Check", description: "Backend queries database solely by resource ID without scoping by authenticated user.", securityImplication: "Horizontal privilege escalation across entire customer base." },
      { node: "Enforced Ownership", description: "Backend verifies `order.owner_id === current_user.id` or queries `WHERE id = ? AND user_id = ?`.", securityImplication: "Unauthorized attempts are blocked with HTTP 403 Forbidden." },
    ],
    commonFailures: [
      "Relying on UUIDs instead of sequential IDs and assuming unguessable IDs equal security.",
      "Enforcing checks in the UI while leaving the backend API unprotected.",
    ],
    defensiveControls: [
      "Enforce object-level access control on every single API endpoint.",
      "Use user-scoped database queries e.g. `SELECT * FROM orders WHERE id = ? AND user_id = ?`.",
    ],
    academyLessonId: "les-8-1-1",
    academyLessonTitle: "BOLA / IDOR in Modern APIs",
  },
  {
    id: "diag-ssrf-cloud",
    title: "Server-Side Request Forgery (SSRF) Cloud Metadata Exfiltration",
    category: "Vulnerability & Exploitation",
    mermaidCode: `graph TD
  subgraph AttackerFlow["SSRF Attack Path (CWE-918)"]
    A["Attacker sends webhook=http://169.254.169.254/latest/meta-data/"] --> B["Vulnerable Web Server in AWS Cloud"]
    B --> C["Server requests internal Link-Local IP: 169.254.169.254"]
    C --> D["AWS Instance Metadata Service (IMDSv1)"]
    D --> E["Returns IAM Role Temporary Security Credentials (STS)"]
    E --> F["Attacker takes over cloud infrastructure via stolen keys"]
  end
  subgraph DefensiveFlow["Defended Architecture (IMDSv2 + Egress Filter)"]
    D1["Strict URL Hostname Allowlist"] --> D2["Egress Firewall blocks 169.254.169.254"]
    D2 --> D3["AWS IMDSv2 requires PUT request with X-aws-ec2-metadata-token"]
  end`,
    whatItRepresents: "How SSRF vulnerabilities enable attackers to bridge perimeter web servers into internal cloud infrastructure and steal IAM credentials.",
    howToRead: "Top path traces an attacker exploiting a webhook parameter to fetch AWS metadata IP 169.254.169.254. Bottom path shows IMDSv2 session token requirements and egress firewalls mitigating the risk.",
    nodesBreakdown: [
      { node: "Target Web Server", description: "Accepts URL parameter from user to fetch preview or trigger webhook.", securityImplication: "Web server acts as an open proxy inside internal network." },
      { node: "Link-Local 169.254.169.254", description: "Instance Metadata Service (IMDS) providing node identity and IAM role keys.", securityImplication: "In IMDSv1, simple GET request dumps temporary root credentials." },
      { node: "IMDSv2 Hardening", description: "Requires HTTP PUT request with custom header `X-aws-ec2-metadata-token` to obtain session token.", securityImplication: "Most standard SSRF vectors cannot transmit arbitrary custom PUT headers, neutralizing attack." },
    ],
    commonFailures: [
      "Using DNS blacklist checks that are vulnerable to DNS Rebinding attacks.",
      "Running cloud instances with IMDSv1 enabled.",
    ],
    defensiveControls: [
      "Enforce AWS IMDSv2 exclusively across all EC2 instances.",
      "Validate destination URLs against a strict domain allowlist and block non-routable/link-local IP addresses.",
    ],
    academyLessonId: "les-7-1-3",
    academyLessonTitle: "Server-Side Request Forgery (SSRF) & Cloud Metadata Defense",
  },
  {
    id: "diag-pentest-lifecycle",
    title: "Web Application Pentesting 10-Stage Assessment Lifecycle",
    category: "Security Lifecycle",
    mermaidCode: `graph LR
  S1["1. Setup"] --> S2["2. Scope"]
  S2 --> S3["3. Recon"]
  S3 --> S4["4. Mapping"]
  S4 --> S5["5. Testing"]
  S5 --> S6["6. Validation"]
  S6 --> S7["7. Findings"]
  S7 --> S8["8. Remediation"]
  S8 --> S9["9. Retesting"]
  S9 --> S10["10. Report"]`,
    whatItRepresents: "The professional, repeatable penetration testing workflow following the PTES framework from authorization to final report.",
    howToRead: "Left-to-right progression: authorization and scope must be established before active probing; candidate vulnerabilities must be manually validated before reporting; remediation must be verified with retesting before project closure.",
    nodesBreakdown: [
      { node: "1-2: Setup & Scope", description: "Written Rules of Engagement and strict boundary definition.", securityImplication: "Prevents legal liability and out-of-scope testing." },
      { node: "3-4: Recon & Mapping", description: "Passive discovery, active port scanning, and crawling routes.", securityImplication: "Discovers full attack surface before probing vulnerabilities." },
      { node: "5-6: Testing & Validation", description: "Automated scanning and manual verification of true exploitability.", securityImplication: "Eliminates false alarms and confirms real risk." },
      { node: "7-8: Findings & Remediation", description: "Sanitized evidence capture and developer code-fix guidance.", securityImplication: "Empowers engineering teams to fix root causes." },
      { node: "9-10: Retesting & Report", description: "Patch verification and executive/technical report delivery.", securityImplication: "Ensures vulnerabilities are genuinely resolved." },
    ],
    commonFailures: [
      "Relying solely on automated scanners without manual verification.",
      "Failing to conduct retesting to ensure patches were properly deployed.",
    ],
    defensiveControls: [
      "Integrate continuous automated baseline scanning into CI/CD pipelines.",
      "Perform annual independent third-party penetration testing.",
    ],
    academyLessonId: "les-6-1-1",
    academyLessonTitle: "Rules of Engagement & Penetration Testing Lifecycle",
  },
];

export interface InteractiveDiagramLibraryProps {
  onNavigateTab: (tab: string) => void;
}

export const InteractiveDiagramLibrary: React.FC<InteractiveDiagramLibraryProps> = ({ onNavigateTab }) => {
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>("diag-osi-tcp");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedCode, setCopiedCode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const activeDiagram =
    DIAGRAM_COLLECTION.find((d) => d.id === selectedDiagramId) || DIAGRAM_COLLECTION[0];

  const categories = ["All", ...Array.from(new Set(DIAGRAM_COLLECTION.map((d) => d.category)))];

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(activeDiagram.mermaidCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAskMentor = (promptText: string) => {
    const event = new CustomEvent("appsec-ai-mentor-query", {
      detail: {
        prompt: promptText,
        topic: `Diagram: ${activeDiagram.title}`,
      },
    });
    window.dispatchEvent(event);
    onNavigateTab("mentor");
  };

  const filteredDiagrams = DIAGRAM_COLLECTION.filter((d) => {
    const matchCat = selectedCategory === "All" || d.category === selectedCategory;
    const matchSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.whatItRepresents.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white">Interactive Security Diagram Library</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Visual architecture models, attack vs. defense flows, protocol lifecycles, and explanatory breakdowns.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab("academy")}
          className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-cyan-900"
        >
          <BookOpen size={14} />
          <span>Go to Cyber Academy Curriculum</span>
        </button>
      </div>

      {/* Main Split Layout: Diagram List & Diagram Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Selector */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs pl-8 pr-3 py-2 rounded text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[600px] pr-1">
            {filteredDiagrams.map((diag) => {
              const isSelected = diag.id === selectedDiagramId;
              return (
                <button
                  key={diag.id}
                  onClick={() => {
                    setSelectedDiagramId(diag.id);
                    setZoomLevel(100);
                  }}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500/80 shadow-md shadow-cyan-950"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-cyan-400 block mb-1">{diag.category}</span>
                  <h3 className="text-xs font-bold text-white mb-1">{diag.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{diag.whatItRepresents}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Visual Diagram & Explanatory Breakdown Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          {/* Active Diagram Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                {activeDiagram.category}
              </span>
              <h2 className="text-base font-bold text-white">{activeDiagram.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-xs text-slate-400 font-mono">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>

              <button
                onClick={handleCopyMermaid}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors border border-slate-700"
              >
                {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedCode ? "Copied" : "Copy Mermaid"}</span>
              </button>
            </div>
          </div>

          {/* Diagram Render Canvas / Code Box */}
          <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-auto min-h-[220px] max-h-[360px]">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top left" }}
              className="transition-transform duration-150"
            >
              <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap leading-relaxed select-all">
                {activeDiagram.mermaidCode}
              </pre>
            </div>
          </div>

          {/* Explanatory Panel: Node Breakdown & Defensive Controls */}
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-1.5">
                <Info size={14} className="text-cyan-400" /> What This Diagram Represents
              </h3>
              <p className="text-slate-300 leading-relaxed">{activeDiagram.whatItRepresents}</p>
              <p className="text-slate-400 leading-relaxed"><strong className="text-slate-300">How to read:</strong> {activeDiagram.howToRead}</p>
            </div>

            {/* Nodes Breakdown Table */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Node & Step Breakdown
              </h3>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Node / Stage</th>
                      <th className="py-2 px-3">Technical Description</th>
                      <th className="py-2 px-3">Security Implication</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {activeDiagram.nodesBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-white whitespace-nowrap">{item.node}</td>
                        <td className="py-2 px-3 text-slate-300">{item.description}</td>
                        <td className="py-2 px-3 text-rose-300/90">{item.securityImplication}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Common Failures vs Defensive Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg space-y-1.5">
                <h4 className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Common Failure Points
                </h4>
                <ul className="list-disc list-inside text-rose-200/80 space-y-1 text-[11px]">
                  {activeDiagram.commonFailures.map((cf, i) => (
                    <li key={i}>{cf}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg space-y-1.5">
                <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Shield size={13} /> Defensive Controls
                </h4>
                <ul className="list-disc list-inside text-emerald-200/80 space-y-1 text-[11px]">
                  {activeDiagram.defensiveControls.map((dc, i) => (
                    <li key={i}>{dc}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Explainer Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <BookOpen size={12} /> Academy Lesson: {activeDiagram.academyLessonTitle}
              </span>

              <button
                onClick={() =>
                  handleAskMentor(
                    `Explain the architecture and defensive implications of this diagram: ${activeDiagram.title}. Break down how data flows and how attacks can be prevented.`
                  )
                }
                className="px-3 py-1 text-xs rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1.5 transition-colors font-semibold"
              >
                <Sparkles size={12} className="text-cyan-400" />
                <span>Explain Diagram with AI Mentor</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
