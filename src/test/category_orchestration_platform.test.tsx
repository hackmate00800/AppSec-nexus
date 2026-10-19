import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryWorkflowView } from "../categories/CategoryWorkflowView";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";
import { Target, Finding, ToolAdapterMetadata, WorkflowJob, AdapterOutput } from "../types";

// Mock Tauri IPC
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe("Category-Specific Security Tool Orchestration Suite", () => {
  const mockTargets: Target[] = [
    {
      id: "tgt-web-1",
      name: "Staging Portal",
      primary_url: "https://staging.internal.corp",
      created_at: new Date().toISOString(),
      scope: {
        allowed_hosts: ["staging.internal.corp", "api.internal.corp"],
        allowed_prefixes: ["/api/v2"],
        allowed_ports: [443, 8443],
        excluded_paths: ["/logout"],
        allow_local_lab: true,
      },
    },
    {
      id: "tgt-api-2",
      name: "Production Gateway",
      primary_url: "https://api.gateway.corp",
      created_at: new Date().toISOString(),
      scope: {
        allowed_hosts: ["api.gateway.corp"],
        allowed_prefixes: [],
        allowed_ports: [443],
        excluded_paths: [],
        allow_local_lab: false,
      },
    },
  ];

  const mockFindings: Finding[] = [
    {
      id: "find-1",
      target_id: "tgt-web-1",
      title: "SQL Injection in User Search Parameter",
      severity: "Critical",
      confidence: 95,
      affected_asset: "https://staging.internal.corp/search?q=",
      evidence: "HTTP 500: syntax error in SQL statement near '1''",
      source_tool: "nuclei",
      tool_version: "3.11.1",
      cwe: "CWE-89",
      remediation: "Use parameterized queries or prepared statements.",
      status: "NeedsValidation",
      created_at: new Date().toISOString(),
    },
  ];

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
      description: "Fast and customizable template-based vulnerability scanner.",
      documentation_url: "https://nuclei.projectdiscovery.io/",
      requires_docker: false,
    },
    {
      id: "katana",
      name: "ProjectDiscovery Katana",
      version: "1.8.0",
      category: "Web & API Security",
      integration_type: "cli_process",
      capabilities: ["crawling"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\AppSec\\tools\\bin\\katana.exe",
      is_available: true,
      is_enabled: true,
      install_source: "Local Portable Binary (tools/bin)",
      description: "High-performance next-generation web crawler.",
      documentation_url: "https://github.com/projectdiscovery/katana",
      requires_docker: false,
    },
    {
      id: "schemathesis",
      name: "Schemathesis API Fuzzer",
      version: "4.32.0",
      category: "Web & API Security",
      integration_type: "cli_process",
      capabilities: ["vuln_scan"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\Python\\Scripts\\schemathesis.exe",
      is_available: true,
      is_enabled: true,
      install_source: "Python pip (schemathesis)",
      description: "Property-based API contract testing and fuzzing tool for OpenAPI and GraphQL.",
      documentation_url: "https://schemathesis.readthedocs.io",
      requires_docker: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd: string, args?: any) => {
      switch (cmd) {
        case "get_tool_adapters":
          return mockAdapters;
        case "test_tool_health":
          return {
            healthy: true,
            detection_state: "installed_and_ready",
            detected_version: "v3.11.1",
            message: "Binary verified responsive and operational.",
            checked_at: new Date().toISOString(),
            latency_ms: 18,
          };
        case "toggle_tool_adapter_enabled":
          return true;
        case "start_workflow_job":
          const job: WorkflowJob = {
            job_id: "job-cat-test-1",
            workflow_id: args.workflowId,
            workflow_name: "Web Application Vulnerability Suite",
            target_id: args.targetId,
            target_url: args.targetUrl,
            status: "running" as any,
            step_runs: [],
            started_at: new Date().toISOString(),
            duration_ms: 0,
            total_findings: 1,
            logs: ["[*] Automated Web Pentest Suite started.", "[+] Katana crawling completed."],
          };
          return job;
        case "execute_orchestration_tool":
          const out: AdapterOutput = {
            tool_id: args.toolId,
            target_url: args.input.target_url,
            status: "Success",
            logs: ["[+] Tool execution completed successfully in 245 ms."],
            findings: [],
            endpoints: [],
            artifacts: {},
            duration_ms: 245,
          };
          return out;
        case "update_finding_status":
          return true;
        default:
          return null;
      }
    });
  });

  it("renders target scoping banner with authorized hosts, ports, and scope status", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Active Scoped Target:")).toBeInTheDocument();
    expect(screen.getByText("Authorized Scope Enforced")).toBeInTheDocument();
    expect(screen.getByText("https://staging.internal.corp")).toBeInTheDocument();
    expect(screen.getByText(/Allowed Hosts: staging.internal.corp, api.internal.corp/)).toBeInTheDocument();
  });

  it("switches target via dropdown and updates active asset scope", async () => {
    const handleSelectTarget = vi.fn();
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
            onSelectTarget={handleSelectTarget}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    const select = screen.getByTestId("select-active-target");
    fireEvent.change(select, { target: { value: "tgt-api-2" } });
    expect(handleSelectTarget).toHaveBeenCalledWith(mockTargets[1]);
  });

  it("loads and displays live category tool adapters with install sources and health testing", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    // Switch to Toolchain tab
    fireEvent.click(screen.getByTestId("tab-tools"));

    await waitFor(() => {
      expect(screen.getByText("ProjectDiscovery Nuclei")).toBeInTheDocument();
      expect(screen.getByText("ProjectDiscovery Katana")).toBeInTheDocument();
    });

    // Check install source chip
    expect(screen.getAllByText("Local Portable Binary (tools/bin)")[0]).toBeInTheDocument();

    // Trigger Health Test on Nuclei
    const testHealthButtons = screen.getAllByRole("button", { name: /Test Health/i });
    fireEvent.click(testHealthButtons[0]);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("test_tool_health", { toolId: "nuclei" });
      expect(screen.getByText(/Binary verified responsive/i)).toBeInTheDocument();
      expect(screen.getByText("18 ms")).toBeInTheDocument();
    });
  });

  it("toggles tool enabled state with instant SQLite persistence", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId("tab-tools"));

    await waitFor(() => {
      expect(screen.getAllByText("Enabled")[0]).toBeInTheDocument();
    });

    const toggleBtn = screen.getAllByRole("button", { name: /Enabled/i })[0];
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("toggle_tool_adapter_enabled", {
        toolId: "nuclei",
        enabled: false,
      });
    });
  });

  it("launches category assessment pipeline with authorized target context", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId("tab-tools"));

    const runPipelineBtn = screen.getByRole("button", { name: /Run Full Category Suite/i });
    expect(runPipelineBtn).toBeInTheDocument();

    fireEvent.click(runPipelineBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("start_workflow_job", {
        workflowId: "wf_web_pipeline",
        targetId: "tgt-web-1",
        targetUrl: "https://staging.internal.corp",
      });
      expect(screen.getByText(/Active Job: Web Application Vulnerability Suite/i)).toBeInTheDocument();
      expect(screen.getByText(/Status: running/i)).toBeInTheDocument();
    });
  });

  it("executes an individual tool in modal drawer and captures logs", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId("tab-tools"));

    await waitFor(() => {
      expect(screen.getByText("ProjectDiscovery Nuclei")).toBeInTheDocument();
    });

    const runButtons = screen.getAllByRole("button", { name: /Run Tool/i });
    fireEvent.click(runButtons[0]);

    // Verify modal drawer opened
    expect(screen.getByText("Execute ProjectDiscovery Nuclei")).toBeInTheDocument();

    // Click execute inside modal
    const executeModalBtn = screen.getByTestId("btn-modal-execute-tool");
    fireEvent.click(executeModalBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("execute_orchestration_tool", expect.any(Object));
      expect(screen.getByText(/Tool execution completed successfully in 245 ms/i)).toBeInTheDocument();
    });
  });

  it("parses OpenAPI JSON spec and displays discovered endpoints for API category", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="api"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId("tab-tools"));

    // Verify Postman & OpenAPI Spec Importer section exists
    expect(screen.getByText("Postman & OpenAPI Spec Importer")).toBeInTheDocument();

    const sampleOpenApi = JSON.stringify({
      openapi: "3.0.0",
      paths: {
        "/api/v1/users": {
          get: { summary: "List users" },
          post: { summary: "Create user" },
        },
        "/api/v1/invoices/{id}": {
          delete: { summary: "Delete invoice" },
        },
      },
    });

    const textarea = screen.getByTestId("textarea-api-spec");
    fireEvent.change(textarea, { target: { value: sampleOpenApi } });

    const parseBtn = screen.getByTestId("btn-parse-api-spec");
    fireEvent.click(parseBtn);

    await waitFor(() => {
      expect(screen.getByText("Successfully parsed 3 API endpoints from spec.")).toBeInTheDocument();
      expect(screen.getAllByText("/api/v1/users")[0]).toBeInTheDocument();
      expect(screen.getByText("/api/v1/invoices/{id}")).toBeInTheDocument();
      expect(screen.getByText("— List users")).toBeInTheDocument();
    });
  });

  it("selects live finding from database, runs category validation, and saves status to SQLite", async () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
            findings={mockFindings}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    // Switch to Verification tab
    fireEvent.click(screen.getByTestId("tab-validator"));

    // Verify live finding selector exists
    expect(screen.getByText("Evaluate Live Finding:")).toBeInTheDocument();

    const findingSelect = screen.getByTestId("select-live-finding");
    fireEvent.change(findingSelect, { target: { value: "find-1" } });

    // Inputs should be auto-populated
    expect((screen.getByTestId("input-finding-title") as HTMLInputElement).value).toBe(
      "SQL Injection in User Search Parameter"
    );
    expect((screen.getByTestId("input-affected-asset") as HTMLInputElement).value).toBe(
      "https://staging.internal.corp/search?q="
    );

    // Run validation
    fireEvent.click(screen.getByTestId("btn-run-category-validation"));

    expect(screen.getByTestId("validation-result-panel")).toBeInTheDocument();
    expect(screen.getByTestId("result-status-badge")).toHaveTextContent("Confirmed");

    // Save status to SQLite
    const saveBtn = screen.getByRole("button", { name: /Save Status to Finding Record/i });
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_finding_status", {
        findingId: "find-1",
        status: "Confirmed",
      });
      expect(screen.getByText(/Successfully updated finding status to 'Confirmed'/i)).toBeInTheDocument();
    });
  });

  it("exports comprehensive category assessment report in markdown format", () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue("blob:http://localhost/report-blob");
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <ThemeProvider>
        <ToastProvider>
          <CategoryWorkflowView
            category="web"
            targets={mockTargets}
            selectedTarget={mockTargets[0]}
            findings={mockFindings}
          />
        </ToastProvider>
      </ThemeProvider>
    );

    const exportBtn = screen.getByRole("button", { name: /Export Report/i });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });
});
