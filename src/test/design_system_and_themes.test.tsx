import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../theme/ThemeProvider";
import {
  BUILT_IN_THEMES,
  BUILT_IN_ACCENTS,
  PREFERENCES_STORAGE_KEY,
  validateAndSanitizeThemeJson,
} from "../theme/themes";
import { getContrastRatio, getContrastCompliance, isValidHexColor } from "../theme/contrast";
import { SeverityBadge, StatusBadge, ScopeBadge } from "../components/ui/Badge";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { ToastProvider } from "../components/ui/Toast";
import { CommandPalette } from "../components/CommandPalette";

describe("Design System, Built-in Themes & Personalization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("contains all 16 curated built-in developer & security themes with distinct color tokens", () => {
    const requiredThemes = [
      // Dark Developer Presets
      "midnight",
      "dracula",
      "monokai",
      "nordic",
      "tokyo_night",
      "one_dark",
      "cyberpunk",
      "obsidian",
      // Light Presets
      "github_light",
      "quiet_light",
      "arctic",
      "solarized_light",
      // Security Presets
      "soc_terminal",
      "threat_intel",
      "crimson",
      "forensic_slate",
    ];

    for (const themeId of requiredThemes) {
      const theme = BUILT_IN_THEMES[themeId];
      expect(theme).toBeDefined();
      expect(theme.colors.bgPrimary).toMatch(/^#/);
      expect(theme.colors.bgSecondary).toMatch(/^#/);
      expect(theme.colors.bgCard).toMatch(/^#/);
      expect(theme.colors.borderColor).toMatch(/^#/);
      expect(theme.colors.textMain).toMatch(/^#/);
      expect(theme.colors.textMuted).toMatch(/^#/);
    }

    // Verify OLED has pitch black #000000
    expect(BUILT_IN_THEMES.oled.colors.bgPrimary).toBe("#000000");

    // Verify light themes are marked isDark: false
    expect(BUILT_IN_THEMES.arctic.isDark).toBe(false);
    expect(BUILT_IN_THEMES.github_light.isDark).toBe(false);
    expect(BUILT_IN_THEMES.solarized_light.isDark).toBe(false);

    // Verify security themes are categorized as "security"
    expect(BUILT_IN_THEMES.soc_terminal.category).toBe("security");
    expect(BUILT_IN_THEMES.threat_intel.category).toBe("security");
    expect(BUILT_IN_THEMES.crimson.category).toBe("security");
    expect(BUILT_IN_THEMES.forensic_slate.category).toBe("security");
  });

  it("contains all 6 curated accessible accent colors", () => {
    const requiredAccents = ["cyan", "violet", "emerald", "amber", "blue", "rose"];
    for (const acc of requiredAccents) {
      expect(BUILT_IN_ACCENTS[acc]).toBeDefined();
      expect(BUILT_IN_ACCENTS[acc].hex).toMatch(/^#/);
    }
  });

  it("calculates WCAG contrast ratios and accessibility compliance accurately", () => {
    // Pure black on pure white should be 21:1
    const maxRatio = getContrastRatio("#ffffff", "#000000");
    expect(maxRatio).toBe(21);
    expect(getContrastCompliance(maxRatio).level).toBe("AAA");
    expect(getContrastCompliance(maxRatio).isAccessible).toBe(true);

    // Low contrast colors should fail (< 4.5:1)
    const lowRatio = getContrastRatio("#888888", "#777777");
    expect(lowRatio).toBeLessThan(4.5);
    expect(getContrastCompliance(lowRatio).level).toBe("Fail");
    expect(getContrastCompliance(lowRatio).isAccessible).toBe(false);

    // Hex validation
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#06b6d4")).toBe(true);
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("invalid-color")).toBe(false);
    expect(isValidHexColor("<script>alert(1)</script>")).toBe(false);
  });

  it("validates and sanitizes imported Theme JSON payloads", () => {
    // Valid theme JSON
    const validJson = JSON.stringify({
      name: "Cyber Horizon",
      description: "Custom neon palette",
      isDark: true,
      category: "custom",
      colors: {
        bgPrimary: "#0a0e17",
        bgSecondary: "#101623",
        bgCard: "#192237",
        bgCardHover: "#222e49",
        borderColor: "#263553",
        borderAccent: "#00f0ff",
        textMain: "#ffffff",
        textMuted: "#a0aec0",
        textDim: "#718096",
      },
    });
    const validResult = validateAndSanitizeThemeJson(validJson);
    expect(validResult.success).toBe(true);
    expect(validResult.theme?.name).toBe("Cyber Horizon");

    // Malicious XSS payload should be rejected
    const maliciousJson = JSON.stringify({
      name: "<script>alert('xss')</script>",
      colors: {},
    });
    const maliciousResult = validateAndSanitizeThemeJson(maliciousJson);
    expect(maliciousResult.success).toBe(false);

    // Payload exceeding size limit
    const hugePayload = JSON.stringify({
      name: "Huge Theme",
      hugeData: "A".repeat(40000),
    });
    const hugeResult = validateAndSanitizeThemeJson(hugePayload);
    expect(hugeResult.success).toBe(false);
    expect(hugeResult.error).toMatch(/exceeds maximum allowable size/i);
  });

  it("renders AppearanceSettings with theme cards and allows theme selection", () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AppearanceSettings />
        </ToastProvider>
      </ThemeProvider>
    );

    // Verify title
    expect(screen.getByText("Appearance & Personalization")).toBeInTheDocument();

    // Verify themes are present
    expect(screen.getByText(/Midnight Abyss/i)).toBeInTheDocument();
    expect(screen.getByText(/Dracula Dark/i)).toBeInTheDocument();
    expect(screen.getByText(/Nord Frost/i)).toBeInTheDocument();
    expect(screen.getByText(/Arctic Light/i)).toBeInTheDocument();
    expect(screen.getByText(/SOC Terminal/i)).toBeInTheDocument();

    // Click on Arctic Light's Apply button
    const applyButtons = screen.getAllByRole("button", { name: /^Apply$/i });
    expect(applyButtons.length).toBeGreaterThan(0);
    fireEvent.click(applyButtons[0]);

    // Verify localStorage has persisted preference
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(saved.theme).toBeDefined();
  });

  it("supports live preview mode and cancel preview rollback", () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AppearanceSettings />
        </ToastProvider>
      </ThemeProvider>
    );

    // Initial state: Midnight Abyss is applied
    const initialSaved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(initialSaved.theme || "midnight").toBe("midnight");

    // Click "Preview" on a theme card
    const previewButtons = screen.getAllByRole("button", { name: /Preview/i });
    expect(previewButtons.length).toBeGreaterThan(0);
    fireEvent.click(previewButtons[0]);

    // Sticky preview banner should appear
    expect(screen.getByText(/Previewing Theme:/i)).toBeInTheDocument();

    // Click "Cancel Preview"
    const cancelBtn = screen.getByRole("button", { name: /Cancel Preview/i });
    fireEvent.click(cancelBtn);

    // Banner should disappear and theme remains midnight
    expect(screen.queryByText(/Previewing Theme:/i)).not.toBeInTheDocument();
    const finalSaved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(finalSaved.theme || "midnight").toBe("midnight");
  });

  it("filters themes by category pills and search query", () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AppearanceSettings />
        </ToastProvider>
      </ThemeProvider>
    );

    // Click on "Light Themes" pill
    const lightPill = screen.getByText(/Light Themes/i);
    fireEvent.click(lightPill);

    // Light themes should be displayed, SOC Terminal should be hidden
    expect(screen.getByText(/Arctic Light/i)).toBeInTheDocument();
    expect(screen.getByText(/GitHub Light/i)).toBeInTheDocument();
    expect(screen.queryByText(/SOC Terminal/i)).not.toBeInTheDocument();

    // Search for "Nord"
    const searchInput = screen.getByPlaceholderText(/Filter themes/i);
    fireEvent.change(searchInput, { target: { value: "Nord" } });

    // Switch to All Themes to find Nord
    const allPill = screen.getByText(/All Themes/i);
    fireEvent.click(allPill);

    expect(screen.getByText(/Nord Frost/i)).toBeInTheDocument();
    expect(screen.queryByText(/GitHub Light/i)).not.toBeInTheDocument();
  });

  it("switches accent colors and persists preference", () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AppearanceSettings />
        </ToastProvider>
      </ThemeProvider>
    );

    // Click on Electric Violet accent
    const violetBtn = screen.getByText("Electric Violet");
    fireEvent.click(violetBtn);

    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(saved.accent).toBe("violet");
  });

  it("renders accessible severity and status badges with text labels", () => {
    render(
      <div>
        <SeverityBadge severity="Critical" />
        <SeverityBadge severity="High" />
        <SeverityBadge severity="Medium" />
        <SeverityBadge severity="Low" />
        <SeverityBadge severity="Info" />
        <StatusBadge status="Confirmed" />
        <StatusBadge status="Fixed" />
        <ScopeBadge allowLocalLab={true} />
        <ScopeBadge allowLocalLab={false} />
      </div>
    );

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Fixed")).toBeInTheDocument();
    expect(screen.getByText("Lab Scope Active")).toBeInTheDocument();
    expect(screen.getByText("SSRF Guard Enforced")).toBeInTheDocument();
  });

  it("filters and executes commands in CommandPalette", () => {
    let navigatedTab = "";
    render(
      <ThemeProvider>
        <CommandPalette
          isOpen={true}
          onClose={() => {}}
          onNavigateTab={(tab) => { navigatedTab = tab; }}
          onQuickScan={() => {}}
          onExportReport={() => {}}
          onEmergencyStop={() => {}}
          findings={[]}
          targets={[]}
          onSelectFinding={() => {}}
        />
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();

    // Search for "Appearance"
    const input = screen.getByPlaceholderText(/Type a command/i);
    fireEvent.change(input, { target: { value: "Appearance" } });

    const appearanceCmd = screen.getByText("Go to Appearance & Personalization");
    expect(appearanceCmd).toBeInTheDocument();

    fireEvent.click(appearanceCmd);
    expect(navigatedTab).toBe("appearance");
  });
});
