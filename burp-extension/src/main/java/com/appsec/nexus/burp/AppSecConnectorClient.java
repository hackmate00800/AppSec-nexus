package com.appsec.nexus.burp;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Loopback HTTP connector client connecting Burp Suite to AppSec Nexus.
 * Uses standard Java 11+ HttpClient with zero external dependencies.
 */
public class AppSecConnectorClient {
    private String baseUrl;
    private String authToken;
    private final HttpClient httpClient;

    public AppSecConnectorClient(String baseUrl, String authToken) {
        this.baseUrl = normalizeUrl(baseUrl);
        this.authToken = authToken != null ? authToken.trim() : "";
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public void updateConfig(String baseUrl, String authToken) {
        this.baseUrl = normalizeUrl(baseUrl);
        this.authToken = authToken != null ? authToken.trim() : "";
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getAuthToken() {
        return authToken;
    }

    private static String normalizeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return "http://127.0.0.1:41785";
        }
        String u = url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }

    /**
     * Tests connectivity to AppSec Nexus backend loopback health check.
     */
    public HealthCheckResult checkHealth() {
        long start = System.currentTimeMillis();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/health"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            long latency = System.currentTimeMillis() - start;

            if (response.statusCode() == 200) {
                return new HealthCheckResult(true, "Connected to AppSec Nexus (" + latency + "ms)", latency);
            } else {
                return new HealthCheckResult(false, "Server returned HTTP " + response.statusCode(), latency);
            }
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            return new HealthCheckResult(false, "Connection refused: Ensure AppSec Nexus is running (" + e.getMessage() + ")", latency);
        }
    }

    /**
     * Exports a batch of traffic records to AppSec Nexus loopback connector.
     */
    public IngestionResult exportTraffic(List<TrafficRecord> records) {
        if (records == null || records.isEmpty()) {
            return new IngestionResult(true, 0, 0, "No records to export");
        }

        try {
            String jsonPayload = serializeTrafficList(records);

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/burp/traffic"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header("X-AppSec-Token", authToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload));

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return new IngestionResult(true, records.size(), 0, "Successfully exported " + records.size() + " traffic transactions to AppSec Nexus");
            } else if (response.statusCode() == 401) {
                return new IngestionResult(false, 0, 0, "Authentication failed (401): Check the X-AppSec-Token configured in settings");
            } else {
                return new IngestionResult(false, 0, 0, "AppSec server returned error HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            return new IngestionResult(false, 0, 0, "Failed to connect to AppSec Nexus at " + baseUrl + ": " + e.getMessage());
        }
    }

    /**
     * Exports a security finding with attached evidence to AppSec Nexus.
     */
    public IngestionResult exportFinding(FindingRecord finding) {
        try {
            String jsonPayload = "[" + serializeFinding(finding) + "]";

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/burp/findings"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header("X-AppSec-Token", authToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload));

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return new IngestionResult(true, 1, 0, "Finding '" + finding.title + "' exported to AppSec Nexus (NeedsValidation)");
            } else if (response.statusCode() == 401) {
                return new IngestionResult(false, 0, 0, "Authentication failed (401): Check X-AppSec-Token");
            } else {
                return new IngestionResult(false, 0, 0, "Server error HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            return new IngestionResult(false, 0, 0, "Failed to export finding: " + e.getMessage());
        }
    }

    public static String serializeTrafficList(List<TrafficRecord> records) {
        StringBuilder sb = new StringBuilder();
        sb.append("[\n");
        for (int i = 0; i < records.size(); i++) {
            sb.append(serializeTraffic(records.get(i)));
            if (i < records.size() - 1) {
                sb.append(",\n");
            }
        }
        sb.append("\n]");
        return sb.toString();
    }

    public static String serializeTraffic(TrafficRecord tr) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        appendJsonField(sb, "id", tr.id != null ? tr.id : java.util.UUID.randomUUID().toString(), true);
        appendJsonField(sb, "timestamp", tr.timestamp != null ? tr.timestamp : java.time.Instant.now().toString(), true);
        appendJsonField(sb, "method", tr.method != null ? tr.method : "GET", true);
        appendJsonField(sb, "url", tr.url != null ? tr.url : "", true);
        appendJsonField(sb, "host", tr.host != null ? tr.host : "", true);
        appendJsonField(sb, "path", tr.path != null ? tr.path : "", true);
        sb.append("  \"status_code\": ").append(tr.statusCode).append(",\n");

        // Headers
        sb.append("  \"request_headers\": ");
        appendMap(sb, tr.requestHeaders);
        sb.append(",\n");

        if (tr.requestBody != null) {
            appendJsonField(sb, "request_body", tr.requestBody, true);
        } else {
            sb.append("  \"request_body\": null,\n");
        }

        sb.append("  \"response_headers\": ");
        appendMap(sb, tr.responseHeaders);
        sb.append(",\n");

        if (tr.responseBody != null) {
            appendJsonField(sb, "response_body", tr.responseBody, true);
        } else {
            sb.append("  \"response_body\": null,\n");
        }

        sb.append("  \"response_size\": ").append(tr.responseSize).append(",\n");
        sb.append("  \"latency_ms\": ").append(tr.latencyMs).append(",\n");
        appendJsonField(sb, "source", tr.source != null ? tr.source : "Burp Community Extension", true);
        sb.append("  \"is_tls\": ").append(tr.isTls).append("\n");
        sb.append("}");
        return sb.toString();
    }

    public static String serializeFinding(FindingRecord f) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        appendJsonField(sb, "title", f.title != null ? f.title : "Burp Finding", true);
        appendJsonField(sb, "severity", f.severity != null ? f.severity : "Info", true);
        sb.append("  \"confidence\": ").append(f.confidence).append(",\n");
        appendJsonField(sb, "url", f.url != null ? f.url : "", true);
        if (f.parameter != null) appendJsonField(sb, "parameter", f.parameter, true);
        if (f.cwe != null) appendJsonField(sb, "cwe", f.cwe, true);
        if (f.remediation != null) appendJsonField(sb, "remediation", f.remediation, true);
        if (f.description != null) appendJsonField(sb, "description", f.description, true);
        appendJsonField(sb, "evidence", f.evidence != null ? f.evidence : "", false);
        sb.append("\n}");
        return sb.toString();
    }

    private static void appendJsonField(StringBuilder sb, String key, String val, boolean trailingComma) {
        sb.append("  \"").append(key).append("\": \"").append(escapeJson(val)).append("\"");
        if (trailingComma) sb.append(",");
        sb.append("\n");
    }

    private static void appendMap(StringBuilder sb, Map<String, String> map) {
        if (map == null || map.isEmpty()) {
            sb.append("{}");
            return;
        }
        sb.append("{\n");
        int count = 0;
        int size = map.size();
        for (Map.Entry<String, String> entry : map.entrySet()) {
            count++;
            sb.append("    \"").append(escapeJson(entry.getKey())).append("\": \"")
              .append(escapeJson(entry.getValue())).append("\"");
            if (count < size) sb.append(",");
            sb.append("\n");
        }
        sb.append("  }");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }

    public static class HealthCheckResult {
        public final boolean isConnected;
        public final String message;
        public final long latencyMs;

        public HealthCheckResult(boolean isConnected, String message, long latencyMs) {
            this.isConnected = isConnected;
            this.message = message;
            this.latencyMs = latencyMs;
        }
    }

    public static class IngestionResult {
        public final boolean isSuccess;
        public final int ingested;
        public final int duplicates;
        public final String message;

        public IngestionResult(boolean isSuccess, int ingested, int duplicates, String message) {
            this.isSuccess = isSuccess;
            this.ingested = ingested;
            this.duplicates = duplicates;
            this.message = message;
        }
    }
}
