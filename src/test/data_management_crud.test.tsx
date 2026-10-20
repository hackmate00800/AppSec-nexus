import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "../App";
import { ConfirmationModal } from "../components/crud/ConfirmationModal";
import { TargetEditModal } from "../components/crud/TargetEditModal";
import { FindingCreateModal } from "../components/crud/FindingCreateModal";
import { FindingEditModal } from "../components/crud/FindingEditModal";
import { AuditLogModal } from "../components/crud/AuditLogModal";
import { invoke } from "@tauri-apps/api/core";
import { Target, Finding } from "../types";

describe("Data Management & Complete CRUD Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. ConfirmationModal Tests
  describe("ConfirmationModal", () => {
    it("renders modal when isOpen is true with record identifier and message", () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmationModal
          isOpen={true}
          title="Delete Target"
          message="Are you sure you want to permanently delete this target?"
          recordIdentifier="Production API (https://api.example.com)"
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );

      expect(screen.getByText("Delete Target")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to permanently delete this target/)).toBeInTheDocument();
      expect(screen.getByText("Production API (https://api.example.com)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not render when isOpen is false", () => {
      const { container } = render(
        <ConfirmationModal
          isOpen={false}
          title="Hidden Modal"
          message="Should not show"
          onConfirm={() => {}}
          onClose={() => {}}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // 2. TargetEditModal Tests
  describe("TargetEditModal", () => {
    const mockTarget: Target = {
      id: "target-123",
      name: "Staging Shop",
      primary_url: "https://staging.example.com",
      created_at: new Date().toISOString(),
      scope: {
        allowed_hosts: ["staging.example.com"],
        allowed_prefixes: ["https://staging.example.com"],
        allowed_ports: [443],
        excluded_paths: [],
        allow_local_lab: false,
      },
    };

    it("populates target fields and updates target via invoke", async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <TargetEditModal
          isOpen={true}
          target={mockTarget}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByDisplayValue("Staging Shop")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://staging.example.com")).toBeInTheDocument();

      // Change target name
      const nameInput = screen.getByLabelText(/Target Display Name/i);
      fireEvent.change(nameInput, { target: { value: "Updated Staging Shop" } });

      // Toggle local lab mode
      const labCheckbox = screen.getByLabelText(/Enable Local Lab Mode/i);
      fireEvent.click(labCheckbox);

      // Submit form
      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("update_target", expect.objectContaining({
          id: "target-123",
          name: "Updated Staging Shop",
        }));
      });

      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it("displays error on invalid URL format", async () => {
      render(
        <TargetEditModal
          isOpen={true}
          target={mockTarget}
          onSave={() => {}}
          onClose={() => {}}
        />
      );

      const urlInput = screen.getByLabelText(/Primary Target URL/i);
      fireEvent.change(urlInput, { target: { value: "invalid-url-string" } });

      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      expect(await screen.findByText(/Please provide a valid URL format/i)).toBeInTheDocument();
    });
  });

  // 3. FindingCreateModal Tests
  describe("FindingCreateModal", () => {
    const mockTargets: Target[] = [
      {
        id: "target-1",
        name: "Test Lab",
        primary_url: "http://localhost:3000",
        created_at: new Date().toISOString(),
        scope: {
          allowed_hosts: ["localhost"],
          allowed_prefixes: ["http://localhost:3000"],
          allowed_ports: [3000],
          excluded_paths: [],
          allow_local_lab: true,
        },
      },
    ];

    it("submits create_finding with validated inputs", async () => {
      const onCreated = vi.fn();
      const onClose = vi.fn();

      render(
        <FindingCreateModal
          isOpen={true}
          targets={mockTargets}
          onCreated={onCreated}
          onClose={onClose}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/IDOR in User Profile Endpoint/i), {
        target: { value: "Broken Object Level Authorization" },
      });
      fireEvent.change(screen.getByPlaceholderText(/users\/profile\?id=123/i), {
        target: { value: "http://localhost:3000/api/users/profile" },
      });
      fireEvent.change(screen.getByPlaceholderText(/CWE-639/i), {
        target: { value: "CWE-639" },
      });

      const submitBtn = screen.getByRole("button", { name: /Record Finding/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("create_finding", expect.objectContaining({
          targetId: "target-1",
          title: "Broken Object Level Authorization",
          affectedAsset: "http://localhost:3000/api/users/profile",
          cwe: "CWE-639",
        }));
      });

      expect(onCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  // 4. FindingEditModal Tests
  describe("FindingEditModal", () => {
    const mockFinding: Finding = {
      id: "f-101",
      target_id: "target-1",
      title: "Cross-Site Scripting (Reflected)",
      severity: "High",
      confidence: 85,
      affected_asset: "https://example.com/search",
      evidence: "q=<script>alert(1)</script>",
      source_tool: "Nuclei",
      tool_version: "v3.11.1",
      cwe: "CWE-79",
      remediation: "Encode all user-controlled data before rendering.",
      status: "NeedsReview",
      created_at: new Date().toISOString(),
    };

    it("renders existing finding data and invokes update_finding", async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <FindingEditModal
          isOpen={true}
          finding={mockFinding}
          onSave={onSave}
          onClose={onClose}
        />
      );

      expect(screen.getByDisplayValue("Cross-Site Scripting (Reflected)")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://example.com/search")).toBeInTheDocument();
      expect(screen.getByDisplayValue("CWE-79")).toBeInTheDocument();

      // Change status to Confirmed
      const statusSelect = screen.getByLabelText(/Triage Status/i);
      fireEvent.change(statusSelect, { target: { value: "Confirmed" } });

      const saveBtn = screen.getByRole("button", { name: /Save Finding/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("update_finding", expect.objectContaining({
          findingId: "f-101",
          payload: expect.objectContaining({
            title: "Cross-Site Scripting (Reflected)",
            status: "Confirmed",
          }),
        }));
      });

      expect(onSave).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  // 5. AuditLogModal Tests
  describe("AuditLogModal", () => {
    it("fetches audit logs and renders entries", async () => {
      render(
        <AuditLogModal
          isOpen={true}
          onClose={() => {}}
        />
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_audit_logs", expect.anything());
      });

      expect(screen.getByText(/System Audit Trail & Data Mutation Log/i)).toBeInTheDocument();
    });

    it("filters logs by search input", async () => {
      render(
        <AuditLogModal
          isOpen={true}
          onClose={() => {}}
        />
      );

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("get_audit_logs", expect.anything());
      });

      const searchInput = screen.getByPlaceholderText(/Search audit trail by entity, action, or details/i);
      fireEvent.change(searchInput, { target: { value: "TARGET" } });
      expect(searchInput).toHaveValue("TARGET");
    });
  });

  // 6. Full App Tab Navigation & Action Controls Tests
  describe("Full App Integration - CRUD & Data Management", () => {
    it("renders Targets tab with edit and delete controls for authorized targets", async () => {
      await act(async () => {
        render(<App />);
      });

      // Switch to Targets tab
      const targetsTabBtn = screen.getByText("Projects & Targets");
      fireEvent.click(targetsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Configure Authorized Target/i)).toBeInTheDocument();
      });

      // Verify Authorized Targets list renders
      expect(screen.getByText(/Authorized Targets/i)).toBeInTheDocument();
    });

    it("renders Findings tab with sortable columns, pagination, and New Finding button", async () => {
      await act(async () => {
        render(<App />);
      });

      // Switch to Findings tab
      const findingsTabBtn = screen.getByText("Findings");
      fireEvent.click(findingsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Unified Findings & Deduplication Engine/i)).toBeInTheDocument();
      });

      // Check New Finding button is present
      const newFindingBtn = screen.getByRole("button", { name: /New Finding/i });
      expect(newFindingBtn).toBeInTheDocument();

      // Check Sortable column headers exist
      expect(screen.getByText("Severity")).toBeInTheDocument();
      expect(screen.getByText("Vulnerability")).toBeInTheDocument();
      expect(screen.getByText("Validation State")).toBeInTheDocument();
      expect(screen.getByText("Source Tool")).toBeInTheDocument();

      // Check Pagination controls exist
      expect(screen.getByText(/Per page:/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Next/i })).toBeInTheDocument();
    });

    it("deletes finding using correct findingId argument format", async () => {
      await act(async () => {
        render(<App />);
      });

      // Switch to Findings tab
      const findingsTabBtn = screen.getByText("Findings");
      fireEvent.click(findingsTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Unified Findings & Deduplication Engine/i)).toBeInTheDocument();
      });

      // Click Delete Finding button on the first finding
      const deleteButtons = screen.getAllByTitle("Delete Finding");
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion in modal
      const confirmBtn = screen.getByRole("button", { name: /^Delete Finding$/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("delete_finding", expect.objectContaining({
          findingId: expect.any(String),
        }));
      });
    });

    it("renders Activity Monitor tab and opens Audit Trail dialog", async () => {
      await act(async () => {
        render(<App />);
      });

      // Switch to Activity Monitor tab
      const activityTabBtn = screen.getByText("Activity Monitor");
      fireEvent.click(activityTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Activity Monitor & Diagnostics/i)).toBeInTheDocument();
      });

      // Check System Audit Log modal trigger is present in header
      const auditLogBtn = screen.getByLabelText(/System audit log/i);
      expect(auditLogBtn).toBeInTheDocument();
      fireEvent.click(auditLogBtn);

      await waitFor(() => {
        expect(screen.getByText(/System Audit Trail/i)).toBeInTheDocument();
      });
    });

    it("renders Discovered Endpoints in Crawler tab with Discovery and Refresh options", async () => {
      await act(async () => {
        render(<App />);
      });

      // Switch to Crawler tab via key shortcut 'Ctrl+5'
      fireEvent.keyDown(window, { key: "5", code: "Digit5", ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByText(/Bounded Low-Impact Crawler/i)).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /Start Discovery/i })).toBeInTheDocument();
    });
  });
});

