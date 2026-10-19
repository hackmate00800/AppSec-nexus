import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MentorChat } from "../MentorChat";
import { AiTaskProvider } from "../context/AiTaskContext";
import { resolveModelSlots } from "../utils/aiModelResolver";
import { invoke } from "@tauri-apps/api/core";

// Helper wrapper providing AiTaskProvider context
function renderWithProvider(ui: React.ReactElement) {
  return render(<AiTaskProvider>{ui}</AiTaskProvider>);
}

describe("DeepSeek API Integration & AI Mentor Multi-Provider Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock implementation that returns valid responses for common commands
    (invoke as any).mockImplementation((cmd: string) => {
      switch (cmd) {
        case "get_ai_tasks":
          return Promise.resolve([]);
        case "get_deepseek_status":
          return Promise.resolve({
            is_configured: true,
            endpoint: "https://api.deepseek.com",
            model: "deepseek-chat",
            status: "available",
            error_message: null,
          });
        case "get_conversation_messages":
          return Promise.resolve([]);
        case "save_conversation_message":
          return Promise.resolve({ id: "msg-1" });
        case "chat_with_mentor":
          return Promise.resolve("### 🛡️ DeepSeek Response\nAnalysis complete.");
        default:
          return Promise.resolve(null);
      }
    });
  });

  describe("1. Provider Selection and Role Routing", () => {
    it("renders Quick AI, Deep AI, and DeepSeek Cloud AI options in the model role selector", async () => {
      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "llama3:8b"]}
          quickModel="llama3.2:1b"
          deepModel="llama3:8b"
          activeRole="quick"
        />
      );

      // Verify Quick AI and Deep AI exist
      expect(screen.getByText("Quick AI")).toBeInTheDocument();
      expect(screen.getByText("Deep AI")).toBeInTheDocument();

      // Verify DeepSeek button is rendered
      const deepseekBtn = screen.getByTestId("deepseek-role-button");
      expect(deepseekBtn).toBeInTheDocument();
      expect(deepseekBtn).toHaveTextContent(/DeepSeek/i);
    });

    it("switches active role to deepseek and displays Cloud Transmission Privacy Advisory", async () => {
      const handleSelectRole = vi.fn();
      const handleSelectModel = vi.fn();

      renderWithProvider(
        <MentorChat
          selectedModel="llama3.2:1b"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b", "llama3:8b"]}
          quickModel="llama3.2:1b"
          deepModel="llama3:8b"
          activeRole="quick"
          onSelectRole={handleSelectRole}
          onSelectModel={handleSelectModel}
        />
      );

      const deepseekBtn = screen.getByTestId("deepseek-role-button");
      fireEvent.click(deepseekBtn);

      expect(handleSelectRole).toHaveBeenCalledWith("deepseek");
      expect(handleSelectModel).toHaveBeenCalledWith("deepseek-chat");

      // Verify privacy banner renders with external transmission disclosure
      await waitFor(() => {
        expect(screen.getByTestId("deepseek-privacy-banner")).toBeInTheDocument();
        expect(screen.getByText(/DeepSeek Cloud Provider Active/i)).toBeInTheDocument();
        expect(screen.getByText(/transmitted securely over TLS to DeepSeek API/i)).toBeInTheDocument();
      });
    });

    it("displays configuration error notice when DeepSeek API key is not configured", async () => {
      (invoke as any).mockImplementation((cmd: string) => {
        if (cmd === "get_deepseek_status") {
          return Promise.resolve({
            is_configured: false,
            endpoint: "https://api.deepseek.com",
            model: "deepseek-chat",
            status: "not_configured",
            error_message: "DEEPSEEK_API_KEY environment variable is not configured.",
          });
        }
        if (cmd === "get_ai_tasks" || cmd === "get_conversation_messages") {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      renderWithProvider(
        <MentorChat
          selectedModel="deepseek-chat"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b"]}
          quickModel="llama3.2:1b"
          deepModel="llama3.2:1b"
          activeRole="deepseek"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("deepseek-privacy-banner")).toBeInTheDocument();
        expect(screen.getByText(/DEEPSEEK_API_KEY environment variable is not configured/i)).toBeInTheDocument();
        expect(screen.getByText(/No Key/i)).toBeInTheDocument();
      });
    });
  });

  describe("2. Request Lifecycle & Fallback Safety", () => {
    it("routes message to chat_with_mentor with deepseek-chat when DeepSeek role is active", async () => {
      const mockChatWithMentor = vi.fn().mockResolvedValue(
        "### 🛡️ DeepSeek Cloud Analysis\nSQL Injection in `/api/users` is caused by dynamic string interpolation."
      );

      (invoke as any).mockImplementation((cmd: string, args: any) => {
        if (cmd === "get_deepseek_status") {
          return Promise.resolve({
            is_configured: true,
            endpoint: "https://api.deepseek.com",
            model: "deepseek-chat",
            status: "available",
            error_message: null,
          });
        }
        if (cmd === "get_ai_tasks" || cmd === "get_conversation_messages") {
          return Promise.resolve([]);
        }
        if (cmd === "chat_with_mentor") {
          return mockChatWithMentor(args);
        }
        if (cmd === "save_conversation_message") {
          return Promise.resolve({ id: "msg-1" });
        }
        return Promise.resolve(null);
      });

      renderWithProvider(
        <MentorChat
          selectedModel="deepseek-chat"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b"]}
          quickModel="llama3.2:1b"
          deepModel="llama3.2:1b"
          activeRole="deepseek"
        />
      );

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      fireEvent.change(input, { target: { value: "Explain SQL injection remediation in Node.js" } });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(mockChatWithMentor).toHaveBeenCalled();
        const callArgs = mockChatWithMentor.mock.calls[0][0];
        expect(callArgs.model).toBe("deepseek-chat");
      });

      await waitFor(() => {
        expect(screen.getByText(/DeepSeek Cloud Analysis/i)).toBeInTheDocument();
      });
    });

    it("displays actionable configuration instructions when API key error is returned", async () => {
      const mockChat = vi.fn().mockRejectedValue("DeepSeek API key is not configured. Set DEEPSEEK_API_KEY in your environment or .env file.");
      (invoke as any).mockImplementation((cmd: string, args: any) => {
        if (cmd === "get_deepseek_status") {
          return Promise.resolve({
            is_configured: false,
            endpoint: "https://api.deepseek.com",
            model: "deepseek-chat",
            status: "not_configured",
            error_message: null,
          });
        }
        if (cmd === "get_ai_tasks" || cmd === "get_conversation_messages") {
          return Promise.resolve([]);
        }
        if (cmd === "chat_with_mentor") {
          return mockChat(args);
        }
        if (cmd === "save_conversation_message") {
          return Promise.resolve({ id: "msg-1" });
        }
        return Promise.resolve(null);
      });

      renderWithProvider(
        <MentorChat
          selectedModel="deepseek-chat"
          aiMode="advanced"
          aiAvailable={true}
          aiModels={["llama3.2:1b"]}
          quickModel="llama3.2:1b"
          deepModel="llama3.2:1b"
          activeRole="deepseek"
        />
      );

      const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
      const sendBtn = screen.getByRole("button", { name: /Send/i });

      fireEvent.change(input, { target: { value: "Test prompt" } });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(mockChat).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/DeepSeek API Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Configuration Guide/i)).toBeInTheDocument();
      });
    });

    it("preserves local models when switching roles without corrupting quick/deep configurations", () => {
      const slots = resolveModelSlots(["llama3.2:1b", "llama3:8b"]);
      expect(slots.quickModel).toBe("llama3.2:1b");
      expect(slots.deepModel).toBe("llama3:8b");
    });
  });
});
