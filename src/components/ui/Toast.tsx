import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastMessage = { id, type, title, description, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 9999,
          pointerEvents: "none",
          maxWidth: "380px",
          width: "100%",
        }}
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const typeColors = {
            success: {
              border: "rgba(16, 185, 129, 0.4)",
              bg: "var(--bg-card)",
              iconColor: "var(--accent-emerald)",
              icon: <CheckCircle2 size={18} color="var(--accent-emerald)" />,
            },
            warning: {
              border: "rgba(245, 158, 11, 0.4)",
              bg: "var(--bg-card)",
              iconColor: "var(--accent-amber)",
              icon: <AlertTriangle size={18} color="var(--accent-amber)" />,
            },
            error: {
              border: "rgba(244, 63, 94, 0.4)",
              bg: "var(--bg-card)",
              iconColor: "var(--accent-rose)",
              icon: <AlertCircle size={18} color="var(--accent-rose)" />,
            },
            info: {
              border: "var(--border-accent)",
              bg: "var(--bg-card)",
              iconColor: "var(--accent-cyan)",
              icon: <Info size={18} color="var(--accent-cyan)" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: "auto",
                backgroundColor: typeColors.bg,
                border: `1px solid ${typeColors.border}`,
                borderRadius: "10px",
                padding: "12px 14px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                animation: "toast-enter 0.2s ease-out",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: "1px" }}>{typeColors.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>
                  {toast.title}
                </div>
                {toast.description && (
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginTop: "2px",
                      wordBreak: "break-word",
                    }}
                  >
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-dim)",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
}
