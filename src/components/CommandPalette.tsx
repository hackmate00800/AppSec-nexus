import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Activity,
  Target as TargetIcon,
  Cpu,
  Layers,
  Compass,
  Terminal,
  AlertTriangle,
  UploadCloud,
  Monitor,
  Sparkles,
  GraduationCap,
  History,
  Palette,
  Play,
  Download,
  AlertOctagon,
  ArrowRight,
  Shield,
  Check,
  Radio,
  Bot,
  ShieldCheck,
  ClipboardList,
  BookOpen,
  ShieldAlert,
  FileCheck,
  BookA,
  Globe,
  Network,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { BUILT_IN_THEMES } from "../theme/themes";
import { ThemeId } from "../theme/types";
import { Finding, Target } from "../types";

interface CommandItem {
  id: string;
  category: "Navigation" | "Quick Action" | "Themes" | "Findings";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
  onQuickScan: (toolId: string) => void;
  onExportReport: () => void;
  onEmergencyStop: () => void;
  findings: Finding[];
  targets: Target[];
  onSelectFinding: (f: Finding) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigateTab,
  onQuickScan,
  onExportReport,
  onEmergencyStop,
  findings,
  onSelectFinding,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { preferences, setTheme } = useTheme();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open is handled by parent, but if already mounted
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Construct all searchable commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-analytics",
        category: "Navigation",
        title: "Go to Security Analytics",
        subtitle: "View posture score, vulnerability trends, and risk metrics",
        icon: <Activity size={16} />,
        action: () => { onNavigateTab("analytics"); onClose(); },
        keywords: ["dashboard", "metrics", "stats", "posture"],
      },
      {
        id: "nav-targets",
        category: "Navigation",
        title: "Go to Target & Scope",
        subtitle: "Manage target URLs, domain scope, and SSRF guard policies",
        icon: <TargetIcon size={16} />,
        action: () => { onNavigateTab("targets"); onClose(); },
        keywords: ["url", "scope", "domain", "project"],
      },
      {
        id: "nav-scanner",
        category: "Navigation",
        title: "Go to Scan Console",
        subtitle: "Execute active scans and inspect live execution logs",
        icon: <Terminal size={16} />,
        action: () => { onNavigateTab("scanner"); onClose(); },
        keywords: ["scan", "terminal", "logs", "execute"],
      },
      {
        id: "nav-findings",
        category: "Navigation",
        title: "Go to Vulnerability Findings",
        subtitle: `Review and triage ${findings.length} security findings`,
        icon: <AlertTriangle size={16} />,
        action: () => { onNavigateTab("findings"); onClose(); },
        keywords: ["vulnerabilities", "bugs", "issues", "cwe"],
      },
      {
        id: "nav-crawler",
        category: "Navigation",
        title: "Go to Crawler & Endpoints",
        subtitle: "Inspect discovered URLs, API endpoints, and spider trees",
        icon: <Compass size={16} />,
        action: () => { onNavigateTab("crawler"); onClose(); },
        keywords: ["spider", "urls", "api", "endpoints"],
      },
      {
        id: "nav-orchestration",
        category: "Navigation",
        title: "Go to Universal Orchestration",
        subtitle: "Multi-tool pipeline automation, workflows, and tool execution",
        icon: <Cpu size={16} />,
        action: () => { onNavigateTab("orchestration"); onClose(); },
        keywords: ["automation", "pipeline", "workflow"],
      },
      {
        id: "nav-tools",
        category: "Navigation",
        title: "Go to Tools & Plugins Hub",
        subtitle: "Manage integrated security engines and universal CLI adapters",
        icon: <Layers size={16} />,
        action: () => { onNavigateTab("tools"); onClose(); },
        keywords: ["nmap", "nuclei", "httpx", "plugins", "cli"],
      },
      {
        id: "nav-hostmobile",
        category: "Navigation",
        title: "Go to Host & Mobile Audit",
        subtitle: "Windows security posture audit & Android Manifest analysis",
        icon: <Monitor size={16} />,
        action: () => { onNavigateTab("hostmobile"); onClose(); },
        keywords: ["windows", "android", "apk", "mobile", "host"],
      },
      {
        id: "nav-mentor",
        category: "Navigation",
        title: "Go to Local AI Mentor",
        subtitle: "Consult local Ollama cybersecurity professor & flowcharts",
        icon: <Sparkles size={16} />,
        action: () => { onNavigateTab("mentor"); onClose(); },
        keywords: ["ai", "ollama", "chat", "teacher", "remediation"],
      },
      {
        id: "nav-model-lab",
        category: "Navigation",
        title: "Go to Heretic Model Lab",
        subtitle: "Abliterate refusal vectors, optimize weights with Optuna TPE, export to Ollama",
        icon: <Bot size={16} />,
        action: () => { onNavigateTab("modelLab"); onClose(); },
        keywords: ["heretic", "model", "lab", "abliteration", "ollama", "weights", "qwen", "optuna", "benchmark"],
      },
      {
        id: "nav-academy",
        category: "Navigation",
        title: "Go to Cyber Academy",
        subtitle: "Explore interactive curriculum, guided labs, and methodologies",
        icon: <GraduationCap size={16} />,
        action: () => { onNavigateTab("academy"); onClose(); },
        keywords: ["learn", "academy", "labs", "courses", "certifications"],
      },
      {
        id: "nav-importer",
        category: "Navigation",
        title: "Go to Import Reports",
        subtitle: "Ingest findings from OWASP ZAP, Burp Suite, or JSON",
        icon: <UploadCloud size={16} />,
        action: () => { onNavigateTab("importer"); onClose(); },
        keywords: ["zap", "burp", "xml", "json", "import"],
      },
      {
        id: "nav-burp",
        category: "Navigation",
        title: "Go to Burp Suite Integration",
        subtitle: "Traffic inspector, proxy repeater, XML findings importer & AI bridge",
        icon: <Radio size={16} />,
        action: () => { onNavigateTab("burp"); onClose(); },
        keywords: ["burp", "suite", "proxy", "repeater", "traffic", "http", "intercept"],
      },
      {
        id: "nav-history",
        category: "Navigation",
        title: "Go to Audit History",
        subtitle: "Review previous audit runs and export reports",
        icon: <History size={16} />,
        action: () => { onNavigateTab("history"); onClose(); },
        keywords: ["history", "past", "reports"],
      },
      {
        id: "nav-appearance",
        category: "Navigation",
        title: "Go to Appearance & Personalization",
        subtitle: "Customize themes, accent colors, density, and font scaling",
        icon: <Palette size={16} />,
        action: () => { onNavigateTab("appearance"); onClose(); },
        keywords: ["theme", "color", "accent", "settings", "font", "density"],
      },
      {
        id: "nav-verification-lab",
        category: "Navigation",
        title: "Go to Vulnerability Verification Lab",
        subtitle: "Evidence-based vulnerability verification, PoC validation & false-positive elimination",
        icon: <ShieldCheck size={16} />,
        action: () => { onNavigateTab("verificationLab"); onClose(); },
        keywords: ["verify", "verification", "evidence", "lab", "poc", "false positive"],
      },
      {
        id: "nav-web-pentest",
        category: "Navigation",
        title: "Go to Pentesting Workbench",
        subtitle: "Authorized Web Application & API Pentesting Workbench and HTTP inspector",
        icon: <Shield size={16} />,
        action: () => { onNavigateTab("webPentest"); onClose(); },
        keywords: ["pentest", "workbench", "workflow", "stages", "http", "repeater"],
      },
      {
        id: "nav-issues",
        category: "Navigation",
        title: "Go to Issues & Reports Center",
        subtitle: "Generate enterprise compliance reports (PDF/HTML/JSON) and track remediation",
        icon: <ClipboardList size={16} />,
        action: () => { onNavigateTab("issues"); onClose(); },
        keywords: ["issues", "reports", "export", "pdf", "html", "remediation"],
      },
      {
        id: "nav-activity",
        category: "Navigation",
        title: "Go to Activity Monitor",
        subtitle: "Inspect real-time telemetry, tool command logs, and security audit trail",
        icon: <Activity size={16} />,
        action: () => { onNavigateTab("activity"); onClose(); },
        keywords: ["activity", "monitor", "telemetry", "audit", "logs", "events"],
      },
      {
        id: "nav-terminal",
        category: "Navigation",
        title: "Go to Multi-Terminal Workspace",
        subtitle: "Interactive split-pane CLI terminals for security tool execution",
        icon: <Terminal size={16} />,
        action: () => { onNavigateTab("terminal"); onClose(); },
        keywords: ["terminal", "cli", "shell", "powershell", "bash", "command"],
      },
      {
        id: "nav-docs",
        category: "Navigation",
        title: "Go to Security Intelligence Center",
        subtitle: "Browse authoritative security documentation (NIST, MITRE ATT&CK, OWASP, CISA)",
        icon: <BookOpen size={16} />,
        action: () => { onNavigateTab("documentationCenter"); onClose(); },
        keywords: ["docs", "nist", "mitre", "owasp", "cisa", "documentation", "standards"],
      },
      {
        id: "nav-vuln-explorer",
        category: "Navigation",
        title: "Go to Vulnerability Catalog Explorer",
        subtitle: "Search CVEs, CWE taxonomy, CVSS calculator, and CISA Known Exploited Vulnerabilities",
        icon: <Search size={16} />,
        action: () => { onNavigateTab("vulnerabilityExplorer"); onClose(); },
        keywords: ["cve", "cwe", "cvss", "kev", "vulnerabilities", "catalog", "search"],
      },
      {
        id: "nav-zero-day",
        category: "Navigation",
        title: "Go to Zero-Day Research Workspace",
        subtitle: "Binary diffing, patch analysis, and vulnerability intelligence",
        icon: <ShieldAlert size={16} />,
        action: () => { onNavigateTab("zeroDayResearch"); onClose(); },
        keywords: ["zero-day", "0day", "diff", "patch", "research", "exploit"],
      },
      {
        id: "nav-methodologies",
        category: "Navigation",
        title: "Go to Methodologies & Workflows",
        subtitle: "Structured attack and defense frameworks (PTES, WSTG, OWASP ASVS)",
        icon: <FileCheck size={16} />,
        action: () => { onNavigateTab("methodologies"); onClose(); },
        keywords: ["methodology", "ptes", "wstg", "asvs", "playbook", "workflow"],
      },
      {
        id: "nav-diagrams",
        category: "Navigation",
        title: "Go to Interactive Diagram Library",
        subtitle: "Visual attack flows, OAuth 2.0 sequences, and network architectures",
        icon: <Layers size={16} />,
        action: () => { onNavigateTab("diagramLibrary"); onClose(); },
        keywords: ["diagram", "mermaid", "flowchart", "architecture", "visual"],
      },
      {
        id: "nav-glossary",
        category: "Navigation",
        title: "Go to Glossary & Reference Library",
        subtitle: "Comprehensive cybersecurity terminology, acronyms, and Hinglish definitions",
        icon: <BookA size={16} />,
        action: () => { onNavigateTab("glossaryLibrary"); onClose(); },
        keywords: ["glossary", "dictionary", "terms", "acronyms", "definitions", "reference"],
      },
      {
        id: "nav-api-sec",
        category: "Navigation",
        title: "Go to API Security Testing",
        subtitle: "Test REST, GraphQL, Postman collections and OpenAPI specifications",
        icon: <Globe size={16} />,
        action: () => { onNavigateTab("apiSecurity"); onClose(); },
        keywords: ["api", "postman", "openapi", "swagger", "graphql", "rest"],
      },
      {
        id: "nav-network-recon",
        category: "Navigation",
        title: "Go to Network Reconnaissance",
        subtitle: "Subnet mapping, service banner enumeration, and host discovery",
        icon: <Network size={16} />,
        action: () => { onNavigateTab("networkRecon"); onClose(); },
        keywords: ["network", "recon", "ports", "nmap", "subnet", "cidr", "services"],
      },
      {
        id: "nav-playbooks",
        category: "Navigation",
        title: "Go to Security Playbooks & Checklists",
        subtitle: "OWASP Top 10, API, and cloud security verification checklists",
        icon: <FileCheck size={16} />,
        action: () => { onNavigateTab("playbooks"); onClose(); },
        keywords: ["playbooks", "checklists", "owasp", "compliance", "verification"],
      },

      // Quick Actions
      {
        id: "act-baseline",
        category: "Quick Action",
        title: "Run Baseline Security Audit",
        subtitle: "Perform fast passive header, cookie, SSL, and robots audit",
        icon: <Play size={16} color="var(--accent-cyan)" />,
        action: () => { onQuickScan("baseline"); onClose(); },
        keywords: ["fast", "headers", "audit"],
      },
      {
        id: "act-httpx",
        category: "Quick Action",
        title: "Run HTTPX Prober",
        subtitle: "Probe web technologies, response codes, and titles",
        icon: <Play size={16} color="var(--accent-cyan)" />,
        action: () => { onQuickScan("httpx"); onClose(); },
        keywords: ["probe", "ports", "tech"],
      },
      {
        id: "act-export",
        category: "Quick Action",
        title: "Export HTML Audit Report",
        subtitle: "Generate and save a standalone HTML penetration test report",
        icon: <Download size={16} />,
        action: () => { onExportReport(); onClose(); },
        keywords: ["download", "pdf", "html", "report"],
      },
      {
        id: "act-emergency",
        category: "Quick Action",
        title: "Emergency Stop All Scans",
        subtitle: "Immediately terminate active background scan processes",
        icon: <AlertOctagon size={16} color="var(--accent-rose)" />,
        action: () => { onEmergencyStop(); onClose(); },
        keywords: ["kill", "abort", "cancel", "halt"],
      },

      // Themes
      ...(Object.keys(BUILT_IN_THEMES) as ThemeId[]).map((themeKey) => {
        const t = BUILT_IN_THEMES[themeKey];
        const isCurrent = preferences.theme === themeKey;
        return {
          id: `theme-${themeKey}`,
          category: "Themes" as const,
          title: `Switch Theme to ${t.name}`,
          subtitle: t.description,
          icon: isCurrent ? <Check size={16} color="var(--accent-cyan)" /> : <Palette size={16} />,
          action: () => { setTheme(themeKey); onClose(); },
          keywords: ["theme", "style", themeKey, t.name.toLowerCase()],
        };
      }),

      // Top 10 Recent Findings
      ...findings.slice(0, 8).map((f) => ({
        id: `finding-${f.id}`,
        category: "Findings" as const,
        title: f.title,
        subtitle: `${f.severity} • ${f.affected_asset} • ${f.source_tool}`,
        icon: <Shield size={16} color={f.severity === "Critical" ? "var(--accent-rose)" : "var(--accent-amber)"} />,
        action: () => {
          onSelectFinding(f);
          onNavigateTab("findings");
          onClose();
        },
        keywords: ["finding", f.severity.toLowerCase(), f.cwe ? f.cwe.toLowerCase() : ""],
      })),
    ];

    return list;
  }, [findings, onNavigateTab, onQuickScan, onExportReport, onEmergencyStop, onSelectFinding, onClose, preferences.theme, setTheme]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(q)) return true;
      if (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) return true;
      if (cmd.category.toLowerCase().includes(q)) return true;
      if (cmd.keywords && cmd.keywords.some((k) => k.includes(q))) return true;
      return false;
    });
  }, [allCommands, query]);

  // Clamp selection index
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle Arrow navigation & Enter
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 10000,
        animation: "modal-fade 0.15s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "92vw",
          maxWidth: "600px",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-accent)",
          borderRadius: "12px",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <Search size={18} color="var(--text-dim)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, page, finding, or theme... (↑↓ to select, ↵ to run)"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-main)",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          />
          <kbd
            style={{
              fontSize: "0.7rem",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-dim)",
              fontFamily: "inherit",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: "380px",
            overflowY: "auto",
            padding: "8px",
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "0.88rem",
              }}
            >
              No commands or findings found matching "<strong>{query}</strong>"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--bg-card-hover)" : "transparent",
                    border: isSelected ? "1px solid var(--border-accent)" : "1px solid transparent",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => cmd.action()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div
                      style={{
                        color: isSelected ? "var(--accent-cyan)" : "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {cmd.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.86rem",
                          fontWeight: 600,
                          color: isSelected ? "var(--text-main)" : "var(--text-main)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {cmd.title}
                      </div>
                      {cmd.subtitle && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-dim)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-dim)",
                        fontWeight: 500,
                      }}
                    >
                      {cmd.category}
                    </span>
                    {isSelected && <ArrowRight size={14} color="var(--accent-cyan)" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 18px",
            backgroundColor: "var(--bg-primary)",
            borderTop: "1px solid var(--border-color)",
            fontSize: "0.72rem",
            color: "var(--text-dim)",
          }}
        >
          <div style={{ display: "flex", gap: "14px" }}>
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <div>AppSec Nexus Command Engine</div>
        </div>
      </div>
    </div>
  );
}
