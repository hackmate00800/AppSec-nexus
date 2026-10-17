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
export type FindingStatus = "New" | "Confirmed" | "NeedsReview" | "AcceptedRisk" | "Fixed";

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
  description: string;
  documentation_url: string;
  requires_docker: boolean;
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


