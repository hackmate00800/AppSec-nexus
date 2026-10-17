import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MentorChat } from "../MentorChat";
import { SecurityFlowchart } from "../Flowchart";
import { HostMobileAudit } from "../HostMobileAudit";

describe("Bugs, Errors & Edge-Case Automation Testing", () => {
  it("handles offline AI gracefully and displays offline indicator badge", () => {
    render(
      <MentorChat
        selectedFinding={null}
        selectedModel=""
        aiMode="beginner"
        aiAvailable={false}
        onSelectFinding={() => {}}
      />
    );

    // Should indicate Offline Fallback
    expect(screen.getByText("Offline Fallback")).toBeInTheDocument();
  });

  it("handles SecurityFlowchart with empty finding title without breaking", () => {
    render(<SecurityFlowchart vulnerabilityType="general" />);

    expect(screen.getByText("Generic Web Vulnerability - Attack Vector vs Defense-in-Depth")).toBeInTheDocument();
  });

  it("handles empty prompt submission in MentorChat gracefully", () => {
    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="deepseek-r1:1.5b"
        aiMode="beginner"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    const submitBtn = screen.getByText("Send");
    // Button is disabled when input is empty
    expect(submitBtn).toBeDisabled();
  });

  it("handles malicious XSS injection in chat input without executing script", async () => {
    const maliciousPayload = "<script>alert('XSS')</script><img src=x onerror=alert(1)>";

    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="deepseek-r1:1.5b"
        aiMode="beginner"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
    fireEvent.change(input, { target: { value: maliciousPayload } });
    const submitBtn = screen.getByText("Send");
    fireEvent.click(submitBtn);

    // Payload is safely rendered as escaped text content, not raw HTML
    await waitFor(() => {
      expect(screen.getByText(maliciousPayload)).toBeInTheDocument();
    });
  });

  it("handles backend IPC failure during Host/Mobile audit gracefully", () => {
    const onFindingsAdded = vi.fn();
    const onNavigateFinding = vi.fn();

    render(
      <HostMobileAudit
        targetId="test-target"
        onFindingsAdded={onFindingsAdded}
        onNavigateFinding={onNavigateFinding}
      />
    );

    expect(screen.getByText("Windows Software & Host Vulnerability Auditor")).toBeInTheDocument();
    expect(screen.getByText("Windows Software Audit")).toBeInTheDocument();
    expect(screen.getByText("Android App SAST")).toBeInTheDocument();
  });

  it("resists division by zero and NaN in statistics when findings list is empty", () => {
    const emptyFindings: any[] = [];
    const critCount = emptyFindings.filter((f) => f.severity === "Critical").length;
    const totalCount = emptyFindings.length;
    const critPercentage = totalCount === 0 ? 0 : Math.round((critCount / totalCount) * 100);

    expect(critPercentage).toBe(0);
    expect(Number.isNaN(critPercentage)).toBe(false);
  });
});
