import React, { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  X,
  Play,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useTour } from "../../context/TourContext";
import { HELP_ARTICLES } from "../../help/helpArticlesData";
import { HelpArticle } from "../../types/tour";
import { InvertedIndex, LRUCache } from "../../utils/securityDsa";

// Pre-index static help articles into an Inverted Index for fast search
const helpArticleIndex = new InvertedIndex<HelpArticle>();
for (let i = 0; i < HELP_ARTICLES.length; i++) {
  helpArticleIndex.addDocument(HELP_ARTICLES[i], ["title", "summary", "category", "stepByStep"]);
}
const helpSearchCache = new LRUCache<string, Set<string>>(64);

export const HelpCenterModal: React.FC = () => {
  const {
    isHelpCenterOpen,
    closeHelpCenter,
    selectedArticleId,
    startTour,
    explanationMode,
    setExplanationMode,
    onNavigateTab,
  } = useTour();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [currentArticleId, setCurrentArticleId] = useState<string>(
    selectedArticleId || HELP_ARTICLES[0].id
  );

  // Sync selectedArticleId when prop changes
  React.useEffect(() => {
    if (selectedArticleId) {
      setCurrentArticleId(selectedArticleId);
    }
  }, [selectedArticleId]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(HELP_ARTICLES.map((a) => a.category));
    return ["ALL", ...Array.from(set)];
  }, []);

  // Filter articles based on category and search query using InvertedIndex & LRU Cache
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let matchingIds: Set<string> | null = null;

    if (q) {
      const cached = helpSearchCache.get(q);
      if (cached) {
        matchingIds = cached;
      } else {
        const matches = helpArticleIndex.search(q);
        matchingIds = new Set(matches.map((m) => m.id));
        helpSearchCache.put(q, matchingIds);
      }
    }

    return HELP_ARTICLES.filter((a) => {
      const matchCat = activeCategory === "ALL" || a.category === activeCategory;
      const matchQuery = matchingIds === null || matchingIds.has(a.id);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const activeArticle = useMemo<HelpArticle>(() => {
    return (
      HELP_ARTICLES.find((a) => a.id === currentArticleId) ||
      filteredArticles[0] ||
      HELP_ARTICLES[0]
    );
  }, [currentArticleId, filteredArticles]);

  if (!isHelpCenterOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl h-[86vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                AppSec Nexus Help Center & Knowledgebase
              </h2>
              <p className="text-[11px] text-slate-400">
                Official documentation, troubleshooting, and guided security workflows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">Explanation:</span>
              <button
                onClick={() => setExplanationMode("beginner")}
                className={`text-[11px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                  explanationMode === "beginner"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Beginner
              </button>
              <button
                onClick={() => setExplanationMode("advanced")}
                className={`text-[11px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                  explanationMode === "advanced"
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Advanced
              </button>
            </div>

            <button
              onClick={closeHelpCenter}
              title="Close Help Center (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Category Pills Bar */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search help articles, tools, CWEs, errors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Quick Tour Trigger */}
          <button
            onClick={() => {
              closeHelpCenter();
              startTour("welcome");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/40 transition-colors flex-shrink-0"
          >
            <Play size={12} />
            <span>Take Product Tour</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-5 py-2 border-b border-slate-800/80 bg-slate-950/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors flex-shrink-0 ${
                activeCategory === cat
                  ? "bg-sky-500 text-slate-950 font-semibold"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Split View: Article List (Left) + Article Body (Right) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Article List */}
          <div className="w-full md:w-80 border-r border-slate-800 overflow-y-auto p-3 space-y-1.5 bg-slate-950/40 flex-shrink-0">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                No matching articles found.
              </div>
            ) : (
              filteredArticles.map((article) => {
                const isSelected = article.id === activeArticle?.id;
                return (
                  <button
                    key={article.id}
                    onClick={() => setCurrentArticleId(article.id)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-sky-950/50 border-sky-500/50 text-sky-300 shadow-sm"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="text-[10px] uppercase font-mono text-slate-500 mb-0.5">
                      {article.category}
                    </div>
                    <div className="text-xs font-semibold leading-tight mb-1 truncate">
                      {article.title}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">
                      {article.summary}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Article Details */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 bg-slate-900">
            {activeArticle ? (
              <>
                {/* Article Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-full">
                      {activeArticle.category}
                    </span>
                  </div>
                  <h1 className="text-base font-bold text-slate-100 mb-2">
                    {activeArticle.title}
                  </h1>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeArticle.summary}
                  </p>
                </div>

                {/* Explanation Mode Content */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 mb-1.5">
                    <HelpCircle size={13} />
                    <span>
                      {explanationMode === "beginner" ? "Conceptual Explanation" : "Technical Mechanics"}
                    </span>
                  </div>
                  <p>
                    {explanationMode === "beginner"
                      ? activeArticle.beginnerText || activeArticle.summary
                      : activeArticle.advancedText || activeArticle.summary}
                  </p>
                </div>

                {/* Prerequisites */}
                {activeArticle.prerequisites && activeArticle.prerequisites.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Prerequisites
                    </h3>
                    <ul className="space-y-1">
                      {activeArticle.prerequisites.map((p, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step-by-Step Instructions */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Step-by-Step Instructions
                  </h3>
                  <div className="space-y-2">
                    {activeArticle.stepByStep.map((step, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected Output */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Expected Output
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-emerald-500/30 text-xs text-emerald-300/90 font-mono">
                    {activeArticle.expectedOutput}
                  </div>
                </div>

                {/* Troubleshooting */}
                {activeArticle.troubleshooting && activeArticle.troubleshooting.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-400" />
                      Troubleshooting & Edge Cases
                    </h3>
                    <ul className="space-y-1.5">
                      {activeArticle.troubleshooting.map((item, i) => (
                        <li key={i} className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Footer: Jump to Feature & Launch Tour */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {activeArticle.relatedFeatures && activeArticle.relatedFeatures.length > 0 && (
                      <button
                        onClick={() => {
                          const tab = activeArticle.relatedFeatures[0];
                          closeHelpCenter();
                          if (onNavigateTab && tab) {
                            onNavigateTab(tab as any);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors"
                      >
                        <span>Open Feature ({activeArticle.relatedFeatures[0]})</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      closeHelpCenter();
                      startTour(activeArticle.id.includes("target") ? "targets" : "welcome");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
                  >
                    <Play size={12} />
                    <span>Start Interactive Tour</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
