import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import {
  Shield,
  Terminal,
  Layers,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Target as TargetIcon,
  Download,
  History,
  FileCode,
  ArrowDownCircle,
  Compass,
  UploadCloud,
  Search,
  ExternalLink,
  Puzzle,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Radio,
  BookOpen,
  GraduationCap,
  Activity,
  Monitor,
  Cpu,
  Palette,
  PanelLeft,
  Sun,
  Moon,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Bot,
  X,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Zap,
  ChevronDown,
  ChevronUp,
  Settings2,
  Info,
  Edit2,
  Trash2,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  ClipboardList,
  Keyboard,
  FileCheck,
  Eye,
  List,
  Globe,
} from "lucide-react";
import "./App.css";
import {
  Target,
  ToolInfo,
  PluginInfo,
  FeedUpdateResult,
  Finding,
  ScanResult,
  FindingStatus,
  DiscoveredEndpoint,
  ModelPullProgress,
  ValidationRecord,
  WorkspacePreset,
  OllamaSystemInfo,
  SecurityAiRole,
  MethodologyDefinition,
} from "./types";
import {
  RECOMMENDED_QUICK_MODEL,
  RECOMMENDED_DEEP_MODEL,
  isModelInstalled,
  resolveModelSlots,
  persistAiWorkspaceConfig,
} from "./utils/aiModelResolver";
import { useTheme } from "./theme/ThemeProvider";
import { useToast } from "./components/ui/Toast";
import { SeverityBadge, StatusBadge, ScopeBadge, ValidationBadge } from "./components/ui/Badge";
import { CommandPalette } from "./components/CommandPalette";
import { useAiTaskContext } from "./context/AiTaskContext";
import { useWorkspace } from "./context/WorkspaceContext";
import { WorkspaceTabs } from "./components/ui/WorkspaceTabs";
import { WorkspaceToolbar } from "./components/ui/WorkspaceToolbar";
import { WorkspaceControlsDrawer } from "./components/ui/WorkspaceControlsDrawer";
import { SlidingDrawer } from "./components/ui/SlidingDrawer";
import { TourProvider } from "./context/TourContext";
import { InteractiveTourOverlay } from "./components/tour/InteractiveTourOverlay";
import { HelpCenterModal } from "./components/help/HelpCenterModal";
import { GuidedWorkflowsDrawer } from "./components/help/GuidedWorkflowsDrawer";
import { HeaderHelpMenu } from "./components/help/HeaderHelpMenu";
import { ContextualHelpButton } from "./components/help/ContextualHelpButton";
import { LRUCache, InvertedIndex, BinaryMaxHeap, FindingDeduplicator } from "./utils/securityDsa";
import { ConfirmationModal } from "./components/crud/ConfirmationModal";
import { TargetEditModal } from "./components/crud/TargetEditModal";
import { FindingEditModal } from "./components/crud/FindingEditModal";
import { FindingCreateModal } from "./components/crud/FindingCreateModal";
import { AuditLogModal } from "./components/crud/AuditLogModal";
import { KeyboardShortcutsModal } from "./components/help/KeyboardShortcutsModal";
import { NavigationBreadcrumbs } from "./components/ui/NavigationBreadcrumbs";
import { SecurityCategory } from "./categories/types";
import { CategorySelector } from "./categories/CategorySelector";
import { FindingInlineDetailsAccordion } from "./components/findings/FindingInlineDetailsAccordion";
import { ContextMenu } from "./components/ui/ContextMenu";
import { useScanProgress } from "./context/ScanProgressContext";
import { ScanProgressIndicatorBanner } from "./components/scanners/ScanProgressIndicatorBanner";
import { FindingsTableSkeleton, ScanHistorySkeleton } from "./components/ui/SkeletonLoaders";

// High-Performance Code-Splitting for Low-Spec PCs:
// Defer loading heavy components until the user switches to their respective tabs
const AnalyticsDashboard = lazy(() =>
  import("./Analytics").then((m) => ({ default: m.AnalyticsDashboard }))
);
const MentorChat = lazy(() =>
  import("./MentorChat").then((m) => ({ default: m.MentorChat }))
);
const HostMobileAudit = lazy(() =>
  import("./HostMobileAudit").then((m) => ({ default: m.HostMobileAudit }))
);
const CyberAcademy = lazy(() =>
  import("./academy/CyberAcademy").then((m) => ({ default: m.CyberAcademy }))
);
const OrchestrationHub = lazy(() =>
  import("./orchestration/OrchestrationHub").then((m) => ({ default: m.OrchestrationHub }))
);
const CategoryWorkflowView = lazy(() =>
  import("./categories/CategoryWorkflowView").then((m) => ({ default: m.CategoryWorkflowView }))
);
const ChecklistPlaybookCenter = lazy(() =>
  import("./checklists/ChecklistPlaybookCenter").then((m) => ({ default: m.ChecklistPlaybookCenter }))
);
const BurpIntegrationView = lazy(() =>
  import("./burp/BurpIntegrationView").then((m) => ({ default: m.BurpIntegrationView }))
);
const MultiTerminalWorkspace = lazy(() =>
  import("./terminal/MultiTerminalWorkspace").then((m) => ({ default: m.MultiTerminalWorkspace }))
);
const VulnerabilityDetailPage = lazy(() =>
  import("./components/findings/VulnerabilityDetailPage").then((m) => ({ default: m.VulnerabilityDetailPage }))
);
const MethodologyExplorer = lazy(() =>
  import("./components/methodologies/MethodologyExplorer").then((m) => ({ default: m.MethodologyExplorer }))
);
const IssueCenter = lazy(() =>
  import("./components/issues/IssueCenter").then((m) => ({ default: m.IssueCenter }))
);
const AppearanceSettings = lazy(() =>
  import("./components/AppearanceSettings").then((m) => ({ default: m.AppearanceSettings }))
);
const ModelLabView = lazy(() =>
  import("./components/model_lab/ModelLabView").then((m) => ({ default: m.ModelLabView }))
);

const TabLoadingSkeleton: React.FC = () => (
  <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ height: 38, width: "35%", background: "rgba(255, 255, 255, 0.05)", borderRadius: 8, animation: "pulse 1.5s infinite" }} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      <div style={{ height: 100, background: "rgba(255, 255, 255, 0.04)", borderRadius: 8 }} />
      <div style={{ height: 100, background: "rgba(255, 255, 255, 0.04)", borderRadius: 8 }} />
      <div style={{ height: 100, background: "rgba(255, 255, 255, 0.04)", borderRadius: 8 }} />
    </div>
    <div style={{ height: 280, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8 }} />
  </div>
);

export function sortAiModels(models: string[]): string[] {
  return [...models].sort((a, b) => {
    // Prioritize custom cybersecurity educator model first
    const aTeacher8 = a.toLowerCase().includes("appsec-teacher-8b");
    const bTeacher8 = b.toLowerCase().includes("appsec-teacher-8b");
    if (aTeacher8 && !bTeacher8) return -1;
    if (!aTeacher8 && bTeacher8) return 1;

    const aTeacher = a.toLowerCase().includes("appsec-teacher");
    const bTeacher = b.toLowerCase().includes("appsec-teacher");
    if (aTeacher && !bTeacher) return -1;
    if (!aTeacher && bTeacher) return 1;

    // Next prioritize 8B models for higher reasoning capacity
    const a8b = a.toLowerCase().includes("8b");
    const b8b = b.toLowerCase().includes("8b");
    if (a8b && !b8b) return -1;
    if (!a8b && b8b) return 1;

    return a.localeCompare(b);
  });
}

export type TabType =
  | "analytics"
  | "targets"
  | "orchestration"
  | "tools"
  | "crawler"
  | "scanner"
  | "terminal"
  | "findings"
  | "issues"
  | "importer"
  | "mentor"
  | "history"
  | "academy"
  | "hostmobile"
  | "appearance"
  | "categoryWorkflow"
  | "playbooks"
  | "burp"
  | "methodologies"
  | "modelLab";

export default function App() {
  const { preferences, setTheme, setSidebarMode } = useTheme();
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<SecurityCategory>("web");
  const [activeTab, setActiveTab] = useState<TabType>(
    (preferences.defaultTab as TabType) || "analytics"
  );
  const [activeMethodologyId, setActiveMethodologyId] = useState<string | undefined>(undefined);
  const [externalMentorPrompt, setExternalMentorPrompt] = useState<string>("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Global AI persistent tasks context
  const {
    activeTasks,
    hasRunningTask,
    recentlyCompletedTask,
    dismissNotification,
    cancelTask,
  } = useAiTaskContext();

  // Workspace context for customizable panels, draggable tabs, and drawers
  const {
    preset: wsPreset,
    setPreset: setWsPreset,
    drawers,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    isSidebarCollapsed,
    toggleSidebar,
    reopenTab,
    closeTab,
    closedTabs,
    resetWorkspaceLayout,
  } = useWorkspace();

  // Resizable sidebar state with local persistence
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("appsec_sidebar_width");
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 64 && val <= 380) return val;
      }
    } catch {
      // fallback
    }
    return preferences.sidebarMode === "compact" ? 64 : 250;
  });

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // Unified sidebar collapse toggle handler
  const handleToggleSidebar = () => {
    const nextCollapsed = sidebarWidth > 80;
    toggleSidebar();
    setSidebarWidth(nextCollapsed ? 64 : 250);
    setSidebarMode(nextCollapsed ? "compact" : "expanded");
  };

  // Sync workspace sidebar collapse state
  useEffect(() => {
    if (isSidebarCollapsed && sidebarWidth > 80) {
      setSidebarWidth(64);
    } else if (!isSidebarCollapsed && sidebarWidth <= 80) {
      setSidebarWidth(250);
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (preferences.sidebarMode === "compact" && sidebarWidth > 80) {
      setSidebarWidth(64);
    } else if (preferences.sidebarMode !== "compact" && sidebarWidth <= 80) {
      setSidebarWidth(250);
    }
  }, [preferences.sidebarMode]);

  // Workspace Layout Presets
  const [workspacePreset, setWorkspacePreset] = useState<WorkspacePreset>(() => {
    try {
      return (localStorage.getItem("appsec_workspace_preset") as WorkspacePreset) || "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    if (wsPreset && wsPreset !== workspacePreset) {
      setWorkspacePreset(wsPreset);
    }
  }, [wsPreset]);

  const handleSelectPreset = (preset: WorkspacePreset) => {
    setWorkspacePreset(preset);
    setWsPreset(preset);
    try {
      localStorage.setItem("appsec_workspace_preset", preset);
    } catch {
      // ignore
    }
    if (preset === "compact") {
      setSidebarWidth(64);
    } else if (preset === "analyst") {
      setSidebarWidth(240);
      setActiveTab("findings");
    } else if (preset === "pentest") {
      setSidebarWidth(220);
      setActiveTab("scanner");
    } else if (preset === "api") {
      setSidebarWidth(220);
      setActiveTab("crawler");
    } else if (preset === "learning") {
      setSidebarWidth(220);
      setActiveTab("academy");
    } else {
      setSidebarWidth(250);
    }
    addToast({
      type: "info",
      title: "Workspace Layout Applied",
      description: `Activated ${preset.toUpperCase()} layout preset.`,
    });
  };

  const handleSidebarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSidebarPointerMove = (e: React.PointerEvent) => {
    if (!isResizingSidebar) return;
    const newWidth = Math.max(64, Math.min(380, e.clientX));
    setSidebarWidth(newWidth);
    try {
      localStorage.setItem("appsec_sidebar_width", newWidth.toString());
    } catch {
      // ignore
    }
  };

  const handleSidebarPointerUp = (e: React.PointerEvent) => {
    if (isResizingSidebar) {
      setIsResizingSidebar(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Resizable AI drawer state with local persistence
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("appsec_drawer_width");
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 320 && val <= 900) return val;
      }
    } catch {
      // fallback
    }
    return 480;
  });
  const [isResizingDrawer, setIsResizingDrawer] = useState(false);
  const [isDrawerMaximized, setIsDrawerMaximized] = useState(false);

  const handleDrawerPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingDrawer(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDrawerPointerMove = (e: React.PointerEvent) => {
    if (!isResizingDrawer) return;
    const newWidth = Math.max(320, Math.min(900, window.innerWidth - e.clientX));
    setDrawerWidth(newWidth);
    try {
      localStorage.setItem("appsec_drawer_width", newWidth.toString());
    } catch {
      // ignore
    }
  };

  const handleDrawerPointerUp = (e: React.PointerEvent) => {
    if (isResizingDrawer) {
      setIsResizingDrawer(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [toolHubTab, setToolHubTab] = useState<"tools" | "plugins">("tools");
  const [showPluginModal, setShowPluginModal] = useState<boolean>(false);
  const [pluginModalMode, setPluginModalMode] = useState<"form" | "json">("form");
  const [customToolName, setCustomToolName] = useState<string>("");
  const [customToolExe, setCustomToolExe] = useState<string>("");
  const [customToolRuntime, setCustomToolRuntime] = useState<string>("standalone");
  const [customToolDesc, setCustomToolDesc] = useState<string>("");
  const [customToolTimeout, setCustomToolTimeout] = useState<number>(30);
  const [newPluginJson, setNewPluginJson] = useState<string>("");
  const [pluginRegisterStatus, setPluginRegisterStatus] = useState<string>("");
  const [showIntegrationGuide, setShowIntegrationGuide] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<"cli" | "python" | "burp_zap" | "wireshark" | "mobile">("cli");
  const [selectedPluginToRun, setSelectedPluginToRun] = useState<string>("");
  const [isUpdatingFeeds, setIsUpdatingFeeds] = useState<boolean>(false);
  const [feedStatus, setFeedStatus] = useState<string>("");
  const [feedLastUpdated, setFeedLastUpdated] = useState<string>("");
  const [cisaKevCount, setCisaKevCount] = useState<number>(1250);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [activeFindingDetail, setActiveFindingDetail] = useState<Finding | null>(null);
  const [academySelectedVulnId, setAcademySelectedVulnId] = useState<string | undefined>(undefined);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>([]);

  // Target creation form
  const [targetName, setTargetName] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [allowLocalLab, setAllowLocalLab] = useState(false);
  const [targetError, setTargetError] = useState("");

  // Scan progress and background task integration
  const { startScan } = useScanProgress();
  const [isFindingsLoading, setIsFindingsLoading] = useState(false);
  const [isScanHistoryLoading, setIsScanHistoryLoading] = useState(false);

  // Scan execution
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<string>("baseline");

  // Crawler state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlDepth, setCrawlDepth] = useState<number>(2);
  const [crawlMaxPages, setCrawlMaxPages] = useState<number>(25);
  const [crawlFilter, setCrawlFilter] = useState<string>("");

  // Report Importer state
  const [importFormat, setImportFormat] = useState<"zap_json" | "burp_xml" | "generic_json">("zap_json");
  const [importContent, setImportContent] = useState<string>("");
  const [importStatus, setImportStatus] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Findings filters & search
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>("ALL");
  const [findingStatusFilter, setFindingStatusFilter] = useState<string>("ALL");
  const [findingSearchQuery, setFindingSearchQuery] = useState<string>("");
  const [validatingFindingId, setValidatingFindingId] = useState<string | null>(null);
  const [isBatchValidating, setIsBatchValidating] = useState<boolean>(false);

  // AI Mentor & Two-Model Security AI Workspace state
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [quickModel, setQuickModel] = useState<string>(RECOMMENDED_QUICK_MODEL);
  const [deepModel, setDeepModel] = useState<string>(RECOMMENDED_DEEP_MODEL);
  const [activeAiRole, setActiveAiRole] = useState<SecurityAiRole>("quick");
  const [ollamaSystemInfo, setOllamaSystemInfo] = useState<OllamaSystemInfo | null>(null);
  const [isModelSetupOpen, setIsModelSetupOpen] = useState<boolean>(false);
  const [isSystemInfoOpen, setIsSystemInfoOpen] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>("");
  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("appsec_ai_mentor_enabled");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });
  const [aiMode, setAiMode] = useState<"beginner" | "advanced">("beginner");
  const [reportStatus, setReportStatus] = useState<string>("");
  const [pullingModel, setPullingModel] = useState<string>("");
  const [pullStatus, setPullStatus] = useState<string>("");
  const [pullProgress, setPullProgress] = useState<ModelPullProgress | null>(null);

  // Target CRUD
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  // Finding CRUD & Bulk Operations
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [deletingFinding, setDeletingFinding] = useState<Finding | null>(null);
  const [isDeletingFinding, setIsDeletingFinding] = useState(false);
  const [isCreateFindingOpen, setIsCreateFindingOpen] = useState(false);
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set());
  const [bulkStatusTarget, setBulkStatusTarget] = useState<FindingStatus>("Confirmed");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Finding Sorting & Pagination
  const [findingSortField, setFindingSortField] = useState<
    "severity" | "title" | "validation_status" | "status" | "source_tool" | "affected_asset" | "cwe"
  >("severity");
  const [findingSortDirection, setFindingSortDirection] = useState<"asc" | "desc">("desc");
  const [findingPage, setFindingPage] = useState<number>(1);
  const [findingPageSize, setFindingPageSize] = useState<number>(25);

  // Finding Inline Details Expansion & View Mode
  const [expandedFindingIds, setExpandedFindingIds] = useState<Set<string>>(new Set());
  const [findingViewMode, setFindingViewMode] = useState<"table" | "cards">("table");

  // User Role & Finding Context Menu State
  const [currentUserRole, setCurrentUserRole] = useState<"Admin" | "Viewer">("Admin");
  const [findingContextMenu, setFindingContextMenu] = useState<{
    x: number;
    y: number;
    finding: Finding;
  } | null>(null);
  const [targetContextMenu, setTargetContextMenu] = useState<{
    x: number;
    y: number;
    target: Target;
  } | null>(null);
  const [scanHistoryContextMenu, setScanHistoryContextMenu] = useState<{
    x: number;
    y: number;
    scan: ScanResult;
  } | null>(null);

  const toggleExpandFinding = (id: string) => {
    setExpandedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Endpoint CRUD
  const [isClearingEndpointsModalOpen, setIsClearingEndpointsModalOpen] = useState(false);

  // Scan History CRUD & Audit Log
  const [isClearingScanHistoryModalOpen, setIsClearingScanHistoryModalOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);

  const isTauriApp = isTauri();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauriApp) {
      listen<ModelPullProgress>("ollama-pull-progress", (event) => {
        setPullProgress(event.payload);
        if (event.payload.done) {
          setPullStatus(`Model '${event.payload.model}' ready for offline use!`);
          setPullingModel("");
          handleRefreshAiStatus();
        } else if (event.payload.error) {
          setPullStatus(`Download failed: ${event.payload.error}`);
          setPullingModel("");
        }
      }).then((u) => {
        unlisten = u;
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauriApp]);

  useEffect(() => {
    if (selectedTarget && isTauriApp) {
      loadEndpoints(selectedTarget.id);
    }
  }, [selectedTarget]);

  async function loadInitialData() {
    if (!isTauriApp) {
      console.warn("Running in Web Preview mode. Displaying sample data.");
      setTools([
        {
          id: "baseline",
          name: "Native Baseline Security Checks",
          version: "1.0.0",
          category: "Passive / Headers",
          is_available: true,
          path: "internal://rust",
          description: "Built-in scanner checking CSP, CORS, HSTS, cookie flags, and robots.txt.",
        },
        {
          id: "nuclei",
          name: "ProjectDiscovery Nuclei",
          version: "3.11.1",
          category: "Vulnerability Scanner",
          is_available: true,
          path: "tools/bin/nuclei.exe",
          description: "Template-based vulnerability scanner for CVEs and exposures.",
        },
        {
          id: "httpx",
          name: "ProjectDiscovery httpx",
          version: "1.12.0",
          category: "Service & Tech Prober",
          is_available: true,
          path: "tools/bin/httpx.exe",
          description: "Fast HTTP prober for service reachability and tech detection.",
        },
        {
          id: "nmap",
          name: "Nmap Network Scanner",
          version: "7.92",
          category: "Port & Service Discovery",
          is_available: true,
          path: "tools/bin/nmap/nmap-7.92/nmap.exe",
          description: "Network discovery and service version audit.",
        },
      ]);
      return;
    }

    try {
      const toolsList = await invoke<ToolInfo[]>("get_tools");
      setTools(toolsList);

      const targetsList = await invoke<Target[]>("get_targets");
      setTargets(targetsList);
      if (targetsList.length > 0) {
        setSelectedTarget(targetsList[0]);
      }

      setIsFindingsLoading(true);
      setIsScanHistoryLoading(true);
      const findingsList = await invoke<Finding[]>("get_findings");
      const dedup = new FindingDeduplicator();
      const dedupedFindings = findingsList.filter(
        (f) => !dedup.isDuplicate(f.affected_asset, f.cwe, f.source_tool, f.title)
      );
      setFindings(dedupedFindings);
      setIsFindingsLoading(false);

      const historyList = await invoke<ScanResult[]>("get_scan_history");
      setScanHistory(historyList);
      setIsScanHistoryLoading(false);

      let isOnline = false;
      let installedList: string[] = [];
      try {
        const sysInfo = await invoke<OllamaSystemInfo>("get_ollama_system_info");
        setOllamaSystemInfo(sysInfo);
        isOnline = sysInfo.is_online;
        installedList = sysInfo.installed_models || [];
      } catch (e) {
        console.warn("get_ollama_system_info fallback to get_ai_status:", e);
        try {
          const [available, models] = await invoke<[boolean, string[]]>("get_ai_status");
          isOnline = available;
          installedList = models || [];
        } catch (err2) {
          console.warn("Could not query get_ai_status:", err2);
        }
      }
      setAiAvailable(isOnline);
      const sortedModels = sortAiModels(installedList);
      setAiModels(sortedModels);

      const resolved = resolveModelSlots(sortedModels);
      setQuickModel(resolved.quickModel);
      setDeepModel(resolved.deepModel);
      setActiveAiRole(resolved.activeRole);
      const activeModel = resolved.activeRole === "quick" ? resolved.quickModel : resolved.deepModel;
      setSelectedModel(activeModel);

      const pluginsList = await invoke<PluginInfo[]>("get_plugins");
      setPlugins(pluginsList);
      if (pluginsList.length > 0) {
        setSelectedPluginToRun(pluginsList[0].id);
      }

      try {
        const role = await invoke<string>("get_current_user_role");
        if (role === "Admin" || role === "Viewer") {
          setCurrentUserRole(role);
        }
      } catch (roleErr) {
        console.warn("Could not fetch current_user_role:", roleErr);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  function loadPluginTemplate(type: "python" | "node" | "binary") {
    if (type === "python") {
      setNewPluginJson(JSON.stringify({
        id: "my-custom-scanner",
        name: "My Custom Python Scanner",
        version: "1.0.0",
        publisher: "Security Team",
        runtime: "python3",
        executable: "run.py",
        capabilities: ["custom_check", "api_audit"],
        permissions: {
          network: ["in_scope_target_only"],
          filesystem: ["none"],
          environment: ["none"]
        },
        timeout_seconds: 30,
        description: "Custom Python plugin that checks specific business logic or API endpoints."
      }, null, 2));
    } else if (type === "node") {
      setNewPluginJson(JSON.stringify({
        id: "my-node-scanner",
        name: "My Node.js Security Script",
        version: "1.0.0",
        publisher: "Security Team",
        runtime: "node",
        executable: "index.js",
        capabilities: ["custom_check"],
        permissions: {
          network: ["in_scope_target_only"],
          filesystem: ["none"],
          environment: ["none"]
        },
        timeout_seconds: 30,
        description: "Node.js plugin performing targeted HTTP assertions."
      }, null, 2));
    } else {
      setNewPluginJson(JSON.stringify({
        id: "custom-binary-tool",
        name: "Custom Binary Scanner",
        version: "1.0.0",
        publisher: "Security Team",
        runtime: "standalone",
        executable: "scanner.exe",
        capabilities: ["binary_audit"],
        permissions: {
          network: ["in_scope_target_only"],
          filesystem: ["none"],
          environment: ["none"]
        },
        timeout_seconds: 45,
        description: "Standalone compiled binary scanner adapter."
      }, null, 2));
    }
  }

  async function handleRegisterQuickTool() {
    if (!customToolName.trim() || !customToolExe.trim()) {
      setPluginRegisterStatus("Please enter both Tool Name and Executable/Command.");
      return;
    }
    const cleanId = customToolName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const manifest = {
      id: cleanId || `tool-${Date.now()}`,
      name: customToolName.trim(),
      version: "1.0.0",
      publisher: "Local Administrator",
      runtime: customToolRuntime,
      executable: customToolExe.trim(),
      capabilities: ["custom_security_scan", "cli_adapter"],
      permissions: {
        network: ["in_scope_target_only"],
        filesystem: ["none"],
        environment: ["none"]
      },
      timeout_seconds: customToolTimeout || 30,
      description: customToolDesc.trim() || "Custom security tool integrated via AppSec Nexus Universal CLI Adapter."
    };
    setNewPluginJson(JSON.stringify(manifest, null, 2));
    if (!isTauriApp) {
      setPluginRegisterStatus("Desktop environment required to register tools.");
      return;
    }
    setPluginRegisterStatus("Registering custom tool adapter...");
    try {
      const registered = await invoke<PluginInfo>("register_plugin", { manifestJson: JSON.stringify(manifest) });
      setPlugins((prev) => [...prev.filter((p) => p.id !== registered.id), registered]);
      setPluginRegisterStatus(`✓ Tool '${registered.name}' registered successfully!`);
      setTimeout(() => {
        setShowPluginModal(false);
        setPluginRegisterStatus("");
        setCustomToolName("");
        setCustomToolExe("");
        setCustomToolDesc("");
      }, 1200);
    } catch (err: any) {
      setPluginRegisterStatus(`Error: ${err.toString()}`);
    }
  }

  async function handleRegisterPlugin() {
    if (!newPluginJson.trim()) {
      setPluginRegisterStatus("Please enter or load a manifest JSON first.");
      return;
    }
    if (!isTauriApp) {
      setPluginRegisterStatus("Desktop environment required to register plugins.");
      return;
    }
    setPluginRegisterStatus("Validating and registering plugin...");
    try {
      const registered = await invoke<PluginInfo>("register_plugin", { manifestJson: newPluginJson });
      setPlugins((prev) => [...prev.filter((p) => p.id !== registered.id), registered]);
      setPluginRegisterStatus(`✓ Plugin '${registered.name}' registered successfully!`);
      setTimeout(() => {
        setShowPluginModal(false);
        setPluginRegisterStatus("");
        setNewPluginJson("");
      }, 1200);
    } catch (err: any) {
      setPluginRegisterStatus(`Error: ${err.toString()}`);
    }
  }

  async function handleSyncThreatFeeds() {
    if (!isTauriApp) {
      setFeedStatus("Desktop environment required to update threat feeds.");
      return;
    }
    setIsUpdatingFeeds(true);
    setFeedStatus("Syncing Nuclei CVE templates and CISA Known Exploited Vulnerabilities catalog...");
    try {
      const res = await invoke<FeedUpdateResult>("update_threat_feeds");
      setCisaKevCount(res.cisa_kev_count);
      setFeedLastUpdated(new Date().toLocaleTimeString());
      setFeedStatus(res.message);
      // Reload plugins in case new plugins were added
      const updatedPlugins = await invoke<PluginInfo[]>("get_plugins");
      setPlugins(updatedPlugins);
      setTimeout(() => setFeedStatus(""), 7000);
    } catch (err: any) {
      setFeedStatus(`Feed sync failed: ${err.toString()}`);
    } finally {
      setIsUpdatingFeeds(false);
    }
  }

  async function loadEndpoints(targetId: string) {
    try {
      const list = await invoke<DiscoveredEndpoint[]>("get_endpoints", { targetId });
      setEndpoints(list);
    } catch (err) {
      console.error("Failed to load endpoints:", err);
    }
  }

  async function handleCreateTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError("");
    if (!isTauriApp) {
      alert("Target creation requires the native desktop window.");
      return;
    }

    try {
      const newTarget = await invoke<Target>("create_target", {
        name: targetName || targetUrl,
        primaryUrl: targetUrl,
        allowLocalLab,
      });
      setTargets([newTarget, ...targets]);
      setSelectedTarget(newTarget);
      setTargetName("");
      setTargetUrl("");
    } catch (err: any) {
      setTargetError(err.toString());
    }
  }

  async function handleRunScan(toolId: string) {
    if (!selectedTarget) {
      alert("Please select or configure an authorized target first.");
      return;
    }

    if (!isTauriApp) {
      alert("Live scans require running inside the native desktop application (appsec-nexus.exe).");
      return;
    }

    setIsScanning(true);
    setActiveTool(toolId);
    setScanLogs([`Starting ${toolId} scan against ${selectedTarget.primary_url}...`]);

    const toolObj = tools.find((t) => t.id === toolId);
    const toolLabel = toolObj ? toolObj.name : toolId.toUpperCase();

    try {
      await startScan(
        selectedTarget.id,
        selectedTarget.primary_url,
        toolId,
        toolLabel,
        (result, updatedFindings, updatedHistory) => {
          setFindings(updatedFindings);
          setScanHistory(updatedHistory);
          setScanLogs((prev) => [...prev, ...result.logs, `Completed in ${result.duration_ms} ms.`]);
          addToast({
            type: "success",
            title: "Security Audit Complete",
            description: `${toolLabel} finished. Discovered ${result.findings_count} observation(s).`,
          });
        },
        (errMsg) => {
          setScanLogs((prev) => [...prev, `[ERROR] Scan aborted: ${errMsg}`]);
          addToast({
            type: "error",
            title: "Scan Failed",
            description: errMsg,
          });
        }
      );
    } catch (err: any) {
      setScanLogs((prev) => [...prev, `[ERROR] Scan aborted: ${err.toString()}`]);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleRunCrawler() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    if (!isTauriApp) {
      alert("Crawler execution requires the native desktop window.");
      return;
    }

    setIsCrawling(true);
    try {
      const discovered = await invoke<DiscoveredEndpoint[]>("run_crawler", {
        targetId: selectedTarget.id,
        maxDepth: crawlDepth,
        maxPages: crawlMaxPages,
      });
      setEndpoints(discovered);

      // Reload findings in case sensitive exposure findings were found
      const updatedFindings = await invoke<Finding[]>("get_findings");
      setFindings(updatedFindings);
    } catch (err: any) {
      alert(`Crawler error: ${err.toString()}`);
      if (isTauriApp) {
        invoke("record_issue", {
          payload: {
            title: `Crawler Failure: ${selectedTarget?.name}`,
            category: "BackendApiError",
            subtype: "CrawlerError",
            severity: "Medium",
            affected_component: selectedTarget?.primary_url || "crawler",
            affected_target_id: selectedTarget?.id,
            affected_target_name: selectedTarget?.name,
            source: "Recon",
            description: `Automated endpoint discovery crawling halted with error`,
            error_details: err?.toString() || "Unknown crawler error",
          },
        }).catch((e) => console.error("Auto issue recording error:", e));
      }
    } finally {
      setIsCrawling(false);
    }
  }

  async function handleImportReport() {
    if (!selectedTarget) {
      alert("Please select a target first.");
      return;
    }
    if (!importContent.trim()) {
      alert("Please paste the report content first.");
      return;
    }

    setIsImporting(true);
    setImportStatus("");
    try {
      const count = await invoke<number>("import_external_report", {
        targetId: selectedTarget.id,
        format: importFormat,
        data: importContent,
      });

      setImportStatus(`Successfully ingested ${count} findings into SQLite database.`);
      setImportContent("");

      const updatedFindings = await invoke<Finding[]>("get_findings");
      setFindings(updatedFindings);
    } catch (err: any) {
      setImportStatus(`Import Error: ${err.toString()}`);
    } finally {
      setIsImporting(false);
    }
  }

  async function handleExportReport() {
    if (!selectedTarget) {
      addToast({
        type: "warning",
        title: "Target Required",
        description: "Please select an active target before exporting an HTML report.",
      });
      return;
    }
    try {
      const filename = await invoke<string>("export_report", {
        targetId: selectedTarget.id,
      });
      setReportStatus(`HTML report exported: ${filename}`);
      addToast({
        type: "success",
        title: "HTML Report Exported",
        description: `Saved report to ${filename}`,
      });
      setTimeout(() => setReportStatus(""), 8000);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Export Failed",
        description: err.toString(),
      });
    }
  }

  async function handleExportJson() {
    if (!selectedTarget) {
      addToast({
        type: "warning",
        title: "Target Required",
        description: "Please select an active target before exporting a JSON report.",
      });
      return;
    }
    try {
      const filename = await invoke<string>("export_report_json", {
        targetId: selectedTarget.id,
      });
      setReportStatus(`JSON report exported: ${filename}`);
      addToast({
        type: "success",
        title: "JSON Report Exported",
        description: `Saved report to ${filename}`,
      });
      setTimeout(() => setReportStatus(""), 8000);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Export Failed",
        description: err.toString(),
      });
    }
  }

  async function handleUpdateFindingStatus(findingId: string, status: FindingStatus) {
    try {
      await invoke("update_finding_status", { findingId, status });
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status } : f))
      );
      addToast({
        type: "info",
        title: "Finding Status Updated",
        description: `Changed status to "${status}"`,
        duration: 2500,
      });
    } catch (err: any) {
      console.error("Failed to update finding status:", err);
      addToast({
        type: "error",
        title: "Update Failed",
        description: err.toString(),
      });
    }
  }

  // --- TARGET CRUD HANDLERS ---
  const handleUpdateTarget = (updated: Target) => {
    setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTarget?.id === updated.id) {
      setSelectedTarget(updated);
    }
    setEditingTarget(null);
    addToast({
      type: "success",
      title: "Target Updated",
      description: `Target "${updated.name}" updated successfully.`,
    });
  };

  const handleConfirmDeleteTarget = async () => {
    if (!deletingTarget) return;
    setIsDeletingTarget(true);
    try {
      if (isTauriApp) {
        await invoke("delete_target", { id: deletingTarget.id });
      }
      const targetId = deletingTarget.id;
      const targetName = deletingTarget.name;
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      if (selectedTarget?.id === targetId) {
        const remaining = targets.filter((t) => t.id !== targetId);
        setSelectedTarget(remaining.length > 0 ? remaining[0] : null);
      }
      setFindings((prev) => prev.filter((f) => f.target_id !== targetId));
      setEndpoints((prev) => prev.filter((ep) => ep.target_id !== targetId));
      setDeletingTarget(null);
      addToast({
        type: "success",
        title: "Target Deleted",
        description: `Target "${targetName}" and associated records deleted.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        description: err?.message || String(err),
      });
    } finally {
      setIsDeletingTarget(false);
    }
  };

  // --- FINDINGS CRUD & BULK HANDLERS ---
  const handleCreateFinding = (created: Finding) => {
    setFindings((prev) => [created, ...prev]);
    setIsCreateFindingOpen(false);
    addToast({
      type: "success",
      title: "Finding Recorded",
      description: `Custom observation "${created.title}" successfully added.`,
    });
  };

  const handleUpdateFinding = (updated: Finding) => {
    setFindings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    if (selectedFinding?.id === updated.id) {
      setSelectedFinding(updated);
    }
    setEditingFinding(null);
    addToast({
      type: "success",
      title: "Finding Updated",
      description: `Updated finding "${updated.title}".`,
    });
  };

  const handleConfirmDeleteFinding = async () => {
    if (!deletingFinding) return;
    setIsDeletingFinding(true);
    try {
      if (isTauriApp) {
        await invoke("delete_finding", { id: deletingFinding.id });
      }
      const id = deletingFinding.id;
      const title = deletingFinding.title;
      setFindings((prev) => prev.filter((f) => f.id !== id));
      if (selectedFinding?.id === id) {
        setSelectedFinding(null);
      }
      setSelectedFindingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeletingFinding(null);
      addToast({
        type: "success",
        title: "Finding Deleted",
        description: `Removed finding "${title}".`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        description: err?.message || String(err),
      });
    } finally {
      setIsDeletingFinding(false);
    }
  };

  const handleToggleSelectAll = () => {
    const pageIds = paginatedFindings.map((f) => f.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedFindingIds.has(id));
    setSelectedFindingIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectFinding = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFindingIds((prev) => {
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
    if (selectedFindingIds.size === 0) return;
    const ids = Array.from(selectedFindingIds);
    try {
      if (isTauriApp) {
        await invoke("bulk_update_finding_status", { ids, newStatus: bulkStatusTarget });
      }
      setFindings((prev) =>
        prev.map((f) => (selectedFindingIds.has(f.id) ? { ...f, status: bulkStatusTarget } : f))
      );
      addToast({
        type: "success",
        title: "Bulk Status Updated",
        description: `Updated status to "${bulkStatusTarget}" for ${ids.length} findings.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Bulk Update Failed",
        description: err?.message || String(err),
      });
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedFindingIds.size === 0) return;
    const ids = Array.from(selectedFindingIds);
    setIsBulkDeleting(true);
    try {
      if (isTauriApp) {
        await invoke("bulk_delete_findings", { ids });
      }
      setFindings((prev) => prev.filter((f) => !selectedFindingIds.has(f.id)));
      if (selectedFinding && selectedFindingIds.has(selectedFinding.id)) {
        setSelectedFinding(null);
      }
      setSelectedFindingIds(new Set());
      setIsBulkDeleteModalOpen(false);
      addToast({
        type: "success",
        title: "Bulk Deletion Complete",
        description: `Successfully deleted ${ids.length} findings.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Bulk Delete Failed",
        description: err?.message || String(err),
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportSelectedFindingsJson = () => {
    const selected = findings.filter((f) => selectedFindingIds.has(f.id));
    if (selected.length === 0) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appsec-selected-findings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: "info",
      title: "Export Initiated",
      description: `Exported ${selected.length} findings to JSON.`,
    });
  };

  // --- ENDPOINT CRUD HANDLERS ---
  const handleDeleteEndpoint = async (ep: DiscoveredEndpoint) => {
    try {
      if (isTauriApp) {
        await invoke("delete_endpoint", { id: ep.id });
      }
      setEndpoints((prev) => prev.filter((e) => e.id !== ep.id));
      addToast({
        type: "success",
        title: "Endpoint Removed",
        description: `Removed endpoint ${ep.url}`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        description: err?.message || String(err),
      });
    }
  };

  const handleClearEndpoints = async () => {
    if (!selectedTarget) return;
    try {
      if (isTauriApp) {
        await invoke("clear_endpoints", { targetId: selectedTarget.id });
      }
      setEndpoints([]);
      setIsClearingEndpointsModalOpen(false);
      addToast({
        type: "success",
        title: "Endpoints Cleared",
        description: `All discovered endpoints for target cleared.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Clear Failed",
        description: err?.message || String(err),
      });
    }
  };

  // --- SCAN HISTORY CRUD HANDLERS ---
  const handleDeleteScanHistory = async (scan: ScanResult) => {
    try {
      if (isTauriApp) {
        await invoke("delete_scan_history", { id: scan.scan_id });
      }
      setScanHistory((prev) => prev.filter((s) => s.scan_id !== scan.scan_id));
      addToast({
        type: "success",
        title: "Scan Record Removed",
        description: `Removed scan entry for ${scan.tool}`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        description: err?.message || String(err),
      });
    }
  };

  const handleClearScanHistory = async () => {
    try {
      if (isTauriApp) {
        await invoke("clear_scan_history");
      }
      setScanHistory([]);
      setIsClearingScanHistoryModalOpen(false);
      addToast({
        type: "success",
        title: "History Cleared",
        description: `Scan audit history cleared.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Clear Failed",
        description: err?.message || String(err),
      });
    }
  };

  async function handleRefreshAiStatus() {
    try {
      let isOnline = false;
      let installedList: string[] = [];
      try {
        const sysInfo = await invoke<OllamaSystemInfo>("get_ollama_system_info");
        setOllamaSystemInfo(sysInfo);
        isOnline = sysInfo.is_online;
        installedList = sysInfo.installed_models || [];
      } catch (e) {
        console.warn("get_ollama_system_info fallback to get_ai_status:", e);
        try {
          const [available, models] = await invoke<[boolean, string[]]>("get_ai_status");
          isOnline = available;
          installedList = models || [];
        } catch (err2) {
          console.warn("Could not query get_ai_status:", err2);
        }
      }

      setAiAvailable(isOnline);
      const sortedModels = sortAiModels(installedList);
      setAiModels(sortedModels);

      const resolved = resolveModelSlots(sortedModels);
      setQuickModel(resolved.quickModel);
      setDeepModel(resolved.deepModel);
      setActiveAiRole(resolved.activeRole);
      const activeModel = resolved.activeRole === "quick" ? resolved.quickModel : resolved.deepModel;
      setSelectedModel(activeModel);
    } catch (err: any) {
      console.error("Failed to refresh AI status:", err);
    }
  }

  function handleSelectAiRole(role: SecurityAiRole) {
    setActiveAiRole(role);
    let targetModel = quickModel;
    if (role === "deep") {
      targetModel = deepModel;
    } else if (role === "deepseek") {
      targetModel = "deepseek-chat";
    }
    setSelectedModel(targetModel);
    persistAiWorkspaceConfig({
      quick_model: quickModel,
      deep_model: deepModel,
      active_model_role: role,
    });
  }

  function handleAssignModelSlot(slot: "quick" | "deep", modelName: string) {
    if (slot === "quick") {
      setQuickModel(modelName);
      if (activeAiRole === "quick") {
        setSelectedModel(modelName);
      }
      persistAiWorkspaceConfig({
        quick_model: modelName,
        deep_model: deepModel,
        active_model_role: activeAiRole,
      });
    } else {
      setDeepModel(modelName);
      if (activeAiRole === "deep") {
        setSelectedModel(modelName);
      }
      persistAiWorkspaceConfig({
        quick_model: quickModel,
        deep_model: modelName,
        active_model_role: activeAiRole,
      });
    }
  }

  async function handlePullModel(modelName: string) {
    setPullingModel(modelName);
    setPullStatus(`Connecting to local Ollama and downloading '${modelName}'...`);
    setPullProgress({
      model: modelName,
      status: "Connecting...",
      completed: 0,
      total: 0,
      percentage: 0,
      done: false
    });
    try {
      const msg = await invoke<string>("pull_ai_model", { model: modelName });
      setPullStatus(msg);
      await handleRefreshAiStatus();
    } catch (err: any) {
      setPullStatus(`Download failed: ${err.toString()}`);
    } finally {
      setPullingModel("");
    }
  }

  function handleExplainWithAi(finding: Finding) {
    setSelectedFinding(finding);
    setActiveTab("mentor");
  }

  async function handleValidateFinding(findingId: string) {
    setValidatingFindingId(findingId);
    try {
      const rec = await invoke<ValidationRecord>("validate_finding", { findingId });
      setFindings((prev) =>
        prev.map((f) =>
          f.id === findingId
            ? {
                ...f,
                status: rec.status as FindingStatus,
                validation_status: rec.status,
                confidence: rec.confidence_score,
              }
            : f
        )
      );
      addToast({
        type: rec.status === "CONFIRMED" ? "warning" : "info",
        title: "Validation Complete",
        description: `Finding evaluated: ${rec.status} (${rec.confidence_score}% confidence)`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Validation Error",
        description: `Probe error: ${err.toString()}`,
      });
    } finally {
      setValidatingFindingId(null);
    }
  }

  async function handleValidateAllFindings() {
    setIsBatchValidating(true);
    try {
      const records = await invoke<ValidationRecord[]>("validate_all_findings", {
        targetId: selectedTarget?.id || "",
      });
      const updated = await invoke<Finding[]>("get_findings");
      setFindings(updated);
      addToast({
        type: "success",
        title: "Batch Validation Complete",
        description: `Evaluated ${records.length} findings against authorized target.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Batch Validation Error",
        description: err.toString(),
      });
    } finally {
      setIsBatchValidating(false);
    }
  }

  // High-Performance Inverted Index & O(1) LRU Cache for Findings Search
  const findingSearchCache = useMemo(() => new LRUCache<string, Set<string>>(60), []);
  const findingsIndex = useMemo(() => {
    const idx = new InvertedIndex<Finding>();
    if (!findings || !Array.isArray(findings)) return idx;
    for (let i = 0; i < findings.length; i++) {
      if (findings[i] && findings[i].id) {
        idx.addDocument(findings[i], ["title", "affected_asset", "source_tool", "cwe", "evidence", "remediation"]);
      }
    }
    return idx;
  }, [findings]);

  // Top-K High-Risk Vulnerability Triage (Binary Max-Heap)
  const topCriticalExposures = useMemo(() => {
    if (!findings || !Array.isArray(findings) || findings.length === 0) return [];
    const heap = new BinaryMaxHeap<Finding>();
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      if (!f || !f.id) continue;
      let weight = 0;
      switch (f.severity) {
        case "Critical": weight = 100; break;
        case "High": weight = 80; break;
        case "Medium": weight = 50; break;
        case "Low": weight = 20; break;
        default: weight = 5; break;
      }
      heap.push({ score: weight * 1000 + (f.confidence || 50), data: f });
    }
    return heap.getTopK(5);
  }, [findings]);

  // High-Performance Single-Pass DSA Filtering with Inverted Index & O(1) LRU Cache
  const { filteredFindings, critCount, highCount, medCount, lowCount, infoCount } = useMemo(() => {
    let crit = 0, high = 0, med = 0, low = 0, info = 0;
    const filtered: Finding[] = [];
    const q = findingSearchQuery.trim().toLowerCase();

    // Fast O(1) set retrieval from InvertedIndex / LRU Cache
    let matchingIds: Set<string> | null = null;
    if (q) {
      const cached = findingSearchCache.get(q);
      if (cached) {
        matchingIds = cached;
      } else {
        const matches = findingsIndex.search(q);
        matchingIds = new Set(matches.map((m) => m.id));
        findingSearchCache.put(q, matchingIds);
      }
    }

    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];

      // Tally severity counts in same single pass
      switch (f.severity) {
        case "Critical": crit++; break;
        case "High": high++; break;
        case "Medium": med++; break;
        case "Low": low++; break;
        case "Info": info++; break;
      }

      // Filter checks
      if (findingSeverityFilter !== "ALL" && f.severity !== findingSeverityFilter) continue;
      if (findingStatusFilter !== "ALL" && f.status !== findingStatusFilter) continue;
      if (matchingIds && !matchingIds.has(f.id)) continue;

      filtered.push(f);
    }

    return {
      filteredFindings: filtered,
      critCount: crit,
      highCount: high,
      medCount: med,
      lowCount: low,
      infoCount: info,
    };
  }, [findings, findingSeverityFilter, findingStatusFilter, findingSearchQuery, findingsIndex, findingSearchCache]);

  // Memoized Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    if (!crawlFilter.trim()) return endpoints;
    const q = crawlFilter.toLowerCase();
    return endpoints.filter((ep) =>
      ep.url.toLowerCase().includes(q) ||
      ep.method.toLowerCase().includes(q) ||
      ep.source.toLowerCase().includes(q)
    );
  }, [endpoints, crawlFilter]);

  // Memoized Ready Tools Count
  const readyToolsCount = useMemo(() => {
    return (
      tools.filter((t) => t.is_available).length +
      plugins.filter((p) => p.is_available).length
    );
  }, [tools, plugins]);

  // Column Sorting & Client-Side Pagination for Findings
  const SEVERITY_WEIGHTS: Record<string, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  };

  const sortedFindings = useMemo(() => {
    const list = [...filteredFindings];
    list.sort((a, b) => {
      let cmp = 0;
      if (findingSortField === "severity") {
        const wa = SEVERITY_WEIGHTS[a.severity] || 0;
        const wb = SEVERITY_WEIGHTS[b.severity] || 0;
        cmp = wa - wb;
      } else if (findingSortField === "validation_status") {
        const sa = a.validation_status || a.status || "";
        const sb = b.validation_status || b.status || "";
        cmp = sa.localeCompare(sb);
      } else if (findingSortField === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (findingSortField === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (findingSortField === "source_tool") {
        cmp = (a.source_tool || "").localeCompare(b.source_tool || "");
      } else if (findingSortField === "affected_asset") {
        cmp = (a.affected_asset || "").localeCompare(b.affected_asset || "");
      } else if (findingSortField === "cwe") {
        cmp = (a.cwe || "").localeCompare(b.cwe || "");
      }
      return findingSortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredFindings, findingSortField, findingSortDirection]);

  const totalFindingPages = Math.max(1, Math.ceil(sortedFindings.length / findingPageSize));

  const paginatedFindings = useMemo(() => {
    const start = (findingPage - 1) * findingPageSize;
    return sortedFindings.slice(start, start + findingPageSize);
  }, [sortedFindings, findingPage, findingPageSize]);

  useEffect(() => {
    setFindingPage(1);
  }, [findingSearchQuery, findingSeverityFilter, findingStatusFilter, findingSortField, findingSortDirection, findingPageSize]);

  // Centralized Emergency Stop Handler
  const handleEmergencyStop = () => {
    setIsScanning(false);
    setIsCrawling(false);
    setScanLogs((prev) => [...prev, "[!] Emergency Kill Triggered: All active scan jobs terminated."]);
    addToast({
      type: "warning",
      title: "Emergency Stop",
      description: "All active scan and crawl operations halted immediately (Ctrl+Shift+E).",
    });
  };

  // Centralized Global Keyboard Shortcuts Architecture
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const isInputFocused =
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.tagName === "SELECT" ||
          (document.activeElement as HTMLElement).isContentEditable);

      // Escape key closes modals, drawers, and overlays
      if (e.key === "Escape") {
        if (selectedFinding) {
          e.preventDefault();
          setSelectedFinding(null);
          return;
        }
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setIsShortcutsModalOpen(false);
          return;
        }
        if (isCommandPaletteOpen) {
          e.preventDefault();
          setIsCommandPaletteOpen(false);
          return;
        }
        if (isAuditLogModalOpen) {
          e.preventDefault();
          setIsAuditLogModalOpen(false);
          return;
        }
        if (editingTarget) {
          e.preventDefault();
          setEditingTarget(null);
          return;
        }
        if (editingFinding) {
          e.preventDefault();
          setEditingFinding(null);
          return;
        }
        if (isCreateFindingOpen) {
          e.preventDefault();
          setIsCreateFindingOpen(false);
          return;
        }
        if (drawers.aiMentorDrawer) {
          e.preventDefault();
          closeDrawer("aiMentorDrawer");
          return;
        }
        if (drawers.workspaceControls) {
          e.preventDefault();
          closeDrawer("workspaceControls");
          return;
        }
        if (drawers.findingsInspector) {
          e.preventDefault();
          closeDrawer("findingsInspector");
          return;
        }
      }

      // Help cheat sheet with '?' or 'Ctrl+/' (only when not typing in input)
      if (!isInputFocused && (e.key === "?" || (e.ctrlKey && e.key === "/"))) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // F1 or Ctrl+H: Open Help Center
      if (e.key === "F1" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("appsec:open-help"));
        return;
      }

      // Ctrl+K / Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+B / Cmd+B: Toggle Sidebar (Collapse / Expand)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // Ctrl+M: Toggle Quick AI Mentor drawer
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleDrawer("aiMentorDrawer");
        return;
      }

      // Ctrl+Shift+D: Toggle Workspace Controls drawer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDrawer("workspaceControls");
        return;
      }

      // Ctrl+Shift+E: Emergency Stop
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleEmergencyStop();
        return;
      }

      // Ctrl+Shift+S: Trigger Quick Scan on selected target
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (selectedTarget) {
          handleRunScan("nmap");
          addToast({
            type: "info",
            title: "Quick Scan Triggered",
            description: `Started network probe for ${selectedTarget.name} (Ctrl+Shift+S)`,
          });
        } else {
          addToast({
            type: "warning",
            title: "No Target Selected",
            description: "Please select an authorized target before scanning.",
          });
        }
        return;
      }

      // Ctrl+Shift+N: New Target (navigate to targets tab and focus input)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setActiveTab("targets");
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>("input[placeholder*='Acme Corp']");
          input?.focus();
        }, 50);
        return;
      }

      // Ctrl+Shift+P: Start Welcome Tour
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("appsec:start-tour", { detail: { trackId: "welcome" } }));
        return;
      }

      // Ctrl+Shift+T: Reopen last closed tab
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        if (closedTabs.length > 0) {
          const lastClosed = closedTabs[closedTabs.length - 1];
          reopenTab(lastClosed, (tab) => setActiveTab(tab as TabType));
          addToast({
            type: "info",
            title: "Tab Restored",
            description: `Restored ${lastClosed} tab.`,
          });
        }
        return;
      }

      // Ctrl+Shift+W: Close current tab (if closable)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTab !== "analytics") {
          closeTab(activeTab, activeTab, (tab) => setActiveTab(tab as TabType));
        }
        return;
      }

      // Ctrl+Shift+R: Reset workspace layout
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetWorkspaceLayout();
        addToast({
          type: "info",
          title: "Workspace Reset",
          description: "All panels, tabs, and layout preferences reset to default.",
        });
        return;
      }

      // Ctrl+,: Settings / Appearance
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setActiveTab("appearance");
        return;
      }

      // Ctrl+Alt+B: Burp Suite Integration
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setActiveTab("burp");
        return;
      }

      // Ctrl + 1-9, 0: Tab Navigation
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const keyMap: Record<string, TabType> = {
          "1": "analytics",
          "2": "targets",
          "3": "scanner",
          "4": "orchestration",
          "5": "crawler",
          "6": "tools",
          "7": "hostmobile",
          "8": "findings",
          "9": "mentor",
          "0": "academy",
        };
        if (keyMap[e.key]) {
          e.preventDefault();
          setActiveTab(keyMap[e.key]);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    isShortcutsModalOpen,
    isCommandPaletteOpen,
    drawers,
    isSidebarCollapsed,
    sidebarWidth,
    selectedTarget,
    closedTabs,
    activeTab,
  ]);

  return (
    <TourProvider onNavigateTab={(tab) => setActiveTab(tab)}>
      <div className="app-container">
        {/* Browser Warning Banner */}
        {!isTauriApp && (
          <div style={{ backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#facc15", padding: "6px 20px", fontSize: "0.8rem", textAlign: "center", borderBottom: "1px solid rgba(245, 158, 11, 0.4)" }}>
            ⚠️ You are viewing AppSec Nexus in a web browser preview. For native OS process execution, Nmap, and SQLite storage, switch to the <strong>appsec-nexus.exe</strong> desktop window.
          </div>
        )}

        {/* Top Header */}
        <header className="top-nav">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              className="brand"
              data-tour="navbar-brand"
              onClick={() => setActiveTab("analytics")}
              title="AppSec Nexus Security Platform"
            >
              <Shield className="brand-icon" size={22} />
              <span>AppSec Nexus</span>
              <span className="brand-subtitle" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Desktop Platform</span>
              <span
                className="brand-version"
                style={{
                  fontSize: "0.68rem",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  backgroundColor: "var(--accent-primary-subtle)",
                  color: "var(--accent-primary)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                v2.1 PRO
              </span>
            </div>
          </div>

          {/* Global Command Palette Trigger Bar */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="command-palette-btn"
            data-tour="command-palette-btn"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search size={14} color="var(--text-dim)" />
            <span className="search-placeholder" style={{ flex: 1, textAlign: "left" }}>Search actions, findings...</span>
            <kbd
              style={{
                fontSize: "0.68rem",
                padding: "2px 6px",
                borderRadius: "4px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-dim)",
              }}
            >
              Ctrl K
            </kbd>
          </button>

          {/* Right Status & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {selectedTarget && (
              <div className="top-nav-target" data-tour="target-scope-nav" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-dim)" }}>Target:</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedTarget.primary_url}
                </span>
                <ScopeBadge allowLocalLab={selectedTarget.scope?.allow_local_lab} />
              </div>
            )}

          {/* Global Background AI Activity Indicator */}
          {hasRunningTask && (
            <div
              onClick={() => setActiveTab("mentor")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "3px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(14, 165, 233, 0.15)",
                border: "1px solid rgba(14, 165, 233, 0.4)",
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(14, 165, 233, 0.2)",
              }}
              title="AI Mentor is generating a response in the background. Click to jump to conversation."
            >
              <Bot size={15} className="pulse" color="var(--accent-cyan)" />
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                AI Mentor Analyzing...
              </span>
              {activeTasks[0] && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelTask(activeTasks[0].id);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "1px",
                    display: "flex",
                    alignItems: "center",
                    color: "var(--text-dim)",
                  }}
                  title="Cancel background generation"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {recentlyCompletedTask && !hasRunningTask && (
            <div
              onClick={() => {
                setActiveTab("mentor");
                dismissNotification();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "3px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)",
              }}
              title="Answer ready! Click to jump to AI Mentor."
            >
              <Sparkles size={13} color="var(--accent-emerald)" />
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                Answer Ready!
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "1px",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--text-dim)",
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* AI Status Badge */}
          <div
            data-tour="ai-status-badge"
            onClick={() => setActiveTab("mentor")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              backgroundColor: !isAiEnabled
                ? "rgba(100, 116, 139, 0.15)"
                : aiAvailable
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(245, 158, 11, 0.12)",
              border: `1px solid ${
                !isAiEnabled
                  ? "var(--border-color)"
                  : aiAvailable
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(245, 158, 11, 0.3)"
              }`,
              cursor: "pointer",
            }}
            title={
              !isAiEnabled
                ? "AI Engine is turned OFF (Click to open AI Mentor)"
                : aiAvailable
                ? `Ollama Active: ${aiModels.length} models ready`
                : "Ollama engine offline"
            }
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: !isAiEnabled
                  ? "var(--text-dim)"
                  : aiAvailable
                  ? "var(--accent-emerald)"
                  : "var(--accent-amber)",
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: !isAiEnabled
                  ? "var(--text-dim)"
                  : aiAvailable
                  ? "var(--accent-emerald)"
                  : "var(--accent-amber)",
              }}
            >
              {!isAiEnabled ? "AI Paused" : aiAvailable ? `${aiModels.length} AI Models` : "AI Offline"}
            </span>
          </div>

          {/* Active Security Category Specialization Selector */}
          <div data-tour="category-selector" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CategorySelector
              activeCategory={activeCategory}
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
                addToast({
                  type: "info",
                  title: "Security Specialization Switched",
                  description: `Switched active intelligence to ${cat.toUpperCase()} security.`,
                });
              }}
              compact
            />
          </div>

          {/* Workspace Layout Preset Selector */}
          <div data-tour="workspace-presets-select" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <LayoutGrid size={14} color="var(--text-dim)" />
            <select
              value={workspacePreset}
              onChange={(e) => handleSelectPreset(e.target.value as WorkspacePreset)}
              style={{
                padding: "2px 8px",
                fontSize: "0.74rem",
                height: "26px",
                borderRadius: "4px",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
              title="Select Workspace Preset (Default, Compact, Analyst, Pentest, API, Learning)"
            >
              <option value="default">⚡ Default</option>
              <option value="compact">📐 Compact</option>
              <option value="analyst">🔬 Analyst</option>
              <option value="pentest">🛡️ Pentest</option>
              <option value="api">🌐 API Test</option>
              <option value="learning">🎓 Learning</option>
            </select>
          </div>

          {/* Quick Theme Toggle Button */}
          <button
            className="btn btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={() => {
              if (preferences.theme === "arctic") {
                setTheme("midnight");
                addToast({ type: "info", title: "Theme Switched", description: "Activated Midnight dark mode." });
              } else {
                setTheme("arctic");
                addToast({ type: "info", title: "Theme Switched", description: "Activated Arctic Light mode." });
              }
            }}
            title={`Toggle Theme (Current: ${preferences.theme})`}
          >
            {preferences.theme === "arctic" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Appearance Settings Tab Trigger */}
          <button
            className={`btn ${activeTab === "appearance" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "6px 10px" }}
            onClick={() => setActiveTab("appearance")}
            title="Appearance & Personalization"
          >
            <Palette size={15} />
          </button>

          {/* Audit Log Modal Trigger */}
          <button
            className="btn btn-secondary"
            style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem" }}
            onClick={() => setIsAuditLogModalOpen(true)}
            title="System Audit & Data Activity Log"
          >
            <History size={15} />
            <span className="hide-mobile">Audit Log</span>
          </button>


          {/* Keyboard Shortcuts Trigger Button */}
          <button
            className="btn btn-secondary"
            style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem" }}
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Keyboard Shortcuts Cheat Sheet (Press ? or Ctrl+/)"
          >
            <Keyboard size={15} />
            <span className="hide-mobile">Shortcuts</span>
          </button>

          {/* Global Help & Tour Dropdown */}
          <HeaderHelpMenu
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
          />

          {/* Emergency Stop Button */}
          <button
            className="btn btn-danger"
            style={{ padding: "6px 12px" }}
            onClick={handleEmergencyStop}
            title="Halt all background network probes and scans (Ctrl+Shift+E)"
          >
            Emergency Stop
          </button>
        </div>
      </header>

      {/* Workspace Controls & Tabs Strip */}
      <div data-tour="workspace-toolbar">
        <WorkspaceToolbar
          onOpenAiDrawer={() => openDrawer("aiMentorDrawer")}
          onOpenControlsDrawer={() => openDrawer("workspaceControls")}
        />
      </div>
      <div data-tour="workspace-tabs-strip">
        <WorkspaceTabs
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId as TabType)}
        />
      </div>

      {/* Main Body with Resizable Drag Handlers */}
      <div
        className="main-layout"
        onPointerMove={(e) => {
          handleSidebarPointerMove(e);
          handleDrawerPointerMove(e);
        }}
        onPointerUp={(e) => {
          handleSidebarPointerUp(e);
          handleDrawerPointerUp(e);
        }}
      >
        {/* Modern Categorized Navigation Sidebar with Resizable Handle */}
        <aside
          className={`sidebar ${preferences.sidebarMode === "compact" || sidebarWidth <= 80 ? "compact-mode" : ""}`}
          style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, position: "relative" }}
        >
          {/* Resizable Sidebar Drag Handle */}
          <div
            className={`sidebar-resizer ${isResizingSidebar ? "resizing" : ""}`}
            onPointerDown={handleSidebarPointerDown}
            onDoubleClick={handleToggleSidebar}
            title="Drag to resize sidebar width, double-click to collapse/expand (Ctrl+B)"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "6px",
              height: "100%",
              cursor: "col-resize",
              zIndex: 30,
              backgroundColor: isResizingSidebar ? "var(--accent-cyan)" : "transparent",
              transition: "background-color 0.15s ease",
            }}
          />
          {/* Group 1: Operations & Scope */}
          <div className="sidebar-section-title">Operations & Scope</div>
          <div
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
            title="Security Analytics & Posture"
          >
            <Activity size={18} color={activeTab === "analytics" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label">Security Analytics</span>
          </div>

          <div
            className={`nav-item ${activeTab === "targets" ? "active" : ""}`}
            onClick={() => setActiveTab("targets")}
            title="Target & Scope"
          >
            <TargetIcon size={18} />
            <span className="sidebar-label">Target & Scope</span>
          </div>

          {/* Group 2: Assessments & Execution */}
          <div className="sidebar-section-title">Assessments & Scans</div>
          <div
            className={`nav-item ${activeTab === "scanner" ? "active" : ""}`}
            onClick={() => setActiveTab("scanner")}
            title="Scan Console"
          >
            <Terminal size={18} />
            <span className="sidebar-label">Scan Console</span>
          </div>

          <div
            className={`nav-item ${activeTab === "orchestration" ? "active" : ""}`}
            onClick={() => setActiveTab("orchestration")}
            title="Universal Orchestration"
          >
            <Cpu size={18} color={activeTab === "orchestration" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label">Universal Orchestration</span>
          </div>

          <div
            className={`nav-item ${activeTab === "crawler" ? "active" : ""}`}
            onClick={() => setActiveTab("crawler")}
            title="Crawler & Discovered Endpoints"
          >
            <Compass size={18} />
            <span className="sidebar-label" style={{ flex: 1 }}>Crawler</span>
            {endpoints.length > 0 && (
              <span className="sidebar-badge" style={{ fontSize: "0.68rem", color: "var(--text-dim)", padding: "1px 6px", borderRadius: "10px", background: "var(--bg-card)" }}>
                {endpoints.length}
              </span>
            )}
          </div>

          {/* Group 3: Taxonomy & Methodology */}
          <div className="sidebar-section-title">Taxonomy & Playbooks</div>
          <div
            className={`nav-item ${activeTab === "categoryWorkflow" ? "active" : ""}`}
            onClick={() => setActiveTab("categoryWorkflow")}
            title="Category Intelligence & Assessment Engine"
          >
            <Layers size={18} color={activeTab === "categoryWorkflow" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label" style={{ flex: 1 }}>Category Intel</span>
          </div>

          <div
            className={`nav-item ${activeTab === "playbooks" ? "active" : ""}`}
            onClick={() => setActiveTab("playbooks")}
            title="Security Checklists & Assessment Playbooks"
          >
            <FileCheck size={18} color={activeTab === "playbooks" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label" style={{ flex: 1 }}>Playbooks</span>
          </div>

          <div
            className={`nav-item ${activeTab === "methodologies" ? "active" : ""}`}
            onClick={() => setActiveTab("methodologies")}
            title="Detection Methodologies & Transparency Rules"
          >
            <BookOpen size={18} color={activeTab === "methodologies" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label" style={{ flex: 1 }}>Methodologies</span>
          </div>

          {/* Group 4: Findings & Documentation */}
          <div className="sidebar-section-title">Findings & Reports</div>
          <div
            className={`nav-item ${activeTab === "findings" ? "active" : ""}`}
            onClick={() => setActiveTab("findings")}
            title="Vulnerability Findings"
          >
            <AlertTriangle size={18} />
            <span className="sidebar-label" style={{ flex: 1 }}>Findings</span>
            {findings.length > 0 && (
              <span className="sidebar-badge" style={{ fontSize: "0.68rem", color: "var(--accent-rose)", padding: "1px 6px", borderRadius: "10px", background: "rgba(244, 63, 94, 0.12)", fontWeight: 700 }}>
                {findings.length}
              </span>
            )}
          </div>

          <div
            className={`nav-item ${activeTab === "issues" ? "active" : ""}`}
            onClick={() => setActiveTab("issues")}
            title="Issue Documentation & Reports"
          >
            <ClipboardList size={18} />
            <span className="sidebar-label" style={{ flex: 1 }}>Issues & Reports</span>
          </div>

          <div
            className={`nav-item ${activeTab === "importer" ? "active" : ""}`}
            onClick={() => setActiveTab("importer")}
            title="Import External Reports"
          >
            <UploadCloud size={18} />
            <span className="sidebar-label">Import Reports</span>
          </div>

          {/* Group 5: Learning & Intelligence */}
          <div className="sidebar-section-title">Learning & AI</div>
          <div
            className={`nav-item ${activeTab === "mentor" ? "active" : ""}`}
            onClick={() => setActiveTab("mentor")}
            title="Local AI Security Mentor"
          >
            <Sparkles size={18} />
            <span className="sidebar-label">Local AI Mentor</span>
          </div>

          <div
            className={`nav-item ${activeTab === "academy" ? "active" : ""}`}
            onClick={() => setActiveTab("academy")}
            title="Cyber Academy Curriculum"
          >
            <GraduationCap size={18} />
            <span className="sidebar-label">Cyber Academy</span>
          </div>

          {/* Group 6: Tools & Integrations */}
          <div className="sidebar-section-title">Tools & Integrations</div>
          <div
            className={`nav-item ${activeTab === "tools" ? "active" : ""}`}
            onClick={() => setActiveTab("tools")}
            title="Tools & Universal Plugins"
          >
            <Layers size={18} />
            <span className="sidebar-label" style={{ flex: 1 }}>Tools & Plugins</span>
            <span className="sidebar-badge" style={{ fontSize: "0.68rem", color: "var(--accent-emerald)", padding: "1px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)" }}>
              {readyToolsCount}
            </span>
          </div>

          <div
            className={`nav-item ${activeTab === "terminal" ? "active" : ""}`}
            onClick={() => setActiveTab("terminal")}
            title="Multi-Terminal Orchestration & Tool Execution"
          >
            <Terminal size={18} color={activeTab === "terminal" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label">Multi-Terminal</span>
          </div>

          <div
            className={`nav-item ${activeTab === "burp" ? "active" : ""}`}
            onClick={() => setActiveTab("burp")}
            title="Burp Suite Local Integration"
          >
            <Radio size={18} color={activeTab === "burp" ? "var(--accent-orange, #f97316)" : undefined} />
            <span className="sidebar-label" style={{ flex: 1 }}>Burp Suite</span>
            <span className="sidebar-badge" style={{ fontSize: "0.68rem", color: "var(--accent-orange, #f97316)", padding: "1px 6px", borderRadius: "10px", background: "rgba(249, 115, 22, 0.12)", fontWeight: 700 }}>
              Proxy
            </span>
          </div>

          <div
            className={`nav-item ${activeTab === "hostmobile" ? "active" : ""}`}
            onClick={() => setActiveTab("hostmobile")}
            title="Host & Mobile Audit"
          >
            <Monitor size={18} color={activeTab === "hostmobile" ? "var(--accent-blue)" : undefined} />
            <span className="sidebar-label">Host & Mobile</span>
          </div>

          {/* Group 7: System & Audit */}
          <div className="sidebar-section-title">System & Audit</div>
          <div
            className={`nav-item ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
            title="Audit History"
          >
            <History size={18} />
            <span className="sidebar-label" style={{ flex: 1 }}>Audit History</span>
            {scanHistory.length > 0 && (
              <span className="sidebar-badge" style={{ fontSize: "0.68rem", color: "var(--text-dim)", padding: "1px 6px", borderRadius: "10px", background: "var(--bg-card)" }}>
                {scanHistory.length}
              </span>
            )}
          </div>

          <div
            className={`nav-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
            title="Appearance & Personalization"
          >
            <Palette size={18} color={activeTab === "appearance" ? "var(--accent-cyan)" : undefined} />
            <span className="sidebar-label">Appearance</span>
          </div>

          {/* Bottom Sidebar Collapse/Expand Toggle */}
          <div
            className="nav-item sidebar-collapse-btn"
            style={{
              marginTop: "auto",
              borderTop: "1px solid var(--border-color)",
              padding: "10px 12px",
              color: "var(--text-dim)",
              cursor: "pointer",
            }}
            onClick={handleToggleSidebar}
            title={preferences.sidebarMode === "compact" || sidebarWidth <= 80 ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          >
            <PanelLeft size={18} />
            <span className="sidebar-label">
              {preferences.sidebarMode === "compact" || sidebarWidth <= 80 ? "Expand" : "Collapse"}
            </span>
          </div>
        </aside>

        {/* Center Workspace */}
        <main className="workspace">
          {/* Contextual Navigation Breadcrumbs & Scope Bar */}
          <NavigationBreadcrumbs
            activeTab={activeTab}
            onNavigateTab={(tab) => setActiveTab(tab)}
            targets={targets}
            selectedTarget={selectedTarget}
            onSelectTarget={(target) => setSelectedTarget(target)}
            selectedFinding={activeFindingDetail || selectedFinding}
            onCloseFinding={() => {
              setActiveFindingDetail(null);
              setSelectedFinding(null);
            }}
          />

          {/* Global Scan Progress Banner (persists across all tabs) */}
          <ScanProgressIndicatorBanner onNavigateToConsole={() => setActiveTab("scanner")} />

          {/* TAB 0: SECURITY ANALYTICS */}
          {activeTab === "analytics" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <AnalyticsDashboard
                targets={targets}
                selectedTarget={selectedTarget}
                onSelectTarget={(t) => setSelectedTarget(t)}
                findings={findings}
                endpoints={endpoints}
                scanHistory={scanHistory}
                onNavigateTab={(tab, filterSeverity) => {
                  if (filterSeverity) {
                    setFindingSeverityFilter(filterSeverity);
                  }
                  setActiveTab(tab);
                }}
                onQuickScan={(toolId) => {
                  handleRunScan(toolId);
                }}
                isScanning={isScanning}
              />
            </Suspense>
          )}

          {/* TAB 1: TARGETS & SCOPE */}
          {activeTab === "targets" && (
            <div>
              <div className="card" data-tour="target-config-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    <TargetIcon size={20} color="var(--accent-cyan)" />
                    Configure Authorized Target
                  </h2>
                  <ContextualHelpButton
                    articleId="targets-scope"
                    tourTrackId="targets"
                    workflowId="first-security-scan"
                    title="Target & Scope Guidance"
                  />
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                  AppSec Nexus enforces strict scope validation. Any out-of-scope domain, redirect, or private IP will be blocked before any network request is transmitted.
                </p>

                <form onSubmit={handleCreateTarget} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                      Target Display Name
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. Acme Corp Staging API or OWASP Juice Shop Lab"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                      Target Address (Website URL, Domain, or Android .apk File Path)
                    </label>
                    <input
                      className="input-field"
                      placeholder="e.g. example.com, https://app.example.com, or C:\downloads\app.apk"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                    <input
                      type="checkbox"
                      id="labMode"
                      checked={allowLocalLab}
                      onChange={(e) => setAllowLocalLab(e.target.checked)}
                    />
                    <label htmlFor="labMode" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                      Enable Local Lab Mode (allows loopback 127.0.0.1 and private subnets for testing local docker apps)
                    </label>
                  </div>

                  {targetError && (
                    <div style={{ color: "var(--accent-rose)", fontSize: "0.85rem", marginTop: "4px" }}>
                      [Scope Guard Block] {targetError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", marginTop: "8px" }}>
                    Add & Lock Scope
                  </button>
                </form>
              </div>

              {/* Target List */}
              <div className="card" data-tour="target-list-table">
                <h3 className="card-title">Authorized Targets ({targets.length})</h3>
                {targets.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>No targets configured yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {targets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTarget(t)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setTargetContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            target: t,
                          });
                        }}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          backgroundColor: selectedTarget?.id === t.id ? "rgba(6, 182, 212, 0.12)" : "var(--bg-secondary)",
                          border: `1px solid ${selectedTarget?.id === t.id ? "var(--accent-cyan)" : "var(--border-color)"}`,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.primary_url}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {t.scope.allow_local_lab ? (
                            <span className="badge badge-lab">Lab Mode</span>
                          ) : (
                            <span className="badge badge-locked">Protected Scope</span>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTarget(t);
                            }}
                            title="Edit Target Configuration"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingTarget(t);
                            }}
                            title="Delete Target & Associated Data"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Right-click Context Menu for Targets */}
                {targetContextMenu && (
                  <ContextMenu
                    x={targetContextMenu.x}
                    y={targetContextMenu.y}
                    role={currentUserRole}
                    onClose={() => setTargetContextMenu(null)}
                    items={[
                      {
                        label: "Select as Active Target",
                        icon: <TargetIcon size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          setSelectedTarget(targetContextMenu.target);
                          addToast({
                            type: "info",
                            title: "Target Activated",
                            description: `Selected ${targetContextMenu.target.name} as active target.`,
                          });
                        },
                      },
                      {
                        label: "Copy Target URL",
                        icon: <Globe size={12} />,
                        action: () => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(targetContextMenu.target.primary_url);
                          }
                          addToast({
                            type: "info",
                            title: "URL Copied",
                            description: `Copied ${targetContextMenu.target.primary_url} to clipboard.`,
                          });
                        },
                      },
                      {
                        label: "Run Baseline Scan",
                        icon: <Play size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          setSelectedTarget(targetContextMenu.target);
                          setActiveTab("scanner");
                          handleRunScan("baseline");
                        },
                      },
                      {
                        label: "Crawl Endpoints",
                        icon: <Compass size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          setSelectedTarget(targetContextMenu.target);
                          setActiveTab("crawler");
                        },
                      },
                      {
                        label: "Edit Target",
                        icon: <Edit2 size={12} />,
                        requiresAdmin: true,
                        action: () => {
                          setEditingTarget(targetContextMenu.target);
                        },
                      },
                      {
                        label: "Delete Target",
                        icon: <Trash2 size={12} />,
                        requiresAdmin: true,
                        danger: true,
                        action: () => {
                          setDeletingTarget(targetContextMenu.target);
                        },
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB: UNIVERSAL TOOL & EXTENSION ORCHESTRATION */}
          {activeTab === "orchestration" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <OrchestrationHub
                targets={targets}
                selectedTargetId={selectedTarget?.id || (targets[0]?.id ?? "")}
                onSelectTarget={(id) => {
                  const found = targets.find((t) => t.id === id);
                  if (found) setSelectedTarget(found);
                }}
                onNavigateToFindings={() => setActiveTab("findings")}
              />
            </Suspense>
          )}

          {/* TAB 2: TOOL HUB */}
          {activeTab === "tools" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={20} color="var(--accent-cyan)" /> Tool Hub & Security Plugins
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                    Native orchestration engines and extensible sandbox plugins for targeted web security assessments.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ display: "flex", background: "var(--bg-secondary)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <button
                      className={`btn ${toolHubTab === "tools" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "6px" }}
                      onClick={() => setToolHubTab("tools")}
                    >
                      <Layers size={14} /> Core Tools ({tools.length})
                    </button>
                    <button
                      className={`btn ${toolHubTab === "plugins" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "6px" }}
                      onClick={() => setToolHubTab("plugins")}
                    >
                      <Puzzle size={14} /> Security Plugins ({plugins.length})
                    </button>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
                    disabled={isUpdatingFeeds}
                    onClick={handleSyncThreatFeeds}
                  >
                    <RefreshCw size={14} className={isUpdatingFeeds ? "spin" : ""} color="var(--accent-cyan)" />
                    {isUpdatingFeeds ? "Syncing Feeds..." : "Sync Threat Feeds & CVEs"}
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
                    onClick={() => {
                      loadPluginTemplate("python");
                      setShowPluginModal(true);
                    }}
                  >
                    <PlusCircle size={15} color="var(--accent-cyan)" /> Register Plugin
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
                    onClick={() => setShowIntegrationGuide(true)}
                  >
                    <BookOpen size={15} color="var(--accent-cyan)" /> Integration Guide & Help
                  </button>
                </div>
              </div>

              {/* THREAT INTELLIGENCE FEED BANNER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Radio size={16} color="var(--accent-cyan)" />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent-cyan)" }}>
                      Live Vulnerability Intelligence:
                    </span>{" "}
                    <span style={{ fontSize: "0.82rem", color: "var(--text-main)" }}>
                      10,000+ Nuclei Community Templates • {cisaKevCount}+ CISA Known Exploited Vulnerabilities (KEV) Catalog
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                  {feedLastUpdated ? `Last Synced: ${feedLastUpdated}` : "Auto-Sync: Ready"}
                </div>
              </div>

              {feedStatus && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    backgroundColor: feedStatus.includes("failed") ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: feedStatus.includes("failed") ? "var(--accent-red)" : "var(--accent-emerald)",
                    border: `1px solid ${feedStatus.includes("failed") ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                  }}
                >
                  {feedStatus}
                </div>
              )}

              {/* VIEW 1: CORE TOOLS */}
              {toolHubTab === "tools" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
                  {tools.map((tool) => (
                    <div key={tool.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{tool.name}</div>
                          <span
                            className={`badge ${tool.is_available ? "badge-locked" : "badge-critical"}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: tool.is_available ? "rgba(16, 185, 129, 0.15)" : undefined,
                              color: tool.is_available ? "var(--accent-emerald)" : undefined,
                              borderColor: tool.is_available ? "rgba(16, 185, 129, 0.4)" : undefined,
                            }}
                          >
                            {tool.is_available ? "✓ Installed & Ready" : "Missing Binary"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                          Category: {tool.category} • v{tool.version}
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>
                          {tool.description}
                        </p>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "monospace" }} title={tool.path}>
                          {tool.path.length > 32 ? "..." + tool.path.slice(-28) : tool.path}
                        </span>
                        {tool.id === "ollama" ? (
                          <button
                            className="btn btn-secondary"
                            onClick={() => setActiveTab("mentor")}
                            style={{ display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <Sparkles size={14} color="var(--accent-cyan)" /> Open AI Mentor
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            disabled={!tool.is_available || isScanning}
                            onClick={() => {
                              setActiveTab("scanner");
                              handleRunScan(tool.id);
                            }}
                          >
                            <Play size={14} /> Run Check
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* VIEW 2: SECURITY PLUGINS */}
              {toolHubTab === "plugins" && (
                <div>
                  {plugins.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                      <Puzzle size={40} color="var(--text-dim)" style={{ margin: "0 auto 12px" }} />
                      <h3>No Plugins Detected</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "480px", margin: "8px auto" }}>
                        Plugins live in <code>tools/plugins/&lt;plugin-id&gt;/manifest.json</code>. Click 'Register Plugin' above to add one.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
                      {plugins.map((plugin) => (
                        <div key={plugin.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Puzzle size={16} color="var(--accent-cyan)" /> {plugin.name}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                                  v{plugin.version} • By {plugin.publisher}
                                </div>
                              </div>
                              <span
                                className="badge badge-locked"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                                  color: "var(--accent-emerald)",
                                  borderColor: "rgba(16, 185, 129, 0.4)",
                                }}
                              >
                                ✓ Active Plugin
                              </span>
                            </div>

                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
                              {plugin.description}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                              <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                                Runtime: {plugin.runtime}
                              </span>
                              <span className="badge badge-info" style={{ fontSize: "0.72rem" }}>
                                Timeout: {plugin.timeout_seconds}s
                              </span>
                              {plugin.capabilities.map((cap) => (
                                <span key={cap} className="badge" style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.1)", color: "var(--accent-cyan)" }}>
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }} title={plugin.executable}>
                              {plugin.executable}
                            </span>
                            <button
                              className="btn btn-primary"
                              disabled={isScanning || !selectedTarget}
                              onClick={() => {
                                setActiveTab("scanner");
                                handleRunScan(plugin.id);
                              }}
                              style={{ display: "flex", alignItems: "center", gap: "6px" }}
                            >
                              <Play size={14} /> Run Plugin
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL: REGISTER NEW PLUGIN */}
              {showPluginModal && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="card"
                    style={{
                      width: "600px",
                      maxWidth: "92vw",
                      maxHeight: "90vh",
                      overflowY: "auto",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Puzzle size={18} color="var(--accent-cyan)" /> Integrate Local Tool / Plugin
                      </h3>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => {
                          setShowPluginModal(false);
                          setPluginRegisterStatus("");
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "12px" }}>
                      Easily hook any tool or script installed on your PC (e.g. <code>trivy</code>, <code>semgrep</code>, <code>gitleaks</code>, <code>tshark</code>, or custom scripts). AppSec Nexus automatically checks system PATH and runs them natively.
                    </p>

                    {/* MODE SWITCHER */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                      <button
                        className={`btn ${pluginModalMode === "form" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                        onClick={() => setPluginModalMode("form")}
                      >
                        Quick Tool Form (Recommended)
                      </button>
                      <button
                        className={`btn ${pluginModalMode === "json" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                        onClick={() => setPluginModalMode("json")}
                      >
                        Advanced JSON Editor
                      </button>
                    </div>

                    {pluginModalMode === "form" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                            Tool Name
                          </label>
                          <input
                            className="input-field"
                            placeholder="e.g. Trivy Container & SBOM Scanner"
                            value={customToolName}
                            onChange={(e) => setCustomToolName(e.target.value)}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.8fr", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                              Command Name or File Path
                            </label>
                            <input
                              className="input-field"
                              placeholder="e.g. trivy or C:\tools\scanner.exe or audit.py"
                              value={customToolExe}
                              onChange={(e) => setCustomToolExe(e.target.value)}
                            />
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                              Checks system PATH or file directory.
                            </span>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                              Runtime
                            </label>
                            <select
                              className="input-field"
                              value={customToolRuntime}
                              onChange={(e) => setCustomToolRuntime(e.target.value)}
                            >
                              <option value="standalone">Standalone / PATH CLI</option>
                              <option value="python3">Python 3 Script</option>
                              <option value="node">Node.js Script</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                              Timeout (s)
                            </label>
                            <input
                              type="number"
                              className="input-field"
                              value={customToolTimeout}
                              min={5}
                              max={300}
                              onChange={(e) => setCustomToolTimeout(parseInt(e.target.value) || 30)}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                            Description & Purpose
                          </label>
                          <input
                            className="input-field"
                            placeholder="e.g. Scans source code and containers for known CVEs"
                            value={customToolDesc}
                            onChange={(e) => setCustomToolDesc(e.target.value)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", alignSelf: "center" }}>Preset Templates:</span>
                          <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.75rem" }} onClick={() => loadPluginTemplate("python")}>
                            Python 3
                          </button>
                          <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.75rem" }} onClick={() => loadPluginTemplate("node")}>
                            Node.js
                          </button>
                          <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.75rem" }} onClick={() => loadPluginTemplate("binary")}>
                            Compiled Binary (.exe)
                          </button>
                        </div>

                        <textarea
                          rows={12}
                          value={newPluginJson}
                          onChange={(e) => setNewPluginJson(e.target.value)}
                          placeholder="Paste manifest.json content here..."
                          style={{
                            width: "100%",
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            backgroundColor: "#080c14",
                            color: "#a5f3fc",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            padding: "10px",
                            marginBottom: "12px",
                            resize: "vertical",
                          }}
                        />
                      </div>
                    )}

                    {pluginRegisterStatus && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          marginBottom: "12px",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          backgroundColor: pluginRegisterStatus.includes("Error") ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: pluginRegisterStatus.includes("Error") ? "var(--accent-red)" : "var(--accent-emerald)",
                          border: `1px solid ${pluginRegisterStatus.includes("Error") ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                        }}
                      >
                        {pluginRegisterStatus}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowPluginModal(false);
                          setPluginRegisterStatus("");
                        }}
                      >
                        Cancel
                      </button>
                      {pluginModalMode === "form" ? (
                        <button className="btn btn-primary" onClick={handleRegisterQuickTool}>
                          <CheckCircle2 size={14} /> Register & Enable Tool
                        </button>
                      ) : (
                        <button className="btn btn-primary" onClick={handleRegisterPlugin}>
                          <CheckCircle2 size={14} /> Validate & Register Manifest
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: UNIVERSAL TOOL INTEGRATION GUIDE */}
              {showIntegrationGuide && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(5px)",
                  }}
                >
                  <div
                    className="card"
                    style={{
                      width: "780px",
                      maxWidth: "94vw",
                      maxHeight: "88vh",
                      overflowY: "auto",
                      boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
                      border: "1px solid var(--border-color)",
                      padding: "24px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                        <BookOpen size={20} color="var(--accent-cyan)" /> Universal Tool Integration Playbook
                      </h3>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => setShowIntegrationGuide(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                      AppSec Nexus is designed as an open DevSecOps workbench. You can easily plug in any command-line scanner, network inspector, or custom script installed on your computer.
                    </p>

                    {/* GUIDE NAVIGATION TABS */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                      <button
                        className={`btn ${guideTab === "cli" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("cli")}
                      >
                        1. CLI & Standalone Tools
                      </button>
                      <button
                        className={`btn ${guideTab === "python" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("python")}
                      >
                        2. Python Security Scripts
                      </button>
                      <button
                        className={`btn ${guideTab === "burp_zap" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("burp_zap")}
                      >
                        3. Burp Suite & OWASP ZAP
                      </button>
                      <button
                        className={`btn ${guideTab === "wireshark" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("wireshark")}
                      >
                        4. Wireshark & PCAP Traffic
                      </button>
                      <button
                        className={`btn ${guideTab === "mobile" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                        onClick={() => setGuideTab("mobile")}
                      >
                        5. Android Mobile (APK)
                      </button>
                    </div>

                    {/* TAB CONTENT: 1. CLI TOOLS */}
                    {guideTab === "cli" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Integrating Standalone CLI Tools (Trivy, Semgrep, Gitleaks, etc.)
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Install the tool on your machine:</strong>
                            <div style={{ background: "#080c14", padding: "8px 12px", borderRadius: "6px", fontFamily: "monospace", marginTop: "4px" }}>
                              winget install AquaSecurity.Trivy<br />
                              pip install semgrep<br />
                              winget install gitleaks
                            </div>
                          </li>
                          <li>
                            <strong>Open the Tool Form:</strong> Click the <em>"Register Plugin"</em> button at the top of the Tool Hub.
                          </li>
                          <li>
                            <strong>Enter Tool Details:</strong>
                            <ul style={{ paddingLeft: "16px", marginTop: "4px" }}>
                              <li><strong>Tool Name:</strong> e.g. <code>Trivy Vulnerability Scanner</code></li>
                              <li><strong>Command Name:</strong> Enter the command name (e.g. <code>trivy</code>) or full file path (e.g. <code>C:\tools\scanner.exe</code>).</li>
                              <li><strong>Runtime:</strong> Select <code>Standalone / PATH CLI</code>.</li>
                            </ul>
                          </li>
                          <li>
                            <strong>Run the Scan:</strong> Select your target in the Scan Console and click <strong>Run Plugin</strong>. AppSec Nexus executes the command, streams console output live, and automatically parses any CVE or security alert keywords!
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* TAB CONTENT: 2. PYTHON SCRIPTS */}
                    {guideTab === "python" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Writing Custom Python Security Auditors
                        </h4>
                        <p style={{ color: "var(--text-muted)", marginBottom: "8px" }}>
                          Python plugins run using your local Python 3 installation. They receive the target address as the first argument (<code>sys.argv[1]</code>).
                        </p>
                        <div style={{ background: "#080c14", padding: "10px 14px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", overflowX: "auto" }}>
                          <span style={{ color: "var(--accent-cyan)" }}># sample_audit.py</span><br />
                          import sys, json, urllib.request<br /><br />
                          target = sys.argv[1]<br />
                          print(json.dumps(&#123;<br />
                          &nbsp;&nbsp;"target": target,<br />
                          &nbsp;&nbsp;"findings": [&#123;<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"title": "Custom Security Check Passed",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"severity": "Info",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"summary": "Audited target headers successfully.",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"evidence": "Response status 200 OK",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"cwe": "CWE-200",<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;"remediation": "No remediation required."<br />
                          &nbsp;&nbsp;&#125;],<br />
                          &nbsp;&nbsp;"logs": ["Audit complete!"]<br />
                          &#125;, indent=2))
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: 3. BURP SUITE & ZAP */}
                    {guideTab === "burp_zap" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Burp Suite & OWASP ZAP Ingestion & Proxy Chaining
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Upstream Proxy Inspection:</strong> Route browsers or testing scripts through Burp Suite at <code>http://127.0.0.1:8080</code> to view and intercept live HTTP history.
                          </li>
                          <li>
                            <strong>Export Findings from Burp Suite:</strong> In Burp, go to <em>Target &gt; Site map</em>, right-click on your target or issues list, and select <em>Export issues as XML</em>.
                          </li>
                          <li>
                            <strong>Export Findings from OWASP ZAP:</strong> In ZAP, select <em>Report &gt; Generate Report</em> and choose <em>JSON</em> format.
                          </li>
                          <li>
                            <strong>1-Click Import in AppSec Nexus:</strong> Navigate to the <strong>Import Reports</strong> tab, select your format, paste the content, and click <strong>Parse & Import Findings</strong>. All vulnerabilities are automatically ingested and paired with the local **Ollama AI Remediation** engine!
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* TAB CONTENT: 4. WIRESHARK & PCAP */}
                    {guideTab === "wireshark" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Wireshark & Network Packet Inspection
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Capture Network Packets:</strong> Use Wireshark or <code>tcpdump</code> to record network traffic, then save the capture as a <code>.pcap</code> or <code>.pcapng</code> file.
                          </li>
                          <li>
                            <strong>Configure Target in AppSec Nexus:</strong> In <em>Configure Authorized Target</em>, enter the full path to your capture file (e.g. <code>C:\captures\network_traffic.pcap</code>).
                          </li>
                          <li>
                            <strong>Execute PCAP Auditor:</strong> Select the <strong>Wireshark PCAP & Network Traffic Auditor</strong> plugin and click Run.
                          </li>
                          <li>
                            <strong>Automatic Leak Detection:</strong> The auditor flags unencrypted HTTP Basic Auth credentials, FTP/Telnet plaintext passwords, deprecated SSL 3.0 / TLS 1.0 sessions, and open cleartext ports.
                          </li>
                        </ol>
                      </div>
                    )}

                    {/* TAB CONTENT: 5. MOBILE SECURITY */}
                    {guideTab === "mobile" && (
                      <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)" }}>
                        <h4 style={{ fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                          Android APK Static Security Auditing
                        </h4>
                        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <li>
                            <strong>Add Target:</strong> In <em>Configure Authorized Target</em>, set the Target Address to the local <code>.apk</code> path (e.g. <code>C:\downloads\my_app.apk</code>).
                          </li>
                          <li>
                            <strong>Run Android APK Auditor:</strong> Select <code>android-apk-auditor</code> and start the audit.
                          </li>
                          <li>
                            <strong>Security Coverage:</strong> Automatically inspects AndroidManifest.xml flags (<code>debuggable</code>, <code>allowBackup</code>, <code>usesCleartextTraffic</code>), flags high-risk permissions (SMS, microphone, GPS), detects exported components (CWE-926), and extracts hardcoded API keys and tokens from <code>classes.dex</code> bytecode.
                          </li>
                        </ol>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                        Documentation file also saved at <code>docs/TOOL_INTEGRATION_GUIDE.md</code>
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowIntegrationGuide(false)}
                        >
                          Close Guide
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setShowIntegrationGuide(false);
                            setShowPluginModal(true);
                          }}
                        >
                          <PlusCircle size={14} /> Open Tool Registration
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CRAWLER & ENDPOINTS */}
          {activeTab === "crawler" && (
            <div>
              <div className="card" data-tour="crawler-controls-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h2 className="card-title" style={{ margin: 0 }}>
                        <Compass size={20} color="var(--accent-cyan)" />
                        Bounded Low-Impact Crawler & Endpoint Discovery
                      </h2>
                      <ContextualHelpButton
                        articleId="recon-crawler"
                        tourTrackId="recon"
                        title="Crawler & Recon Guidance"
                      />
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                      Safe HTML link discovery, form action harvesting, and sensitive path auditing (.git, .env, robots.txt, sitemaps).
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-dim)" }}>Depth:</span>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={crawlDepth}
                        onChange={(e) => setCrawlDepth(parseInt(e.target.value) || 2)}
                        style={{ width: "45px", padding: "4px 6px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-dim)" }}>Max Pages:</span>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={crawlMaxPages}
                        onChange={(e) => setCrawlMaxPages(parseInt(e.target.value) || 25)}
                        style={{ width: "55px", padding: "4px 6px", background: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={isCrawling || !selectedTarget}
                      onClick={handleRunCrawler}
                    >
                      <Play size={14} /> {isCrawling ? "Crawling Target..." : "Start Discovery"}
                    </button>
                    {selectedTarget && (
                      <button className="btn btn-secondary" onClick={() => loadEndpoints(selectedTarget.id)}>
                        <RotateCcw size={14} /> Refresh
                      </button>
                    )}
                    {selectedTarget && endpoints.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setIsClearingEndpointsModalOpen(true)}
                        title="Clear all discovered endpoints for this target"
                      >
                        <Trash2 size={14} /> Clear Endpoints
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter box */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "10px", top: "11px" }} />
                    <input
                      className="input-field"
                      placeholder="Filter discovered endpoints by path, method, or source..."
                      value={crawlFilter}
                      onChange={(e) => setCrawlFilter(e.target.value)}
                      style={{ paddingLeft: "32px", height: "36px", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                {endpoints.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", padding: "16px 0" }}>
                    No endpoints discovered yet. Click 'Start Discovery' above to crawl {selectedTarget?.primary_url || "target"}.
                  </p>
                ) : (
                  <div className="table-responsive" data-tour="discovered-endpoints-table">
                    <table className="data-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Discovered URL</th>
                        <th>Source</th>
                        <th>Content-Type</th>
                        <th>Discovered At</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEndpoints.map((ep) => (
                        <tr key={ep.id}>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                color: ep.method === "POST" ? "var(--accent-amber)" : "var(--accent-cyan)",
                              }}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                ep.status_code === 200
                                  ? "badge-locked"
                                  : ep.status_code >= 400
                                  ? "badge-critical"
                                  : "badge-info"
                              }`}
                            >
                              {ep.status_code || "FORM"}
                            </span>
                          </td>
                          <td style={{ maxWidth: "380px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <a
                              href={ep.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "var(--text-main)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              {ep.url} <ExternalLink size={11} color="var(--text-dim)" />
                            </a>
                          </td>
                          <td>
                            <span className="badge badge-info">{ep.source}</span>
                          </td>
                          <td style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>
                            {ep.content_type || "N/A"}
                          </td>
                          <td style={{ color: "var(--text-dim)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                            {ep.discovered_at.slice(11, 19)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: "3px 7px", fontSize: "0.72rem", color: "var(--accent-rose)" }}
                              onClick={() => handleDeleteEndpoint(ep)}
                              title="Delete endpoint record"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          )}

          {/* TAB 4: SCAN CONSOLE */}
          {activeTab === "scanner" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 className="card-title" style={{ margin: 0 }}>
                      <Terminal size={18} color="var(--accent-cyan)" /> Live Scan Terminal ({activeTool})
                    </h3>
                    <ContextualHelpButton
                      articleId="scan-console"
                      tourTrackId="scanner"
                      workflowId="first-security-scan"
                      title="Scan Console Guidance"
                    />
                  </div>
                  <div data-tour="scan-execution-buttons" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("baseline")}
                    >
                      Baseline Scan
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("httpx")}
                    >
                      httpx Probe
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("nuclei")}
                    >
                      Nuclei Audit
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={isScanning}
                      onClick={() => handleRunScan("nmap")}
                    >
                      Nmap Scan
                    </button>

                    {plugins.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "4px" }}>
                        <select
                          value={selectedPluginToRun}
                          onChange={(e) => setSelectedPluginToRun(e.target.value)}
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.82rem",
                            background: "var(--bg-secondary)",
                            color: "var(--accent-cyan)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                          }}
                        >
                          {plugins.map((p) => (
                            <option key={p.id} value={p.id}>
                              Plugin: {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-primary"
                          disabled={isScanning || !selectedPluginToRun}
                          onClick={() => handleRunScan(selectedPluginToRun)}
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <Play size={13} /> Run Plugin
                        </button>
                      </div>
                    )}

                    <button
                      className="btn btn-secondary"
                      onClick={() => setScanLogs([])}
                    >
                      Clear
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab("terminal")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--accent-cyan)" }}
                      title="Open dedicated Multi-Terminal workspace with multiple sessions and split panes"
                    >
                      <Terminal size={13} />
                      <span>Multi-Terminal Workspace</span>
                    </button>
                  </div>
                </div>

                <div className="console-box" data-tour="scan-terminal-box" style={{ height: "450px" }}>
                  {scanLogs.length === 0 ? (
                    <div style={{ color: "var(--text-dim)" }}>
                      // Terminal ready. Select an authorized target and click any scan button above.
                    </div>
                  ) : (
                    scanLogs.map((log, i) => (
                      <div key={i} style={{ marginBottom: "3px" }}>
                        <span style={{ color: "var(--text-dim)", marginRight: "8px" }}>[{i + 1}]</span>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MULTI-TERMINAL WORKSPACE */}
          {activeTab === "terminal" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <MultiTerminalWorkspace
                targets={targets}
                selectedTargetId={selectedTarget?.id || null}
                onSelectTargetId={(id) => {
                  const target = targets.find((t) => t.id === id);
                  if (target) setSelectedTarget(target);
                }}
                onFindingsDiscovered={(newFindings) => {
                  setFindings((prev) => [...prev, ...newFindings]);
                }}
                onEndpointsDiscovered={(newEndpoints) => {
                  setEndpoints((prev) => [...prev, ...newEndpoints]);
                }}
              />
            </Suspense>
          )}

          {/* TAB 5: UNIFIED FINDINGS */}
          {activeTab === "findings" && (
            activeFindingDetail ? (
              <Suspense fallback={<TabLoadingSkeleton />}>
                <VulnerabilityDetailPage
                  finding={activeFindingDetail}
                  onBack={() => setActiveFindingDetail(null)}
                  onOpenMethodology={(methodologyId: string) => {
                    setActiveMethodologyId(methodologyId);
                    setActiveTab("methodologies");
                  }}
                  onOpenAiMentor={(prompt: string) => {
                    setExternalMentorPrompt(prompt);
                    setActiveTab("mentor");
                  }}
                  onFindingUpdated={(updated: Finding) => {
                    setActiveFindingDetail(updated);
                    if (selectedFinding?.id === updated.id) {
                      setSelectedFinding(updated);
                    }
                    setFindings((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
                  }}
                />
              </Suspense>
            ) : (
            <div>
              {/* Stat Cards */}
              <div className="stat-grid" data-tour="findings-stat-grid">
                <div className="stat-card" style={{ borderLeft: "4px solid var(--accent-rose)" }}>
                  <span className="stat-label">Critical</span>
                  <span className="stat-value" style={{ color: "var(--accent-rose)" }}>{critCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #fb923c" }}>
                  <span className="stat-label">High</span>
                  <span className="stat-value" style={{ color: "#fb923c" }}>{highCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #facc15" }}>
                  <span className="stat-label">Medium</span>
                  <span className="stat-value" style={{ color: "#facc15" }}>{medCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #60a5fa" }}>
                  <span className="stat-label">Low</span>
                  <span className="stat-value" style={{ color: "#60a5fa" }}>{lowCount}</span>
                </div>
                <div className="stat-card" style={{ borderLeft: "4px solid #94a3b8" }}>
                  <span className="stat-label">Info</span>
                  <span className="stat-value" style={{ color: "#94a3b8" }}>{infoCount}</span>
                </div>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h2 className="card-title" style={{ margin: 0 }}>
                        <AlertTriangle size={20} color="var(--accent-amber)" />
                        Unified Findings & Deduplication Engine ({findings.length})
                      </h2>
                      <ContextualHelpButton
                        articleId="findings-triage"
                        tourTrackId="findings"
                        workflowId="validate-false-positives"
                        title="Findings & Triage Guidance"
                      />
                    </div>
                    {reportStatus && (
                      <div style={{ color: "var(--accent-emerald)", fontSize: "0.8rem", marginTop: "4px" }}>
                        ✓ {reportStatus}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsCreateFindingOpen(true)}
                      title="Record manual observation or custom vulnerability"
                    >
                      <Plus size={14} /> New Finding
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportReport}
                      disabled={findings.length === 0}
                    >
                      <Download size={14} /> Export HTML
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleExportJson}
                      disabled={findings.length === 0}
                    >
                      <FileCode size={14} /> Export JSON
                    </button>
                    <button className="btn btn-secondary" onClick={loadInitialData}>
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                {/* DSA Binary Max-Heap Top-K Prioritized Exposures Strip */}
                {topCriticalExposures.length > 0 && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.05)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-rose)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <ShieldAlert size={14} />
                        Priority Triage Matrix (Binary Max-Heap Top-{topCriticalExposures.length})
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        O(K log N) Extraction
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {topCriticalExposures.filter((exp): exp is Finding => Boolean(exp && exp.id)).map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => {
                            setActiveFindingDetail(exp);
                            setSelectedFinding(exp);
                          }}
                          style={{
                            background: "var(--bg-primary)",
                            border: `1px solid ${exp.severity === "Critical" ? "rgba(239, 68, 68, 0.4)" : "rgba(249, 115, 22, 0.4)"}`,
                            borderRadius: "6px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                          className="hover-card"
                          title={`${exp.severity} | ${exp.affected_asset || "No asset"}`}
                        >
                          <span
                            className={`badge badge-${exp.severity.toLowerCase()}`}
                            style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                          >
                            {exp.severity}
                          </span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-main)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {exp.title}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", background: "var(--bg-secondary)", padding: "1px 5px", borderRadius: "4px" }}>
                            {exp.confidence ? `${exp.confidence}%` : exp.source_tool || "Triaged"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter and Search Bar */}
                <div className="filter-bar">
                  <div style={{ position: "relative", minWidth: "220px", flex: 1 }}>
                    <Search size={14} color="var(--text-dim)" style={{ position: "absolute", left: "10px", top: "11px" }} />
                    <input
                      className="input-field"
                      placeholder="Search title, asset, tool, CWE..."
                      value={findingSearchQuery}
                      onChange={(e) => setFindingSearchQuery(e.target.value)}
                      style={{ paddingLeft: "32px", height: "36px", minHeight: "36px", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Severity:</span>
                    {["ALL", "Critical", "High", "Medium", "Low", "Info"].map((sev) => (
                      <button
                        key={sev}
                        className={`filter-chip ${findingSeverityFilter === sev ? "active" : ""}`}
                        onClick={() => setFindingSeverityFilter(sev)}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Status:</span>
                      <select
                        value={findingStatusFilter}
                        onChange={(e) => setFindingStatusFilter(e.target.value)}
                        style={{
                          background: "var(--bg-primary)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          padding: "5px 8px",
                          fontSize: "0.78rem",
                        }}
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="NeedsValidation">Needs Validation</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="LikelyTruePositive">Likely True Positive</option>
                        <option value="NeedsReview">Needs Review</option>
                        <option value="Unconfirmed">Unconfirmed</option>
                        <option value="LikelyFalsePositive">Likely False Positive</option>
                        <option value="ValidationFailed">Validation Failed</option>
                        <option value="NotApplicable">Not Applicable</option>
                        <option value="New">New</option>
                        <option value="AcceptedRisk">Accepted Risk</option>
                        <option value="Fixed">Fixed</option>
                      </select>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: "5px" }}
                      disabled={isBatchValidating || findings.length === 0}
                      onClick={handleValidateAllFindings}
                      title="Run deterministic non-destructive validation probes across findings"
                    >
                      {isBatchValidating ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={13} color="var(--accent-emerald)" />
                      )}
                      <span>{isBatchValidating ? "Validating All..." : "Validate All Findings"}</span>
                    </button>

                    <div style={{ display: "flex", gap: "2px", background: "var(--bg-primary)", padding: "2px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <button
                        type="button"
                        className={`btn ${findingViewMode === "table" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "4px 8px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                        onClick={() => setFindingViewMode("table")}
                        title="Display findings in table view"
                      >
                        <List size={13} />
                        <span>Table</span>
                      </button>
                      <button
                        type="button"
                        className={`btn ${findingViewMode === "cards" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "4px 8px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                        onClick={() => setFindingViewMode("cards")}
                        title="Display findings in card grid view"
                      >
                        <LayoutGrid size={13} />
                        <span>Cards</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Multi-Select Bulk Actions Bar */}
                {selectedFindingIds.size > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "rgba(6, 182, 212, 0.12)",
                      border: "1px solid var(--accent-cyan)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      marginBottom: "12px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {selectedFindingIds.size} Selected
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                        onClick={() => setSelectedFindingIds(new Set())}
                      >
                        Clear Selection
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Bulk Status:</span>
                        <select
                          value={bulkStatusTarget}
                          onChange={(e) => setBulkStatusTarget(e.target.value as FindingStatus)}
                          style={{
                            background: "var(--bg-secondary)",
                            color: "var(--text-main)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            padding: "3px 8px",
                            fontSize: "0.75rem",
                          }}
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Fixed">Fixed</option>
                          <option value="AcceptedRisk">Accepted Risk</option>
                          <option value="FalsePositive">False Positive</option>
                          <option value="NeedsReview">Needs Review</option>
                          <option value="NeedsValidation">Needs Validation</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={handleApplyBulkStatus}
                        >
                          Apply Status
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                        onClick={handleExportSelectedFindingsJson}
                        title="Export selected findings as JSON"
                      >
                        <Download size={12} /> Export Selected
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                        onClick={() => setIsBulkDeleteModalOpen(true)}
                        title="Delete selected findings"
                      >
                        <Trash2 size={12} /> Delete Selected
                      </button>
                    </div>
                  </div>
                )}

                {isFindingsLoading ? (
                  <FindingsTableSkeleton rows={6} />
                ) : findings.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No findings yet. Run a baseline or tool scan to discover security insights.
                  </p>
                ) : filteredFindings.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No findings matching your filter criteria.
                  </p>
                ) : (
                  <>
                    {findingViewMode === "table" ? (
                      <div className="table-responsive" data-tour="findings-data-table">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ width: "36px" }}>
                                <button
                                  type="button"
                                  onClick={handleToggleSelectAll}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-cyan)", display: "flex", alignItems: "center", padding: 0 }}
                                  title="Select all on this page"
                                >
                                  {paginatedFindings.length > 0 && paginatedFindings.every((f) => selectedFindingIds.has(f.id)) ? (
                                    <CheckSquare size={16} />
                                  ) : (
                                    <Square size={16} />
                                  )}
                                </button>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "severity") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("severity");
                                    setFindingSortDirection("desc");
                                  }
                                }}
                                title="Sort by Severity"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>Severity</span>
                                  {findingSortField === "severity" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "title") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("title");
                                    setFindingSortDirection("asc");
                                  }
                                }}
                                title="Sort by Vulnerability Title"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>Vulnerability</span>
                                  {findingSortField === "title" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "validation_status") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("validation_status");
                                    setFindingSortDirection("asc");
                                  }
                                }}
                                title="Sort by Validation State"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>Validation State</span>
                                  {findingSortField === "validation_status" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "status") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("status");
                                    setFindingSortDirection("asc");
                                  }
                                }}
                                title="Sort by Status"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>Status</span>
                                  {findingSortField === "status" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "source_tool") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("source_tool");
                                    setFindingSortDirection("asc");
                                  }
                                }}
                                title="Sort by Source Tool"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>Source Tool</span>
                                  {findingSortField === "source_tool" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "affected_asset") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("affected_asset");
                                    setFindingSortDirection("asc");
                                  }
                                }}
                                title="Sort by Affected Asset"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>Affected Asset</span>
                                  {findingSortField === "affected_asset" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th
                                style={{ cursor: "pointer", userSelect: "none" }}
                                onClick={() => {
                                  if (findingSortField === "cwe") {
                                    setFindingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                                  } else {
                                    setFindingSortField("cwe");
                                    setFindingSortDirection("asc");
                                  }
                                }}
                                title="Sort by CWE"
                              >
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <span>CWE</span>
                                  {findingSortField === "cwe" ? (
                                    findingSortDirection === "asc" ? <ArrowUp size={12} color="var(--accent-cyan)" /> : <ArrowDown size={12} color="var(--accent-cyan)" />
                                  ) : (
                                    <ArrowUpDown size={12} color="var(--text-dim)" opacity={0.5} />
                                  )}
                                </div>
                              </th>
                              <th style={{ textAlign: "right" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedFindings.map((f) => (
                              <React.Fragment key={f.id}>
                                <tr
                                  onClick={() => {
                                    setActiveFindingDetail(f);
                                    setSelectedFinding(f);
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setFindingContextMenu({
                                      x: e.clientX,
                                      y: e.clientY,
                                      finding: f,
                                    });
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <td onClick={(e) => e.stopPropagation()} style={{ width: "36px" }}>
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleSelectFinding(f.id, e)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: selectedFindingIds.has(f.id) ? "var(--accent-cyan)" : "var(--text-dim)", display: "flex", alignItems: "center", padding: 0 }}
                                      title={selectedFindingIds.has(f.id) ? "Deselect finding" : "Select finding"}
                                    >
                                      {selectedFindingIds.has(f.id) ? (
                                        <CheckSquare size={16} />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  </td>
                                  <td>
                                    <SeverityBadge severity={f.severity} size="sm" />
                                  </td>
                                  <td style={{ fontWeight: 600 }}>{f.title}</td>
                                  <td>
                                    <ValidationBadge
                                      status={f.validation_status || f.status}
                                      confidence={f.confidence}
                                      size="sm"
                                    />
                                  </td>
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <StatusBadge status={f.status} size="sm" />
                                      <select
                                        value={f.status}
                                        onChange={(e) => handleUpdateFindingStatus(f.id, e.target.value as FindingStatus)}
                                        style={{
                                          background: "var(--bg-secondary)",
                                          color: "var(--text-main)",
                                          border: "1px solid var(--border-color)",
                                          borderRadius: "4px",
                                          padding: "2px 5px",
                                          fontSize: "0.72rem",
                                        }}
                                      >
                                        <option value="NeedsValidation">Needs Validation</option>
                                        <option value="Confirmed">Confirmed</option>
                                        <option value="LikelyTruePositive">Likely True Positive</option>
                                        <option value="NeedsReview">Needs Review</option>
                                        <option value="Unconfirmed">Unconfirmed</option>
                                        <option value="LikelyFalsePositive">Likely False Positive</option>
                                        <option value="ValidationFailed">Validation Failed</option>
                                        <option value="NotApplicable">Not Applicable</option>
                                        <option value="New">New</option>
                                        <option value="AcceptedRisk">Accepted Risk</option>
                                        <option value="Fixed">Fixed</option>
                                        <option value="FalsePositive">False Positive</option>
                                      </select>
                                    </div>
                                  </td>
                                  <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{f.source_tool}</td>
                                  <td style={{ color: "var(--text-dim)", fontSize: "0.8rem", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {f.affected_asset}
                                  </td>
                                  <td>
                                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
                                      {f.cwe || "N/A"}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                                      {/* Primary Expandable Details Accordion Toggle */}
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{
                                          padding: "3px 8px",
                                          fontSize: "0.7rem",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "3px",
                                          borderColor: expandedFindingIds.has(f.id) ? "var(--accent-cyan)" : "var(--border-color)",
                                          background: expandedFindingIds.has(f.id) ? "var(--accent-primary-subtle)" : undefined,
                                          color: expandedFindingIds.has(f.id) ? "var(--accent-cyan)" : undefined,
                                          fontWeight: 600,
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpandFinding(f.id);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleExpandFinding(f.id);
                                          }
                                        }}
                                        aria-controls={`details-${f.id}`}
                                        aria-expanded={expandedFindingIds.has(f.id)}
                                        title={expandedFindingIds.has(f.id) ? "Hide detection details" : "Show detection details directly inside this row"}
                                      >
                                        {expandedFindingIds.has(f.id) ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                        <span>{expandedFindingIds.has(f.id) ? "Hide Details" : "View Details"}</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px", borderColor: "var(--accent-cyan)" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveFindingDetail(f);
                                          setSelectedFinding(f);
                                        }}
                                        title="Inspect Full Vulnerability Details, Beginner Guide & Scan Transparency"
                                      >
                                        <Eye size={10} color="var(--accent-cyan)" />
                                        <span>Inspect</span>
                                      </button>

                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                        disabled={validatingFindingId === f.id}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await handleValidateFinding(f.id);
                                        }}
                                        title="Run independent non-destructive validation probe"
                                      >
                                        {validatingFindingId === f.id ? (
                                          <Loader2 size={10} className="animate-spin" />
                                        ) : (
                                          <ShieldCheck size={10} color="var(--accent-emerald)" />
                                        )}
                                        <span>Validate</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingFinding(f);
                                        }}
                                        title="Edit Finding Record"
                                      >
                                        <Edit2 size={10} />
                                        <span>Edit</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingFinding(f);
                                        }}
                                        title="Delete Finding"
                                      >
                                        <Trash2 size={10} />
                                        <span>Del</span>
                                      </button>

                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExplainWithAi(f);
                                        }}
                                        title="Open in AI Mentor Chat"
                                      >
                                        <Sparkles size={10} /> AI
                                      </button>

                                      <button
                                        className="btn btn-secondary"
                                        style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAcademySelectedVulnId(f.title);
                                          setActiveTab("academy");
                                        }}
                                        title="Study in Cyber Academy"
                                      >
                                        <GraduationCap size={10} color="var(--accent-cyan)" /> Acad
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expandable Inline Details Accordion inside finding table */}
                                {expandedFindingIds.has(f.id) && (
                                  <tr key={`${f.id}-expanded-details`} className="finding-expanded-detail-row">
                                    <td
                                      id={`details-${f.id}`}
                                      colSpan={9}
                                      style={{ padding: 0, borderBottom: "2px solid var(--accent-cyan)", background: "var(--bg-secondary)" }}
                                    >
                                      <FindingInlineDetailsAccordion
                                        finding={f}
                                        target={targets.find((t) => t.id === f.target_id) || selectedTarget}
                                        onOpenMethodology={(mid) => {
                                          setActiveMethodologyId(mid);
                                          setActiveTab("methodologies");
                                        }}
                                        onOpenAiMentor={(prompt) => {
                                          setExternalMentorPrompt(prompt);
                                          setActiveTab("mentor");
                                        }}
                                        onValidateFinding={handleValidateFinding}
                                        onFindingUpdated={(updated) => {
                                          setFindings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                                          if (selectedFinding?.id === updated.id) {
                                            setSelectedFinding(updated);
                                          }
                                        }}
                                        onInspectFull={() => {
                                          setActiveFindingDetail(f);
                                          setSelectedFinding(f);
                                        }}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Card Grid View where each finding is an independent card with its dropdown */
                      <div
                        className="findings-card-grid"
                        data-tour="findings-card-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                          gap: "14px",
                        }}
                      >
                        {paginatedFindings.map((f) => (
                          <div
                            key={f.id}
                            className="card finding-card"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setFindingContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                finding: f,
                              });
                            }}
                            style={{
                              background: "var(--bg-secondary)",
                              border: `1px solid ${expandedFindingIds.has(f.id) ? "var(--accent-cyan)" : "var(--border-color)"}`,
                              borderRadius: "8px",
                              padding: "14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                            }}
                          >
                            {/* Card Top Row: Checkbox, Severity, Validation, Status */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleSelectFinding(f.id, e)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: selectedFindingIds.has(f.id) ? "var(--accent-cyan)" : "var(--text-dim)", padding: 0 }}
                                  title={selectedFindingIds.has(f.id) ? "Deselect finding" : "Select finding"}
                                >
                                  {selectedFindingIds.has(f.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                                <SeverityBadge severity={f.severity} size="sm" />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <ValidationBadge status={f.validation_status || f.status} confidence={f.confidence} size="sm" />
                                <StatusBadge status={f.status} size="sm" />
                              </div>
                            </div>

                            {/* Vulnerability Title */}
                            <div
                              onClick={() => {
                                setActiveFindingDetail(f);
                                setSelectedFinding(f);
                              }}
                              style={{
                                fontWeight: 700,
                                fontSize: "0.92rem",
                                color: "var(--text-main)",
                                cursor: "pointer",
                                lineHeight: 1.4,
                              }}
                            >
                              {f.title}
                            </div>

                            {/* Target Asset, Tool & CWE */}
                            <div style={{ fontSize: "0.78rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-dim)" }}>
                                <Globe size={12} color="var(--accent-cyan)" />
                                <span style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.affected_asset}>
                                  {f.affected_asset}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                                <span>Tool: <strong style={{ color: "var(--text-main)" }}>{f.source_tool}</strong> {f.tool_version ? `v${f.tool_version}` : ""}</span>
                                <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)" }}>{f.cwe || "N/A"}</span>
                              </div>
                            </div>

                            {/* Card Action Bar */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", paddingTop: "6px", borderTop: "1px solid var(--border-color)" }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "0.72rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  borderColor: expandedFindingIds.has(f.id) ? "var(--accent-cyan)" : "var(--border-color)",
                                  background: expandedFindingIds.has(f.id) ? "var(--accent-primary-subtle)" : undefined,
                                  color: expandedFindingIds.has(f.id) ? "var(--accent-cyan)" : "var(--text-main)",
                                  fontWeight: 600,
                                }}
                                onClick={() => toggleExpandFinding(f.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleExpandFinding(f.id);
                                  }
                                }}
                                aria-controls={`details-${f.id}`}
                                aria-expanded={expandedFindingIds.has(f.id)}
                                title={expandedFindingIds.has(f.id) ? "Hide detection details" : "Show detection details inside card"}
                              >
                                {expandedFindingIds.has(f.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                <span>{expandedFindingIds.has(f.id) ? "Hide Details" : "View Details"}</span>
                              </button>

                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                  onClick={() => {
                                    setActiveFindingDetail(f);
                                    setSelectedFinding(f);
                                  }}
                                  title="Inspect full details page"
                                >
                                  <Eye size={10} color="var(--accent-cyan)" />
                                  <span>Inspect</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "3px 6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "3px" }}
                                  disabled={validatingFindingId === f.id}
                                  onClick={async () => await handleValidateFinding(f.id)}
                                  title="Run verification probe"
                                >
                                  {validatingFindingId === f.id ? <Loader2 size={10} className="animate-spin" /> : <ShieldCheck size={10} color="var(--accent-emerald)" />}
                                  <span>Validate</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "3px 6px", fontSize: "0.7rem" }}
                                  onClick={() => handleExplainWithAi(f)}
                                  title="Open in AI Mentor"
                                >
                                  <Sparkles size={10} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "3px 6px", fontSize: "0.7rem" }}
                                  onClick={() => {
                                    setAcademySelectedVulnId(f.title);
                                    setActiveTab("academy");
                                  }}
                                  title="Study in Cyber Academy"
                                >
                                  <GraduationCap size={10} color="var(--accent-cyan)" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Expandable Details Accordion directly inside card */}
                            {expandedFindingIds.has(f.id) && (
                              <div id={`details-${f.id}`} style={{ marginTop: "6px" }}>
                                <FindingInlineDetailsAccordion
                                  finding={f}
                                  target={targets.find((t) => t.id === f.target_id) || selectedTarget}
                                  onOpenMethodology={(mid) => {
                                    setActiveMethodologyId(mid);
                                    setActiveTab("methodologies");
                                  }}
                                  onOpenAiMentor={(prompt) => {
                                    setExternalMentorPrompt(prompt);
                                    setActiveTab("mentor");
                                  }}
                                  onValidateFinding={handleValidateFinding}
                                  onFindingUpdated={(updated) => {
                                    setFindings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                                    if (selectedFinding?.id === updated.id) {
                                      setSelectedFinding(updated);
                                    }
                                  }}
                                  onInspectFull={() => {
                                    setActiveFindingDetail(f);
                                    setSelectedFinding(f);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                {/* Right-click Context Menu for Finding Cards */}
                {findingContextMenu && (
                  <ContextMenu
                    x={findingContextMenu.x}
                    y={findingContextMenu.y}
                    role={currentUserRole}
                    onClose={() => setFindingContextMenu(null)}
                    items={[
                      {
                        label: "Inspect Full Details",
                        icon: <Eye size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          setActiveFindingDetail(findingContextMenu.finding);
                          setSelectedFinding(findingContextMenu.finding);
                        },
                      },
                      {
                        label: "Copy Finding ID",
                        icon: <FileCode size={12} />,
                        action: () => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(findingContextMenu.finding.id);
                          }
                          addToast({
                            type: "info",
                            title: "ID Copied",
                            description: `Copied ${findingContextMenu.finding.id.slice(0, 8)}... to clipboard.`,
                          });
                        },
                      },
                      {
                        label: "Copy Affected Asset",
                        icon: <Globe size={12} />,
                        action: () => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(findingContextMenu.finding.affected_asset);
                          }
                          addToast({
                            type: "info",
                            title: "Asset Copied",
                            description: "Asset URL copied to clipboard.",
                          });
                        },
                      },
                      {
                        label: "Ask AI Mentor",
                        icon: <Sparkles size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          handleExplainWithAi(findingContextMenu.finding);
                        },
                      },
                      {
                        label: "Study in Cyber Academy",
                        icon: <GraduationCap size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          setAcademySelectedVulnId(findingContextMenu.finding.title);
                          setActiveTab("academy");
                        },
                      },
                      {
                        label: "Verify / Validate (Admin)",
                        icon: <ShieldCheck size={12} color="var(--accent-emerald)" />,
                        requiresAdmin: true,
                        action: async () => {
                          await handleValidateFinding(findingContextMenu.finding.id);
                        },
                      },
                      {
                        label: "Edit Finding (Admin)",
                        icon: <Edit2 size={12} />,
                        requiresAdmin: true,
                        action: () => {
                          setEditingFinding(findingContextMenu.finding);
                        },
                      },
                      {
                        label: "Delete Finding (Admin)",
                        icon: <Trash2 size={12} color="var(--accent-rose)" />,
                        requiresAdmin: true,
                        danger: true,
                        action: () => {
                          setDeletingFinding(findingContextMenu.finding);
                        },
                      },
                    ]}
                  />
                )}

                {/* Pagination Controls */}
                {filteredFindings.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-color)",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      <span>
                        Showing{" "}
                        <strong style={{ color: "var(--text-main)" }}>
                          {filteredFindings.length === 0 ? 0 : (findingPage - 1) * findingPageSize + 1}
                        </strong>{" "}
                        –{" "}
                        <strong style={{ color: "var(--text-main)" }}>
                          {Math.min(findingPage * findingPageSize, filteredFindings.length)}
                        </strong>{" "}
                        of <strong style={{ color: "var(--text-main)" }}>{filteredFindings.length}</strong> findings
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
                        <span>Per page:</span>
                        <select
                          value={findingPageSize}
                          onChange={(e) => setFindingPageSize(Number(e.target.value))}
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
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={findingPage <= 1}
                        onClick={() => setFindingPage(1)}
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        title="First Page"
                      >
                        «
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={findingPage <= 1}
                        onClick={() => setFindingPage((p) => Math.max(1, p - 1))}
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        title="Previous Page"
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: "0.8rem", padding: "0 6px", color: "var(--text-main)" }}>
                        Page {findingPage} of {totalFindingPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={findingPage >= totalFindingPages}
                        onClick={() => setFindingPage((p) => Math.min(totalFindingPages, p + 1))}
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        title="Next Page"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={findingPage >= totalFindingPages}
                        onClick={() => setFindingPage(totalFindingPages)}
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        title="Last Page"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
            )
          )}

          {/* TAB: ISSUE DOCUMENTATION & TRACKING */}
          {activeTab === "issues" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <IssueCenter
                targets={targets}
                currentTargetId={selectedTarget?.id || null}
              />
            </Suspense>
          )}

          {/* TAB 6: IMPORT REPORTS */}
          {activeTab === "importer" && (
            <div>
              <div className="card">
                <h2 className="card-title">
                  <UploadCloud size={20} color="var(--accent-cyan)" />
                  Import Security Reports (OWASP ZAP, Burp Suite, Generic JSON)
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                  Ingest findings from external enterprise scanners into AppSec Nexus's unified SQLite database. Duplicate findings are automatically deduplicated using cryptographic SHA-256 fingerprinting.
                </p>

                <div style={{ display: "flex", gap: "14px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                      Select Report Format
                    </label>
                    <select
                      className="input-field"
                      value={importFormat}
                      onChange={(e: any) => setImportFormat(e.target.value)}
                      style={{ width: "240px" }}
                    >
                      <option value="zap_json">OWASP ZAP (JSON Alert Export)</option>
                      <option value="burp_xml">Burp Suite Professional (XML Issues)</option>
                      <option value="generic_json">AppSec Nexus / Generic (JSON)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                    Paste Report Content (XML or JSON)
                  </label>
                  <textarea
                    className="textarea-field"
                    rows={12}
                    placeholder={
                      importFormat === "zap_json"
                        ? '{\n  "@version": "2.14.0",\n  "site": [\n    {\n      "@name": "https://example.com",\n      "alerts": [\n        { "alert": "Cross-Site Scripting", "riskcode": "3", "cweid": "79", "uri": "https://example.com/search" }\n      ]\n    }\n  ]\n}'
                        : importFormat === "burp_xml"
                        ? '<issues>\n  <issue>\n    <name>SQL Injection</name>\n    <severity>High</severity>\n    <host ip="93.184.216.34">https://example.com</host>\n    <path>/login</path>\n    <issueDetail>Error based SQL injection detected.</issueDetail>\n  </issue>\n</issues>'
                        : '[\n  {\n    "title": "Insecure Direct Object Reference",\n    "severity": "High",\n    "affected_asset": "https://example.com/api/users/12",\n    "evidence": "User ID parameter tampered without authorization.",\n    "source_tool": "Manual Audit",\n    "cwe": "CWE-639"\n  }\n]'
                    }
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    className="btn btn-primary"
                    disabled={isImporting || !selectedTarget || !importContent.trim()}
                    onClick={handleImportReport}
                  >
                    <UploadCloud size={14} /> {isImporting ? "Parsing & Ingesting..." : "Import into SQLite Database"}
                  </button>

                  {importStatus && (
                    <div style={{ fontSize: "0.85rem", color: importStatus.startsWith("Import Error") ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {importStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: APPSEC AI — TWO-MODEL SECURITY WORKSPACE */}
          {activeTab === "mentor" && (
            <div className="card">
              {/* SECTION A: HEADER: APPSEC AI */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "16px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div>
                  <h2 className="card-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={20} color="var(--accent-cyan)" />
                    <span>AppSec AI</span>
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "4px 0 0 0" }}>
                    Your local AI assistant for web and API security.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: aiAvailable ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      border: `1px solid ${aiAvailable ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: aiAvailable ? "var(--accent-emerald)" : "var(--accent-rose)",
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: aiAvailable ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                      {aiAvailable
                        ? `Ollama Online${ollamaSystemInfo?.version ? ` (v${ollamaSystemInfo.version})` : ""}`
                        : "Ollama Offline (Run 'ollama serve')"}
                    </span>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={handleRefreshAiStatus}
                    style={{ padding: "6px 10px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    title="Refresh Ollama connection and local models"
                  >
                    <RotateCcw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* SECTION B: TWO MODEL CARDS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "14px",
                  marginBottom: "16px",
                }}
              >
                {/* CARD 1: QUICK SECURITY AI */}
                {(() => {
                  const isQuickActive = activeAiRole === "quick";
                  const isQuickInst = isModelInstalled(quickModel, aiModels);
                  return (
                    <div
                      data-testid="quick-security-ai-card"
                      onClick={() => handleSelectAiRole("quick")}
                      style={{
                        background: isQuickActive ? "rgba(6, 182, 212, 0.08)" : "var(--bg-secondary)",
                        border: `2px solid ${isQuickActive ? "var(--accent-cyan)" : "var(--border-color)"}`,
                        borderRadius: "10px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.18s ease-in-out",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: isQuickActive ? "0 0 16px rgba(6, 182, 212, 0.15)" : "none",
                      }}
                      className="hover-card"
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: "rgba(6, 182, 212, 0.15)",
                                border: "1px solid rgba(6, 182, 212, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--accent-cyan)",
                              }}
                            >
                              <Zap size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                Quick Security AI
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                                Fast & Lightweight
                              </div>
                            </div>
                          </div>

                          {isQuickActive ? (
                            <span
                              style={{
                                backgroundColor: "var(--accent-cyan)",
                                color: "#000",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "12px",
                              }}
                            >
                              Active Model
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAiRole("quick");
                              }}
                            >
                              Activate
                            </button>
                          )}
                        </div>

                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "8px 0 12px 0", lineHeight: "1.4" }}>
                          Small and fast local model suitable for routine questions, learning explanations, summaries, and lightweight code assistance.
                        </p>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid var(--border-color)",
                          paddingTop: "10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--text-dim)" }}>Model:</span>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-main)" }}>
                            {quickModel}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: isQuickInst ? "var(--accent-emerald)" : "var(--accent-amber)",
                            background: isQuickInst ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {isQuickInst ? "✓ Ready" : "⚠ Not Installed"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 2: DEEP SECURITY AI */}
                {(() => {
                  const isDeepActive = activeAiRole === "deep";
                  const isDeepInst = isModelInstalled(deepModel, aiModels);
                  return (
                    <div
                      data-testid="deep-security-ai-card"
                      onClick={() => handleSelectAiRole("deep")}
                      style={{
                        background: isDeepActive ? "rgba(168, 85, 247, 0.08)" : "var(--bg-secondary)",
                        border: `2px solid ${isDeepActive ? "var(--accent-purple, #a855f7)" : "var(--border-color)"}`,
                        borderRadius: "10px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.18s ease-in-out",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: isDeepActive ? "0 0 16px rgba(168, 85, 247, 0.15)" : "none",
                      }}
                      className="hover-card"
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: "rgba(168, 85, 247, 0.15)",
                                border: "1px solid rgba(168, 85, 247, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--accent-purple, #a855f7)",
                              }}
                            >
                              <Cpu size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                Deep Security AI
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--accent-purple, #a855f7)", fontWeight: 600 }}>
                                Deep Reasoning & Pentest Review
                              </div>
                            </div>
                          </div>

                          {isDeepActive ? (
                            <span
                              style={{
                                backgroundColor: "var(--accent-purple, #a855f7)",
                                color: "#fff",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "12px",
                              }}
                            >
                              Active Model
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAiRole("deep");
                              }}
                            >
                              Activate
                            </button>
                          )}
                        </div>

                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "8px 0 12px 0", lineHeight: "1.4" }}>
                          More thorough reasoning for complex vulnerability root-cause analysis, dual-perspective auditing, code review, and remediation planning.
                        </p>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid var(--border-color)",
                          paddingTop: "10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--text-dim)" }}>Model:</span>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-main)" }}>
                            {deepModel}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: isDeepInst ? "var(--accent-emerald)" : "var(--accent-amber)",
                            background: isDeepInst ? "rgba(168, 85, 247, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {isDeepInst ? "✓ Ready" : "⚠ Not Installed"}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 3: DEEPSEEK CLOUD AI */}
                {(() => {
                  const isDeepSeekActive = activeAiRole === "deepseek";
                  return (
                    <div
                      data-testid="deepseek-ai-card"
                      onClick={() => handleSelectAiRole("deepseek")}
                      style={{
                        background: isDeepSeekActive ? "rgba(59, 130, 246, 0.08)" : "var(--bg-secondary)",
                        border: `2px solid ${isDeepSeekActive ? "var(--accent-blue, #3b82f6)" : "var(--border-color)"}`,
                        borderRadius: "10px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.18s ease-in-out",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: isDeepSeekActive ? "0 0 16px rgba(59, 130, 246, 0.15)" : "none",
                      }}
                      className="hover-card"
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                background: "rgba(59, 130, 246, 0.15)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--accent-blue, #3b82f6)",
                              }}
                            >
                              <Globe size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                DeepSeek Cloud AI
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--accent-blue, #3b82f6)", fontWeight: 600 }}>
                                Official Remote API Provider
                              </div>
                            </div>
                          </div>

                          {isDeepSeekActive ? (
                            <span
                              style={{
                                backgroundColor: "var(--accent-blue, #3b82f6)",
                                color: "#fff",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "12px",
                              }}
                            >
                              Active Model
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAiRole("deepseek");
                              }}
                            >
                              Activate
                            </button>
                          )}
                        </div>

                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "8px 0 12px 0", lineHeight: "1.4" }}>
                          High-capacity cloud reasoning model for in-depth vulnerability research, code review, and threat modeling via official DeepSeek API.
                        </p>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid var(--border-color)",
                          paddingTop: "10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "var(--text-dim)" }}>Endpoint:</span>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-main)" }}>
                            api.deepseek.com
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: "var(--accent-blue, #3b82f6)",
                            background: "rgba(59, 130, 246, 0.1)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Cloud API
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Security Guidance Disclaimer */}
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--text-dim)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertTriangle size={14} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Security Notice:</strong> AI suggestions provide guidance and analytical hypotheses. Never assume a vulnerability is confirmed solely because the model says so — always verify with deterministic scan evidence and authorized lab validation.
                </span>
              </div>

              {/* SECTION C: COLLAPSIBLE MODEL SETUP */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModelSetupOpen(!isModelSetupOpen)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-main)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Settings2 size={15} color="var(--accent-cyan)" />
                    <span>Model Setup</span>
                  </span>
                  {isModelSetupOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isModelSetupOpen && (
                  <div style={{ padding: "0 14px 14px 14px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                    {aiModels.length === 1 && (
                      <div
                        style={{
                          fontSize: "0.76rem",
                          background: "rgba(6, 182, 212, 0.08)",
                          border: "1px solid rgba(6, 182, 212, 0.25)",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          marginBottom: "12px",
                          color: "var(--accent-cyan)",
                        }}
                      >
                        ℹ <strong>Single Model Detected:</strong> Only 1 local model (<code>{aiModels[0]}</code>) is installed. Both Quick and Deep slots are currently mapped to this model. You can install an additional model below to separate routine speed from deep reasoning.
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                      {/* Quick Slot Assign */}
                      <div>
                        <label style={{ fontSize: "0.74rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                          Quick Security AI Slot Model:
                        </label>
                        <select
                          className="input-field"
                          value={quickModel}
                          onChange={(e) => handleAssignModelSlot("quick", e.target.value)}
                          style={{ width: "100%", fontSize: "0.82rem", height: "36px", minHeight: "36px", padding: "6px 10px" }}
                        >
                          {aiModels.length === 0 ? (
                            <option value={quickModel}>{quickModel} (Not installed)</option>
                          ) : (
                            aiModels.map((m) => (
                              <option key={`quick-${m}`} value={m}>
                                {m} {m === deepModel ? "(Shared with Deep slot)" : ""}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Deep Slot Assign */}
                      <div>
                        <label style={{ fontSize: "0.74rem", color: "var(--text-dim)", display: "block", marginBottom: "4px" }}>
                          Deep Security AI Slot Model:
                        </label>
                        <select
                          className="input-field"
                          value={deepModel}
                          onChange={(e) => handleAssignModelSlot("deep", e.target.value)}
                          style={{ width: "100%", fontSize: "0.82rem", height: "36px", minHeight: "36px", padding: "6px 10px" }}
                        >
                          {aiModels.length === 0 ? (
                            <option value={deepModel}>{deepModel} (Not installed)</option>
                          ) : (
                            aiModels.map((m) => (
                              <option key={`deep-${m}`} value={m}>
                                {m} {m === quickModel ? "(Shared with Quick slot)" : ""}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Pull Model Section */}
                    <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <ArrowDownCircle size={14} color="var(--accent-cyan)" />
                        <span>Install / Pull Ollama Model</span>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. llama3.2:1b, llama3:8b, qwen2.5-coder:1.5b"
                          value={customModelInput}
                          onChange={(e) => setCustomModelInput(e.target.value)}
                          style={{ flex: 1, minWidth: "220px", height: "36px", minHeight: "36px", fontSize: "0.82rem" }}
                          disabled={Boolean(pullingModel)}
                        />
                        <button
                          className="btn btn-primary"
                          disabled={!customModelInput.trim() || Boolean(pullingModel) || !aiAvailable}
                          onClick={() => handlePullModel(customModelInput.trim())}
                          style={{ padding: "0 14px", height: "36px", minHeight: "36px", fontSize: "0.8rem" }}
                        >
                          {pullingModel ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          <span>{pullingModel ? "Pulling..." : "Install Model"}</span>
                        </button>
                      </div>

                      {/* Recommended 1-Click Pull Buttons */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", alignSelf: "center" }}>
                          Recommendations:
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                          disabled={Boolean(pullingModel) || isModelInstalled(RECOMMENDED_QUICK_MODEL, aiModels)}
                          onClick={() => handlePullModel(RECOMMENDED_QUICK_MODEL)}
                        >
                          {isModelInstalled(RECOMMENDED_QUICK_MODEL, aiModels) ? "✓ Quick (1B) Installed" : `⚡ Download Quick: ${RECOMMENDED_QUICK_MODEL} (1.3GB)`}
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                          disabled={Boolean(pullingModel) || isModelInstalled(RECOMMENDED_DEEP_MODEL, aiModels)}
                          onClick={() => handlePullModel(RECOMMENDED_DEEP_MODEL)}
                        >
                          {isModelInstalled(RECOMMENDED_DEEP_MODEL, aiModels) ? "✓ Deep (8B) Installed" : `🧠 Download Deep: ${RECOMMENDED_DEEP_MODEL} (4.7GB)`}
                        </button>
                      </div>

                      {/* Download Progress Bar */}
                      {pullProgress && (
                        <div style={{ marginTop: "12px", background: "var(--bg-primary)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                              {pullProgress.model}: {pullProgress.status}
                            </span>
                            <span style={{ fontWeight: 700, color: pullProgress.done ? "var(--accent-emerald)" : "var(--accent-cyan)" }}>
                              {pullProgress.percentage.toFixed(1)}%
                            </span>
                          </div>

                          <div style={{ width: "100%", height: "6px", background: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(pullProgress.percentage, 0))}%`,
                                height: "100%",
                                background: pullProgress.done ? "var(--accent-emerald)" : "linear-gradient(90deg, #06b6d4, #10b981)",
                                borderRadius: "3px",
                                transition: "width 0.2s ease-in-out",
                              }}
                            />
                          </div>

                          {pullProgress.total > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "4px" }}>
                              <span>{(pullProgress.completed / (1024 * 1024)).toFixed(1)} MB / {(pullProgress.total / (1024 * 1024)).toFixed(1)} MB</span>
                              <span>{pullProgress.done ? "Complete ✓" : "Downloading layer..."}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {pullStatus && !pullProgress && (
                        <div style={{ fontSize: "0.76rem", color: "var(--accent-cyan)", marginTop: "8px" }}>
                          {pullStatus}
                        </div>
                      )}

                      {/* Advanced Persona Directive Setting */}
                      <div style={{ marginTop: "12px", borderTop: "1px dashed var(--border-color)", paddingTop: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-main)" }}>
                              Explanation Persona Mode:
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginLeft: "6px" }}>
                              (Controls baseline guidance depth)
                            </span>
                          </div>
                          <select
                            className="input-field"
                            value={aiMode}
                            onChange={(e: any) => setAiMode(e.target.value)}
                            style={{ fontSize: "0.82rem", height: "36px", minHeight: "36px", padding: "6px 10px" }}
                          >
                            <option value="beginner">Beginner / Learner Mode (Simple Analogies)</option>
                            <option value="advanced">Senior Pentester Mode (Remediation & Code)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION D: COLLAPSIBLE SYSTEM INFORMATION */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsSystemInfoOpen(!isSystemInfoOpen)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-main)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Info size={15} color="var(--accent-cyan)" />
                    <span>System Information</span>
                  </span>
                  {isSystemInfoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isSystemInfoOpen && (
                  <div style={{ padding: "0 14px 14px 14px", borderTop: "1px solid var(--border-color)", paddingTop: "12px", fontSize: "0.78rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                      <div>
                        <span style={{ color: "var(--text-dim)", display: "block" }}>Connection Status:</span>
                        <span style={{ fontWeight: 600, color: aiAvailable ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                          {aiAvailable ? "● Online & Responding" : "● Offline / Unreachable"}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "var(--text-dim)", display: "block" }}>Installed Ollama Version:</span>
                        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
                          {ollamaSystemInfo?.version ? `v${ollamaSystemInfo.version}` : aiAvailable ? "Installed (Version Unknown)" : "Unavailable (Ollama Offline)"}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "var(--text-dim)", display: "block" }}>Ollama Server Endpoint:</span>
                        <span style={{ fontFamily: "monospace" }}>
                          {ollamaSystemInfo?.endpoint || "http://127.0.0.1:11434"}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "var(--text-dim)", display: "block" }}>Active Security AI Role:</span>
                        <span style={{ fontWeight: 600, color: activeAiRole === "deep" ? "var(--accent-purple, #a855f7)" : "var(--accent-cyan)" }}>
                          {activeAiRole === "deep" ? `🧠 Deep Security AI (${deepModel})` : `⚡ Quick Security AI (${quickModel})`}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "var(--text-dim)", display: "block" }}>Configured Slots:</span>
                        <span>
                          Quick: <code>{quickModel}</code> • Deep: <code>{deepModel}</code>
                        </span>
                      </div>

                      <div>
                        <span style={{ color: "var(--text-dim)", display: "block" }}>Local Models Installed:</span>
                        <span>{aiModels.length} models detected</span>
                      </div>
                    </div>

                    {ollamaSystemInfo?.last_checked && (
                      <div style={{ marginTop: "10px", color: "var(--text-dim)", fontSize: "0.72rem" }}>
                        Last Checked: {new Date(ollamaSystemInfo.last_checked).toLocaleTimeString()}
                      </div>
                    )}

                    {ollamaSystemInfo?.error_message && (
                      <div style={{ marginTop: "8px", color: "var(--accent-rose)", fontSize: "0.74rem" }}>
                        ⚠ {ollamaSystemInfo.error_message}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION E: INTEGRATED SECURITY MENTOR CHAT */}
              <div>
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <MentorChat
                    selectedFinding={selectedFinding}
                    selectedModel={selectedModel}
                    aiMode={aiMode}
                    aiAvailable={aiAvailable}
                    aiModels={aiModels}
                    quickModel={quickModel}
                    deepModel={deepModel}
                    activeRole={activeAiRole}
                    onSelectRole={handleSelectAiRole}
                    activeCategory={activeCategory}
                    onSelectCategory={setActiveCategory}
                    isAiEnabled={isAiEnabled}
                    onToggleAiEnabled={(enabled) => {
                      setIsAiEnabled(enabled);
                      localStorage.setItem("appsec_ai_mentor_enabled", String(enabled));
                    }}
                    onSelectModel={setSelectedModel}
                    onSelectFinding={setSelectedFinding}
                    onRefreshAiStatus={handleRefreshAiStatus}
                    onFindingValidated={(updated) => {
                      setFindings((prev) =>
                        prev.map((f) => (f.id === updated.id ? updated : f))
                      );
                    }}
                    initialPrompt={externalMentorPrompt}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* TAB: HOST & MOBILE SECURITY AUDITOR */}
          {activeTab === "hostmobile" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <HostMobileAudit
                targetId={selectedTarget?.id || "local-host"}
                onFindingsAdded={(newF) => {
                  setFindings((prev) => [...newF, ...prev]);
                }}
                onNavigateFinding={(f) => {
                  setActiveFindingDetail(f);
                  setSelectedFinding(f);
                  setActiveTab("findings");
                }}
              />
            </Suspense>
          )}

          {/* TAB 8: AUDIT & SCAN HISTORY */}
          {activeTab === "history" && (
            <div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    <History size={20} color="var(--accent-cyan)" />
                    Scan Audit History ({scanHistory.length})
                  </h2>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsAuditLogModalOpen(true)}
                      title="View System & Security Audit Trail"
                    >
                      <History size={14} /> Audit Trail
                    </button>
                    {scanHistory.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setIsClearingScanHistoryModalOpen(true)}
                        title="Clear all scan execution history"
                      >
                        <Trash2 size={14} /> Clear History
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={loadInitialData}>
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                {isScanHistoryLoading ? (
                  <ScanHistorySkeleton rows={5} />
                ) : scanHistory.length === 0 ? (
                  <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                    No scan executions recorded yet. Run a scan from the Tool Hub or Scan Console.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Target URL</th>
                          <th>Tool Used</th>
                          <th>Status</th>
                          <th>Findings Discovered</th>
                          <th>Duration</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanHistory.map((s, idx) => (
                          <tr
                            key={s.scan_id || idx}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setScanHistoryContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                scan: s,
                              });
                            }}
                            style={{ cursor: "context-menu" }}
                          >
                            <td style={{ fontWeight: 600 }}>{s.target_url}</td>
                            <td>
                              <span style={{ color: "var(--accent-cyan)", fontWeight: 500 }}>
                                {s.tool}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-locked">{s.status}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{s.findings_count} findings</td>
                            <td style={{ color: "var(--text-dim)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                              {s.duration_ms} ms
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: "3px 7px", fontSize: "0.72rem", color: "var(--accent-rose)" }}
                                onClick={() => handleDeleteScanHistory(s)}
                                title="Delete scan execution record"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Right-click Context Menu for Scan History Records */}
                {scanHistoryContextMenu && (
                  <ContextMenu
                    x={scanHistoryContextMenu.x}
                    y={scanHistoryContextMenu.y}
                    role={currentUserRole}
                    onClose={() => setScanHistoryContextMenu(null)}
                    items={[
                      {
                        label: `Re-run ${scanHistoryContextMenu.scan.tool.toUpperCase()} Scan`,
                        icon: <RotateCcw size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          const target = targets.find((t) => t.primary_url === scanHistoryContextMenu.scan.target_url) || selectedTarget;
                          if (target) {
                            setSelectedTarget(target);
                            setActiveTab("scanner");
                            handleRunScan(scanHistoryContextMenu.scan.tool.toLowerCase());
                          } else {
                            addToast({
                              type: "warning",
                              title: "Target Not Selected",
                              description: `Please select an authorized target matching ${scanHistoryContextMenu.scan.target_url}`,
                            });
                          }
                        },
                      },
                      {
                        label: "Copy Target URL",
                        icon: <Globe size={12} />,
                        action: () => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(scanHistoryContextMenu.scan.target_url);
                          }
                          addToast({
                            type: "info",
                            title: "URL Copied",
                            description: `Copied ${scanHistoryContextMenu.scan.target_url} to clipboard.`,
                          });
                        },
                      },
                      {
                        label: "View in Unified Findings",
                        icon: <Search size={12} color="var(--accent-cyan)" />,
                        action: () => {
                          setFindingSearchQuery(scanHistoryContextMenu.scan.tool);
                          setActiveTab("findings");
                        },
                      },
                      {
                        label: "Delete Record",
                        icon: <Trash2 size={12} />,
                        requiresAdmin: true,
                        danger: true,
                        action: () => {
                          handleDeleteScanHistory(scanHistoryContextMenu.scan);
                        },
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 8: CYBER ACADEMY & FOUNDATIONS */}
          {activeTab === "academy" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <CyberAcademy
                findings={findings}
                initialSelectedVulnId={academySelectedVulnId}
                onNavigateScanner={(toolId) => {
                  setActiveTool(toolId);
                  setActiveTab("scanner");
                }}
                onOpenAiMentor={() => {
                  setActiveTab("mentor");
                }}
              />
            </Suspense>
          )}

          {/* TAB 9: APPEARANCE & PERSONALIZATION */}
          {activeTab === "appearance" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <AppearanceSettings />
            </Suspense>
          )}

          {/* TAB 10: CATEGORY WORKFLOW INTELLIGENCE */}
          {activeTab === "categoryWorkflow" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <CategoryWorkflowView
                category={activeCategory}
                targets={targets}
                selectedTarget={selectedTarget}
                onSelectTarget={(target) => setSelectedTarget(target)}
                findings={findings}
                onFindingsAdded={(newFindings) => {
                  setFindings((prev) => [...newFindings, ...prev]);
                  addToast({
                    type: "success",
                    title: "Findings Linked",
                    description: `Added ${newFindings.length} finding(s) from category assessment.`,
                  });
                }}
                onLaunchAiMentor={(_initialPrompt) => {
                  setActiveTab("mentor");
                }}
                onOpenChecklists={() => {
                  setActiveTab("playbooks");
                }}
                onNavigateToOrchestration={() => {
                  setActiveTab("orchestration");
                }}
                onNavigateToFindings={() => {
                  setActiveTab("findings");
                }}
              />
            </Suspense>
          )}

          {/* TAB 11: SECURITY CHECKLISTS & PLAYBOOKS */}
          {activeTab === "playbooks" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ChecklistPlaybookCenter
                initialCategory={activeCategory}
                targets={targets}
                onFindingsAdded={(newFindings) => {
                  setFindings((prev) => [...newFindings, ...prev]);
                  addToast({
                    type: "success",
                    title: "Findings Linked",
                    description: `Added ${newFindings.length} finding(s) from playbook run.`,
                  });
                }}
                onLaunchAiMentor={(_prompt) => {
                  setActiveTab("mentor");
                }}
              />
            </Suspense>
          )}

          {/* TAB 12: BURP SUITE INTEGRATION */}
          {activeTab === "burp" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <BurpIntegrationView
                activeTarget={selectedTarget}
                findings={findings}
                onImportFindings={(imported) => {
                  setFindings((prev) => [...imported, ...prev]);
                  addToast({
                    type: "success",
                    title: "Burp Findings Imported",
                    description: `Successfully imported ${imported.length} finding(s) from Burp Suite.`,
                  });
                }}
                onNavigateToMentor={(prompt) => {
                  setExternalMentorPrompt(prompt);
                  setActiveTab("mentor");
                }}
              />
            </Suspense>
          )}

          {/* TAB 13: DETECTION METHODOLOGY EXPLORER */}
          {activeTab === "methodologies" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <MethodologyExplorer
                initialMethodologyId={activeMethodologyId}
                onSelectMethodology={(m: MethodologyDefinition) => setActiveMethodologyId(m.id)}
                onOpenAiMentor={(prompt: string) => {
                  setExternalMentorPrompt(prompt);
                  setActiveTab("mentor");
                }}
              />
            </Suspense>
          )}

          {/* TAB 14: HERETIC MODEL LAB */}
          {activeTab === "modelLab" && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ModelLabView
                onAssignToMentor={(modelName: string) => {
                  setSelectedModel(modelName);
                  setActiveTab("mentor");
                }}
              />
            </Suspense>
          )}
        </main>

        {/* Right Collapsible AI Mentor Drawer (when finding selected) */}
        {selectedFinding && !activeFindingDetail && activeTab === "findings" && (
          <aside
            className="ai-drawer"
            style={{
              width: isDrawerMaximized ? "calc(100vw - 280px)" : `${drawerWidth}px`,
              maxWidth: "96vw",
              position: "relative",
              transition: isResizingDrawer ? "none" : "width 0.2s ease",
            }}
          >
            {/* Left Edge Drag Handle to Resize Inspector */}
            <div
              onPointerDown={handleDrawerPointerDown}
              onDoubleClick={() => setIsDrawerMaximized((prev) => !prev)}
              title="Drag to resize inspector drawer width, double-click to toggle maximize/restore"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "6px",
                height: "100%",
                cursor: "col-resize",
                zIndex: 30,
                backgroundColor: isResizingDrawer ? "var(--accent-cyan)" : "transparent",
                transition: "background-color 0.15s ease",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} color="var(--accent-cyan)" /> AI Mentor & Flowcharts
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                  onClick={() => setIsDrawerMaximized(!isDrawerMaximized)}
                  title={isDrawerMaximized ? "Restore Inspector Size" : "Maximize Inspector"}
                >
                  {isDrawerMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  <span>{isDrawerMaximized ? "Restore" : "Maximize"}</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "4px" }}
                  onClick={() => {
                    setAcademySelectedVulnId(selectedFinding.title);
                    setActiveTab("academy");
                  }}
                  title="Study in Cyber Academy"
                >
                  <GraduationCap size={12} color="var(--accent-cyan)" /> Academy
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                  onClick={() => setActiveTab("mentor")}
                  title="Open Full Screen AI Mentor tab"
                >
                  Full Screen
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                  onClick={() => setSelectedFinding(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "2px" }}>
              {selectedFinding.title}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "10px" }}>
              CWE: {selectedFinding.cwe || "N/A"} • Tool: {selectedFinding.source_tool}
            </div>

            {/* Interactive Mentor Chat with Asking Box & Flowchart inside Drawer */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <Suspense fallback={<TabLoadingSkeleton />}>
                <MentorChat
                  selectedFinding={selectedFinding}
                  selectedModel={selectedModel}
                  aiMode={aiMode}
                  aiAvailable={aiAvailable}
                  aiModels={aiModels}
                  quickModel={quickModel}
                  deepModel={deepModel}
                  activeRole={activeAiRole}
                  onSelectRole={handleSelectAiRole}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  isAiEnabled={isAiEnabled}
                  onToggleAiEnabled={(enabled) => {
                    setIsAiEnabled(enabled);
                    localStorage.setItem("appsec_ai_mentor_enabled", String(enabled));
                  }}
                  onSelectModel={setSelectedModel}
                  onSelectFinding={setSelectedFinding}
                  onRefreshAiStatus={handleRefreshAiStatus}
                />
              </Suspense>
            </div>
          </aside>
        )}
      </div>

      {/* Global Developer-Tool Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onQuickScan={(toolId) => handleRunScan(toolId)}
        onExportReport={handleExportReport}
        onEmergencyStop={handleEmergencyStop}
        findings={findings}
        targets={targets}
        onSelectFinding={(f) => {
          setActiveFindingDetail(f);
          setSelectedFinding(f);
          setActiveTab("findings");
        }}
      />

      {/* Global Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Workspace Customization Drawer */}
      <WorkspaceControlsDrawer
        isOpen={Boolean(drawers.workspaceControls)}
        onClose={() => closeDrawer("workspaceControls")}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as TabType)}
      />

      {/* Quick AI Floating Assistant Drawer */}
      <SlidingDrawer
        isOpen={Boolean(drawers.aiMentorDrawer)}
        onClose={() => closeDrawer("aiMentorDrawer")}
        title="Quick AI Security Assistant"
        subtitle="Ask questions, generate defensive fixes, or inspect findings without navigating away"
        storageKey="quick_ai_drawer"
      >
        <Suspense fallback={<TabLoadingSkeleton />}>
          <MentorChat
            selectedFinding={selectedFinding}
            selectedModel={selectedModel}
            aiMode={aiMode}
            aiAvailable={aiAvailable}
            aiModels={aiModels}
            quickModel={quickModel}
            deepModel={deepModel}
            activeRole={activeAiRole}
            onSelectRole={handleSelectAiRole}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            isAiEnabled={isAiEnabled}
            onToggleAiEnabled={(enabled) => {
              setIsAiEnabled(enabled);
              localStorage.setItem("appsec_ai_mentor_enabled", String(enabled));
            }}
            onSelectModel={setSelectedModel}
            onSelectFinding={setSelectedFinding}
            onRefreshAiStatus={handleRefreshAiStatus}
          />
        </Suspense>
      </SlidingDrawer>

      {/* Target Edit Modal */}
      <TargetEditModal
        isOpen={Boolean(editingTarget)}
        target={editingTarget}
        onSave={handleUpdateTarget}
        onClose={() => setEditingTarget(null)}
      />

      {/* Target Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deletingTarget)}
        title="Delete Authorized Target"
        message="Are you sure you want to delete this target? This action will permanently remove the target and cascade-delete all associated findings, crawler endpoints, and verification records from the database."
        recordIdentifier={deletingTarget ? `${deletingTarget.name} (${deletingTarget.primary_url})` : undefined}
        confirmLabel="Delete Target"
        confirmVariant="danger"
        isLoading={isDeletingTarget}
        onConfirm={handleConfirmDeleteTarget}
        onClose={() => {
          if (!isDeletingTarget) setDeletingTarget(null);
        }}
      />

      {/* Finding Create Modal */}
      <FindingCreateModal
        isOpen={isCreateFindingOpen}
        targets={targets}
        defaultTargetId={selectedTarget?.id}
        onCreated={handleCreateFinding}
        onClose={() => setIsCreateFindingOpen(false)}
      />

      {/* Finding Edit Modal */}
      <FindingEditModal
        isOpen={Boolean(editingFinding)}
        finding={editingFinding}
        onSave={handleUpdateFinding}
        onClose={() => setEditingFinding(null)}
      />

      {/* Finding Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deletingFinding)}
        title="Delete Vulnerability Finding"
        message="Are you sure you want to delete this security finding? This will also remove any associated validation history."
        recordIdentifier={deletingFinding ? `${deletingFinding.title} [${deletingFinding.severity}]` : undefined}
        confirmLabel="Delete Finding"
        confirmVariant="danger"
        isLoading={isDeletingFinding}
        onConfirm={handleConfirmDeleteFinding}
        onClose={() => {
          if (!isDeletingFinding) setDeletingFinding(null);
        }}
      />

      {/* Bulk Delete Findings Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        title="Bulk Delete Findings"
        message={`Are you sure you want to permanently delete the ${selectedFindingIds.size} selected findings and their validation records?`}
        confirmLabel={`Delete ${selectedFindingIds.size} Findings`}
        confirmVariant="danger"
        isLoading={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => {
          if (!isBulkDeleting) setIsBulkDeleteModalOpen(false);
        }}
      />

      {/* Clear Endpoints Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearingEndpointsModalOpen}
        title="Clear Discovered Endpoints"
        message={`Are you sure you want to delete all ${endpoints.length} discovered endpoints for target "${selectedTarget?.name || "Active Target"}"?`}
        confirmLabel="Clear All Endpoints"
        confirmVariant="danger"
        onConfirm={handleClearEndpoints}
        onClose={() => setIsClearingEndpointsModalOpen(false)}
      />

      {/* Clear Scan History Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearingScanHistoryModalOpen}
        title="Clear Scan Execution History"
        message={`Are you sure you want to clear all ${scanHistory.length} recorded scan executions?`}
        confirmLabel="Clear History"
        confirmVariant="danger"
        onConfirm={handleClearScanHistory}
        onClose={() => setIsClearingScanHistoryModalOpen(false)}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
      />

      {/* Global Interactive Product Tour Overlay */}
      <InteractiveTourOverlay />

      {/* Searchable Help Center & Knowledgebase Modal */}
      <HelpCenterModal />

      {/* Interactive Guided Checklists & Workflows Drawer */}
      <GuidedWorkflowsDrawer />
    </div>
  </TourProvider>
  );
}
