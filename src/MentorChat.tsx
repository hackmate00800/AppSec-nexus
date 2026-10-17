import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  GitBranch
} from "lucide-react";
import { Finding, ChatMessage } from "./types";
import { SecurityFlowchart } from "./Flowchart";

interface MentorChatProps {
  selectedFinding?: Finding | null;
  selectedModel: string;
  aiMode: "beginner" | "advanced";
  aiAvailable: boolean;
  onSelectFinding?: (f: Finding | null) => void;
}

export function MentorChat({
  selectedFinding,
  selectedModel,
  aiMode,
  aiAvailable,
}: MentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFlowchart, setShowFlowchart] = useState<boolean>(false);
  const [activeFlowchartType, setActiveFlowchartType] = useState<string>("general");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or update chat context when selectedFinding changes
  useEffect(() => {
    if (selectedFinding) {
      setActiveFlowchartType(selectedFinding.title);
      setShowFlowchart(true);
      const initialGreeting: ChatMessage = {
        role: "assistant",
        content: `👋 Hello! I am your AI Security Mentor. I have loaded context for finding **"${selectedFinding.title}"** (Severity: **${selectedFinding.severity}**, Asset: \`${selectedFinding.affected_asset}\`).\n\nYou can ask me follow-up questions, request defensive code examples (Nginx, Python, Node.js), or explore the attack flowchart below!`,
      };
      setMessages([initialGreeting]);
    } else if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "👋 Welcome to the **Local AI Security Mentor**! Ask me anything about web vulnerabilities, penetration testing methodologies, Linux/Windows security hardening, networking protocols, or defensive architecture. I operate 100% locally on your machine.",
        },
      ]);
    }
  }, [selectedFinding]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSendMessage(promptText?: string) {
    const textToSend = (promptText || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputPrompt("");
    setIsLoading(true);

    // If asking about a flowchart, automatically trigger flowchart visualizer
    if (textToSend.toLowerCase().includes("flowchart") || textToSend.toLowerCase().includes("diagram")) {
      setShowFlowchart(true);
      if (selectedFinding) {
        setActiveFlowchartType(selectedFinding.title);
      } else {
        setActiveFlowchartType(textToSend);
      }
    }

    try {
      const model = selectedModel || "llama3.2:1b";
      let systemPrompt = `You are the local AppSec Nexus AI Security Mentor. Persona mode: ${aiMode}. \
Adhere strictly to defensive guidance, remediation, and educational explanations. \
Never output executable weaponized exploits.`;

      if (selectedFinding) {
        systemPrompt += `\nCurrent Finding Context:
- Title: ${selectedFinding.title}
- Severity: ${selectedFinding.severity}
- Asset: ${selectedFinding.affected_asset}
- Evidence: ${selectedFinding.evidence}
- CWE: ${selectedFinding.cwe || "N/A"}
- Default Solution: ${selectedFinding.remediation}`;
      }

      // Convert history for Rust backend
      const response = await invoke<string>("chat_with_mentor", {
        model,
        system: systemPrompt,
        messages: updatedHistory,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (err: any) {
      const errMsg = err?.toString() || "Unknown error";
      const isConn = errMsg.toLowerCase().includes("connect") || errMsg.toLowerCase().includes("11434");

      let fallbackText = `⚠️ **Local AI Engine Offline / Timeout**\n\n`;
      if (isConn) {
        fallbackText += `Could not reach Ollama at \`127.0.0.1:11434\`. Please ensure Ollama is running (\`ollama serve\`).\n\n`;
      } else {
        fallbackText += `Error: ${errMsg}\n\n`;
      }

      if (selectedFinding) {
        fallbackText += `💡 **Defensive Summary for "${selectedFinding.title}"**:\n` +
          `- **Recommended Action**: ${selectedFinding.remediation}\n` +
          `- **Affected Asset**: \`${selectedFinding.affected_asset}\`\n` +
          `- **CWE Reference**: ${selectedFinding.cwe || "N/A"}`;
      } else {
        fallbackText += `💡 **Cybersecurity Tip**: Always enforce least privilege, enable defense-in-depth security headers (CSP, HSTS, X-Frame-Options), and sanitize all user input before processing.`;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  }

  const quickPrompts = [
    { label: "📊 Show Flowchart", text: "Show me an attack and defense architecture flowchart for this vulnerability" },
    { label: "🛡️ How to fix in Nginx/Apache?", text: "Give me the exact web server configuration (Nginx / Apache) to fix this vulnerability." },
    { label: "💻 Code Example (Python/Node)", text: "Provide a secure code snippet in Python or Node.js demonstrating how to fix this." },
    { label: "🔍 Verification Steps", text: "How can I verify and audit whether this vulnerability is successfully patched using curl or browser devtools?" },
    { label: "⚠️ Exploit Impact", text: "What is the worst-case real-world impact if an attacker exploits this flaw?" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "14px" }}>
      {/* Header & Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>
            Interactive Security Mentor Chat
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              padding: "2px 8px",
              borderRadius: "999px",
              backgroundColor: aiAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: aiAvailable ? "var(--accent-emerald)" : "var(--accent-amber)",
              fontWeight: 600,
            }}
          >
            {selectedModel || "Offline Fallback"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className={`btn btn-secondary ${showFlowchart ? "active" : ""}`}
            style={{ padding: "4px 10px", fontSize: "0.78rem" }}
            onClick={() => setShowFlowchart(!showFlowchart)}
          >
            <GitBranch size={14} color="var(--accent-cyan)" />
            {showFlowchart ? "Hide Flowchart" : "View Flowchart"}
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px", fontSize: "0.78rem" }}
            onClick={() => {
              setMessages([]);
              setShowFlowchart(false);
            }}
            title="Clear Chat Thread"
          >
            <RotateCcw size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Visual Flowchart Display if active */}
      {showFlowchart && (
        <SecurityFlowchart
          vulnerabilityType={activeFlowchartType}
          customTitle={selectedFinding ? `Visual Flowchart: ${selectedFinding.title}` : undefined}
        />
      )}

      {/* Chat Messages Log */}
      <div
        style={{
          flex: 1,
          minHeight: "260px",
          maxHeight: "440px",
          overflowY: "auto",
          backgroundColor: "#050811",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(6, 182, 212, 0.2)",
                  border: "1px solid rgba(6, 182, 212, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Bot size={16} color="var(--accent-cyan)" />
              </div>
            )}

            <div
              style={{
                backgroundColor: msg.role === "user" ? "rgba(6, 182, 212, 0.18)" : "var(--bg-secondary)",
                border: `1px solid ${msg.role === "user" ? "rgba(6, 182, 212, 0.4)" : "var(--border-color)"}`,
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "0.86rem",
                lineHeight: "1.55",
                whiteSpace: "pre-wrap",
                color: "var(--text-main)",
                wordBreak: "break-word",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "4px", fontWeight: 600 }}>
                {msg.role === "user" ? "You (Pentester / Learner)" : "AI Security Mentor"}
              </div>
              {msg.content}
            </div>

            {msg.role === "user" && (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(168, 85, 247, 0.2)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <User size={16} color="var(--accent-purple)" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", color: "var(--accent-cyan)" }}>
            <Bot size={18} className="pulse" />
            <span style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
              Mentor is analyzing security implications and compiling guidance...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            className="filter-chip"
            style={{ fontSize: "0.74rem", padding: "4px 10px" }}
            onClick={() => handleSendMessage(qp.text)}
            disabled={isLoading}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Prompt Input Box */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          className="input-field"
          placeholder="Ask a follow-up question (e.g., 'How do I remediate this in Nginx?', 'Show exploit flow')..."
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
        />
        <button
          className="btn btn-primary"
          style={{ padding: "10px 18px", flexShrink: 0 }}
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputPrompt.trim()}
        >
          <Send size={16} /> Send
        </button>
      </div>
    </div>
  );
}
