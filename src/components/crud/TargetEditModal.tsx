import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Target } from "../../types";
import { Globe, X, Check, AlertCircle } from "lucide-react";

interface TargetEditModalProps {
  isOpen: boolean;
  target: Target | null;
  onSave: (updated: Target) => void;
  onClose: () => void;
}

export const TargetEditModal: React.FC<TargetEditModalProps> = ({
  isOpen,
  target,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [allowLocalLab, setAllowLocalLab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (target) {
      setName(target.name);
      setPrimaryUrl(target.primary_url);
      setAllowLocalLab(target.scope?.allow_local_lab ?? false);
      setError(null);
    }
  }, [target, isOpen]);

  if (!isOpen || !target) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (!name.trim()) {
      setError("Target name cannot be empty.");
      return;
    }
    if (!primaryUrl.trim()) {
      setError("Target URL cannot be empty.");
      return;
    }

    try {
      new URL(primaryUrl);
    } catch {
      setError("Please provide a valid URL format (e.g., https://example.com or http://127.0.0.1:3000).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await invoke<Target>("update_target", {
        id: target.id,
        name: name.trim(),
        primaryUrl: primaryUrl.trim(),
        allowLocalLab,
      });
      onSave(updated);
      onClose();
    } catch (err: any) {
      setError(err?.toString() || "Failed to update target.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
          padding: "20px",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="target-edit-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Globe size={18} color="var(--accent-cyan)" />
            <h3 id="target-edit-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              Edit Authorized Target
            </h3>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px" }}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label htmlFor="target-edit-name" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Target Name
            </label>
            <input
              id="target-edit-name"
              aria-label="Target Display Name"
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production API, Local Juice Shop"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="target-edit-url" style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "4px" }}>
              Primary Address (URL)
            </label>
            <input
              id="target-edit-url"
              aria-label="Primary Target URL"
              type="text"
              className="input-field"
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder="e.g., https://api.example.com or http://127.0.0.1:3000"
              required
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
            <input
              type="checkbox"
              id="editLabMode"
              checked={allowLocalLab}
              onChange={(e) => setAllowLocalLab(e.target.checked)}
              disabled={isSubmitting}
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="editLabMode" style={{ fontSize: "0.82rem", cursor: "pointer", color: "var(--text-main)" }}>
              Enable Local Lab Mode (allows loopback 127.0.0.1 and private subnets for Docker / CTF labs)
            </label>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--accent-rose)",
                fontSize: "0.8rem",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Check size={14} />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
