import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActivityMonitor, ScanEventRecord, AiTaskRecord } from "../activity/ActivityMonitor";
import { InfoButton } from "../components/ui/InfoButton";
import { AppSidebar } from "../components/navigation/AppSidebar";
import { WorkspaceToolbar } from "../components/ui/WorkspaceToolbar";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import { ThemeProvider } from "../theme/ThemeProvider";
import { Target, Finding, ScanResult } from "../types";

// Mock Tauri invoke & listen
const mockEvents: ScanEventRecord[] = [
  {
    id: "evt-101",
    scan_id: "scan-nmap-1",
    job_id: null,
    timestamp: "2026-10-20T12:00:00Z",
    event_type: "tool_executed",
    severity: "info",
    component_or_tool: "nmap",
    message: "Executing tool adapter 'nmap' against target 'https://api.acme.example.com'",
    metadata_json: JSON.stringify({ target_url: "https://api.acme.example.com" }),
    duration_ms: 125,
    status: "running",
  },
  {
    id: "evt-102",
    scan_id: "scan-nmap-1",
    job_id: null,
    timestamp: "2026-10-20T12:00:01Z",
    event_type: "candidate_finding_created",
    severity: "warning",
    component_or_tool: "nmap",
    message: "Tool adapter nmap produced finding: 'Exposed Database Service on Port 3306 (mysql)'",
    metadata_json: JSON.stringify({ cwe: "CWE-284", confidence: 95 }),
    duration_ms: 0,
    status: "success",
    related_finding_id: "f-db-1",
  },
  {
    id: "evt-103",
    scan_id: "scan-nmap-1",
    job_id: null,
    timestamp: "2026-10-20T12:00:02Z",
    event_type: "scan_completed",
    severity: "success",
    component_or_tool: "nmap",
    message: "Tool adapter nmap completed in 125ms. Found 1 findings and 1 endpoints.",
    metadata_json: JSON.stringify({ findings_count: 1, duration_ms: 125 }),
    duration_ms: 125,
    status: "success",
  },
];

const mockAiTasks: AiTaskRecord[] = [
  {
    id: "ai-task-1",
    conversation_id: "conv-101",
    model: "appsec-teacher-8b",
    prompt_preview: "Explain the security implications of CWE-89 in REST APIs",
    status: "Completed",
    system_prompt: "You are an AppSec Mentor",
    messages_json: "[]",
    result: "SQL Injection occurs when user input is concatenated into dynamic SQL...",
    error: null,
    created_at: "2026-10-20T12:05:00Z",
    duration_ms: 450,
  },
];

const mockScanHistory: ScanResult[] = [
  {
    scan_id: "scan-nmap-1",
    target_url: "https://api.acme.example.com",
    tool: "nmap",
    status: "Completed",
    logs: ["[*] Nmap conservative service scan against target: api.acme.example.com", "80/tcp open http"],
    findings_count: 1,
    duration_ms: 125,
  },
];

const mockTarget: Target = {
  id: "target-1",
  name: "Acme Production API",
  primary_url: "https://api.acme.example.com",
  created_at: "2026-10-20T10:00:00Z",
  scope: {
    allowed_hosts: ["api.acme.example.com"],
    allowed_prefixes: ["/v1"],
    allowed_ports: [80, 443],
    excluded_paths: [],
    allow_local_lab: false,
  },
};

const mockFindings: Finding[] = [
  {
    id: "f-db-1",
    target_id: "target-1",
    title: "Exposed Database Service on Port 3306 (mysql)",
    severity: "High",
    confidence: 95,
    affected_asset: "tcp://api.acme.example.com:3306",
    evidence: "3306/tcp open mysql",
    source_tool: "nmap",
    tool_version: "7.92",
    remediation: "Restrict port 3306 behind VPC / security group.",
    status: "New",
    created_at: "2026-10-20T12:00:01Z",
  },
];

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === "get_recent_activity_events" || cmd === "get_scan_events") {
      return Promise.resolve(mockEvents);
    }
    if (cmd === "get_ai_tasks") {
      return Promise.resolve(mockAiTasks);
    }
    return Promise.resolve([]);
  }),
  isTauri: vi.fn(() => true),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe("AppSec UI/UX Bug Fixes, Appearance Controls & Activity Monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Sidebar Single Collapse Button Verification
  it("verifies exactly one collapse/expand button exists in AppSidebar and none in WorkspaceToolbar", () => {
    const onToggleCollapse = vi.fn();

    // Render WorkspaceToolbar
    const { container: toolbarContainer } = render(
      <WorkspaceProvider>
        <WorkspaceToolbar />
      </WorkspaceProvider>
    );

    // Verify upper collapse button is removed from WorkspaceToolbar
    expect(toolbarContainer.querySelector('button[title*="Collapse Sidebar"]')).toBeNull();
    expect(toolbarContainer.querySelector('button[title*="Expand Sidebar"]')).toBeNull();

    // Render AppSidebar
    render(
      <AppSidebar
        activeTab="analytics"
        onSelectTab={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={onToggleCollapse}
        width={240}
        isResizing={false}
        onResizePointerDown={vi.fn()}
        findingsCount={1}
        endpointsCount={2}
        readyToolsCount={4}
        scanHistoryCount={1}
        hasRunningAiTask={false}
      />
    );

    // Verify the one collapse button in the sidebar footer
    const collapseBtn = screen.getByRole("button", { name: /Collapse Sidebar/i });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  // Test 2: InfoButton Component Contextual Help & Dismissal
  it("renders InfoButton, opens contextual popover on activation, and closes on Escape", () => {
    render(
      <InfoButton
        title="OWASP BOLA Testing"
        description="Broken Object Level Authorization allows users to access unauthorized records."
        whyItMatters="Can lead to mass tenant data exfiltration."
        howToUse="Fuzz object IDs with different JWT tokens."
        limitations="Cannot detect multi-step workflow logic flaws."
      />
    );

    const infoTrigger = screen.getByRole("button", { name: /More info about OWASP BOLA Testing/i });
    expect(infoTrigger).toBeInTheDocument();

    // Popover is closed initially
    expect(screen.queryByText(/Broken Object Level Authorization/i)).not.toBeInTheDocument();

    // Click to open popover
    fireEvent.click(infoTrigger);
    expect(screen.getByText(/Broken Object Level Authorization/i)).toBeInTheDocument();
    expect(screen.getByText(/Why It Matters/i)).toBeInTheDocument();
    expect(screen.getByText(/Can lead to mass tenant data exfiltration/i)).toBeInTheDocument();
    expect(screen.getByText(/Important Considerations/i)).toBeInTheDocument();

    // Press Escape to dismiss
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText(/Broken Object Level Authorization/i)).not.toBeInTheDocument();
  });

  // Test 3: Appearance Controls & Live Preview (Phase 5)
  it("renders font size scale options and Live Appearance Preview section", () => {
    render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>
    );

    // Font Scale controls exist
    expect(screen.getByText(/Base Font Size Scale/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compact \(13px\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Default \(14px\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Large \(15px\)/i })).toBeInTheDocument();

    // Live Appearance Preview (Phase 5 C)
    expect(screen.getByTestId("appearance-live-preview")).toBeInTheDocument();
    expect(screen.getByText("Live Appearance Preview")).toBeInTheDocument();
    expect(screen.getByText(/Critical Security Finding: CWE-89 SQL Injection/i)).toBeInTheDocument();
    expect(screen.getByText("Web Pentesting Workbench")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://target.corp.internal/api/v1/auth")).toBeInTheDocument();
  });

  // Test 4: Activity Monitor Overview & Telemetry KPIs
  it("renders Activity Monitor with real telemetry KPIs and allows tab navigation", async () => {
    render(
      <ActivityMonitor
        targets={[mockTarget]}
        selectedTarget={mockTarget}
        scanHistory={mockScanHistory}
        findings={mockFindings}
        onNavigateTab={vi.fn()}
      />
    );

    // Verify Header and InfoButton
    expect(screen.getByText("Activity Monitor & Diagnostics")).toBeInTheDocument();
    expect(screen.getByText(/Scope: Acme Production API/i)).toBeInTheDocument();

    // Verify KPI Cards
    await waitFor(() => {
      expect(screen.getByText("Running Scans")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Active AI Tasks")).toBeInTheDocument();
      expect(screen.getByText("Total Events")).toBeInTheDocument();
    });

    // Sub-Tabs exist
    expect(screen.getByRole("button", { name: /Activity Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tool Executions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Command Inspector/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI Requests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Live Logs/i })).toBeInTheDocument();
  });

  // Test 5: Activity Timeline & Event Detail Modal
  it("renders sequential activity timeline and opens event detail modal upon selection", async () => {
    render(
      <ActivityMonitor
        targets={[mockTarget]}
        selectedTarget={mockTarget}
        scanHistory={mockScanHistory}
        findings={mockFindings}
        onNavigateTab={vi.fn()}
      />
    );

    // Switch to Timeline tab
    fireEvent.click(screen.getByRole("button", { name: /Activity Timeline/i }));

    await waitFor(() => {
      expect(screen.getByText(/Executing tool adapter 'nmap'/i)).toBeInTheDocument();
      expect(screen.getByText(/Tool adapter nmap produced finding/i)).toBeInTheDocument();
    });

    // Click on event card to open detail modal
    fireEvent.click(screen.getByText(/Executing tool adapter 'nmap'/i));

    // Verify modal content
    expect(screen.getByText("Activity Telemetry Detail")).toBeInTheDocument();
    expect(screen.getAllByText("tool_executed").length).toBeGreaterThanOrEqual(2);

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(screen.queryByText("Activity Telemetry Detail")).not.toBeInTheDocument();
  });

  // Test 6: Command Inspector with bounded argument arrays
  it("displays Command Inspector with safe executable invocations and bounded argument arrays", async () => {
    render(
      <ActivityMonitor
        targets={[mockTarget]}
        selectedTarget={mockTarget}
        scanHistory={mockScanHistory}
        findings={mockFindings}
        onNavigateTab={vi.fn()}
      />
    );

    // Switch to Command Inspector tab
    fireEvent.click(screen.getByRole("button", { name: /Command Inspector/i }));

    await waitFor(() => {
      expect(screen.getByText(/Direct Executable Invocations Only/i)).toBeInTheDocument();
      expect(screen.getByText("tools/bin/nmap/nmap-7.92/nmap.exe")).toBeInTheDocument();
      expect(screen.getByText("-sT")).toBeInTheDocument();
      expect(screen.getByText("-Pn")).toBeInTheDocument();
      expect(screen.getByText("-sV")).toBeInTheDocument();
      expect(screen.getByText("Copy Command")).toBeInTheDocument();
    });
  });

  // Test 7: AI Requests Monitor
  it("renders AI Requests monitor displaying model, prompt preview, and execution duration", async () => {
    render(
      <ActivityMonitor
        targets={[mockTarget]}
        selectedTarget={mockTarget}
        scanHistory={mockScanHistory}
        findings={mockFindings}
        onNavigateTab={vi.fn()}
      />
    );

    // Switch to AI Requests tab
    fireEvent.click(screen.getByRole("button", { name: /AI Requests/i }));

    await waitFor(() => {
      expect(screen.getByText("appsec-teacher-8b")).toBeInTheDocument();
      expect(screen.getByText(/Explain the security implications of CWE-89/i)).toBeInTheDocument();
      expect(screen.getByText(/SQL Injection occurs when user input/i)).toBeInTheDocument();
    });
  });
});
