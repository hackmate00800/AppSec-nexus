import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  testBurpConnection,
  sendRepeaterRequest,
  parseBurpXmlFindings,
  redactSensitiveText,
  loadBurpConfig,
  saveBurpConfig,
} from "../burp/burpService";
import { BurpIntegrationView } from "../burp/BurpIntegrationView";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ToastProvider } from "../components/ui/Toast";
import { Target } from "../types";

describe("Burp Suite Local Integration Suite", () => {
  const mockTarget: Target = {
    id: "target-burp-1",
    name: "Enterprise Core API",
    primary_url: "https://api.enterprise.local",
    created_at: new Date().toISOString(),
    scope: {
      allowed_hosts: ["api.enterprise.local"],
      allowed_prefixes: ["https://api.enterprise.local"],
      allowed_ports: [443, 80, 8081],
      excluded_paths: ["/logout"],
      allow_local_lab: true,
    },
  };

  const sampleXml = `
  <issues burpVersion="2024.1">
    <issue>
      <name><![CDATA[SQL Injection (Error-Based)]]></name>
      <severity>High</severity>
      <confidence>Certain</confidence>
      <host ip="10.0.0.5">https://api.enterprise.local</host>
      <path>/v1/users?id=1'</path>
      <issueDetail><![CDATA[Database error syntax near syntax error. Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret_jwt_token_12345]]></issueDetail>
      <issueBackground>SQL injection allows attackers to manipulate backend database queries.</issueBackground>
      <remediationBackground>Use parameterized queries with prepared statements.</remediationBackground>
      <vulnerabilityClassifications>CWE-89</vulnerabilityClassifications>
    </issue>
    <issue>
      <name><![CDATA[Cross-Site Scripting (Reflected)]]></name>
      <severity>Medium</severity>
      <confidence>Firm</confidence>
      <host ip="10.0.0.5">https://api.enterprise.local</host>
      <path>/v1/search?q=test</path>
      <issueDetail><![CDATA[Parameter 'q' reflected without HTML escaping. Cookie: session=adm_secret_cookie_9988]]></issueDetail>
      <remediationBackground>Contextually encode output and configure Content-Security-Policy.</remediationBackground>
      <vulnerabilityClassifications>CWE-79</vulnerabilityClassifications>
    </issue>
  </issues>
  `;

  beforeEach(() => {
    localStorage.clear();
  });

  describe("Service Layer: Connection Probing & Port Conflict Detection", () => {
    it("accurately detects port 8080 conflict with Jenkins and provides port switch guidance", async () => {
      const status = await testBurpConnection("127.0.0.1", 8080);
      expect(status.is_connected).toBe(false);
      expect(status.port_conflict_detected).toBe(true);
      expect(status.conflicting_service).toContain("Jenkins");
      expect(status.message).toContain("Port conflict detected on port 8080");
      expect(status.message).toContain("8081 or 8082");
    });

    it("connects successfully when Burp Suite listener is configured on port 8081", async () => {
      const status = await testBurpConnection("127.0.0.1", 8081);
      expect(status.is_connected).toBe(true);
      expect(status.port_conflict_detected).toBe(false);
      expect(status.burp_edition).toContain("Burp Suite Community");
      expect(status.message).toContain("Successfully connected to Burp Suite");
      expect(status.latency_ms).toBeDefined();
    });

    it("handles connection refused on unoccupied ports", async () => {
      const status = await testBurpConnection("127.0.0.1", 9999);
      expect(status.is_connected).toBe(false);
      expect(status.port_conflict_detected).toBe(false);
      expect(status.message).toContain("Connection refused");
    });

    it("persists and retrieves user Burp proxy configuration", () => {
      const cfg = { host: "127.0.0.1", port: 8082, autoConnect: false };
      saveBurpConfig(cfg);
      const loaded = loadBurpConfig();
      expect(loaded.port).toBe(8082);
      expect(loaded.autoConnect).toBe(false);
    });
  });

  describe("Sensitive Secret & Token Auto-Redaction", () => {
    it("auto-redacts Authorization Bearer tokens in traffic and evidence", () => {
      const input = "Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig\nAccept: application/json";
      const sanitized = redactSensitiveText(input);
      expect(sanitized).toContain("[REDACTED_BEARER_TOKEN]");
      expect(sanitized).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it("auto-redacts session cookies and API credentials", () => {
      const input = "Cookie: session=sess_live_998877665544; tracking=1\nBody: password=supersecretpassword123&api_key=ak_live_xyz";
      const sanitized = redactSensitiveText(input);
      expect(sanitized).toContain("[REDACTED_SESSION_COOKIE]");
      expect(sanitized).toContain("password=[REDACTED_CREDENTIAL]");
      expect(sanitized).toContain("api_key=[REDACTED_CREDENTIAL]");
      expect(sanitized).not.toContain("supersecretpassword123");
    });
  });

  describe("Burp Suite XML Findings Importer", () => {
    it("parses Burp XML issues, maps CWE, auto-redacts tokens, and tags as NeedsValidation", async () => {
      const findings = await parseBurpXmlFindings("target-burp-1", sampleXml);
      expect(findings.length).toBe(2);

      const sqlFinding = findings[0];
      expect(sqlFinding.title).toBe("SQL Injection (Error-Based)");
      expect(sqlFinding.severity).toBe("High");
      expect(sqlFinding.cwe).toBe("CWE-89");
      expect(sqlFinding.affected_asset).toBe("https://api.enterprise.local/v1/users?id=1'");
      expect(sqlFinding.status).toBe("NeedsValidation");
      expect(sqlFinding.validation_status).toBe("NEEDS_VALIDATION");
      expect(sqlFinding.source_tool).toBe("Burp Suite (Imported)");
      // Secret token redacted
      expect(sqlFinding.evidence).toContain("[REDACTED_BEARER_TOKEN]");
      expect(sqlFinding.evidence).not.toContain("secret_jwt_token_12345");

      const xssFinding = findings[1];
      expect(xssFinding.title).toBe("Cross-Site Scripting (Reflected)");
      expect(xssFinding.severity).toBe("Medium");
      expect(xssFinding.cwe).toBe("CWE-79");
      expect(xssFinding.evidence).toContain("[REDACTED_SESSION_COOKIE]");
    });

    it("throws a descriptive error when XML contains no <issue> elements", async () => {
      await expect(parseBurpXmlFindings("target-burp-1", "<empty></empty>")).rejects.toThrow(
        "No <issue> blocks found"
      );
    });
  });

  describe("Repeater Workbench Simulation", () => {
    it("executes HTTP repeater request through proxy simulator and returns formatted response", async () => {
      const res = await sendRepeaterRequest({
        method: "POST",
        url: "https://api.enterprise.local/api/v1/test",
        headers: { "Content-Type": "application/json" },
        body: '{"ping": true}',
        use_proxy: true,
        proxy_host: "127.0.0.1",
        proxy_port: 8081,
      });

      expect(res.status_code).toBe(200);
      expect(res.status_text).toBe("OK");
      expect(res.routed_via_proxy).toBe(true);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(JSON.parse(res.body).status).toBe("success");
      expect(res.latency_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("BurpIntegrationView Component UI", () => {
    it("renders header, live connection badge, and responds to port switch action", async () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <BurpIntegrationView activeTarget={mockTarget} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Verify title
      expect(screen.getByText(/Burp Suite Community Integration/i)).toBeInTheDocument();

      // On default port 8080, port conflict is detected and switch button is displayed
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Switch to Port 8081/i })).toBeInTheDocument();
      });

      // Click "Switch to Port 8081"
      const switchBtn = screen.getByRole("button", { name: /Switch to Port 8081/i });
      fireEvent.click(switchBtn);

      // Now connected
      await waitFor(() => {
        expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      });
    });

    it("renders traffic inspector with sample items and filters by method", async () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <BurpIntegrationView activeTarget={mockTarget} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Traffic items rendered
      await waitFor(() => {
        expect(screen.getByText("/api/v1/auth/session")).toBeInTheDocument();
      });

      // Filter by POST method
      const methodSelect = screen.getByDisplayValue("All Methods");
      fireEvent.change(methodSelect, { target: { value: "POST" } });

      // Should show /api/v1/users/search and hide GET items
      expect(screen.getByText("/api/v1/users/search")).toBeInTheDocument();
      expect(screen.queryByText("/api/v1/auth/session")).not.toBeInTheDocument();
    });

    it("switches to Repeater tab and executes HTTP request", async () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <BurpIntegrationView activeTarget={mockTarget} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Switch to Repeater tab
      const repeaterTabBtn = screen.getByRole("button", { name: /Repeater Workbench/i });
      fireEvent.click(repeaterTabBtn);

      expect(screen.getByText("Request Composer")).toBeInTheDocument();
      expect(screen.getByText("Server Response")).toBeInTheDocument();

      // Click Send button
      const sendBtn = screen.getByRole("button", { name: /^Send$/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText(/BurpProxy\/Simulated/i)).toBeInTheDocument();
      });
    });

    it("parses Burp XML in Importer tab and triggers save callback", async () => {
      const handleImport = vi.fn();
      render(
        <ThemeProvider>
          <ToastProvider>
            <BurpIntegrationView activeTarget={mockTarget} onImportFindings={handleImport} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Switch to Burp XML Importer tab
      const importerTabBtn = screen.getByRole("button", { name: /Burp XML Importer/i });
      fireEvent.click(importerTabBtn);

      // Enter sample XML in textarea
      const textarea = screen.getByPlaceholderText(/<issues/i);
      fireEvent.change(textarea, { target: { value: sampleXml } });

      // Click Parse Burp XML
      const parseBtn = screen.getByRole("button", { name: /Parse Burp XML/i });
      fireEvent.click(parseBtn);

      // Findings should be parsed and previewed
      await waitFor(() => {
        expect(screen.getByText(/Parsed Findings/i)).toBeInTheDocument();
        expect(screen.getByText("SQL Injection (Error-Based)")).toBeInTheDocument();
        expect(screen.getByText("Cross-Site Scripting (Reflected)")).toBeInTheDocument();
      });

      // Click Save Findings to Project
      const saveBtn = screen.getByRole("button", { name: /Save 2 Findings to Project/i });
      fireEvent.click(saveBtn);

      expect(handleImport).toHaveBeenCalledTimes(1);
      expect(handleImport.mock.calls[0][0].length).toBe(2);
    });

    it("cross-links to AI Mentor with transaction context when AI Mentor button is clicked", async () => {
      const handleMentor = vi.fn();
      render(
        <ThemeProvider>
          <ToastProvider>
            <BurpIntegrationView activeTarget={mockTarget} onNavigateToMentor={handleMentor} />
          </ToastProvider>
        </ThemeProvider>
      );

      // In Traffic Inspector, click AI Mentor button on selected transaction
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /AI Mentor/i })).toBeInTheDocument();
      });

      const aiMentorBtn = screen.getByRole("button", { name: /AI Mentor/i });
      fireEvent.click(aiMentorBtn);

      expect(handleMentor).toHaveBeenCalledTimes(1);
      const passedPrompt = handleMentor.mock.calls[0][0];
      expect(passedPrompt).toContain("[Burp Suite Traffic Inspection]");
      expect(passedPrompt).toContain("OWASP");
    });

    it("renders Setup & CA Cert Guide with step-by-step instructions for Port 8081 and cacert.der", () => {
      render(
        <ThemeProvider>
          <ToastProvider>
            <BurpIntegrationView activeTarget={mockTarget} />
          </ToastProvider>
        </ThemeProvider>
      );

      // Switch to Setup & CA Cert Guide tab
      const guideTabBtn = screen.getByRole("button", { name: /Setup & CA Cert Guide/i });
      fireEvent.click(guideTabBtn);

      expect(screen.getByText(/Configuring Local Burp Suite with AppSec Nexus/i)).toBeInTheDocument();
      expect(screen.getByText(/Port 8080 is bound to Jenkins/i)).toBeInTheDocument();
      expect(screen.getByText(/Install PortSwigger CA Certificate/i)).toBeInTheDocument();
      expect(screen.getByText(/http:\/\/burp\/cert/i)).toBeInTheDocument();
    });
  });
});
