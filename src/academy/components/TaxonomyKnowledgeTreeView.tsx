import { useState, useMemo, useEffect } from "react";
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Bookmark,
  Edit3,
  Terminal,
  Cpu,
  Server,
  Globe,
  Smartphone,
  Cloud,
  Activity,
  Check,
  Copy,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import {
  TaxonomySkillLevel,
  TaxonomyUserProgress,
} from "../taxonomy/types";
import {
  TAXONOMY_DOMAINS,
  findTaxonomyTopic,
  searchTaxonomy,
  getTaxonomyStats,
  getDomainProgress,
} from "../taxonomy/data";

interface TaxonomyKnowledgeTreeViewProps {
  onOpenAiMentor?: (query: string) => void;
  onNavigateScanner?: (toolId: string) => void;
}

const STORAGE_KEY = "appsec_nexus_taxonomy_progress_v1";

export function TaxonomyKnowledgeTreeView({
  onOpenAiMentor,
  onNavigateScanner: _onNavigateScanner,
}: TaxonomyKnowledgeTreeViewProps) {
  // Tree expanded nodes state: keyed by node id
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    // Default expand the first domain, discipline, and phase
    const defaultState: Record<string, boolean> = {
      "domain-foundations": true,
      "disc-computer-architecture": true,
      "phase-comp-arch": true,
      "subphase-cpu-memory": true,
    };
    return defaultState;
  });

  // Selected topic ID
  const [selectedTopicId, setSelectedTopicId] = useState<string>("topic-cpu-rings-memory");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<TaxonomySkillLevel | "ALL">("ALL");
  const [activeViewMode, setActiveViewMode] = useState<"all" | "beginner" | "bookmarks">("all");

  // Active detail tab
  const [detailTab, setDetailTab] = useState<"theory" | "procedure" | "quiz" | "references">("theory");

  // User progress state (completed, bookmarks, notes, quiz scores)
  const [userProgress, setUserProgress] = useState<TaxonomyUserProgress>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return {
      completedTopicIds: [],
      bookmarkedTopicIds: [],
      notes: {},
      quizScores: {},
    };
  });

  // Save progress on state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress));
    } catch {
      // Ignore
    }
  }, [userProgress]);

  // Quiz state for active topic
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Stats
  const stats = useMemo(() => getTaxonomyStats(), []);

  // Currently resolved topic and ancestors
  const activeSelection = useMemo(() => {
    return findTaxonomyTopic(selectedTopicId);
  }, [selectedTopicId]);

  // Filtered topics matching search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && levelFilter === "ALL" && activeViewMode === "all") {
      return null;
    }

    let results = searchTaxonomy(searchQuery, levelFilter);
    if (activeViewMode === "beginner") {
      results = results.filter((item) => item.topic.skillLevel === "beginner");
    } else if (activeViewMode === "bookmarks") {
      results = results.filter((item) => userProgress.bookmarkedTopicIds.includes(item.topic.id));
    }
    return results;
  }, [searchQuery, levelFilter, activeViewMode, userProgress.bookmarkedTopicIds]);

  // Toggle expand/collapse of a node
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Toggle topic bookmark
  const toggleBookmark = (topicId: string) => {
    setUserProgress((prev) => {
      const exists = prev.bookmarkedTopicIds.includes(topicId);
      return {
        ...prev,
        bookmarkedTopicIds: exists
          ? prev.bookmarkedTopicIds.filter((id) => id !== topicId)
          : [...prev.bookmarkedTopicIds, topicId],
      };
    });
  };

  // Toggle topic completion
  const toggleComplete = (topicId: string) => {
    setUserProgress((prev) => {
      const exists = prev.completedTopicIds.includes(topicId);
      return {
        ...prev,
        completedTopicIds: exists
          ? prev.completedTopicIds.filter((id) => id !== topicId)
          : [...prev.completedTopicIds, topicId],
      };
    });
  };

  // Update note text
  const updateNote = (topicId: string, text: string) => {
    setUserProgress((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [topicId]: text,
      },
    }));
  };

  // Copy code helper
  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper for domain icon
  const renderDomainIcon = (iconName: string, size = 16) => {
    switch (iconName) {
      case "Cpu":
        return <Cpu size={size} />;
      case "Globe":
        return <Globe size={size} />;
      case "Terminal":
        return <Terminal size={size} />;
      case "Server":
        return <Server size={size} />;
      case "Smartphone":
        return <Smartphone size={size} />;
      case "Cloud":
        return <Cloud size={size} />;
      case "Activity":
        return <Activity size={size} />;
      default:
        return <FolderTree size={size} />;
    }
  };

  const isCompleted = activeSelection ? userProgress.completedTopicIds.includes(activeSelection.topic.id) : false;
  const isBookmarked = activeSelection ? userProgress.bookmarkedTopicIds.includes(activeSelection.topic.id) : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Top Banner / Metrics Header */}
      <div
        className="card"
        style={{
          margin: 0,
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-cyan)",
            }}
          >
            <FolderTree size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Cybersecurity Knowledge & Training Taxonomy
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "2px 0 0 0" }}>
              Hierarchical curriculum covering 7 Master Domains, 20+ Disciplines, and Step-by-Step Authorized Validation Procedures.
            </p>
          </div>
        </div>

        {/* Quick Stats Pill Row */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Domains</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{stats.totalDomains}</div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Topics</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>{stats.totalTopics}</div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Safe Labs</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-emerald, #22c55e)" }}>{stats.totalProcedures}</div>
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Completed</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-amber, #f59e0b)" }}>
              {userProgress.completedTopicIds.length} / {stats.totalTopics}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-Pane Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "18px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Knowledge Tree Explorer */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            maxHeight: "820px",
            overflowY: "auto",
          }}
        >
          {/* Search Bar */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
              }}
            />
            <input
              type="text"
              placeholder="Search taxonomy (e.g. SQLi, UEFI, SUID, IDOR)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
          </div>

          {/* Quick Filter View Modes */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`btn btn-secondary ${activeViewMode === "all" ? "active" : ""}`}
              style={{ flex: 1, padding: "4px 6px", fontSize: "0.72rem", justifyContent: "center" }}
              onClick={() => setActiveViewMode("all")}
            >
              All Topics
            </button>
            <button
              className={`btn btn-secondary ${activeViewMode === "beginner" ? "active" : ""}`}
              style={{ flex: 1, padding: "4px 6px", fontSize: "0.72rem", justifyContent: "center" }}
              onClick={() => setActiveViewMode("beginner")}
            >
              🌱 Start Here
            </button>
            <button
              className={`btn btn-secondary ${activeViewMode === "bookmarks" ? "active" : ""}`}
              style={{ flex: 1, padding: "4px 6px", fontSize: "0.72rem", justifyContent: "center" }}
              onClick={() => setActiveViewMode("bookmarks")}
            >
              ★ Bookmarked ({userProgress.bookmarkedTopicIds.length})
            </button>
          </div>

          {/* Level Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.76rem" }}>
            <span style={{ color: "var(--text-dim)" }}>Difficulty Filter:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as TaxonomySkillLevel | "ALL")}
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
                fontSize: "0.75rem",
                outline: "none",
              }}
            >
              <option value="ALL">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "4px 0" }} />

          {/* Render Filtered Search Results OR Hierarchical Tree */}
          {searchResults ? (
            /* Flat search result view */
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Matches ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 8px", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                  No taxonomy topics match query "{searchQuery}".
                </div>
              ) : (
                searchResults.map((item) => {
                  const isSelected = selectedTopicId === item.topic.id;
                  const isDone = userProgress.completedTopicIds.includes(item.topic.id);
                  return (
                    <div
                      key={item.topic.id}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        backgroundColor: isSelected ? "var(--bg-card-hover)" : "var(--bg-secondary)",
                        border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                      onClick={() => setSelectedTopicId(item.topic.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-main)" }}>
                          {item.topic.title}
                        </span>
                        {isDone && <CheckCircle2 size={12} color="var(--accent-emerald, #22c55e)" />}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                        {item.domain.shortName} • {item.topic.skillLevel}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Full Hierarchical Tree View */
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {TAXONOMY_DOMAINS.map((domain) => {
                const isDomainOpen = expandedNodes[domain.id];
                const progress = getDomainProgress(domain.id, userProgress.completedTopicIds);

                return (
                  <div
                    key={domain.id}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Domain Header */}
                    <div
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        userSelect: "none",
                        backgroundColor: isDomainOpen ? "rgba(6, 182, 212, 0.05)" : "transparent",
                      }}
                      onClick={() => toggleNode(domain.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "var(--accent-cyan)" }}>
                          {renderDomainIcon(domain.iconName, 15)}
                        </span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                          {domain.shortName}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                          {progress.completed}/{progress.total}
                        </span>
                        {isDomainOpen ? <ChevronDown size={14} color="var(--text-dim)" /> : <ChevronRight size={14} color="var(--text-dim)" />}
                      </div>
                    </div>

                    {/* Disciplines within Domain */}
                    {isDomainOpen && (
                      <div style={{ padding: "0 8px 8px 14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {domain.disciplines.map((disc) => {
                          const isDiscOpen = expandedNodes[disc.id];

                          return (
                            <div key={disc.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "4px 0",
                                }}
                                onClick={() => toggleNode(disc.id)}
                              >
                                {isDiscOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                <span>{disc.title}</span>
                              </div>

                              {/* Phases within Discipline */}
                              {isDiscOpen && (
                                <div style={{ paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {disc.phases.map((phase) => {
                                    const isPhaseOpen = expandedNodes[phase.id];

                                    return (
                                      <div key={phase.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <div
                                          style={{
                                            fontSize: "0.74rem",
                                            fontWeight: 600,
                                            color: "var(--text-dim)",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "3px 0",
                                          }}
                                          onClick={() => toggleNode(phase.id)}
                                        >
                                          {isPhaseOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                          <span>P{phase.phaseNumber}: {phase.title}</span>
                                        </div>

                                        {/* SubPhases within Phase */}
                                        {isPhaseOpen && (
                                          <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                            {phase.subPhases.map((subPhase) => {
                                              const isSubOpen = expandedNodes[subPhase.id];

                                              return (
                                                <div key={subPhase.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                  <div
                                                    style={{
                                                      fontSize: "0.72rem",
                                                      color: "var(--text-muted)",
                                                      cursor: "pointer",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "4px",
                                                      padding: "2px 0",
                                                    }}
                                                    onClick={() => toggleNode(subPhase.id)}
                                                  >
                                                    {isSubOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                                    <span>{subPhase.title}</span>
                                                  </div>

                                                  {/* Topics within SubPhase */}
                                                  {isSubOpen && (
                                                    <div style={{ paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                      {subPhase.topics.map((t) => {
                                                        const isSelected = selectedTopicId === t.id;
                                                        const isDone = userProgress.completedTopicIds.includes(t.id);

                                                        return (
                                                          <div
                                                            key={t.id}
                                                            style={{
                                                              padding: "4px 8px",
                                                              borderRadius: "4px",
                                                              backgroundColor: isSelected ? "var(--bg-card-hover)" : "transparent",
                                                              border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid transparent",
                                                              cursor: "pointer",
                                                              display: "flex",
                                                              alignItems: "center",
                                                              justifyContent: "space-between",
                                                              fontSize: "0.73rem",
                                                              color: isSelected ? "var(--accent-cyan)" : "var(--text-main)",
                                                              fontWeight: isSelected ? 700 : 400,
                                                            }}
                                                            onClick={() => setSelectedTopicId(t.id)}
                                                          >
                                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                              {t.title}
                                                            </span>
                                                            {isDone && <CheckCircle2 size={11} color="var(--accent-emerald, #22c55e)" />}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deep-Dive Topic & Procedure Viewer */}
        {activeSelection ? (
          <div
            className="card"
            style={{
              margin: 0,
              padding: "22px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* Breadcrumb Path */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-dim)", flexWrap: "wrap" }}>
              <span>{activeSelection.domain.shortName}</span>
              <ChevronRight size={12} />
              <span>{activeSelection.disciplineTitle}</span>
              <ChevronRight size={12} />
              <span>{activeSelection.phaseTitle}</span>
              <ChevronRight size={12} />
              <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{activeSelection.topic.title}</span>
            </div>

            {/* Topic Header & Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                  {activeSelection.topic.title}
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
                  {activeSelection.topic.description}
                </p>
              </div>

              {/* Action Buttons: Bookmark, Complete, Ask AI Mentor */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className={`btn ${isBookmarked ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                  onClick={() => toggleBookmark(activeSelection.topic.id)}
                  title="Bookmark this topic"
                >
                  <Bookmark size={13} fill={isBookmarked ? "currentColor" : "none"} />
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </button>

                <button
                  className={`btn ${isCompleted ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                  onClick={() => toggleComplete(activeSelection.topic.id)}
                >
                  <CheckCircle2 size={13} />
                  {isCompleted ? "Completed" : "Mark as Done"}
                </button>

                {onOpenAiMentor && (
                  <button
                    className="btn btn-primary"
                    style={{ padding: "5px 12px", fontSize: "0.75rem" }}
                    onClick={() =>
                      onOpenAiMentor(
                        `I am studying the topic '${activeSelection.topic.title}' in the AppSec Nexus Taxonomy. Could you provide an in-depth defensive architecture breakdown, safe testing walkthrough, and code-level remediation guidelines for this concept?`
                      )
                    }
                  >
                    <Sparkles size={13} /> Ask AI Mentor
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Pills: Level, Time, Technologies */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor:
                    activeSelection.topic.skillLevel === "beginner"
                      ? "rgba(34, 197, 94, 0.15)"
                      : activeSelection.topic.skillLevel === "intermediate"
                      ? "rgba(6, 182, 212, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  color:
                    activeSelection.topic.skillLevel === "beginner"
                      ? "#22c55e"
                      : activeSelection.topic.skillLevel === "intermediate"
                      ? "#06b6d4"
                      : "#ef4444",
                }}
              >
                {activeSelection.topic.skillLevel}
              </span>

              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-color)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Clock size={11} /> {activeSelection.topic.estimatedMinutes} min study
              </span>

              {activeSelection.topic.technologies.map((tech) => (
                <span
                  key={tech}
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-dim)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {tech}
                </span>
              ))}

              {activeSelection.topic.relatedCwe && activeSelection.topic.relatedCwe.map((cwe) => (
                <span
                  key={cwe}
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {cwe}
                </span>
              ))}
            </div>

            {/* Navigation Tabs for Topic Details */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", gap: "10px" }}>
              <button
                className={`tab-btn ${detailTab === "theory" ? "active" : ""}`}
                style={{
                  padding: "8px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  borderBottom: detailTab === "theory" ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                  color: detailTab === "theory" ? "var(--text-main)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
                onClick={() => setDetailTab("theory")}
              >
                1. Theory & Architecture
              </button>

              {activeSelection.topic.procedure && (
                <button
                  className={`tab-btn ${detailTab === "procedure" ? "active" : ""}`}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    background: "transparent",
                    border: "none",
                    borderBottom: detailTab === "procedure" ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                    color: detailTab === "procedure" ? "var(--text-main)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                  onClick={() => setDetailTab("procedure")}
                >
                  2. Authorized Procedure & Lab
                </button>
              )}

              {activeSelection.topic.assessment && (
                <button
                  className={`tab-btn ${detailTab === "quiz" ? "active" : ""}`}
                  style={{
                    padding: "8px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    background: "transparent",
                    border: "none",
                    borderBottom: detailTab === "quiz" ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                    color: detailTab === "quiz" ? "var(--text-main)" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                  onClick={() => setDetailTab("quiz")}
                >
                  3. Assessment Quiz
                </button>
              )}

              <button
                className={`tab-btn ${detailTab === "references" ? "active" : ""}`}
                style={{
                  padding: "8px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  borderBottom: detailTab === "references" ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                  color: detailTab === "references" ? "var(--text-main)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
                onClick={() => setDetailTab("references")}
              >
                4. References & Notes
              </button>
            </div>

            {/* TAB CONTENT: 1. Theory & Architecture */}
            {detailTab === "theory" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Definition & Purpose Box */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    Definition & Core Purpose
                  </div>
                  <div style={{ fontSize: "0.86rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                    {activeSelection.topic.definition}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Purpose: {activeSelection.topic.purpose}
                  </div>
                </div>

                {/* Technical Foundations */}
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "6px" }}>
                    Technical Foundations
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                    {activeSelection.topic.technicalFoundations}
                  </p>
                </div>

                {/* Types & Sub-types */}
                {activeSelection.topic.typesAndSubtypes.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>
                      Classifications & Sub-types
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
                      {activeSelection.topic.typesAndSubtypes.map((typeObj) => (
                        <div
                          key={typeObj.name}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "6px",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                            {typeObj.name}
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                            {typeObj.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Architecture / Data Flow */}
                {activeSelection.topic.architectureDataFlow && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px dashed var(--border-color)",
                      fontFamily: "Fira Code, monospace",
                      fontSize: "0.78rem",
                      color: "var(--text-main)",
                    }}
                  >
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Architecture Data Flow
                    </div>
                    {activeSelection.topic.architectureDataFlow}
                  </div>
                )}

                {/* Common Weaknesses & Defensive Controls */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(239, 68, 68, 0.05)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ef4444", marginBottom: "6px" }}>
                      Common Weaknesses & Risks
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.78rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                      {activeSelection.topic.commonWeaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(34, 197, 94, 0.05)",
                      border: "1px solid rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#22c55e", marginBottom: "6px" }}>
                      Defensive Controls & Mitigations
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.78rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                      {activeSelection.topic.defensiveControls.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. Step-by-Step Authorized Procedure */}
            {detailTab === "procedure" && activeSelection.topic.procedure && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Safety & Scope Box */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                    <strong>Authorized Rules of Engagement:</strong> Execute only against targets within your written scope.
                    {activeSelection.topic.procedure.safetyPrecautions.map((s, idx) => (
                      <span key={idx}> {s};</span>
                    ))}
                  </div>
                </div>

                {/* Procedure Steps */}
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "10px" }}>
                    Step-by-Step Authorized Procedure
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {activeSelection.topic.procedure.steps.map((st) => (
                      <div
                        key={st.stepNumber}
                        style={{
                          padding: "14px",
                          borderRadius: "8px",
                          backgroundColor: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                            Step {st.stepNumber}: {st.title}
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: st.readOnly ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: st.readOnly ? "#22c55e" : "#f59e0b",
                            }}
                          >
                            {st.readOnly ? "Read-Only / Safe" : "Active Mutating"}
                          </span>
                        </div>

                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {st.explanation}
                        </div>

                        {st.commandOrPayload && (
                          <div
                            style={{
                              position: "relative",
                              padding: "10px 12px",
                              borderRadius: "6px",
                              backgroundColor: "var(--bg-primary)",
                              border: "1px solid var(--border-color)",
                              fontFamily: "Fira Code, monospace",
                              fontSize: "0.78rem",
                              color: "var(--accent-cyan)",
                              overflowX: "auto",
                            }}
                          >
                            <code>{st.commandOrPayload}</code>
                            <button
                              style={{
                                position: "absolute",
                                right: "8px",
                                top: "8px",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-dim)",
                              }}
                              onClick={() => handleCopyCode(st.commandOrPayload!, st.stepNumber)}
                              title="Copy command"
                            >
                              {copiedCodeIndex === st.stepNumber ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                            </button>
                          </div>
                        )}

                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          <strong>Expected Observation:</strong> {st.expectedObservation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code-Level Remediation */}
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>
                    Verified Remediation & Code Fix
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                    {activeSelection.topic.procedure.remediation.summary}
                  </p>
                  {activeSelection.topic.procedure.remediation.codeOrConfigExample && (
                    <pre
                      style={{
                        padding: "12px",
                        borderRadius: "6px",
                        backgroundColor: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        fontFamily: "Fira Code, monospace",
                        fontSize: "0.78rem",
                        color: "var(--text-main)",
                        overflowX: "auto",
                        lineHeight: 1.4,
                      }}
                    >
                      {activeSelection.topic.procedure.remediation.codeOrConfigExample}
                    </pre>
                  )}
                </div>

                {/* Retest Procedure */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "4px" }}>
                    Regression & Retest Validation
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Pass Condition: {activeSelection.topic.procedure.retestProcedure.passCondition}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                    Residual Risk Notes: {activeSelection.topic.procedure.retestProcedure.residualRiskNotes}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. Assessment Quiz */}
            {detailTab === "quiz" && activeSelection.topic.assessment && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {activeSelection.topic.assessment.title}
                </div>

                {activeSelection.topic.assessment.questions.map((q, qIndex) => {
                  const selectedOpt = quizAnswers[q.id];
                  const isAnswered = selectedOpt !== undefined;
                  const isCorrect = isAnswered && selectedOpt === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: "14px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-main)" }}>
                        {qIndex + 1}. {q.prompt}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selectedOpt === optIdx;
                          let optBg = "var(--bg-card)";
                          let optBorder = "var(--border-color)";

                          if (quizSubmitted) {
                            if (optIdx === q.correctIndex) {
                              optBg = "rgba(34, 197, 94, 0.15)";
                              optBorder = "#22c55e";
                            } else if (isOptionSelected) {
                              optBg = "rgba(239, 68, 68, 0.15)";
                              optBorder = "#ef4444";
                            }
                          } else if (isOptionSelected) {
                            optBg = "var(--bg-card-hover)";
                            optBorder = "var(--accent-cyan)";
                          }

                          return (
                            <button
                              key={optIdx}
                              style={{
                                textAlign: "left",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                backgroundColor: optBg,
                                border: `1px solid ${optBorder}`,
                                color: "var(--text-main)",
                                fontSize: "0.8rem",
                                cursor: quizSubmitted ? "default" : "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onClick={() => {
                                if (!quizSubmitted) {
                                  setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                                }
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div
                          style={{
                            fontSize: "0.76rem",
                            color: isCorrect ? "#22c55e" : "#ef4444",
                            backgroundColor: "var(--bg-card)",
                            padding: "8px",
                            borderRadius: "4px",
                          }}
                        >
                          <strong>{isCorrect ? "✓ Correct!" : "✗ Incorrect."}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}

                {quizSubmitted && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(6, 182, 212, 0.12)",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                      Score: {Object.entries(quizAnswers).filter(([qId, optIdx]) => {
                        const q = activeSelection.topic.assessment?.questions.find((item) => item.id === qId);
                        return q && q.correctIndex === optIdx;
                      }).length} / {activeSelection.topic.assessment.questions.length} Correct
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  {!quizSubmitted ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(quizAnswers).length < activeSelection.topic.assessment.questions.length}
                    >
                      Submit Quiz & Check Answers
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setQuizSubmitted(false);
                        setQuizAnswers({});
                      }}
                    >
                      <RotateCcw size={13} /> Retake Quiz
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. References & Notes */}
            {detailTab === "references" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Authoritative References List */}
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>
                    Authoritative Standards & References
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {activeSelection.topic.references.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "10px 14px",
                          borderRadius: "6px",
                          backgroundColor: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          textDecoration: "none",
                          color: "var(--text-main)",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "var(--accent-cyan-subtle, rgba(6, 182, 212, 0.15))",
                              color: "var(--accent-cyan)",
                            }}
                          >
                            {ref.publisher}
                          </span>
                          <span style={{ fontWeight: 600 }}>{ref.title}</span>
                        </div>
                        <ExternalLink size={13} color="var(--text-dim)" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Personal Notes Notepad */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Edit3 size={14} color="var(--accent-cyan)" />
                    <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>Personal Study Notes</span>
                  </div>
                  <textarea
                    placeholder="Record notes, payload tests, or key insights for this topic. Notes are automatically saved locally..."
                    value={userProgress.notes[activeSelection.topic.id] || ""}
                    onChange={(e) => updateNote(activeSelection.topic.id, e.target.value)}
                    rows={6}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    ✓ Auto-saved locally to your browser profile.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            Select a topic from the taxonomy tree to inspect its complete breakdown.
          </div>
        )}
      </div>
    </div>
  );
}
