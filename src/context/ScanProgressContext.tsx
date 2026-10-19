import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { Finding, ScanResult } from "../types";

export type ScanLifecycleStatus = "idle" | "queued" | "running" | "completed" | "failed" | "cancelled";

export interface ActiveScanSession {
  scanId: string;
  targetId: string;
  targetUrl: string;
  toolId: string;
  toolName: string;
  status: ScanLifecycleStatus;
  currentPhase: string;
  elapsedSeconds: number;
  totalChecks?: number;
  completedChecks?: number;
  percentage?: number;
  logs: string[];
  error?: string;
  startTime: number;
}

interface ScanProgressContextType {
  activeScan: ActiveScanSession | null;
  isScanning: boolean;
  startScan: (
    targetId: string,
    targetUrl: string,
    toolId: string,
    toolName?: string,
    onSuccess?: (result: ScanResult, findings: Finding[], history: ScanResult[]) => void,
    onError?: (errorMsg: string) => void
  ) => Promise<void>;
  cancelScan: () => void;
  clearScan: () => void;
}

const ScanProgressContext = createContext<ScanProgressContextType | undefined>(undefined);

export const ScanProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScan, setActiveScan] = useState<ActiveScanSession | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Timer updater for elapsed seconds
  useEffect(() => {
    if (activeScan && (activeScan.status === "running" || activeScan.status === "queued")) {
      scanTimerRef.current = setInterval(() => {
        setActiveScan((prev) => {
          if (!prev || (prev.status !== "running" && prev.status !== "queued")) return prev;
          const elapsed = Math.floor((Date.now() - prev.startTime) / 1000);
          return {
            ...prev,
            elapsedSeconds: elapsed,
          };
        });
      }, 1000);
    } else if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [activeScan?.status, activeScan?.startTime]);

  const cancelScan = useCallback(() => {
    isCancelledRef.current = true;
    setActiveScan((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "cancelled",
        currentPhase: "Execution cancelled by operator",
        logs: [...prev.logs, "[WARN] Scan cancelled by operator."],
      };
    });
  }, []);

  const clearScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setActiveScan(null);
  }, []);

  const startScan = useCallback(
    async (
      targetId: string,
      targetUrl: string,
      toolId: string,
      toolName?: string,
      onSuccess?: (result: ScanResult, findings: Finding[], history: ScanResult[]) => void,
      onError?: (errorMsg: string) => void
    ) => {
      if (activeScan && (activeScan.status === "running" || activeScan.status === "queued")) {
        console.warn("A scan is already actively running.");
        return;
      }

      isCancelledRef.current = false;
      const initialSession: ActiveScanSession = {
        scanId: `scan-${Date.now()}`,
        targetId,
        targetUrl,
        toolId,
        toolName: toolName || toolId,
        status: "running",
        currentPhase: "Validating authorized scope boundaries...",
        elapsedSeconds: 0,
        logs: [`[INFO] Starting ${toolName || toolId} scan against ${targetUrl}...`],
        startTime: Date.now(),
      };

      setActiveScan(initialSession);

      try {
        // Step 1: Simulated phase transition for UI feedback
        setTimeout(() => {
          setActiveScan((prev) => {
            if (!prev || prev.status !== "running") return prev;
            return {
              ...prev,
              currentPhase: `Executing ${prev.toolName} security audit checks...`,
            };
          });
        }, 1200);

        const result = await invoke<ScanResult>("run_scan", {
          targetId,
          tool: toolId,
        });

        if (isCancelledRef.current) {
          return;
        }

        const [updatedFindings, updatedHistory] = await Promise.all([
          invoke<Finding[]>("get_findings"),
          invoke<ScanResult[]>("get_scan_history"),
        ]);

        const count = result?.findings_count ?? (Array.isArray(updatedFindings) ? updatedFindings.length : 0);
        const resultLogs = result?.logs ?? [];
        const duration = result?.duration_ms ?? 0;

        setActiveScan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: "completed",
            currentPhase: `Audit complete. Found ${count} security observation(s).`,
            logs: [...prev.logs, ...resultLogs, `[SUCCESS] Completed in ${duration} ms.`],
          };
        });

        if (onSuccess && result) {
          onSuccess(result, updatedFindings || [], updatedHistory || []);
        }
      } catch (err: any) {
        if (isCancelledRef.current) return;
        const errMsg = err?.toString() || "Unknown error";
        setActiveScan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: "failed",
            currentPhase: "Scan terminated with error",
            error: errMsg,
            logs: [...prev.logs, `[ERROR] Scan aborted: ${errMsg}`],
          };
        });

        // Record backend issue if in native app
        const isTauriApp = typeof isTauri === "function" ? isTauri() : false;
        if (isTauriApp) {
          invoke("record_issue", {
            payload: {
              title: `Scan Failure: ${toolId} execution failed`,
              category: "ToolExecutionFailure",
              subtype: "ScanExecutionError",
              severity: "High",
              affected_component: toolId,
              affected_target_id: targetId,
              affected_target_name: targetUrl,
              source: "ToolExecution",
              description: `Automated scan job using ${toolId} aborted against target ${targetUrl}`,
              error_details: errMsg,
            },
          }).catch((e) => console.error("Auto issue recording error:", e));
        }

        if (onError) {
          onError(errMsg);
        }
      }
    },
    [activeScan]
  );

  return (
    <ScanProgressContext.Provider
      value={{
        activeScan,
        isScanning: Boolean(activeScan && (activeScan.status === "running" || activeScan.status === "queued")),
        startScan,
        cancelScan,
        clearScan,
      }}
    >
      {children}
    </ScanProgressContext.Provider>
  );
};

export const useScanProgress = (): ScanProgressContextType => {
  const context = useContext(ScanProgressContext);
  if (!context) {
    return {
      activeScan: null,
      isScanning: false,
      startScan: async () => {},
      cancelScan: () => {},
      clearScan: () => {},
    };
  }
  return context;
};
