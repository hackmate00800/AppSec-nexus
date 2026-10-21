import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { PanelState, WorkspacePreset, WorkspaceDensity } from "../types";

export interface WorkspaceContextValue {
  // Panel management (O(1) hash map indexing)
  panels: Record<string, PanelState>;
  minimizedPanels: PanelState[];
  minimizePanel: (id: string) => void;
  maximizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  collapsePanel: (id: string) => void;
  togglePanelVisibility: (id: string, visible?: boolean) => void;

  // Tab strip management (drag & drop reordering, closing, recovery)
  tabOrder: string[];
  closedTabs: string[];
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  closeTab: (tabId: string, activeTab: string, onSelectTab: (tabId: string) => void) => void;
  reopenTab: (tabId: string, onSelectTab?: (tabId: string) => void) => void;
  restoreAllTabs: () => void;
  resetTabOrder: () => void;

  // Workspace Layout & Presets
  preset: WorkspacePreset;
  setPreset: (preset: WorkspacePreset) => void;
  density: WorkspaceDensity;
  setDensity: (density: WorkspaceDensity) => void;

  // Sidebar & Drawers
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  drawers: Record<string, boolean>;
  openDrawer: (drawerId: string) => void;
  closeDrawer: (drawerId: string) => void;
  toggleDrawer: (drawerId: string) => void;

  // Global reset
  resetWorkspaceLayout: () => void;
}

const STORAGE_KEY = "appsec_workspace_config_v2";

const DEFAULT_PANELS: Record<string, PanelState> = {
  kpi_metrics: {
    id: "kpi_metrics",
    title: "Security Posture KPIs",
    visible: true,
    minimized: false,
    maximized: false,
    collapsed: false,
  },
  severity_breakdown: {
    id: "severity_breakdown",
    title: "Severity Breakdown",
    visible: true,
    minimized: false,
    maximized: false,
    collapsed: false,
  },
  findings_table: {
    id: "findings_table",
    title: "Active Findings",
    visible: true,
    minimized: false,
    maximized: false,
    collapsed: false,
  },
  scan_console: {
    id: "scan_console",
    title: "Live Scan Console",
    visible: true,
    minimized: false,
    maximized: false,
    collapsed: false,
  },
  finding_details: {
    id: "finding_details",
    title: "Finding Inspector",
    visible: true,
    minimized: false,
    maximized: false,
    collapsed: false,
  },
};

const DEFAULT_TAB_ORDER: string[] = [
  "analytics",
  "targets",
  "webPentest",
  "tools",
  "scanner",
  "activity",
  "findings",
  "verificationLab",
  "issues",
  "academy",
  "documentationCenter",
  "vulnerabilityExplorer",
  "zeroDayResearch",
  "methodologies",
  "diagramLibrary",
  "glossaryLibrary",
  "mentor",
  "history",
  "modelLab",
  "appearance",
  "importer",
  "burp",
  "orchestration",
  "crawler",
  "terminal",
  "apiSecurity",
  "networkRecon",
  "hostmobile",
  "playbooks",
  "categoryWorkflow",
];

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved state safely
  const initialConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          preset: (parsed.preset as WorkspacePreset) || "default",
          density: (parsed.density as WorkspaceDensity) || "normal",
          sidebarWidth: typeof parsed.sidebarWidth === "number" ? parsed.sidebarWidth : 250,
          isSidebarCollapsed: Boolean(parsed.isSidebarCollapsed),
          tabOrder: Array.isArray(parsed.tabOrder) && parsed.tabOrder.length > 0 ? parsed.tabOrder : DEFAULT_TAB_ORDER,
          closedTabs: Array.isArray(parsed.closedTabs) ? parsed.closedTabs : [],
          panels: parsed.panels && typeof parsed.panels === "object" ? { ...DEFAULT_PANELS, ...parsed.panels } : DEFAULT_PANELS,
        };
      }
    } catch (e) {
      console.warn("Failed to parse saved workspace config:", e);
    }
    return {
      preset: "default" as WorkspacePreset,
      density: "normal" as WorkspaceDensity,
      sidebarWidth: 250,
      isSidebarCollapsed: false,
      tabOrder: DEFAULT_TAB_ORDER,
      closedTabs: [],
      panels: DEFAULT_PANELS,
    };
  }, []);

  const [preset, setPresetState] = useState<WorkspacePreset>(initialConfig.preset);
  const [density, setDensityState] = useState<WorkspaceDensity>(initialConfig.density);
  const [sidebarWidth, setSidebarWidthState] = useState<number>(initialConfig.sidebarWidth);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(initialConfig.isSidebarCollapsed);
  const [tabOrder, setTabOrder] = useState<string[]>(initialConfig.tabOrder);
  const [closedTabs, setClosedTabs] = useState<string[]>(initialConfig.closedTabs);
  const [panels, setPanels] = useState<Record<string, PanelState>>(initialConfig.panels);
  const [drawers, setDrawers] = useState<Record<string, boolean>>({
    findingsInspector: false,
    aiMentorDrawer: false,
    workspaceControls: false,
    navDrawer: false,
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      const config = {
        preset,
        density,
        sidebarWidth,
        isSidebarCollapsed,
        tabOrder,
        closedTabs,
        panels,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [preset, density, sidebarWidth, isSidebarCollapsed, tabOrder, closedTabs, panels]);

  // Sync CSS density variables to document root
  useEffect(() => {
    const root = document.documentElement;
    if (density === "compact") {
      root.style.setProperty("--density-padding-y", "4px");
      root.style.setProperty("--density-padding-x", "10px");
      root.style.setProperty("--density-card-padding", "12px");
      root.style.setProperty("--density-table-y", "6px");
      root.style.setProperty("--density-table-x", "10px");
      root.classList.add("density-compact");
    } else if (density === "spacious") {
      root.style.setProperty("--density-padding-y", "12px");
      root.style.setProperty("--density-padding-x", "20px");
      root.style.setProperty("--density-card-padding", "24px");
      root.style.setProperty("--density-table-y", "14px");
      root.style.setProperty("--density-table-x", "16px");
      root.classList.remove("density-compact");
    } else {
      root.style.removeProperty("--density-padding-y");
      root.style.removeProperty("--density-padding-x");
      root.style.removeProperty("--density-card-padding");
      root.style.removeProperty("--density-table-y");
      root.style.removeProperty("--density-table-x");
      root.classList.remove("density-compact");
    }
  }, [density]);

  // Set Preset with responsive geometry updates
  const setPreset = useCallback((newPreset: WorkspacePreset) => {
    setPresetState(newPreset);
    if (newPreset === "compact") {
      setDensityState("compact");
      setIsSidebarCollapsed(true);
      setSidebarWidthState(64);
    } else if (newPreset === "analyst") {
      setDensityState("compact");
      setIsSidebarCollapsed(false);
      setSidebarWidthState(240);
      setPanels((prev) => ({
        ...prev,
        findings_table: { ...prev.findings_table, visible: true, maximized: false },
        finding_details: { ...prev.finding_details, visible: true, minimized: false },
      }));
    } else if (newPreset === "pentest") {
      setDensityState("normal");
      setIsSidebarCollapsed(false);
      setSidebarWidthState(220);
      setPanels((prev) => ({
        ...prev,
        scan_console: { ...prev.scan_console, visible: true, minimized: false },
      }));
    } else if (newPreset === "api") {
      setDensityState("normal");
      setIsSidebarCollapsed(false);
      setSidebarWidthState(220);
    } else if (newPreset === "learning") {
      setDensityState("spacious");
      setIsSidebarCollapsed(false);
      setSidebarWidthState(220);
    } else {
      // Default
      setDensityState("normal");
      setIsSidebarCollapsed(false);
      setSidebarWidthState(250);
    }
  }, []);

  const setDensity = useCallback((newDensity: WorkspaceDensity) => {
    setDensityState(newDensity);
  }, []);

  const setSidebarWidth = useCallback((width: number) => {
    setSidebarWidthState(Math.max(60, Math.min(420, width)));
    if (width <= 80) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarWidthState(next ? 64 : 250);
      return next;
    });
  }, []);

  // Panel actions with O(1) direct keyed mutations
  const minimizePanel = useCallback((id: string) => {
    setPanels((prev) => {
      const panel = prev[id];
      if (!panel) return prev;
      return {
        ...prev,
        [id]: {
          ...panel,
          minimized: true,
          maximized: false,
          previousDimensions: { width: panel.width, height: panel.height },
        },
      };
    });
  }, []);

  const maximizePanel = useCallback((id: string) => {
    setPanels((prev) => {
      const panel = prev[id];
      if (!panel) return prev;
      return {
        ...prev,
        [id]: {
          ...panel,
          maximized: true,
          minimized: false,
          collapsed: false,
          previousDimensions: { width: panel.width, height: panel.height },
        },
      };
    });
  }, []);

  const restorePanel = useCallback((id: string) => {
    setPanels((prev) => {
      const panel = prev[id];
      if (!panel) return prev;
      return {
        ...prev,
        [id]: {
          ...panel,
          minimized: false,
          maximized: false,
          collapsed: false,
          width: panel.previousDimensions?.width ?? panel.width,
          height: panel.previousDimensions?.height ?? panel.height,
        },
      };
    });
  }, []);

  const collapsePanel = useCallback((id: string) => {
    setPanels((prev) => {
      const panel = prev[id];
      if (!panel) return prev;
      return {
        ...prev,
        [id]: {
          ...panel,
          collapsed: !panel.collapsed,
        },
      };
    });
  }, []);

  const togglePanelVisibility = useCallback((id: string, visible?: boolean) => {
    setPanels((prev) => {
      const panel = prev[id];
      if (!panel) return prev;
      const nextVisible = visible !== undefined ? visible : !panel.visible;
      return {
        ...prev,
        [id]: {
          ...panel,
          visible: nextVisible,
          minimized: nextVisible ? panel.minimized : false,
        },
      };
    });
  }, []);

  // Minimized panels list for the dock bar
  const minimizedPanels = useMemo(() => {
    return Object.values(panels).filter((p) => p.visible && p.minimized);
  }, [panels]);

  // Tab operations
  const reorderTabs = useCallback((sourceIndex: number, destinationIndex: number) => {
    setTabOrder((prev) => {
      if (
        sourceIndex < 0 ||
        sourceIndex >= prev.length ||
        destinationIndex < 0 ||
        destinationIndex >= prev.length ||
        sourceIndex === destinationIndex
      ) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(destinationIndex, 0, moved);
      return updated;
    });
  }, []);

  const closeTab = useCallback(
    (tabId: string, activeTab: string, onSelectTab: (tabId: string) => void) => {
      setClosedTabs((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
      // If the currently active tab was closed, pick the next available visible tab
      if (activeTab === tabId) {
        const remaining = tabOrder.filter((id) => id !== tabId && !closedTabs.includes(id));
        if (remaining.length > 0) {
          onSelectTab(remaining[0]);
        } else {
          onSelectTab("analytics"); // Safe fallback
        }
      }
    },
    [tabOrder, closedTabs]
  );

  const reopenTab = useCallback(
    (tabId: string, onSelectTab?: (tabId: string) => void) => {
      setClosedTabs((prev) => prev.filter((id) => id !== tabId));
      if (!tabOrder.includes(tabId)) {
        setTabOrder((prev) => [...prev, tabId]);
      }
      if (onSelectTab) {
        onSelectTab(tabId);
      }
    },
    [tabOrder]
  );

  const restoreAllTabs = useCallback(() => {
    setClosedTabs([]);
    setTabOrder(DEFAULT_TAB_ORDER);
  }, []);

  const resetTabOrder = useCallback(() => {
    setTabOrder(DEFAULT_TAB_ORDER);
    setClosedTabs([]);
  }, []);

  // Drawers
  const openDrawer = useCallback((drawerId: string) => {
    setDrawers((prev) => ({ ...prev, [drawerId]: true }));
  }, []);

  const closeDrawer = useCallback((drawerId: string) => {
    setDrawers((prev) => ({ ...prev, [drawerId]: false }));
  }, []);

  const toggleDrawer = useCallback((drawerId: string) => {
    setDrawers((prev) => ({ ...prev, [drawerId]: !prev[drawerId] }));
  }, []);

  // Global reset
  const resetWorkspaceLayout = useCallback(() => {
    setPresetState("default");
    setDensityState("normal");
    setSidebarWidthState(250);
    setIsSidebarCollapsed(false);
    setTabOrder(DEFAULT_TAB_ORDER);
    setClosedTabs([]);
    setPanels(DEFAULT_PANELS);
    setDrawers({
      findingsInspector: false,
      aiMentorDrawer: false,
      workspaceControls: false,
      navDrawer: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: WorkspaceContextValue = {
    panels,
    minimizedPanels,
    minimizePanel,
    maximizePanel,
    restorePanel,
    collapsePanel,
    togglePanelVisibility,
    tabOrder,
    closedTabs,
    reorderTabs,
    closeTab,
    reopenTab,
    restoreAllTabs,
    resetTabOrder,
    preset,
    setPreset,
    density,
    setDensity,
    sidebarWidth,
    setSidebarWidth,
    isSidebarCollapsed,
    toggleSidebar,
    drawers,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    resetWorkspaceLayout,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    // Provide a safe fallback mock context so unit tests without WorkspaceProvider don't crash
    return {
      panels: DEFAULT_PANELS,
      minimizedPanels: [],
      minimizePanel: () => {},
      maximizePanel: () => {},
      restorePanel: () => {},
      collapsePanel: () => {},
      togglePanelVisibility: () => {},
      tabOrder: DEFAULT_TAB_ORDER,
      closedTabs: [],
      reorderTabs: () => {},
      closeTab: () => {},
      reopenTab: () => {},
      restoreAllTabs: () => {},
      resetTabOrder: () => {},
      preset: "default",
      setPreset: () => {},
      density: "normal",
      setDensity: () => {},
      sidebarWidth: 250,
      setSidebarWidth: () => {},
      isSidebarCollapsed: false,
      toggleSidebar: () => {},
      drawers: {},
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleDrawer: () => {},
      resetWorkspaceLayout: () => {},
    };
  }
  return ctx;
};
