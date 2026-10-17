import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "../App";
import { CyberAcademy } from "../academy/CyberAcademy";
import { MentorChat } from "../MentorChat";
import { SecurityFlowchart } from "../Flowchart";

describe("Feature Automation Testing - APPSC NEXUS", () => {
  it("renders main navigation sidebar and verifies active tabs", async () => {
    await act(async () => {
      render(<App />);
    });

    // Check brand header
    expect(screen.getByText("AppSec Nexus")).toBeInTheDocument();
    expect(screen.getByText("Desktop Platform")).toBeInTheDocument();

    // Verify navigation tabs exist
    expect(screen.getByText("Security Analytics")).toBeInTheDocument();
    expect(screen.getByText("Target & Scope")).toBeInTheDocument();
    expect(screen.getByText("Scan Console")).toBeInTheDocument();
    expect(screen.getByText("Cyber Academy")).toBeInTheDocument();
    expect(screen.getByText("Local AI Mentor")).toBeInTheDocument();
  });

  it("navigates to Cyber Academy and renders core curriculum tracks", async () => {
    render(
      <CyberAcademy
        onNavigateScanner={() => {}}
        onOpenAiMentor={() => {}}
      />
    );

    // Verify Academy title & tracks
    expect(screen.getByText("AppSec Nexus Cyber Academy")).toBeInTheDocument();
    expect(screen.getByText("Dashboard & Progress")).toBeInTheDocument();
    expect(screen.getByText("Learning Paths")).toBeInTheDocument();
    expect(screen.getByText("Concept Library")).toBeInTheDocument();
    expect(screen.getByText("Hands-on Guided Labs")).toBeInTheDocument();
    expect(screen.getByText("Methodologies & Frameworks")).toBeInTheDocument();
  });

  it("allows switching tabs in Cyber Academy to Guided Labs and Methodologies", async () => {
    render(
      <CyberAcademy
        onNavigateScanner={() => {}}
        onOpenAiMentor={() => {}}
      />
    );

    // Switch to Hands-on Guided Labs
    const labsButton = screen.getByText("Hands-on Guided Labs");
    fireEvent.click(labsButton);

    // Switch to Methodologies & Frameworks
    const methodologyButton = screen.getByText("Methodologies & Frameworks");
    fireEvent.click(methodologyButton);
  });

  it("renders AI Mentor Chat with input box and status badge", async () => {
    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="deepseek-r1:1.5b"
        aiMode="beginner"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    expect(screen.getByText("Interactive Security Mentor Chat")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask a follow-up question/i)).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("submits a user prompt in AI Mentor Chat and appends message to conversation", async () => {
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
    fireEvent.change(input, { target: { value: "How do I remediate IDOR vulnerabilities?" } });
    expect(input).toHaveValue("How do I remediate IDOR vulnerabilities?");

    const submitBtn = screen.getByText("Send");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("How do I remediate IDOR vulnerabilities?")).toBeInTheDocument();
    });
  });

  it("renders SecurityFlowchart component with human-readable attack and defense steps", () => {
    render(<SecurityFlowchart vulnerabilityType="sql" />);

    expect(screen.getByText("SQL Injection (SQLi) - Attack Flow vs Prepared Statements")).toBeInTheDocument();
    expect(screen.getByText("1. Attacker Input")).toBeInTheDocument();
    expect(screen.getByText("2. Parameterized Query")).toBeInTheDocument();
  });
});
