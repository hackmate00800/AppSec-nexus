import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MultiTerminalWorkspace } from "../terminal/MultiTerminalWorkspace";
import { Target, AdapterOutput } from "../types";

// Mock Tauri core invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

const mockTargets: Target[] = [
  {
    id: "target-1",
    name: "Production Web App",
    primary_url: "https://app.corp.internal",
    created_at: new Date().toISOString(),
    scope: {
      allowed_hosts: ["app.corp.internal"],
      allowed_prefixes: ["https://app.corp.internal"],
      allowed_ports: [443],
      excluded_paths: [],
      allow_local_lab: false,
    },
  },
  {
    id: "target-2",
    name: "API Gateway",
    primary_url: "https://api.corp.internal",
    created_at: new Date().toISOString(),
    scope: {
      allowed_hosts: ["api.corp.internal"],
      allowed_prefixes: ["https://api.corp.internal"],
      allowed_ports: [443],
      excluded_paths: [],
      allow_local_lab: false,
    },
  },
];

describe("Dedicated Multi-Terminal Workspace & Tool Orchestration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd: string, args: any) => {
      if (cmd === "execute_tool_adapter") {
        const mockOutput: AdapterOutput = {
          tool_id: args.toolId,
          target_url: args.targetUrl,
          status: "Success",
          logs: [
            `[EXEC] Starting ${args.toolId} execution on ${args.targetUrl}`,
            `[DISCOVERY] Host is up (0.002s latency)`,
            `[FINDING] Potential information disclosure discovered on /robots.txt`,
            `[COMPLETE] Scan finished with 0 fatal errors`,
          ],
          findings: [
            {
              id: "find-term-1",
              target_id: args.targetId,
              title: "Information Disclosure via Robots.txt",
              severity: "Low",
              confidence: 90,
              affected_asset: "/robots.txt",
              evidence: "Disallowed: /admin",
              source_tool: args.toolId,
              tool_version: "1.0.0",
              remediation: "Audit robots.txt directives.",
              status: "New",
              created_at: new Date().toISOString(),
            },
          ],
          endpoints: [
            {
              id: "ep-term-1",
              target_id: args.targetId,
              url: `${args.targetUrl}/robots.txt`,
              method: "GET",
              status_code: 200,
              source: args.toolId,
              discovered_at: new Date().toISOString(),
            },
          ],
          artifacts: {},
          duration_ms: 1240,
        };
        return Promise.resolve(mockOutput);
      }
      return Promise.resolve(null);
    });
  });

  it("renders MultiTerminalWorkspace with default primary session and PID", () => {
    render(<MultiTerminalWorkspace targets={mockTargets} />);

    expect(screen.getByText("Multi-Terminal Orchestration & Tool Execution")).toBeInTheDocument();
    expect(screen.getAllByText(/Primary Terminal/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Type 'help' for terminal commands/)).toBeInTheDocument();
    expect(screen.getByText(/user@appsec-nexus:~\$/)).toBeInTheDocument();
  });

  it("allows creating a new concurrent terminal session", () => {
    render(<MultiTerminalWorkspace targets={mockTargets} />);

    const newSessBtn = screen.getByTitle("Create new terminal session");
    fireEvent.click(newSessBtn);

    // Now multiple sessions should exist
    expect(screen.getByText(/Primary Terminal/)).toBeInTheDocument();
    expect(screen.getAllByText(/Terminal/).length).toBeGreaterThanOrEqual(2);
  });

  it("allows switching layout modes between Single, Side-by-Side, and Stacked", () => {
    render(<MultiTerminalWorkspace targets={mockTargets} />);

    // Switch to Side-by-Side (creates a secondary session if only 1 exists)
    const sideBySideBtn = screen.getByTitle("Side-by-side vertical split view");
    fireEvent.click(sideBySideBtn);

    expect(screen.getByText("Pane 2:")).toBeInTheDocument();

    // Switch to Stacked
    const stackedBtn = screen.getByTitle("Stacked horizontal split view");
    fireEvent.click(stackedBtn);

    expect(screen.getByText("Pane 2:")).toBeInTheDocument();

    // Switch back to Single
    const singleBtn = screen.getByTitle("Single terminal view");
    fireEvent.click(singleBtn);

    expect(screen.queryByText("Pane 2:")).not.toBeInTheDocument();
  });

  it("executes CLI command prompt 'help', 'whoami', 'targets', and 'tools'", () => {
    render(<MultiTerminalWorkspace targets={mockTargets} />);

    const input = screen.getByPlaceholderText(/Type 'help', 'tools', 'targets'/);

    // 1. Run 'help'
    fireEvent.change(input, { target: { value: "help" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByText(/Available AppSec Terminal Commands:/)).toBeInTheDocument();

    // 2. Run 'whoami'
    fireEvent.change(input, { target: { value: "whoami" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByText(/operator: AppSec Security Analyst/)).toBeInTheDocument();

    // 3. Run 'targets'
    fireEvent.change(input, { target: { value: "targets" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByText(/Authorized Targets \(2\):/)).toBeInTheDocument();
  });

  it("executes a security tool adapter from the Quick Runner and logs stdout streams", async () => {
    const handleFindings = vi.fn();
    const handleEndpoints = vi.fn();

    render(
      <MultiTerminalWorkspace
        targets={mockTargets}
        onFindingsDiscovered={handleFindings}
        onEndpointsDiscovered={handleEndpoints}
      />
    );

    const runBtn = screen.getByTitle("Execute selected tool in current terminal session");
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Starting nmap execution on https:\/\/app\.corp\.internal/)).toBeInTheDocument();
      expect(screen.getByText(/Host is up/)).toBeInTheDocument();
      expect(screen.getByText(/Scan finished with 0 fatal errors/)).toBeInTheDocument();
      expect(screen.getByText(/Exit code: 0/)).toBeInTheDocument();
    });

    expect(handleFindings).toHaveBeenCalledTimes(1);
    expect(handleEndpoints).toHaveBeenCalledTimes(1);
  });

  it("allows filtering session logs via live search", () => {
    render(<MultiTerminalWorkspace targets={mockTargets} />);

    const searchInput = screen.getByPlaceholderText("Filter logs...");
    fireEvent.change(searchInput, { target: { value: "AppSec Multi-Terminal" } });

    expect(screen.getByText(/AppSec Multi-Terminal Environment initialized/)).toBeInTheDocument();

    // Searching something non-existent shows empty buffer message
    fireEvent.change(searchInput, { target: { value: "NONEXISTENT_FILTER_STRING" } });
    expect(screen.getByText(/No lines matching current filter/)).toBeInTheDocument();
  });

  it("allows clearing terminal buffer and renaming session", () => {
    render(<MultiTerminalWorkspace targets={mockTargets} />);

    // Clear buffer
    const clearBtn = screen.getByTitle("Clear terminal screen");
    fireEvent.click(clearBtn);

    expect(screen.getByText(/Terminal buffer cleared/)).toBeInTheDocument();

    // Rename session
    const renameBtn = screen.getByTitle("Rename session");
    fireEvent.click(renameBtn);

    const renameInput = screen.getByDisplayValue("Primary Terminal");
    fireEvent.change(renameInput, { target: { value: "Audited Production Console" } });
    fireEvent.click(screen.getByText("Save"));

    expect(screen.getAllByText("Audited Production Console").length).toBeGreaterThanOrEqual(1);
  });
});
