import React from "react";
import { VerificationLabSettings } from "./types";
import { X, Shield, Lock, Sliders, AlertTriangle } from "lucide-react";

interface VerificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VerificationLabSettings;
  onSaveSettings: (newSettings: VerificationLabSettings) => void;
}

export const VerificationSettingsModal: React.FC<VerificationSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = React.useState<VerificationLabSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-settings-title"
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "24px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5)",
          color: "var(--text-main)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "6px", background: "rgba(6, 182, 212, 0.12)", color: "var(--accent-cyan)" }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 id="verification-settings-title" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                Verification Lab Safety & Execution Controls
              </h2>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Configure safe non-destructive probing boundaries and evidence capture policies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: "4px 8px" }}
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "65vh", overflowY: "auto", paddingRight: "4px" }}>
          {/* Safe Mode Guard */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "0.9rem", color: "var(--accent-emerald, #10b981)" }}>
                <Shield size={16} /> Enforce Safe Non-Destructive Mode
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Restricts checks strictly to safe HTTP inspection, passive header verification, and bounded probes. Disables blind fuzzing and destructive SQL DROP/INSERT statements.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.safeModeOnly}
              onChange={(e) => setLocalSettings({ ...localSettings, safeModeOnly: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "var(--accent-cyan)" }}
              aria-label="Enforce Safe Non-Destructive Mode"
            />
          </div>

          {/* User Confirmation Toggle */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "0.9rem" }}>
                <AlertTriangle size={16} color="var(--accent-amber)" /> Require Pre-Flight Probing Confirmation
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Prompts an explicit confirmation dialog detailing proposed checks before sending live HTTP requests.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.requireConfirmation}
              onChange={(e) => setLocalSettings({ ...localSettings, requireConfirmation: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "var(--accent-cyan)" }}
              aria-label="Require Pre-Flight Probing Confirmation"
            />
          </div>

          {/* Scope Enforcement */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "0.9rem" }}>
                <Lock size={16} color="var(--accent-cyan)" /> Strictly Enforce Target Authorization Scope
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Blocks any check where the affected asset does not match the authorized host/port in scope.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enforceScope}
              onChange={(e) => setLocalSettings({ ...localSettings, enforceScope: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "var(--accent-cyan)" }}
              aria-label="Strictly Enforce Target Authorization Scope"
            />
          </div>

          {/* Token & Secret Redaction */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Redact Sensitive Credentials & Cookies</div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Sanitizes Bearer tokens, cookies (PHPSESSID, JWT), passwords, and API keys before saving observations.
              </p>
            </div>
            <input
              type="checkbox"
              checked={localSettings.redactSecrets}
              onChange={(e) => setLocalSettings({ ...localSettings, redactSecrets: e.target.checked })}
              style={{ width: "18px", height: "18px", accentColor: "var(--accent-cyan)" }}
              aria-label="Redact Sensitive Credentials & Cookies"
            />
          </div>

          {/* Numeric Settings: Timeout & Delay */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dim)" }}>
                Probe Timeout (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="30000"
                step="500"
                value={localSettings.requestTimeoutMs}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, requestTimeoutMs: parseInt(e.target.value) || 5000 })
                }
                style={{
                  padding: "8px 10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  color: "var(--text-main)",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dim)" }}>
                Batch Request Delay (ms)
              </label>
              <input
                type="number"
                min="50"
                max="5000"
                step="50"
                value={localSettings.rateLimitDelayMs}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, rateLimitDelayMs: parseInt(e.target.value) || 250 })
                }
                style={{
                  padding: "8px 10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  color: "var(--text-main)",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveSettings(localSettings);
              onClose();
            }}
            className="btn btn-primary"
            style={{ background: "var(--accent-cyan)", color: "#000", fontWeight: 600 }}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
