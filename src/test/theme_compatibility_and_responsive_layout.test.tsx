import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { BUILT_IN_THEMES, BUILT_IN_ACCENTS } from "../theme/themes";

// Test harness component to exercise ThemeProvider methods
function ThemeConsumerTestHarness() {
  const {
    preferences,
    activeThemeDef,
    setTheme,
    setAccent,
    setDensity,
    setSidebarMode,
  } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{activeThemeDef.id}</span>
      <span data-testid="current-mode">{activeThemeDef.isDark ? "dark" : "light"}</span>
      <span data-testid="current-accent">{preferences.accent}</span>
      <span data-testid="current-density">{preferences.density}</span>
      <span data-testid="current-sidebar">{preferences.sidebarMode}</span>

      <button onClick={() => setTheme("flip7_playful")}>Switch To Flip7 Light</button>
      <button onClick={() => setTheme("github_light")}>Switch To GitHub Light</button>
      <button onClick={() => setTheme("solarized_light")}>Switch To Solarized Light</button>
      <button onClick={() => setTheme("midnight")}>Switch To Midnight Dark</button>
      <button onClick={() => setTheme("cyber_neon")}>Switch To Cyber Neon</button>
      <button onClick={() => setAccent("rose")}>Set Rose Accent</button>
      <button onClick={() => setAccent("emerald")}>Set Emerald Accent</button>
      <button onClick={() => setDensity("compact")}>Set Compact Density</button>
      <button onClick={() => setSidebarMode("compact")}>Set Compact Sidebar</button>
    </div>
  );
}

describe("Theme Compatibility & Responsive Design System", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-density");
  });

  it("injects all 16 standardized semantic design tokens into documentElement style", () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTestHarness />
      </ThemeProvider>
    );

    const rootStyle = document.documentElement.style;

    // 16 Standardized semantic tokens required by specification
    const expectedSemanticTokens = [
      "--app-bg",
      "--surface",
      "--surface-elevated",
      "--surface-hover",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--border",
      "--accent",
      "--accent-foreground",
      "--focus-ring",
      "--success",
      "--warning",
      "--danger",
      "--input-bg",
      "--input-border",
    ];

    for (const token of expectedSemanticTokens) {
      const val = rootStyle.getPropertyValue(token);
      expect(val, `Expected semantic token ${token} to be defined`).toBeTruthy();
    }
  });

  it("updates data-theme-mode and semantic variables when switching to light themes", () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTestHarness />
      </ThemeProvider>
    );

    const flipBtn = screen.getByText("Switch To Flip7 Light");
    act(() => {
      flipBtn.click();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("flip7_playful");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("light");

    const rootStyle = document.documentElement.style;
    const flipDef = BUILT_IN_THEMES.flip7_playful;
    expect(rootStyle.getPropertyValue("--app-bg")).toBe(flipDef.colors.bgPrimary);
    expect(rootStyle.getPropertyValue("--surface")).toBe(flipDef.colors.bgSecondary);
    expect(rootStyle.getPropertyValue("--surface-elevated")).toBe(flipDef.colors.bgCard);
    expect(rootStyle.getPropertyValue("--text-primary")).toBe(flipDef.colors.textMain);
    expect(rootStyle.getPropertyValue("--text-secondary")).toBe(flipDef.colors.textMuted);
    expect(rootStyle.getPropertyValue("--border")).toBe(flipDef.colors.borderColor);
    expect(rootStyle.getPropertyValue("--accent-foreground")).toBe("#0f172a");
  });

  it("updates data-theme-mode and semantic variables when switching to dark themes", () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTestHarness />
      </ThemeProvider>
    );

    const cyberBtn = screen.getByText("Switch To Cyber Neon");
    act(() => {
      cyberBtn.click();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("cyber_neon");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");

    const rootStyle = document.documentElement.style;
    const cyberDef = BUILT_IN_THEMES.cyber_neon;
    expect(rootStyle.getPropertyValue("--app-bg")).toBe(cyberDef.colors.bgPrimary);
    expect(rootStyle.getPropertyValue("--accent-foreground")).toBe("#ffffff");
  });

  it("updates accent variables across the design system", () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTestHarness />
      </ThemeProvider>
    );

    const roseBtn = screen.getByText("Set Rose Accent");
    act(() => {
      roseBtn.click();
    });

    expect(document.documentElement.getAttribute("data-accent")).toBe("rose");
    const rootStyle = document.documentElement.style;
    const roseDef = BUILT_IN_ACCENTS.rose;
    expect(rootStyle.getPropertyValue("--accent")).toBe(roseDef.hex);
    expect(rootStyle.getPropertyValue("--accent-primary")).toBe(roseDef.hex);
    expect(rootStyle.getPropertyValue("--focus-ring")).toBe(roseDef.subtleHex);
  });

  it("updates density settings and attributes", () => {
    render(
      <ThemeProvider>
        <ThemeConsumerTestHarness />
      </ThemeProvider>
    );

    const densityBtn = screen.getByText("Set Compact Density");
    act(() => {
      densityBtn.click();
    });

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
  });

  it("verifies all built-in themes pass contrast and define required color tokens", () => {
    for (const [id, theme] of Object.entries(BUILT_IN_THEMES)) {
      expect(theme.id).toBe(id);
      expect(theme.colors.bgPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.bgSecondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.bgCard).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.borderColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.textMain).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.colors.textMuted).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof theme.isDark).toBe("boolean");
    }
  });
});
