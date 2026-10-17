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
  Copy
} from "lucide-react";
import {
  Lesson,
  LearningPath,
  VulnerabilityEntry,
  ToolEntry,
  UserAcademyState
} from "./types";
import { LEARNING_PATHS } from "./data/curriculumData";
import { VULNERABILITY_ENCYCLOPEDIA } from "./data/vulnerabilityEncyclopediaData";
import { TOOLS_KNOWLEDGE_BASE } from "./data/toolsData";
import { METHODOLOGIES_DATA } from "./data/methodologiesData";
import { PRACTICAL_LABS } from "./data/labsData";
import { CERTIFICATIONS_DIRECTORY, CAREER_ROADMAPS } from "./data/certificationsData";
import { SecurityFlowchart } from "../Flowchart";

interface CyberAcademyProps {
  onNavigateScanner?: (toolId: string) => void;
  onOpenAiMentor?: (query: string) => void;
}

const STORAGE_KEY = "appsec_nexus_cyber_academy_state_v1";

export function CyberAcademy({ onNavigateScanner, onOpenAiMentor }: CyberAcademyProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "paths" | "lesson" | "encyclopedia" | "tools" | "methodologies" | "labs" | "certifications" | "notes"
  >("dashboard");

  // Selection State
  const [selectedPath, setSelectedPath] = useState<LearningPath>(LEARNING_PATHS[0]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson>(LEARNING_PATHS[0].modules[0].lessons[0]);
  const [selectedVulnerability, setSelectedVulnerability] = useState<VulnerabilityEntry | null>(VULNERABILITY_ENCYCLOPEDIA[0]);
  const [selectedTool, setSelectedTool] = useState<ToolEntry | null>(TOOLS_KNOWLEDGE_BASE[0]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vulnSeverityFilter, setVulnSeverityFilter] = useState<string>("ALL");

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
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 30, 51, 0.85) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.25)"
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
            <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
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
          { id: "dashboard", label: "Dashboard & Progress", icon: Award },
          { id: "paths", label: "Learning Paths", icon: BookOpen },
          { id: "lesson", label: "Interactive Lesson", icon: Terminal },
          { id: "encyclopedia", label: "Vulnerability Encyclopedia", icon: ShieldAlert },
          { id: "tools", label: "Tools Knowledge Base", icon: Radio },
          { id: "methodologies", label: "Methodologies & Frameworks", icon: GitBranch },
          { id: "labs", label: "Hands-on Guided Labs", icon: Play },
          { id: "certifications", label: "Certifications & Careers", icon: GraduationCap },
          { id: "notes", label: "My Bookmarks & Notes", icon: Bookmark }
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

          {/* Featured Learning Paths Grid */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} color="var(--accent-cyan)" /> Structured Learning Roadmap
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
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

      {/* TAB 2: LEARNING PATHS EXPLORER */}
      {activeTab === "paths" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {LEARNING_PATHS.map((path) => (
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
                              background: "rgba(15, 23, 42, 0.6)",
                              padding: "8px 12px",
                              borderRadius: "6px",
                              border: "1px solid rgba(255,255,255,0.04)"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "50%",
                                  backgroundColor: isDone ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)",
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

              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0 0 12px 0" }}>
                {selectedLesson.title}
              </h2>

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

              {/* Section 1: Beginner Explanation */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "6px" }}>
                  1. Conceptual Overview (Beginner Friendly)
                </h3>
                <p style={{ fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-main)", margin: 0 }}>
                  {selectedLesson.beginnerExplanation}
                </p>
              </div>

              {/* Section 2: Technical Deep Dive */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px" }}>
                  2. Technical Architecture & Deep Dive
                </h3>
                <p style={{ fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-main)", margin: 0 }}>
                  {selectedLesson.technicalDeepDive}
                </p>
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
                        <div key={q.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
                          <div style={{ fontSize: "0.86rem", fontWeight: 600, marginBottom: "8px" }}>
                            {q.question}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {q.options.map((opt, optIdx) => {
                              let bg = "rgba(15, 23, 42, 0.8)";
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

            {/* Vulnerability Detailed Inspector */}
            {selectedVulnerability && (
              <div className="card" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                      {selectedVulnerability.name}
                    </h2>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginTop: "4px" }}>
                      {selectedVulnerability.cwe} &bull; Category: {selectedVulnerability.category}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <span className={`badge badge-${selectedVulnerability.severity.toLowerCase()}`} style={{ fontSize: "0.82rem" }}>
                      {selectedVulnerability.severity} &bull; CVSS {selectedVulnerability.cvssBaseScore}
                    </span>
                  </div>
                </div>

                {/* Definition Box */}
                <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--accent-cyan)", marginBottom: "4px" }}>
                    Authoritative Definition & Impact:
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: "1.5", margin: 0 }}>
                    {selectedVulnerability.definition}
                  </p>
                </div>

                {/* Technical Root Cause */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "6px" }}>
                    Root Cause Analysis:
                  </h4>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: "1.5", margin: 0 }}>
                    {selectedVulnerability.technicalExplanation}
                  </p>
                </div>

                {/* Side-by-Side Vulnerable vs Secure Code */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
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

                {/* Attack Flow & PoC */}
                <div style={{ marginBottom: "18px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "6px" }}>
                    Safe Attack Flow & Validation Steps:
                  </h4>
                  <ol style={{ paddingLeft: "18px", margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {selectedVulnerability.attackFlow.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Defense-in-Depth Measures */}
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "6px" }}>
                    Defense-in-Depth Layering:
                  </h4>
                  <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {selectedVulnerability.defenseInDepth.map((def, idx) => (
                      <li key={idx}>{def}</li>
                    ))}
                  </ul>
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

      {/* TAB 7: HANDS-ON GUIDED LABS */}
      {activeTab === "labs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {PRACTICAL_LABS.map((lab) => (
            <div key={lab.id} className="card" style={{ margin: 0 }}>
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
                      background: "var(--bg-secondary)",
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
      )}

      {/* TAB 8: CERTIFICATIONS & CAREERS */}
      {activeTab === "certifications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Career Roadmaps */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "12px" }}>
              Career Pathways & Industry Role Roadmaps
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
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
