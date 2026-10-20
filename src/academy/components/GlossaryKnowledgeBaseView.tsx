import { useState, useMemo } from "react";
import {
  BookA,
  Search,
  Sparkles,
  Copy,
  Check,
  Wrench
} from "lucide-react";
import { GLOSSARY_ENTRIES } from "../data/glossaryData";
import { GlossaryEntry } from "../types";

interface GlossaryKnowledgeBaseViewProps {
  onAskAiTutor?: (term: string) => void;
  onNavigateTool?: (toolId: string) => void;
}

export function GlossaryKnowledgeBaseView({
  onAskAiTutor,
  onNavigateTool,
}: GlossaryKnowledgeBaseViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTabPerTerm, setActiveTabPerTerm] = useState<Record<string, "english" | "hinglish" | "analogy" | "why">>({});
  const [copiedTermId, setCopiedTermId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "All Terms", count: GLOSSARY_ENTRIES.length },
    { id: "system", label: "Computers & Systems", count: GLOSSARY_ENTRIES.filter((e) => e.category === "system").length },
    { id: "networking", label: "Networking & Protocols", count: GLOSSARY_ENTRIES.filter((e) => e.category === "networking").length },
    { id: "web", label: "Web & Architecture", count: GLOSSARY_ENTRIES.filter((e) => e.category === "web").length },
    { id: "security", label: "Security & Defense", count: GLOSSARY_ENTRIES.filter((e) => e.category === "security").length },
    { id: "pentest", label: "Pentesting & Exploits", count: GLOSSARY_ENTRIES.filter((e) => e.category === "pentest").length },
    { id: "cryptography", label: "Cryptography", count: GLOSSARY_ENTRIES.filter((e) => e.category === "cryptography").length },
  ];

  const filteredEntries = useMemo(() => {
    return GLOSSARY_ENTRIES.filter((entry) => {
      const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        entry.term.toLowerCase().includes(q) ||
        (entry.fullForm && entry.fullForm.toLowerCase().includes(q)) ||
        entry.englishDefinition.toLowerCase().includes(q) ||
        entry.hinglishDefinition.toLowerCase().includes(q) ||
        entry.realWorldAnalogy.toLowerCase().includes(q) ||
        (entry.cwe && entry.cwe.toLowerCase().includes(q))
      );
    });
  }, [search, selectedCategory]);

  const handleCopy = (entry: GlossaryEntry) => {
    const text = `${entry.term}${entry.fullForm ? ` (${entry.fullForm})` : ""}\nDefinition: ${entry.englishDefinition}\nHinglish: ${entry.hinglishDefinition}\nAnalogy: ${entry.realWorldAnalogy}`;
    navigator.clipboard.writeText(text);
    setCopiedTermId(entry.id);
    setTimeout(() => setCopiedTermId(null), 2000);
  };

  const getActiveTab = (termId: string) => {
    return activeTabPerTerm[termId] || "english";
  };

  const setActiveTab = (termId: string, tab: "english" | "hinglish" | "analogy" | "why") => {
    setActiveTabPerTerm((prev) => ({ ...prev, [termId]: tab }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "20px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <BookA size={24} color="var(--accent-cyan)" />
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-main)", fontWeight: 600 }}>
              Glossary & Knowledge Base
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
              }}
            >
              Beginner-Friendly • English + Hinglish
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "700px" }}>
            Every foundational technical term explained from ground zero with its full form, clear English, conversational Hinglish (आसान भाषा में), everyday analogies, and why it exists in cybersecurity.
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "280px" }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search terms, full forms, concepts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              fontSize: "0.85rem",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              color: "var(--text-main)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`filter-chip ${selectedCategory === cat.id ? "active" : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "0.8rem",
            }}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.label}</span>
            <span
              style={{
                fontSize: "0.7rem",
                opacity: 0.8,
                backgroundColor: "var(--bg-primary)",
                padding: "1px 6px",
                borderRadius: "10px",
              }}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Entries Grid */}
      {filteredEntries.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <BookA size={40} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 6px", color: "var(--text-main)" }}>No matching terms found</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Try searching for another keyword or switch category filters.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredEntries.map((entry) => {
            const currentTab = getActiveTab(entry.id);
            return (
              <div
                key={entry.id}
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                {/* Term Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                        {entry.term}
                      </h3>
                      {entry.fullForm && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          ({entry.fullForm})
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {entry.category}
                      </span>
                      {entry.cwe && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "var(--accent-rose)",
                            fontWeight: 600,
                          }}
                        >
                          {entry.cwe}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(entry)}
                    title="Copy definition"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedTermId === entry.id ? "var(--accent-emerald)" : "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    {copiedTermId === entry.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Explanation Sub-Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    backgroundColor: "var(--bg-primary)",
                    padding: "3px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    onClick={() => setActiveTab(entry.id, "english")}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: currentTab === "english" ? "var(--bg-secondary)" : "transparent",
                      color: currentTab === "english" ? "var(--text-main)" : "var(--text-muted)",
                      fontWeight: currentTab === "english" ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setActiveTab(entry.id, "hinglish")}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: currentTab === "hinglish" ? "var(--bg-secondary)" : "transparent",
                      color: currentTab === "hinglish" ? "var(--accent-emerald)" : "var(--text-muted)",
                      fontWeight: currentTab === "hinglish" ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    आसान भाषा (Hinglish)
                  </button>
                  <button
                    onClick={() => setActiveTab(entry.id, "analogy")}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: currentTab === "analogy" ? "var(--bg-secondary)" : "transparent",
                      color: currentTab === "analogy" ? "var(--accent-amber)" : "var(--text-muted)",
                      fontWeight: currentTab === "analogy" ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    Analogy
                  </button>
                  <button
                    onClick={() => setActiveTab(entry.id, "why")}
                    style={{
                      flex: 1,
                      padding: "5px 8px",
                      fontSize: "0.75rem",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: currentTab === "why" ? "var(--bg-secondary)" : "transparent",
                      color: currentTab === "why" ? "var(--accent-purple)" : "var(--text-muted)",
                      fontWeight: currentTab === "why" ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    Why It Exists
                  </button>
                </div>

                {/* Content Box */}
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    minHeight: "80px",
                    fontSize: "0.85rem",
                    lineHeight: "1.5",
                  }}
                >
                  {currentTab === "english" && (
                    <div style={{ color: "var(--text-main)" }}>
                      {entry.englishDefinition}
                    </div>
                  )}

                  {currentTab === "hinglish" && (
                    <div style={{ color: "var(--text-main)" }}>
                      <span style={{ fontWeight: 600, color: "var(--accent-emerald)", marginRight: "6px" }}>
                        आसान व्याख्या:
                      </span>
                      {entry.hinglishDefinition}
                    </div>
                  )}

                  {currentTab === "analogy" && (
                    <div style={{ color: "var(--text-main)" }}>
                      <span style={{ fontWeight: 600, color: "var(--accent-amber)", marginRight: "6px" }}>
                        Everyday Analogy:
                      </span>
                      {entry.realWorldAnalogy}
                    </div>
                  )}

                  {currentTab === "why" && (
                    <div style={{ color: "var(--text-main)" }}>
                      <span style={{ fontWeight: 600, color: "var(--accent-purple)", marginRight: "6px" }}>
                        Why It Was Created:
                      </span>
                      {entry.whyItExists}
                    </div>
                  )}
                </div>

                {/* Footer Meta & Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    paddingTop: "6px",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {entry.relatedTerms?.map((rt) => (
                      <span
                        key={rt}
                        onClick={() => setSearch(rt)}
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--accent-cyan)",
                          cursor: "pointer",
                          backgroundColor: "var(--bg-primary)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        #{rt}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {entry.relatedTools && onNavigateTool && entry.relatedTools.map((tool) => (
                      <button
                        key={tool}
                        onClick={() => onNavigateTool(tool)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.72rem",
                          padding: "3px 6px",
                          backgroundColor: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          color: "var(--accent-emerald)",
                          cursor: "pointer",
                        }}
                      >
                        <Wrench size={11} /> {tool}
                      </button>
                    ))}

                    {onAskAiTutor && (
                      <button
                        onClick={() => onAskAiTutor(`Explain the cybersecurity concept '${entry.term}' in detail with simple examples and Hinglish context.`)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          color: "var(--accent-cyan)",
                          cursor: "pointer",
                        }}
                      >
                        <Sparkles size={12} />
                        Ask AI Tutor
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
