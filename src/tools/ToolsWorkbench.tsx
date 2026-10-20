import React, { useState, useEffect } from "react";
import {
  Wrench,
  Play,
  RotateCcw,
  Layers,
  Terminal,
  Search,
  Sparkles,
  ExternalLink,
  Sliders,
  BookOpen,
  Globe,
  Info,
} from "lucide-react";
import { Target } from "../types";
import { invoke } from "@tauri-apps/api/core";

export interface ToolMetadataDef {
  id: string;
  name: string;
  category: "Web & API" | "Network" | "SAST / SCA" | "Proxy / GUI";
  icon: string;
  definition: string;
  purpose: string;
  integrationStatus: "Fully Integrated" | "Partially Integrated" | "UI Only";
  installedVersion: string;
  executablePath: string;
  osSupport: string;
  license: string;
  officialDocUrl: string;
  configRequirements: string;
  supportedOperations: string[];
  knownLimitations: string;
  defaultParams: Record<string, string>;
  features: {
    feature: string;
    definition: string;
    input: string;
    output: string;
    requirements: string;
    limitations: string;
  }[];
  academyLessonId: string;
  academyLessonTitle: string;
}

export const SUPPORTED_TOOLS: ToolMetadataDef[] = [
  {
    id: "openapi",
    name: "OpenAPI Security Auditor",
    category: "Web & API",
    icon: "FileCode",
    definition: "Automated security auditor and contract parser for OpenAPI v3 and Swagger 2.0 specifications.",
    purpose: "Audits API specifications for authentication gaps, cleartext HTTP schemes, sensitive attributes, and mass assignment risks.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v1.2.0 (Native In-Process)",
    executablePath: "src-tauri/src/adapters/openapi.rs",
    osSupport: "Windows, Linux, macOS",
    license: "MIT / Apache-2.0",
    officialDocUrl: "https://spec.openapis.org/oas/latest.html",
    configRequirements: "Target URL or OpenAPI JSON / YAML schema content",
    supportedOperations: ["Auto-probe published specs", "Contract schema audit", "Endpoint discovery", "Finding normalization"],
    knownLimitations: "Cannot verify server runtime behavior if the server deviates from its published specification.",
    defaultParams: { probe_paths: "/openapi.json, /swagger.json, /v3/api-docs" },
    features: [
      {
        feature: "Missing Route Auth Check",
        definition: "Detects unauthenticated sensitive endpoints (e.g. /admin, /metrics, /users).",
        input: "OpenAPI paths and security schemas",
        output: "CWE-306 Finding",
        requirements: "OpenAPI JSON / YAML",
        limitations: "Spec must accurately define security schemes",
      },
      {
        feature: "Cleartext Transmission Check",
        definition: "Flags HTTP URL server schemes without TLS encryption.",
        input: "Server scheme URLs",
        output: "CWE-319 Finding",
        requirements: "None",
        limitations: "Relies on declared server URLs",
      },
      {
        feature: "Sensitive Schema Property Audit",
        definition: "Scans response and request models for exposed password, token, or SSN attributes.",
        input: "Schema properties",
        output: "CWE-200 Finding",
        requirements: "Component schemas defined",
        limitations: "Only inspects schema property names and types",
      },
      {
        feature: "Mass Assignment Detection",
        definition: "Identifies unconstrained PUT/POST request bodies permitting arbitrary role escalation.",
        input: "Request body models",
        output: "CWE-915 Finding",
        requirements: "Request bodies defined",
        limitations: "Requires manual confirmation of backend ORM behavior",
      },
    ],
    academyLessonId: "les-8-1-1",
    academyLessonTitle: "API Contract Auditing & OWASP API Top 10",
  },
  {
    id: "postman",
    name: "Postman Collection Runner",
    category: "Web & API",
    icon: "Terminal",
    definition: "Automated HTTP collection runner supporting Postman v2.1 collections with native or CLI engine.",
    purpose: "Runs regression tests, audits API endpoints within scope, and redacts sensitive authorization tokens.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v2.1 Engine (Native / Newman)",
    executablePath: "src-tauri/src/adapters/postman.rs",
    osSupport: "Windows, Linux, macOS",
    license: "Apache-2.0",
    officialDocUrl: "https://learning.postman.com/docs/collections/using-newman-cli/",
    configRequirements: "Postman v2.1 collection JSON and authorized target scope",
    supportedOperations: ["In-process execution", "Newman CLI fallback", "Sensitive header masking", "Discovered endpoint catalog"],
    knownLimitations: "Complex post-response JavaScript sandbox scripts requiring Node.js VM require Newman CLI.",
    defaultParams: { timeout_ms: "5000", max_requests: "50" },
    features: [
      {
        feature: "Sensitive Data Masking",
        definition: "Automatically redacts Authorization tokens and secrets in execution logs.",
        input: "Raw collection requests",
        output: "Sanitized logs with Bearer *******",
        requirements: "None",
        limitations: "Only redacts known authorization and cookie headers",
      },
      {
        feature: "5xx Server Error Mapping",
        definition: "Maps internal server errors into CWE-703 findings.",
        input: "HTTP response status",
        output: "CWE-703 Finding",
        requirements: "Target connectivity",
        limitations: "Cannot diagnose server internals without logs",
      },
      {
        feature: "Cleartext Protocol Detection",
        definition: "Flags requests directed to plain HTTP schemes.",
        input: "Request URLs",
        output: "CWE-319 Finding",
        requirements: "Target URL",
        limitations: "None",
      },
    ],
    academyLessonId: "les-8-1-1",
    academyLessonTitle: "API Automation & Postman Test Suites",
  },
  {
    id: "owasp_zap",
    name: "OWASP ZAP (Zed Attack Proxy)",
    category: "Web & API",
    icon: "Shield",
    definition: "Open source web application security scanner and active/passive vulnerability interception proxy.",
    purpose: "Crawls web applications and analyzes HTTP responses for common OWASP Top 10 vulnerabilities.",
    integrationStatus: "Fully Integrated",
    installedVersion: "REST API Daemon (2.14+)",
    executablePath: "http://127.0.0.1:8080 or http://127.0.0.1:8090",
    osSupport: "Windows, Linux, macOS, Docker",
    license: "Apache-2.0",
    officialDocUrl: "https://www.zaproxy.org/docs/",
    configRequirements: "ZAP daemon running with API enabled or desktop ZAP executable",
    supportedOperations: ["API Version probe", "Active crawl URLs fetch", "Alerts query & normalization", "GUI launcher"],
    knownLimitations: "Requires local Java runtime for standalone desktop binary.",
    defaultParams: { api_url: "http://127.0.0.1:8080", zap_api_key: "" },
    features: [
      {
        feature: "Passive Response Scanner",
        definition: "Analyzes headers, cookies, and DOM without transmitting extra requests.",
        input: "Intercepted HTTP traffic",
        output: "Passive alerts & Findings",
        requirements: "Traffic routed through proxy",
        limitations: "Cannot detect blind server-side vulnerabilities",
      },
      {
        feature: "Automated Spider & Crawler",
        definition: "Extracts links, forms, and assets across authorized domain.",
        input: "Target seed URL",
        output: "Discovered URL list",
        requirements: "Target accessibility",
        limitations: "May miss authenticated or client-side SPA routes",
      },
      {
        feature: "Finding Normalization Engine",
        definition: "Converts ZAP risk scores (0-3) into AppSec FindingSeverity.",
        input: "ZAP Alerts JSON",
        output: "Normalized AppSec Findings",
        requirements: "Active ZAP API connection",
        limitations: "None",
      },
    ],
    academyLessonId: "les-9-1-1",
    academyLessonTitle: "OWASP ZAP Dynamic Analysis & Proxy Workflow",
  },
  {
    id: "nmap",
    name: "Nmap Port Scanner",
    category: "Network",
    icon: "Radio",
    definition: "Network exploration tool and security / port scanner.",
    purpose: "Discovers open network ports, service banners, and host exposures using non-destructive TCP connect probes.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v7.92 (Local Portable / System)",
    executablePath: "tools/bin/nmap/nmap-7.92/nmap.exe",
    osSupport: "Windows, Linux, macOS",
    license: "Nmap Public Source License",
    officialDocUrl: "https://nmap.org/docs.html",
    configRequirements: "Npcap driver on Windows for raw packets; non-privileged TCP connect (-sT) used by default",
    supportedOperations: ["Conservative TCP Connect scan (-sT)", "Service version detection (-sV)", "Cleartext service alerts", "Npcap diagnostic check"],
    knownLimitations: "Raw SYN scans require administrator privileges and Npcap driver on Windows.",
    defaultParams: { ports: "80,443,8080,22,21,3306,5432,6379,445", timing: "-T3" },
    features: [
      {
        feature: "Conservative TCP Connect Scan",
        definition: "Completes full TCP 3-way handshake without raw sockets.",
        input: "Target IP / hostname and port list",
        output: "Port states (open, filtered, closed)",
        requirements: "None (Standard user rights)",
        limitations: "Logged in target firewall connection tables",
      },
      {
        feature: "Service Version Fingerprinting",
        definition: "Exchanges benign protocol banners to identify daemon versions.",
        input: "Open ports",
        output: "Service name & product version",
        requirements: "Target service responsive",
        limitations: "Obfuscated banners may mislead version matching",
      },
      {
        feature: "Exposed Database & Cleartext Warnings",
        definition: "Flags sensitive exposed ports (3306 MySQL, 5432 Postgres, 21 FTP, 23 Telnet).",
        input: "Detected open ports",
        output: "Security Findings",
        requirements: "Port scan complete",
        limitations: "Does not verify authentication strength",
      },
    ],
    academyLessonId: "les-9-1-1",
    academyLessonTitle: "Nmap Network Scanning & Port Intelligence",
  },
  {
    id: "baseline",
    name: "TLS & HTTP Security Headers Scanner",
    category: "Web & API",
    icon: "Layers",
    definition: "Native Rust security scanner for strict TLS handshake validation and HTTP defensive response headers.",
    purpose: "Validates certificate validity and verifies presence of modern browser defense headers.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v1.0.0 (Native Rust reqwest)",
    executablePath: "src-tauri/src/scanners.rs",
    osSupport: "Windows, Linux, macOS",
    license: "MIT",
    officialDocUrl: "https://owasp.org/www-project-secure-headers/",
    configRequirements: "Target primary URL",
    supportedOperations: ["Strict TLS cert check", "Cleartext HTTP detection", "CSP / HSTS / X-Frame-Options evaluation", "Cookie security inspection"],
    knownLimitations: "Does not evaluate internal backend logic beyond HTTP response headers.",
    defaultParams: { follow_redirects: "true", timeout_seconds: "10" },
    features: [
      {
        feature: "Strict TLS Handshake Verification",
        definition: "Detects untrusted, expired, or self-signed certificates.",
        input: "HTTPS URL",
        output: "CWE-295 Finding if invalid",
        requirements: "HTTPS target",
        limitations: "Requires valid CA trust store",
      },
      {
        feature: "Security Header Evaluation",
        definition: "Audits CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.",
        input: "HTTP response headers",
        output: "Security Findings for missing headers",
        requirements: "Target reachable",
        limitations: "None",
      },
      {
        feature: "Cookie Flags Inspection",
        definition: "Verifies HttpOnly, Secure, and SameSite attributes on Set-Cookie headers.",
        input: "Set-Cookie headers",
        output: "CWE-1004 / CWE-614 Findings",
        requirements: "Cookies set by server",
        limitations: "Only inspects cookies set on evaluated routes",
      },
    ],
    academyLessonId: "les-5-1-1",
    academyLessonTitle: "HTTP Headers, TLS Handshakes & Cookie Security",
  },
  {
    id: "nuclei",
    name: "Nuclei Vulnerability Scanner",
    category: "Web & API",
    icon: "Cpu",
    definition: "Fast and customizable vulnerability scanner powered by YAML templates.",
    purpose: "Executes targeted vulnerability detection across web endpoints, technologies, and known CVEs.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v3.11.1 (tools/bin/nuclei.exe)",
    executablePath: "tools/bin/nuclei.exe",
    osSupport: "Windows, Linux, macOS",
    license: "MIT",
    officialDocUrl: "https://docs.projectdiscovery.io/tools/nuclei",
    configRequirements: "Nuclei binary and template repository",
    supportedOperations: ["Template execution", "JSONL stream parsing", "Severity mapping", "Rate limiting"],
    knownLimitations: "High concurrency may overwhelm small test environments; rate limit flag recommended.",
    defaultParams: { tags: "cve,misconfig,exposure", rate_limit: "50" },
    features: [
      {
        feature: "YAML Template Engine",
        definition: "DSL-based declarative vulnerability probing with multi-step requests.",
        input: "Target URL + Templates",
        output: "JSONL findings stream",
        requirements: "Templates installed",
        limitations: "Dependent on template accuracy",
      },
    ],
    academyLessonId: "les-9-1-1",
    academyLessonTitle: "Automated Vulnerability Scanning with Nuclei",
  },
  {
    id: "httpx",
    name: "HTTPX Web Prober",
    category: "Web & API",
    icon: "Globe",
    definition: "Fast and multi-purpose HTTP toolkit for probing web servers and collecting metadata.",
    purpose: "Probes multiple hosts, records HTTP status codes, titles, technologies, and response headers.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v1.12.0 (tools/bin/httpx.exe)",
    executablePath: "tools/bin/httpx.exe",
    osSupport: "Windows, Linux, macOS",
    license: "MIT",
    officialDocUrl: "https://docs.projectdiscovery.io/tools/httpx",
    configRequirements: "Target domain or IP list",
    supportedOperations: ["HTTP probing", "Status code check", "Title extraction", "Technology fingerprinting"],
    knownLimitations: "Active requests may trigger Web Application Firewalls (WAF).",
    defaultParams: { threads: "10", timeout: "5" },
    features: [
      {
        feature: "Web Service Fingerprinting",
        definition: "Collects HTTP banners, technologies, and response status codes.",
        input: "Target hosts",
        output: "DiscoveredEndpoint records",
        requirements: "Active target",
        limitations: "None",
      },
    ],
    academyLessonId: "les-9-1-1",
    academyLessonTitle: "Asset Probing & Technology Detection with HTTPX",
  },
  {
    id: "katana",
    name: "Katana Web Crawler",
    category: "Web & API",
    icon: "Compass",
    definition: "Next-generation web crawler and spidering framework.",
    purpose: "Crawls web pages, parses JavaScript files, and catalogs all endpoint routes.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v1.8.0 (tools/bin/katana.exe)",
    executablePath: "tools/bin/katana.exe",
    osSupport: "Windows, Linux, macOS",
    license: "MIT",
    officialDocUrl: "https://docs.projectdiscovery.io/tools/katana",
    configRequirements: "Target base URL",
    supportedOperations: ["Depth-based crawling", "JavaScript link extraction", "Form parsing", "Endpoint cataloging"],
    knownLimitations: "Does not crawl routes hidden behind CAPTCHAs or non-standard authentication.",
    defaultParams: { depth: "2", concurrency: "5" },
    features: [
      {
        feature: "JavaScript Route Spidering",
        definition: "Parses client-side JS bundles for embedded API endpoints.",
        input: "Target URL",
        output: "Discovered URLs",
        requirements: "None",
        limitations: "May extract non-functional code references",
      },
    ],
    academyLessonId: "les-9-1-1",
    academyLessonTitle: "Web Spidering & Attack Surface Mapping",
  },
  {
    id: "osv_scanner",
    name: "OSV-Scanner",
    category: "SAST / SCA",
    icon: "ShieldAlert",
    definition: "Vulnerability scanner powered by the Open Source Vulnerabilities (OSV) database.",
    purpose: "Audits project dependencies, lockfiles, and container images for known CVEs.",
    integrationStatus: "Fully Integrated",
    installedVersion: "v2.7.0 (tools/bin/osv-scanner.exe)",
    executablePath: "tools/bin/osv-scanner.exe",
    osSupport: "Windows, Linux, macOS",
    license: "Apache-2.0",
    officialDocUrl: "https://google.github.io/osv-scanner/",
    configRequirements: "Target repository path or lockfile (package-lock.json, Cargo.lock, etc.)",
    supportedOperations: ["Lockfile scanning", "CVE lookup", "Transitive dependency analysis", "Finding normalization"],
    knownLimitations: "Only reports vulnerabilities documented in the OSV database.",
    defaultParams: { lockfile: "package-lock.json" },
    features: [
      {
        feature: "Lockfile Vulnerability Audit",
        definition: "Matches installed package hashes and versions against OSV advisories.",
        input: "Lockfile",
        output: "Dependency CVE Findings",
        requirements: "Lockfile present",
        limitations: "Does not detect custom in-house code vulnerabilities",
      },
    ],
    academyLessonId: "les-10-1-1",
    academyLessonTitle: "Software Composition Analysis (SCA) & Dependency Auditing",
  },
  {
    id: "burp_suite",
    name: "Burp Suite Professional / Community",
    category: "Proxy / GUI",
    icon: "Radio",
    definition: "Leading graphical tool for web application security testing and traffic interception.",
    purpose: "Manages interception proxying, repeater requests, and Burp XML findings imports.",
    integrationStatus: "Fully Integrated",
    installedVersion: "Connector API v1 (Local Proxy :8080)",
    executablePath: "BurpSuitePro.exe / BurpSuiteCommunity.exe",
    osSupport: "Windows, Linux, macOS",
    license: "PortSwigger Proprietary",
    officialDocUrl: "https://portswigger.net/burp/documentation",
    configRequirements: "Burp Suite running with proxy listener on 127.0.0.1:8080",
    supportedOperations: ["Proxy connection test", "Repeater request replay", "Burp XML findings parser", "Traffic inspection"],
    knownLimitations: "Advanced automated scanning requires Burp Suite Professional license.",
    defaultParams: { proxy_host: "127.0.0.1", proxy_port: "8080" },
    features: [
      {
        feature: "Burp XML Findings Import",
        definition: "Parses exported Burp XML issue reports into AppSec Findings.",
        input: "Burp XML file",
        output: "Normalized AppSec Findings",
        requirements: "Exported Burp report",
        limitations: "None",
      },
      {
        feature: "Repeater Replay Bridge",
        definition: "Forwards HTTP requests to Burp Repeater via connector.",
        input: "Raw HTTP request",
        output: "Response headers and body",
        requirements: "Burp proxy listener active",
        limitations: "Requires CA certificate installed in OS trust store",
      },
    ],
    academyLessonId: "les-9-1-1",
    academyLessonTitle: "Burp Suite Interception Proxy & Traffic Analysis",
  },
];

export interface ToolsWorkbenchProps {
  targets: Target[];
  selectedTarget: Target | null;
  onSelectTarget: (target: Target) => void;
  onNavigateTab: (tab: string) => void;
}

export const ToolsWorkbench: React.FC<ToolsWorkbenchProps> = ({
  targets,
  selectedTarget,
  onSelectTarget,
  onNavigateTab,
}) => {
  const [selectedToolId, setSelectedToolId] = useState<string>("openapi");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "execute" | "features" | "comparison">("overview");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Execution state
  const [toolParams, setToolParams] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [execOutput, setExecOutput] = useState<any | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const activeTool = SUPPORTED_TOOLS.find((t) => t.id === selectedToolId) || SUPPORTED_TOOLS[0];

  useEffect(() => {
    setToolParams(activeTool.defaultParams || {});
    setExecOutput(null);
    setExecError(null);
  }, [selectedToolId]);

  const handleRunTool = async () => {
    setIsExecuting(true);
    setExecError(null);
    try {
      const res = await invoke<any>("execute_tool_adapter", {
        toolId: activeTool.id,
        targetId: selectedTarget?.id || "temp",
        targetUrl: selectedTarget?.primary_url || "https://example.com",
        parameters: toolParams,
      });
      setExecOutput(res);
    } catch (e: any) {
      setExecError(e?.toString() || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAskMentor = (promptText: string) => {
    const event = new CustomEvent("appsec-ai-mentor-query", {
      detail: {
        prompt: promptText,
        topic: `${activeTool.name} Tool Analysis`,
      },
    });
    window.dispatchEvent(event);
    onNavigateTab("mentor");
  };

  const filteredTools = SUPPORTED_TOOLS.filter((t) => {
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    const matchSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.definition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white">Security Tools Workbench & Dedicated GUI</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Dedicated execution consoles, feature explorers, diagnostics, and comparison matrices for every supported tool.
          </p>
        </div>

        {/* Target Selector */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-lg">
          <Globe size={16} className="text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500">Active Scope</span>
            <select
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
              value={selectedTarget?.id || ""}
              onChange={(e) => {
                const found = targets.find((t) => t.id === e.target.value);
                if (found) onSelectTarget(found);
              }}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-white">
                  {t.name} ({t.primary_url})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Tool Selector Sidebar & Tool Detail GUI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Tool Selector */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs pl-8 pr-3 py-2 rounded text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {["all", "Web & API", "Network", "SAST / SCA", "Proxy / GUI"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                  filterCategory === cat
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[600px] pr-1">
            {filteredTools.map((tool) => {
              const isSelected = tool.id === selectedToolId;
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedToolId(tool.id)}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500/80 shadow-md shadow-cyan-950"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{tool.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Ready
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono block mb-1">{tool.category}</span>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{tool.definition}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dedicated Tool Detail GUI */}
        <div className="lg:col-span-3 flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
          {/* Active Tool Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {activeTool.category}
                </span>
                <h2 className="text-lg font-bold text-white">{activeTool.name}</h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">{activeTool.definition}</p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={activeTool.officialDocUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <ExternalLink size={12} />
                <span>Docs</span>
              </a>

              <button
                onClick={() => onNavigateTab("academy")}
                className="px-2.5 py-1 text-xs rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 flex items-center gap-1.5 transition-colors border border-cyan-800"
              >
                <BookOpen size={12} />
                <span>Academy Lesson</span>
              </button>
            </div>
          </div>

          {/* Tool Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "overview"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Info size={14} />
              <span>Overview & Diagnostics</span>
            </button>
            <button
              onClick={() => setActiveSubTab("execute")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "execute"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Terminal size={14} />
              <span>Execution & Live Logs</span>
            </button>
            <button
              onClick={() => setActiveSubTab("features")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "features"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders size={14} />
              <span>Feature Explorer ({activeTool.features.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("comparison")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeSubTab === "comparison"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers size={14} />
              <span>Tool Comparison Matrix</span>
            </button>
          </div>

          {/* TAB 1: Overview & Diagnostics */}
          {activeSubTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
                <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Installation & Runtime Metadata
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Executable / Adapter Path</span>
                  <span className="text-cyan-400 font-mono text-[11px]">{activeTool.executablePath}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Detected Version</span>
                  <span className="text-slate-200 font-semibold">{activeTool.installedVersion}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Supported Operating Systems</span>
                  <span className="text-slate-200">{activeTool.osSupport}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Software License</span>
                  <span className="text-slate-200">{activeTool.license}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
                <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                  Capabilities & Limitations
                </h4>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Supported Operations</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeTool.supportedOperations.map((op, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Configuration Requirements</span>
                  <span className="text-slate-300">{activeTool.configRequirements}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Known Limitations</span>
                  <span className="text-amber-300/90 text-[11px] leading-relaxed">{activeTool.knownLimitations}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Execution & Live Logs */}
          {activeSubTab === "execute" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="md:col-span-2 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Execution Parameters
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(toolParams).map(([k, v]) => (
                      <div key={k}>
                        <label className="text-[10px] text-slate-400 font-mono block mb-0.5">{k}</label>
                        <input
                          type="text"
                          value={v}
                          onChange={(e) => setToolParams({ ...toolParams, [k]: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded text-white font-mono focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleRunTool}
                    disabled={isExecuting}
                    className="w-full py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-cyan-950"
                  >
                    {isExecuting ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} />}
                    <span>{isExecuting ? "Executing Scan..." : `Execute ${activeTool.name}`}</span>
                  </button>
                </div>
              </div>

              {/* Live Output & Findings */}
              <div className="w-full h-72 bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-slate-300 overflow-y-auto">
                {execOutput ? (
                  <div>
                    <div className="flex items-center justify-between text-emerald-400 font-bold mb-3 font-sans">
                      <span>✓ Execution Completed ({execOutput.findings?.length || 0} Findings Detected)</span>
                      <button
                        onClick={() =>
                          handleAskMentor(
                            `Analyze these scan results from ${activeTool.name} and provide defensive guidance: ${execOutput.raw_stdout?.slice(0, 500)}`
                          )
                        }
                        className="text-xs text-cyan-300 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Sparkles size={12} /> Explain with AI Mentor
                      </button>
                    </div>

                    {execOutput.findings?.map((f: any, i: number) => (
                      <div key={i} className="bg-slate-900 p-2.5 rounded border border-slate-800 mb-2 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{f.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            {f.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{f.description}</p>
                      </div>
                    ))}

                    <pre className="whitespace-pre-wrap text-[11px] text-slate-400 mt-3">{execOutput.raw_stdout}</pre>
                  </div>
                ) : execError ? (
                  <div className="text-rose-400 font-sans">{execError}</div>
                ) : (
                  <div className="text-slate-600 font-sans">
                    Click "Execute {activeTool.name}" to run the tool against the active target scope.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Feature Explorer Table */}
          {activeSubTab === "features" && (
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Feature</th>
                    <th className="py-2.5 px-3">Definition</th>
                    <th className="py-2.5 px-3">Input</th>
                    <th className="py-2.5 px-3">Output</th>
                    <th className="py-2.5 px-3">Requirements</th>
                    <th className="py-2.5 px-3">Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {activeTool.features.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{f.feature}</td>
                      <td className="py-2.5 px-3 text-slate-300">{f.definition}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-400">{f.input}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-400">{f.output}</td>
                      <td className="py-2.5 px-3 text-slate-400">{f.requirements}</td>
                      <td className="py-2.5 px-3 text-amber-300/90 text-[11px]">{f.limitations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Tool Comparison Matrix */}
          {activeSubTab === "comparison" && (
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Tool Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Primary Purpose</th>
                    <th className="py-2.5 px-3">Integration</th>
                    <th className="py-2.5 px-3">License</th>
                    <th className="py-2.5 px-3">OS Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {SUPPORTED_TOOLS.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{t.name}</td>
                      <td className="py-2.5 px-3 text-cyan-400 font-mono text-[11px]">{t.category}</td>
                      <td className="py-2.5 px-3 text-slate-300">{t.purpose}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {t.integrationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{t.license}</td>
                      <td className="py-2.5 px-3 text-slate-400">{t.osSupport}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
