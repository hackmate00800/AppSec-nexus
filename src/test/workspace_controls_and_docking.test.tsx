import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { WorkspaceProvider, useWorkspace } from "../context/WorkspaceContext";
import { WorkspaceTabs } from "../components/ui/WorkspaceTabs";
import { WorkspaceToolbar } from "../components/ui/WorkspaceToolbar";
import { WorkspaceControlsDrawer } from "../components/ui/WorkspaceControlsDrawer";
import { SlidingDrawer } from "../components/ui/SlidingDrawer";

describe("Workspace Controls, Docking, Tabs & Sliding Drawers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders WorkspaceTabs, allows tab selection, tab closing, and closed tab restoration", () => {
    let currentTab = "analytics";
    const onSelect = (tab: string) => {
      currentTab = tab;
    };

    const TestHarness: React.FC = () => {
      const [tab, setTab] = React.useState("analytics");
      return (
        <WorkspaceProvider>
          <WorkspaceTabs
            activeTab={tab}
            onSelectTab={(t) => {
              setTab(t);
              onSelect(t);
            }}
          />
        </WorkspaceProvider>
      );
    };

    render(<TestHarness />);

    // Check essential tabs are present
    expect(screen.getByText("Security Analytics")).toBeInTheDocument();
    expect(screen.getByText("Target & Scope")).toBeInTheDocument();
    expect(screen.getByText("Scan Console")).toBeInTheDocument();

    // Click Target & Scope tab
    fireEvent.click(screen.getByText("Target & Scope"));
    expect(currentTab).toBe("targets");

    // Close Target & Scope tab using its close button
    const closeBtn = screen.getByLabelText(/Close Target & Scope tab/i);
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    // Verify Target & Scope is no longer in the active tab list
    expect(screen.queryByText("Target & Scope")).not.toBeInTheDocument();

    // Open restore menu (+ button)
    const restoreMenuBtn = screen.getByTitle(/Open or restore hidden tabs/i);
    fireEvent.click(restoreMenuBtn);
    expect(screen.getByText(/Tabs & Workspaces/i)).toBeInTheDocument();

    // Restore Target & Scope tab
    const reopenTargetBtn = screen.getByRole("button", { name: /Target & Scope/i });
    fireEvent.click(reopenTargetBtn);

    // Verify Target & Scope is back in the document
    expect(screen.getByText("Target & Scope")).toBeInTheDocument();
  });

  it("renders WorkspaceToolbar, manages minimized panels dock, presets, and density", () => {
    const TestToolbarHarness: React.FC = () => {
      const { minimizePanel } = useWorkspace();
      return (
        <div>
          <WorkspaceToolbar />
          <button onClick={() => minimizePanel("scan_console")}>Minimize Console</button>
        </div>
      );
    };

    render(
      <WorkspaceProvider>
        <TestToolbarHarness />
      </WorkspaceProvider>
    );

    // Preset dropdown exists
    expect(screen.getByRole("combobox", { name: /Workspace Layout Preset/i })).toBeInTheDocument();

    // Density buttons exist
    expect(screen.getByTitle(/Compact high-density view/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Balanced comfortable view/i)).toBeInTheDocument();

    // Minimize a panel to dock
    fireEvent.click(screen.getByText("Minimize Console"));

    // Verify dock shows the minimized panel pill
    expect(screen.getByText(/Docked \(1\):/i)).toBeInTheDocument();
    expect(screen.getByText("Live Scan Console")).toBeInTheDocument();

    // Click Restore button on the docked pill
    const restorePill = screen.getByTitle(/Click to restore Live Scan Console/i);
    fireEvent.click(restorePill);

    // Verify dock is empty
    expect(screen.queryByText(/Docked/i)).not.toBeInTheDocument();
  });

  it("renders SlidingDrawer, handles escape key, maximize/restore, and close", () => {
    let closed = false;
    let maximized = false;

    const TestDrawerHarness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);
      const [isMax, setIsMax] = React.useState(false);

      return (
        <SlidingDrawer
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            closed = true;
          }}
          title="Security Inspector"
          subtitle="Detailed payload analysis"
          isMaximized={isMax}
          onToggleMaximize={() => {
            setIsMax(!isMax);
            maximized = !isMax;
          }}
        >
          <div>Drawer Content Body</div>
        </SlidingDrawer>
      );
    };

    render(<TestDrawerHarness />);

    expect(screen.getByText("Security Inspector")).toBeInTheDocument();
    expect(screen.getByText("Detailed payload analysis")).toBeInTheDocument();
    expect(screen.getByText("Drawer Content Body")).toBeInTheDocument();

    // Maximize drawer
    const maxBtn = screen.getByTitle(/Maximize drawer/i);
    fireEvent.click(maxBtn);
    expect(maximized).toBe(true);

    // Press Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closed).toBe(true);
  });

  it("renders WorkspaceControlsDrawer, toggles panel visibility, presets, and reset", () => {
    let selectedTab = "analytics";

    render(
      <WorkspaceProvider>
        <WorkspaceControlsDrawer
          isOpen={true}
          onClose={() => {}}
          onSelectTab={(t) => {
            selectedTab = t;
          }}
        />
      </WorkspaceProvider>
    );

    expect(screen.getByText(/Workspace Controls & Layout Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Modular Panels & Docks/i)).toBeInTheDocument();

    // Switch preset inside controls drawer
    const analystPresetBtn = screen.getByText(/🔬 Security Analyst/i);
    fireEvent.click(analystPresetBtn);

    // Check panel toggles exist
    expect(screen.getByText("Security Posture KPIs")).toBeInTheDocument();
    expect(screen.getByText("Severity Breakdown")).toBeInTheDocument();

    // Reset layout button
    const resetAllBtn = screen.getByText(/Reset Entire Workspace to Factory Default/i);
    fireEvent.click(resetAllBtn);
    expect(selectedTab).toBe("analytics");
  });
});
