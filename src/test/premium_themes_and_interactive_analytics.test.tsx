import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BUILT_IN_THEMES } from "../theme/themes";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";
import { AppearanceSettings } from "../components/AppearanceSettings";
import { AnalyticsDashboard } from "../Analytics";
import { Target, Finding, ScanResult, DiscoveredEndpoint } from "../types";

describe("10+ Premium Themes & Interactive Security Analytics Suite", () => {
  // Test 1: Verification of 14 Master Premium Themes
  it("verifies all 14 master selectable themes exist with distinct surface and geometry tokens", () => {
    const requiredThemes = [
      "vercel_minimal",
      "flip7_playful",
      "midnight",
      "cyber_neon",
      "aurora_glass",
      "arctic",
      "mint_intelligence",
      "graphite",
      "amber_observatory",
      "indigo_intelligence",
      "soc_terminal",
      "paper_ink",
      "oceanic_blue",
      "solarized_studio",
    ];

    expect(requiredThemes.length).toBeGreaterThanOrEqual(14);

    for (const themeId of requiredThemes) {
      const theme = BUILT_IN_THEMES[themeId];
      expect(theme, `Theme ${themeId} should be defined`).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.description).toBeDefined();
      expect(theme.colors.bgPrimary).toMatch(/^#/);
      expect(theme.colors.bgSecondary).toMatch(/^#/);
      expect(theme.colors.bgCard).toMatch(/^#/);
      expect(theme.colors.borderColor).toMatch(/^#/);
      expect(theme.colors.textMain).toMatch(/^#/);
      expect(theme.colors.cardRadius, `Theme ${themeId} must have cardRadius geometry token`).toBeDefined();
    }

    // Verify Vercel Minimal characteristics
    expect(BUILT_IN_THEMES.vercel_minimal.colors.bgPrimary).toBe("#000000");
    expect(BUILT_IN_THEMES.vercel_minimal.isDark).toBe(true);

    // Verify Flip7 Playful characteristics
    expect(BUILT_IN_THEMES.flip7_playful.colors.bgPrimary).toBe("#fbf8f2");
    expect(BUILT_IN_THEMES.flip7_playful.isDark).toBe(false);

    // Verify Oceanic Blue characteristics
    expect(BUILT_IN_THEMES.oceanic_blue.colors.bgPrimary).toBe("#0b1320");
    expect(BUILT_IN_THEMES.oceanic_blue.colors.accentPrimary).toBe("#0284c7");

    // Verify Solarized Studio characteristics
    expect(BUILT_IN_THEMES.solarized_studio.colors.bgPrimary).toBe("#002b36");
    expect(BUILT_IN_THEMES.solarized_studio.colors.borderAccent).toBe("#2aa198");

    // Verify Aurora Glass characteristics
    expect(BUILT_IN_THEMES.aurora_glass.colors.cardBackdrop).toBe("blur(12px)");
  });

  // Test 2: Appearance Gallery & Theme Switcher
  it("renders Theme Gallery with Vercel Minimal, Flip7 Playful, and supports live preview", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AppearanceSettings />
        </ToastProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Vercel Minimal")).toBeInTheDocument();
    expect(screen.getByText("Flip7 Playful")).toBeInTheDocument();
    expect(screen.getByText("Cyber Neon")).toBeInTheDocument();
    expect(screen.getByText("Aurora Glass")).toBeInTheDocument();

    // Verify Category Filter Pills
    const minimalPill = screen.getByRole("button", { name: /^Minimal \(/i });
    const colorfulPill = screen.getByRole("button", { name: /^Colorful \(/i });
    const developerPill = screen.getByRole("button", { name: /^Developer \(/i });
    expect(minimalPill).toBeInTheDocument();
    expect(colorfulPill).toBeInTheDocument();
    expect(developerPill).toBeInTheDocument();

    // Click Minimal category filter
    await act(async () => {
      fireEvent.click(minimalPill);
    });
    expect(screen.getByText("Vercel Minimal")).toBeInTheDocument();
    expect(screen.queryByText("Cyberpunk Neon")).not.toBeInTheDocument();

    // Reset to All Themes
    const allPill = screen.getByRole("button", { name: /^All Themes \(/i });
    await act(async () => {
      fireEvent.click(allPill);
    });

    // Verify Preview button activates preview mode
    const previewButtons = screen.getAllByRole("button", { name: /^Preview$/i });
    expect(previewButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(previewButtons[0]);
    });

    // Preview banner should appear with Cancel and Apply controls
    expect(screen.getByText(/Previewing Theme:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply Theme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel Preview/i })).toBeInTheDocument();

    // Click Cancel Preview
    const cancelBtn = screen.getByRole("button", { name: /Cancel Preview/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByText(/Previewing Theme:/i)).not.toBeInTheDocument();
  });

  // Test 3: Interactive Security Analytics Dashboard
  it("renders Security Analytics with KPIs, interactive filters, time-series chart, age distribution, and asset risk matrix", async () => {
    const mockTargets: Target[] = [
      {
        id: "t1",
        name: "Acme Corp Production",
        primary_url: "https://api.acme.corp",
        created_at: new Date().toISOString(),
        scope: {
          allowed_hosts: ["api.acme.corp"],
          allowed_prefixes: ["/"],
          allowed_ports: [443],
          excluded_paths: [],
          allow_local_lab: false,
        },
      },
    ];

    const mockFindings: Finding[] = [
      {
        id: "f1",
        target_id: "t1",
        title: "Missing Content Security Policy (CSP)",
        severity: "Medium",
        confidence: 90,
        affected_asset: "https://api.acme.corp/v1",
        evidence: "Content-Security-Policy header is missing",
        source_tool: "baseline",
        tool_version: "1.0.0",
        cwe: "CWE-693",
        remediation: "Configure a robust CSP header.",
        status: "New",
        created_at: new Date().toISOString(),
      },
      {
        id: "f2",
        target_id: "t1",
        title: "Remote Code Execution in Admin API",
        severity: "Critical",
        confidence: 98,
        affected_asset: "https://api.acme.corp/admin",
        evidence: "Unauthenticated command injection payload accepted",
        source_tool: "nuclei",
        tool_version: "3.11.1",
        cwe: "CWE-78",
        remediation: "Sanitize user inputs and disable dangerous exec handlers.",
        status: "Confirmed",
        created_at: new Date().toISOString(),
      },
    ];

    const mockEndpoints: DiscoveredEndpoint[] = [
      {
        id: "ep1",
        target_id: "t1",
        url: "https://api.acme.corp/health",
        method: "GET",
        status_code: 200,
        source: "crawler",
        discovered_at: new Date().toISOString(),
      },
    ];

    const mockScans: ScanResult[] = [
      {
        scan_id: "s1",
        target_url: "https://api.acme.corp",
        tool: "nuclei",
        status: "Completed",
        logs: ["[+] Scan started", "[*] Completed in 1400ms"],
        findings_count: 1,
        duration_ms: 1400,
      },
    ];

    const handleNavigate = vi.fn();
    const handleQuickScan = vi.fn();

    render(
      <AnalyticsDashboard
        targets={mockTargets}
        selectedTarget={mockTargets[0]}
        onSelectTarget={() => {}}
        findings={mockFindings}
        endpoints={mockEndpoints}
        scanHistory={mockScans}
        onNavigateTab={handleNavigate}
        onQuickScan={handleQuickScan}
        isScanning={false}
      />
    );

    // Verify Resilience Score & KPIs
    expect(screen.getByText("Resilience Score")).toBeInTheDocument();
    expect(screen.getByText("Attack Surface")).toBeInTheDocument();
    expect(screen.getByText("Remediation Rate")).toBeInTheDocument();

    // Verify Interactive Timeline Chart exists
    expect(screen.getByText("Security Velocity & Vulnerability Trend")).toBeInTheDocument();

    // Verify Finding Age & SLA Lifecycle widget exists
    expect(screen.getByText("Finding Age & SLA Lifecycle")).toBeInTheDocument();
    expect(screen.getByText("Fresh Discovery & Triage")).toBeInTheDocument();

    // Verify Asset-by-Severity Risk Matrix exists
    expect(screen.getByText("Asset-by-Severity Heatmap Matrix")).toBeInTheDocument();
    expect(screen.getByText("api.acme.corp")).toBeInTheDocument();

    // Toggle from SVG Chart to Accessible Data Table
    const dataTableBtn = screen.getByRole("button", { name: /Data Table/i });
    expect(dataTableBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(dataTableBtn);
    });

    expect(screen.getByText("Cumulative Findings")).toBeInTheDocument();
    expect(screen.getByText("Scans Executed")).toBeInTheDocument();

    // Switch back to Chart view
    const chartBtn = screen.getByRole("button", { name: /Chart/i });
    await act(async () => {
      fireEvent.click(chartBtn);
    });

    // Test Severity filter interaction
    const severitySelect = screen.getByDisplayValue("All Severities");
    await act(async () => {
      fireEvent.change(severitySelect, { target: { value: "Critical" } });
    });

    // Reset button should now be visible and functional
    const resetFiltersBtn = screen.getByTitle("Clear all active filters");
    expect(resetFiltersBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(resetFiltersBtn);
    });

    expect(screen.queryByTitle("Clear all active filters")).not.toBeInTheDocument();
  });
});
