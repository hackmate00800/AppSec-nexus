import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  ThemeId,
  AccentId,
  Density,
  SidebarMode,
  FontScale,
  UserPreferences,
  ThemeDefinition,
} from "./types";
import {
  BUILT_IN_THEMES,
  BUILT_IN_ACCENTS,
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  validateAndSanitizeThemeJson,
} from "./themes";

export interface ThemeContextType {
  preferences: UserPreferences;
  allThemes: ThemeDefinition[];
  previewThemeId: ThemeId | null;
  activeThemeDef: ThemeDefinition;
  setTheme: (theme: ThemeId) => void;
  previewTheme: (theme: ThemeId) => void;
  applyPreview: () => void;
  cancelPreview: () => void;
  setAccent: (accent: AccentId) => void;
  setDensity: (density: Density) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  toggleSidebarMode: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setFontScale: (scale: FontScale) => void;
  setDefaultTab: (tab: string) => void;
  resetPreferences: () => void;
  saveCustomTheme: (theme: ThemeDefinition) => void;
  deleteCustomTheme: (themeId: string) => void;
  exportTheme: (themeId: ThemeId) => string;
  importTheme: (jsonStr: string) => { success: boolean; themeId?: string; error?: string };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          customThemes: Array.isArray(parsed.customThemes) ? parsed.customThemes : [],
        };
      }
    } catch (e) {
      console.warn("Failed to read user preferences from localStorage:", e);
    }
    return DEFAULT_PREFERENCES;
  });

  // Ephemeral live-preview state (not saved to localStorage until applied)
  const [previewThemeId, setPreviewThemeId] = useState<ThemeId | null>(null);

  // Combine built-in themes with custom user themes
  const allThemes = useMemo<ThemeDefinition[]>(() => {
    const list = Object.values(BUILT_IN_THEMES);
    if (preferences.customThemes && preferences.customThemes.length > 0) {
      return [...list, ...preferences.customThemes];
    }
    return list;
  }, [preferences.customThemes]);

  // Lookup active or previewed theme definition
  const activeThemeDef = useMemo<ThemeDefinition>(() => {
    const targetId = previewThemeId || preferences.theme;
    const found = allThemes.find((t) => t.id === targetId);
    if (found) return found;
    return BUILT_IN_THEMES[targetId] || BUILT_IN_THEMES.midnight;
  }, [previewThemeId, preferences.theme, allThemes]);

  // Apply theme attributes and CSS variables to <html> document root
  useEffect(() => {
    try {
      const root = document.documentElement;
      const themeDef = activeThemeDef;
      const accentDef = BUILT_IN_ACCENTS[preferences.accent] || BUILT_IN_ACCENTS.cyan;

      // Attributes for CSS styling hooks
      root.setAttribute("data-theme", themeDef.id);
      root.setAttribute("data-theme-mode", themeDef.isDark ? "dark" : "light");
      root.setAttribute("data-accent", preferences.accent);
      root.setAttribute("data-density", preferences.density);
      root.setAttribute("data-sidebar-mode", preferences.sidebarMode);
      root.setAttribute("data-font-scale", preferences.fontScale);
      root.setAttribute("data-reduced-motion", preferences.reducedMotion ? "true" : "false");

      // Inject dynamic CSS custom properties for instant consistency
      root.style.setProperty("--bg-primary", themeDef.colors.bgPrimary);
      root.style.setProperty("--bg-secondary", themeDef.colors.bgSecondary);
      root.style.setProperty("--bg-card", themeDef.colors.bgCard);
      root.style.setProperty("--bg-card-hover", themeDef.colors.bgCardHover);
      root.style.setProperty("--border-color", themeDef.colors.borderColor);
      root.style.setProperty("--border-accent", themeDef.colors.borderAccent);
      root.style.setProperty("--text-main", themeDef.colors.textMain);
      root.style.setProperty("--text-muted", themeDef.colors.textMuted);
      root.style.setProperty("--text-dim", themeDef.colors.textDim);

      // Standardized Semantic Design Tokens (Global Master Theme System)
      root.style.setProperty("--app-bg", themeDef.colors.bgPrimary);
      root.style.setProperty("--surface", themeDef.colors.bgSecondary);
      root.style.setProperty("--surface-elevated", themeDef.colors.bgCard);
      root.style.setProperty("--surface-hover", themeDef.colors.bgCardHover);
      root.style.setProperty("--text-primary", themeDef.colors.textMain);
      root.style.setProperty("--text-secondary", themeDef.colors.textMuted);
      root.style.setProperty("--text-muted", themeDef.colors.textDim);
      root.style.setProperty("--border", themeDef.colors.borderColor);
      root.style.setProperty("--accent", accentDef.hex);
      root.style.setProperty("--accent-foreground", themeDef.isDark ? "#ffffff" : "#0f172a");
      root.style.setProperty("--focus-ring", accentDef.subtleHex || `${accentDef.hex}55`);
      root.style.setProperty("--success", "#10b981");
      root.style.setProperty("--warning", "#f59e0b");
      root.style.setProperty("--danger", "#f43f5e");
      root.style.setProperty("--input-bg", themeDef.colors.bgCard);
      root.style.setProperty("--input-border", themeDef.colors.borderColor);

      // Extended surface and geometry variables
      root.style.setProperty("--radius-card", themeDef.colors.cardRadius || "8px");
      root.style.setProperty("--radius-btn", themeDef.colors.buttonRadius || "6px");
      root.style.setProperty("--shadow-card", themeDef.colors.cardShadow || "none");
      root.style.setProperty("--backdrop-card", themeDef.colors.cardBackdrop || "none");
      if (themeDef.colors.accentPrimary) {
        root.style.setProperty("--theme-accent", themeDef.colors.accentPrimary);
      }

      // Primary Accent variable overrides
      root.style.setProperty("--accent-primary", accentDef.hex);
      root.style.setProperty("--accent-primary-hover", accentDef.hoverHex);
      root.style.setProperty("--accent-primary-subtle", accentDef.subtleHex);
      root.style.setProperty("--accent-cyan", accentDef.hex);

      // Persist preferences to localStorage (preview state is deliberately not stored)
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn("Failed to persist user preferences:", e);
    }
  }, [preferences, activeThemeDef]);

  // Direct theme application
  const setTheme = useCallback((theme: ThemeId) => {
    setPreviewThemeId(null);
    setPreferences((prev) => ({ ...prev, theme }));
  }, []);

  // Live preview mode
  const previewTheme = useCallback((theme: ThemeId) => {
    setPreviewThemeId(theme);
  }, []);

  // Apply previewed theme
  const applyPreview = useCallback(() => {
    if (previewThemeId) {
      setPreferences((prev) => ({ ...prev, theme: previewThemeId }));
      setPreviewThemeId(null);
    }
  }, [previewThemeId]);

  // Cancel preview and roll back to saved theme
  const cancelPreview = useCallback(() => {
    setPreviewThemeId(null);
  }, []);

  const setAccent = useCallback((accent: AccentId) => {
    setPreferences((prev) => ({ ...prev, accent }));
  }, []);

  const setDensity = useCallback((density: Density) => {
    setPreferences((prev) => ({ ...prev, density }));
  }, []);

  const setSidebarMode = useCallback((sidebarMode: SidebarMode) => {
    setPreferences((prev) => ({ ...prev, sidebarMode }));
  }, []);

  const toggleSidebarMode = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      sidebarMode: prev.sidebarMode === "expanded" ? "compact" : "expanded",
    }));
  }, []);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    setPreferences((prev) => ({ ...prev, reducedMotion }));
  }, []);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setPreferences((prev) => ({ ...prev, fontScale }));
  }, []);

  const setDefaultTab = useCallback((defaultTab: string) => {
    setPreferences((prev) => ({ ...prev, defaultTab }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreviewThemeId(null);
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear localStorage preferences:", e);
    }
  }, []);

  // Custom theme management
  const saveCustomTheme = useCallback((theme: ThemeDefinition) => {
    setPreferences((prev) => {
      const existing = prev.customThemes || [];
      const index = existing.findIndex((t) => t.id === theme.id);
      const updated =
        index >= 0
          ? [...existing.slice(0, index), theme, ...existing.slice(index + 1)]
          : [...existing, theme];
      return {
        ...prev,
        theme: theme.id,
        customThemes: updated,
      };
    });
    setPreviewThemeId(null);
  }, []);

  const deleteCustomTheme = useCallback((themeId: string) => {
    setPreferences((prev) => {
      const existing = prev.customThemes || [];
      const updated = existing.filter((t) => t.id !== themeId);
      const isCurrentActive = prev.theme === themeId;
      return {
        ...prev,
        theme: isCurrentActive ? "midnight" : prev.theme,
        customThemes: updated,
      };
    });
    setPreviewThemeId((curr) => (curr === themeId ? null : curr));
  }, []);

  const exportTheme = useCallback((themeId: ThemeId): string => {
    const found = allThemes.find((t) => t.id === themeId) || BUILT_IN_THEMES[themeId] || BUILT_IN_THEMES.midnight;
    const exportObject = {
      $schema: "https://appsec-nexus.dev/schema/theme-v1.json",
      id: found.id,
      name: found.name,
      description: found.description,
      category: found.category,
      isDark: found.isDark,
      colors: found.colors,
    };
    return JSON.stringify(exportObject, null, 2);
  }, [allThemes]);

  const importTheme = useCallback((jsonStr: string): { success: boolean; themeId?: string; error?: string } => {
    const result = validateAndSanitizeThemeJson(jsonStr);
    if (!result.success || !result.theme) {
      return { success: false, error: result.error || "Theme validation failed." };
    }

    const newTheme = result.theme;
    saveCustomTheme(newTheme);
    return { success: true, themeId: newTheme.id };
  }, [saveCustomTheme]);

  return (
    <ThemeContext.Provider
      value={{
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
        toggleSidebarMode,
        setReducedMotion,
        setFontScale,
        setDefaultTab,
        resetPreferences,
        saveCustomTheme,
        deleteCustomTheme,
        exportTheme,
        importTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      preferences: DEFAULT_PREFERENCES,
      allThemes: Object.values(BUILT_IN_THEMES),
      previewThemeId: null,
      activeThemeDef: BUILT_IN_THEMES.midnight,
      setTheme: () => {},
      previewTheme: () => {},
      applyPreview: () => {},
      cancelPreview: () => {},
      setAccent: () => {},
      setDensity: () => {},
      setSidebarMode: () => {},
      toggleSidebarMode: () => {},
      setReducedMotion: () => {},
      setFontScale: () => {},
      setDefaultTab: () => {},
      resetPreferences: () => {},
      saveCustomTheme: () => {},
      deleteCustomTheme: () => {},
      exportTheme: () => "{}",
      importTheme: () => ({ success: false, error: "ThemeProvider context unavailable." }),
    };
  }
  return context;
}
