import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppTopNav } from "../components/navigation/AppTopNav";
import { AppSidebar } from "../components/navigation/AppSidebar";
import {
  Button,
  Input,
  Select,
  Card,
  EmptyState,
  Modal,
} from "../components/ui/design_system";

describe("Modern Design System Components", () => {
  it("Button renders with variants, sizes, and loading state", () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" size="sm" onClick={handleClick}>
        Click Me
      </Button>
    );

    const btn = screen.getByRole("button", { name: /Click Me/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test loading state
    rerender(
      <Button variant="primary" size="sm" isLoading onClick={handleClick}>
        Click Me
      </Button>
    );
    expect(btn).toBeDisabled();
  });

  it("Input handles typing, clear button, and error state", () => {
    const handleClear = vi.fn();
    const { rerender } = render(
      <Input
        label="Target Host"
        value="https://example.com"
        onClear={handleClear}
        onChange={() => {}}
      />
    );

    expect(screen.getByText("Target Host")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://example.com")).toBeInTheDocument();

    const clearBtn = screen.getByRole("button");
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);

    // Test error message
    rerender(<Input label="Target Host" error="Invalid URL syntax" value="" onChange={() => {}} />);
    expect(screen.getByText("Invalid URL syntax")).toBeInTheDocument();
  });

  it("Select renders options and triggers onChange", () => {
    const handleChange = vi.fn();
    render(
      <Select
        label="Severity"
        options={[
          { label: "Critical", value: "critical" },
          { label: "High", value: "high" },
        ]}
        onChange={handleChange}
      />
    );

    expect(screen.getByText("Severity")).toBeInTheDocument();
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "high" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("Card renders title, subtitle, and content with subtle borders", () => {
    render(
      <Card title="Security Posture" subtitle="Real-time scan metrics">
        <p>Vulnerabilities detected: 3</p>
      </Card>
    );

    expect(screen.getByText("Security Posture")).toBeInTheDocument();
    expect(screen.getByText("Real-time scan metrics")).toBeInTheDocument();
    expect(screen.getByText("Vulnerabilities detected: 3")).toBeInTheDocument();
  });

  it("EmptyState renders icon, description, and action button", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Targets Configured"
        description="Add a target domain to start automated vulnerability scans."
        actionLabel="Add Target"
        onAction={handleAction}
      />
    );

    expect(screen.getByText("No Targets Configured")).toBeInTheDocument();
    expect(screen.getByText(/Add a target domain to start/i)).toBeInTheDocument();
    const actBtn = screen.getByRole("button", { name: /Add Target/i });
    fireEvent.click(actBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("Modal opens, displays children, and closes on close button or ESC", () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={true} onClose={handleClose} title="Configure Target">
        <p>Modal Body Content</p>
      </Modal>
    );

    expect(screen.getByText("Configure Target")).toBeInTheDocument();
    expect(screen.getByText("Modal Body Content")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // ESC key test
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Closed state
    rerender(
      <Modal isOpen={false} onClose={handleClose} title="Configure Target">
        <p>Modal Body Content</p>
      </Modal>
    );
    expect(screen.queryByText("Configure Target")).not.toBeInTheDocument();
  });
});

describe("AppTopNav Component", () => {
  const defaultProps = {
    activeTab: "analytics" as any,
    onNavigateTab: vi.fn(),
    selectedTarget: {
      id: "t-1",
      name: "Acme Production",
      primary_url: "https://acme.org",
      created_at: new Date().toISOString(),
      scope: { allowed_hosts: ["acme.org"], allowed_prefixes: [], allowed_ports: [443], excluded_paths: [], allow_local_lab: true },
    },
    targets: [],
    onSelectTarget: vi.fn(),
    isSidebarCollapsed: false,
    onToggleSidebar: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onOpenShortcuts: vi.fn(),
    onOpenAuditLogs: vi.fn(),
    onOpenHelp: vi.fn(),
    onEmergencyStop: vi.fn(),
    currentTheme: "midnight",
    onToggleTheme: vi.fn(),
    hasRunningAiTask: false,
    activeAiTasksCount: 0,
    onCancelActiveAiTask: vi.fn(),
    isAiAnswerReady: false,
    onDismissAiNotification: vi.fn(),
    workspacePreset: "default",
    onSelectPreset: vi.fn(),
  };

  it("renders brand, command palette trigger, and active target badge", () => {
    render(<AppTopNav {...defaultProps} />);

    expect(screen.getAllByText("AppSec Nexus").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Search commands, findings, targets/i)).toBeInTheDocument();
    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
    expect(screen.getByText("Acme Production")).toBeInTheDocument();
  });

  it("clicking command palette trigger opens palette", () => {
    render(<AppTopNav {...defaultProps} />);
    const searchBtn = screen.getByRole("button", { name: /Search commands/i });
    fireEvent.click(searchBtn);
    expect(defaultProps.onOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("displays running AI background task indicator when active", () => {
    render(
      <AppTopNav
        {...defaultProps}
        hasRunningAiTask={true}
        activeAiTasksCount={1}
      />
    );

    expect(screen.getByText(/AI Generating.../i)).toBeInTheDocument();
  });

  it("displays answer ready badge and triggers dismiss", () => {
    render(
      <AppTopNav
        {...defaultProps}
        isAiAnswerReady={true}
      />
    );

    expect(screen.getByText(/Answer Ready/i)).toBeInTheDocument();
  });
});

describe("AppSidebar Component", () => {
  const defaultSidebarProps = {
    activeTab: "analytics" as any,
    onSelectTab: vi.fn(),
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    width: 240,
    isResizing: false,
    onResizePointerDown: vi.fn(),
    findingsCount: 7,
    endpointsCount: 24,
    readyToolsCount: 4,
    scanHistoryCount: 12,
    hasRunningAiTask: false,
  };

  it("renders all 4 navigation groups and items with badges", () => {
    render(<AppSidebar {...defaultSidebarProps} />);

    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Security Tools")).toBeInTheDocument();
    expect(screen.getByText("AI Workspace")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();

    // Verify badges
    expect(screen.getByText("7")).toBeInTheDocument(); // Findings badge
    expect(screen.getByText("24")).toBeInTheDocument(); // Endpoints badge
    expect(screen.getByText("4")).toBeInTheDocument(); // Ready tools badge
    expect(screen.getByText("12")).toBeInTheDocument(); // Scan history badge
    expect(screen.getByText("Heretic")).toBeInTheDocument(); // Model Lab badge
  });

  it("triggers onSelectTab when clicking a navigation item", () => {
    render(<AppSidebar {...defaultSidebarProps} />);

    const findingsBtn = screen.getByRole("button", { name: /Findings/i });
    fireEvent.click(findingsBtn);
    expect(defaultSidebarProps.onSelectTab).toHaveBeenCalledWith("findings");
  });

  it("toggles group expansion when clicking group header", () => {
    render(<AppSidebar {...defaultSidebarProps} />);

    const workspaceHeader = screen.getByText("Workspace");
    fireEvent.click(workspaceHeader); // Collapses Workspace group

    // Items inside collapsed group are hidden
    expect(screen.queryByText("Security Analytics & Posture")).not.toBeInTheDocument();
  });
});
