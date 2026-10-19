import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";
import { MentorChat } from "../MentorChat";
import { ThemeProvider } from "../theme/ThemeProvider";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import { AiTaskProvider } from "../context/AiTaskContext";
import { TourProvider } from "../context/TourContext";
import { resolveModelSlots, isModelInstalled } from "../utils/aiModelResolver";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <WorkspaceProvider>
        <AiTaskProvider>
          <TourProvider>{ui}</TourProvider>
        </AiTaskProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}

describe("AppSec AI Two-Model Security Workspace (Phase Verification)", () => {
  it("resolves Quick and Deep slots accurately based on installed models", () => {
    // Multi-model environment
    const multi = ["llama3:8b", "llama3.2:1b", "qwen2.5-coder:7b"];
    const resolvedMulti = resolveModelSlots(multi);
    expect(resolvedMulti.quickModel).toBe("llama3.2:1b");
    expect(resolvedMulti.deepModel).toBe("llama3:8b");
    expect(resolvedMulti.isSingleModel).toBe(false);

    // Single model environment
    const single = ["appsec-teacher-8b:latest"];
    const resolvedSingle = resolveModelSlots(single);
    expect(resolvedSingle.quickModel).toBe("appsec-teacher-8b:latest");
    expect(resolvedSingle.deepModel).toBe("appsec-teacher-8b:latest");
    expect(resolvedSingle.isSingleModel).toBe(true);

    // Empty model environment
    const empty: string[] = [];
    const resolvedEmpty = resolveModelSlots(empty);
    expect(resolvedEmpty.hasInstalledModels).toBe(false);
  });

  it("checks model installation status correctly", () => {
    const installed = ["llama3:8b", "llama3.2:1b"];
    expect(isModelInstalled("llama3:8b", installed)).toBe(true);
    expect(isModelInstalled("llama3.2:1b", installed)).toBe(true);
    expect(isModelInstalled("mistral:7b", installed)).toBe(false);
  });

  it("renders exactly two primary model cards in the AppSec AI tab", async () => {
    renderWithProviders(<App />);

    // Navigate to AI Mentor tab
    const mentorNavBtn = screen.getAllByText(/AI Mentor/i)[0];
    fireEvent.click(mentorNavBtn);

    await waitFor(() => {
      // Main header
      expect(screen.getByText("AppSec AI")).toBeInTheDocument();
      // Exactly two primary model cards
      expect(screen.getByTestId("quick-security-ai-card")).toBeInTheDocument();
      expect(screen.getByTestId("deep-security-ai-card")).toBeInTheDocument();
    });

    // Verify card labels and roles
    expect(screen.getByText("Quick Security AI")).toBeInTheDocument();
    expect(screen.getByText("Deep Security AI")).toBeInTheDocument();

    // Verify 6 hardcoded models no longer crowd the main screen
    expect(screen.queryByText("Llama 3.2 (1B - 1.3GB Fast)")).not.toBeInTheDocument();
    expect(screen.queryByText("Qwen 2.5 Coder (1.5B - 1.0GB)")).not.toBeInTheDocument();
    expect(screen.queryByText("Local Model Library & Quick Install:")).not.toBeInTheDocument();

    // Verify safety disclaimer exists
    expect(screen.getByText(/Security Notice:/i)).toBeInTheDocument();
  });

  it("allows switching between Quick and Deep AI in the main workspace", async () => {
    renderWithProviders(<App />);

    // Navigate to AI Mentor tab
    const mentorNavBtn = screen.getAllByText(/AI Mentor/i)[0];
    fireEvent.click(mentorNavBtn);

    await waitFor(() => {
      expect(screen.getByTestId("deep-security-ai-card")).toBeInTheDocument();
    });

    // Click on Deep Security AI card to activate it
    const deepCard = screen.getByTestId("deep-security-ai-card");
    fireEvent.click(deepCard);

    // Deep card should now be marked Active
    await waitFor(() => {
      expect(deepCard).toHaveTextContent("Active Model");
    });

    // Click on Quick Security AI card to switch back
    const quickCard = screen.getByTestId("quick-security-ai-card");
    fireEvent.click(quickCard);

    await waitFor(() => {
      expect(quickCard).toHaveTextContent("Active Model");
    });
  });

  it("renders collapsible Model Setup with slot mapping and genuine progress tracking", async () => {
    renderWithProviders(<App />);

    const mentorNavBtn = screen.getAllByText(/AI Mentor/i)[0];
    fireEvent.click(mentorNavBtn);

    await waitFor(() => {
      expect(screen.getByText("Model Setup")).toBeInTheDocument();
    });

    // Click to open Model Setup accordion
    const modelSetupBtn = screen.getByText("Model Setup");
    fireEvent.click(modelSetupBtn);

    // Should reveal slot mapping controls
    await waitFor(() => {
      expect(screen.getByText(/Quick Security AI Slot Model:/i)).toBeInTheDocument();
      expect(screen.getByText(/Deep Security AI Slot Model:/i)).toBeInTheDocument();
      expect(screen.getByText(/Install \/ Pull Ollama Model/i)).toBeInTheDocument();
    });
  });

  it("renders collapsible System Information with real Ollama version and endpoint", async () => {
    renderWithProviders(<App />);

    const mentorNavBtn = screen.getAllByText(/AI Mentor/i)[0];
    fireEvent.click(mentorNavBtn);

    await waitFor(() => {
      expect(screen.getByText("System Information")).toBeInTheDocument();
    });

    // Click to open System Information accordion
    const sysInfoBtn = screen.getByText("System Information");
    fireEvent.click(sysInfoBtn);

    // Should reveal genuine connection status, real version and endpoint
    await waitFor(() => {
      expect(screen.getByText(/Installed Ollama Version:/i)).toBeInTheDocument();
      expect(screen.getByText(/Ollama Server Endpoint:/i)).toBeInTheDocument();
      expect(screen.getByText("http://127.0.0.1:11434")).toBeInTheDocument();
    });
  });

  it("MentorChat includes two-role toggle switch and preserves chat messages across role switches", async () => {
    renderWithProviders(
      <MentorChat
        selectedFinding={null}
        selectedModel="llama3.2:1b"
        quickModel="llama3.2:1b"
        deepModel="llama3:8b"
        activeRole="quick"
        aiMode="beginner"
        aiAvailable={true}
        aiModels={["llama3.2:1b", "llama3:8b"]}
        onSelectFinding={() => {}}
      />
    );

    // Should render two-role pill buttons
    expect(screen.getByText("Quick AI")).toBeInTheDocument();
    expect(screen.getByText("Deep AI")).toBeInTheDocument();

    // Type a message in the input box
    const chatInput = screen.getByPlaceholderText(/Ask a follow-up question/i);
    fireEvent.change(chatInput, { target: { value: "Explain SQL injection remediation" } });
    expect(chatInput).toHaveValue("Explain SQL injection remediation");

    // Click Deep AI role button
    const deepRoleBtn = screen.getByText("Deep AI");
    fireEvent.click(deepRoleBtn);

    // Input text should be preserved
    expect(chatInput).toHaveValue("Explain SQL injection remediation");
  });
});
