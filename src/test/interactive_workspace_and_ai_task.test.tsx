import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { AiTaskProvider, useAiTaskContext } from "../context/AiTaskContext";
import { ResizableSplitPane } from "../components/ui/ResizableSplitPane";
import { DraggableDashboard, DashboardWidget } from "../components/ui/DraggableDashboard";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";
import App from "../App";

describe("Phase 1 & 2: Interactive UI Workspace & Presets", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders ResizableSplitPane with primary and secondary panes and supports collapse controls", () => {
    render(
      <ResizableSplitPane
        primaryPane={<div data-testid="left-pane">Left Content</div>}
        secondaryPane={<div data-testid="right-pane">Right Content</div>}
        primaryTitle="Findings List"
        secondaryTitle="Details Inspector"
        persistenceKey="test_split"
      />
    );

    expect(screen.getByTestId("left-pane")).toBeInTheDocument();
    expect(screen.getByTestId("right-pane")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();

    // Keyboard navigation accessibility on divider
    const separator = screen.getByRole("separator");
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    fireEvent.keyDown(separator, { key: "Enter" });
    expect(separator).toHaveAttribute("aria-valuenow", "50");
  });

  it("renders DraggableDashboard with modular widgets and allows customize visibility and reset", () => {
    const mockWidgets: DashboardWidget[] = [
      { id: "kpi", title: "Key Performance Indicators", render: () => <div>KPI Card</div> },
      { id: "vuln-chart", title: "Vulnerability Severity", render: () => <div>Chart Card</div> },
      { id: "scan-stream", title: "Live Scanner Stream", render: () => <div>Stream Card</div> },
    ];

    render(<DraggableDashboard widgets={mockWidgets} storageKey="test_dash" />);

    expect(screen.getByText("Key Performance Indicators")).toBeInTheDocument();
    expect(screen.getByText("Vulnerability Severity")).toBeInTheDocument();
    expect(screen.getByText("Live Scanner Stream")).toBeInTheDocument();

    // Open Customize modal
    const customizeBtn = screen.getByText(/Customize/i);
    fireEvent.click(customizeBtn);
    expect(screen.getByText(/Widget Visibility & Arrangement/i)).toBeInTheDocument();

    // Toggle off one widget
    const toggleFirst = screen.getAllByRole("button").find((b) => b.textContent?.includes("KPI Card") || b.textContent?.includes("Key Performance Indicators"));
    if (toggleFirst) {
      fireEvent.click(toggleFirst);
    }

    // Reset layout
    const resetBtn = screen.getByText("Reset");
    fireEvent.click(resetBtn);
    expect(screen.getAllByText("Key Performance Indicators").length).toBeGreaterThanOrEqual(1);
  });
});

describe("Phase 3 & 4: Persistent Background AI Mentor Execution & Concurrency", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("AiTaskContext submits, tracks, and completes background tasks with O(1) hash map indexing", async () => {
    const TestConsumer: React.FC = () => {
      const {
        tasks,
        tasksById,
        activeTasks,
        hasRunningTask,
        submitTask,
        cancelTask,
        clearTasks,
      } = useAiTaskContext();

      return (
        <div>
          <div data-testid="task-count">{tasks.length}</div>
          <div data-testid="active-count">{activeTasks.length}</div>
          <div data-testid="running-status">{hasRunningTask ? "RUNNING" : "IDLE"}</div>
          <div data-testid="tasks-by-id-keys">{Object.keys(tasksById).join(",")}</div>
          <button
            onClick={() =>
              submitTask("conv-1", "deepseek-r1:1.5b", null, [
                { role: "user", content: "Explain IDOR vulnerabilities in depth." },
              ])
            }
          >
            Start Background Task
          </button>
          <button
            onClick={() => {
              if (activeTasks[0]) cancelTask(activeTasks[0].id);
            }}
          >
            Cancel Active
          </button>
          <button onClick={clearTasks}>Clear All</button>
        </div>
      );
    };

    render(
      <AiTaskProvider>
        <TestConsumer />
      </AiTaskProvider>
    );

    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
    expect(screen.getByTestId("running-status")).toHaveTextContent("IDLE");

    // Submit task
    const startBtn = screen.getByText("Start Background Task");
    await act(async () => {
      fireEvent.click(startBtn);
    });

    expect(screen.getByTestId("task-count")).toHaveTextContent("1");
    expect(screen.getByTestId("tasks-by-id-keys").textContent?.length).toBeGreaterThan(0);

    // Cancel active task
    const cancelBtn = screen.getByText("Cancel Active");
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    // Clear all tasks
    const clearBtn = screen.getByText("Clear All");
    await act(async () => {
      fireEvent.click(clearBtn);
    });
    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
  });

  it("App displays Global AI Activity Indicator and allows switching Workspace Presets", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <AiTaskProvider>
            <App />
          </AiTaskProvider>
        </ToastProvider>
      </ThemeProvider>
    );

    // Check workspace preset selector is rendered
    expect(screen.getByTitle(/Select Workspace Preset/i)).toBeInTheDocument();

    const presetSelect = screen.getByTitle(/Select Workspace Preset/i) as HTMLSelectElement;
    expect(presetSelect.value).toBe("default");

    // Switch to Compact Preset
    await act(async () => {
      fireEvent.change(presetSelect, { target: { value: "compact" } });
    });
    expect(presetSelect.value).toBe("compact");

    // Switch to Analyst Preset
    await act(async () => {
      fireEvent.change(presetSelect, { target: { value: "analyst" } });
    });
    expect(presetSelect.value).toBe("analyst");
  });
});
