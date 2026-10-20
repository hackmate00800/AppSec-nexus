import { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  ShieldAlert,
  Terminal,
  Radio,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Play,
  RotateCcw,
  Bookmark,
  Edit3,
  Award,
  ChevronRight,
  GitBranch,
  Filter,
  Check,
  Copy,
  Layers,
  FileCode,
  Compass,
  FolderTree,
  BookA,
  Send,
} from "lucide-react";
import {
  Lesson,
  LearningPath,
  VulnerabilityEntry,
  ToolEntry,
  UserAcademyState,
  ConceptEntry
} from "./types";
import { Finding } from "../types";
import { LEARNING_PATHS } from "./data/curriculumData";
import { VULNERABILITY_ENCYCLOPEDIA } from "./data/vulnerabilityEncyclopediaData";
import { TOOLS_KNOWLEDGE_BASE } from "./data/toolsData";
import { METHODOLOGIES_DATA } from "./data/methodologiesData";
import { PRACTICAL_LABS } from "./data/labsData";
import { CERTIFICATIONS_DIRECTORY, CAREER_ROADMAPS } from "./data/certificationsData";
import { CONCEPT_LIBRARY } from "./data/conceptLibraryData";
import { ConceptLibraryView } from "./components/ConceptLibraryView";
import { WorkflowsView } from "./components/WorkflowsView";
import { VisualLearningEngine } from "./components/VisualLearningEngine";
import { CommandAcademyView } from "./components/CommandAcademyView";
import { ResourceHubView } from "./components/ResourceHubView";
import { CommunityDirectoryView } from "./components/CommunityDirectoryView";
import { ProjectsAndCapstoneView } from "./components/ProjectsAndCapstoneView";
import { SkillMapView } from "./components/SkillMapView";
import { TaxonomyKnowledgeTreeView } from "./components/TaxonomyKnowledgeTreeView";
import { VirtualLabsWorkspace } from "./components/VirtualLabsWorkspace";
import { GlossaryKnowledgeBaseView } from "./components/GlossaryKnowledgeBaseView";
import { evaluateLessonPrerequisites, getRecommendedNextLessons } from "./prerequisites";
import { SecurityFlowchart } from "../Flowchart";

export type AcademyTab =
  | "dashboard"
  | "taxonomy"
  | "paths"
  | "lesson"
  | "visuals"
  | "commands"
  | "projects"
  | "resources"
  | "communities"
  | "skills"
  | "concepts"
  | "workflows"
  | "encyclopedia"
  | "tools"
  | "methodologies"
  | "labs"
  | "certifications"
  | "notes"
  | "glossary"
  | "ai_tutor";

interface CyberAcademyProps {
  onNavigateScanner?: (toolId: string) => void;
  onOpenAiMentor?: (query: string) => void;
  findings?: Finding[];
  initialSelectedVulnId?: string;
  initialTab?: AcademyTab;
}

const STORAGE_KEY = "appsec_nexus_cyber_academy_state_v1";

export function CyberAcademy({ onNavigateScanner, onOpenAiMentor, findings, initialSelectedVulnId, initialTab }: CyberAcademyProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AcademyTab>(initialTab || "dashboard");

  // Selection State
  const [selectedPath, setSelectedPath] = useState<LearningPath>(LEARNING_PATHS[0]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(LEARNING_PATHS[0].modules[0].lessons[0]);
  const [selectedVulnerability, setSelectedVulnerability] = useState<VulnerabilityEntry | null>(VULNERABILITY_ENCYCLOPEDIA[0]);
  const [selectedTool, setSelectedTool] = useState<ToolEntry | null>(TOOLS_KNOWLEDGE_BASE[0]);
  const [selectedConcept, setSelectedConcept] = useState<ConceptEntry | null>(CONCEPT_LIBRARY[0]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vulnSeverityFilter, setVulnSeverityFilter] = useState<string>("ALL");
  const [conceptDomainFilter, setConceptDomainFilter] = useState<string>("ALL");
  const [conceptSearch, setConceptSearch] = useState<string>("");

  // User Progress & Notes State
  const [userState, setUserState] = useState<UserAcademyState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore JSON error
    }
    return {
      completedLessonIds: [],
      activePathId: "path-0",
      quizScores: {},
      bookmarks: [],
      notes: {}
    };
  });

  // Quiz State for current lesson
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [currentNote, setCurrentNote] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string>("");
  const [showDiagram, setShowDiagram] = useState<boolean>(false);
  const [explanationMode, setExplanationMode] = useState<"beginner" | "hinglish" | "analogy" | "technical" | "ai_tutor">("beginner");
  const [aiTutorPrompt, setAiTutorPrompt] = useState<string>("");

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
    } catch (err) {
      console.error("Failed to save academy state:", err);
    }
  }, [userState]);

  // Sync note editor when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      setCurrentNote(userState.notes[selectedLesson.id] || "");
      setSelectedQuizAnswers({});
      setQuizSubmitted(false);
      setShowDiagram(false);
    }
  }, [selectedLesson]);

  // Handle external navigation tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle external vulnerability linking from scanner findings
  useEffect(() => {
    if (initialSelectedVulnId) {
      const match = VULNERABILITY_ENCYCLOPEDIA.find(
        (v) =>
          v.id === initialSelectedVulnId ||
          v.name.toLowerCase().includes(initialSelectedVulnId.toLowerCase()) ||
          v.aliases.some((a) => a.toLowerCase().includes(initialSelectedVulnId.toLowerCase())) ||
          (v.cwe && initialSelectedVulnId.toLowerCase().includes(v.cwe.toLowerCase()))
      );
      if (match) {
        setSelectedVulnerability(match);
        setActiveTab("encyclopedia");
      }
    }
  }, [initialSelectedVulnId]);

  function handleCompleteLesson(lessonId: string) {
    setUserState((prev) => {
      const exists = prev.completedLessonIds.includes(lessonId);
      const updated = exists
        ? prev.completedLessonIds.filter((id) => id !== lessonId)
        : [...prev.completedLessonIds, lessonId];
      return { ...prev, completedLessonIds: updated };
    });
  }

  function handleToggleBookmark(itemId: string) {
    setUserState((prev) => {
      const exists = prev.bookmarks.includes(itemId);
      const updated = exists
        ? prev.bookmarks.filter((id) => id !== itemId)
        : [...prev.bookmarks, itemId];
      return { ...prev, bookmarks: updated };
    });
  }

  function handleSaveNote() {
    if (!selectedLesson) return;
    setUserState((prev) => ({
      ...prev,
      notes: { ...prev.notes, [selectedLesson.id]: currentNote }
    }));
  }

  function handleCopy(text: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(""), 2000);
    }
  }

  // Calculate Progress Stats
  const allLessons: Lesson[] = LEARNING_PATHS.flatMap((p) => p.modules.flatMap((m) => m.lessons));
  const totalLessonsCount = allLessons.length;
  const completedCount = userState.completedLessonIds.length;
  const progressPercentage = Math.round((completedCount / (totalLessonsCount || 1)) * 100);

  // Filtered Vulnerabilities
  const filteredVulns = VULNERABILITY_ENCYCLOPEDIA.filter((v) => {
    if (vulnSeverityFilter !== "ALL" && v.severity !== vulnSeverityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchCwe = (v.cwe || "").toLowerCase().includes(q);
      const matchDef = v.definition.toLowerCase().includes(q);
      return matchName || matchCwe || matchDef;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              backgroundColor: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <GraduationCap size={26} color="var(--accent-cyan)" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              AppSec Nexus Cyber Academy
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "var(--accent-emerald)",
                  border: "1px solid rgba(16, 185, 129, 0.3)"
                }}
              >
                PRO EDITION
              </span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", margin: "4px 0 0 0" }}>
              Comprehensive curriculum: Foundations &bull; Web &bull; API &bull; Ethical Hacking &bull; Tools &bull; Real Scanner Integration
            </p>
          </div>
        </div>

        {/* Global Progress Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: "150px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
              <span style={{ color: "var(--text-dim)" }}>Curriculum Progress:</span>
              <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{progressPercentage}%</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${progressPercentage}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))",
                  borderRadius: "3px",
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>

          {onOpenAiMentor && (
            <button
              className="btn btn-primary"
              style={{ padding: "7px 14px", fontSize: "0.82rem" }}
              onClick={() => onOpenAiMentor("Help me design an effective study roadmap for web application penetration testing.")}
            >
              <Sparkles size={14} /> Consult AI Tutor
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Subtabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          padding: "6px",
          background: "var(--bg-secondary)",
          borderRadius: "10px",
          border: "1px solid var(--border-color)"
        }}
      >
        {[
          { id: "dashboard", label: "Learning Dashboard", icon: Award },
          { id: "paths", label: "Roadmap (Stages 0–11)", icon: BookOpen },
          { id: "lesson", label: "Interactive Lessons", icon: FileCode },
          { id: "labs", label: "Virtual Labs & Sandboxes", icon: Play },
          { id: "commands", label: "Practice Challenges & CLI", icon: Terminal },
          { id: "visuals", label: "Visual Learning Engine", icon: Layers },
          { id: "projects", label: "Cybersecurity Projects", icon: Award },
          { id: "certifications", label: "Assessments & Quizzes", icon: GraduationCap },
          { id: "skills", label: "Learning Progress", icon: Compass },
          { id: "glossary", label: "Glossary & Knowledge Base", icon: BookA },
          { id: "notes", label: "My Notes & Bookmarks", icon: Bookmark },
          { id: "ai_tutor", label: "Ask AI Tutor", icon: Sparkles },
          { id: "encyclopedia", label: "Vulnerability Encyclopedia", icon: ShieldAlert },
          { id: "tools", label: "Tools Knowledge Base", icon: Radio },
          { id: "workflows", label: "Security Workflows", icon: ChevronRight },
          { id: "methodologies", label: "Methodologies & Frameworks", icon: GitBranch },
          { id: "taxonomy", label: "Knowledge Taxonomy", icon: FolderTree },
          { id: "resources", label: "Documentation Hub", icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`filter-chip ${isActive ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                padding: "7px 14px",
                borderRadius: "8px"
              }}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <Icon size={14} color={isActive ? "var(--accent-cyan)" : undefined} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ACADEMY DASHBOARD */}
      {activeTab === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Quick Stats Grid */}
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Total Lessons</span>
              <span className="stat-value" style={{ color: "var(--accent-cyan)" }}>
                {totalLessonsCount}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                10 Complete Learning Levels
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Completed</span>
              <span className="stat-value" style={{ color: "var(--accent-emerald)" }}>
                {completedCount}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                {progressPercentage}% Curriculum Coverage
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Vulnerabilities</span>
              <span className="stat-value" style={{ color: "var(--accent-rose)" }}>
                {VULNERABILITY_ENCYCLOPEDIA.length}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                CWE & CVSS Mappings
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Security Tools</span>
              <span className="stat-value" style={{ color: "var(--accent-amber)" }}>
                {TOOLS_KNOWLEDGE_BASE.length}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                {TOOLS_KNOWLEDGE_BASE.filter((t) => t.integratedInAppSecNexus).length} Native Adapters
              </span>
            </div>
          </div>

          {/* Master Cybersecurity Knowledge Taxonomy Hero Callout */}
          <div
            className="card"
            style={{
              margin: 0,
              padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <FolderTree size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                  Comprehensive Cybersecurity Taxonomy & Learning Tree
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "3px 0 0 0" }}>
                  Explore 7 core domains, 20+ disciplines, structured phases, sub-phases, safe testing procedures, and interactive assessments.
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ fontSize: "0.8rem", padding: "7px 16px" }}
              onClick={() => setActiveTab("taxonomy")}
            >
              Open Knowledge Taxonomy <ChevronRight size={14} />
            </button>
          </div>

          {/* Active Scanner Findings Linkage */}
          {findings && findings.length > 0 && (
            <div
              className="card"
              style={{
                margin: 0,
                padding: "18px 20px",
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)",
                border: "1px solid rgba(239, 68, 68, 0.25)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--accent-rose)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldAlert size={18} /> Active Project Findings Linked to Academy Curriculum
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    Your project scanner has identified vulnerabilities in tested assets. Click to study the underlying root causes, attack flows, and remediation code:
                  </p>
                </div>
                <span className="badge badge-critical" style={{ fontSize: "0.72rem" }}>
                  {findings.length} Active Findings Detected
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
                {findings.slice(0, 4).map((f) => {
                  const matchedVuln = VULNERABILITY_ENCYCLOPEDIA.find(
                    (v) =>
                      f.title.toLowerCase().includes(v.name.toLowerCase()) ||
                      v.aliases.some((a) => f.title.toLowerCase().includes(a.toLowerCase())) ||
                      (v.cwe && f.evidence && f.evidence.toLowerCase().includes(v.cwe.toLowerCase())) ||
                      (f.cwe && v.cwe && v.cwe.toLowerCase().includes(f.cwe.toLowerCase()))
                  ) || VULNERABILITY_ENCYCLOPEDIA[0];

                  return (
                    <div
                      key={f.id}
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "10px"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
                          <span
                            className={`badge ${
                              f.severity === "Critical"
                                ? "badge-critical"
                                : f.severity === "High"
                                ? "badge-high"
                                : f.severity === "Medium"
                                ? "badge-medium"
                                : "badge-low"
                            }`}
                            style={{ fontSize: "0.68rem" }}
                          >
                            {f.severity.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                            {f.affected_asset}
                          </span>
                        </div>

                        <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "4px" }}>
                          {f.title}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Matched Topic: <strong style={{ color: "var(--accent-cyan)" }}>{matchedVuln.name}</strong> ({matchedVuln.cwe || "CWE"})
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, padding: "5px 10px", fontSize: "0.75rem", justifyContent: "center" }}
                          onClick={() => {
                            setSelectedVulnerability(matchedVuln);
                            setActiveTab("encyclopedia");
                          }}
                        >
                          <BookOpen size={13} /> Study Root Cause
                        </button>
                        {onOpenAiMentor && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "0.75rem", justifyContent: "center" }}
                            onClick={() => onOpenAiMentor(`How do I remediate the "${f.title}" finding identified on ${f.affected_asset}? Show exact code fixes.`)}
                          >
                            <Sparkles size={13} /> Consult AI
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Next Lessons (Prerequisites Met) */}
          {(() => {
            const recommended = getRecommendedNextLessons(userState.completedLessonIds, allLessons, 3);
            if (recommended.length === 0) return null;
            return (
              <div className="card" style={{ margin: 0, padding: "18px 20px", background: "var(--bg-card)", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={18} /> Recommended Next Lessons (Prerequisites Met)
                    </h3>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                      Based on your completed topics, our dependency engine recommends studying these foundational lessons next:
                    </p>
                  </div>
                  <span className="badge badge-locked" style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", borderColor: "rgba(16, 185, 129, 0.4)" }}>
                    ✓ Ready to Learn
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                  {recommended.map((rLes) => {
                    const parentPath = LEARNING_PATHS.find((p) => p.id === rLes.pathId) || LEARNING_PATHS[0];
                    return (
                      <div
                        key={rLes.id}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "8px"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                              {parentPath.title}
                            </span>
                            <span className="badge badge-locked" style={{ fontSize: "0.68rem" }}>
                              {rLes.level}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--text-main)", marginBottom: "4px" }}>
                            {rLes.title}
                          </div>
                          <p style={{ fontSize: "0.76rem", color: "var(--text-dim)", margin: 0, lineHeight: "1.4" }}>
                            {rLes.summary}
                          </p>
                        </div>

                        <button
                          className="btn btn-primary"
                          style={{ width: "100%", justifyContent: "center", fontSize: "0.76rem", padding: "6px" }}
                          onClick={() => {
                            setSelectedPath(parentPath);
                            setSelectedLesson(rLes);
                            setActiveTab("lesson");
                          }}
                        >
                          <Play size={12} /> Start Lesson
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Featured Learning Paths Grid */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} color="var(--accent-cyan)" /> Structured Learning Roadmap
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "14px" }}>
              {LEARNING_PATHS.map((path) => {
                const pathLessons = path.modules.flatMap((m) => m.lessons);
                const pathCompleted = pathLessons.filter((l) => userState.completedLessonIds.includes(l.id)).length;
                const pathPercent = Math.round((pathCompleted / (pathLessons.length || 1)) * 100);

                return (
                  <div
                    key={path.id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)" }}>
                          {path.title}
                        </span>
                        <span
                          className={`badge ${
                            path.level === "beginner"
                              ? "badge-low"
                              : path.level === "intermediate"
                              ? "badge-medium"
                              : "badge-critical"
                          }`}
                        >
                          {path.level.toUpperCase()}
                        </span>
                      </div>

                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
                        {path.description}
                      </p>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "4px" }}>
                        <span>
                          {pathCompleted} of {pathLessons.length} lessons
                        </span>
                        <span>{pathPercent}%</span>
                      </div>
                      <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "14px" }}>
                        <div style={{ width: `${pathPercent}%`, height: "100%", backgroundColor: "var(--accent-cyan)", borderRadius: "2px" }} />
                      </div>

                      <button
                        className="btn btn-secondary"
                        style={{ width: "100%", justifyContent: "center", fontSize: "0.82rem", padding: "6px 12px" }}
                        onClick={() => {
                          setSelectedPath(path);
                          setSelectedLesson(path.modules[0].lessons[0]);
                          setActiveTab("lesson");
                        }}
                      >
                        Start Learning Path <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMPREHENSIVE CYBERSECURITY KNOWLEDGE TAXONOMY */}
      {activeTab === "taxonomy" && (
        <TaxonomyKnowledgeTreeView
          onOpenAiMentor={onOpenAiMentor}
          onNavigateScanner={onNavigateScanner}
        />
      )}

      {/* TAB: VISUAL LEARNING ENGINE */}
      {activeTab === "visuals" && <VisualLearningEngine />}

      {/* TAB: OS & TERMINAL ACADEMY */}
      {activeTab === "commands" && <CommandAcademyView />}

      {/* TAB: PRACTICAL PROJECTS & CAPSTONE PENTEST */}
      {activeTab === "projects" && <ProjectsAndCapstoneView />}

      {/* TAB: AUTHORITATIVE DOCUMENTATION HUB */}
      {activeTab === "resources" && <ResourceHubView />}

      {/* TAB: ETHICAL COMMUNITIES DIRECTORY */}
      {activeTab === "communities" && <CommunityDirectoryView />}

      {/* TAB: SKILL MAP & COMPETENCY MATRIX */}
      {activeTab === "skills" && (
        <SkillMapView
          userState={userState}
          onNavigatePath={(pathId) => {
            const p = LEARNING_PATHS.find((lp) => lp.id === pathId);
            if (p) setSelectedPath(p);
            setActiveTab("paths");
          }}
          onOpenAiMentor={onOpenAiMentor}
        />
      )}

      {/* TAB 2: LEARNING PATHS EXPLORER (STAGES 0 - 11) */}
      {activeTab === "paths" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[...LEARNING_PATHS].sort((a, b) => (a.stageNumber ?? 99) - (b.stageNumber ?? 99)).map((path) => (
            <div key={path.id} className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-cyan)", margin: 0 }}>
                    {path.title}
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {path.subtitle} &bull; Estimated: {path.estimatedHours} hours
                  </div>
                </div>

                <span className="badge badge-locked">
                  {path.level.toUpperCase()}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {path.modules.map((mod) => (
                  <div
                    key={mod.id}
                    style={{
                      background: "var(--bg-secondary)",
                      borderRadius: "8px",
                      padding: "14px",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "4px" }}>
                      {mod.title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                      {mod.description}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {mod.lessons.map((les) => {
                        const isDone = userState.completedLessonIds.includes(les.id);
                        return (
                          <div
                            key={les.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "var(--bg-card)",
                              padding: "8px 12px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "50%",
                                  backgroundColor: isDone ? "rgba(16, 185, 129, 0.2)" : "var(--bg-secondary)",
                                  border: isDone ? "1px solid var(--accent-emerald)" : "1px solid var(--border-color)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer"
                                }}
                                onClick={() => handleCompleteLesson(les.id)}
                              >
                                {isDone ? <Check size={12} color="var(--accent-emerald)" /> : null}
                              </span>
                              <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                                {les.title}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Clock size={12} /> {les.estimatedMinutes} min
                              </span>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                onClick={() => {
                                  setSelectedPath(path);
                                  setSelectedLesson(les);
                                  setActiveTab("lesson");
                                }}
                              >
                                Open Lesson
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: INTERACTIVE LESSON VIEWER */}
      {activeTab === "lesson" && selectedLesson && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px", alignItems: "flex-start" }}>
          {/* Left Column: Lesson Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                  {selectedPath.title} &bull; {selectedLesson.level.toUpperCase()}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className={`btn ${userState.bookmarks.includes(selectedLesson.id) ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    onClick={() => handleToggleBookmark(selectedLesson.id)}
                  >
                    <Bookmark size={13} /> {userState.bookmarks.includes(selectedLesson.id) ? "Bookmarked" : "Bookmark"}
                  </button>
                  <button
                    className={`btn ${userState.completedLessonIds.includes(selectedLesson.id) ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    onClick={() => handleCompleteLesson(selectedLesson.id)}
                  >
                    <CheckCircle2 size={13} /> {userState.completedLessonIds.includes(selectedLesson.id) ? "Completed ✓" : "Mark as Done"}
                  </button>
                </div>
              </div>

              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 4px 0" }}>
                {selectedLesson.title}
              </h2>
              {selectedLesson.fullForm && (
                <div style={{ fontSize: "0.82rem", color: "var(--accent-cyan)", fontStyle: "italic", marginBottom: "12px" }}>
                  Full Form: {selectedLesson.fullForm}
                </div>
              )}

              {/* Objectives Box */}
              <div style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)", borderRadius: "8px", padding: "12px 16px", marginBottom: "18px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-cyan)", marginBottom: "6px" }}>
                  Target Learning Objectives:
                </div>
                <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {selectedLesson.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>

              {/* Prerequisite Advisory Banner */}
              {(() => {
                const prereqEval = evaluateLessonPrerequisites(selectedLesson, userState.completedLessonIds, allLessons);
                if (!prereqEval.isUnlocked) {
                  return (
                    <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px 16px", marginBottom: "18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-rose)", marginBottom: "4px" }}>
                        <ShieldAlert size={16} /> Prerequisite Advisory
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-main)", margin: "0 0 8px 0" }}>
                        For optimal comprehension, we recommend completing the following foundational lesson(s) before starting this topic:
                      </p>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {prereqEval.missingPrerequisites.map((pLes) => (
                          <button
                            key={pLes.id}
                            className="btn btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "0.75rem", borderColor: "rgba(244, 63, 94, 0.4)" }}
                            onClick={() => {
                              const parentPath = LEARNING_PATHS.find((p) => p.id === pLes.pathId) || selectedPath;
                              setSelectedPath(parentPath);
                              setSelectedLesson(pLes);
                            }}
                          >
                            ➔ Study: {pLes.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                } else if (selectedLesson.prerequisites.length > 0) {
                  return (
                    <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "8px 12px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 size={15} color="var(--accent-emerald)" />
                      <span style={{ fontSize: "0.78rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                        All Learning Prerequisites Verified & Satisfied ({prereqEval.completedRequired}/{prereqEval.totalRequired})
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Explanation Mode Switcher */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  padding: "6px",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "18px",
                }}
              >
                {[
                  { id: "beginner", label: "🎓 Beginner English" },
                  { id: "hinglish", label: "🇮🇳 आसान भाषा (Hinglish)" },
                  { id: "analogy", label: "💡 Everyday Analogy" },
                  { id: "technical", label: "🔬 Technical Deep Dive" },
                  { id: "ai_tutor", label: "🤖 Ask AI Tutor" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setExplanationMode(mode.id as any)}
                    className={`filter-chip ${explanationMode === mode.id ? "active" : ""}`}
                    style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Explanation Content Based on Active Mode */}
              {explanationMode === "beginner" && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "6px" }}>
                    1. Conceptual Overview (Beginner Friendly)
                  </h3>
                  <p style={{ fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-main)", margin: 0 }}>
                    {selectedLesson.beginnerExplanation}
                  </p>
                </div>
              )}

              {explanationMode === "hinglish" && (
                <div style={{ marginBottom: "20px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "14px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "6px" }}>
                    🇮🇳 आसान हिंदी व्याख्या (Hinglish Ground-Zero Explanation)
                  </h3>
                  <p style={{ fontSize: "0.9rem", lineHeight: "1.65", color: "var(--text-main)", margin: 0 }}>
                    {selectedLesson.hinglishExplanation || selectedLesson.beginnerExplanation}
                  </p>
                </div>
              )}

              {explanationMode === "analogy" && (
                <div style={{ marginBottom: "20px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "14px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "6px" }}>
                    💡 Everyday Real-World Analogy
                  </h3>
                  <p style={{ fontSize: "0.9rem", lineHeight: "1.65", color: "var(--text-main)", margin: 0 }}>
                    {selectedLesson.realWorldAnalogy || selectedLesson.beginnerExplanation}
                  </p>
                </div>
              )}

              {explanationMode === "technical" && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px" }}>
                    2. Technical Architecture & Deep Dive
                  </h3>
                  <p style={{ fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-main)", margin: 0 }}>
                    {selectedLesson.technicalDeepDive}
                  </p>
                </div>
              )}

              {explanationMode === "ai_tutor" && (
                <div style={{ marginBottom: "20px", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "8px", padding: "14px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={16} /> AI Tutor: Context-Aware Lesson Explainer
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 10px 0" }}>
                    Have your AI Tutor clarify '{selectedLesson.title}' using simple analogies, Hinglish, or real attack steps.
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                    {[
                      "Explain in simple Hinglish with an everyday analogy",
                      "How do hackers exploit this in real life?",
                      "How do developers fix this in secure code?",
                      "Ask me a quiz question to test my understanding",
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        onClick={() => onOpenAiMentor?.(`${promptText} regarding '${selectedLesson.title}'`)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          borderRadius: "4px",
                          border: "1px solid var(--border-color)",
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--accent-cyan)",
                          cursor: "pointer",
                        }}
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Core Pedagogical Pillars: Why It Exists, Cybersecurity Connection & Practical Task */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                {selectedLesson.whyItExists && (
                  <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--accent-purple)", marginBottom: "4px" }}>
                      Why Was This Created?
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-main)", lineHeight: "1.45" }}>
                      {selectedLesson.whyItExists}
                    </div>
                  </div>
                )}
                {selectedLesson.cybersecurityConnection && (
                  <div style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.25)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--accent-rose)", marginBottom: "4px" }}>
                      Cybersecurity & Pentesting Connection
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-main)", lineHeight: "1.45" }}>
                      {selectedLesson.cybersecurityConnection}
                    </div>
                  </div>
                )}
                {selectedLesson.applicationTask && (
                  <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--accent-emerald)", marginBottom: "4px" }}>
                      Hands-On Practical Task
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-main)", lineHeight: "1.45" }}>
                      {selectedLesson.applicationTask}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: ASCII Diagram */}
              {selectedLesson.diagramAscii && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                    3. Architecture Visual Flowchart
                  </h3>
                  <div style={{ background: "#050811", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", overflowX: "auto" }}>
                    <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.78rem", color: "#38bdf8", lineHeight: "1.4" }}>
                      {selectedLesson.diagramAscii}
                    </pre>
                  </div>
                </div>
              )}

              {/* Toggle Interactive Dynamic Flowchart */}
              <div style={{ marginBottom: "20px" }}>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  onClick={() => setShowDiagram(!showDiagram)}
                >
                  <GitBranch size={14} color="var(--accent-cyan)" /> {showDiagram ? "Hide Interactive Flowchart" : "View Attack vs Defense Flowchart"}
                </button>

                {showDiagram && (
                  <div style={{ marginTop: "12px" }}>
                    <SecurityFlowchart vulnerabilityType={selectedLesson.title} />
                  </div>
                )}
              </div>

              {/* Section 4: Code Examples */}
              {selectedLesson.codeExamples && selectedLesson.codeExamples.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                    4. Code Implementation & Security Patterns
                  </h3>
                  {selectedLesson.codeExamples.map((ex, idx) => (
                    <div key={idx} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: ex.isVulnerable ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                          {ex.isVulnerable ? "⚠️ Vulnerable Implementation:" : "🛡️ Secure Defensive Implementation:"} {ex.caption}
                        </span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "2px 8px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}
                          onClick={() => handleCopy(ex.code)}
                        >
                          {copiedCode === ex.code ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                          {copiedCode === ex.code ? "Copied" : "Copy Code"}
                        </button>
                      </div>
                      <div style={{ background: "#050811", border: `1px solid ${ex.isVulnerable ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)"}`, borderRadius: "8px", padding: "12px", overflowX: "auto" }}>
                        <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.8rem", color: ex.isVulnerable ? "#fda4af" : "#86efac", lineHeight: "1.45" }}>
                          {ex.code}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 5: Common Mistakes */}
              {selectedLesson.commonMistakes && selectedLesson.commonMistakes.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "6px" }}>
                    5. Common Engineering Mistakes & Pitfalls
                  </h3>
                  <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.84rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {selectedLesson.commonMistakes.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Scanner Integration Link */}
              {selectedLesson.scannerIntegration && (
                <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "20px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--accent-blue)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Play size={14} /> Native Scanner Integration Available:
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 10px 0" }}>
                    {selectedLesson.scannerIntegration.suggestedAction}
                  </p>
                  {onNavigateScanner && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      onClick={() => onNavigateScanner(selectedLesson.scannerIntegration!.toolId)}
                    >
                      Open {selectedLesson.scannerIntegration.toolName} in Scan Console
                    </button>
                  )}
                </div>
              )}

              {/* Section 6: Interactive Quiz */}
              {selectedLesson.quiz && (
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", marginTop: "20px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Award size={18} color="var(--accent-cyan)" /> Knowledge Check Assessment
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {selectedLesson.quiz.questions.map((q) => {
                      const selectedOpt = selectedQuizAnswers[q.id];
                      const isCorrect = selectedOpt === q.correctIndex;

                      return (
                        <div key={q.id} style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                          <div style={{ fontSize: "0.86rem", fontWeight: 600, marginBottom: "8px" }}>
                            {q.question}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {q.options.map((opt, optIdx) => {
                              let bg = "var(--bg-secondary)";
                              let border = "var(--border-color)";
                              if (quizSubmitted) {
                                if (optIdx === q.correctIndex) {
                                  bg = "rgba(16, 185, 129, 0.2)";
                                  border = "var(--accent-emerald)";
                                } else if (selectedOpt === optIdx) {
                                  bg = "rgba(244, 63, 94, 0.2)";
                                  border = "var(--accent-rose)";
                                }
                              } else if (selectedOpt === optIdx) {
                                bg = "rgba(6, 182, 212, 0.15)";
                                border = "var(--accent-cyan)";
                              }

                              return (
                                <button
                                  key={optIdx}
                                  disabled={quizSubmitted}
                                  style={{
                                    textAlign: "left",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    fontSize: "0.82rem",
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    color: "var(--text-main)",
                                    cursor: quizSubmitted ? "default" : "pointer"
                                  }}
                                  onClick={() => setSelectedQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {quizSubmitted && (
                            <div style={{ marginTop: "8px", fontSize: "0.8rem", color: isCorrect ? "var(--accent-emerald)" : "var(--accent-rose)", lineHeight: "1.4" }}>
                              {isCorrect ? "✓ Correct! " : "✗ Incorrect. "} {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      {!quizSubmitted ? (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                          disabled={Object.keys(selectedQuizAnswers).length === 0}
                          onClick={() => {
                            setQuizSubmitted(true);
                            handleCompleteLesson(selectedLesson.id);
                          }}
                        >
                          Submit Quiz Answers
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                          onClick={() => {
                            setQuizSubmitted(false);
                            setSelectedQuizAnswers({});
                          }}
                        >
                          <RotateCcw size={13} /> Retake Quiz
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Personal Notes & Quick Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Notes Card */}
            <div className="card" style={{ margin: 0, padding: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Edit3 size={15} color="var(--accent-cyan)" /> My Personal Notes
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", margin: "0 0 8px 0" }}>
                Saved locally for this lesson:
              </p>
              <textarea
                className="textarea-field"
                rows={8}
                placeholder="Write your study notes, command snippets, or key takeaways here..."
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                style={{ fontSize: "0.78rem" }}
              />
              <button
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center", marginTop: "8px", fontSize: "0.78rem", padding: "6px" }}
                onClick={handleSaveNote}
              >
                Save Notes
              </button>
            </div>

            {/* Quick Links */}
            <div className="card" style={{ margin: 0, padding: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "8px" }}>
                Authoritative Resources
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedLesson.authoritativeReferences.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <ExternalLink size={12} /> {ref.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CONCEPT LIBRARY */}
      {activeTab === "concepts" && (
        <ConceptLibraryView
          concepts={CONCEPT_LIBRARY}
          selectedConcept={selectedConcept}
          onSelectConcept={setSelectedConcept}
          domainFilter={conceptDomainFilter}
          onChangeDomainFilter={setConceptDomainFilter}
          searchQuery={conceptSearch}
          onChangeSearchQuery={setConceptSearch}
        />
      )}

      {/* TAB: SECURITY WORKFLOWS */}
      {activeTab === "workflows" && (
        <WorkflowsView />
      )}

      {/* TAB 4: VULNERABILITY ENCYCLOPEDIA */}
      {activeTab === "encyclopedia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Filter & Search Bar */}
          <div className="filter-bar" style={{ margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
              <Search size={16} color="var(--text-dim)" />
              <input
                type="text"
                className="input-field"
                placeholder="Search vulnerabilities by name, CWE ID (e.g. CWE-89), or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: "36px", fontSize: "0.85rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Filter size={14} color="var(--text-dim)" />
              <select
                className="input-field"
                value={vulnSeverityFilter}
                onChange={(e) => setVulnSeverityFilter(e.target.value)}
                style={{ width: "140px", height: "36px", fontSize: "0.82rem" }}
              >
                <option value="ALL">All Severities</option>
                <option value="Critical">Critical (9.0 - 10.0)</option>
                <option value="High">High (7.0 - 8.9)</option>
                <option value="Medium">Medium (4.0 - 6.9)</option>
                <option value="Low">Low (0.1 - 3.9)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "16px", alignItems: "flex-start" }}>
            {/* Vulnerability List Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "680px", overflowY: "auto" }}>
              {filteredVulns.map((v) => {
                const isSelected = selectedVulnerability?.id === v.id;
                return (
                  <div
                    key={v.id}
                    style={{
                      background: isSelected ? "rgba(6, 182, 212, 0.12)" : "var(--bg-secondary)",
                      border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--border-color)"}`,
                      borderRadius: "8px",
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onClick={() => setSelectedVulnerability(v)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-main)" }}>
                        {v.name}
                      </span>
                      <span className={`badge badge-${v.severity.toLowerCase()}`}>
                        {v.severity}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", gap: "6px" }}>
                      <span>{v.cwe || "CWE"}</span>
                      <span>&bull;</span>
                      <span>CVSS {v.cvssBaseScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vulnerability Detailed Inspector with 8-Step Workflow */}
            {selectedVulnerability && (
              <div className="card" style={{ margin: 0, padding: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="badge badge-locked" style={{ fontSize: "0.72rem" }}>
                        {selectedVulnerability.cwe || "CWE"}
                      </span>
                      <span className="badge badge-locked" style={{ fontSize: "0.72rem" }}>
                        Category: {selectedVulnerability.category}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                      {selectedVulnerability.name}
                    </h2>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className={`badge badge-${selectedVulnerability.severity.toLowerCase()}`} style={{ fontSize: "0.82rem" }}>
                      {selectedVulnerability.severity} &bull; CVSS {selectedVulnerability.cvssBaseScore}
                    </span>
                    {selectedVulnerability.scannerCheck ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(6, 182, 212, 0.15)",
                          color: "var(--accent-cyan)",
                          border: "1px solid rgba(6, 182, 212, 0.35)"
                        }}
                      >
                        ⚡ Native Scanner Supported
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "var(--text-dim)",
                          border: "1px solid var(--border-color)"
                        }}
                      >
                        📚 Reference Guide
                      </span>
                    )}
                  </div>
                </div>

                {/* 8-Step Workflow Indicator */}
                <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "10px", marginBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["1. Learn", "2. Understand", "3. Detect", "4. Validate", "5. Assess", "6. Fix", "7. Retest", "8. Document"].map((stepLabel, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--accent-cyan)",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {stepLabel}
                    </span>
                  ))}
                </div>

                {/* STEP 1: LEARN (Definition & Aliases) */}
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", marginBottom: "16px", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                    Step 1: Learn — Authoritative Definition & Aliases:
                  </div>
                  <p style={{ fontSize: "0.86rem", color: "var(--text-main)", lineHeight: "1.5", margin: "0 0 6px 0" }}>
                    {selectedVulnerability.definition}
                  </p>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    <strong>Known Aliases:</strong> {selectedVulnerability.aliases.join(", ")}
                  </div>
                </div>

                {/* STEP 2: UNDERSTAND (Root Cause & Attack Flow) */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px" }}>
                    Step 2: Understand — Root Cause & Attack Mechanism:
                  </h4>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: "1.5", margin: "0 0 10px 0" }}>
                    {selectedVulnerability.technicalExplanation}
                  </p>
                  <div style={{ background: "var(--bg-secondary)", borderRadius: "6px", padding: "10px", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-main)", marginBottom: "4px" }}>
                      Safe Attack Flow Sequence:
                    </div>
                    <ol style={{ paddingLeft: "18px", margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {selectedVulnerability.attackFlow.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* STEP 3: DETECT (Detection Methodology & Native Scanner Check) */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "6px" }}>
                    Step 3: Detect — Detection Methodology & Scanner Signatures:
                  </h4>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: "1.5", margin: "0 0 10px 0" }}>
                    {selectedVulnerability.detectionMethodology}
                  </p>

                  {selectedVulnerability.scannerCheck && (
                    <div
                      style={{
                        background: "rgba(6, 182, 212, 0.08)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        borderRadius: "8px",
                        padding: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--accent-cyan)", marginBottom: "2px" }}>
                          ⚡ Native Scanner: {selectedVulnerability.scannerCheck.toolName} ({selectedVulnerability.scannerCheck.checkId})
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {selectedVulnerability.scannerCheck.description}
                        </div>
                      </div>
                      {onNavigateScanner && (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: "0.76rem", padding: "5px 10px" }}
                          onClick={() => onNavigateScanner(selectedVulnerability.scannerCheck?.checkId || "scanner")}
                        >
                          <Play size={12} /> Test in Scanner Console
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* STEP 4: VALIDATE (Manual Validation, PoC & False Positives) */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "6px" }}>
                    Step 4: Validate — Non-Destructive Proof-of-Concept & Verification:
                  </h4>
                  <ol style={{ paddingLeft: "18px", margin: "0 0 10px 0", fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {selectedVulnerability.manualValidationSteps.map((vStep, idx) => (
                      <li key={idx}>{vStep}</li>
                    ))}
                  </ol>

                  {/* PoC Payload Card */}
                  <div style={{ background: "#050811", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-rose)" }}>
                        Benign Non-Destructive PoC:
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "3px 6px", fontSize: "0.7rem" }}
                        onClick={() => handleCopy(selectedVulnerability.pocDemo)}
                      >
                        {copiedCode === selectedVulnerability.pocDemo ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <code style={{ fontSize: "0.76rem", color: "#fca5a5", wordBreak: "break-all" }}>
                      {selectedVulnerability.pocDemo}
                    </code>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    <strong>False Positive Considerations:</strong> {selectedVulnerability.falsePositiveConsiderations}
                  </div>
                </div>

                {/* STEP 5: ASSESS (CVSS Scoring & Threat Impact) */}
                <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border-color)", marginBottom: "18px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-main)", marginBottom: "6px" }}>
                    Step 5: Assess — CVSS v3.1 Severity Metric:
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span className={`badge badge-${selectedVulnerability.severity.toLowerCase()}`}>
                      {selectedVulnerability.severity} ({selectedVulnerability.cvssBaseScore})
                    </span>
                    {selectedVulnerability.cvssVector && (
                      <code style={{ fontSize: "0.74rem", color: "var(--accent-cyan)", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", padding: "2px 6px", borderRadius: "4px" }}>
                        {selectedVulnerability.cvssVector}
                      </code>
                    )}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {selectedVulnerability.expectedObservations}
                  </div>
                </div>

                {/* STEP 6: FIX (Vulnerable vs Secure Code & Defense-in-Depth) */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "6px" }}>
                    Step 6: Fix — Secure Remediation & Defense-in-Depth:
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent-rose)", marginBottom: "4px" }}>
                        ❌ Vulnerable Pattern:
                      </div>
                      <div style={{ background: "#050811", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "6px", padding: "10px", fontSize: "0.75rem", overflowX: "auto" }}>
                        <pre style={{ margin: 0, color: "#fca5a5" }}>{selectedVulnerability.vulnerableCode.code}</pre>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent-emerald)", marginBottom: "4px" }}>
                        ✅ Secure Remediation:
                      </div>
                      <div style={{ background: "#050811", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", padding: "10px", fontSize: "0.75rem", overflowX: "auto" }}>
                        <pre style={{ margin: 0, color: "#86efac" }}>{selectedVulnerability.secureCodeFix.code}</pre>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "6px", padding: "10px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--accent-emerald)", marginBottom: "4px" }}>
                      Defense-in-Depth Layering:
                    </div>
                    <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {selectedVulnerability.defenseInDepth.map((def, idx) => (
                        <li key={idx}>{def}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* STEP 7: RETEST (Retesting Verification Checklist) */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px" }}>
                    Step 7: Retest — Verification & Closure:
                  </h4>
                  <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {selectedVulnerability.retestSteps.map((rStep, idx) => (
                      <li key={idx}>{rStep}</li>
                    ))}
                  </ul>
                </div>

                {/* STEP 8: DOCUMENT (Report Documentation Template) */}
                <div style={{ background: "var(--bg-secondary)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border-color)" }}>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
                    Step 8: Document — Standardized Finding Template:
                  </h4>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                    <div><strong>Title:</strong> {selectedVulnerability.name} ({selectedVulnerability.cwe})</div>
                    <div><strong>Severity:</strong> {selectedVulnerability.severity} (CVSS: {selectedVulnerability.cvssBaseScore})</div>
                    <div><strong>Executive Summary:</strong> The application fails to properly sanitize or validate user input, allowing attackers to execute unauthorized commands or access sensitive records.</div>
                    <div><strong>Remediation:</strong> Implement parameterized statements, enforce strict input validation, and enable defense-in-depth security controls as detailed above.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TOOLS KNOWLEDGE BASE */}
      {activeTab === "tools" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {TOOLS_KNOWLEDGE_BASE.map((tool) => {
              const isSelected = selectedTool?.id === tool.id;
              return (
                <div
                  key={tool.id}
                  style={{
                    background: isSelected ? "rgba(6, 182, 212, 0.12)" : "var(--bg-secondary)",
                    border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--border-color)"}`,
                    borderRadius: "8px",
                    padding: "12px",
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedTool(tool)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{tool.name}</span>
                    {tool.integratedInAppSecNexus && (
                      <span className="badge badge-locked" style={{ fontSize: "0.68rem" }}>
                        Integrated
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                    {tool.licenseType} &bull; {tool.category}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTool && (
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>
                  {selectedTool.name}
                </h2>
                <a
                  href={selectedTool.website}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                >
                  <ExternalLink size={12} /> Official Docs
                </a>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "16px" }}>
                {selectedTool.description}
              </p>

              {/* Essential Commands */}
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "8px" }}>
                  Essential Command Cheat Sheet:
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedTool.essentialCommands.map((cmd, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#050811",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <code style={{ fontSize: "0.78rem", color: "var(--accent-cyan)" }}>{cmd.command}</code>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                          {cmd.description}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "3px 6px", fontSize: "0.7rem", flexShrink: 0 }}
                        onClick={() => handleCopy(cmd.command)}
                      >
                        {copiedCode === cmd.command ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations */}
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "6px" }}>
                  False Positive & Operational Limitations:
                </h4>
                <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {selectedTool.limitationsAndFalsePositives.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: METHODOLOGIES */}
      {activeTab === "methodologies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {METHODOLOGIES_DATA.map((meth) => (
            <div key={meth.id} className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", margin: 0 }}>
                  {meth.name}
                </h3>
                <span className="badge badge-locked">{meth.version}</span>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                {meth.purpose}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                {meth.corePhases.map((phase) => (
                  <div
                    key={phase.phaseNumber}
                    style={{
                      background: "var(--bg-secondary)",
                      borderRadius: "6px",
                      padding: "12px",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "4px" }}>
                      Phase {phase.phaseNumber}: {phase.title}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: "1.4" }}>
                      {phase.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: HANDS-ON GUIDED LABS & VIRTUAL SANDBOXES */}
      {activeTab === "labs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Interactive Virtual Labs Workspace */}
          <VirtualLabsWorkspace
            onNavigateVerificationLab={() => onNavigateScanner?.("verificationLab")}
            onOpenAiMentor={onOpenAiMentor}
          />

          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "4px" }}>
              Guided Walkthrough Labs & Exploit Scenarios
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
              Step-by-step verified walkthroughs for testing common vulnerabilities in authorized environments.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {PRACTICAL_LABS.map((lab) => (
                <div key={lab.id} className="card" style={{ margin: 0, backgroundColor: "var(--bg-secondary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                        {lab.title}
                      </h3>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "2px" }}>
                        Category: {lab.category} &bull; Estimated Time: {lab.estimatedMinutes} minutes
                      </div>
                    </div>

                    <span className="badge badge-high">{lab.difficulty.toUpperCase()}</span>
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                    {lab.scenarioDescription}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                    {lab.stepByStepWalkthrough.map((st) => (
                      <div
                        key={st.step}
                        style={{
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          padding: "10px 14px"
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                          Step {st.step}: {st.title}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-main)", marginBottom: "6px" }}>
                          {st.instruction}
                        </div>
                        {st.commandOrPayload && (
                          <div style={{ background: "#050811", padding: "6px 10px", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--accent-amber)" }}>
                            Payload / Command: {st.commandOrPayload}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "6px", padding: "10px 14px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent-amber)" }}>
                      ⚠️ Laboratory Warning & Scope Rules:
                    </span>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                      {lab.warningNotice} Target recommendation: {lab.targetRecommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: GLOSSARY & KNOWLEDGE BASE */}
      {activeTab === "glossary" && (
        <GlossaryKnowledgeBaseView
          onAskAiTutor={(q) => onOpenAiMentor?.(q)}
          onNavigateTool={onNavigateScanner}
        />
      )}

      {/* TAB: ASK THE AI TUTOR */}
      {activeTab === "ai_tutor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ margin: 0, padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(6, 182, 212, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={22} color="var(--accent-cyan)" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                  Ask the AI Cybersecurity Tutor
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Personalized 1-on-1 mentor: Ask questions from absolute beginner level to advanced penetration testing in English or Hinglish.
                </p>
              </div>
            </div>

            {/* Quick Prompt Cards */}
            <div style={{ marginTop: "16px", marginBottom: "20px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                Suggested Prompts for "{selectedLesson.title}":
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                {[
                  {
                    title: "🇮🇳 Hinglish Explanation",
                    desc: "Explain this concept in simple Hindi-English with everyday examples.",
                    prompt: `Explain '${selectedLesson.title}' from ground zero in simple Hinglish terms, with an everyday real-world analogy.`,
                  },
                  {
                    title: "🔍 Manual Verification Steps",
                    desc: "How do I manually test this vulnerability with Burp Suite or curl?",
                    prompt: `Give me step-by-step instructions to manually verify '${selectedLesson.title}' in an authorized lab target without automated scanners.`,
                  },
                  {
                    title: "🛡️ Secure Code Fix",
                    desc: "Show before-and-after code fixing this flaw permanently.",
                    prompt: `Show me the vulnerable code pattern for '${selectedLesson.title}' and the secure parameterized fix in Python/JavaScript.`,
                  },
                  {
                    title: "💼 Job Interview Prep",
                    desc: "Simulate a junior pentester technical interview question.",
                    prompt: `Act as a senior cybersecurity interviewer. Ask me 3 technical interview questions about '${selectedLesson.title}' and evaluate my understanding.`,
                  },
                ].map((card, i) => (
                  <div
                    key={i}
                    onClick={() => onOpenAiMentor?.(card.prompt)}
                    style={{
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      cursor: "pointer",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {card.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Question Form */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                backgroundColor: "var(--bg-secondary)",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              <label style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: 600 }}>
                Ask Any Technical or Conceptual Question:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={aiTutorPrompt}
                  onChange={(e) => setAiTutorPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && aiTutorPrompt.trim()) {
                      onOpenAiMentor?.(aiTutorPrompt);
                      setAiTutorPrompt("");
                    }
                  }}
                  placeholder="e.g. What is the difference between TCP and UDP? Explain like I am 10..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    fontSize: "0.85rem",
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    color: "var(--text-main)",
                  }}
                />
                <button
                  onClick={() => {
                    if (aiTutorPrompt.trim()) {
                      onOpenAiMentor?.(aiTutorPrompt);
                      setAiTutorPrompt("");
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 18px",
                    backgroundColor: "var(--accent-cyan)",
                    color: "#0f172a",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Send size={15} />
                  Ask Tutor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: CERTIFICATIONS & CAREERS */}
      {activeTab === "certifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Career Roadmaps */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
              Career Pathways & Industry Role Roadmaps
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "14px" }}>
              {CAREER_ROADMAPS.map((role) => (
                <div
                  key={role.id}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 4px 0", color: "var(--text-main)" }}>
                      {role.roleTitle}
                    </h4>
                    <span style={{ fontSize: "0.78rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                      Avg Salary: {role.salaryRangeUS}
                    </span>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "8px 0 12px 0" }}>
                      {role.targetAudience}
                    </p>

                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "4px" }}>
                      Recommended Certifications:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                      {role.recommendedCertifications.map((c, idx) => (
                        <span key={idx} className="badge badge-locked" style={{ fontSize: "0.7rem" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications Directory */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
              Verified Certification Directory
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "12px" }}>
              {CERTIFICATIONS_DIRECTORY.map((cert) => (
                <div
                  key={cert.id}
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    padding: "14px",
                    border: "1px solid var(--border-color)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{cert.title}</span>
                    <span className="badge badge-locked">{cert.level.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                    Issuer: {cert.issuer} &bull; Verified Fee: {cert.estimatedCost}
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "10px", lineHeight: "1.4" }}>
                    {cert.examFormat}
                  </p>
                  <a
                    href={cert.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <ExternalLink size={12} /> Official Registration Page
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: BOOKMARKS & NOTES */}
      {activeTab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
              My Bookmarks ({userState.bookmarks.length})
            </h3>
            {userState.bookmarks.length === 0 ? (
              <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                You have not bookmarked any lessons yet. Click 'Bookmark' while reading any lesson to save it here for fast revision!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {userState.bookmarks.map((bmId) => {
                  const found = allLessons.find((l) => l.id === bmId);
                  return (
                    <div
                      key={bmId}
                      style={{
                        background: "var(--bg-secondary)",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        {found ? found.title : bmId}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        onClick={() => {
                          if (found) {
                            setSelectedLesson(found);
                            setActiveTab("lesson");
                          }
                        }}
                      >
                        Open Lesson
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
              Personal Study Notes ({Object.keys(userState.notes).length})
            </h3>
            {Object.keys(userState.notes).length === 0 ? (
              <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No notes written yet. Use the note pad in any lesson to jot down key ideas, payloads, or cheat codes.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.entries(userState.notes).map(([lesId, noteText]) => {
                  const found = allLessons.find((l) => l.id === lesId);
                  return (
                    <div
                      key={lesId}
                      style={{
                        background: "var(--bg-secondary)",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)"
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-cyan)", marginBottom: "6px" }}>
                        {found ? found.title : lesId}
                      </div>
                      <div style={{ fontSize: "0.84rem", color: "var(--text-main)", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                        {noteText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
