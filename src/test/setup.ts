import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Tauri event listener
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (_event: string, _handler: any) => {
    return () => {};
  }),
  emit: vi.fn(async () => {}),
}));

// Mock Tauri core IPC
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  invoke: vi.fn(async (cmd: string, _args?: any) => {
    switch (cmd) {
      case "get_targets":
        return [
          {
            id: "target-1",
            name: "Test Shop Lab",
            primary_url: "http://localhost:3000",
            created_at: new Date().toISOString(),
            scope: {
              allowed_hosts: ["localhost"],
              allowed_prefixes: ["http://localhost:3000"],
              allowed_ports: [3000],
              excluded_paths: [],
              allow_local_lab: true,
            },
          },
        ];
      case "get_findings":
        return [
          {
            id: "f-1",
            target_id: "target-1",
            title: "Cross-Site Scripting (Reflected)",
            severity: "High",
            confidence: 90,
            affected_asset: "http://localhost:3000/search",
            evidence: "q=<script>alert(1)</script>",
            source_tool: "Nuclei",
            tool_version: "v3.11.1",
            cwe: "CWE-79",
            remediation: "Properly sanitize and context-encode input before rendering.",
            status: "New",
            created_at: new Date().toISOString(),
          },
          {
            id: "f-2",
            target_id: "target-1",
            title: "Missing Content Security Policy (CSP)",
            severity: "Medium",
            confidence: 100,
            affected_asset: "http://localhost:3000",
            evidence: "Header missing in HTTP response",
            source_tool: "AppSec Native Scanner",
            tool_version: "v1.0.0",
            cwe: "CWE-693",
            remediation: "Implement a restrictive CSP header.",
            status: "New",
            created_at: new Date().toISOString(),
          },
          {
            id: "f-3",
            target_id: "target-1",
            title: "SQL Injection in User Authentication",
            severity: "Critical",
            confidence: 95,
            affected_asset: "http://localhost:3000/api/login",
            evidence: "username=' OR 1=1--",
            source_tool: "sqlmap",
            tool_version: "v1.8.0",
            cwe: "CWE-89",
            remediation: "Use parameterized queries or ORM prepared statements.",
            status: "New",
            created_at: new Date().toISOString(),
          },
        ];
      case "get_endpoints":
        return [
          {
            id: "ep-1",
            target_id: "target-1",
            url: "http://localhost:3000/api/users",
            method: "GET",
            status_code: 200,
            discovered_at: new Date().toISOString(),
          },
        ];
      case "get_scan_history":
        return [];
      case "get_tools":
        return [
          {
            id: "nuclei",
            name: "Nuclei Scanner",
            version: "v3.11.1",
            description: "Fast template-based vulnerability scanner",
            is_available: true,
            status: "Ready",
          },
          {
            id: "httpx",
            name: "httpx Prober",
            version: "v1.12.0",
            description: "Fast HTTP toolkit and tech prober",
            is_available: true,
            status: "Ready",
          },
        ];
      case "get_plugins":
        return [];
      case "get_ai_status":
      case "check_ai_status":
        return [true, ["deepseek-r1:1.5b", "llama3.2:1b"]];
      case "get_ai_models":
        return ["deepseek-r1:1.5b", "llama3.2:1b"];
      case "get_tool_adapters":
        return [];
      case "get_workflows":
        return [];
      case "get_workflow_jobs":
        return [];
      case "get_extensions_v1":
        return [];
      default:
        return null;
    }
  }),
}));

// Mock window.matchMedia for responsive UI testing
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
(window as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollTo and scrollIntoView
window.scrollTo = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();
