package com.appsec.nexus.burp;

import java.util.HashMap;
import java.util.Map;

/**
 * Data model representing an HTTP transaction captured via Burp Suite Proxy / Repeater.
 */
public class TrafficRecord {
    public String id;
    public String timestamp;
    public String method;
    public String url;
    public String host;
    public String path;
    public int statusCode;
    public Map<String, String> requestHeaders = new HashMap<>();
    public String requestBody;
    public Map<String, String> responseHeaders = new HashMap<>();
    public String responseBody;
    public int responseSize;
    public long latencyMs;
    public String source;
    public boolean isTls;
    public String exportStatus = "Pending";

    public TrafficRecord() {
        this.source = "Burp Community Extension";
    }

    /**
     * Redacts sensitive authorization tokens, session cookies, and passwords from this record.
     */
    public void redactSensitiveData() {
        if (requestHeaders != null) {
            Map<String, String> cleaned = new HashMap<>();
            for (Map.Entry<String, String> entry : requestHeaders.entrySet()) {
                String key = entry.getKey();
                String val = entry.getValue();
                if (key.equalsIgnoreCase("authorization") && val.toLowerCase().startsWith("bearer ")) {
                    val = "Bearer [REDACTED_BEARER_TOKEN]";
                } else if (key.equalsIgnoreCase("cookie")) {
                    val = redactCookie(val);
                }
                cleaned.put(key, val);
            }
            requestHeaders = cleaned;
        }

        if (responseHeaders != null) {
            Map<String, String> cleaned = new HashMap<>();
            for (Map.Entry<String, String> entry : responseHeaders.entrySet()) {
                String key = entry.getKey();
                String val = entry.getValue();
                if (key.equalsIgnoreCase("set-cookie")) {
                    val = redactCookie(val);
                }
                cleaned.put(key, val);
            }
            responseHeaders = cleaned;
        }

        if (requestBody != null) {
            requestBody = redactBody(requestBody);
        }
        if (responseBody != null) {
            responseBody = redactBody(responseBody);
        }
    }

    private static String redactCookie(String cookie) {
        if (cookie == null) return null;
        return cookie.replaceAll("(?i)(session|token|auth|jwt|phpsessid|jsessionid)=[^;\\s&]+", "$1=[REDACTED_SESSION_COOKIE]");
    }

    private static String redactBody(String body) {
        if (body == null) return null;
        return body.replaceAll("(?i)(api[_-]?key|secret|access[_-]?token|password|passwd)=([^&\\s]+)", "$1=[REDACTED_CREDENTIAL]")
                   .replaceAll("(?i)(\"password\"\\s*:\\s*\")[^\"]+(\")", "$1[REDACTED_CREDENTIAL]$2")
                   .replaceAll("(?i)(\"token\"\\s*:\\s*\")[^\"]+(\")", "$1[REDACTED_TOKEN]$2");
    }
}
