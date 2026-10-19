import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "../App";
import { IssueCenter } from "../components/issues/IssueCenter";
import { IssueCreateModal } from "../components/issues/IssueCreateModal";
import { IssueDetailModal } from "../components/issues/IssueDetailModal";
import { IssueEditModal } from "../components/issues/IssueEditModal";
import { ReportGeneratorModal } from "../components/issues/ReportGeneratorModal";
import { invoke } from "@tauri-apps/api/core";
import { IssueRecord, Target } from "../types";

const mockTargets: Target[] = [
  {
    id: "target-1",
    name: "Test Shop Lab",
    primary_url: "http://localhost:3000",
    created_at: "2026-10-15T00:00:00Z",
    scope: {
      allowed_hosts: ["localhost"],
      allowed_prefixes: ["http://localhost:3000"],
      allowed_ports: [3000],
      excluded_paths: [],
      allow_local_lab: true,
    },
  },
];

const sampleIssue: IssueRecord = {
  id: "ISS-001",
  title: "Reflected XSS in Search Query Parameter",
  category: "SecurityVulnerability",
  subtype: "CWE-79",
  severity: "High",
  status: "Open",
  verification_status: "NeedsValidation",
  affected_target_id: "target-1",
  affected_target_name: "Test Shop Lab",
  affected_component: "http://localhost:3000/search?q=",
  source: "Scanner",
  occurrence_count: 2,
  first_detected: "2026-10-15T10:00:00Z",
  last_detected: "2026-10-17T12:00:00Z",
  description: "User input injected into search parameter is rendered without HTML encoding.",
  reproduction_steps: "1. Open /search?q=<script>alert(1)</script>\n2. Notice popup",
  expected_behavior: "Script tag should be context encoded",
  actual_behavior: "Script executed in browser context",
  error_details: null,
  evidence: "<script>alert(1)</script>",
  root_cause: "Missing innerHTML encoding in search view template",
  impact_assessment: "Session hijacking or CSRF execution",
  remediation_guidance: "Use textContent or escapeHtml helper",
  tags_json: JSON.stringify(["xss", "frontend", "critical"]),
  assigned_owner: "AppSec Team",
  notes_json: JSON.stringify([
    {
      id: "note-1",
      author: "Analyst",
      text: "Verified on staging environment",
      timestamp: "2026-10-17T12:30:00Z",
    },
  ]),
  related_finding_id: "f-1",
  related_tool_id: "nuclei",
  history_json: JSON.stringify([
    {
      timestamp: "2026-10-15T10:00:00Z",
      action: "CREATED",
      actor: "Scanner",
      details: "Initial discovery",
    },
    {
      timestamp: "2026-10-17T12:00:00Z",
      action: "REOCCURRENCE",
      actor: "Scanner",
      details: "Re-detected in scan run",
    },
  ]),
  resolution_summary: null,
  resolved_at: null,
  fingerprint: "fp-xss-mock",
};

describe("Issue Documentation, Tracking & Export System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. IssueCenter component tests
  describe("IssueCenter Core View", () => {
    it("renders IssueCenter header, metric cards, and initial issue rows", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-1" />);

      // Verify Header
      expect(screen.getByText("Issue Documentation & Tracking Center")).toBeInTheDocument();
      expect(
        screen.getByText(/Unified defect, bug, and vulnerability tracking across security scanners/i)
      ).toBeInTheDocument();

      // Verify action buttons
      expect(screen.getByRole("button", { name: /Report New Issue/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Generate Formal Report/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Export JSON/i })).toBeInTheDocument();

      // Verify category filter pills
      expect(screen.getByRole("button", { name: "All Categories" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Security Vulns" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Bugs" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "UI / UX" })).toBeInTheDocument();

      // Wait for issues to load from mock
      await waitFor(() => {
        expect(screen.getByText("Reflected XSS in Search Query Parameter")).toBeInTheDocument();
        expect(screen.getByText("Sidebar fails to collapse on mobile viewports")).toBeInTheDocument();
      });

      // Verify Metrics
      expect(screen.getByText("Total Documented")).toBeInTheDocument();
      expect(screen.getByText("Critical & High")).toBeInTheDocument();
      expect(screen.getAllByText("Security Vulns").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Bugs & Glitches")).toBeInTheDocument();
      expect(screen.getByText("Resolution Rate")).toBeInTheDocument();
    });

    it("filters issues when category filter pill is clicked", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-1" />);

      await waitFor(() => {
        expect(screen.getByText("Reflected XSS in Search Query Parameter")).toBeInTheDocument();
      });

      // Click "UI / UX" filter pill
      const uiPill = screen.getByRole("button", { name: "UI / UX" });
      await act(async () => {
        fireEvent.click(uiPill);
      });

      // Verified invocation of get_issues with category: "UiUxGlitch"
      expect(invoke).toHaveBeenCalledWith("get_issues", expect.objectContaining({
        category: "UiUxGlitch",
      }));
    });

    it("allows searching issues by text query", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-1" />);

      const searchInput = screen.getByPlaceholderText(/Search by ID, title, affected component/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "Search Query" } });
      });

      const searchForm = searchInput.closest("form");
      if (searchForm) {
        await act(async () => {
          fireEvent.submit(searchForm);
        });
      }

      expect(invoke).toHaveBeenCalledWith("get_issues", expect.objectContaining({
        search: "Search Query",
      }));
    });

    it("supports multi-selection and bulk status updates", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-1" />);

      await waitFor(() => {
        expect(screen.getByText("Reflected XSS in Search Query Parameter")).toBeInTheDocument();
      });

      // Click "Select all issues on page" checkbox
      const selectAllCheckbox = screen.getByLabelText("Select all issues on page");
      await act(async () => {
        fireEvent.click(selectAllCheckbox);
      });

      // Check that bulk toolbar appears
      expect(screen.getByText(/issue\(s\) selected/i)).toBeInTheDocument();

      // Click Apply bulk status
      const applyBtn = screen.getByRole("button", { name: "Apply" });
      await act(async () => {
        fireEvent.click(applyBtn);
      });

      expect(invoke).toHaveBeenCalledWith("bulk_update_issue_status", expect.objectContaining({
        ids: expect.arrayContaining(["ISS-001", "ISS-002"]),
        status: "Confirmed",
      }));
    });

    it("supports bulk deletion of selected issues with confirmation modal", async () => {
      render(<IssueCenter targets={mockTargets} currentTargetId="target-1" />);

      await waitFor(() => {
        expect(screen.getByText("Reflected XSS in Search Query Parameter")).toBeInTheDocument();
      });

      // Select all issues
      const selectAllCheckbox = screen.getByLabelText("Select all issues on page");
      await act(async () => {
        fireEvent.click(selectAllCheckbox);
      });

      // Click Delete Selected
      const deleteSelectedBtn = screen.getByRole("button", { name: /Delete Selected/i });
      await act(async () => {
        fireEvent.click(deleteSelectedBtn);
      });

      // Confirmation modal should open
      expect(screen.getByText("Bulk Delete Documented Issues")).toBeInTheDocument();

      // Confirm deletion in modal
      const confirmDeleteButtons = screen.getAllByRole("button", { name: "Delete Selected" });
      const modalConfirmBtn = confirmDeleteButtons[confirmDeleteButtons.length - 1];
      await act(async () => {
        fireEvent.click(modalConfirmBtn);
      });

      expect(invoke).toHaveBeenCalledWith("bulk_delete_issues", expect.objectContaining({
        ids: expect.arrayContaining(["ISS-001", "ISS-002"]),
      }));
    });
  });

  // 2. IssueCreateModal tests
  describe("IssueCreateModal", () => {
    it("renders create form, changes category template, and submits new issue", async () => {
      const onCreated = vi.fn();
      const onClose = vi.fn();

      render(
        <IssueCreateModal
          isOpen={true}
          targets={mockTargets}
          onCreated={onCreated}
          onClose={onClose}
        />
      );

      expect(screen.getByText("Document New Issue or Defect")).toBeInTheDocument();

      // Select category dropdown
      const categorySelect = screen.getByDisplayValue("Functional Bug / Logic Defect");
      fireEvent.change(categorySelect, { target: { value: "FunctionalBug" } });

      // Fill in fields
      fireEvent.change(screen.getByPlaceholderText(/e\.g\., Navigation sidebar does not collapse/i), {
        target: { value: "Crash when clicking export without records" },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\., \/api\/v1\/auth\/login or SidebarNav\.tsx/i), {
        target: { value: "ExportModal.tsx:handleExport" },
      });
      fireEvent.change(screen.getByPlaceholderText(/Explain the background, symptoms, and impact/i), {
        target: { value: "Null pointer error thrown when records array is empty." },
      });

      // Submit form
      const submitBtn = screen.getByRole("button", { name: /Document Issue/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(invoke).toHaveBeenCalledWith("record_issue", expect.objectContaining({
        payload: expect.objectContaining({
          title: "Crash when clicking export without records",
          affected_component: "ExportModal.tsx:handleExport",
          description: "Null pointer error thrown when records array is empty.",
          category: "FunctionalBug",
        }),
      }));

      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("displays validation error when required fields are missing", async () => {
      render(
        <IssueCreateModal
          isOpen={true}
          targets={mockTargets}
          onCreated={() => {}}
          onClose={() => {}}
        />
      );

      const submitBtn = screen.getByRole("button", { name: /Document Issue/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(screen.getByText("Issue title is required.")).toBeInTheDocument();
    });
  });

  // 3. IssueDetailModal tests
  describe("IssueDetailModal", () => {
    it("displays full issue details, notes, and reproduction steps", () => {
      render(
        <IssueDetailModal
          isOpen={true}
          issue={sampleIssue}
          onClose={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onUpdate={() => {}}
        />
      );

      expect(screen.getByText("Reflected XSS in Search Query Parameter")).toBeInTheDocument();
      expect(screen.getByText("http://localhost:3000/search?q=")).toBeInTheDocument();
      expect(screen.getByText("User input injected into search parameter is rendered without HTML encoding.")).toBeInTheDocument();
      expect(screen.getByText(/1\. Open \/search\?q=<script>alert\(1\)<\/script>/)).toBeInTheDocument();
      expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();

      // Verify existing note
      expect(screen.getByText("Verified on staging environment")).toBeInTheDocument();
      expect(screen.getByText("Analyst")).toBeInTheDocument();
    });

    it("submits a new analyst note and updates record", async () => {
      const onUpdate = vi.fn();
      render(
        <IssueDetailModal
          isOpen={true}
          issue={sampleIssue}
          onClose={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onUpdate={onUpdate}
        />
      );

      const noteInput = screen.getByPlaceholderText(/Type note or retest observation/i);
      fireEvent.change(noteInput, {
        target: { value: "Retested against patch build v1.2 - vulnerability successfully mitigated." },
      });

      const addNoteBtn = screen.getByRole("button", { name: /Add Note/i });
      await act(async () => {
        fireEvent.click(addNoteBtn);
      });

      expect(invoke).toHaveBeenCalledWith("add_issue_note", expect.objectContaining({
        id: "ISS-001",
        text: "Retested against patch build v1.2 - vulnerability successfully mitigated.",
      }));

      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("supports quick status changes from detail modal", async () => {
      const onUpdate = vi.fn();
      render(
        <IssueDetailModal
          isOpen={true}
          issue={sampleIssue}
          onClose={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onUpdate={onUpdate}
        />
      );

      const markConfirmedBtn = screen.getByRole("button", { name: "Mark Confirmed" });
      await act(async () => {
        fireEvent.click(markConfirmedBtn);
      });

      expect(invoke).toHaveBeenCalledWith("update_issue", expect.objectContaining({
        id: "ISS-001",
        payload: { status: "Confirmed" },
      }));

      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // 4. IssueEditModal tests
  describe("IssueEditModal", () => {
    it("populates existing issue details, edits fields, and saves", async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <IssueEditModal
          isOpen={true}
          issue={sampleIssue}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByText("Edit Issue [ISS-001]")).toBeInTheDocument();

      // Edit title and severity
      const titleInput = screen.getByDisplayValue("Reflected XSS in Search Query Parameter");
      fireEvent.change(titleInput, { target: { value: "Reflected XSS in Search Query Parameter [Updated]" } });

      const severitySelect = screen.getByDisplayValue("High");
      fireEvent.change(severitySelect, { target: { value: "Critical" } });

      // Save
      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(invoke).toHaveBeenCalledWith("update_issue", expect.objectContaining({
        id: "ISS-001",
        payload: expect.objectContaining({
          title: "Reflected XSS in Search Query Parameter [Updated]",
          severity: "Critical",
        }),
      }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // 5. ReportGeneratorModal tests
  describe("ReportGeneratorModal", () => {
    it("renders report generator, selects template, displays preview, and triggers export", async () => {
      const onClose = vi.fn();

      render(
        <ReportGeneratorModal
          isOpen={true}
          issues={[sampleIssue]}
          selectedIssueIds={new Set(["ISS-001"])}
          targets={mockTargets}
          currentTargetId="target-1"
          onClose={onClose}
        />
      );

      expect(screen.getByText("Professional Issue & Vulnerability Report Generator")).toBeInTheDocument();

      // Wait for initial report generation
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("generate_issue_report", expect.any(Object));
      });

      // Switch template via select dropdown
      const templateSelect = screen.getByDisplayValue("Executive Summary & Risk Overview");
      fireEvent.change(templateSelect, { target: { value: "technical_vulnerability" } });

      expect(invoke).toHaveBeenCalledWith("generate_issue_report", expect.objectContaining({
        params: expect.objectContaining({
          template: "technical_vulnerability",
        }),
      }));

      // Verify Export options are present
      expect(screen.getByRole("button", { name: /Print \/ Save as PDF/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Markdown \(\.md\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /JSON \(\.json\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Tabular CSV Spreadsheet/i })).toBeInTheDocument();

      // Click Markdown Export
      const mdBtn = screen.getByRole("button", { name: /Markdown \(\.md\)/i });
      fireEvent.click(mdBtn);

      // Click JSON Export
      const jsonBtn = screen.getByRole("button", { name: /JSON \(\.json\)/i });
      fireEvent.click(jsonBtn);

      // Click CSV Export
      const csvBtn = screen.getByRole("button", { name: /Tabular CSV Spreadsheet/i });
      fireEvent.click(csvBtn);
    });
  });

  // 6. Full App Integration
  describe("Full App Integration - Issues & Reports Tab", () => {
    it("navigates to Issues tab when clicked in sidebar and displays IssueCenter", async () => {
      render(<App />);

      // Find the "Issues & Reports" nav button
      const issuesNavBtn = screen.getByTitle("Issue Documentation & Reports");
      expect(issuesNavBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(issuesNavBtn);
      });

      // Verify that IssueCenter is now mounted
      expect(screen.getByText("Issue Documentation & Tracking Center")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Report New Issue/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Generate Formal Report/i })).toBeInTheDocument();
    });
  });
});
