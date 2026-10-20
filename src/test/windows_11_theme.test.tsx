import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "../theme/ThemeProvider";
import {
  BUILT_IN_THEMES,
  BUILT_IN_ACCENTS,
  PREFERENCES_STORAGE_KEY,
  validateAndSanitizeThemeJson,
} from "../theme/themes";
import { getContrastRatio, getContrastCompliance } from "../theme/contrast";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { ToastProvider } from "../components/ui/Toast";

describe("Windows 11 Fluent Design Theme Implementation", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("registers Windows 11 flagship, Dark, and Light theme definitions with valid tokens", () => {
    // 1. Windows 11 flagship
    const win11 = BUILT_IN_THEMES.windows_11;
    expect(win11).toBeDefined();
    expect(win11.id).toBe("windows_11");
    expect(win11.name).toBe("Windows 11");
    expect(win11.isDark).toBe(true);
    expect(win11.colors.bgPrimary).toBe("#202020");
    expect(win11.colors.bgSecondary).toBe("#272727");
    expect(win11.colors.bgCard).toBe("#2c2c2c");
    expect(win11.colors.cardRadius).toBe("8px");
    expect(win11.colors.buttonRadius).toBe("6px");
    expect(win11.colors.accentPrimary).toBe("#4cc2ff");

    // 2. Windows 11 Dark variant
    const win11Dark = BUILT_IN_THEMES.windows_11_dark;
    expect(win11Dark).toBeDefined();
    expect(win11Dark.id).toBe("windows_11_dark");
    expect(win11Dark.name).toBe("Windows 11 Dark");
    expect(win11Dark.isDark).toBe(true);

    // 3. Windows 11 Light variant
    const win11Light = BUILT_IN_THEMES.windows_11_light;
    expect(win11Light).toBeDefined();
    expect(win11Light.id).toBe("windows_11_light");
    expect(win11Light.name).toBe("Windows 11 Light");
    expect(win11Light.isDark).toBe(false);
    expect(win11Light.colors.bgPrimary).toBe("#f3f3f3");
    expect(win11Light.colors.bgSecondary).toBe("#f8f9fa");
    expect(win11Light.colors.bgCard).toBe("#ffffff");
    expect(win11Light.colors.cardRadius).toBe("8px");
    expect(win11Light.colors.buttonRadius).toBe("6px");
    expect(win11Light.colors.accentPrimary).toBe("#0067c0");

    // 4. Windows Blue accent
    const winBlue = BUILT_IN_ACCENTS.windows_blue;
    expect(winBlue).toBeDefined();
    expect(winBlue.id).toBe("windows_blue");
    expect(winBlue.name).toBe("Windows Blue");
    expect(winBlue.hex).toBe("#0067c0");
    expect(winBlue.hoverHex).toBe("#005a9e");
  });

  it("satisfies WCAG AA contrast compliance for both dark and light variants", () => {
    // Windows 11 Dark contrast checks
    const win11 = BUILT_IN_THEMES.windows_11;
    const textOnBgDark = getContrastRatio(win11.colors.textMain, win11.colors.bgPrimary);
    expect(textOnBgDark).toBeGreaterThanOrEqual(4.5);
    expect(getContrastCompliance(textOnBgDark).isAccessible).toBe(true);

    const mutedOnBgDark = getContrastRatio(win11.colors.textMuted, win11.colors.bgPrimary);
    expect(mutedOnBgDark).toBeGreaterThanOrEqual(4.5);
    expect(getContrastCompliance(mutedOnBgDark).isAccessible).toBe(true);

    const accentOnBgDark = getContrastRatio(win11.colors.accentPrimary!, win11.colors.bgPrimary);
    expect(accentOnBgDark).toBeGreaterThanOrEqual(4.5);

    // Windows 11 Light contrast checks
    const win11Light = BUILT_IN_THEMES.windows_11_light;
    const textOnBgLight = getContrastRatio(win11Light.colors.textMain, win11Light.colors.bgPrimary);
    expect(textOnBgLight).toBeGreaterThanOrEqual(4.5);
    expect(getContrastCompliance(textOnBgLight).isAccessible).toBe(true);

    const mutedOnBgLight = getContrastRatio(win11Light.colors.textMuted, win11Light.colors.bgPrimary);
    expect(mutedOnBgLight).toBeGreaterThanOrEqual(4.5);
    expect(getContrastCompliance(mutedOnBgLight).isAccessible).toBe(true);

    const accentOnCardLight = getContrastRatio(win11Light.colors.accentPrimary!, win11Light.colors.bgCard);
    expect(accentOnCardLight).toBeGreaterThanOrEqual(4.5);
    expect(getContrastCompliance(accentOnCardLight).isAccessible).toBe(true);
  });

  it("renders Windows 11 in AppearanceSettings and allows selecting Windows 11 theme", () => {
    render(
      <ToastProvider>
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      </ToastProvider>
    );

    // Filter themes with search input
    const searchInput = screen.getByPlaceholderText(/filter themes/i);
    fireEvent.change(searchInput, { target: { value: "Windows 11" } });

    // Assert that Windows 11 cards are rendered
    expect(screen.getByText("Windows 11")).toBeInTheDocument();
    expect(screen.getByText("Windows 11 Light")).toBeInTheDocument();
    expect(screen.getByText("Windows 11 Dark")).toBeInTheDocument();

    // Find the Apply buttons (there should be apply buttons for each filtered card)
    const applyButtons = screen.getAllByRole("button", { name: /^Apply$/i });
    expect(applyButtons.length).toBeGreaterThan(0);

    // Click Apply on the first card ("Windows 11")
    fireEvent.click(applyButtons[0]);

    // Verify root attributes
    expect(document.documentElement.getAttribute("data-theme")).toBe("windows_11");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--bg-primary")).toBe("#202020");
    expect(document.documentElement.style.getPropertyValue("--bg-card")).toBe("#2c2c2c");
    expect(document.documentElement.style.getPropertyValue("--text-main")).toBe("#ffffff");
    expect(document.documentElement.style.getPropertyValue("--radius-card")).toBe("8px");

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(saved.theme).toBe("windows_11");
  });

  it("allows switching to Windows 11 Light variant and updates root DOM accordingly", () => {
    render(
      <ToastProvider>
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      </ToastProvider>
    );

    const searchInput = screen.getByPlaceholderText(/filter themes/i);
    fireEvent.change(searchInput, { target: { value: "Windows 11 Light" } });

    // Should only show Windows 11 Light card
    expect(screen.getByText("Windows 11 Light")).toBeInTheDocument();
    const applyButtons = screen.getAllByRole("button", { name: /^Apply$/i });
    expect(applyButtons.length).toBe(1);

    fireEvent.click(applyButtons[0]);

    expect(document.documentElement.getAttribute("data-theme")).toBe("windows_11_light");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--bg-primary")).toBe("#f3f3f3");
    expect(document.documentElement.style.getPropertyValue("--bg-card")).toBe("#ffffff");
    expect(document.documentElement.style.getPropertyValue("--text-main")).toBe("#1b1b1b");
    expect(document.documentElement.style.getPropertyValue("--theme-accent")).toBe("#0067c0");

    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(saved.theme).toBe("windows_11_light");
  });

  it("supports previewing and canceling Windows 11 theme without saving to storage", () => {
    render(
      <ToastProvider>
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      </ToastProvider>
    );

    const searchInput = screen.getByPlaceholderText(/filter themes/i);
    fireEvent.change(searchInput, { target: { value: "Windows 11 Light" } });

    // Click preview on Windows 11 Light
    const previewButtons = screen.getAllByRole("button", { name: /^Preview$/i });
    expect(previewButtons.length).toBe(1);
    fireEvent.click(previewButtons[0]);

    // While previewing, DOM has windows_11_light
    expect(document.documentElement.getAttribute("data-theme")).toBe("windows_11_light");

    // Cancel preview via top sticky preview banner
    const cancelBtn = screen.getByRole("button", { name: /cancel preview/i });
    fireEvent.click(cancelBtn);

    // Should revert back to default theme (midnight)
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
  });

  it("validates that Windows 11 themes pass schema sanitization for export/import", () => {
    const rawJson = JSON.stringify(BUILT_IN_THEMES.windows_11);
    const result = validateAndSanitizeThemeJson(rawJson);
    expect(result.success).toBe(true);
    expect(result.theme).toBeDefined();
    expect(result.theme?.name).toBe("Windows 11");
  });

  it("allows selecting the Windows Blue accent color", () => {
    render(
      <ToastProvider>
        <ThemeProvider>
          <AppearanceSettings />
        </ThemeProvider>
      </ToastProvider>
    );

    // Click Windows Blue accent button
    const winBlueBtn = screen.getByText("Windows Blue");
    expect(winBlueBtn).toBeInTheDocument();
    fireEvent.click(winBlueBtn);

    // Verify root attribute
    expect(document.documentElement.getAttribute("data-accent")).toBe("windows_blue");

    // Verify localStorage has persisted accent
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}");
    expect(saved.accent).toBe("windows_blue");
  });
});
