export interface ScopeConfig {
  allowed_hosts: string[];
  allowed_prefixes: string[];
  allowed_ports: number[];
  excluded_paths: string[];
  allow_local_lab: boolean;
}

export interface Target {
  id: string;
  name: string;
  primary_url: string;
  created_at: string;
  scope: ScopeConfig;
}

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";
export type FindingStatus =
  | "New"
  | "NeedsValidation"
  | "Validating"
  | "Confirmed"
  | "LikelyTruePositive"
  | "NeedsReview"
  | "Unconfirmed"
  | "LikelyFalsePositive"
  | "ValidationFailed"
  | "NotApplicable"
  | "AcceptedRisk"
  | "Fixed"
  | "FalsePositive";

export interface ValidationRecord {
  id: string;
  finding_id: string;
  target_id: string;
  status: string;
  hypothesis: string;
  test_method: string;
  preconditions: string;
  expected_observation: string;
  actual_observation: string;
  supporting_evidence: string;
  contradicting_evidence: string;
  confidence_score: number;
  confidence_rationale: string;
  executed_at: string;
  duration_ms: number;
  error_message?: string;
}

export interface Finding {
  id: string;
  target_id: string;
  title: string;
  severity: FindingSeverity;
  confidence: number;
  affected_asset: string;
  evidence: string;
  source_tool: string;
  tool_version: string;
  cwe?: string;
  remediation: string;
  status: FindingStatus;
  created_at: string;
  fingerprint?: string;
  validation_status?: string;
}

export interface FindingUpdatePayload {
  title: string;
  severity: FindingSeverity;
  confidence: number;
  affected_asset: string;
  evidence: string;
  cwe?: string;
  remediation: string;
  status: FindingStatus;
}

export interface AuditLogRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  details_json: string;
  timestamp: string;
}

export interface ToolInfo {
  id: string;
  name: string;
  version: string;
  category: string;
  is_available: boolean;
  path: string;
  description: string;
}

export interface ScanResult {
  scan_id: string;
  target_url: string;
  tool: string;
  status: string;
  logs: string[];
  findings_count: number;
  duration_ms: number;
}

export interface DiscoveredEndpoint {
  id: string;
  target_id: string;
  url: string;
  method: string;
  status_code: number;
  content_type?: string;
  source: string;
  discovered_at: string;
}

export interface ModelPullProgress {
  model: string;
  status: string;
  completed: number;
  total: number;
  percentage: number;
  done: boolean;
  error?: string;
}

export interface PluginPermissions {
  network: string[];
  filesystem: string[];
  environment: string[];
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  publisher: string;
  runtime: string;
  executable: string;
  capabilities: string[];
  permissions: PluginPermissions;
  timeout_seconds: number;
  description: string;
  path: string;
  is_available: boolean;
}

export interface FeedUpdateResult {
  success: boolean;
  nuclei_updated: boolean;
  nuclei_output: string;
  cisa_kev_count: number;
  last_updated: string;
  message: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface WindowsAuditReport {
  findings: Finding[];
  checks_run: number;
  hostname: string;
  os_version: string;
}

export interface AndroidAuditReport {
  package_name: string;
  min_sdk?: string;
  target_sdk?: string;
  findings: Finding[];
  permissions_detected: string[];
  exported_components: string[];
}

// -------------------------------------------------------------
// UNIVERSAL TOOL ADAPTERS & CAPABILITIES
// -------------------------------------------------------------
export type IntegrationType =
  | "native_engine"
  | "cli_process"
  | "local_http_api"
  | "docker_container"
  | "external_gui"
  | "passive_parser";

export type ToolDetectionState =
  | "installed_and_ready"
  | "misconfigured"
  | "detected_unavailable"
  | "not_installed"
  | "integration_not_implemented"
  | "unsupported_os"
  | "permission_required"
  | "health_check_failed";

export type ToolCapability =
  | "passive_audit"
  | "port_scan"
  | "dns_discovery"
  | "http_probing"
  | "tech_detection"
  | "crawling"
  | "vuln_scan"
  | "sast_scan"
  | "injection_testing"
  | "ai_reasoning"
  | "report_export"
  | "gui_launcher";

export interface ToolHealthCheckResult {
  healthy: boolean;
  detection_state: ToolDetectionState;
  detected_version?: string;
  message: string;
  checked_at: string;
  latency_ms: number;
}

export interface ToolAdapterMetadata {
  id: string;
  name: string;
  version: string;
  category: string;
  integration_type: IntegrationType;
  capabilities: ToolCapability[];
  detection_state: ToolDetectionState;
  resolved_path?: string;
  custom_path?: string;
  is_available: boolean;
  is_enabled: boolean;
  install_source?: string;
  description: string;
  documentation_url: string;
  requires_docker: boolean;
}

export interface SystemResourceStatus {
  os: string;
  disk_total_gb: number;
  disk_free_gb: number;
  disk_used_gb: number;
  disk_warning: boolean;
  ram_total_mb: number;
  ram_avail_mb: number;
  ram_used_mb: number;
  ram_warning: boolean;
  warnings: string[];
}

export interface AdapterOutput {
  tool_id: string;
  target_url: string;
  status: string;
  logs: string[];
  findings: Finding[];
  endpoints: DiscoveredEndpoint[];
  artifacts: Record<string, string>;
  duration_ms: number;
}

// -------------------------------------------------------------
// FUTURE-PROOF EXTENSIONS (V1)
// -------------------------------------------------------------
export type ExtensionLifecycleState =
  | "discovered"
  | "validated"
  | "available"
  | "enabled"
  | "disabled"
  | "removed"
  | "error";

export interface ExtensionParamDef {
  name: string;
  param_type: string;
  default_value?: string;
  required: boolean;
  description: string;
}

export interface ExtensionManifestV1 {
  manifest_version: number;
  id: string;
  name: string;
  version: string;
  publisher: string;
  description: string;
  category: string;
  runtime: string;
  entrypoint: string;
  capabilities: string[];
  permissions: {
    network: string[];
    filesystem: string[];
    environment: string[];
  };
  parameters: ExtensionParamDef[];
  timeout_seconds?: number;
}

export interface ExtensionRecord {
  manifest: ExtensionManifestV1;
  state: ExtensionLifecycleState;
  path: string;
  is_available: boolean;
  installed_at: string;
  updated_at: string;
  error_message?: string;
}

// -------------------------------------------------------------
// MODULAR WORKFLOW ORCHESTRATION & DAG JOBS
// -------------------------------------------------------------
export type JobStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type StepStatus =
  | "pending"
  | "waiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export interface WorkflowStepDefinition {
  step_id: string;
  name: string;
  tool_id: string;
  depends_on: string[];
  input_mapping: Record<string, string>;
  requires_approval: boolean;
  timeout_seconds: number;
  continue_on_failure: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  steps: WorkflowStepDefinition[];
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepRun {
  id: string;
  job_id: string;
  step_id: string;
  step_name: string;
  tool_id: string;
  status: StepStatus;
  started_at?: string;
  finished_at?: string;
  duration_ms: number;
  findings_count: number;
  logs: string[];
  error_message?: string;
  artifacts: Record<string, string>;
}

export interface WorkflowJob {
  job_id: string;
  workflow_id: string;
  workflow_name: string;
  target_id: string;
  target_url: string;
  status: JobStatus;
  current_step_id?: string;
  pending_approval_step?: string;
  step_runs: WorkflowStepRun[];
  started_at: string;
  finished_at?: string;
  duration_ms: number;
  total_findings: number;
  logs: string[];
}

export type AiTaskStatus = "Queued" | "Running" | "Completed" | "Failed" | "Cancelled";

export interface AiTask {
  id: string;
  conversation_id: string;
  model: string;
  prompt_preview: string;
  status: AiTaskStatus;
  system_prompt?: string;
  messages_json: string;
  result?: string;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms: number;
}

export interface AiChatMessageRecord {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  task_id?: string;
}

export type WorkspacePreset = "default" | "compact" | "analyst" | "pentest" | "api" | "learning";
export type WorkspaceDensity = "compact" | "normal" | "spacious";

export interface PanelState {
  id: string;
  title: string;
  visible: boolean;
  minimized: boolean;
  maximized: boolean;
  collapsed: boolean;
  width?: number;
  height?: number;
  previousDimensions?: { width?: number; height?: number };
}

export interface WorkspaceTabItem {
  id: string;
  label: string;
  closable: boolean;
  pinned?: boolean;
}

export interface WorkspaceLayoutConfig {
  preset: WorkspacePreset;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  findingsSplitRatio: number;
  findingsDetailsMaximized: boolean;
  density: WorkspaceDensity;
  dashboardWidgetOrder: string[];
  tabOrder: string[];
  closedTabs: string[];
  panels: Record<string, PanelState>;
}

export type SecurityAiRole = "quick" | "deep" | "deepseek";

export interface DeepSeekProviderStatus {
  is_configured: boolean;
  endpoint: string;
  model: string;
  status: string; // "configured" | "not_configured" | "available" | "auth_failed" | "rate_limited" | "quota_exceeded" | "temporarily_unavailable" | "disabled"
  error_message: string | null;
}

export interface OllamaSystemInfo {
  is_online: boolean;
  version: string | null;
  endpoint: string;
  installed_models: string[];
  last_checked: string;
  error_message: string | null;
}

export interface SecurityAiWorkspaceConfig {
  quick_model: string;
  deep_model: string;
  deepseek_model?: string;
  active_model_role: SecurityAiRole;
}

// -------------------------------------------------------------
// ISSUE DOCUMENTATION & TRACKING SYSTEM
// -------------------------------------------------------------
export type IssueCategory =
  | "SecurityVulnerability"
  | "FunctionalBug"
  | "UiUxGlitch"
  | "BackendApiError"
  | "DatabaseIssue"
  | "ToolExecutionFailure"
  | "PerformanceIssue"
  | "ConfigurationIssue"
  | "ManualReport";

export type IssueSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type IssueStatus =
  | "Open"
  | "Investigating"
  | "Confirmed"
  | "FalsePositive"
  | "Fixed"
  | "AcceptedRisk"
  | "RetestFailed"
  | "Closed";

export type IssueVerificationStatus =
  | "AutomatedObservation"
  | "NeedsValidation"
  | "HumanVerified"
  | "RetestedValid"
  | "FalsePositive";

export type IssueSource =
  | "Scanner"
  | "Recon"
  | "ToolExecution"
  | "AiEngine"
  | "SystemDiagnostic"
  | "ManualReport";

export interface IssueHistoryItem {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export interface IssueNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface IssueRecord {
  id: string;
  title: string;
  category: IssueCategory;
  subtype: string;
  severity: IssueSeverity;
  status: IssueStatus;
  verification_status: IssueVerificationStatus;
  affected_target_id?: string | null;
  affected_target_name?: string | null;
  affected_component: string;
  source: IssueSource;
  occurrence_count: number;
  first_detected: string;
  last_detected: string;
  description: string;
  reproduction_steps?: string | null;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  error_details?: string | null;
  evidence?: string | null;
  root_cause?: string | null;
  impact_assessment?: string | null;
  remediation_guidance?: string | null;
  tags_json: string;
  assigned_owner?: string | null;
  notes_json: string;
  related_finding_id?: string | null;
  related_tool_id?: string | null;
  history_json: string;
  resolution_summary?: string | null;
  resolved_at?: string | null;
  fingerprint: string;
}

export interface IssueCreatePayload {
  title: string;
  category: IssueCategory;
  subtype?: string;
  severity: IssueSeverity;
  status?: IssueStatus;
  verification_status?: IssueVerificationStatus;
  affected_target_id?: string | null;
  affected_target_name?: string | null;
  affected_component: string;
  source?: IssueSource;
  description: string;
  reproduction_steps?: string | null;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  error_details?: string | null;
  evidence?: string | null;
  root_cause?: string | null;
  impact_assessment?: string | null;
  remediation_guidance?: string | null;
  tags?: string[];
  assigned_owner?: string | null;
  related_finding_id?: string | null;
  related_tool_id?: string | null;
}

export interface IssueUpdatePayload {
  title?: string;
  category?: IssueCategory;
  subtype?: string;
  severity?: IssueSeverity;
  status?: IssueStatus;
  verification_status?: IssueVerificationStatus;
  affected_component?: string;
  description?: string;
  reproduction_steps?: string | null;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  error_details?: string | null;
  evidence?: string | null;
  root_cause?: string | null;
  impact_assessment?: string | null;
  remediation_guidance?: string | null;
  tags?: string[];
  assigned_owner?: string | null;
  resolution_summary?: string | null;
}

export interface ReportGenerateParams {
  title: string;
  template: string;
  target_id?: string | null;
  issue_ids?: string[] | null;
  include_executive_summary: boolean;
  include_evidence: boolean;
  include_remediation: boolean;
  include_history: boolean;
  format: "markdown" | "json" | "html";
}

export interface GeneratedReport {
  id: string;
  title: string;
  template: string;
  generated_at: string;
  scope: string;
  total_issues: number;
  metrics_json: string;
  content: string;
  format: string;
}

// -------------------------------------------------------------
// SCAN ACTIVITY TIMELINE, TRACEABILITY & METHODOLOGIES
// -------------------------------------------------------------
export interface ScanEvent {
  id: string;
  scan_id: string;
  job_id?: string | null;
  timestamp: string;
  event_type: string;
  severity: "info" | "warning" | "error" | "success" | string;
  component_or_tool: string;
  message: string;
  metadata_json: string;
  duration_ms: number;
  status: "success" | "failure" | "skipped" | "warning" | string;
  related_finding_id?: string | null;
  error_details?: string | null;
}

export interface MethodologyDefinition {
  id: string;
  name: string;
  category: string;
  detection_objective: string;
  applicable_vulnerability_classes: string[];
  preconditions: string[];
  input_or_artifact_examined: string;
  detection_logic: string;
  evidence_expected: string;
  verification_strategy: string;
  known_limitations: string[];
  references: string[];
  method_type: "passive" | "active" | "static" | "dynamic" | "manual";
  safe_lab_exercise: string;
}

export interface FindingDetectionTrace {
  finding_id: string;
  scan_id?: string | null;
  detection_timestamp: string;
  target_url: string;
  tool_name: string;
  tool_version: string;
  rule_id: string;
  rule_description: string;
  methodology_id: string;
  methodology_name: string;
  location_examined: string;
  check_performed: string;
  raw_observed_result: string;
  evidence_summary: string;
  human_explanation: string;
  verification_status: string;
  verification_record?: ValidationRecord | null;
  limitations: string[];
  scan_events: ScanEvent[];
}

