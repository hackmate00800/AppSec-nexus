import React, { useState, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Activity,
  Terminal,
} from "lucide-react";

export interface TaxonomyDomain {
  id: string;
  title: string;
  description: string;
  version: string;
  order_index: number;
  icon_name: string;
}

export interface TaxonomyCategory {
  id: string;
  domain_id: string;
  title: string;
  description: string;
  applicable_technologies: string[];
  order_index: number;
}

export interface TestCaseDefinition {
  id: string;
  category_id: string;
  domain_id: string;
  phase: string;
  subphase: string;
  title: string;
  description: string;
  cwe?: string | null;
  owasp_id?: string | null;
  severity_guidance: string;
  safety_level: string;
  manual_procedure: string;
  automated_tool_adapter?: string | null;
  command_example?: string | null;
  expected_secure_behavior: string;
  failure_indicators: string;
  remediation_guidance: string;
  references: string[];
}

export interface AssessmentTemplate {
  id: string;
  category_id: string;
  name: string;
  description: string;
  version: string;
  is_builtin: boolean;
  test_case_ids: string[];
}

export interface AssessmentRun {
  id: string;
  title: string;
  target_id: string;
  target_url: string;
  domain_id: string;
  category_id: string;
  template_id: string;
  template_version: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  inconclusive_tests: number;
  not_applicable_tests: number;
  notes: string;
}

export interface TestCaseExecution {
  id: string;
  assessment_run_id: string;
  test_case_id: string;
  status: string;
  execution_mode: string;
  observed_evidence?: string | null;
  operator_notes?: string | null;
  related_finding_id?: string | null;
  executed_at?: string | null;
  duration_ms: number;
}

interface Props {
  currentTargetUrl?: string;
  currentTargetId?: string;
  onNavigateToFindings?: () => void;
}

export const CategoryAssessmentWorkspace: React.FC<Props> = ({
  currentTargetUrl = "http://localhost:3000",
  currentTargetId = "TGT-DEFAULT",
}) => {
  const isTauriApp = typeof isTauri === "function" ? isTauri() : typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  const [domains, setDomains] = useState<TaxonomyDomain[]>([]);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [testCases, setTestCases] = useState<TestCaseDefinition[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [, setRuns] = useState<AssessmentRun[]>([]);
  const [activeRun, setActiveRun] = useState<AssessmentRun | null>(null);
  const [executions, setExecutions] = useState<TestCaseExecution[]>([]);

  // Selection states
  const [selectedDomainId, setSelectedDomainId] = useState<string>("DOMAIN-WEB");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("CAT-WEB-APP");
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [, setIsLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    loadTaxonomyData();
  }, []);

  async function loadTaxonomyData() {
    setIsLoading(true);
    if (!isTauriApp) {
      // Mock data for web preview
      setDomains([
        { id: "DOMAIN-WEB", title: "Web Application Security", description: "OWASP WSTG standard web testing methodology", version: "1.0.0", order_index: 1, icon_name: "Globe" },
        { id: "DOMAIN-API", title: "API Security", description: "OWASP API Security Top 10 testing controls", version: "1.0.0", order_index: 2, icon_name: "Cpu" },
      ]);
      setCategories([
        { id: "CAT-WEB-APP", domain_id: "DOMAIN-WEB", title: "Core Web Application Assessment", description: "16-phase web assessment (A1-A16)", applicable_technologies: ["HTML5", "REST"], order_index: 1 },
        { id: "CAT-API-SEC", domain_id: "DOMAIN-API", title: "OWASP API Security Top 10", description: "BOLA, BFLA, and Token Verification (B1-B10)", applicable_technologies: ["REST", "GraphQL"], order_index: 2 },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const [domList, catList, tcList, tplList, runList] = await Promise.all([
        invoke<TaxonomyDomain[]>("get_taxonomy_domains"),
        invoke<TaxonomyCategory[]>("get_taxonomy_categories"),
        invoke<TestCaseDefinition[]>("get_test_cases"),
        invoke<AssessmentTemplate[]>("get_assessment_templates"),
        invoke<AssessmentRun[]>("get_assessment_runs"),
      ]);

      setDomains(domList || []);
      setCategories(catList || []);
      setTestCases(tcList || []);
      setTemplates(tplList || []);
      setRuns(runList || []);

      if (runList && runList.length > 0) {
        const latest = runList[0];
        setActiveRun(latest);
        loadExecutions(latest.id);
      }
    } catch (err: any) {
      console.error("Failed to load taxonomy data:", err);
      setStatusMessage(`Error loading taxonomy: ${err.toString()}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadExecutions(runId: string) {
    if (!isTauriApp) return;
    try {
      const execList = await invoke<TestCaseExecution[]>("get_test_executions", { assessmentRunId: runId });
      setExecutions(execList || []);
    } catch (err) {
      console.error("Failed to load executions:", err);
    }
  }

  async function handleCreateRun(templateId: string) {
    if (!isTauriApp) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    try {
      setStatusMessage("Initializing new assessment run...");
      const newRun = await invoke<AssessmentRun>("create_assessment_run", {
        title: `${tpl.name} - ${new Date().toLocaleDateString()}`,
        targetId: currentTargetId,
        targetUrl: currentTargetUrl,
        domainId: selectedDomainId,
        categoryId: selectedCategoryId,
        templateId: tpl.id,
        templateVersion: tpl.version,
        testCaseIds: tpl.test_case_ids,
      });

      setRuns((prev) => [newRun, ...prev]);
      setActiveRun(newRun);
      await loadExecutions(newRun.id);
      setStatusMessage(`Started assessment run: ${newRun.title}`);
    } catch (err: any) {
      setStatusMessage(`Failed to create run: ${err.toString()}`);
    }
  }

  async function handleRecordStatus(testCaseId: string, status: "Passed" | "Failed" | "Inconclusive" | "NotApplicable", notes?: string) {
    if (!activeRun || !isTauriApp) return;
    try {
      const updated = await invoke<TestCaseExecution>("update_test_case_execution", {
        assessmentRunId: activeRun.id,
        testCaseId,
        status,
        executionMode: "Manual",
        observedEvidence: notes || "Manual verification confirmed.",
        operatorNotes: notes || null,
      });

      setExecutions((prev) => prev.map((e) => (e.test_case_id === testCaseId ? updated : e)));
      // Refresh run stats
      const runList = await invoke<AssessmentRun[]>("get_assessment_runs");
      setRuns(runList || []);
      const updatedRun = runList.find((r) => r.id === activeRun.id);
      if (updatedRun) setActiveRun(updatedRun);
    } catch (err: any) {
      setStatusMessage(`Execution update failed: ${err.toString()}`);
    }
  }

  // Filtered test cases
  const filteredTestCases = testCases.filter((tc) => {
    const matchCat = tc.category_id === selectedCategoryId;
    const matchSearch =
      searchQuery === "" ||
      tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tc.cwe && tc.cwe.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tc.owasp_id && tc.owasp_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const activeTemplate = templates.find((t) => t.category_id === selectedCategoryId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
      {/* Top Banner / Domain Switcher */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={22} color="var(--accent-cyan)" />
              Category-Specific Security Assessment Engine
            </h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Versioned security assessment taxonomy, automated/manual test case verification, and persistent execution state.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Security Domain:</span>
            <div style={{ display: "flex", background: "var(--bg-main)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              {domains.map((dom) => (
                <button
                  key={dom.id}
                  onClick={() => {
                    setSelectedDomainId(dom.id);
                    const defaultCat = categories.find((c) => c.domain_id === dom.id);
                    if (defaultCat) setSelectedCategoryId(defaultCat.id);
                  }}
                  className={`btn ${selectedDomainId === dom.id ? "btn-primary" : "btn-ghost"}`}
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: selectedDomainId === dom.id ? 600 : 400,
                  }}
                >
                  {dom.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {statusMessage && (
          <div style={{ marginTop: "10px", fontSize: "0.8rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Activity size={14} className="spin" />
            {statusMessage}
          </div>
        )}
      </div>

      {/* Active Run Status Bar */}
      <div className="card" style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "rgba(6, 182, 212, 0.04)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Assessment Run</div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-main)" }}>
              {activeRun ? activeRun.title : "No active assessment run"}
            </div>
          </div>
          {activeRun && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "0.8rem" }}>
              <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)" }}>
                ✓ {activeRun.passed_tests} Passed
              </span>
              <span className="badge" style={{ background: "rgba(244, 63, 94, 0.15)", color: "var(--accent-rose)" }}>
                ✗ {activeRun.failed_tests} Failed
              </span>
              <span className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}>
                ? {activeRun.inconclusive_tests} Inconclusive
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {activeTemplate && (
            <button
              onClick={() => handleCreateRun(activeTemplate.id)}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}
            >
              <Play size={14} color="var(--accent-cyan)" />
              New Run from Template ({activeTemplate.name})
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Test Case Catalog, Right Test Case Inspector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", flex: 1, minHeight: 0 }}>
        {/* Left Column: Test Cases List */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} />
              Test Case Catalog ({filteredTestCases.length})
            </h3>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  color: "var(--text-main)",
                  width: "160px",
                }}
              />
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredTestCases.map((tc) => {
              const exec = executions.find((e) => e.test_case_id === tc.id);
              const isSelected = selectedTestCase?.id === tc.id;
              return (
                <div
                  key={tc.id}
                  onClick={() => setSelectedTestCase(tc)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: isSelected ? "rgba(6, 182, 212, 0.1)" : "var(--bg-card)",
                    border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--border-color)"}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                      {tc.phase}
                    </span>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {tc.safety_level === "Safe" && (
                        <span style={{ fontSize: "0.68rem", color: "var(--accent-emerald)", background: "rgba(16, 185, 129, 0.1)", padding: "1px 6px", borderRadius: "10px" }}>
                          Safe
                        </span>
                      )}
                      {tc.safety_level === "Caution" && (
                        <span style={{ fontSize: "0.68rem", color: "var(--accent-amber)", background: "rgba(245, 158, 11, 0.1)", padding: "1px 6px", borderRadius: "10px" }}>
                          Caution
                        </span>
                      )}
                      {tc.safety_level === "Danger" && (
                        <span style={{ fontSize: "0.68rem", color: "var(--accent-rose)", background: "rgba(244, 63, 94, 0.1)", padding: "1px 6px", borderRadius: "10px" }}>
                          Danger
                        </span>
                      )}
                      {exec && exec.status === "Passed" && <CheckCircle2 size={14} color="var(--accent-emerald)" />}
                      {exec && exec.status === "Failed" && <XCircle size={14} color="var(--accent-rose)" />}
                      {exec && exec.status === "Inconclusive" && <AlertTriangle size={14} color="var(--accent-amber)" />}
                    </div>
                  </div>

                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                    {tc.title}
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "10px" }}>
                    {tc.owasp_id && <span>OWASP: {tc.owasp_id}</span>}
                    {tc.cwe && <span>{tc.cwe}</span>}
                    <span>Severity: {tc.severity_guidance}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Execution & Verification Inspector */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px", overflowY: "auto" }}>
          {selectedTestCase ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                  {selectedTestCase.phase} • {selectedTestCase.subphase}
                </div>
                <h3 style={{ margin: "4px 0 8px 0", fontSize: "1.1rem" }}>{selectedTestCase.title}</h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {selectedTestCase.description}
                </p>
              </div>

              {/* Execution Actions */}
              <div style={{ padding: "12px", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Record Test Verdict
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleRecordStatus(selectedTestCase.id, "Passed", "Verified secure behavior.")}
                    className="btn btn-secondary"
                    style={{ flex: 1, color: "var(--accent-emerald)", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <CheckCircle2 size={14} /> Pass
                  </button>
                  <button
                    onClick={() => handleRecordStatus(selectedTestCase.id, "Failed", "Vulnerability detected / control missing.")}
                    className="btn btn-secondary"
                    style={{ flex: 1, color: "var(--accent-rose)", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <XCircle size={14} /> Fail
                  </button>
                  <button
                    onClick={() => handleRecordStatus(selectedTestCase.id, "Inconclusive", "Inconclusive outcome.")}
                    className="btn btn-secondary"
                    style={{ flex: 1, color: "var(--accent-amber)", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    <AlertTriangle size={14} /> Inconclusive
                  </button>
                  <button
                    onClick={() => handleRecordStatus(selectedTestCase.id, "NotApplicable", "N/A for target.")}
                    className="btn btn-secondary"
                    style={{ flex: 1, color: "var(--text-dim)", fontSize: "0.8rem" }}
                  >
                    N/A
                  </button>
                </div>
              </div>

              {/* Manual Procedure */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                  Verification Procedure
                </div>
                <div style={{ padding: "10px", background: "var(--bg-main)", borderRadius: "6px", fontSize: "0.8rem", whiteSpace: "pre-wrap", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {selectedTestCase.manual_procedure}
                </div>
              </div>

              {/* Automated Command Example */}
              {selectedTestCase.command_example && (
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Terminal size={14} /> Automated CLI Command Example
                  </div>
                  <div style={{ padding: "8px 10px", background: "var(--bg-main)", borderRadius: "6px", fontSize: "0.78rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                    {selectedTestCase.command_example.replace("{TARGET_URL}", currentTargetUrl)}
                  </div>
                </div>
              )}

              {/* Expected Secure vs Failure Indicators */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.05)", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "4px" }}>
                    Expected Secure Behavior
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {selectedTestCase.expected_secure_behavior}
                  </div>
                </div>

                <div style={{ padding: "10px", background: "rgba(244, 63, 94, 0.05)", borderRadius: "6px", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent-rose)", marginBottom: "4px" }}>
                    Failure Indicators
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {selectedTestCase.failure_indicators}
                  </div>
                </div>
              </div>

              {/* Remediation Guidance */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                  Remediation Guidance
                </div>
                <div style={{ padding: "10px", background: "var(--bg-main)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {selectedTestCase.remediation_guidance}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", textAlign: "center" }}>
              <Layers size={36} style={{ marginBottom: "12px", opacity: 0.5 }} />
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>No Test Case Selected</div>
              <div style={{ fontSize: "0.8rem" }}>Select a test case from the left catalog to inspect procedure and record execution verdict.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
