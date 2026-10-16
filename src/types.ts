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

