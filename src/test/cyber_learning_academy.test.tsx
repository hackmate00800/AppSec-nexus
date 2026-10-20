import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CyberAcademy } from "../academy/CyberAcademy";
import { LEARNING_PATHS } from "../academy/data/curriculumData";
import { GLOSSARY_ENTRIES } from "../academy/data/glossaryData";
import { VirtualLabsWorkspace } from "../academy/components/VirtualLabsWorkspace";
import { GlossaryKnowledgeBaseView } from "../academy/components/GlossaryKnowledgeBaseView";

describe("Cyber Learning Academy - Curriculum & Ground-Zero Pedagogy", () => {
  it("includes all 12 curriculum stages (Stage 0 to Stage 11)", () => {
    expect(LEARNING_PATHS.length).toBeGreaterThanOrEqual(12);

    const stageNumbers = LEARNING_PATHS.map((p) => p.stageNumber);
    for (let i = 0; i <= 11; i++) {
      expect(stageNumbers).toContain(i);
    }

    const stage0 = LEARNING_PATHS.find((p) => p.stageNumber === 0);
    expect(stage0).toBeDefined();
    expect(stage0?.title).toContain("Digital Literacy & Computer Architecture");

    const stage1 = LEARNING_PATHS.find((p) => p.stageNumber === 1);
    expect(stage1).toBeDefined();
    expect(stage1?.title).toContain("Operating Systems & Command-Line Interfaces");

    const stage2 = LEARNING_PATHS.find((p) => p.stageNumber === 2);
    expect(stage2).toBeDefined();
    expect(stage2?.title).toContain("Computer Networking & Internet Protocols");

    const stage10 = LEARNING_PATHS.find((p) => p.stageNumber === 10);
    expect(stage10).toBeDefined();
    expect(stage10?.title).toContain("Secure Remediation & Defensive Engineering");

    const stage11 = LEARNING_PATHS.find((p) => p.stageNumber === 11);
    expect(stage11).toBeDefined();
    expect(stage11?.title).toContain("Professional Practice, Reporting & Capstone");
  });

  it("contains rich ground-zero pedagogical metadata in foundational lessons", () => {
    const stage0 = LEARNING_PATHS.find((p) => p.stageNumber === 0);
    const cpuLesson = stage0?.modules[0].lessons[0];

    expect(cpuLesson).toBeDefined();
    expect(cpuLesson?.fullForm).toBeDefined();
    expect(cpuLesson?.hinglishExplanation).toBeDefined();
    expect(cpuLesson?.hinglishExplanation).toContain("CPU computer ka dimag hota hai");
    expect(cpuLesson?.realWorldAnalogy).toBeDefined();
    expect(cpuLesson?.realWorldAnalogy).toContain("Head Chef");
    expect(cpuLesson?.whyItExists).toBeDefined();
    expect(cpuLesson?.cybersecurityConnection).toBeDefined();
    expect(cpuLesson?.applicationTask).toBeDefined();
  });
});

describe("Cyber Learning Academy - Glossary & Knowledge Base", () => {
  it("contains comprehensive definitions in English and Hinglish with everyday analogies", () => {
    expect(GLOSSARY_ENTRIES.length).toBeGreaterThanOrEqual(20);

    const dnsTerm = GLOSSARY_ENTRIES.find((t) => t.term === "DNS");
    expect(dnsTerm).toBeDefined();
    expect(dnsTerm?.fullForm).toBe("Domain Name System");
    expect(dnsTerm?.hinglishDefinition).toContain("phonebook");
    expect(dnsTerm?.realWorldAnalogy).toContain("Contacts");

    const sqliTerm = GLOSSARY_ENTRIES.find((t) => t.id === "term-sqli");
    expect(sqliTerm).toBeDefined();
    expect(sqliTerm?.cwe).toBe("CWE-89");
    expect(sqliTerm?.relatedTools).toContain("sqlmap");
  });

  it("renders GlossaryKnowledgeBaseView with category filtering and interactive explanation sub-tabs", () => {
    const onAskAiTutorMock = vi.fn();
    const onNavigateToolMock = vi.fn();

    render(
      <GlossaryKnowledgeBaseView
        onAskAiTutor={onAskAiTutorMock}
        onNavigateTool={onNavigateToolMock}
      />
    );

    expect(screen.getByRole("heading", { name: "Glossary & Knowledge Base" })).toBeInTheDocument();
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("DNS")).toBeInTheDocument();

    // Switch sub-tab to Hinglish
    const hinglishButtons = screen.getAllByText("आसान भाषा (Hinglish)");
    expect(hinglishButtons.length).toBeGreaterThan(0);
    fireEvent.click(hinglishButtons[0]);

    // Check search input
    const searchInput = screen.getByPlaceholderText(/search terms, full forms/i);
    fireEvent.change(searchInput, { target: { value: "SQL Injection" } });

    expect(screen.getByText("SQL Injection (SQLi)")).toBeInTheDocument();
  });
});

describe("Cyber Learning Academy - Virtual Labs Workspace", () => {
  it("renders HTTP Explorer and simulates requests and security responses", () => {
    const onOpenAiMentorMock = vi.fn();
    render(<VirtualLabsWorkspace onOpenAiMentor={onOpenAiMentorMock} />);

    expect(screen.getByText("HTTP Request/Response Explorer")).toBeInTheDocument();
    expect(screen.getByText("HTTP Request Builder")).toBeInTheDocument();

    // Click "Send Request"
    const sendBtn = screen.getByRole("button", { name: /send request/i });
    fireEvent.click(sendBtn);

    expect(screen.getByText(/HTTP\/1.1 200 OK/i)).toBeInTheDocument();
    expect(screen.getByText(/Response Payload Body:/i)).toBeInTheDocument();
  });

  it("provides Safe SQLi Query Sandbox comparing vulnerable raw string vs parameterized query", () => {
    render(<VirtualLabsWorkspace />);

    const sqliTab = screen.getByRole("button", { name: /safe sqli query sandbox/i });
    fireEvent.click(sqliTab);

    expect(screen.getByRole("heading", { name: /safe sql injection/i })).toBeInTheDocument();
    expect(screen.getByText(/Vulnerable: Raw String Concatenation/i)).toBeInTheDocument();
    expect(screen.getByText(/Secure: Parameterized Prepared Statement/i)).toBeInTheDocument();
    expect(screen.getByText(/IMMUNE TO SQLi/i)).toBeInTheDocument();
  });

  it("provides Context-Aware XSS Simulator with HTML body, attribute, and script contexts", () => {
    render(<VirtualLabsWorkspace />);

    const xssTab = screen.getByRole("button", { name: /context-aware xss simulator/i });
    fireEvent.click(xssTab);

    expect(screen.getByRole("heading", { name: /context-aware cross-site scripting/i })).toBeInTheDocument();
    expect(screen.getByText(/Without Contextual Encoding/i)).toBeInTheDocument();
    expect(screen.getByText(/With Contextual Encoding \(Neutralized\)/i)).toBeInTheDocument();
  });

  it("provides CORS Misconfiguration Tester demonstrating reflected origin risks", () => {
    render(<VirtualLabsWorkspace />);

    const corsTab = screen.getByRole("button", { name: /cors misconfiguration tester/i });
    fireEvent.click(corsTab);

    expect(screen.getByRole("heading", { name: /cors misconfiguration tester/i })).toBeInTheDocument();
    expect(screen.getByText(/Attacker Origin Header:/i)).toBeInTheDocument();
  });

  it("provides Command Shell Simulator with safe security commands", () => {
    render(<VirtualLabsWorkspace />);

    const terminalTab = screen.getByRole("button", { name: /command shell simulator/i });
    fireEvent.click(terminalTab);

    expect(screen.getByRole("heading", { name: /command shell simulator/i })).toBeInTheDocument();
    expect(screen.getAllByText(/appsec_student@pentest-lab/i).length).toBeGreaterThan(0);
  });

  it("bridges to Vulnerability Verification Lab", () => {
    const onNavigateVerificationLabMock = vi.fn();
    render(<VirtualLabsWorkspace onNavigateVerificationLab={onNavigateVerificationLabMock} />);

    const bridgeTab = screen.getByRole("button", { name: /vulnerability verification lab bridge/i });
    fireEvent.click(bridgeTab);

    expect(screen.getByText(/Connect to AppSec Vulnerability Verification Lab/i)).toBeInTheDocument();

    const openLabBtn = screen.getByRole("button", { name: /open vulnerability verification lab/i });
    fireEvent.click(openLabBtn);

    expect(onNavigateVerificationLabMock).toHaveBeenCalledTimes(1);
  });
});

describe("Cyber Learning Academy - Interactive Lessons & Explanations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Interactive Lessons with explanation mode switching (Beginner, Hinglish, Analogy, Deep Dive, AI Tutor)", () => {
    const onOpenAiMentorMock = vi.fn();
    render(<CyberAcademy initialTab="lesson" onOpenAiMentor={onOpenAiMentorMock} />);

    // Check title of default lesson (les-0-1-1)
    expect(screen.getByText("CPU, Memory, Storage & System Bus")).toBeInTheDocument();
    expect(screen.getByText(/Full Form: Central Processing Unit/i)).toBeInTheDocument();

    // Check Mode Switcher buttons
    expect(screen.getByText(/🎓 Beginner English/i)).toBeInTheDocument();
    expect(screen.getByText(/🇮🇳 आसान भाषा \(Hinglish\)/i)).toBeInTheDocument();
    expect(screen.getByText(/💡 Everyday Analogy/i)).toBeInTheDocument();
    expect(screen.getByText(/🔬 Technical Deep Dive/i)).toBeInTheDocument();
    expect(screen.getByText(/🤖 Ask AI Tutor/i)).toBeInTheDocument();

    // Switch to Hinglish
    fireEvent.click(screen.getByText(/🇮🇳 आसान भाषा \(Hinglish\)/i));
    expect(screen.getByText(/आसान हिंदी व्याख्या/i)).toBeInTheDocument();
    expect(screen.getByText(/CPU computer ka dimag hota hai/i)).toBeInTheDocument();

    // Switch to Analogy
    fireEvent.click(screen.getByText(/💡 Everyday Analogy/i));
    expect(screen.getByText(/Everyday Real-World Analogy/i)).toBeInTheDocument();
    expect(screen.getByText(/Head Chef/i)).toBeInTheDocument();

    // Check pedagogical boxes
    expect(screen.getByText("Why Was This Created?")).toBeInTheDocument();
    expect(screen.getByText("Cybersecurity & Pentesting Connection")).toBeInTheDocument();
    expect(screen.getByText("Hands-On Practical Task")).toBeInTheDocument();
  });

  it("switches to Glossary tab and Ask AI Tutor tab via navigation subtabs", () => {
    const onOpenAiMentorMock = vi.fn();
    render(<CyberAcademy initialTab="dashboard" onOpenAiMentor={onOpenAiMentorMock} />);

    // Click "Roadmap (Stages 0–11)"
    const roadmapBtn = screen.getByRole("button", { name: /roadmap \(stages 0–11\)/i });
    fireEvent.click(roadmapBtn);
    expect(screen.getByText("Stage 0: Digital Literacy & Computer Architecture")).toBeInTheDocument();
    expect(screen.getByText("Stage 11: Professional Practice, Reporting & Capstone")).toBeInTheDocument();

    // Click "Glossary & Knowledge Base"
    const glossaryBtn = screen.getByRole("button", { name: /glossary & knowledge base/i });
    fireEvent.click(glossaryBtn);
    expect(screen.getByRole("heading", { name: "Glossary & Knowledge Base" })).toBeInTheDocument();

    // Click "Ask AI Tutor"
    const aiTutorBtn = screen.getAllByRole("button", { name: "Ask AI Tutor" })[0];
    fireEvent.click(aiTutorBtn);
    expect(screen.getByRole("heading", { name: "Ask the AI Cybersecurity Tutor" })).toBeInTheDocument();
  });
});
