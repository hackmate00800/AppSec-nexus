import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TourProvider, useTour } from "../context/TourContext";
import { InteractiveTourOverlay } from "../components/tour/InteractiveTourOverlay";
import { HelpCenterModal } from "../components/help/HelpCenterModal";
import { GuidedWorkflowsDrawer } from "../components/help/GuidedWorkflowsDrawer";
import { ContextualHelpButton } from "../components/help/ContextualHelpButton";
import { HeaderHelpMenu } from "../components/help/HeaderHelpMenu";

// Test Harness Component exposing controls
const TourTestHarness: React.FC<{
  onNavigateTab?: (tab: any) => void;
}> = ({ onNavigateTab }) => {
  const {
    startTour,
    openHelpCenter,
    openWorkflows,
    isTourActive,
    isHelpCenterOpen,
    isWorkflowsOpen,
    currentStep,
  } = useTour();

  return (
    <div>
      <div data-tour="navbar-brand">AppSec Nexus Brand</div>
      <div data-tour="command-palette-btn">Command Palette Button</div>
      <div data-tour="target-scope-nav">Target Scope Nav</div>

      <button onClick={() => startTour("welcome")}>Launch Welcome Tour</button>
      <button onClick={() => openHelpCenter()}>Launch Help Center</button>
      <button onClick={() => openWorkflows()}>Launch Workflows</button>

      <HeaderHelpMenu
        onNavigateTab={onNavigateTab || (() => {})}
        onOpenCommandPalette={() => {}}
      />

      <ContextualHelpButton
        articleId="targets-scope"
        tourTrackId="targets"
        workflowId="first-security-scan"
        title="Target Scope Help"
      />

      <InteractiveTourOverlay />
      <HelpCenterModal />
      <GuidedWorkflowsDrawer />

      <div data-testid="tour-state">
        {isTourActive ? `ACTIVE:${currentStep?.id}` : "INACTIVE"}
      </div>
      <div data-testid="help-state">{isHelpCenterOpen ? "HELP_OPEN" : "HELP_CLOSED"}</div>
      <div data-testid="workflows-state">
        {isWorkflowsOpen ? "WORKFLOWS_OPEN" : "WORKFLOWS_CLOSED"}
      </div>
    </div>
  );
};

describe("Interactive Tour, Help Center & Guidance System", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts the Welcome tour, navigates forward/backward through steps, and exits with Escape", () => {
    const navigateSpy = vi.fn();

    render(
      <TourProvider onNavigateTab={navigateSpy}>
        <TourTestHarness onNavigateTab={navigateSpy} />
      </TourProvider>
    );

    expect(screen.getByTestId("tour-state")).toHaveTextContent("INACTIVE");

    // Start tour
    fireEvent.click(screen.getByText("Launch Welcome Tour"));
    expect(screen.getByTestId("tour-state")).toHaveTextContent("ACTIVE:brand");
    expect(screen.getByText("AppSec Nexus Platform")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    // Click Next
    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);
    expect(screen.getByTestId("tour-state")).toHaveTextContent("ACTIVE:command-palette");
    expect(screen.getByText("Developer Command Palette")).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    // Click Back
    const backBtn = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backBtn);
    expect(screen.getByTestId("tour-state")).toHaveTextContent("ACTIVE:brand");

    // Press Escape to exit tour
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("tour-state")).toHaveTextContent("INACTIVE");

    // Check that completed track was saved to localStorage
    const saved = JSON.parse(localStorage.getItem("appsec_tour_completed_tracks") || "[]");
    expect(saved).toContain("welcome");
  });

  it("switches explanation modes between beginner and advanced inside the tour overlay", () => {
    render(
      <TourProvider>
        <TourTestHarness />
      </TourProvider>
    );

    fireEvent.click(screen.getByText("Launch Welcome Tour"));

    // Default mode is beginner
    const beginnerBtn = screen.getByRole("button", { name: /Beginner/i });
    const advancedBtn = screen.getByRole("button", { name: /Advanced/i });

    expect(beginnerBtn).toBeInTheDocument();
    expect(advancedBtn).toBeInTheDocument();

    // Switch to Advanced mode
    fireEvent.click(advancedBtn);
    expect(localStorage.getItem("appsec_explanation_mode")).toBe("advanced");

    // Switch back to Beginner mode
    fireEvent.click(beginnerBtn);
    expect(localStorage.getItem("appsec_explanation_mode")).toBe("beginner");

    // Skip tour
    fireEvent.click(screen.getByRole("button", { name: /Skip/i }));
    expect(screen.getByTestId("tour-state")).toHaveTextContent("INACTIVE");
  });

  it("opens the Help Center, filters articles by search query, and toggles category pills", () => {
    render(
      <TourProvider>
        <TourTestHarness />
      </TourProvider>
    );

    // Open Help Center
    fireEvent.click(screen.getByText("Launch Help Center"));
    expect(screen.getByTestId("help-state")).toHaveTextContent("HELP_OPEN");
    expect(screen.getByText(/AppSec Nexus Help Center & Knowledgebase/i)).toBeInTheDocument();

    // Search articles
    const searchInput = screen.getByPlaceholderText(/Search help articles, tools/i);
    fireEvent.change(searchInput, { target: { value: "SSRF" } });

    // Should find the Target Scope & SSRF article
    expect(screen.getByText(/Target Scope Management & SSRF Protection/i)).toBeInTheDocument();

    // Clear search and select a category pill
    fireEvent.change(searchInput, { target: { value: "" } });
    const categoryPill = screen.getByRole("button", { name: "Projects and Target Configuration" });
    fireEvent.click(categoryPill);

    expect(screen.getByText(/Target Scope Management & SSRF Protection/i)).toBeInTheDocument();

    // Close Help Center
    const closeBtn = screen.getByTitle(/Close Help Center/i);
    fireEvent.click(closeBtn);
    expect(screen.getByTestId("help-state")).toHaveTextContent("HELP_CLOSED");
  });

  it("opens Guided Workflows, toggles step completion, persists progress, and navigates tabs", () => {
    const navigateSpy = vi.fn();

    render(
      <TourProvider onNavigateTab={navigateSpy}>
        <TourTestHarness onNavigateTab={navigateSpy} />
      </TourProvider>
    );

    // Open Guided Workflows
    fireEvent.click(screen.getByText("Launch Workflows"));
    expect(screen.getByTestId("workflows-state")).toHaveTextContent("WORKFLOWS_OPEN");
    expect(screen.getByText(/Interactive Security Checklists/i)).toBeInTheDocument();
    expect(screen.getAllByText(/First End-to-End Security Scan/i)[0]).toBeInTheDocument();

    // Toggle step 1 checkbox
    const step1Toggle = screen.getByRole("button", { name: /Toggle step 1/i });
    fireEvent.click(step1Toggle);

    // Verify progress updated
    expect(screen.getByText(/1 of 6 completed/i)).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem("appsec_guided_workflows_progress") || "{}");
    expect(saved["first-security-scan"]).toContain("step-target");

    // Click "Go to Action" button
    const actionBtn = screen.getByText("Open Target & Scope");
    fireEvent.click(actionBtn);
    expect(navigateSpy).toHaveBeenCalledWith("targets");

    // Reset workflow progress
    const resetBtn = screen.getByRole("button", { name: /Reset Progress/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/0 of 6 completed/i)).toBeInTheDocument();
  });

  it("renders HeaderHelpMenu and ContextualHelpButton with popover options", () => {
    render(
      <TourProvider>
        <TourTestHarness />
      </TourProvider>
    );

    // Open Header Help dropdown
    const helpMenuTrigger = screen.getByRole("button", { name: /Help & Guidance/i });
    fireEvent.click(helpMenuTrigger);

    expect(screen.getByText(/Guided Experience & Learning/i)).toBeInTheDocument();
    expect(screen.getByText(/Take a Tour/i)).toBeInTheDocument();
    expect(screen.getByText(/Help Center & Articles/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided Checklists/i)).toBeInTheDocument();

    // Open Contextual Help popover
    const contextualHelpBtn = screen.getByRole("button", { name: "Target Scope Help" });
    fireEvent.click(contextualHelpBtn);

    expect(screen.getByText("Target Scope Help")).toBeInTheDocument();
    expect(screen.getByText("Read Documentation")).toBeInTheDocument();
    expect(screen.getByText("Interactive Tour")).toBeInTheDocument();
    expect(screen.getByText("Guided Checklist")).toBeInTheDocument();
  });
});
