package com.appsec.nexus.burp;

/**
 * Data model for findings exported from Burp Community Edition to AppSec Nexus.
 */
public class FindingRecord {
    public String title;
    public String severity; // Critical, High, Medium, Low, Info
    public int confidence = 80;
    public String url;
    public String parameter;
    public String evidence;
    public String remediation;
    public String cwe;
    public String description;

    public FindingRecord(String title, String severity, String url, String evidence) {
        this.title = title;
        this.severity = severity;
        this.url = url;
        this.evidence = evidence;
    }
}
