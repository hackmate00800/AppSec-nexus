import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrchestrationHub } from "../orchestration/OrchestrationHub";
import { CategoryWorkflowView } from "../categories/CategoryWorkflowView";
import { ToolAdapterMetadata, Target, AdapterOutput } from "../types";

// Mock Tauri invoke API
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe("Comprehensive External Tools Integration Suite", () => {
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

  const mockAdapters: ToolAdapterMetadata[] = [
    {
      id: "baseline",
      name: "Native Baseline Security Checks",
      version: "1.0.0",
      category: "Passive / Headers / Cookies",
      integration_type: "native_engine",
      capabilities: ["passive_audit", "http_probing"],
      detection_state: "installed_and_ready",
      resolved_path: "internal://rust/native_baseline",
      is_available: true,
      is_enabled: true,
      install_source: "Built-in Native Rust Engine",
      description: "In-process Rust security auditor analyzing HTTP response headers and TLS certificates.",
      documentation_url: "https://cheatsheetseries.owasp.org",
      requires_docker: false,
    },
    {
      id: "openapi",
      name: "OpenAPI & Swagger Security Auditor",
      version: "3.1.0",
      category: "API Security & Schema Testing",
      integration_type: "native_engine",
      capabilities: ["passive_audit", "http_probing", "vuln_scan"],
      detection_state: "installed_and_ready",
      resolved_path: "internal://rust/native_openapi",
      is_available: true,
      is_enabled: true,
      install_source: "Built-in Native OpenAPI & Swagger Security Engine",
      description: "Discovers and audits OpenAPI v3 and Swagger 2.0 specifications for missing auth and leaks.",
      documentation_url: "https://owasp.org/www-project-api-security/",
      requires_docker: false,
    },
    {
      id: "postman",
      name: "Postman CLI & Collection Runner",
      version: "6.1.0",
      category: "API Security & Testing",
      integration_type: "cli_process",
      capabilities: ["http_probing", "vuln_scan"],
      detection_state: "installed_and_ready",
      resolved_path: "internal://rust/native_postman_runner",
      is_available: true,
      is_enabled: true,
      install_source: "Postman CLI / Newman / Native Collection Runner",
      description: "Executes Postman collections and API security assertions against targets.",
      documentation_url: "https://learning.postman.com",
      requires_docker: false,
    },
    {
      id: "owasp_zap",
      name: "OWASP ZAP (Zed Attack Proxy)",
      version: "2.15.0",
      category: "Web Application Security Scanner",
      integration_type: "cli_process",
      capabilities: ["vuln_scan", "crawling"],
      detection_state: "installed_and_ready",
      resolved_path: "http://127.0.0.1:8080 (ZAP API)",
      is_available: true,
      is_enabled: true,
      install_source: "OWASP ZAP Desktop / Daemon API (:8080) / Docker",
      description: "Connects via ZAP REST API daemon, headless CLI baseline scanner, or GUI proxy.",
      documentation_url: "https://www.zaproxy.org/docs/",
      requires_docker: false,
    },
    {
      id: "nmap",
      name: "Nmap Network Scanner",
      version: "7.92",
      category: "Port & Service Discovery",
      integration_type: "cli_process",
      capabilities: ["port_scan", "tech_detection"],
      detection_state: "installed_and_ready",
      resolved_path: "C:\\AppSec\\tools\\bin\\nmap\\nmap-7.92\\nmap.exe",
      is_available: true,
      is_enabled: true,
      install_source: "Local Portable Binary (tools/bin)",
      description: "Enterprise network discovery and service auditing tool with Npcap support.",
      documentation_url: "https://nmap.org",
      requires_docker: false,
    },
  ];

  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "get_tool_adapters") {
        return mockAdapters;
      }
      if (cmd === "get_system_resource_status") {
        return {
          os: "Windows 11 (x64)",
          disk_total_gb: 512,
          disk_free_gb: 50,
          disk_used_gb: 462,
          disk_warning: false,
          ram_total_mb: 16000,
          ram_avail_mb: 8000,
          ram_used_mb: 8000,
          ram_warning: false,
          warnings: [],
        };
      }
      if (cmd === "get_extensions_v1" || cmd === "get_workflows" || cmd === "get_workflow_jobs") {
        return [];
      }
      if (cmd === "execute_tool_adapter") {
        const out: AdapterOutput = {
          tool_id: args.toolId,
          target_url: args.targetUrl,
          status: "Success",
          logs: [
            `[*] Initiated ${args.toolId} scan against ${args.targetUrl}`,
            `[+] Identified 1 potential security finding.`,
          ],
          findings: [
            {
              id: "fnd-mock-1",
              target_id: args.targetId,
              title: "Sensitive Endpoint Missing Authentication: GET /admin/users",
              severity: "High",
              confidence: 90,
              affected_asset: `${args.targetUrl}/admin/users`,
              evidence: "OpenAPI route /admin/users has no security scheme requirement",
              source_tool: args.toolId,
              tool_version: "3.1.0",
              cwe: "CWE-306",
              remediation: "Attach OAuth2 / Bearer authorization requirement.",
              status: "New",
              created_at: new Date().toISOString(),
            },
          ],
          endpoints: [
            {
              id: "ep-mock-1",
              target_id: args.targetId,
              url: `${args.targetUrl}/admin/users`,
              method: "GET",
              status_code: 200,
              content_type: "application/json",
              source: args.toolId,
              discovered_at: new Date().toISOString(),
            },
          ],
          artifacts: { findings_count: "1" },
          duration_ms: 125,
        };
        return out;
      }
      return null;
    });
  });

  it("renders priority Web and API security tools including OpenAPI, Postman, ZAP, and Nmap", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={vi.fn()}
        onNavigateToFindings={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("OpenAPI & Swagger Security Auditor")).toBeInTheDocument();
      expect(screen.getByText("Postman CLI & Collection Runner")).toBeInTheDocument();
      expect(screen.getByText("OWASP ZAP (Zed Attack Proxy)")).toBeInTheDocument();
      expect(screen.getByText("Nmap Network Scanner")).toBeInTheDocument();
    });
  });

  it("opens tool execution modal and triggers assessment with AI Mentor explain integration", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={vi.fn()}
        onNavigateToFindings={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("OpenAPI & Swagger Security Auditor")).toBeInTheDocument();
    });

    // Find and click the Run Tool button for OpenAPI
    const openapiRunBtn = screen.getByTestId("run-tool-openapi");
    expect(openapiRunBtn).toBeInTheDocument();
    fireEvent.click(openapiRunBtn);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByText(/execute tool:/i)).toBeInTheDocument();
    });

    // Click "Run Safe Assessment" inside modal
    const executeModalBtn = screen.getByRole("button", { name: /run safe assessment/i });
    fireEvent.click(executeModalBtn);

    // Verify execute_tool_adapter was invoked
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "execute_tool_adapter",
        expect.objectContaining({
          targetId: "tgt-1",
          targetUrl: "https://example.com",
        })
      );
    });

    // Verify "Explain with AI Mentor" button is rendered and functional
    await waitFor(() => {
      expect(screen.getByText(/explain with ai mentor/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/explain with ai mentor/i));

    // Verify custom event 'appsec-ai-mentor-query' was dispatched
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "appsec-ai-mentor-query",
      })
    );
  });

  it("filters tools correctly when switching between Web and Network category tabs", async () => {
    render(
      <OrchestrationHub
        targets={mockTargets}
        selectedTargetId="tgt-1"
        onSelectTarget={vi.fn()}
        onNavigateToFindings={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("OpenAPI & Swagger Security Auditor")).toBeInTheDocument();
      expect(screen.getByText("Nmap Network Scanner")).toBeInTheDocument();
    });

    // Switch to Web & API tab
    const webTab = screen.getByTestId("domain-tab-web");
    fireEvent.click(webTab);

    // OpenAPI should be visible, Nmap should be hidden
    expect(screen.getByText("OpenAPI & Swagger Security Auditor")).toBeInTheDocument();
    expect(screen.queryByText("Nmap Network Scanner")).not.toBeInTheDocument();

    // Switch to Network & Android tab
    const networkTab = screen.getByTestId("domain-tab-network");
    fireEvent.click(networkTab);

    // Nmap should be visible, OpenAPI should be hidden
    expect(screen.getByText("Nmap Network Scanner")).toBeInTheDocument();
    expect(screen.queryByText("OpenAPI & Swagger Security Auditor")).not.toBeInTheDocument();
  });

  it("parses OpenAPI specification and triggers security audit from CategoryWorkflowView", async () => {
    render(
      <CategoryWorkflowView
        category="api"
        targets={mockTargets}
        selectedTarget={mockTargets[0]}
      />
    );

    // Switch to Toolchain tab where the Spec Importer lives
    await waitFor(() => {
      expect(screen.getByTestId("tab-tools")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("tab-tools"));

    await waitFor(() => {
      expect(screen.getByText("Postman & OpenAPI Spec Importer")).toBeInTheDocument();
    });

    const sampleSpec = JSON.stringify({
      openapi: "3.0.0",
      info: { title: "Payment API", version: "1.0.0" },
      paths: {
        "/api/checkout": {
          post: { summary: "Process Checkout" },
        },
      },
    });

    const textarea = screen.getByTestId("textarea-api-spec");
    fireEvent.change(textarea, { target: { value: sampleSpec } });

    // Click Parse
    const parseBtn = screen.getByTestId("btn-parse-api-spec");
    fireEvent.click(parseBtn);

    // Verify endpoint route appears and audit button becomes available
    await waitFor(() => {
      expect(screen.getByText(/Discovered Endpoints/i)).toBeInTheDocument();
      expect(screen.getByText("Run OpenAPI Security Audit")).toBeInTheDocument();
    });

    // Click Run OpenAPI Security Audit
    fireEvent.click(screen.getByText("Run OpenAPI Security Audit"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "execute_tool_adapter",
        expect.objectContaining({
          toolId: "openapi",
          targetId: "tgt-1",
        })
      );
    });
  });
});
