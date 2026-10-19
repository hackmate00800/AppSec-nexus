import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App, { sortAiModels } from "../App";
import { CyberAcademy } from "../academy/CyberAcademy";
import { MentorChat } from "../MentorChat";
import { SecurityFlowchart } from "../Flowchart";

describe("Feature Automation Testing - APPSC NEXUS", () => {
  it("renders main navigation sidebar and verifies active tabs", async () => {
    await act(async () => {
      render(<App />);
    });

    // Check brand header
    expect(screen.getAllByText("AppSec Nexus")[0]).toBeInTheDocument();
    expect(screen.getByText("Desktop Platform")).toBeInTheDocument();

    // Verify navigation tabs exist
    expect(screen.getAllByText("Security Analytics")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Target & Scope")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Scan Console")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Cyber Academy")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Local AI Mentor")[0]).toBeInTheDocument();
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

  it("prioritizes appsec-teacher-8b:latest first in sortAiModels", () => {
    const rawModels = [
      "llama3.2:1b",
      "llama3:8b",
      "mistral:latest",
      "appsec-teacher-1b:latest",
      "appsec-teacher-8b:latest",
    ];

    const sorted = sortAiModels(rawModels);
    expect(sorted[0]).toBe("appsec-teacher-8b:latest");
    expect(sorted[1]).toBe("appsec-teacher-1b:latest");
    expect(sorted[2]).toBe("llama3:8b");
  });

  it("renders interactive learning workflow stages in MentorChat", () => {
    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    expect(screen.getByText(/Interactive Learning Mode Workflow/i)).toBeInTheDocument();
    expect(screen.getByText("📖 Concept & Mechanism")).toBeInTheDocument();
    expect(screen.getByText("⚙️ Root Cause")).toBeInTheDocument();
    expect(screen.getByText("🧪 Lab Reproduction")).toBeInTheDocument();
    expect(screen.getByText("🛡️ Defense & Secure Code")).toBeInTheDocument();
    expect(screen.getByText("📝 Pentest Report Finding")).toBeInTheDocument();
  });

  it("toggles Ollama models ON and OFF and persists preference", () => {
    let toggledState = true;
    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
        onToggleAiEnabled={(enabled) => {
          toggledState = enabled;
        }}
      />
    );

    // Initial state is ONLINE
    expect(screen.getByText("ONLINE")).toBeInTheDocument();

    // Find and click the Ollama toggle button
    const toggleBtn = screen.getByTitle(/Turn OFF Ollama models/i);
    fireEvent.click(toggleBtn);

    // Expect state to switch to OFF
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(toggledState).toBe(false);
  });

  it("supports copying messages and code blocks to clipboard", () => {
    // Mock clipboard
    let clipboardText = "";
    Object.assign(navigator, {
      clipboard: {
        writeText: (t: string) => {
          clipboardText = t;
          return Promise.resolve();
        },
      },
    });

    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    // Initial greeting is present
    expect(screen.getByText(/Welcome to the/i)).toBeInTheDocument();

    // Click Copy message button
    const copyBtn = screen.getByTitle("Copy message to clipboard");
    fireEvent.click(copyBtn);

    expect(clipboardText).toContain("Welcome to the");
  });

  it("allows selecting study depth level and filtering bookmarked notes", () => {
    render(
      <MentorChat
        selectedFinding={null}
        selectedModel="appsec-teacher-8b:latest"
        aiMode="advanced"
        aiAvailable={true}
        onSelectFinding={() => {}}
      />
    );

    // Verify study depth selector
    const depthSelect = screen.getByTitle("Select pedagogical depth for explanations") as HTMLSelectElement;
    expect(depthSelect).toBeInTheDocument();
    fireEvent.change(depthSelect, { target: { value: "professional" } });
    expect(depthSelect.value).toBe("professional");

    // Bookmark the initial message
    const starBtn = screen.getByTitle(/Star as important study note/i);
    fireEvent.click(starBtn);

    // Click "Starred Notes" filter
    const starredFilter = screen.getByText(/Starred Notes/i);
    fireEvent.click(starredFilter);

    // Starred note should still be visible
    expect(screen.getByText(/Welcome to the/i)).toBeInTheDocument();
  });
});

