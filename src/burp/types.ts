export interface BurpConnectionConfig {
  host: string;
  port: number;
  autoConnect: boolean;
}

export interface BurpConnectionStatus {
  is_connected: boolean;
  host: string;
  port: number;
  latency_ms?: number;
  burp_edition?: string;
  is_burp: boolean;
  port_conflict_detected: boolean;
  conflicting_service?: string;
  message: string;
}

export interface BurpTrafficItem {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | string;
  url: string;
  host: string;
  path: string;
  status_code: number;
  request_headers: Record<string, string>;
  request_body?: string;
  response_headers: Record<string, string>;
  response_body?: string;
  response_size: number;
  latency_ms: number;
  source: string;
  is_tls: boolean;
}

export interface BurpRepeaterRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  use_proxy: boolean;
  proxy_host?: string;
  proxy_port?: number;
  timeout_seconds?: number;
}

export interface BurpRepeaterResponse {
  status_code: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  latency_ms: number;
  content_length: number;
  routed_via_proxy: boolean;
}

export interface BurpXmlParsedIssue {
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  confidence: number;
  affected_asset: string;
  evidence: string;
  cwe?: string;
  remediation: string;
  is_duplicate?: boolean;
}

export interface BurpConnectorStatus {
  is_running: boolean;
  host: string;
  port: number;
  token: string;
  total_ingested: number;
  last_ingested_at?: string;
}

export interface BurpFindingImportItem {
  title: string;
  severity?: string;
  confidence?: number;
  affected_asset?: string;
  url?: string;
  parameter?: string;
  evidence?: string;
  remediation?: string;
  cwe?: string;
  description?: string;
}

export interface BurpTrafficIngestionEvent {
  count: number;
  duplicates_skipped: number;
  latest_item?: BurpTrafficItem;
}

