import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import App from "../App";
import { SecurityFlowchart } from "../Flowchart";

describe("UI Responsiveness & Layout Automation Testing", () => {
  it("renders correctly in desktop viewport (1440x900)", async () => {
    act(() => {
      window.innerWidth = 1440;
      window.innerHeight = 900;
      window.dispatchEvent(new Event("resize"));
    });

    let container: HTMLElement;
    await act(async () => {
      const res = render(<App />);
      container = res.container;
    });

    expect(container!.querySelector(".app-container")).toBeInTheDocument();
    expect(container!.querySelector(".top-nav")).toBeInTheDocument();
    expect(container!.querySelector(".sidebar")).toBeInTheDocument();
    expect(container!.querySelector(".workspace")).toBeInTheDocument();
  });

  it("adapts layout smoothly when resized to tablet viewport (800x1024)", async () => {
    act(() => {
      window.innerWidth = 800;
      window.innerHeight = 1024;
      window.dispatchEvent(new Event("resize"));
    });

    let container: HTMLElement;
    await act(async () => {
      const res = render(<App />);
      container = res.container;
    });

    const sidebar = container!.querySelector(".sidebar");
    expect(sidebar).toBeInTheDocument();

    const topNav = container!.querySelector(".top-nav");
    expect(topNav).toBeInTheDocument();
  });

  it("maintains accessibility and scrollability in small mobile viewport (375x667)", async () => {
    act(() => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event("resize"));
    });

    let container: HTMLElement;
    await act(async () => {
      const res = render(<App />);
      container = res.container;
    });

    expect(container!.querySelector(".app-container")).toBeInTheDocument();
    expect(container!.querySelector(".main-layout")).toBeInTheDocument();

    // Verify critical buttons remain accessible
    expect(screen.getByText("Emergency Stop")).toBeInTheDocument();
    expect(screen.getByText("Target & Scope")).toBeInTheDocument();
  });

  it("renders SecurityFlowchart with attack vs defense side-by-side cards", () => {
    render(<SecurityFlowchart vulnerabilityType="xss" />);

    // Check titles and steps
    expect(screen.getByText("Cross-Site Scripting (XSS) - Reflection Flow vs Content-Security-Policy")).toBeInTheDocument();
    expect(screen.getByText("1. Malicious Payload")).toBeInTheDocument();
    expect(screen.getByText("1. Contextual Output Encoding")).toBeInTheDocument();
    expect(screen.getByText("Attack Scenario (Vulnerable State)")).toBeInTheDocument();
    expect(screen.getByText("Defensive Architecture (Mitigated State)")).toBeInTheDocument();
  });

  it("renders CORS security flow nodes properly", () => {
    render(<SecurityFlowchart vulnerabilityType="cors" />);

    expect(screen.getByText("Insecure CORS Wildcard (*) vs Trusted Origin Allowlist")).toBeInTheDocument();
    expect(screen.getByText("1. Evil Origin")).toBeInTheDocument();
    expect(screen.getByText("1. Strict Origin Validation")).toBeInTheDocument();
  });
});
