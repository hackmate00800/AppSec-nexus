import { useState, useMemo } from "react";
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Layout,
  Type,
  Sliders,
  Sun,
  Moon,
  Eye,
  Download,
  Upload,
  Plus,
  Trash2,
  Shield,
  Search,
  FileJson,
  X,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { InfoButton } from "./ui/design_system";
import { BUILT_IN_ACCENTS } from "../theme/themes";
import { ThemeId, AccentId, FontScale, ThemeCategory, ThemeDefinition } from "../theme/types";
import { useToast } from "./ui/Toast";
import { getContrastRatio, getContrastCompliance, isValidHexColor } from "../theme/contrast";

export function AppearanceSettings() {
  const {
    preferences,
    allThemes,
    previewThemeId,
    activeThemeDef,
    setTheme,
    previewTheme,
    applyPreview,
    cancelPreview,
    setAccent,
    setDensity,
    setSidebarMode,
    setReducedMotion,
    setFontScale,
    resetPreferences,
    saveCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
  } = useTheme();

  const { addToast } = useToast();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>("all");

  // Modal dialog states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [showImportExport, setShowImportExport] = useState<"import" | "export" | null>(null);
  const [importJsonText, setImportJsonText] = useState("");
  const [exportThemeId, setExportThemeId] = useState<ThemeId>(preferences.theme);

  // New Custom Theme draft state
  const [draftTheme, setDraftTheme] = useState<ThemeDefinition>({
    id: `custom-${Date.now().toString(36)}`,
    name: "Custom Theme",
    description: "Custom user-defined security palette",
    category: "custom",
    isDark: true,
    isCustom: true,
    colors: {
      bgPrimary: "#0b0f19",
      bgSecondary: "#111827",
      bgCard: "#1f2937",
      bgCardHover: "#283548",
      borderColor: "#374151",
      borderAccent: "#06b6d4",
      textMain: "#f9fafb",
      textMuted: "#9ca3af",
      textDim: "#6b7280",
    },
  });

  // Filtered themes list
  const filteredThemes = useMemo(() => {
    return allThemes.filter((t) => {
      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "custom") {
          if (!t.isCustom && t.category !== "custom") return false;
        } else if (selectedCategory === "dark") {
          if (!t.isDark) return false;
        } else if (selectedCategory === "light") {
          if (t.isDark) return false;
        } else if (t.category !== selectedCategory && !t.tags?.includes(selectedCategory)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesId) return false;
      }

      return true;
    });
  }, [allThemes, selectedCategory, searchQuery]);

  // Contrast check for custom theme editor
  const contrastStats = useMemo(() => {
    const cardRatio = getContrastRatio(draftTheme.colors.textMain, draftTheme.colors.bgCard);
    const primaryRatio = getContrastRatio(draftTheme.colors.textMain, draftTheme.colors.bgPrimary);
    const cardCompliance = getContrastCompliance(cardRatio);
    const primaryCompliance = getContrastCompliance(primaryRatio);

    return {
      cardRatio,
      cardCompliance,
      primaryRatio,
      primaryCompliance,
    };
  }, [draftTheme]);

  function handleReset() {
    resetPreferences();
    setShowResetConfirm(false);
    addToast({
      type: "success",
      title: "Preferences Reset",
      description: "Default theme and layout preferences restored successfully.",
    });
  }

  function handleSaveDraftTheme() {
    if (!draftTheme.name.trim()) {
      addToast({
        type: "error",
        title: "Validation Error",
        description: "Please provide a valid name for your custom theme.",
      });
      return;
    }

    saveCustomTheme({
      ...draftTheme,
      name: draftTheme.name.trim(),
      description: draftTheme.description.trim() || "User defined custom palette",
    });

    setShowCustomEditor(false);
    addToast({
      type: "success",
      title: "Custom Theme Saved",
      description: `Theme "${draftTheme.name}" was saved and applied.`,
    });
  }

  function handleImportSubmit() {
    const res = importTheme(importJsonText);
    if (!res.success) {
      addToast({
        type: "error",
        title: "Import Failed",
        description: res.error || "Could not parse or validate theme JSON.",
      });
      return;
    }

    setShowImportExport(null);
    setImportJsonText("");
    addToast({
      type: "success",
      title: "Theme Imported",
      description: "Custom theme imported and applied successfully.",
    });
  }

  function handleCopyExportJson() {
    const jsonStr = exportTheme(exportThemeId);
    navigator.clipboard.writeText(jsonStr);
    addToast({
      type: "info",
      title: "JSON Copied",
      description: "Theme JSON definition copied to clipboard.",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1080px" }}>
      {/* =========================================================================
          LIVE PREVIEW STICKY BANNER
          ========================================================================= */}
      {previewThemeId && (
        <div className="theme-preview-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "var(--accent-primary-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-cyan)",
              }}
            >
              <Eye size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Previewing Theme: {activeThemeDef.name}</span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {activeThemeDef.isDark ? "Dark" : "Light"} • {activeThemeDef.category}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Changes are applied live. Click "Apply Theme" to keep it, or "Cancel" to restore previous styling.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="btn btn-secondary" onClick={cancelPreview}>
              Cancel Preview
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                applyPreview();
                addToast({
                  type: "success",
                  title: `Theme Applied: ${activeThemeDef.name}`,
                  description: "Your workspace theme preference has been saved.",
                });
              }}
            >
              <Check size={14} /> Apply Theme
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          HEADER & ACTIONS
          ========================================================================= */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <Palette size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
              Appearance & Personalization
            </h2>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
            VS Code-inspired theme engine with 16 developer presets, live preview, accessible contrast validation, and JSON theme import/export.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setExportThemeId(preferences.theme);
              setShowImportExport("export");
            }}
            title="Export active theme to JSON"
          >
            <Download size={14} /> Export JSON
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setImportJsonText("");
              setShowImportExport("import");
            }}
            title="Import custom theme from JSON"
          >
            <Upload size={14} /> Import JSON
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setDraftTheme({
                id: `custom-${Date.now().toString(36)}`,
                name: "My Custom Theme",
                description: "Custom user-crafted security theme",
                category: "custom",
                isDark: true,
                isCustom: true,
                colors: { ...activeThemeDef.colors },
              });
              setShowCustomEditor(true);
            }}
          >
            <Plus size={14} /> Custom Theme
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowResetConfirm(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
        </div>
      </div>

      {/* =========================================================================
          1. THEME EXPLORER & PRESET CATALOG
          ========================================================================= */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Sparkles size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
                Theme Selector ({allThemes.length} Available)
              </h3>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Click any theme to preview live. Choose from dark developer palettes, clean light modes, and SOC security themes.
            </p>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", minWidth: "240px" }}>
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
              placeholder="Filter themes (e.g. Dracula, Nordic, SOC)..."
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
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {(["all", "dark", "light", "security", "minimal", "colorful", "developer", "custom"] as ThemeCategory[]).map((cat) => {
            const getCount = (category: ThemeCategory) => {
              if (category === "all") return allThemes.length;
              if (category === "dark") return allThemes.filter((t) => t.isDark).length;
              if (category === "light") return allThemes.filter((t) => !t.isDark).length;
              if (category === "custom") return allThemes.filter((t) => t.isCustom || t.category === "custom").length;
              return allThemes.filter((t) => t.category === category || t.tags?.includes(category)).length;
            };

            const labels: Record<ThemeCategory, string> = {
              all: `All Themes (${getCount("all")})`,
              dark: `Dark Themes (${getCount("dark")})`,
              light: `Light Themes (${getCount("light")})`,
              security: `Security / SOC (${getCount("security")})`,
              minimal: `Minimal (${getCount("minimal")})`,
              colorful: `Colorful (${getCount("colorful")})`,
              developer: `Developer (${getCount("developer")})`,
              custom: `Custom (${getCount("custom")})`,
            };

            return (
              <button
                key={cat}
                className={`theme-category-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>

        {/* Theme Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {filteredThemes.map((t) => {
            const isApplied = preferences.theme === t.id && !previewThemeId;
            const isPreviewing = previewThemeId === t.id;
            const isSelectedCard = isApplied || isPreviewing;

            return (
              <div
                key={t.id}
                style={{
                  borderRadius: "10px",
                  border: isSelectedCard
                    ? "2px solid var(--accent-cyan)"
                    : "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.15s ease",
                  boxShadow: isSelectedCard ? "0 0 18px var(--accent-primary-subtle)" : "none",
                }}
              >
                {/* Visual miniature preview representing the real application UI: sidebar, header, metric cards, chart, and table */}
                <div
                  style={{
                    height: "136px",
                    backgroundColor: t.colors.bgPrimary,
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    borderBottom: `1px solid ${t.colors.borderColor}`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Top mini header */}
                  <div
                    style={{
                      height: "16px",
                      backgroundColor: t.colors.bgSecondary,
                      border: `1px solid ${t.colors.borderColor}`,
                      borderRadius: "3px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: t.colors.borderAccent || "#06b6d4" }} />
                      <div style={{ height: "4px", width: "32px", backgroundColor: t.colors.textMain, borderRadius: "2px", opacity: 0.8 }} />
                    </div>
                    <div style={{ height: "6px", width: "45px", backgroundColor: t.colors.bgCard, border: `1px solid ${t.colors.borderColor}`, borderRadius: "2px" }} />
                  </div>

                  {/* Body with sidebar + workspace */}
                  <div style={{ flex: 1, display: "flex", gap: "6px", minHeight: 0 }}>
                    {/* Miniature Sidebar */}
                    <div
                      style={{
                        width: "36px",
                        backgroundColor: t.colors.bgSecondary,
                        borderRadius: "3px",
                        border: `1px solid ${t.colors.borderColor}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        padding: "4px 3px",
                      }}
                    >
                      <div style={{ height: "5px", width: "100%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "2px" }} />
                      <div style={{ height: "4px", width: "80%", backgroundColor: t.colors.borderColor, borderRadius: "2px" }} />
                      <div style={{ height: "4px", width: "70%", backgroundColor: t.colors.borderColor, borderRadius: "2px" }} />
                      <div style={{ height: "4px", width: "85%", backgroundColor: t.colors.borderColor, borderRadius: "2px" }} />
                    </div>

                    {/* Miniature Workspace */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
                      {/* Metric Cards Row */}
                      <div style={{ display: "flex", gap: "4px" }}>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: t.colors.bgCard,
                            border: `1px solid ${t.colors.borderColor}`,
                            borderRadius: t.colors.cardRadius || "3px",
                            padding: "3px 5px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ height: "3px", width: "24px", backgroundColor: t.colors.textMuted, borderRadius: "1px" }} />
                          <div style={{ height: "5px", width: "10px", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            backgroundColor: t.colors.bgCard,
                            border: `1px solid ${t.colors.borderColor}`,
                            borderRadius: t.colors.cardRadius || "3px",
                            padding: "3px 5px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ height: "3px", width: "20px", backgroundColor: t.colors.textMuted, borderRadius: "1px" }} />
                          <div style={{ height: "5px", width: "8px", backgroundColor: "#ef4444", borderRadius: "1px" }} />
                        </div>
                      </div>

                      {/* Mini Chart Row */}
                      <div
                        style={{
                          height: "30px",
                          backgroundColor: t.colors.bgCard,
                          border: `1px solid ${t.colors.borderColor}`,
                          borderRadius: t.colors.cardRadius || "3px",
                          padding: "2px 4px",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "space-between",
                          gap: "3px",
                        }}
                      >
                        <div style={{ height: "40%", width: "12%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                        <div style={{ height: "70%", width: "12%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                        <div style={{ height: "55%", width: "12%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                        <div style={{ height: "90%", width: "12%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                        <div style={{ height: "65%", width: "12%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                        <div style={{ height: "80%", width: "12%", backgroundColor: t.colors.borderAccent || "#06b6d4", borderRadius: "1px" }} />
                      </div>

                      {/* Mini Table Rows */}
                      <div
                        style={{
                          backgroundColor: t.colors.bgCardHover || t.colors.bgCard,
                          border: `1px solid ${t.colors.borderColor}`,
                          borderRadius: "2px",
                          padding: "2px 4px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ height: "3px", width: "45%", backgroundColor: t.colors.textMain, borderRadius: "1px" }} />
                          <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ height: "3px", width: "55%", backgroundColor: t.colors.textMuted, borderRadius: "1px" }} />
                          <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pill badge showing Dark / Light */}
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(0, 0, 0, 0.45)",
                      backdropFilter: "blur(4px)",
                      fontSize: "0.68rem",
                      color: "#ffffff",
                    }}
                  >
                    {t.isDark ? <Moon size={10} /> : <Sun size={10} color="#f59e0b" />}
                    <span>{t.isDark ? "Dark" : "Light"}</span>
                  </div>
                </div>

                {/* Theme metadata & color swatches */}
                <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{t.name}</span>
                        {t.isCustom && (
                          <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "3px", backgroundColor: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                            Custom
                          </span>
                        )}
                        {t.category === "security" && (
                          <Shield size={12} color="#10b981" />
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px", lineHeight: "1.3" }}>
                        {t.description}
                      </div>
                    </div>

                    {isApplied && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "var(--accent-primary-subtle)",
                          color: "var(--accent-primary)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        <Check size={12} strokeWidth={3} /> Active
                      </span>
                    )}

                    {isPreviewing && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        <Eye size={12} /> Previewing
                      </span>
                    )}
                  </div>

                  {/* Multi-color palette swatch strip */}
                  <div className="theme-swatch-bar">
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.bgPrimary }} title={`bgPrimary: ${t.colors.bgPrimary}`} />
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.bgSecondary }} title={`bgSecondary: ${t.colors.bgSecondary}`} />
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.bgCard }} title={`bgCard: ${t.colors.bgCard}`} />
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.borderColor }} title={`borderColor: ${t.colors.borderColor}`} />
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.borderAccent }} title={`borderAccent: ${t.colors.borderAccent}`} />
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.textMain }} title={`textMain: ${t.colors.textMain}`} />
                    <div className="theme-swatch-cell" style={{ backgroundColor: t.colors.textMuted }} title={`textMuted: ${t.colors.textMuted}`} />
                  </div>

                  {/* Action buttons */}
                  <div style={{ marginTop: "auto", display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                    {isApplied ? (
                      <button
                        className="btn btn-secondary"
                        disabled
                        style={{ flex: 1, justifyContent: "center", opacity: 0.7, cursor: "default", fontSize: "0.78rem" }}
                      >
                        <Check size={12} /> Applied
                      </button>
                    ) : (
                      <>
                        <button
                          className={`btn ${isPreviewing ? "btn-primary" : "btn-secondary"}`}
                          style={{ flex: 1, justifyContent: "center", fontSize: "0.78rem" }}
                          onClick={() => {
                            if (isPreviewing) {
                              applyPreview();
                              addToast({
                                type: "success",
                                title: `Theme Applied: ${t.name}`,
                                description: `Workspace switched to ${t.name}.`,
                              });
                            } else {
                              previewTheme(t.id);
                            }
                          }}
                        >
                          {isPreviewing ? <Check size={12} /> : <Eye size={12} />}
                          {isPreviewing ? "Keep Theme" : "Preview"}
                        </button>

                        <button
                          className="btn btn-primary"
                          style={{ flex: 1, justifyContent: "center", fontSize: "0.78rem" }}
                          onClick={() => {
                            setTheme(t.id);
                            addToast({
                              type: "success",
                              title: `Theme Applied: ${t.name}`,
                              description: `Workspace switched to ${t.name}.`,
                            });
                          }}
                        >
                          Apply
                        </button>
                      </>
                    )}

                    {t.isCustom && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: "6px 8px" }}
                        title="Delete custom theme"
                        onClick={() => {
                          deleteCustomTheme(t.id);
                          addToast({
                            type: "info",
                            title: "Custom Theme Deleted",
                            description: `Theme "${t.name}" was removed.`,
                          });
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          2. ACCENT COLOR PALETTE
          ========================================================================= */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Sliders size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
            Accent Color
          </h3>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
          Personalize active links, indicators, primary buttons, and visual highlights across all views.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {(Object.keys(BUILT_IN_ACCENTS) as AccentId[]).map((accentKey) => {
            const acc = BUILT_IN_ACCENTS[accentKey];
            const isSelected = preferences.accent === accentKey;

            return (
              <button
                key={accentKey}
                onClick={() => setAccent(accentKey)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: isSelected ? `2px solid ${acc.hex}` : "1px solid var(--border-color)",
                  backgroundColor: isSelected ? acc.subtleHex : "var(--bg-secondary)",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    backgroundColor: acc.hex,
                    boxShadow: `0 0 8px ${acc.hex}`,
                  }}
                />
                <span>{acc.name}</span>
                {isSelected && <Check size={14} color={acc.hex} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          3. LAYOUT & INTERFACE DENSITY
          ========================================================================= */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Layout size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
            Layout & Interface Density
          </h3>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
          Control sidebar behavior and data density for high-information security workflows.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {/* Interface Density */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "8px" }}>
              Information Density
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`btn ${preferences.density === "comfortable" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setDensity("comfortable")}
              >
                Comfortable (Spacious)
              </button>
              <button
                className={`btn ${preferences.density === "compact" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setDensity("compact")}
              >
                Compact (High Density)
              </button>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
              Compact density optimizes row height for inspecting large finding catalogs.
            </span>
          </div>

          {/* Sidebar Mode */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "8px" }}>
              Sidebar Navigation Mode
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`btn ${preferences.sidebarMode === "expanded" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setSidebarMode("expanded")}
              >
                Expanded (Full Labels)
              </button>
              <button
                className={`btn ${preferences.sidebarMode === "compact" ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setSidebarMode("compact")}
              >
                Icon-Only (Tooltips)
              </button>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
              Icon-only sidebar expands available horizontal width for wide terminal logs.
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. TYPOGRAPHY & ACCESSIBILITY
          ========================================================================= */}
      <section className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Type size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
            Typography & Accessibility
          </h3>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
          Configure text scaling and motion preferences for comfortable long-duration review.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {/* Font Scale */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "8px" }}>
              Base Font Size Scale
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["sm", "md", "lg"] as FontScale[]).map((scale) => {
                const labels = { sm: "Compact (13px)", md: "Default (14px)", lg: "Large (15px)" };
                const isSelected = preferences.fontScale === scale;
                return (
                  <button
                    key={scale}
                    className={`btn ${isSelected ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1, justifyContent: "center", fontSize: "0.8rem" }}
                    onClick={() => setFontScale(scale)}
                  >
                    {labels[scale]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reduced Motion */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "8px" }}>
              Animation & Transitions
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={`btn ${!preferences.reducedMotion ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setReducedMotion(false)}
              >
                Smooth Motion
              </button>
              <button
                className={`btn ${preferences.reducedMotion ? "btn-primary" : "btn-secondary"}`}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setReducedMotion(true)}
              >
                Reduced Motion
              </button>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px", display: "block" }}>
              Disables subtle transitions and pulses for accessibility and battery efficiency.
            </span>
          </div>
        </div>

      {/* =========================================================================
          SECTION: LIVE APPEARANCE PREVIEW (Phase 5 C)
          ========================================================================= */}
      <section className="card" style={{ marginTop: "24px" }} data-testid="appearance-live-preview">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Eye size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
              Live Appearance Preview
            </h3>
            <InfoButton
              title="Live Theme & Typography Preview"
              description="Demonstrates how headings, body text, sidebar controls, buttons, inputs, and information tooltips render with the currently active theme, accent, and font scale."
              whyItMatters="Allows immediate verification of contrast, readability, and visual hierarchy without having to navigate between different application screens."
            />
          </div>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
            Palette: {activeThemeDef.id} ({activeThemeDef.isDark ? "Dark" : "Light"}) • Scale: {preferences.fontScale.toUpperCase()} • Density: {preferences.density}
          </span>
        </div>

        <div
          style={{
            padding: "18px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Sample Content Block: Heading & Body */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.05em" }}>
              Typography & Hierarchy
            </span>
            <h4 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
              Critical Security Finding: CWE-89 SQL Injection
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              Unsanitized user parameters passed to dynamic query constructors allow attackers to extract database tables, bypass authentication, and escalate privileges.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="badge badge-critical" style={{ fontSize: "0.72rem" }}>Critical Severity</span>
              <span className="badge badge-locked" style={{ fontSize: "0.72rem" }}>Validated Canary</span>
            </div>
          </div>

          {/* Sample UI Controls: Sidebar Item, Button, Input & Tooltip */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.05em" }}>
              Interactive Components
            </span>

            {/* Mock Sidebar Item */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: "var(--accent-primary-subtle)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                color: "var(--accent-primary)",
                fontWeight: 600,
                fontSize: "0.82rem",
              }}
            >
              <Shield size={15} />
              <span>Web Pentesting Workbench</span>
              <span style={{ marginLeft: "auto", fontSize: "0.7rem", backgroundColor: "var(--bg-card)", padding: "2px 6px", borderRadius: "4px" }}>
                Active
              </span>
            </div>

            {/* Mock Form Input */}
            <div>
              <input
                type="text"
                readOnly
                value="https://target.corp.internal/api/v1/auth"
                placeholder="Enter target URL..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-main)",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            {/* Mock Buttons with Info Tooltip */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                <Sparkles size={13} /> Launch Validation
              </button>
              <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
                Cancel
              </button>
              <InfoButton
                title="Validation Canary Engine"
                description="Sends non-destructive out-of-band canary payloads to verify vulnerability exploitability without causing service interruption."
              />
            </div>
          </div>
        </div>
      </section>

      </section>

      {/* =========================================================================
          MODAL: CUSTOM THEME CREATOR / EDITOR
          ========================================================================= */}
      {showCustomEditor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10002,
            padding: "20px",
          }}
          onClick={() => setShowCustomEditor(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "640px", width: "100%", maxHeight: "90vh", overflowY: "auto", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Palette size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                  Custom Theme Studio
                </h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setShowCustomEditor(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              Customize surface tokens and contrast values. Real-time WCAG compliance is evaluated as you edit.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Theme Name & Dark/Light Toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                    Theme Name
                  </label>
                  <input
                    type="text"
                    value={draftTheme.name}
                    onChange={(e) => setDraftTheme({ ...draftTheme, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                    Color Mode
                  </label>
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", justifyContent: "center", gap: "6px" }}
                    onClick={() => setDraftTheme({ ...draftTheme, isDark: !draftTheme.isDark })}
                  >
                    {draftTheme.isDark ? <Moon size={14} /> : <Sun size={14} color="#f59e0b" />}
                    <span>{draftTheme.isDark ? "Dark" : "Light"}</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "4px" }}>
                  Description
                </label>
                <input
                  type="text"
                  value={draftTheme.description}
                  onChange={(e) => setDraftTheme({ ...draftTheme, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              {/* Color Token Controls */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                <h4 style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: "12px" }}>
                  Design Tokens (Hex Colors)
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                  {(
                    [
                      { key: "bgPrimary", label: "Primary Background", desc: "Main page canvas" },
                      { key: "bgSecondary", label: "Secondary Background", desc: "Sidebar and toolbars" },
                      { key: "bgCard", label: "Card Surface", desc: "Cards, panels & modals" },
                      { key: "borderColor", label: "Border Color", desc: "Dividers & card outlines" },
                      { key: "borderAccent", label: "Accent Border", desc: "Focused element outlines" },
                      { key: "textMain", label: "Main Text", desc: "Primary titles and content" },
                      { key: "textMuted", label: "Muted Text", desc: "Secondary descriptions" },
                      { key: "textDim", label: "Dim Text", desc: "Timestamps and badges" },
                    ] as const
                  ).map(({ key, label, desc }) => {
                    const currentVal = draftTheme.colors[key];
                    const isValValid = isValidHexColor(currentVal);

                    return (
                      <div
                        key={key}
                        style={{
                          padding: "10px",
                          borderRadius: "6px",
                          backgroundColor: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>
                            {label}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                            {desc}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="color"
                            value={isValValid && currentVal.length === 7 ? currentVal : "#000000"}
                            onChange={(e) =>
                              setDraftTheme({
                                ...draftTheme,
                                colors: { ...draftTheme.colors, [key]: e.target.value },
                              })
                            }
                            style={{
                              width: "36px",
                              height: "32px",
                              borderRadius: "4px",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              backgroundColor: "transparent",
                            }}
                          />
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) =>
                              setDraftTheme({
                                ...draftTheme,
                                colors: { ...draftTheme.colors, [key]: e.target.value },
                              })
                            }
                            style={{
                              flex: 1,
                              padding: "6px 10px",
                              borderRadius: "4px",
                              border: isValValid ? "1px solid var(--border-color)" : "1px solid var(--accent-rose)",
                              backgroundColor: "var(--bg-primary)",
                              color: "var(--text-main)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.8rem",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-Time WCAG Contrast Compliance Bar */}
              <div
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  marginTop: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Shield size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>
                    WCAG Accessibility Evaluation
                  </span>
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Text on Canvas: </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: contrastStats.primaryCompliance.color,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {contrastStats.primaryRatio}:1 ({contrastStats.primaryCompliance.label})
                    </span>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Text on Card: </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: contrastStats.cardCompliance.color,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {contrastStats.cardRatio}:1 ({contrastStats.cardCompliance.label})
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="btn btn-secondary" onClick={() => setShowCustomEditor(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveDraftTheme}>
                  <Check size={14} /> Save & Apply Custom Theme
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: JSON IMPORT / EXPORT
          ========================================================================= */}
      {showImportExport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10002,
            padding: "20px",
          }}
          onClick={() => setShowImportExport(null)}
        >
          <div
            className="card"
            style={{ maxWidth: "560px", width: "100%", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileJson size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                  {showImportExport === "import" ? "Import Theme JSON" : "Export Theme JSON"}
                </h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setShowImportExport(null)}>
                <X size={16} />
              </button>
            </div>

            {showImportExport === "import" ? (
              <div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                  Paste valid AppSec theme JSON. Colors and schema are validated before application.
                </p>
                <textarea
                  rows={10}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`{\n  "name": "Custom Glow",\n  "description": "High contrast security palette",\n  "isDark": true,\n  "colors": {\n    "bgPrimary": "#090d16",\n    "bgSecondary": "#0f172a",\n    "bgCard": "#141e33",\n    "bgCardHover": "#1a2744",\n    "borderColor": "#1e293b",\n    "borderAccent": "#334155",\n    "textMain": "#f8fafc",\n    "textMuted": "#94a3b8",\n    "textDim": "#64748b"\n  }\n}`}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                    marginBottom: "16px",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowImportExport(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleImportSubmit}>
                    <Upload size={14} /> Validate & Import
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Select Theme to Export
                  </label>
                  <select
                    value={exportThemeId}
                    onChange={(e) => setExportThemeId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      marginBottom: "12px",
                    }}
                  >
                    {allThemes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  readOnly
                  rows={10}
                  value={exportTheme(exportThemeId)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-main)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.8rem",
                    marginBottom: "16px",
                    resize: "vertical",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button className="btn btn-secondary" onClick={() => setShowImportExport(null)}>
                    Close
                  </button>
                  <button className="btn btn-primary" onClick={handleCopyExportJson}>
                    <Download size={14} /> Copy JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RESET PREFERENCES CONFIRMATION
          ========================================================================= */}
      {showResetConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "420px", width: "90%", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" style={{ color: "var(--accent-amber)" }}>
              <RotateCcw size={18} /> Reset All Preferences?
            </div>
            <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              This will restore the factory default Midnight Abyss theme, AppSec Cyan accent, comfortable layout density, and default font size.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleReset}>
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
