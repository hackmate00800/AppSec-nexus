import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DraggableDashboard, DashboardWidget } from "../components/ui/DraggableDashboard";
import { IssueCenter } from "../components/issues/IssueCenter";
import { NavigationBreadcrumbs } from "../components/ui/NavigationBreadcrumbs";
import { Target, IssueRecord } from "../types";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

const mockTargets: Target[] = [
  {
    id: "target-alpha",
    name: "Production API",
    primary_url: "https://api.domain.com",
    created_at: new Date().toISOString(),
    scope: {
      allowed_hosts: ["api.domain.com"],
      allowed_prefixes: ["https://api.domain.com"],
      allowed_ports: [443],
      excluded_paths: [],
      allow_local_lab: false,
    },
  },
];

const mockIssues: IssueRecord[] = [
  {
    id: "issue-1",
    title: "SQL Injection in User Authentication",
    category: "SecurityVulnerability",
    subtype: "SQLi",
    severity: "Critical",
    status: "Investigating",
    verification_status: "HumanVerified",
    affected_target_id: "target-alpha",
    affected_target_name: "Production API",
    affected_component: "/api/v1/auth/login",
    source: "Scanner",
    occurrence_count: 3,
    first_detected: new Date().toISOString(),
    last_detected: new Date().toISOString(),
    description: "Blind SQL injection via login username parameter",
    remediation_guidance: "Use parameterized queries.",
    tags_json: "[]",
    notes_json: "[]",
    history_json: "[]",
    fingerprint: "fp-issue-1",
  },
  {
    id: "issue-2",
    title: "Broken Object Level Authorization (BOLA)",
    category: "SecurityVulnerability",
    subtype: "BOLA",
    severity: "High",
    status: "Confirmed",
    verification_status: "NeedsValidation",
    affected_target_id: "target-alpha",
    affected_target_name: "Production API",
    affected_component: "/api/v1/users/{id}",
    source: "ManualReport",
    occurrence_count: 1,
    first_detected: new Date().toISOString(),
    last_detected: new Date().toISOString(),
    description: "User ID parameter can be modified to read other accounts",
    remediation_guidance: "Enforce ownership validation.",
    tags_json: "[]",
    notes_json: "[]",
    history_json: "[]",
    fingerprint: "fp-issue-2",
  },
  {
    id: "issue-3",
    title: "CORS Misconfiguration on Public Endpoints",
    category: "SecurityVulnerability",
    subtype: "CORS",
    severity: "Medium",
    status: "Fixed",
    verification_status: "RetestedValid",
    affected_target_id: "target-alpha",
    affected_target_name: "Production API",
    affected_component: "/api/v1/public",
    source: "Scanner",
    occurrence_count: 1,
    first_detected: new Date().toISOString(),
    last_detected: new Date().toISOString(),
    description: "Wildcard CORS with credentials enabled",
    remediation_guidance: "Restrict AllowedOrigins.",
    tags_json: "[]",
    notes_json: "[]",
    history_json: "[]",
    fingerprint: "fp-issue-3",
  },
];

describe("Drag-and-Drop Cards, Kanban Triage & Keyboard Accessibility Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_issues") {
        return Promise.resolve(mockIssues);
      }
      if (cmd === "bulk_update_issue_status") {
        return Promise.resolve(1);
      }
      return Promise.resolve(null);
    });
  });

  describe("DraggableDashboard Keyboard Accessibility & Pinning", () => {
    const mockWidgets: DashboardWidget[] = [
      { id: "widget-a", title: "Asset Security Posture", render: () => <div>Widget A Content</div> },
      { id: "widget-b", title: "Severity Distribution Chart", render: () => <div>Widget B Content</div> },
      { id: "widget-c", title: "Compliance Scorecard", render: () => <div>Widget C Content</div> },
    ];

    it("renders all dashboard widget cards with drag handles and keyboard controls", () => {
      render(<DraggableDashboard widgets={mockWidgets} storageKey="test_dash" />);

      expect(screen.getByText("Asset Security Posture")).toBeInTheDocument();
      expect(screen.getByText("Severity Distribution Chart")).toBeInTheDocument();
      expect(screen.getByText("Compliance Scorecard")).toBeInTheDocument();

      // Check keyboard reorder buttons
      expect(screen.getByLabelText("Move Asset Security Posture down")).toBeInTheDocument();
      expect(screen.getByLabelText("Move Severity Distribution Chart up")).toBeInTheDocument();
    });

    it("allows reordering widgets using keyboard Move Up and Move Down buttons", () => {
      render(<DraggableDashboard widgets={mockWidgets} storageKey="test_dash" />);

      // Initially Widget A is first
      const moveADownBtn = screen.getByLabelText("Move Asset Security Posture down");
      fireEvent.click(moveADownBtn);

      // Verify layout order changed in localStorage
      const savedOrder = JSON.parse(localStorage.getItem("test_dash_order") || "[]");
      expect(savedOrder[0]).toBe("widget-b");
      expect(savedOrder[1]).toBe("widget-a");
    });

    it("allows pinning cards to the top of the dashboard", () => {
      render(<DraggableDashboard widgets={mockWidgets} storageKey="test_dash" />);

      // Pin widget C
      const pinCBtn = screen.getByLabelText("Pin Compliance Scorecard");
      fireEvent.click(pinCBtn);

      // Verify widget C is marked pinned in localStorage
      const savedPinned = JSON.parse(localStorage.getItem("test_dash_pinned") || "{}");
      expect(savedPinned["widget-c"]).toBe(true);

      // Widget C should now appear first because pinned cards float to top
      const allHeaders = screen.getAllByText(/(Asset Security Posture|Severity Distribution Chart|Compliance Scorecard)/);
      expect(allHeaders[0].textContent).toBe("Compliance Scorecard");
    });

    it("allows maximizing a widget card to full width and restoring it", () => {
      render(<DraggableDashboard widgets={mockWidgets} storageKey="test_dash" />);

      const maxBtn = screen.getByLabelText("Maximize Asset Security Posture");
      fireEvent.click(maxBtn);

      // When maximized, only the maximized widget is shown
      expect(screen.getByText("Asset Security Posture")).toBeInTheDocument();
      expect(screen.queryByText("Severity Distribution Chart")).not.toBeInTheDocument();

      // Restore it
      const restoreBtn = screen.getByLabelText("Restore Asset Security Posture");
      fireEvent.click(restoreBtn);

      expect(screen.getByText("Severity Distribution Chart")).toBeInTheDocument();
    });
  });

  describe("IssueCenter Kanban Drag-and-Drop Board View", () => {
    it("renders Table View initially and toggles to Kanban Board", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-alpha" />);

      await waitFor(() => {
        expect(screen.getByText("Issue Documentation & Tracking Center")).toBeInTheDocument();
        expect(screen.getByText("SQL Injection in User Authentication")).toBeInTheDocument();
      });

      // Switch to Kanban Board
      const kanbanBtn = screen.getByTitle("Display issues in interactive Drag-and-Drop Kanban Board");
      fireEvent.click(kanbanBtn);

      // Columns should be present
      expect(screen.getAllByText("Investigating").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Confirmed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Fixed").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Closed / Accepted")).toBeInTheDocument();
    });

    it("allows moving issue status via keyboard accessible arrow buttons in Kanban mode", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-alpha" />);

      await waitFor(() => {
        expect(screen.getByText("SQL Injection in User Authentication")).toBeInTheDocument();
      });

      // Switch to Kanban
      const kanbanBtn = screen.getByTitle("Display issues in interactive Drag-and-Drop Kanban Board");
      fireEvent.click(kanbanBtn);

      // Advance issue-1 (status: Investigating) to next status (Confirmed)
      const forwardBtns = screen.getAllByTitle("Move status forward (Keyboard accessible)");
      fireEvent.click(forwardBtns[0]);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("bulk_update_issue_status", {
          ids: ["issue-1"],
          status: "Confirmed",
        });
      });
    });
  });

  describe("NavigationBreadcrumbs Component", () => {
    it("renders breadcrumbs trail, back button when finding is selected, and active target", () => {
      const handleNavigate = vi.fn();
      const handleCloseFinding = vi.fn();
      const handleSelectTarget = vi.fn();

      const selectedFinding = {
        id: "f-1",
        title: "Remote Code Execution via Insecure Deserialization",
        severity: "Critical",
      } as any;

      render(
        <NavigationBreadcrumbs
          activeTab="findings"
          onNavigateTab={handleNavigate}
          targets={mockTargets}
          selectedTarget={mockTargets[0]}
          onSelectTarget={handleSelectTarget}
          selectedFinding={selectedFinding}
          onCloseFinding={handleCloseFinding}
        />
      );

      expect(screen.getByText("AppSec Nexus")).toBeInTheDocument();
      expect(screen.getByText("Findings & Intel")).toBeInTheDocument();
      expect(screen.getByText("Vulnerability Findings")).toBeInTheDocument();
      expect(screen.getByText("Remote Code Execution via Insecure Deserialization")).toBeInTheDocument();

      // Back to list button
      const backBtn = screen.getByTitle("Back to Findings list (Esc)");
      fireEvent.click(backBtn);
      expect(handleCloseFinding).toHaveBeenCalledTimes(1);
    });
  });
});
