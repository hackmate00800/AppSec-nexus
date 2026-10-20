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
  invoke: vi.fn(async (cmd: string, args?: any) => {
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
      case "run_scan":
        return {
          scan_id: "scan-mock-123",
          target_url: "https://target.local",
          tool: args?.tool || "nuclei",
          status: "Completed",
          findings_count: 2,
          duration_ms: 120,
          logs: ["Scan started", "Vulnerabilities discovered", "Scan completed"],
        };
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
      case "get_ollama_system_info":
        return {
          is_online: true,
          version: "0.40.4",
          endpoint: "http://127.0.0.1:11434",
          installed_models: ["deepseek-r1:1.5b", "llama3.2:1b"],
          last_checked: new Date().toISOString(),
          error_message: null,
        };
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
      case "get_deepseek_status":
        return {
          is_configured: true,
          endpoint: "https://api.deepseek.com",
          model: "deepseek-chat",
          status: "available",
          error_message: null,
        };
      case "get_ai_tasks":
        return [];
      case "submit_ai_task":
        return {
          id: "task-mock-1",
          conversation_id: "global-mentor",
          model: "deepseek-r1:1.5b",
          prompt_preview: "Security analysis",
          status: "Running",
          messages_json: "[]",
          created_at: new Date().toISOString(),
          duration_ms: 0,
        };
      case "get_conversation_messages":
        return [];
      case "save_conversation_message":
        return {
          id: "msg-mock-1",
          conversation_id: "global-mentor",
          role: "user",
          content: "Test",
          timestamp: new Date().toISOString(),
        };
      case "cancel_ai_task":
        return true;
      case "chat_with_mentor": {
        const lastMsg = args?.messages?.[args?.messages?.length - 1]?.content || "";
        const lower = lastMsg.toLowerCase();
        // Malicious attack request safeguard: safe redirection and refusal
        if (lower.includes("hack bank.com") || lower.includes("exfiltrate user credentials") || lower.includes("unauthorized target")) {
          return "I can't assist with that request. I can explain the defensive mechanisms, security testing methodologies, and how to verify vulnerabilities safely in an authorized local lab.";
        }
        // HTTP Security Header Inspection methodology (METH-HTTP-HEADERS)
        if (lower.includes("meth-http-headers") || lower.includes("http security header inspection")) {
          return `### HTTP Security Header Inspection Methodology (METH-HTTP-HEADERS)

1. **Definition & Security Objective**:
HTTP Security Header Inspection analyzes HTTP response headers to verify defense-in-depth security controls (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy).

2. **Heuristic Logic & Normalization**:
- Normalizes header casing and handles duplicate or conflicting headers across redirect chains.
- Validates presence vs policy quality: having a weak policy (e.g. \`unsafe-inline\` in CSP) is flagged even if the header is present.
- Evaluates transport contexts: HSTS is only valid over HTTPS.

3. **Common Evasion & Detection Blind Spots**:
- Reverse proxies or CDNs stripping headers before reaching backend clients.
- Multi-header injection or conflicting duplicate response headers.
- Client-side DOM manipulation overriding server-delivered meta policies.

4. **Safe Local Lab Testing**:
- Practice with \`curl -I https://localhost:8443\` or test against intentionally vulnerable testbeds (e.g., OWASP Juice Shop in Docker).

5. **Remediation & Validation**:
- Configure strict Nginx/Apache response headers with \`add_header\` directives.
- Implement phased rollout: deploy \`Content-Security-Policy-Report-Only\` first to gather violation telemetry before enforcement.`;
        }
        if (lower.includes("content security policy") || lower.includes("csp") || (args?.system && args.system.includes("CSP"))) {
          return "The missing Content-Security-Policy header represents a defense-in-depth security hardening omission rather than confirmed Cross-Site Scripting (XSS). Without CSP, the browser cannot restrict origin script sources, but XSS requires an active reflection or DOM injection vector.\n\n### Remediation (Nginx):\n```nginx\nadd_header Content-Security-Policy \"default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';\" always;\n```\n\n### Staged Rollout:\nDeploy Content-Security-Policy-Report-Only first to collect violation reports before enforcing the policy in production.";
        }
        if (lower.includes("sql injection") || lower.includes("sqli")) {
          return "SQL Injection occurs when untrusted input is directly concatenated into SQL queries. Remediate using parameterized queries / prepared statements (e.g., PDO in PHP, parameterized SQL in Node/Python).";
        }
        if (lower.includes("idor") || lower.includes("bola") || lower.includes("authorization")) {
          return "Broken Object Level Authorization (BOLA/IDOR) occurs when an API fails to validate user ownership of the requested resource. Remediate by implementing server-side session-based ownership verification for all record queries.";
        }
        if (lower.includes("false positive") || lower.includes("scanner validation")) {
          return "Automated scanner detections represent hypotheses requiring deterministic verification. Differentiate scanner regex matches from confirmed exploitability using targeted non-destructive validation probes.";
        }
        if (lower.includes("prompt injection") || lower.includes("jailbreak") || lower.includes("dan")) {
          return "Prompt injection and jailbreaks attempt to override an LLM's system persona. Defenses include separating system instructions in role: 'system', sandboxing outputs, and never trusting user input to grant tool execution permissions.";
        }
        if (lower.includes("cvss")) {
          return "CVSS v3.1 scoring requires complete metric vectors (AV, AC, PR, UI, S, C, I, A). Incomplete evidence leaves the score Unassessed / Pending Verification; missing headers should never be assigned High or Critical without confirmed impact.";
        }
        return `Cybersecurity Analysis (${args?.model || "AI"}): Identified technical mechanism and remediation guidance.`;
      }
      case "clear_conversation_messages":
      case "clear_ai_tasks":
        return null;
      case "update_target":
        return {
          id: args?.id || "target-1",
          name: args?.name || "Updated Target",
          primary_url: args?.primary_url || "http://127.0.0.1:3000",
          created_at: new Date().toISOString(),
          scope: { allowed_hosts: [], allowed_prefixes: [], allowed_ports: [80, 443], excluded_paths: [], allow_local_lab: args?.allow_local_lab || false },
        };
      case "delete_target":
        return 1;
      case "create_finding":
        return {
          id: "finding-new-1",
          target_id: args?.target_id || "target-1",
          title: args?.title || "Manual Security Finding",
          severity: args?.severity || "Medium",
          confidence: args?.confidence || 85,
          affected_asset: args?.affected_asset || "https://example.com/api",
          evidence: args?.evidence || "Test evidence",
          source_tool: "Manual Audit",
          tool_version: "manual-1.0",
          cwe: args?.cwe || "CWE-200",
          remediation: args?.remediation || "Sanitize input",
          status: args?.status || "New",
          created_at: new Date().toISOString(),
          validation_status: "NEEDS_VALIDATION",
        };
      case "update_finding":
        return {
          id: args?.finding_id || "finding-1",
          target_id: "target-1",
          title: args?.payload?.title || "Updated Finding Title",
          severity: args?.payload?.severity || "High",
          confidence: args?.payload?.confidence || 90,
          affected_asset: args?.payload?.affected_asset || "https://example.com/admin",
          evidence: args?.payload?.evidence || "Updated evidence",
          source_tool: "Nuclei Scanner",
          tool_version: "v3.11.1",
          cwe: args?.payload?.cwe || "CWE-79",
          remediation: args?.payload?.remediation || "Apply strict CSP",
          status: args?.payload?.status || "Confirmed",
          created_at: new Date().toISOString(),
          validation_status: "CONFIRMED",
        };
      case "delete_finding":
        return true;
      case "bulk_update_finding_status":
        return args?.finding_ids?.length || 1;
      case "bulk_delete_findings":
        return args?.finding_ids?.length || 1;
      case "create_endpoint":
        return {
          id: "ep-mock-1",
          target_id: args?.target_id || "target-1",
          url: args?.url || "https://example.com/api/v1/users",
          method: args?.method || "GET",
          status_code: args?.status_code || 200,
          content_type: args?.content_type || "application/json",
          source: "Manual Probe",
          discovered_at: new Date().toISOString(),
        };
      case "delete_endpoint":
        return true;
      case "clear_endpoints":
        return 1;
      case "delete_scan_history":
        return true;
      case "clear_scan_history":
        return null;
      case "get_audit_logs":
        return [
          {
            id: "audit-1",
            entity_type: "finding",
            entity_id: "finding-1",
            action: "UPDATE",
            details_json: "Updated finding status to Confirmed",
            timestamp: new Date().toISOString(),
          },
        ];
      case "clear_audit_logs":
        return null;
      case "get_issues":
        return [
          {
            id: "ISS-001",
            title: "Reflected XSS in Search Query Parameter",
            category: "SecurityVulnerability",
            subtype: "CWE-79",
            severity: "High",
            status: "Open",
            verification_status: "NeedsValidation",
            affected_target_id: "target-1",
            affected_target_name: "Test Shop Lab",
            affected_component: "http://localhost:3000/search?q=",
            source: "Scanner",
            occurrence_count: 2,
            first_detected: "2026-10-15T10:00:00Z",
            last_detected: "2026-10-17T12:00:00Z",
            description: "User input injected into search parameter is rendered without HTML encoding.",
            reproduction_steps: "1. Open /search?q=<script>alert(1)</script>\n2. Notice popup",
            expected_behavior: "Script tag should be context encoded",
            actual_behavior: "Script executed in browser context",
            error_details: null,
            evidence: "<script>alert(1)</script>",
            root_cause: "Missing innerHTML encoding in search view template",
            impact_assessment: "Session hijacking or CSRF execution",
            remediation_guidance: "Use textContent or escapeHtml helper",
            tags_json: JSON.stringify(["xss", "frontend", "critical"]),
            assigned_owner: "AppSec Team",
            notes_json: JSON.stringify([
              {
                id: "note-1",
                author: "Analyst",
                text: "Verified on staging environment",
                timestamp: "2026-10-17T12:30:00Z",
              },
            ]),
            related_finding_id: "f-1",
            related_tool_id: "nuclei",
            history_json: JSON.stringify([
              {
                timestamp: "2026-10-15T10:00:00Z",
                action: "CREATED",
                actor: "Scanner",
                details: "Initial discovery",
              },
              {
                timestamp: "2026-10-17T12:00:00Z",
                action: "REOCCURRENCE",
                actor: "Scanner",
                details: "Re-detected in scan run",
              },
            ]),
            resolution_summary: null,
            resolved_at: null,
            fingerprint: "fp-xss-mock",
          },
          {
            id: "ISS-002",
            title: "Sidebar fails to collapse on mobile viewports",
            category: "UiUxGlitch",
            subtype: "ResponsiveLayout",
            severity: "Low",
            status: "Investigating",
            verification_status: "HumanVerified",
            affected_target_id: null,
            affected_target_name: null,
            affected_component: "SidebarNav.tsx",
            source: "ManualReport",
            occurrence_count: 1,
            first_detected: "2026-10-16T14:00:00Z",
            last_detected: "2026-10-16T14:00:00Z",
            description: "Hamburger menu button does not trigger sidebar slide-out animation on width < 480px.",
            reproduction_steps: "1. Resize window to 375px\n2. Click hamburger menu",
            expected_behavior: "Sidebar should toggle open and closed",
            actual_behavior: "Sidebar remains hidden offscreen",
            error_details: null,
            evidence: null,
            root_cause: "CSS media query specificity collision",
            impact_assessment: "Mobile navigation degraded",
            remediation_guidance: "Ensure .mobile-open class has higher z-index and display: flex",
            tags_json: JSON.stringify(["ui", "mobile"]),
            assigned_owner: "UX Team",
            notes_json: "[]",
            related_finding_id: null,
            related_tool_id: null,
            history_json: JSON.stringify([
              {
                timestamp: "2026-10-16T14:00:00Z",
                action: "CREATED",
                actor: "ManualReport",
                details: "Issue reported by QA",
              },
            ]),
            resolution_summary: null,
            resolved_at: null,
            fingerprint: "fp-sidebar-mock",
          },
        ];
      case "get_issue_by_id":
        return {
          id: args?.id || "ISS-001",
          title: "Reflected XSS in Search Query Parameter",
          category: "SecurityVulnerability",
          subtype: "CWE-79",
          severity: "High",
          status: "Open",
          verification_status: "NeedsValidation",
          affected_target_id: "target-1",
          affected_target_name: "Test Shop Lab",
          affected_component: "http://localhost:3000/search?q=",
          source: "Scanner",
          occurrence_count: 2,
          first_detected: "2026-10-15T10:00:00Z",
          last_detected: "2026-10-17T12:00:00Z",
          description: "User input injected into search parameter is rendered without HTML encoding.",
          reproduction_steps: "1. Open /search?q=<script>alert(1)</script>\n2. Notice popup",
          expected_behavior: "Script tag should be context encoded",
          actual_behavior: "Script executed in browser context",
          error_details: null,
          evidence: "<script>alert(1)</script>",
          root_cause: "Missing innerHTML encoding in search view template",
          impact_assessment: "Session hijacking or CSRF execution",
          remediation_guidance: "Use textContent or escapeHtml helper",
          tags_json: JSON.stringify(["xss", "frontend", "critical"]),
          assigned_owner: "AppSec Team",
          notes_json: JSON.stringify([
            {
              id: "note-1",
              author: "Analyst",
              text: "Verified on staging environment",
              timestamp: "2026-10-17T12:30:00Z",
            },
          ]),
          related_finding_id: "f-1",
          related_tool_id: "nuclei",
          history_json: JSON.stringify([
            {
              timestamp: "2026-10-15T10:00:00Z",
              action: "CREATED",
              actor: "Scanner",
              details: "Initial discovery",
            },
          ]),
          resolution_summary: null,
          resolved_at: null,
          fingerprint: "fp-xss-mock",
        };
      case "record_issue":
        return {
          id: "ISS-NEW-101",
          title: args?.payload?.title || "Manual Bug Report",
          category: args?.payload?.category || "FunctionalBug",
          subtype: args?.payload?.subtype || "General",
          severity: args?.payload?.severity || "Medium",
          status: args?.payload?.status || "Open",
          verification_status: args?.payload?.verification_status || "HumanVerified",
          affected_target_id: args?.payload?.affected_target_id || null,
          affected_target_name: args?.payload?.affected_target_name || null,
          affected_component: args?.payload?.affected_component || "General",
          source: args?.payload?.source || "ManualReport",
          occurrence_count: 1,
          first_detected: new Date().toISOString(),
          last_detected: new Date().toISOString(),
          description: args?.payload?.description || "Description",
          reproduction_steps: args?.payload?.reproduction_steps || null,
          expected_behavior: args?.payload?.expected_behavior || null,
          actual_behavior: args?.payload?.actual_behavior || null,
          error_details: args?.payload?.error_details || null,
          evidence: args?.payload?.evidence || null,
          root_cause: args?.payload?.root_cause || null,
          impact_assessment: args?.payload?.impact_assessment || null,
          remediation_guidance: args?.payload?.remediation_guidance || null,
          tags_json: JSON.stringify(args?.payload?.tags || []),
          assigned_owner: args?.payload?.assigned_owner || null,
          notes_json: "[]",
          related_finding_id: null,
          related_tool_id: null,
          history_json: JSON.stringify([
            {
              timestamp: new Date().toISOString(),
              action: "CREATED",
              actor: "ManualReport",
              details: "Issue documented",
            },
          ]),
          resolution_summary: null,
          resolved_at: null,
          fingerprint: "fp-new-mock",
        };
      case "update_issue":
        return {
          id: args?.id || "ISS-001",
          title: args?.payload?.title || "Updated Title",
          category: args?.payload?.category || "FunctionalBug",
          subtype: args?.payload?.subtype || "General",
          severity: args?.payload?.severity || "High",
          status: args?.payload?.status || "Confirmed",
          verification_status: args?.payload?.verification_status || "HumanVerified",
          affected_target_id: null,
          affected_target_name: null,
          affected_component: args?.payload?.affected_component || "Component",
          source: "ManualReport",
          occurrence_count: 1,
          first_detected: new Date().toISOString(),
          last_detected: new Date().toISOString(),
          description: args?.payload?.description || "Updated description",
          reproduction_steps: null,
          expected_behavior: null,
          actual_behavior: null,
          error_details: null,
          evidence: null,
          root_cause: null,
          impact_assessment: null,
          remediation_guidance: null,
          tags_json: "[]",
          assigned_owner: null,
          notes_json: "[]",
          related_finding_id: null,
          related_tool_id: null,
          history_json: "[]",
          resolution_summary: null,
          resolved_at: null,
          fingerprint: "fp-updated",
        };
      case "delete_issue":
        return true;
      case "bulk_update_issue_status":
        return args?.ids?.length || 1;
      case "bulk_delete_issues":
        return args?.ids?.length || 1;
      case "add_issue_note":
        return {
          id: args?.id || "ISS-001",
          title: "Reflected XSS in Search Query Parameter",
          category: "SecurityVulnerability",
          subtype: "CWE-79",
          severity: "High",
          status: "Open",
          verification_status: "NeedsValidation",
          affected_target_id: "target-1",
          affected_target_name: "Test Shop Lab",
          affected_component: "http://localhost:3000/search?q=",
          source: "Scanner",
          occurrence_count: 2,
          first_detected: "2026-10-15T10:00:00Z",
          last_detected: "2026-10-17T12:00:00Z",
          description: "User input injected into search parameter is rendered without HTML encoding.",
          tags_json: "[]",
          notes_json: JSON.stringify([
            {
              id: "note-new",
              author: args?.author || "Analyst",
              text: args?.text || "Added note",
              timestamp: new Date().toISOString(),
            },
          ]),
          history_json: "[]",
          fingerprint: "fp-note",
        };
      case "generate_issue_report":
        return {
          id: "RPT-MOCK-99",
          title: args?.params?.title || "Formal Assessment Report",
          template: args?.params?.template || "executive",
          generated_at: new Date().toISOString(),
          scope: "All Platform Projects",
          total_issues: 2,
          metrics_json: JSON.stringify({ total: 2, critical: 0, high: 1, medium: 0, low: 1, info: 0 }),
          content: `# ${args?.params?.title || "Formal Assessment Report"}\n\n**Report ID:** RPT-MOCK-99\n\n## 1. Executive Summary\nThis report documents 2 issues.`,
          format: "markdown",
        };
      case "test_burp_proxy_connection": {
        const port = args?.port ?? 8080;
        const host = args?.host ?? "127.0.0.1";
        if (port === 8080) {
          return {
            is_connected: false,
            host,
            port,
            latency_ms: 12,
            burp_edition: null,
            is_burp: false,
            port_conflict_detected: true,
            conflicting_service: "Jenkins CI/CD (Jetty Server)",
            message:
              "Port conflict detected on port 8080: A Jenkins CI/CD instance is occupying this port. In Burp Suite, open 'Proxy' -> 'Proxy settings' -> 'Proxy listeners' and change the listener port to 8081 or 8082, then update the port in AppSec.",
          };
        } else if (port === 8081 || port === 8082) {
          return {
            is_connected: true,
            host,
            port,
            latency_ms: 18,
            burp_edition: "Burp Suite Community Edition (Local PID 20740)",
            is_burp: true,
            port_conflict_detected: false,
            conflicting_service: null,
            message: `Successfully connected to Burp Suite Proxy listener at ${host}:${port} (18ms).`,
          };
        }
        return {
          is_connected: false,
          host,
          port,
          latency_ms: null,
          burp_edition: null,
          is_burp: false,
          port_conflict_detected: false,
          conflicting_service: null,
          message: `Connection refused on ${host}:${port}. Verify Burp Suite is running with listener active.`,
        };
      }
      case "send_burp_repeater_request": {
        const req = args?.request;
        return {
          status_code: 200,
          status_text: "OK",
          headers: {
            "content-type": "application/json; charset=utf-8",
            "server": "BurpProxy/Simulated",
          },
          body: JSON.stringify({ status: "success", message: "Processed through Burp Suite proxy", method: req?.method }),
          latency_ms: 24,
          content_length: 68,
          routed_via_proxy: req?.use_proxy ?? true,
        };
      }
      case "parse_burp_xml_findings": {
        const xml = args?.xmlContent || args?.xml_content || "";
        if (!xml.includes("<issue>")) {
          throw new Error("No <issue> blocks found in Burp Suite XML data");
        }
        const issues: any[] = [];
        const issueMatches = xml.match(/<issue>[\s\S]*?<\/issue>/gi) || [];
        issueMatches.forEach((block: string, i: number) => {
          const nameM = block.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/i);
          const sevM = block.match(/<severity>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/severity>/i);
          const hostM = block.match(/<host[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/host>/i);
          const pathM = block.match(/<path[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/path>/i);
          const detailM = block.match(/<issueDetail>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/issueDetail>/i);
          const cweM = block.match(/CWE-(\d+)/i);

          const title = nameM ? nameM[1].trim() : "Burp Suite Issue";
          const rawSev = sevM ? sevM[1].trim() : "Info";
          const host = hostM ? hostM[1].trim() : "";
          const path = pathM ? pathM[1].trim() : "";
          const asset = host ? `${host}${path}` : path || "Target Asset";
          const rawDetail = detailM ? detailM[1].trim() : "Exported issue.";
          const redacted = rawDetail
            .replace(/(authorization:\s*bearer\s+)[A-Za-z0-9_\-\.]{8,}/gi, "$1[REDACTED_BEARER_TOKEN]")
            .replace(/(cookie:\s*.*?(?:session|token|auth|jwt|phpsessid|jsessionid)=)[^;\s&]+/gi, "$1[REDACTED_SESSION_COOKIE]");

          issues.push({
            id: `burp-test-${i}`,
            target_id: args?.target_id || "target-1",
            title,
            severity: rawSev,
            confidence: 90,
            affected_asset: asset,
            evidence: redacted,
            source_tool: "Burp Suite (Imported)",
            tool_version: "Community/Pro",
            cwe: cweM ? `CWE-${cweM[1]}` : undefined,
            remediation: "Apply OWASP recommendations.",
            status: "NeedsValidation",
            validation_status: "NEEDS_VALIDATION",
            created_at: new Date().toISOString(),
            fingerprint: `burp:mock:${title}:${asset}`,
          });
        });
        return issues;
      }
      case "import_burp_findings":
        return 2;
      case "get_burp_connector_status":
        return {
          is_running: true,
          host: "127.0.0.1",
          port: 41785,
          token: "appsec_mock_token_12345",
          total_ingested: 4,
          last_ingested_at: new Date().toISOString(),
        };
      case "regenerate_burp_connector_token":
        return "appsec_regenerated_token_99999";
      case "get_burp_traffic":
        return [];
      case "clear_burp_traffic":
        return 0;
      case "delete_burp_traffic_item":
        return true;
      case "import_burp_traffic_json":
        return 1;
      case "get_methodologies":
        return [
          {
            id: "METH-HTTP-HEADERS",
            name: "HTTP Security Headers & Transport Security Verification",
            category: "Web",
            method_type: "PassiveInspection",
            detection_objective: "Validate presence and secure configuration of defense-in-depth HTTP security headers.",
            preconditions: ["Target HTTP/HTTPS port open", "Target returns response headers"],
            input_or_artifact_examined: "HTTP response headers",
            evidence_expected: "Absence of HSTS, CSP, X-Frame-Options or X-Content-Type-Options",
            detection_logic: "Deterministic lookup for standard RFC security headers",
            verification_strategy: "Non-destructive HEAD/GET request verifying headers",
            applicable_vulnerability_classes: ["CWE-693", "Missing CSP", "Missing HSTS"],
            known_limitations: ["Reverse proxies may strip headers in test environments"],
            references: ["https://owasp.org/www-project-secure-headers/"],
            safe_lab_exercise: "Run local OWASP Juice Shop or DVWA and inspect response headers via curl -I",
          },
          {
            id: "METH-XSS-REFLECTION",
            name: "Reflected Cross-Site Scripting (XSS) Input Analysis",
            category: "Web",
            method_type: "ActiveEvaluation",
            detection_objective: "Detect unencoded reflection of client-supplied parameter values in HTML response contexts.",
            preconditions: ["Active endpoint with input parameter accepting strings"],
            input_or_artifact_examined: "GET/POST query parameter values and HTML response body",
            evidence_expected: "Literal reflection of benign marker payload without encoding",
            detection_logic: "Probing with safe alphanumeric canary strings and inspecting response reflection context",
            verification_strategy: "Sending harmless alphanumeric token and verifying exact reflection syntax",
            applicable_vulnerability_classes: ["CWE-79", "Reflected XSS", "Cross-Site Scripting"],
            known_limitations: ["WAF filtering may distort marker"],
            references: ["https://owasp.org/www-community/attacks/xss/"],
            safe_lab_exercise: "Test search parameter on DVWA with low security setting using benign tokens",
          },
        ];
      case "get_methodology_by_id":
        return {
          id: args?.id || "METH-HTTP-HEADERS",
          name: "HTTP Security Headers & Transport Security Verification",
          category: "Web",
          method_type: "PassiveInspection",
          detection_objective: "Validate presence and secure configuration of defense-in-depth HTTP security headers.",
          preconditions: ["Target HTTP/HTTPS port open", "Target returns response headers"],
          input_or_artifact_examined: "HTTP response headers",
          evidence_expected: "Absence of HSTS, CSP, X-Frame-Options or X-Content-Type-Options",
          detection_logic: "Deterministic lookup for standard RFC security headers",
          verification_strategy: "Non-destructive HEAD/GET request verifying headers",
          applicable_vulnerability_classes: ["CWE-693", "Missing CSP", "Missing HSTS"],
          known_limitations: ["Reverse proxies may strip headers in test environments"],
          references: ["https://owasp.org/www-project-secure-headers/"],
          safe_lab_exercise: "Run local OWASP Juice Shop or DVWA and inspect response headers via curl -I",
        };
      case "get_scan_events":
        return [
          {
            id: "evt-1",
            scan_id: args?.scanId || "scan-mock-1",
            finding_id: args?.findingId || "f-1",
            event_type: "scan_created",
            timestamp: "2026-10-18T10:00:00Z",
            component_or_tool: "orchestrator",
            severity: "Info",
            message: "Scan session initialized for target",
            metadata_json: JSON.stringify({ target: "http://localhost:3000" }),
          },
          {
            id: "evt-2",
            scan_id: args?.scanId || "scan-mock-1",
            finding_id: args?.findingId || "f-1",
            event_type: "rule_evaluated",
            timestamp: "2026-10-18T10:00:05Z",
            component_or_tool: "nuclei",
            severity: "High",
            message: "Heuristic rule matched parameter reflection without context encoding",
            metadata_json: JSON.stringify({ parameter: "q" }),
          },
        ];
      case "get_finding_trace":
        return {
          finding_id: args?.findingId || "f-1",
          methodology_id: "METH-XSS-REFLECTION",
          methodology_name: "Reflected Cross-Site Scripting (XSS) Input Analysis",
          tool_name: "Nuclei",
          tool_version: "v3.11.1",
          scanner_execution: "Executed Nuclei template against authorized target URL with benign probe marker",
          evidence_collected: "Observed parameter 'q' reflected verbatim without HTML entity escaping in response body",
          inference_applied: "Concluded potential XSS because unencoded user reflection in HTML context allows arbitrary script execution",
          human_explanation: "AppSec discovered this vulnerability by evaluating query parameter 'q'. When a benign token was provided, the target application reflected it directly into the HTML response without HTML context escaping.",
          verification_record: {
            id: "vrec-1",
            finding_id: args?.findingId || "f-1",
            target_id: "target-1",
            status: "Confirmed",
            method: "AutomatedProbe",
            confidence_score: 95,
            probe_request: "GET /search?q=appsec_probe_test HTTP/1.1",
            probe_response: "HTTP/1.1 200 OK ... <div>Results for appsec_probe_test</div>",
            analyst_notes: "Non-destructive reflection confirmed in response body",
            created_at: "2026-10-18T10:01:00Z",
          },
          scan_events: [
            {
              id: "evt-1",
              scan_id: "scan-mock-1",
              finding_id: args?.findingId || "f-1",
              event_type: "scan_created",
              timestamp: "2026-10-18T10:00:00Z",
              component_or_tool: "orchestrator",
              severity: "Info",
              message: "Scan session initialized for target",
              metadata_json: JSON.stringify({ target: "http://localhost:3000" }),
            },
            {
              id: "evt-2",
              scan_id: "scan-mock-1",
              finding_id: args?.findingId || "f-1",
              event_type: "rule_evaluated",
              timestamp: "2026-10-18T10:00:05Z",
              component_or_tool: "nuclei",
              severity: "High",
              message: "Heuristic rule matched parameter reflection without context encoding",
              metadata_json: JSON.stringify({ parameter: "q" }),
            },
          ],
          preconditions_checked: ["Target host reachable", "Authorized scope verified", "Non-destructive probe permitted"],
          limitations: ["Passive reflection does not guarantee DOM execution if client-side framework sanitizes"],
        };
      case "detect_heretic_hardware":
        return {
          os: "Windows 11 (x64)",
          gpu_name: "Intel(R) Iris(R) Xe Graphics",
          gpu_vram_mb: 1024,
          cuda_available: false,
          ram_total_mb: 16384,
          ram_avail_mb: 8192,
          disk_total_gb: 256.0,
          disk_free_gb: 95.4,
          python_version: "Python 3.12.3",
          python_path: "C:\\Python312\\python.exe",
          pytorch_version: "2.5.1+cpu",
          wsl_installed: true,
          wsl_distro: "Ubuntu (WSL2)",
          wsl_python_version: "Python 3.12.3",
          heretic_installed: true,
          heretic_version: "0.1.0",
          compatibility_level: "supported_with_warnings",
          warnings: ["NVIDIA CUDA acceleration not detected. Offloading to CPU tensors."],
          recommendations: ["WSL2 Ubuntu is available and recommended for optimal Linux wheel compatibility."],
        };
      case "start_heretic_job":
        return {
          id: "job-mock-1",
          source_model: args?.config?.source_model || "Qwen/Qwen3-4B-Instruct-2507",
          output_path: args?.config?.output_dir || "C:\\AppSecNexus\\heretic_models\\job-mock-1",
          status: "running",
          stage: "abliteration_optimization",
          execution_mode: args?.config?.execution_mode || "native",
          config: args?.config || {
            source_model: "Qwen/Qwen3-4B-Instruct-2507",
            output_dir: "C:\\AppSecNexus\\heretic_models\\job-mock-1",
            quantization: "bnb_4bit",
            device_map: "auto",
            n_trials: 50,
            skip_optimization: false,
            execution_mode: "native",
          },
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          duration_ms: 0,
          exported_files: [],
        };
      case "get_heretic_jobs":
        return [
          {
            id: "job-mock-1",
            source_model: "Qwen/Qwen3-4B-Instruct-2507",
            output_path: "C:\\AppSecNexus\\heretic_models\\job-mock-1",
            status: "completed",
            stage: "ready_for_ollama",
            execution_mode: "native",
            config: {
              source_model: "Qwen/Qwen3-4B-Instruct-2507",
              output_dir: "C:\\AppSecNexus\\heretic_models\\job-mock-1",
              quantization: "bnb_4bit",
              device_map: "auto",
              n_trials: 50,
              skip_optimization: false,
              execution_mode: "native",
            },
            created_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: 120000,
            ollama_model_name: "cyberqwen-heretic:4b",
            exported_files: ["model.safetensors", "config.json", "tokenizer.json"],
          },
        ];
      case "get_heretic_job_logs":
        return [
          { id: 1, job_id: args?.jobId || "job-mock-1", line: "Optimizing refusal direction trial 1/50", timestamp: new Date().toISOString() },
          { id: 2, job_id: args?.jobId || "job-mock-1", line: "Exporting modified Safetensors weights...", timestamp: new Date().toISOString() },
        ];
      case "cancel_heretic_job":
        return null;
      case "validate_heretic_export":
        return {
          is_valid: true,
          artifact_format: "safetensors",
          total_size_bytes: 4294967296,
          files_found: ["model.safetensors (4096 MB)", "config.json (0.01 MB)", "tokenizer.json (1.2 MB)"],
          missing_files: [],
          has_config_json: true,
          has_tokenizer: true,
          has_weights: true,
        };
      case "import_heretic_to_ollama":
        return {
          success: true,
          model_name: args?.params?.model_name || "cyberqwen-heretic:4b",
          modelfile_path: "Modelfile",
          logs: ["transferring model data", "creating model layer", "writing manifest", "success"],
        };
      case "run_heretic_evaluation":
        return {
          job_id: args?.jobId || "job-mock-1",
          model_name: args?.modelName || "cyberqwen-heretic:4b",
          tested_at: new Date().toISOString(),
          total_prompts: 10,
          refusal_count: 0,
          refusal_rate: 0.0,
          technical_quality_score: 9.4,
          questions_tested: [
            {
              id: "EVAL-01-SQLI",
              category: "Injection",
              prompt: "Explain AST parameterization...",
              response: "AST isolation eliminates injection...",
              was_refused: false,
              has_remediation_code: true,
              duration_ms: 1200,
            },
          ],
        };
      case "get_heretic_evaluations":
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
