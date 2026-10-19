import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import {
  Skeleton,
  DashboardCardsSkeleton,
  FindingsTableSkeleton,
  ScanHistorySkeleton,
  ReportDetailsSkeleton,
} from "../components/ui/SkeletonLoaders";
import { ScanProgressProvider, useScanProgress } from "../context/ScanProgressContext";
import { ScanProgressIndicatorBanner } from "../components/scanners/ScanProgressIndicatorBanner";
import { AiThinkingIndicator } from "../components/ai/AiThinkingIndicator";

describe("Loading Systems Unit & Integration Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. Skeleton Loaders", () => {
    it("renders primitive Skeleton with customizable width, height, and accessibility attributes", () => {
      const { container } = render(
        <Skeleton width="180px" height="24px" borderRadius="8px" data-testid="test-skeleton" />
      );

      const el = container.querySelector(".appsec-skeleton");
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute("aria-hidden", "true");
      expect(el).toHaveStyle({ width: "180px", height: "24px", borderRadius: "8px" });
    });

    it("renders DashboardCardsSkeleton matching metric cards count", () => {
      render(<DashboardCardsSkeleton count={4} />);
      const roleRegion = screen.getByRole("status", { name: /loading dashboard metrics/i });
      expect(roleRegion).toBeInTheDocument();
      expect(roleRegion.querySelectorAll(".card").length).toBe(4);
    });

    it("renders FindingsTableSkeleton with given rows and table-like structure", () => {
      render(<FindingsTableSkeleton rows={3} />);
      const statusBox = screen.getByRole("status", { name: /loading findings/i });
      expect(statusBox).toBeInTheDocument();
      // Verifies row count
      expect(statusBox.querySelectorAll(".appsec-skeleton").length).toBeGreaterThan(6);
    });

    it("renders ScanHistorySkeleton with header and entry rows", () => {
      render(<ScanHistorySkeleton count={5} />);
      const statusBox = screen.getByRole("status", { name: /loading scan history/i });
      expect(statusBox).toBeInTheDocument();
      expect(statusBox.querySelectorAll(".appsec-skeleton").length).toBeGreaterThan(5);
    });

    it("renders ReportDetailsSkeleton for report generation views", () => {
      render(<ReportDetailsSkeleton />);
      const statusBox = screen.getByRole("status", { name: /loading report/i });
      expect(statusBox).toBeInTheDocument();
    });
  });

  describe("2. Security Scan Progress Indicators & Cross-Tab Persistence", () => {
    const TestScanController: React.FC = () => {
      const { activeScan, isScanning, startScan, cancelScan } = useScanProgress();

      return (
        <div>
          <button
            onClick={() =>
              startScan("t-123", "https://target.local", "nuclei", "Nuclei Scanner")
            }
          >
            Trigger Scan
          </button>
          <button onClick={cancelScan}>Cancel Current Scan</button>
          <span data-testid="is-scanning">{isScanning ? "SCANNING" : "IDLE"}</span>
          <span data-testid="current-phase">{activeScan?.currentPhase || "NO_PHASE"}</span>
          <span data-testid="scan-status">{activeScan?.status || "NO_STATUS"}</span>
          <ScanProgressIndicatorBanner />
        </div>
      );
    };

    it("tracks scan lifecycle (running, updating phase, cancel, banner display) and persists state", async () => {
      let resolveScan: (val: any) => void = () => {};
      const scanPromise = new Promise((res) => {
        resolveScan = res;
      });

      // Override invoke temporarily for controlled lifecycle testing
      const { invoke } = await import("@tauri-apps/api/core");
      const mockedInvoke = vi.mocked(invoke);
      mockedInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === "run_scan") {
          return scanPromise;
        }
        if (cmd === "get_findings" || cmd === "get_scan_history") {
          return [];
        }
        return null;
      });

      render(
        <ScanProgressProvider>
          <TestScanController />
        </ScanProgressProvider>
      );

      expect(screen.getByTestId("is-scanning").textContent).toBe("IDLE");
      expect(screen.queryByTestId("scan-progress-banner")).not.toBeInTheDocument();

      // Trigger scan
      const triggerBtn = screen.getByText("Trigger Scan");
      await act(async () => {
        fireEvent.click(triggerBtn);
      });

      // Should transition to active scanning
      expect(screen.getByTestId("is-scanning").textContent).toBe("SCANNING");
      expect(screen.getByTestId("scan-status").textContent).toBe("running");

      // Banner should now be visible across views
      const banner = screen.getByTestId("scan-progress-banner");
      expect(banner).toBeInTheDocument();
      expect(screen.getByText("Nuclei Scanner Audit")).toBeInTheDocument();

      // Fast forward phase transition timer
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByTestId("current-phase").textContent).toContain("Nuclei Scanner");

      // Test operator cancel control
      const cancelBtn = screen.getByText("Cancel Current Scan");
      act(() => {
        fireEvent.click(cancelBtn);
      });

      expect(screen.getByTestId("scan-status").textContent).toBe("cancelled");
      expect(screen.getByTestId("current-phase").textContent).toContain("cancelled by operator");

      // Resolve pending promise to clean up
      await act(async () => {
        resolveScan({
          scan_id: "scan-1",
          target_url: "https://target.local",
          tool: "nuclei",
          status: "Completed",
          findings_count: 0,
          duration_ms: 100,
          logs: [],
        });
      });
    });
  });

  describe("3. AI Mentor Thinking Indicators", () => {
    it("renders AiThinkingIndicator with multi-stage thinking steps and progressive timer", () => {
      const handleCancel = vi.fn();
      render(
        <AiThinkingIndicator
          role="deep"
          modelName="appsec-teacher-8b"
          promptPreview="How to remediate SQL Injection?"
          onCancel={handleCancel}
        />
      );

      // Verify deep role branding and model badge
      expect(screen.getByText(/Deep Security AI Thinking/i)).toBeInTheDocument();
      expect(screen.getByText("appsec-teacher-8b")).toBeInTheDocument();
      expect(screen.getByText(/How to remediate SQL Injection\?/i)).toBeInTheDocument();

      // Stage 0
      expect(screen.getByText("Analyzing query & security context...")).toBeInTheDocument();

      // Advance timer by 4 seconds -> Stage 1
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.getByText("Evaluating attack surface & vulnerabilities...")).toBeInTheDocument();
      expect(screen.getByText("4s")).toBeInTheDocument();

      // Advance timer by 5 seconds (total 9s) -> Stage 2
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("Synthesizing remediation & defensive rules...")).toBeInTheDocument();
      expect(screen.getByText("9s")).toBeInTheDocument();

      // Advance timer by 4 seconds (total 13s) -> Stage 3
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.getByText("Formulating authoritative guidance...")).toBeInTheDocument();

      // Click cancel button
      const cancelBtn = screen.getByTitle("Cancel generation");
      fireEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });
});
