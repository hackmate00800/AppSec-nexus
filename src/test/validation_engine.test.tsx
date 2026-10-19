import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MentorChat } from "../MentorChat";
import { ValidationBadge, StatusBadge } from "../components/ui/Badge";
import { Finding, ValidationRecord } from "../types";

// Mock Tauri core invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  isTauri: () => true,
}));

import { invoke } from "@tauri-apps/api/core";

describe("Real Vulnerability Validation Engine & AI Mentor Policy (Phase 8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFindingCsp: Finding = {
    id: "finding-csp-1",
    target_id: "target-1",
    title: "Missing Content-Security-Policy (CSP) Header",
    severity: "Low",
    confidence: 95,
    affected_asset: "https://example.com/app",
    evidence: "No Content-Security-Policy HTTP header was returned by the server.",
    source_tool: "BaselineScanner",
    tool_version: "1.0.0",
    cwe: "CWE-693",
    remediation: "Implement a strong Content-Security-Policy header restricting script sources.",
    status: "NeedsValidation",
    created_at: "2026-10-17T12:00:00Z",
    validation_status: "NEEDS_VALIDATION",
  };

  const mockConfirmedRecord: ValidationRecord = {
    id: "val-rec-1",
    finding_id: "finding-csp-1",
    target_id: "target-1",
    status: "CONFIRMED",
    hypothesis: "Endpoint does not return Content-Security-Policy or Report-Only headers.",
    test_method: "Direct HTTP GET probe inspecting response headers.",
    preconditions: "Target endpoint reachable via HTTP.",
    expected_observation: "Absence of CSP header.",
    actual_observation: "HTTP 200: Neither Content-Security-Policy nor Report-Only header was present.",
    supporting_evidence: "Verified absent CSP across live probe to https://example.com/app",
    contradicting_evidence: "None",
    confidence_score: 95,
    confidence_rationale: "Verified absent CSP. Missing CSP is a defense-in-depth weakness and does not prove active XSS exploitability without input reflection.",
    executed_at: "2026-10-17T12:05:00Z",
    duration_ms: 120,
  };

  const mockFalsePositiveRecord: ValidationRecord = {
    id: "val-rec-2",
    finding_id: "finding-csp-1",
    target_id: "target-1",
    status: "LIKELY_FALSE_POSITIVE",
    hypothesis: "Endpoint fails to enforce a Content-Security-Policy header.",
    test_method: "Direct HTTP GET probe inspecting response headers.",
    preconditions: "Target endpoint reachable via HTTP.",
    expected_observation: "Absence of Content-Security-Policy HTTP header.",
    actual_observation: "Server actively returned HTTP 200 with Content-Security-Policy: default-src 'self'",
    supporting_evidence: "None",
    contradicting_evidence: "Content-Security-Policy is actively returned by server.",
    confidence_score: 95,
    confidence_rationale: "Live probe verified that Content-Security-Policy is present and active. The scanner alert is refuted as a false positive.",
    executed_at: "2026-10-17T12:06:00Z",
    duration_ms: 95,
  };

  it("renders ValidationBadge with correct states and confidence score", () => {
    const { rerender } = render(<ValidationBadge status="CONFIRMED" confidence={95} />);
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();

    rerender(<ValidationBadge status="NEEDS_VALIDATION" />);
    expect(screen.getByText("Needs Validation")).toBeInTheDocument();

    rerender(<ValidationBadge status="LIKELY_FALSE_POSITIVE" confidence={90} />);
    expect(screen.getByText("LIKELY FALSE POSITIVE")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();

    rerender(<ValidationBadge status="UNCONFIRMED" />);
    expect(screen.getByText("UNCONFIRMED")).toBeInTheDocument();

    rerender(<ValidationBadge status="VALIDATION_FAILED" />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });

  it("renders StatusBadge with extended validation workflow states", () => {
    const { rerender } = render(<StatusBadge status="NeedsValidation" />);
    expect(screen.getByText("Needs Validation")).toBeInTheDocument();

    rerender(<StatusBadge status="LikelyTruePositive" />);
    expect(screen.getByText("Likely True Positive")).toBeInTheDocument();

    rerender(<StatusBadge status="Confirmed" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();

    rerender(<StatusBadge status="LikelyFalsePositive" />);
    expect(screen.getByText("Likely False Positive")).toBeInTheDocument();
  });

  it("renders MentorChat with Validation Inspector Card and loads validation facts", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_validation_history") {
        return Promise.resolve([mockConfirmedRecord]);
      }
      return Promise.resolve("");
    });

    render(
      <MentorChat
        selectedFinding={mockFindingCsp}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    // Context greeting
    expect(screen.getByText(/I have loaded context for finding/i)).toBeInTheDocument();

    // Validation Inspector Card details
    await waitFor(() => {
      expect(screen.getByText(/Finding Context: Missing Content-Security-Policy/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct HTTP GET probe inspecting response headers/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified absent CSP across live probe/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing CSP is a defense-in-depth weakness/i)).toBeInTheDocument();
    });
  });

  it("triggers live validation probe in MentorChat and updates finding state", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_validation_history") {
        return Promise.resolve([]);
      }
      if (cmd === "validate_finding") {
        return Promise.resolve(mockFalsePositiveRecord);
      }
      return Promise.resolve("");
    });

    const onFindingValidated = vi.fn();

    render(
      <MentorChat
        selectedFinding={mockFindingCsp}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
        onFindingValidated={onFindingValidated}
      />
    );

    // Click "Run Independent Validation Probe"
    const validateBtn = screen.getByText(/Run Independent Validation Probe/i);
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("validate_finding", {
        findingId: mockFindingCsp.id,
      });
      expect(onFindingValidated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockFindingCsp.id,
          status: "LIKELY_FALSE_POSITIVE",
          validation_status: "LIKELY_FALSE_POSITIVE",
          confidence: 95,
        })
      );
      expect(screen.getAllByText((content) => content.includes("Deterministic Validation Complete")).length).toBeGreaterThan(0);
      expect(screen.getAllByText((content) => content.includes("refuted as a false positive")).length).toBeGreaterThan(0);
    });
  });

  it("submits prompt with loaded validation context and sends to AI Mentor", async () => {
    (invoke as any).mockImplementation((cmd: string, args: any) => {
      if (cmd === "get_validation_history") {
        return Promise.resolve([mockConfirmedRecord]);
      }
      if (cmd === "chat_with_mentor") {
        expect(args.system).toContain("Validation Status: CONFIRMED");
        expect(args.system).toContain("Validation Hypothesis:");
        expect(args.system).toContain("Actual Observed Evidence:");
        return Promise.resolve("Missing CSP is an absent defense-in-depth mitigation. Remediation: Set 'Content-Security-Policy: default-src 'self'' in Nginx.");
      }
      return Promise.resolve("");
    });

    render(
      <MentorChat
        selectedFinding={mockFindingCsp}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Finding Context:/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
    fireEvent.change(input, { target: { value: "How do I fix and verify this missing CSP?" } });

    const sendBtn = screen.getByText("Send");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Missing CSP is an absent defense-in-depth mitigation/i)).toBeInTheDocument();
    });
  });

  it("renders interactive learning workflow step buttons and submits on click", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_validation_history") return Promise.resolve([]);
      if (cmd === "chat_with_mentor") {
        return Promise.resolve("Root cause analysis: The HTTP response lacks security headers because default web server configuration does not inject them.");
      }
      return Promise.resolve("");
    });

    render(
      <MentorChat
        selectedFinding={mockFindingCsp}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    const rootCauseBtn = screen.getByText("⚙️ Root Cause");
    fireEvent.click(rootCauseBtn);

    await waitFor(() => {
      expect(screen.getByText(/The HTTP response lacks security headers/i)).toBeInTheDocument();
    });
  });
});
