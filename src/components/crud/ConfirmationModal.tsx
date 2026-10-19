import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  recordIdentifier?: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  recordIdentifier,
  confirmLabel = "Delete",
  confirmVariant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

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
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
          padding: "20px",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: confirmVariant === "danger" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: confirmVariant === "danger" ? "var(--accent-rose)" : "var(--accent-amber)",
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 id="confirm-modal-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              {title}
            </h3>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 8px" }}
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>

        <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 12px 0" }}>
          {message}
        </p>

        {recordIdentifier && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              color: "var(--text-main)",
              marginBottom: "16px",
              wordBreak: "break-all",
            }}
          >
            {recordIdentifier}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${confirmVariant === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={isLoading}
            style={{ minWidth: "90px" }}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
