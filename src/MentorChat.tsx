import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  Loader2,
  Play,
  Zap,
  Power,
  Copy,
  Check,
  Pencil,
  X,
  Bookmark,
  BookmarkCheck,
  Download,
  Search,
  BookOpen,
  Cpu,
} from "lucide-react";
import { Finding, ChatMessage, ValidationRecord, AiChatMessageRecord } from "./types";
import { SecurityFlowchart } from "./Flowchart";
import { ValidationBadge } from "./components/ui/Badge";
import { MarkdownViewer } from "./components/ui/MarkdownViewer";
import { useAiTaskContext } from "./context/AiTaskContext";
import { ContextualHelpButton } from "./components/help/ContextualHelpButton";
import { AiSecurityGuard } from "./utils/securityDsa";
import { SecurityAiRole } from "./types";
import { formatModelDisplayName, resolveModelSlots } from "./utils/aiModelResolver";
import { SecurityCategory } from "./categories/types";
import { getCategoryAiPersona } from "./categories/aiPersonas";
import { CategorySelector } from "./categories/CategorySelector";

interface MentorChatProps {
  selectedFinding?: Finding | null;
  selectedModel: string;
  aiMode: "beginner" | "advanced";
  aiAvailable: boolean;
  aiModels?: string[];
  quickModel?: string;
  deepModel?: string;
  activeRole?: SecurityAiRole;
  onSelectRole?: (role: SecurityAiRole) => void;
  onSelectModel?: (m: string) => void;
  onSelectFinding?: (f: Finding | null) => void;
  onFindingValidated?: (f: Finding) => void;
  onRefreshAiStatus?: () => Promise<void>;
  isAiEnabled?: boolean;
  onToggleAiEnabled?: (enabled: boolean) => void;
  activeCategory?: SecurityCategory;
  onSelectCategory?: (category: SecurityCategory) => void;
  initialPrompt?: string;
}

export type StudyDepth = "beginner" | "intermediate" | "advanced" | "professional";

export function MentorChat({
  selectedFinding,
  selectedModel,
  aiMode,
  aiAvailable,
  aiModels = [],
  quickModel: propQuickModel,
  deepModel: propDeepModel,
  activeRole: propActiveRole,
  onSelectRole,
  onSelectModel,
  onFindingValidated,
  onRefreshAiStatus,
  isAiEnabled: externalAiEnabled,
  onToggleAiEnabled,
  activeCategory: propActiveCategory,
  onSelectCategory,
  initialPrompt,
}: MentorChatProps) {
  // Category-specific persona state
  const [internalCategory, setInternalCategory] = useState<SecurityCategory>("web");
  const effectiveCategory = propActiveCategory || internalCategory;
  const handleCategorySwitch = (cat: SecurityCategory) => {
    setInternalCategory(cat);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };
  const categoryPersona = useMemo(() => getCategoryAiPersona(effectiveCategory), [effectiveCategory]);

  // Derive effective Quick and Deep models and role
  const resolvedSlots = useMemo(() => resolveModelSlots(aiModels), [aiModels]);
  const effectiveQuickModel = propQuickModel || resolvedSlots.quickModel;
  const effectiveDeepModel = propDeepModel || resolvedSlots.deepModel;

  const [internalRole, setInternalRole] = useState<SecurityAiRole>(() => {
    if (propActiveRole) return propActiveRole;
    if (
      selectedModel &&
      (selectedModel.toLowerCase().includes("8b") ||
        selectedModel.toLowerCase().includes("deep") ||
        selectedModel.toLowerCase().includes("appsec-teacher-8b"))
    ) {
      return "deep";
    }
    return "quick";
  });

  const effectiveRole = propActiveRole || internalRole;

  const handleRoleSwitch = (newRole: SecurityAiRole) => {
    setInternalRole(newRole);
    if (onSelectRole) {
      onSelectRole(newRole);
    }
    const targetModel = newRole === "quick" ? effectiveQuickModel : effectiveDeepModel;
    if (onSelectModel && targetModel) {
      onSelectModel(targetModel);
    }
  };
  // Global persistent AI task context
  const { submitTask, cancelTask, getTaskForConversation } = useAiTaskContext();
  const conversationId = selectedFinding ? `finding-${selectedFinding.id}` : "global-mentor";
  const activeTask = getTaskForConversation(conversationId);
  const isTaskRunning = Boolean(
    activeTask && (activeTask.status === "Queued" || activeTask.status === "Running")
  );

  // Core chat state (initialized synchronously so initial greeting is immediately available)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (selectedFinding) {
      return [
        {
          role: "assistant",
          content: `👋 Hello! I am your AI Security Mentor. I have loaded context for finding **"${selectedFinding.title}"** (Severity: **${selectedFinding.severity}**, Asset: \`${selectedFinding.affected_asset}\`).\n\nI analyze both scanner detections and deterministic validation observations. You can run an independent validation probe, ask follow-up questions, request defensive code examples (Nginx, Python, Node.js), or explore the attack flowchart below!`,
        },
      ];
    }
    return [
      {
        role: "assistant",
        content:
          "👋 Welcome to the **Local AI Security Mentor**! Ask me anything about web vulnerabilities, penetration testing methodologies, Linux/Windows security hardening, networking protocols, or defensive architecture. I operate 100% locally on your machine.",
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState<string>("");

  useEffect(() => {
    if (initialPrompt) {
      setInputPrompt(initialPrompt);
    }
  }, [initialPrompt]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFlowchart, setShowFlowchart] = useState<boolean>(false);
  const [activeFlowchartType, setActiveFlowchartType] = useState<string>("general");
  const [validationRecord, setValidationRecord] = useState<ValidationRecord | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [showValidationCard, setShowValidationCard] = useState<boolean>(true);
  const [isStartingOllama, setIsStartingOllama] = useState<boolean>(false);
  const [isStoppingOllama, setIsStoppingOllama] = useState<boolean>(false);

  // 1. Ollama ON / OFF Toggle state (persisted in localStorage)
  const [internalAiEnabled, setInternalAiEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("appsec_ai_mentor_enabled");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const isAiEnabled = externalAiEnabled !== undefined ? externalAiEnabled : internalAiEnabled;

  // 2. Edit message state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  // 3. Copy feedback state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 4. Study / Learning features
  const [studyDepth, setStudyDepth] = useState<StudyDepth>(() => {
    return aiMode === "beginner" ? "beginner" : "advanced";
  });
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);
  const [bookmarkedIndices, setBookmarkedIndices] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("appsec_chat_bookmarks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevTaskIdRef = useRef<string | null>(null);

  // Context token budget estimation
  const tokenCount = useMemo(() => {
    return (
      messages.reduce((acc, m) => acc + AiSecurityGuard.estimateTokens(m.content), 0) +
      AiSecurityGuard.estimateTokens(inputPrompt)
    );
  }, [messages, inputPrompt]);

  const tokenBudget = useMemo(
    () => AiSecurityGuard.checkContextBudget(tokenCount, 8192),
    [tokenCount]
  );

  // Save bookmark preferences
  useEffect(() => {
    try {
      localStorage.setItem("appsec_chat_bookmarks", JSON.stringify(bookmarkedIndices));
    } catch (e) {
      console.warn("Failed to persist chat bookmarks:", e);
    }
  }, [bookmarkedIndices]);

  // Load conversation messages from SQLite on mount or when conversationId changes
  const loadConversationMessages = useCallback(async () => {
    if (selectedFinding) {
      setActiveFlowchartType(selectedFinding.title);
      setShowFlowchart(true);

      invoke<ValidationRecord[]>("get_validation_history", { findingId: selectedFinding.id })
        .then((records) => {
          if (records && records.length > 0) {
            setValidationRecord(records[0]);
          } else {
            setValidationRecord(null);
          }
        })
        .catch(() => setValidationRecord(null));
    } else {
      setValidationRecord(null);
    }

    if (isTauri()) {
      try {
        const records = await invoke<AiChatMessageRecord[]>("get_conversation_messages", {
          conversationId,
        });
        if (records && records.length > 0) {
          setMessages(records.map((r) => ({ role: r.role, content: r.content })));
          return;
        }
      } catch (err) {
        console.warn("Could not load stored messages from database:", err);
      }
    }

    // Default initial greeting if no previous messages in database
    if (selectedFinding) {
      const initialGreeting: ChatMessage = {
        role: "assistant",
        content: `👋 Hello! I am your AI Security Mentor. I have loaded context for finding **"${selectedFinding.title}"** (Severity: **${selectedFinding.severity}**, Asset: \`${selectedFinding.affected_asset}\`).\n\nI analyze both scanner detections and deterministic validation observations. You can run an independent validation probe, ask follow-up questions, request defensive code examples (Nginx, Python, Node.js), or explore the attack flowchart below!`,
      };
      setMessages([initialGreeting]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: "👋 Welcome to the **Local AI Security Mentor**! Ask me anything about web vulnerabilities, penetration testing methodologies, Linux/Windows security hardening, networking protocols, or defensive architecture. I operate 100% locally on your machine.",
        },
      ]);
    }
  }, [conversationId, selectedFinding]);

  useEffect(() => {
    loadConversationMessages();
  }, [loadConversationMessages]);

  // When an active background AI task completes, reload conversation messages from database
  useEffect(() => {
    if (activeTask) {
      prevTaskIdRef.current = activeTask.id;
    } else if (prevTaskIdRef.current) {
      prevTaskIdRef.current = null;
      loadConversationMessages();
    }
  }, [activeTask, loadConversationMessages]);

  // Sync internal AI enabled preference
  function handleToggleAiEnabled() {
    const nextState = !isAiEnabled;
    setInternalAiEnabled(nextState);
    try {
      localStorage.setItem("appsec_ai_mentor_enabled", String(nextState));
    } catch (e) {
      console.warn("Failed to persist AI enabled state:", e);
    }

    if (onToggleAiEnabled) {
      onToggleAiEnabled(nextState);
    }

    if (!nextState) {
      handleStopOllamaService();
    } else if (!aiAvailable) {
      handleStartOllamaService(false);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isTaskRunning]);

  async function handleRunValidation() {
    if (!selectedFinding || isValidating) return;
    setIsValidating(true);

    try {
      const record = await invoke<ValidationRecord>("validate_finding", {
        findingId: selectedFinding.id,
      });
      setValidationRecord(record);

      if (onFindingValidated) {
        onFindingValidated({
          ...selectedFinding,
          status: record.status as any,
          validation_status: record.status,
          confidence: record.confidence_score,
        });
      }

      const auditNote: ChatMessage = {
        role: "assistant",
        content: `🔬 **Deterministic Validation Complete**\n\n` +
          `- **Status**: \`${record.status}\` (${record.confidence_score}% confidence)\n` +
          `- **Test Method**: ${record.test_method}\n` +
          `- **Hypothesis**: ${record.hypothesis}\n` +
          `- **Actual Observation**: ${record.actual_observation}\n` +
          `- **Supporting Facts**: ${record.supporting_evidence}\n` +
          `- **Contradicting Facts**: ${record.contradicting_evidence}\n` +
          `- **Rationale**: ${record.confidence_rationale}`,
      };
      setMessages((prev) => [...prev, auditNote]);
    } catch (err: any) {
      const errNote: ChatMessage = {
        role: "assistant",
        content: `⚠️ **Validation Probe Failed**: ${err?.toString() || "Unknown error during test execution"}`,
      };
      setMessages((prev) => [...prev, errNote]);
    } finally {
      setIsValidating(false);
    }
  }

  async function handleStartOllamaService(retryLastMessage = false) {
    setIsStartingOllama(true);
    try {
      const msg = await invoke<string>("start_ollama_service");
      if (onRefreshAiStatus) {
        await onRefreshAiStatus();
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **Ollama Service Active**: ${msg}\n\nLocal AI engine is online. Ready for queries!`,
        },
      ]);
      if (retryLastMessage) {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          setTimeout(() => handleSendMessage(lastUser.content), 400);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Failed to launch Ollama**: ${err?.toString() || "Unknown error"}\n\nPlease verify that Ollama is installed. You can also start it manually in a terminal using \`ollama serve\`.`,
        },
      ]);
    } finally {
      setIsStartingOllama(false);
    }
  }

  async function handleStopOllamaService() {
    setIsStoppingOllama(true);
    try {
      await invoke<string>("stop_ollama_service");
      if (onRefreshAiStatus) {
        await onRefreshAiStatus();
      }
    } catch (err: any) {
      console.warn("Failed to stop Ollama process:", err);
    } finally {
      setIsStoppingOllama(false);
    }
  }

  async function handleSendMessage(promptText?: string, replaceAtIndex?: number) {
    const textToSend = (promptText || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    // Check if AI is toggled OFF
    if (!isAiEnabled) {
      const userMsg: ChatMessage = { role: "user", content: textToSend };
      let newThread = [...messages];
      if (replaceAtIndex !== undefined) {
        newThread = newThread.slice(0, replaceAtIndex);
      }
      newThread.push(userMsg);

      let deterministicTip = `ℹ️ **Ollama AI Engine is currently turned OFF (Resource Saving Mode)**\n\n`;
      if (selectedFinding) {
        deterministicTip += `💡 **Deterministic Security Facts for "${selectedFinding.title}"**:\n` +
          `- **Recommended Fix**: ${selectedFinding.remediation}\n` +
          `- **Affected Asset**: \`${selectedFinding.affected_asset}\`\n` +
          `- **CWE Reference**: ${selectedFinding.cwe || "N/A"}\n\n` +
          `Toggle the **Ollama AI Engine** switch above to **ON** to ask the local LLM!`;
      } else {
        deterministicTip += `💡 **Study Tip**: Enforce strict input validation, principle of least privilege, and defense-in-depth headers.\n\n` +
          `Toggle the **Ollama AI Engine** switch above to **ON** to query local models.`;
      }

      newThread.push({ role: "assistant", content: deterministicTip });
      setMessages(newThread);
      setInputPrompt("");
      setEditingIndex(null);
      return;
    }


    const userMsg: ChatMessage = { role: "user", content: textToSend };
    let updatedHistory = [...messages];

    // If editing a past message, truncate from that index
    if (replaceAtIndex !== undefined) {
      updatedHistory = updatedHistory.slice(0, replaceAtIndex);
    }

    updatedHistory.push(userMsg);
    setMessages(updatedHistory);
    setInputPrompt("");
    setEditingIndex(null);
    setIsLoading(true);

    if (textToSend.toLowerCase().includes("flowchart") || textToSend.toLowerCase().includes("diagram")) {
      setShowFlowchart(true);
      if (selectedFinding) {
        setActiveFlowchartType(selectedFinding.title);
      } else {
        setActiveFlowchartType(textToSend);
      }
    }

    try {
      const roleModel = effectiveRole === "quick" ? effectiveQuickModel : effectiveDeepModel;
      const model = roleModel || selectedModel || "llama3.2:1b";
      let systemPrompt: string | undefined = undefined;

      const depthDirectives: Record<StudyDepth, string> = {
        beginner: "Educational Level: BEGINNER. Break down concepts with clear analogies, plain-English root causes, and step-by-step developer remediation.",
        intermediate: "Educational Level: INTERMEDIATE. Detail architecture flaws, vulnerable code patterns, and web server / framework security mechanisms.",
        advanced: "Educational Level: ADVANCED PENTESTER. Provide in-depth exploit mechanisms, HTTP request/response proofs-of-concept, and protocol-level bypass analysis for authorized labs.",
        professional: "Educational Level: PROFESSIONAL APPSEC. Detail CVSS v3.1 calculations, threat modeling, defense-in-depth engineering, and compliance mappings (OWASP, NIST, CIS).",
      };

      const personaContext = `Active Security Specialization: ${categoryPersona.roleTitle}.
Domain Focus: ${categoryPersona.specialty}.
${categoryPersona.systemPrompt}`;

      if (selectedFinding) {
        systemPrompt = `${personaContext}

You are APPSC NEXUS AI Mentor assisting with finding "${selectedFinding.title}".
${depthDirectives[studyDepth]}
Finding Details:
- Title: ${selectedFinding.title}
- Severity: ${selectedFinding.severity}
- Asset: ${selectedFinding.affected_asset}
- Validation Status: ${validationRecord?.status || selectedFinding.validation_status || "NEEDS_VALIDATION"}
- Validation Hypothesis: ${validationRecord?.hypothesis || "Automated scanner report awaiting independent confirmation."}
- Actual Observed Evidence: ${validationRecord?.actual_observation || selectedFinding.evidence}
- Supporting Facts: ${validationRecord?.supporting_evidence || "Scanner pattern match"}
- Contradicting Facts: ${validationRecord?.contradicting_evidence || "None documented"}
- Confidence Score: ${validationRecord?.confidence_score ?? selectedFinding.confidence}%
- CWE: ${selectedFinding.cwe || "N/A"}
- Recommended Remediation: ${selectedFinding.remediation}

Provide technically deep, dual-perspective cybersecurity education and actionable guidance. Always include copy-pasteable remediation code snippets where applicable.`;
      } else {
        systemPrompt = `${personaContext}

You are APPSC NEXUS AI Mentor.
${depthDirectives[studyDepth]}
Provide technically deep, dual-perspective cybersecurity education, lab reproduction guidelines, and secure code remediations.`;
      }

      // Persist user message to SQLite
      if (isTauri()) {
        invoke("save_conversation_message", {
          conversationId,
          role: "user",
          content: textToSend,
          taskId: null,
        }).catch((e) => console.warn("Failed to persist user message:", e));
      }

      const cleanHistory = updatedHistory.filter((m) => {
        const c = m.content.trim();
        return !c.startsWith("👋") &&
          !c.startsWith("⚠️ **Local AI Engine Offline") &&
          !c.startsWith("Could not reach Ollama") &&
          !c.startsWith("ℹ️ **Ollama AI Engine is currently turned OFF");
      });

      let response = "";
      try {
        response = await invoke<string>("chat_with_mentor", {
          model,
          system: systemPrompt,
          messages: cleanHistory.length > 0 ? cleanHistory : [userMsg],
        });
      } catch {
        const task = await submitTask(
          conversationId,
          model,
          systemPrompt || null,
          cleanHistory.length > 0 ? cleanHistory : [userMsg]
        );
        response = task.result || "";
      }

      if (response) {
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
        if (isTauri()) {
          invoke("save_conversation_message", {
            conversationId,
            role: "assistant",
            content: response,
            taskId: null,
          }).catch((e) => console.warn("Failed to persist assistant message:", e));
        }
      }
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

  // Clear conversation history in SQLite and reset to clean welcome state
  async function handleClearConversation() {
    if (isTauri()) {
      try {
        await invoke("clear_conversation_messages", { conversationId });
      } catch (e) {
        console.warn("Failed to clear conversation messages from database:", e);
      }
    }
    loadConversationMessages();
  }

  // Copy message text to clipboard
  function handleCopyMessage(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  // Toggle bookmark for study notes
  function handleToggleBookmark(index: number) {
    setBookmarkedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  // Regenerate assistant response
  function handleRegenerateResponse(assistantIdx: number) {
    // Find preceding user message
    let precedingUserPrompt = "";
    let userMsgIdx = -1;

    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        precedingUserPrompt = messages[i].content;
        userMsgIdx = i;
        break;
      }
    }

    if (precedingUserPrompt && userMsgIdx >= 0) {
      handleSendMessage(precedingUserPrompt, userMsgIdx);
    }
  }

  // Export chat as Markdown Study Notes
  function handleExportStudyNotes() {
    const title = selectedFinding ? selectedFinding.title : "Cybersecurity Study Session";
    let markdown = `# AppSec Nexus — AI Mentor Study Notes\n`;
    markdown += `**Topic / Finding**: ${title}\n`;
    if (selectedFinding) {
      markdown += `**Severity**: ${selectedFinding.severity} | **CWE**: ${selectedFinding.cwe || "N/A"} | **Asset**: ${selectedFinding.affected_asset}\n`;
    }
    markdown += `**Generated**: ${new Date().toLocaleString()}\n`;
    markdown += `**Study Depth**: ${studyDepth.toUpperCase()}\n\n---\n\n`;

    const notesToExport = showOnlyBookmarks
      ? messages.filter((_, idx) => bookmarkedIndices.includes(idx))
      : messages;

    notesToExport.forEach((msg) => {
      const sender = msg.role === "user" ? "### 👤 Pentester / Student" : "### 🛡️ AI Security Mentor";
      markdown += `${sender}\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AppSec-Study-Notes-${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Curated Learning Mode Workflow Prompts + Category-Specific Prompts
  const categoryChips = useMemo(() => {
    return categoryPersona.starterPromptChips.map((chip) => ({
      label: chip.label,
      text: chip.text,
    }));
  }, [categoryPersona]);

  const learningWorkflow = useMemo(() => [
    ...categoryChips,
    { label: "📖 Concept & Mechanism", text: "Explain the technical concept, mechanism, and how this vulnerability works under the hood." },
    { label: "⚙️ Root Cause", text: "What is the exact architectural, design, or coding flaw that causes this vulnerability?" },
    { label: "🧪 Lab Reproduction", text: "How can I safely reproduce and observe this vulnerability in an authorized testing lab (e.g. OWASP Juice Shop, DVWA, WebGoat, or local curl)?" },
    { label: "🔍 Detection & Audit", text: "How do security auditors detect this vulnerability using active/passive testing, curl, or log analysis?" },
    { label: "⚖️ False-Positive Validation", text: "How can I distinguish a true positive finding from an automated scanner false positive or benign behavior?" },
    { label: "📊 Severity & CVSS", text: "What is the realistic CVSS v3.1 score and real-world impact across Confidentiality, Integrity, and Availability?" },
    { label: "🛡️ Defense & Secure Code", text: "Provide defense-in-depth remediation with production-ready, copy-pasteable code examples in Python, Node.js, and web server configuration." },
    { label: "🔄 Retest & Verify", text: "Provide step-by-step verification commands (e.g. curl) to confirm the fix works and the vulnerability is closed." },
    { label: "📝 Pentest Report Finding", text: "Generate a complete professional penetration testing finding report with executive summary, CVSS vector, technical description, and remediation." },
    { label: "📊 Show Flowchart", text: "Show me an attack and defense architecture flowchart for this vulnerability." },
  ], [categoryChips]);

  // Filtered messages for search / bookmarks
  const displayMessages = useMemo(() => {
    return messages
      .map((msg, originalIdx) => ({ msg, originalIdx }))
      .filter(({ msg, originalIdx }) => {
        if (showOnlyBookmarks && !bookmarkedIndices.includes(originalIdx)) {
          return false;
        }
        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          return msg.content.toLowerCase().includes(q);
        }
        return true;
      });
  }, [messages, showOnlyBookmarks, bookmarkedIndices, searchFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* =========================================================================
          HEADER BAR: TITLE, MODEL SELECTOR, ENGINE ON/OFF TOGGLE & STUDY TOOLS
          ========================================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          backgroundColor: "var(--bg-secondary)",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: "0.98rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={17} color="var(--accent-cyan)" />
            <span>Interactive Security Mentor Chat</span>
            <ContextualHelpButton
              articleId="ai-mentor-guidance"
              tourTrackId="ai_mentor"
              workflowId="ai-mentor-workflow"
              title="AI Mentor Guidance"
            />
          </div>

          {/* Two-Model Role Selector */}
          <div
            data-tour="mentor-model-selector"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "2px",
            }}
          >
            {aiModels && aiModels.length > 0 ? (
              <>
                <button
                  type="button"
                  className={`role-toggle-btn ${effectiveRole === "quick" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("quick")}
                  disabled={!isAiEnabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 9px",
                    fontSize: "0.74rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: isAiEnabled ? "pointer" : "not-allowed",
                    background: effectiveRole === "quick" ? "var(--accent-cyan)" : "transparent",
                    color: effectiveRole === "quick" ? "#000" : "var(--text-main)",
                    fontWeight: effectiveRole === "quick" ? 700 : 500,
                    opacity: isAiEnabled ? 1 : 0.6,
                    transition: "all 0.15s ease",
                  }}
                  title={`Quick Security AI (${effectiveQuickModel}) — Fast response for everyday security questions`}
                >
                  <span>⚡</span>
                  <span>Quick AI</span>
                  <span style={{ fontSize: "0.68rem", opacity: 0.85, fontFamily: "monospace" }}>
                    ({formatModelDisplayName(effectiveQuickModel)})
                  </span>
                </button>

                <button
                  type="button"
                  className={`role-toggle-btn ${effectiveRole === "deep" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("deep")}
                  disabled={!isAiEnabled}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 9px",
                    fontSize: "0.74rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: isAiEnabled ? "pointer" : "not-allowed",
                    background: effectiveRole === "deep" ? "var(--accent-purple, #a855f7)" : "transparent",
                    color: effectiveRole === "deep" ? "#fff" : "var(--text-main)",
                    fontWeight: effectiveRole === "deep" ? 700 : 500,
                    opacity: isAiEnabled ? 1 : 0.6,
                    transition: "all 0.15s ease",
                  }}
                  title={`Deep Security AI (${effectiveDeepModel}) — Thorough reasoning for complex vulnerabilities`}
                >
                  <span>🧠</span>
                  <span>Deep AI</span>
                  <span style={{ fontSize: "0.68rem", opacity: 0.85, fontFamily: "monospace" }}>
                    ({formatModelDisplayName(effectiveDeepModel)})
                  </span>
                </button>
              </>
            ) : (
              <span style={{ color: "var(--accent-cyan)", fontFamily: "monospace", fontSize: "0.76rem", padding: "2px 8px" }}>
                {selectedModel || "Offline Fallback"}
              </span>
            )}
          </div>

          {/* 1. OLLAMA ENGINE ON / OFF TOGGLE SWITCH */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "3px 10px",
              borderRadius: "20px",
              backgroundColor: isAiEnabled ? "rgba(16, 185, 129, 0.1)" : "rgba(100, 116, 139, 0.12)",
              border: `1px solid ${isAiEnabled ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)"}`,
            }}
          >
            <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text-main)" }}>
              Ollama:
            </span>

            {/* Toggle switch */}
            <button
              onClick={handleToggleAiEnabled}
              disabled={isStartingOllama || isStoppingOllama}
              style={{
                width: "38px",
                height: "20px",
                borderRadius: "10px",
                backgroundColor: isAiEnabled ? "var(--accent-emerald)" : "var(--border-accent)",
                position: "relative",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.2s ease",
              }}
              title={isAiEnabled ? "Turn OFF Ollama models (frees CPU/RAM)" : "Turn ON Ollama models"}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  position: "absolute",
                  top: "3px",
                  left: isAiEnabled ? "21px" : "3px",
                  transition: "left 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Power size={9} color={isAiEnabled ? "#059669" : "#64748b"} />
              </div>
            </button>

            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: isAiEnabled ? "var(--accent-emerald)" : "var(--text-dim)",
              }}
            >
              {isAiEnabled ? (aiAvailable ? "ONLINE" : "STANDBY") : "OFF"}
            </span>

            {isAiEnabled && !aiAvailable && (
              <button
                className="btn btn-secondary"
                style={{ padding: "1px 6px", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: "3px" }}
                disabled={isStartingOllama}
                onClick={() => handleStartOllamaService(false)}
                title="Launch Ollama background process"
              >
                {isStartingOllama ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                <span>Start</span>
              </button>
            )}
          </div>
        </div>

        {/* Study depth, Category & Header Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Active Security Category Specialization */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CategorySelector
              activeCategory={effectiveCategory}
              onSelectCategory={handleCategorySwitch}
              compact
            />
          </div>

          {/* Study Depth Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <BookOpen size={13} color="var(--accent-cyan)" />
            <select
              value={studyDepth}
              onChange={(e) => setStudyDepth(e.target.value as StudyDepth)}
              style={{
                padding: "2px 8px",
                fontSize: "0.74rem",
                height: "26px",
                borderRadius: "4px",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
              }}
              title="Select pedagogical depth for explanations"
            >
              <option value="beginner">🟢 Beginner (Concept & Basics)</option>
              <option value="intermediate">🟡 Intermediate (Flaws & Code)</option>
              <option value="advanced">🟠 Advanced (Pentest & PoC)</option>
              <option value="professional">🔴 Professional (Hardening & CVSS)</option>
            </select>
          </div>

          {/* AI Context Window Token Gauge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.72rem",
              backgroundColor: tokenBudget.isCritical
                ? "rgba(239, 68, 68, 0.15)"
                : "var(--bg-primary)",
              color: tokenBudget.isCritical ? "var(--accent-rose)" : "var(--text-dim)",
              border: `1px solid ${tokenBudget.isCritical ? "rgba(239, 68, 68, 0.4)" : "var(--border-color)"}`,
            }}
            title={`Estimated context consumption: ${tokenCount} / 8192 tokens (${tokenBudget.usagePercent}%). Safe under 85%.`}
          >
            <Cpu size={12} color={tokenBudget.isCritical ? "var(--accent-rose)" : "var(--accent-cyan)"} />
            <span>~{tokenCount} tokens</span>
            <span style={{ opacity: 0.7 }}>({tokenBudget.usagePercent}%)</span>
          </div>

          {/* Validation Inspector Toggle */}
          {selectedFinding && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => setShowValidationCard(!showValidationCard)}
              title="Toggle finding validation card"
            >
              <ShieldCheck size={13} color="var(--accent-emerald)" />
              <span>{showValidationCard ? "Hide Context" : "Show Context"}</span>
            </button>
          )}

          {/* Export Study Notes (.md) */}
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
            onClick={handleExportStudyNotes}
            title="Download formatted Markdown study notes"
          >
            <Download size={13} />
            <span>Export Notes</span>
          </button>

          {/* Clear Thread */}
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.74rem", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
            onClick={handleClearConversation}
            title="Clear Chat Thread & Database History"
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Selected Finding Validation Inspector Card */}
      {selectedFinding && showValidationCard && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)" }}>
                Finding Context: {selectedFinding.title}
              </span>
              <ValidationBadge
                status={validationRecord?.status || selectedFinding.validation_status || "NEEDS_VALIDATION"}
                confidence={validationRecord?.confidence_score ?? selectedFinding.confidence}
                size="sm"
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ fontSize: "0.76rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}
              disabled={isValidating}
              onClick={handleRunValidation}
              title="Execute non-destructive HTTP verification probe"
            >
              {isValidating ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Validating Endpoint...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>{validationRecord ? "Retest / Re-Validate" : "Run Independent Validation Probe"}</span>
                </>
              )}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "10px", fontSize: "0.78rem" }}>
            <div style={{ background: "var(--bg-secondary)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <div style={{ color: "var(--text-dim)", fontWeight: 600, marginBottom: "3px" }}>Asset / Endpoint:</div>
              <div style={{ fontFamily: "monospace", color: "var(--accent-cyan)", wordBreak: "break-all" }}>
                {selectedFinding.affected_asset}
              </div>
            </div>

            <div style={{ background: "var(--bg-secondary)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <div style={{ color: "var(--text-dim)", fontWeight: 600, marginBottom: "3px" }}>Tested Hypothesis:</div>
              <div style={{ color: "var(--text-main)" }}>
                {validationRecord?.hypothesis || "Scanner flagged vulnerability; deterministic verification pending."}
              </div>
            </div>
          </div>

          {validationRecord && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem", background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>Test Method: </span>
                <span style={{ color: "var(--text-main)" }}>{validationRecord.test_method}</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>Actual Observation: </span>
                <span style={{ fontFamily: "monospace", color: "var(--accent-cyan)", wordBreak: "break-all" }}>
                  {validationRecord.actual_observation}
                </span>
              </div>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>✓ Supporting Facts: </span>
                  <span style={{ color: "var(--text-muted)" }}>{validationRecord.supporting_evidence}</span>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent-rose)" }}>✗ Contradicting Facts: </span>
                  <span style={{ color: "var(--text-muted)" }}>{validationRecord.contradicting_evidence}</span>
                </div>
              </div>
              <div style={{ marginTop: "4px", fontStyle: "italic", color: "var(--text-dim)" }}>
                Rationale: {validationRecord.confidence_rationale}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Flowchart Display if active */}
      {showFlowchart && (
        <SecurityFlowchart
          vulnerabilityType={activeFlowchartType}
          customTitle={selectedFinding ? `Visual Flowchart: ${selectedFinding.title}` : undefined}
        />
      )}

      {/* Search and Bookmark Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            className={`theme-category-pill ${!showOnlyBookmarks ? "active" : ""}`}
            style={{ padding: "3px 10px", fontSize: "0.74rem" }}
            onClick={() => setShowOnlyBookmarks(false)}
          >
            All Messages ({messages.length})
          </button>
          <button
            className={`theme-category-pill ${showOnlyBookmarks ? "active" : ""}`}
            style={{ padding: "3px 10px", fontSize: "0.74rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
            onClick={() => setShowOnlyBookmarks(true)}
          >
            <Bookmark size={11} color="var(--accent-amber)" />
            <span>Starred Notes ({bookmarkedIndices.length})</span>
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "200px" }}>
          <Search size={12} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text"
            placeholder="Search in chat..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 8px 4px 26px",
              fontSize: "0.74rem",
              borderRadius: "4px",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-main)",
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          CHAT MESSAGES LOG (WITH EDIT, COPY, REGENERATE, STAR & MARKDOWN)
          ========================================================================= */}
      <div
        data-tour="mentor-chat-messages"
        style={{
          flex: 1,
          minHeight: "260px",
          maxHeight: "460px",
          overflowY: "auto",
          backgroundColor: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {displayMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "30px 0", fontSize: "0.85rem" }}>
            {showOnlyBookmarks
              ? "No starred study notes yet. Click the bookmark icon on any message to pin it here!"
              : "No matching messages found."}
          </div>
        ) : (
          displayMessages.map(({ msg, originalIdx }) => {
            const isEditing = editingIndex === originalIdx;
            const isCopied = copiedIndex === originalIdx;
            const isBookmarked = bookmarkedIndices.includes(originalIdx);

            return (
              <div
                key={originalIdx}
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "92%",
                  width: isEditing ? "100%" : "auto",
                }}
              >
                {/* Assistant avatar */}
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
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

                {/* Message bubble card */}
                <div
                  style={{
                    backgroundColor: msg.role === "user" ? "rgba(6, 182, 212, 0.16)" : "var(--bg-secondary)",
                    border: `1px solid ${msg.role === "user" ? "rgba(6, 182, 212, 0.4)" : "var(--border-color)"}`,
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontSize: "0.86rem",
                    lineHeight: "1.55",
                    color: "var(--text-main)",
                    wordBreak: "break-word",
                    position: "relative",
                    flex: isEditing ? 1 : undefined,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Bubble header bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                      paddingBottom: "4px",
                      gap: "12px",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                      {msg.role === "user" ? (
                        "You (Pentester / Learner)"
                      ) : (
                        <>
                          <span style={{ color: effectiveRole === "deep" ? "var(--accent-purple, #c084fc)" : "var(--accent-cyan)" }}>
                            {effectiveRole === "deep" ? "🧠 Deep Security AI" : "⚡ Quick Security AI"}
                          </span>
                          <span style={{ opacity: 0.7, fontWeight: 400, fontFamily: "monospace", fontSize: "0.68rem" }}>
                            ({formatModelDisplayName(selectedModel || (effectiveRole === "deep" ? effectiveDeepModel : effectiveQuickModel))})
                          </span>
                        </>
                      )}
                    </span>

                    {/* Action buttons toolbar: EDIT, COPY, STAR, REGENERATE */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Copy message button */}
                      <button
                        onClick={() => handleCopyMessage(msg.content, originalIdx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: isCopied ? "var(--accent-emerald)" : "var(--text-dim)",
                          padding: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "0.7rem",
                        }}
                        title="Copy message to clipboard"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        {isCopied && <span>Copied!</span>}
                      </button>

                      {/* Edit user message button */}
                      {msg.role === "user" && !isEditing && (
                        <button
                          onClick={() => {
                            setEditingIndex(originalIdx);
                            setEditContent(msg.content);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-dim)",
                            padding: "2px",
                          }}
                          title="Edit this query"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      {/* Bookmark / Star button */}
                      <button
                        onClick={() => handleToggleBookmark(originalIdx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: isBookmarked ? "var(--accent-amber)" : "var(--text-dim)",
                          padding: "2px",
                        }}
                        title={isBookmarked ? "Remove from starred study notes" : "Star as important study note"}
                      >
                        {isBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      </button>

                      {/* Regenerate assistant message button */}
                      {msg.role === "assistant" && originalIdx > 0 && (
                        <button
                          onClick={() => handleRegenerateResponse(originalIdx)}
                          disabled={isLoading}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-dim)",
                            padding: "2px",
                          }}
                          title="Regenerate this explanation"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                      <textarea
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid var(--accent-cyan)",
                          backgroundColor: "var(--bg-primary)",
                          color: "var(--text-main)",
                          fontSize: "0.85rem",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={() => setEditingIndex(null)}
                        >
                          <X size={12} /> Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                          onClick={() => handleSendMessage(editContent, originalIdx)}
                        >
                          <Check size={12} /> Save & Re-ask
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Render formatted markdown message with code block copy buttons */
                    <div>
                      <MarkdownViewer content={msg.content} />
                    </div>
                  )}

                  {/* Offline helper action buttons */}
                  {Boolean(msg.content && msg.content.includes("⚠️ **Local AI Engine Offline")) && (
                    <div
                      style={{
                        marginTop: "12px",
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: "10px",
                      }}
                    >
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: "0.74rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}
                        disabled={isStartingOllama || isLoading}
                        onClick={() => handleStartOllamaService(true)}
                      >
                        {isStartingOllama ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        <span>Start Ollama Engine & Retry</span>
                      </button>

                      {aiModels && aiModels.some((m) => m.toLowerCase().includes("1b")) && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: "0.74rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px", color: "var(--accent-emerald)", borderColor: "rgba(16, 185, 129, 0.4)" }}
                          disabled={isLoading}
                          onClick={() => {
                            const m1b = aiModels.find((m) => m.toLowerCase().includes("1b")) || "appsec-teacher-1b:latest";
                            if (onSelectModel) onSelectModel(m1b);
                            const lastUser = [...messages].reverse().find((m) => m.role === "user");
                            if (lastUser) setTimeout(() => handleSendMessage(lastUser.content), 200);
                          }}
                        >
                          <Zap size={12} />
                          <span>Switch to Fast 1B Model & Retry</span>
                        </button>
                      )}

                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: "0.74rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}
                        disabled={isLoading}
                        onClick={async () => {
                          if (onRefreshAiStatus) await onRefreshAiStatus();
                          const lastUser = [...messages].reverse().find((m) => m.role === "user");
                          if (lastUser) setTimeout(() => handleSendMessage(lastUser.content), 200);
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Retry Query</span>
                      </button>
                    </div>
                  )}

                  {/* Engine is turned OFF helper */}
                  {Boolean(msg.content && msg.content.includes("Ollama AI Engine is currently turned OFF")) && (
                    <div style={{ marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: "0.74rem", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        onClick={() => {
                          handleToggleAiEnabled();
                          const lastUser = [...messages].reverse().find((m) => m.role === "user");
                          if (lastUser) setTimeout(() => handleSendMessage(lastUser.content), 300);
                        }}
                      >
                        <Power size={12} />
                        <span>Turn ON Ollama Engine & Re-ask</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
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
            );
          })
        )}

        {(isLoading || isTaskRunning) && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(14, 165, 233, 0.08)",
              border: "1px solid rgba(14, 165, 233, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Bot size={18} className="pulse" color="var(--accent-cyan)" />
              <div>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--accent-cyan)" }}>
                  {activeTask?.status === "Queued"
                    ? "Task queued in local resource limiter..."
                    : `${effectiveRole === "deep" ? "🧠 Deep Security AI" : "⚡ Quick Security AI"} generating in background...`}
                </span>
                {activeTask?.prompt_preview && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "var(--text-dim)",
                      maxWidth: "380px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    "{activeTask.prompt_preview}"
                  </p>
                )}
              </div>
            </div>

            {activeTask && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: "0.72rem",
                  padding: "4px 8px",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  color: "var(--accent-rose)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={() => cancelTask(activeTask.id)}
                title="Cancel background generation"
              >
                <X size={12} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* =========================================================================
          INTERACTIVE LEARNING WORKFLOW QUICK PROMPTS
          ========================================================================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
          <Sparkles size={13} color="var(--accent-cyan)" />
          <span>Interactive Learning Mode Workflow (Cybersecurity Study Prompts):</span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {learningWorkflow.map((step, idx) => (
            <button
              key={idx}
              className="filter-chip"
              style={{ fontSize: "0.73rem", padding: "4px 9px" }}
              onClick={() => handleSendMessage(step.text)}
              disabled={isLoading || isTaskRunning}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          PROMPT INPUT BOX
          ========================================================================= */}
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
          disabled={isLoading || isTaskRunning}
        />
        <button
          className="btn btn-primary"
          style={{ padding: "10px 18px", flexShrink: 0 }}
          onClick={() => handleSendMessage()}
          disabled={isLoading || isTaskRunning || !inputPrompt.trim()}
        >
          <Send size={16} /> Send
        </button>
      </div>
    </div>
  );
}
