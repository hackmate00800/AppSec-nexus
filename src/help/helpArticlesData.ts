import { HelpArticle } from "../types/tour";

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "getting-started-overview",
    category: "Getting Started",
    title: "Welcome to AppSec Nexus: Quick Start Guide",
    summary: "Learn the core architecture, security boundaries, and how to perform your first end-to-end vulnerability audit.",
    prerequisites: ["An authorized target website or local web application", "AppSec Nexus running in desktop mode"],
    stepByStep: [
      "1. Navigate to 'Target & Scope' and add your authorized target URL.",
      "2. Check the SSRF Guard: keep 'Lab Mode' off for public staging domains, or enable it for localhost:3000 / private lab IPs.",
      "3. Go to 'Scan Console' and click 'Baseline Scan' for an initial non-destructive audit.",
      "4. Review the Live Terminal Logs as the scan streams output in real time.",
      "5. Inspect discovered vulnerabilities in the 'Findings' tab and click 'Validate' to verify true positives.",
      "6. Click 'Export HTML Report' to generate a permanent audit report for developers and stakeholders."
    ],
    expectedOutput: "A structured target scope, real-time scan logs, deduplicated findings list, and an exported HTML report.",
    troubleshooting: [
      "Error: 'Target outside scope' — verify the URL matches your authorized project domain.",
      "Error: 'Local IP blocked' — if auditing a local lab on 127.0.0.1 or 192.168.x.x, toggle 'Allow Local Lab Targets'."
    ],
    relatedFeatures: ["targets", "scanner", "findings", "importer"],
    beginnerText: "Think of AppSec Nexus like a security doctor for your website. It inspects headers, checks for common security mistakes like missing locks, and gives clear instructions on how to fix them.",
    advancedText: "AppSec Nexus enforces strict boundary controls via a Rust Tokio backend. Network probes validate TLS ciphers, HTTP security headers, CORS origin trust chains, and subresource integrity."
  },
  {
    id: "dashboard-customization",
    category: "Dashboard and Workspace",
    title: "Workspace Customization, Presets & Panel Docking",
    summary: "Customize panels, drag and drop widgets, resize sidebars, and recover minimized views from the dock.",
    prerequisites: ["Active workspace session"],
    stepByStep: [
      "1. Select a Workspace Preset: Choose 'Default', 'Compact IDE', 'Security Analyst', or 'Pentest Console' from the top bar.",
      "2. Reorder Top Tabs: Click and drag any tab in the top tab strip left or right.",
      "3. Close/Restore Tabs: Click 'X' to close an optional tab; click '+' to reopen closed tabs anytime.",
      "4. Resize Panels: Drag the border divider between the sidebar and main workspace to adjust width (64px - 380px).",
      "5. Minimize Panels: Click the minimize icon to send any panel to the docked toolbar; click 'Restore' to bring it back.",
      "6. Reset Layout: Click 'Reset Entire Workspace' in the Customize drawer if you ever want factory defaults."
    ],
    expectedOutput: "A personalized, responsive workspace layout that persists across sessions in localStorage.",
    troubleshooting: [
      "Tabs not moving? Ensure you click and drag from the tab header text.",
      "Accidentally closed a tab? Click the '+' button in the top tab strip to reopen it."
    ],
    relatedFeatures: ["analytics", "workspace-presets", "workspace-tabs"],
    beginnerText: "You can move cards and tabs around just like sticky notes on a desk so that your favorite security tools are always right where you want them.",
    advancedText: "Layout configuration is maintained via a normalized O(1) keyed panel registry in WorkspaceContext, serialized to localStorage (appsec_workspace_config_v2) with strict schema validation."
  },
  {
    id: "target-scope-ssrf",
    category: "Projects and Target Configuration",
    title: "Target Scope Management & SSRF Protection",
    summary: "Understand how AppSec Nexus prevents accidental scanning of unintended networks and protects private intranets.",
    prerequisites: ["Authorized project domain"],
    stepByStep: [
      "1. Go to 'Target & Scope'.",
      "2. Enter your Target Name (e.g. 'Staging API') and Address (e.g. 'https://staging.example.com').",
      "3. Review the Lab Mode checkbox: only check this if testing a local intentionally vulnerable lab (Juice Shop, DVWA).",
      "4. Click 'Save & Activate Scope'."
    ],
    expectedOutput: "Target becomes active in the top navbar with a green 'Target Scope Active' badge.",
    troubleshooting: [
      "Requests failing with SSRF Guard error: Private RFC-1918 IPs (10.x, 172.16.x, 192.168.x) are blocked by default for security. Check 'Allow Local Lab Targets' to permit them."
    ],
    relatedFeatures: ["targets", "crawler", "scanner"],
    beginnerText: "The Scope Guard acts like a security guard at the gate. It makes sure tests only touch the website you actually own, never your neighbor's computer or private company files.",
    advancedText: "The backend validator resolves hostnames and inspects IP octets against IPv4/IPv6 loopback, link-local, multicast, and private CIDRs before handing addresses to raw sockets."
  },
  {
    id: "recon-crawler-guide",
    category: "Reconnaissance & Crawler",
    title: "Low-Impact Web Crawler & Surface Discovery",
    summary: "Map the application attack surface, extract form inputs, discover API routes, and audit sensitive paths.",
    prerequisites: ["Active target scope configured"],
    stepByStep: [
      "1. Open the 'Crawler' tab.",
      "2. Set Max Depth (default: 2) and Page Limit (default: 25).",
      "3. Click 'Launch Crawler'.",
      "4. Watch endpoints populate in the Discovered Surface Table.",
      "5. Look for sensitive probe badges (.git, .env, /api/v1/auth)."
    ],
    expectedOutput: "A complete list of discovered endpoints with HTTP status codes, verbs, and content types.",
    troubleshooting: [
      "Crawler stopping early: Target server may have rate limiting or WAF active. Lower concurrency or increase delay."
    ],
    relatedFeatures: ["crawler", "targets", "scanner"],
    beginnerText: "The crawler is like an explorer mapping a new building. It walks through all the hallways and doors (links and forms) and writes down a directory of every room it finds.",
    advancedText: "Employs an in-memory queue with duplicate URI canonicalization, strip-fragment normalization, and scope regex filtering to prevent crawling out-of-bounds CDN assets."
  },
  {
    id: "scanner-baseline-nuclei",
    category: "Web Security Scanning",
    title: "Running Scans: Baseline, httpx, Nuclei & Nmap",
    summary: "Execute and monitor automated security tests using built-in baseline audits and integrated CLI security tools.",
    prerequisites: ["Active target scope", "Installed tool binaries for external tools"],
    stepByStep: [
      "1. Navigate to the 'Scan Console' tab.",
      "2. Click 'Baseline Scan' for instant zero-dependency header and TLS auditing.",
      "3. Click 'httpx Probe' to detect web server technology, CDN, and HTTP redirection chains.",
      "4. Click 'Nuclei Audit' for CVE template scanning (requires nuclei installed in tools/bin or system PATH).",
      "5. Click 'Nmap Scan' for port discovery and service version fingerprinting."
    ],
    expectedOutput: "Real-time streaming console logs followed by newly created findings in the Findings tab.",
    troubleshooting: [
      "Tool not available error: Verify the tool binary exists in tools/bin or is added to your Windows system PATH.",
      "Scan taking too long: Click 'Emergency Stop' in the top navbar to terminate all child subprocesses."
    ],
    relatedFeatures: ["scanner", "tools", "findings"],
    beginnerText: "Scanners test different locks on your house. Baseline checks if the front door is locked, httpx checks what kind of door it is, and Nuclei checks for known broken hinges.",
    advancedText: "Subprocesses are executed asynchronously via Tokio Command with redirected stdio pipes, bounded execution timeouts, and sanitized argument lists to prevent shell injection."
  },
  {
    id: "findings-validation-engine",
    category: "Findings and Vulnerability Validation",
    title: "Vulnerability Triage & Real Validation Engine",
    summary: "Distinguish real vulnerabilities from false alarms using non-destructive validation probes.",
    prerequisites: ["Discovered findings in the Findings tab"],
    stepByStep: [
      "1. Go to the 'Findings' tab.",
      "2. Review the Severity Badge (Critical, High, Medium, Low, Info).",
      "3. Inspect the 'Validation State' column: findings start as 'NeedsValidation' or 'Unconfirmed'.",
      "4. Click the 'Validate' button next to any finding to trigger an active validation probe.",
      "5. The engine verifies the HTTP response headers/body and upgrades status to 'Confirmed' or 'LikelyFalsePositive' with a Confidence Score.",
      "6. Click the finding row to open the AI Inspector and view contextual remediation code."
    ],
    expectedOutput: "A validated finding with a confidence percentage, verified evidence string, and CWE reference.",
    troubleshooting: [
      "Validation Failed: Target server timed out or returned an unexpected response code. Retest manually using the AI Mentor Inspector."
    ],
    relatedFeatures: ["findings", "mentor", "scanner"],
    beginnerText: "Before you call the fire department, you look to see if there is real smoke or just burnt toast. The validation engine tests whether a warning is a real hazard or a false alarm.",
    advancedText: "Uses rule-based non-destructive assertions (validator.rs) matching CWE-1021, CWE-79, CWE-200, and CWE-942 against real target response headers and body markers."
  },
  {
    id: "ai-mentor-background",
    category: "Ollama and AI Mentor",
    title: "Using Local AI Mentor with Background Task Persistence",
    summary: "Ask cybersecurity questions, generate defensive code, and let model inference run safely in the background.",
    prerequisites: ["Local Ollama running (ollama serve) on 127.0.0.1:11434", "At least one model downloaded (e.g. appsec-teacher-8b)"],
    stepByStep: [
      "1. Navigate to the 'Local AI Mentor' tab.",
      "2. Check the model dropdown: select 'appsec-teacher-8b' or any installed model.",
      "3. Click a workflow stage button (Understanding, Remediation, Secure Code, or Retesting) or type a prompt.",
      "4. Press Enter or click 'Send to AI Mentor'.",
      "5. Feel free to switch to other tabs (Findings, Scanner, Academy) — model generation will continue in the background!",
      "6. Watch the pulse indicator in the top navbar: it will display 'Answer Ready!' when inference finishes.",
      "7. Click the notification to return and inspect the full response."
    ],
    expectedOutput: "Comprehensive, defensive cybersecurity analysis with verified code blocks and flowchart diagrams.",
    troubleshooting: [
      "AI Offline: Make sure you ran 'ollama serve' in a terminal. Click 'Check Connection' to retry.",
      "Model not found: Run 'ollama pull llama3' or use the 'Download Model' input on the AI Mentor page."
    ],
    relatedFeatures: ["mentor", "ai-status-badge", "findings"],
    beginnerText: "The AI Mentor is like an experienced security teacher sitting next to you. It explains what went wrong in plain English and gives you the exact code to fix it.",
    advancedText: "Managed via Tokio tasks with Semaphore(1) bounded concurrency. Messages are persisted to SQLite (ai_chat_messages), decoupled from React lifecycle to eliminate unmount cancellation."
  },
  {
    id: "monitoring-cli-gui",
    category: "Monitoring, Logs, and CLI",
    title: "Tool Monitoring: GUI Charts vs CLI Terminal",
    summary: "Understand the difference between graphical posture indicators and raw command execution logs.",
    prerequisites: ["Target with completed scans"],
    stepByStep: [
      "1. GUI Monitoring (Analytics Tab): Inspect the Resilience Score (0-100), Severity Donut ring, and OWASP category distribution.",
      "2. CLI Monitoring (Scan Console Tab): Inspect the monospace console box showing raw tool output, timestamps, and parameters.",
      "3. Audit History Tab: Review historical scan execution durations, target URLs, and findings counts.",
      "4. Universal Orchestration Tab: Inspect multi-stage workflow pipeline execution states and step logs."
    ],
    expectedOutput: "Complete end-to-end operational visibility across high-level executive charts and low-level CLI outputs.",
    troubleshooting: [
      "Charts showing 0: Run a baseline scan or import a previous scan report to populate data."
    ],
    relatedFeatures: ["analytics", "scanner", "history", "orchestration"],
    beginnerText: "GUI monitoring gives you a quick dashboard like a car's speedometer. CLI monitoring opens the hood so you can hear and see the engine running.",
    advancedText: "GUI charts render high-performance SVG rings with CSS transitions. CLI terminal maintains a FIFO log ring buffer with ANSI escape sequence sanitization."
  },
  {
    id: "cyber-academy-simulators",
    category: "Cyber Academy",
    title: "Hands-on Learning: 7 Visual Protocol Simulators",
    summary: "Master networking and web security fundamentals with interactive animations and labs.",
    prerequisites: ["Cyber Academy tab"],
    stepByStep: [
      "1. Open the 'Cyber Academy' tab.",
      "2. Select 'Visual Simulators' in the sub-navigation.",
      "3. Explore the OSI 7-Layer Explorer: click layers to see encapsulation headers.",
      "4. Test the TCP 3-Way Handshake: step through SYN, SYN-ACK, and ACK.",
      "5. Play with the Subnet & CIDR Playground: adjust mask bits to calculate broadcast and usable IP ranges.",
      "6. Test the HTTP Request/Response Lab: inspect headers, methods, and status codes."
    ],
    expectedOutput: "Interactive step-by-step visual feedback and deep conceptual understanding of protocol security.",
    troubleshooting: [
      "Simulator reset: Click the 'Reset' button on any simulator card to start fresh."
    ],
    relatedFeatures: ["academy", "mentor"],
    beginnerText: "Instead of reading dry textbooks, you can click through moving diagrams of how internet packets travel, how DNS works, and how hackers intercept data.",
    advancedText: "Simulators implement pure state-driven protocol state machines modeling packet headers, CIDR bitwise arithmetic, and TCP sequence/acknowledgment numbers."
  },
  {
    id: "troubleshooting-common-errors",
    category: "Errors and Troubleshooting",
    title: "Common Errors & Self-Healing Diagnostic Steps",
    summary: "Resolve network timeouts, missing tool binaries, Ollama connection failures, and SQLite lock issues.",
    prerequisites: ["AppSec Nexus troubleshooting session"],
    stepByStep: [
      "1. 'Ollama Offline': Open terminal and run 'ollama serve'. Verify curl http://127.0.0.1:11434 works.",
      "2. 'Tool Not Found': Ensure third-party security tools are placed in tools/bin or installed system-wide.",
      "3. 'SSRF Guard Blocked': Enable 'Allow Local Lab Targets' if testing on localhost or RFC-1918 IPs.",
      "4. 'Workspace Layout Broken': Click 'Customize' in the toolbar and select 'Reset Entire Workspace to Factory Default'.",
      "5. 'Database Busy / Locked': AppSec Nexus uses SQLite WAL (Write-Ahead Logging); close duplicate instances if any."
    ],
    expectedOutput: "A healthy, running cybersecurity testing environment with green indicators.",
    troubleshooting: [
      "If all else fails, use the Emergency Stop button in the top navbar to kill lingering child processes."
    ],
    relatedFeatures: ["settings", "scanner", "mentor", "targets"],
    beginnerText: "When something doesn't work, don't panic. Check your internet, make sure Ollama is turned on, and check the status lights in the top right corner.",
    advancedText: "AppSec Nexus implements graceful degradation: missing tools fall back to baseline inspection, offline AI displays defensive summaries, and database errors roll back safely."
  }
];
