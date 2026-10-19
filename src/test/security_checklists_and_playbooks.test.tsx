import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BUILTIN_PLAYBOOKS, getPlaybooksForCategory } from "../checklists/data/playbooksData";
import { ChecklistPlaybookCenter, getStatusStyle } from "../checklists/ChecklistPlaybookCenter";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";

describe("Universal Security Checklists & Pentest Playbooks Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads comprehensive pre-configured playbooks covering all major domains", () => {
    expect(BUILTIN_PLAYBOOKS.length).toBeGreaterThanOrEqual(7);

    const webPlaybooks = getPlaybooksForCategory("web");
    expect(webPlaybooks.length).toBeGreaterThan(0);
    expect(webPlaybooks[0].standard).toContain("OWASP WSTG");

    const apiPlaybooks = getPlaybooksForCategory("api");
    expect(apiPlaybooks.length).toBeGreaterThan(0);
    expect(apiPlaybooks[0].standard).toContain("OWASP API");

    const osPlaybooks = getPlaybooksForCategory("os");
    expect(osPlaybooks.length).toBeGreaterThan(0);

    const androidPlaybooks = getPlaybooksForCategory("android");
    expect(androidPlaybooks.length).toBeGreaterThan(0);

    const cloudPlaybooks = getPlaybooksForCategory("cloud");
    expect(cloudPlaybooks.length).toBeGreaterThan(0);
  });

  it("supports the 11-status lifecycle state machine and styling", () => {
    const statuses = [
      "Not Started",
      "In Progress",
      "Pass",
      "Fail",
      "Needs Review",
      "Not Applicable",
      "Blocked",
      "Not Tested",
      "Retest Required",
      "Retest Passed",
      "Retest Failed",
    ] as const;

    statuses.forEach((status) => {
      const style = getStatusStyle(status);
      expect(style.bg).toBeDefined();
      expect(style.text).toBeDefined();
      expect(style.border).toBeDefined();
    });
  });

  describe("ChecklistPlaybookCenter Component Integration", () => {
    const mockTargets = [
      { id: "target-1", name: "Staging Web App", primary_url: "https://staging.corp.internal" },
      { id: "target-2", name: "Production API", primary_url: "https://api.corp.com" },
    ];

    it("renders ChecklistPlaybookCenter header, run selector, and metrics", () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <ChecklistPlaybookCenter targets={mockTargets} />
          </ToastProvider>
        </ThemeProvider>
      );

      expect(screen.getByTestId("checklist-playbook-center")).toBeInTheDocument();
      expect(screen.getByTestId("select-active-run")).toBeInTheDocument();
      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
      expect(screen.getByText(/Pass:/)).toBeInTheDocument();
      expect(screen.getByText(/Fail:/)).toBeInTheDocument();
    });

    it("allows updating item status and records method, tools, and evidence", () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <ChecklistPlaybookCenter targets={mockTargets} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Select first checklist item
      const itemRow = screen.getByTestId("checklist-item-row-wstg-info-01");
      fireEvent.click(itemRow);

      expect(screen.getByTestId("checklist-item-detail")).toBeInTheDocument();

      // Change status to "Pass"
      const statusSelect = screen.getByTestId("select-item-status");
      fireEvent.change(statusSelect, { target: { value: "Pass" } });
      expect(statusSelect).toHaveValue("Pass");

      // Enter execution method
      const methodInput = screen.getByTestId("input-item-method");
      fireEvent.change(methodInput, { target: { value: "curl -I https://staging.corp.internal" } });
      expect(methodInput).toHaveValue("curl -I https://staging.corp.internal");

      // Enter raw evidence with secret token to test auto-redaction
      const evidenceTextarea = screen.getByTestId("textarea-item-evidence") as HTMLTextAreaElement;
      fireEvent.change(evidenceTextarea, {
        target: { value: "Authorization: Bearer secret_live_token_123456\nServer: nginx" },
      });
      expect(evidenceTextarea.value).toContain("[REDACTED_AUTH_TOKEN]");
      expect(evidenceTextarea.value).not.toContain("secret_live_token_123456");
    });

    it("creates and links finding when item is flagged as a vulnerability", () => {
      const handleFindingsAdded = vi.fn();
      render(
        <ThemeProvider>
          <ToastProvider>
            <ChecklistPlaybookCenter
              targets={mockTargets}
              onFindingsAdded={handleFindingsAdded}
            />
          </ToastProvider>
        </ThemeProvider>
      );

      // Select XSS item
      const xssRow = screen.getByTestId("checklist-item-row-wstg-inp-01");
      fireEvent.click(xssRow);

      // Click "Flag as Vulnerability & Create Finding"
      const createFindingBtn = screen.getByTestId("btn-create-finding-from-item");
      fireEvent.click(createFindingBtn);

      expect(handleFindingsAdded).toHaveBeenCalled();
      const addedFindings = handleFindingsAdded.mock.calls[0][0];
      expect(addedFindings.length).toBe(1);
      expect(addedFindings[0].title).toContain("WSTG-INPV-01");
      expect(addedFindings[0].severity).toBe("High");
    });

    it("opens start new assessment run modal and creates a run", () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <ChecklistPlaybookCenter targets={mockTargets} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Open new run modal
      fireEvent.click(screen.getByTestId("btn-new-assessment-run"));
      expect(screen.getByTestId("new-run-modal")).toBeInTheDocument();

      // Submit new run
      fireEvent.click(screen.getByTestId("btn-confirm-create-run"));
      expect(screen.queryByTestId("new-run-modal")).not.toBeInTheDocument();
    });

    it("copies markdown report to clipboard when Export Report is clicked", () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <ThemeProvider>
          <ToastProvider>
            <ChecklistPlaybookCenter targets={mockTargets} />
          </ToastProvider>
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId("btn-export-report"));
      expect(writeTextMock).toHaveBeenCalled();
      const exportedContent = writeTextMock.mock.calls[0][0];
      expect(exportedContent).toContain("Assessment Run Report:");
      expect(exportedContent).toContain("Metrics Summary");
    });
  });
});
