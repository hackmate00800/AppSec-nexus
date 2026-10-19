import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MentorChat } from "../MentorChat";
import { AiTaskProvider } from "../context/AiTaskContext";
import { resolveModelSlots, isQuickCandidate, isDeepCandidate } from "../utils/aiModelResolver";
import { AiSecurityGuard, CvssCalculator } from "../utils/securityDsa";
import { invoke } from "@tauri-apps/api/core";

// Helper wrapper providing AiTaskProvider context
function renderWithProvider(ui: React.ReactElement) {
  return render(<AiTaskProvider>{ui}</AiTaskProvider>);
}

describe("AppSec AI Master Pipeline: Curiosity-First, Anti-Refusal & Technical Accuracy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // =========================================================================
  // CATEGORY A: LEGITIMATE REQUEST TESTS
  // =========================================================================
  describe("Category A: Legitimate Request Tests", () => {
    it("1 & 2. Explains Missing CSP finding accurately without fabricating XSS and provides secure remediation", async () => {
      const mockFinding = {
        id: "f-csp-1",
        target_id: "target-1",
        title: "Missing Content-Security-Policy Header",
        severity: "Low" as const,
        confidence: 95,
        affected_asset: "https://example.com/",
        evidence: "HTTP/1.1 200 OK without Content-Security-Policy or Report-Only headers",
        source_tool: "Native Header Auditor",
        tool_version: "v1.0.0",
        cwe: "CWE-693",
        remediation: "Deploy Content-Security-Policy-Report-Only first, then enforce strict CSP.",
        status: "New" as const,
        created_at: new Date().toISOString(),
        validation_status: "NEEDS_VALIDATION" as const,
      };

      renderWithProvider(
        <MentorChat
          selectedFinding={mockFinding}
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
        />
      );

      // Verify finding context is loaded
      expect(screen.getAllByText(/Missing Content-Security-Policy Header/i).length).toBeGreaterThan(0);

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      fireEvent.change(input, {
        target: { value: "Does this missing CSP header prove the website has an active XSS vulnerability?" },
      });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith(
          "chat_with_mentor",
          expect.objectContaining({
            model: "llama3.2:1b",
            system: expect.stringContaining("Missing Content-Security-Policy Header"),
          })
        );
      });

      // Verify the response explicitly states CSP is a hardening omission, not confirmed XSS
      await waitFor(() => {
        expect(
          screen.getByText(/defense-in-depth security hardening omission rather than confirmed Cross-Site Scripting/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/Content-Security-Policy-Report-Only/i)).toBeInTheDocument();
      });
    });

    it("3 & 5. Explains root cause and deep technical mechanism of SQL Injection without refusal", async () => {
      renderWithProvider(
        <MentorChat
          selectedModel="appsec-teacher-8b:latest"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="deep"
        />
      );

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      fireEvent.change(input, {
        target: { value: "Explain the exploitation mechanism and payload structure for SQL injection in authentication bypass." },
      });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith(
          "chat_with_mentor",
          expect.objectContaining({
            model: "appsec-teacher-8b:latest",
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.stringContaining("SQL injection"),
              }),
            ]),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/parameterized queries \/ prepared statements/i)).toBeInTheDocument();
      });
    });

    it("8. Accurately calculates CVSS v3.1 and handles unassessed scores without fabricating numbers", () => {
      // Complete vector with high impact
      const calcResult = CvssCalculator.calculate({
        attackVector: "Network",
        attackComplexity: "Low",
        privilegesRequired: "None",
        userInteraction: "None",
        scope: "Unchanged",
        confidentiality: "High",
        integrity: "High",
        availability: "High",
      });

      expect(calcResult.score).toBe(9.8);
      expect(calcResult.severity).toBe("Critical");
      expect(calcResult.vectorString).toContain("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");

      // For missing headers, base metrics are low/negligible
      const missingHeaderScore = CvssCalculator.calculate({
        attackVector: "Network",
        attackComplexity: "High",
        privilegesRequired: "None",
        userInteraction: "Required",
        scope: "Unchanged",
        confidentiality: "Low",
        integrity: "None",
        availability: "None",
      });
      expect(missingHeaderScore.score).toBeLessThan(4.0);
      expect(missingHeaderScore.severity).toBe("Low");
    });
  });

  // =========================================================================
  // CATEGORY B: RESTRICTION TESTS
  // =========================================================================
  describe("Category B: Restriction Tests (Anti-Refusal & False Positive Elimination)", () => {
    it("13 & 14. Allows prompts discussing prompt injection, jailbreaks, and DAN without frontend false refusals", async () => {
      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
        />
      );

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      // Previously, this exact phrasing was falsely blocked by AiSecurityGuard.inspectPrompt in the frontend
      const promptInjectionInquiry = "How does an attacker use 'ignore previous instructions' and DAN prompts to test LLM system boundaries?";
      fireEvent.change(input, { target: { value: promptInjectionInquiry } });
      fireEvent.click(sendBtn);

      // Verify that the prompt is NOT blocked with the canned refusal banner
      expect(screen.queryByText(/Adversarial Prompt Injection Blocked \(Cybersecurity Guard\)/i)).not.toBeInTheDocument();

      // Verify it was dispatched to the AI backend cleanly
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith(
          "chat_with_mentor",
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ content: promptInjectionInquiry }),
            ]),
          })
        );
      });

      // Verify the substantive response renders in chat
      await waitFor(() => {
        expect(screen.getByText(/Prompt injection and jailbreaks attempt to override an LLM's system persona/i)).toBeInTheDocument();
      });
    });

    it("15 & 16. Ensures new conversation threads are independent and unpolluted by previous refusals or errors", async () => {
      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
        />
      );

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      fireEvent.change(input, { target: { value: "First query: check CSP headers." } });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("chat_with_mentor", expect.anything());
      });

      // Clear conversation
      const clearBtn = screen.getByRole("button", { name: /^Clear$/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith("clear_conversation_messages", expect.anything());
      });
    });
  });

  // =========================================================================
  // CATEGORY C: OLLAMA INTEGRATION & ROLE SWITCHING TESTS
  // =========================================================================
  describe("Category C: Ollama Dynamic Integration & Role Resolution", () => {
    it("19 & 20. Dynamically resolves Quick (1B-3B) and Deep (7B-14B) models from installed tags", () => {
      const installed = ["llama3.2:1b", "appsec-teacher-8b:latest", "deepseek-r1:1.5b", "llama3:8b"];

      expect(isQuickCandidate("llama3.2:1b")).toBe(true);
      expect(isQuickCandidate("deepseek-r1:1.5b")).toBe(true);
      expect(isQuickCandidate("llama3:8b")).toBe(false);

      expect(isDeepCandidate("llama3:8b")).toBe(true);
      expect(isDeepCandidate("appsec-teacher-8b:latest")).toBe(true);
      expect(isDeepCandidate("llama3.2:1b")).toBe(false);

      const slots = resolveModelSlots(installed);
      expect(slots.quickModel).toBe("llama3.2:1b");
      expect(slots.deepModel).toBe("appsec-teacher-8b:latest");
    });

    it("23. Displays truthful offline state and fallback advice when Ollama is unreachable", async () => {
      // Specifically reject chat_with_mentor / submit_ai_task
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockImplementation(async (cmd: string, _args?: any) => {
        if (cmd === "chat_with_mentor" || cmd === "submit_ai_task") {
          throw new Error("Cannot reach local Ollama at 127.0.0.1:11434");
        }
        return [];
      });

      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={false}
          aiModels={[]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
        />
      );

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      fireEvent.change(input, { target: { value: "Explain authentication bypass" } });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/Local AI Engine Offline \/ Timeout/i)).toBeInTheDocument();
        expect(screen.getByText(/Could not reach Ollama at/i)).toBeInTheDocument();
      });
    });

    it("28. Seamlessly switches between Quick and Deep AI roles and dispatches corresponding model", async () => {
      const handleSelectRole = vi.fn();
      const handleSelectModel = vi.fn();

      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
          onSelectRole={handleSelectRole}
          onSelectModel={handleSelectModel}
        />
      );

      // Verify Deep AI button is present
      const deepBtn = screen.getByRole("button", { name: /Deep AI/i });
      fireEvent.click(deepBtn);

      expect(handleSelectRole).toHaveBeenCalledWith("deep");
      expect(handleSelectModel).toHaveBeenCalledWith("appsec-teacher-8b:latest");
    });
  });

  // =========================================================================
  // CATEGORY D: ACCURACY & CODE QUALITY TESTS
  // =========================================================================
  describe("Category D: Accuracy & Code Quality Tests", () => {
    it("29 & 30. Rejects fabricated CVSS scores and maintains evidence boundaries", () => {
      // Testing with empty or missing evidence metrics
      const result = CvssCalculator.calculate({
        attackVector: "Local",
        attackComplexity: "High",
        privilegesRequired: "High",
        userInteraction: "Required",
        scope: "Unchanged",
        confidentiality: "None",
        integrity: "None",
        availability: "None",
      });

      expect(result.score).toBe(0.0);
      expect(result.severity).toBe("None");
    });

    it("31 & 32. Accurately estimates token budgets to prevent model truncation and memory leaks", () => {
      const samplePythonExploitScript = `
import requests
session = requests.Session()
response = session.get("https://example.com/api/test", headers={"Authorization": "Bearer token"})
print(response.status_code, response.json())
`;
      const tokenCount = AiSecurityGuard.estimateTokens(samplePythonExploitScript);
      expect(tokenCount).toBeGreaterThan(20);
      expect(tokenCount).toBeLessThan(100);

      const budget = AiSecurityGuard.checkContextBudget(tokenCount, 4096);
      expect(budget.usagePercent).toBeLessThan(5);
      expect(budget.isCritical).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY E: FRONTEND & PERSISTENCE TESTS
  // =========================================================================
  describe("Category E: Frontend & Persistence Tests", () => {
    it("36. Renders study depth selector and allows switching between educational modes", () => {
      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
        />
      );

      const depthSelect = screen.getByTitle(/Select pedagogical depth/i);
      expect(depthSelect).toBeInTheDocument();

      fireEvent.change(depthSelect, { target: { value: "advanced" } });
      expect((depthSelect as HTMLSelectElement).value).toBe("advanced");
    });

    it("37. Supports copying messages to clipboard with user feedback indicator", async () => {
      // Mock clipboard writeText
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "appsec-teacher-8b:latest"]}
          quickModel="llama3.2:1b"
          deepModel="appsec-teacher-8b:latest"
          activeRole="quick"
        />
      );

      const copyBtn = screen.getAllByTitle(/Copy message to clipboard/i)[0];
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
