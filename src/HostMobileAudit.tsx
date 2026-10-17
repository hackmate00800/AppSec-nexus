import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Monitor,
  Smartphone,
  ShieldAlert,
  Play,
  RotateCcw,
  FileCode,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Finding, WindowsAuditReport, AndroidAuditReport } from "./types";

interface HostMobileAuditProps {
  targetId: string;
  onFindingsAdded: (newFindings: Finding[]) => void;
  onNavigateFinding?: (finding: Finding) => void;
}

const SAMPLE_VULNERABLE_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.insecure.bankapp"
    android:versionCode="1"
    android:versionName="1.0" >

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="30" />

    <!-- Overprivileged & Sensitive Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <application
        android:allowBackup="true"
        android:debuggable="true"
        android:usesCleartextTraffic="true"
        android:icon="@mipmap/ic_launcher"
        android:label="InsecureBank" >

        <!-- Hardcoded Secret in Metadata -->
        <meta-data android:name="com.google.android.geo.API_KEY"
            android:value="AIzaSyD-TEST-EXPOSED-GOOGLE-KEY-12345678" />

        <!-- Exported Activity without Permission Protection -->
        <activity
            android:name=".TransferFundsActivity"
            android:exported="true" >
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="bankapp" android:host="transfer" />
            </intent-filter>
        </activity>

        <!-- Exported Content Provider with Grant Permissions -->
        <provider
            android:name=".UserDataProvider"
            android:authorities="com.insecure.bankapp.provider"
            android:exported="true"
            android:grantUriPermissions="true" />

        <!-- Insecure Broadcast Receiver -->
        <receiver
            android:name=".SmsListenerReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>`;

export function HostMobileAudit({ targetId, onFindingsAdded }: HostMobileAuditProps) {
  const [subTab, setSubTab] = useState<"windows" | "android">("windows");

  // Windows Audit State
  const [isAuditingWindows, setIsAuditingWindows] = useState<boolean>(false);
  const [windowsReport, setWindowsReport] = useState<WindowsAuditReport | null>(null);
  const [windowsError, setWindowsError] = useState<string>("");

  // Android Audit State
  const [androidManifest, setAndroidManifest] = useState<string>("");
  const [isAuditingAndroid, setIsAuditingAndroid] = useState<boolean>(false);
  const [androidReport, setAndroidReport] = useState<AndroidAuditReport | null>(null);
  const [androidError, setAndroidError] = useState<string>("");

  async function handleRunWindowsAudit() {
    setIsAuditingWindows(true);
    setWindowsError("");
    try {
      const report = await invoke<WindowsAuditReport>("run_windows_audit", {
        targetId,
      });
      setWindowsReport(report);
      if (report.findings.length > 0) {
        onFindingsAdded(report.findings);
      }
    } catch (err: any) {
      setWindowsError(err?.toString() || "Windows audit failed");
    } finally {
      setIsAuditingWindows(false);
    }
  }

  async function handleRunAndroidAudit() {
    if (!androidManifest.trim()) {
      setAndroidError("Please enter or paste an AndroidManifest.xml first.");
      return;
    }
    setIsAuditingAndroid(true);
    setAndroidError("");
    try {
      const report = await invoke<AndroidAuditReport>("run_android_audit", {
        targetId,
        manifestContent: androidManifest,
      });
      setAndroidReport(report);
      if (report.findings.length > 0) {
        onFindingsAdded(report.findings);
      }
    } catch (err: any) {
      setAndroidError(err?.toString() || "Android audit failed");
    } finally {
      setIsAuditingAndroid(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Sub-navigation */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {subTab === "windows" ? (
            <Monitor size={22} color="var(--accent-blue)" />
          ) : (
            <Smartphone size={22} color="var(--accent-emerald)" />
          )}
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
              {subTab === "windows"
                ? "Windows Software & Host Vulnerability Auditor"
                : "Android App (APK / Manifest) Security Auditor"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "2px 0 0 0" }}>
              {subTab === "windows"
                ? "Static & configuration audit for unquoted service paths, AlwaysInstallElevated, UAC, and Autorun keys."
                : "Static Application Security Testing (SAST) for Android apps, permissions, and exported components."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`filter-chip ${subTab === "windows" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => setSubTab("windows")}
          >
            <Monitor size={14} /> Windows Software Audit
          </button>
          <button
            className={`filter-chip ${subTab === "android" ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => setSubTab("android")}
          >
            <Smartphone size={14} /> Android App SAST
          </button>
        </div>
      </div>

      {/* WINDOWS AUDIT TAB */}
      {subTab === "windows" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-title">
              <ShieldAlert size={18} color="var(--accent-blue)" />
              <span>Windows Host Security Auditing Engine</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
              Evaluates the local Windows operating system and installed services against established local privilege escalation vectors (CWE-428, CWE-250, CWE-269).
            </p>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={isAuditingWindows}
                onClick={handleRunWindowsAudit}
              >
                <Play size={16} />
                {isAuditingWindows ? "Auditing Windows Host Configuration..." : "Run Windows Host Audit"}
              </button>

              {windowsReport && (
                <span style={{ fontSize: "0.82rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                  ✓ Completed {windowsReport.checks_run} security audits on {windowsReport.hostname} ({windowsReport.findings.length} findings recorded)
                </span>
              )}
            </div>

            {windowsError && (
              <div style={{ marginTop: "12px", color: "var(--accent-rose)", fontSize: "0.85rem" }}>
                Error: {windowsError}
              </div>
            )}
          </div>

          {/* Windows Audit Findings */}
          {windowsReport && (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-title">
                <AlertTriangle size={18} color="var(--accent-amber)" />
                <span>Windows Security Findings ({windowsReport.findings.length})</span>
              </div>

              {windowsReport.findings.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--accent-emerald)" }}>
                  <CheckCircle2 size={36} style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontWeight: 600 }}>No High or Critical Windows Misconfigurations Detected!</p>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    All services are quoted, AlwaysInstallElevated is disabled, and UAC protection is active.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {windowsReport.findings.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{f.title}</span>
                        <span className={`badge badge-${f.severity.toLowerCase()}`}>
                          {f.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                        Asset: {f.affected_asset} {f.cwe ? `• ${f.cwe}` : ""}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "10px", lineHeight: "1.4" }}>
                        {f.evidence}
                      </div>
                      <div
                        style={{
                          backgroundColor: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          color: "#86efac",
                          fontFamily: "Fira Code, monospace",
                        }}
                      >
                        <strong>Remediation:</strong> {f.remediation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ANDROID SAST TAB */}
      {subTab === "android" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div className="card-title" style={{ margin: 0 }}>
                <Smartphone size={18} color="var(--accent-emerald)" />
                <span>AndroidManifest.xml Static Security Analyzer</span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                onClick={() => setAndroidManifest(SAMPLE_VULNERABLE_MANIFEST)}
              >
                <FileCode size={13} /> Load Sample Insecure APK Manifest
              </button>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "14px" }}>
              Paste the decompiled <code>AndroidManifest.xml</code> from any target APK. AppSec Nexus audits for debuggable flags, ADB backup exposures, cleartext traffic, exported components without permissions, and dangerous permissions.
            </p>

            <textarea
              className="textarea-field"
              rows={12}
              placeholder="Paste AndroidManifest.xml code here or click 'Load Sample Insecure APK Manifest'..."
              value={androidManifest}
              onChange={(e) => setAndroidManifest(e.target.value)}
              style={{ fontSize: "0.8rem", lineHeight: "1.4" }}
            />

            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "14px", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={isAuditingAndroid || !androidManifest.trim()}
                onClick={handleRunAndroidAudit}
              >
                <Play size={16} />
                {isAuditingAndroid ? "Analyzing Android Security Architecture..." : "Audit Android App Manifest"}
              </button>
              {androidManifest && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setAndroidManifest("");
                    setAndroidReport(null);
                  }}
                  style={{ fontSize: "0.8rem", padding: "8px 12px" }}
                >
                  <RotateCcw size={14} /> Clear
                </button>
              )}
            </div>

            {androidError && (
              <div style={{ marginTop: "10px", color: "var(--accent-rose)", fontSize: "0.85rem" }}>
                {androidError}
              </div>
            )}
          </div>

          {/* Android Audit Report */}
          {androidReport && (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-title" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldAlert size={18} color="var(--accent-rose)" />
                  <span>Android SAST Findings for {androidReport.package_name}</span>
                </div>
                <span className="badge badge-critical">
                  {androidReport.findings.length} Vulnerabilities Found
                </span>
              </div>

              {/* Package Meta Info */}
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px", padding: "10px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Package ID</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "Fira Code, monospace" }}>{androidReport.package_name}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Target SDK</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{androidReport.target_sdk || "Not Specified"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Min SDK</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{androidReport.min_sdk || "Not Specified"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Exported Components</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-amber)" }}>{androidReport.exported_components.length}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block" }}>Permissions Requested</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-cyan)" }}>{androidReport.permissions_detected.length}</span>
                </div>
              </div>

              {/* Findings List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {androidReport.findings.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{f.title}</span>
                      <span className={`badge badge-${f.severity.toLowerCase()}`}>
                        {f.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: "8px" }}>
                      Asset: {f.affected_asset} {f.cwe ? `• ${f.cwe}` : ""}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "10px", lineHeight: "1.4" }}>
                      {f.evidence}
                    </div>
                    <div
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        color: "#86efac",
                      }}
                    >
                      <strong>Remediation:</strong> {f.remediation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
