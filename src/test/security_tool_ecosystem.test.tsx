import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrchestrationHub } from "../orchestration/OrchestrationHub";
import { ToolAdapterMetadata, SystemResourceStatus, Target } from "../types";

// Mock Tauri invoke API
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe("Security Tool Ecosystem Integration Suite", () => {
  const mockTargets: Target[] = [
    {
      id: "tgt-1",
      name: "Acme Web Target",
      primary_url: "https://example.com",
      created_at: new Date().toISOString(),
      scope: {
        allowed_hosts: ["example.com"],
        allowed_prefixes: [],
        allowed_ports: [80, 443],
        excluded_paths: [],
        allow_local_lab: true,
      },
    },
  ];

  const mockSystemResources: SystemResourceStatus = {
    os: "Windows 11 (x64)",
    disk_total_gb: 511.23,
    disk_free_gb: 16.08,
    disk_used_gb: 495.15,
    disk_warning: true,
    ram_total_mb: 7977,
    ram_avail_mb: 780,
    ram_used_mb: 7197,
    ram_warning: true,
    warnings: [
      "Low Host Storage: C:\\ has only 16.08 GB free space remaining (minimum 20.0 GB recommended for deep scans).",
      "Low Host Memory: Only 780 MB physical RAM currently free (heavy tools should run with reduced concurrency).",
    ],
  };

  const mockAdapters: ToolAdapterMetadata[] = [
    {
      id: "nuclei",
      name: "ProjectDiscovery Nuclei",
      version: "3.11.1",
      category: "Web & API Security",
      integration_type: "cli_process",
      capabilities: ["vuln_scan", "http_probing"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\AppSec\\tools\\bin\\nuclei.exe",
      is_available: true,
      is_enabled: true,
      install_source: "Local Portable Binary (tools/bin)",
      description: "Fast and customizable vulnerability scanner based on simple YAML DSL.",
      documentation_url: "https://docs.projectdiscovery.io/tools/nuclei",
      requires_docker: false,
    },
    {
      id: "semgrep",
      name: "Semgrep SAST",
      version: "1.181.0",
      category: "Source Code Security",
      integration_type: "cli_process",
      capabilities: ["sast_scan"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\Users\\user\\AppData\\Roaming\\Python\\Python314\\Scripts\\semgrep.exe",
      is_available: true,
      is_enabled: true,
      install_source: "Python pip (semgrep)",
      description: "Fast, open-source static analysis engine for finding bugs and enforcing code standards.",
      documentation_url: "https://semgrep.dev/docs",
      requires_docker: false,
    },
    {
      id: "tshark",
      name: "Wireshark TShark",
      version: "4.6.9",
      category: "Network Security",
      integration_type: "cli_process",
      capabilities: ["passive_audit"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\Program Files\\Wireshark\\tshark.exe",
      is_available: true,
      is_enabled: true,
      install_source: "Wireshark & Npcap 1.88 Driver",
      description: "Network packet capture and dissection utility powered by Npcap.",
      documentation_url: "https://tshark.dev",
      requires_docker: false,
    },
    {
      id: "jadx",
      name: "Skylot JADX Decompiler",
      version: "1.5.6",
      category: "Android Security",
      integration_type: "cli_process",
      capabilities: ["passive_audit", "sast_scan"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\AppSec\\tools\\jadx\\bin\\jadx.bat",
      is_available: true,
      is_enabled: true,
      install_source: "Portable JADX 1.5.6 + JDK 21",
      description: "Dex to Java decompiler and Android package auditor.",
      documentation_url: "https://github.com/skylot/jadx",
      requires_docker: false,
    },
    {
      id: "docker",
      name: "Docker Container Engine",
      version: "29.1.3",
      category: "Runtime & Lab Security",
      integration_type: "docker_container",
      capabilities: ["vuln_scan"],
      detection_state: "detected_unavailable",
      resolved_path: "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
      is_available: false,
      is_enabled: false,
      install_source: "Docker Desktop CLI & Daemon",
      description: "Container runtime for launching isolated target labs.",
      documentation_url: "https://docs.docker.com",
      requires_docker: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === "get_system_resource_status") {
        return Promise.resolve(mockSystemResources);
      }
      if (cmd === "get_tool_adapters") {
        return Promise.resolve(mockAdapters);
      }
      if (cmd === "get_extensions_v1") {
        return Promise.resolve([]);
      }
      if (cmd === "get_workflows") {
        return Promise.resolve([]);
      }
      if (cmd === "get_workflow_jobs") {
        return Promise.resolve([]);
      }
      if (cmd === "toggle_tool_adapter_enabled") {
        return Promise.resolve();
      }
      if (cmd === "run_tool_health_check") {
        return Promise.resolve({
          healthy: true,
          detection_state: "installed_and_ready",
          detected_version: "3.11.1",
          message: "Nuclei responded cleanly",
          checked_at: new Date().toISOString(),
          latency_ms: 42,
        });
      }
      if (cmd === "execute_tool_adapter") {
        return Promise.resolve({
          tool_id: args.toolId,
          target_url: args.targetUrl,
          status: "Success",
          logs: ["Starting scan...", "Target within authorized scope", "Finished scan in 120ms"],
          findings: [
            {
              id: "f-1",
              target_id: args.targetId,
              title: "Missing Content-Security-Policy Header",
              severity: "Low",
              confidence: 0.95,
              affected_asset: args.targetUrl,
              evidence: "CSP header absent from HTTP response",
              source_tool: args.toolId,
              tool_version: "3.11.1",
              remediation: "Configure Content-Security-Policy HTTP response header",
              status: "NeedsValidation",
              created_at: new Date().toISOString(),
            },
          ],
          endpoints: [],
          artifacts: {},
          duration_ms: 120,
        });
      }
      return Promise.resolve();
    });
  });

  it("renders the Physical Hardware Telemetry Banner with storage & RAM gauges", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={() => {}}
      />
    );

    // Verify title and hardware telemetry elements
    await waitFor(() => {
      expect(screen.getByText(/Universal Security Tool & Ecosystem Orchestrator/i)).toBeInTheDocument();
      expect(screen.getByText(/Host Physical Hardware Telemetry/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/16.08/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/780/)[0]).toBeInTheDocument();
    expect(screen.getByText(/Active Hardware Boundaries & Safe Execution Policy/i)).toBeInTheDocument();
  });

  it("renders all 5 domain category filter tabs and filters tools accordingly", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("ProjectDiscovery Nuclei")).toBeInTheDocument();
      expect(screen.getByText("Semgrep SAST")).toBeInTheDocument();
    });

    // Click Web & API domain filter
    const webTab = screen.getByTestId("domain-tab-web");
    fireEvent.click(webTab);

    // Nuclei should be visible, Semgrep should be filtered out
    expect(screen.getByText("ProjectDiscovery Nuclei")).toBeInTheDocument();
    expect(screen.queryByText("Semgrep SAST")).not.toBeInTheDocument();

    // Click SAST & Secrets domain filter
    const sastTab = screen.getByTestId("domain-tab-sast");
    fireEvent.click(sastTab);

    // Semgrep should be visible, Nuclei should be filtered out
    expect(screen.getByText("Semgrep SAST")).toBeInTheDocument();
    expect(screen.queryByText("ProjectDiscovery Nuclei")).not.toBeInTheDocument();
  });

  it("displays packaging and install source chips for each tool", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Local Portable Binary (tools/bin)")).toBeInTheDocument();
      expect(screen.getByText("Python pip (semgrep)")).toBeInTheDocument();
      expect(screen.getByText("Wireshark & Npcap 1.88 Driver")).toBeInTheDocument();
      expect(screen.getByText("Portable JADX 1.5.6 + JDK 21")).toBeInTheDocument();
    });
  });

  it("toggles tool enablement and invokes toggle_tool_adapter_enabled IPC", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("toggle-tool-nuclei")).toBeInTheDocument();
    });

    // Click the toggle button for Nuclei
    const nucleiToggle = screen.getByTestId("toggle-tool-nuclei");
    fireEvent.click(nucleiToggle);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("toggle_tool_adapter_enabled", {
        toolId: "nuclei",
        enabled: false,
      });
    });
  });

  it("runs tool health check when clicking Health button", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("health-tool-nuclei")).toBeInTheDocument();
    });

    const nucleiHealth = screen.getByTestId("health-tool-nuclei");
    fireEvent.click(nucleiHealth);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("run_tool_health_check", {
        toolId: "nuclei",
      });
      expect(screen.getByText(/Verified Responsive/i)).toBeInTheDocument();
    });
  });

  it("opens Windows Setup Guide modal with actionable PowerShell commands", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("guide-tool-nuclei")).toBeInTheDocument();
    });

    const nucleiGuide = screen.getByTestId("guide-tool-nuclei");
    fireEvent.click(nucleiGuide);

    await waitFor(() => {
      expect(screen.getByText(/Setup Guide: ProjectDiscovery Nuclei/i)).toBeInTheDocument();
      expect(screen.getByText(/Windows PowerShell Installation Command/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Copy Command/i })).toBeInTheDocument();
    });
  });

  it("opens Execute Tool modal and safely runs tool assessment against authorized target", async () => {
    const navigateToFindingsMock = vi.fn();

    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={() => {}}
        onNavigateToFindings={navigateToFindingsMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("run-tool-nuclei")).toBeInTheDocument();
    });

    // Click "Run Tool"
    const runToolBtn = screen.getByTestId("run-tool-nuclei");
    fireEvent.click(runToolBtn);

    // Modal appears
    await waitFor(() => {
      expect(screen.getByText(/Execute Tool: ProjectDiscovery Nuclei/i)).toBeInTheDocument();
      expect(screen.getByText(/Authorization Enforced/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Run Safe Assessment/i })).toBeInTheDocument();
    });

    // Click "Run Safe Assessment"
    const runAssessmentBtn = screen.getByRole("button", { name: /Run Safe Assessment/i });
    fireEvent.click(runAssessmentBtn);

    // Verify invocation and results console
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "execute_tool_adapter",
        expect.objectContaining({
          toolId: "nuclei",
          targetId: "tgt-1",
          targetUrl: "https://example.com",
        })
      );
      expect(screen.getByText(/Starting scan.../i)).toBeInTheDocument();
      expect(screen.getByText(/View Findings \(1\)/i)).toBeInTheDocument();
    });

    // Click "View Findings"
    const viewFindingsBtn = screen.getByText(/View Findings \(1\)/i);
    fireEvent.click(viewFindingsBtn);
    expect(navigateToFindingsMock).toHaveBeenCalled();
  });
});
