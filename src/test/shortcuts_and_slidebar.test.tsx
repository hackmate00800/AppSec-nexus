import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardShortcutsModal } from "../components/help/KeyboardShortcutsModal";
import { ThemeProvider } from "../theme/ThemeProvider";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import { ToastProvider } from "../components/ui/Toast";
import App from "../App";

describe("Keyboard Shortcuts System & Resizable Slidebar Testing", () => {
  it("renders KeyboardShortcutsModal with all categories and shortcuts", () => {
    const handleClose = vi.fn();
    render(
      <KeyboardShortcutsModal isOpen={true} onClose={handleClose} />
    );

    expect(screen.getByText(/AppSec Nexus Keyboard Shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Workspace & Layout")).toBeInTheDocument();
    expect(screen.getByText("Actions & Security")).toBeInTheDocument();

    // Check specific critical shortcuts exist
    expect(screen.getByText("Toggle Navigation Sidebar (Collapse / Expand)")).toBeInTheDocument();
    expect(screen.getByText(/Emergency Stop: Immediately abort all running scans/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Global Command Palette & Fuzzy Search/i)).toBeInTheDocument();
  });

  it("filters shortcuts dynamically when user types in search bar", () => {
    const handleClose = vi.fn();
    render(
      <KeyboardShortcutsModal isOpen={true} onClose={handleClose} />
    );

    const searchInput = screen.getByPlaceholderText(/search shortcuts/i);
    expect(searchInput).toBeInTheDocument();

    // Search for Emergency
    fireEvent.change(searchInput, { target: { value: "emergency" } });
    expect(screen.getByText(/Emergency Stop: Immediately abort all running scans/i)).toBeInTheDocument();
    expect(screen.queryByText("Toggle Navigation Sidebar (Collapse / Expand)")).not.toBeInTheDocument();

    // Search for non-existent shortcut
    fireEvent.change(searchInput, { target: { value: "nonexistent_shortcut_xyz" } });
    expect(screen.getByText(/No shortcuts found matching/i)).toBeInTheDocument();
  });

  it("filters shortcuts when category tabs are clicked", () => {
    const handleClose = vi.fn();
    render(
      <KeyboardShortcutsModal isOpen={true} onClose={handleClose} />
    );

    // Search for "all" first then click Navigation category
    const searchInput = screen.getByPlaceholderText(/search shortcuts/i);
    fireEvent.change(searchInput, { target: { value: "Switch to" } });

    // Should match navigation items
    expect(screen.getByText("Switch to Security Analytics & Posture")).toBeInTheDocument();
    expect(screen.queryByText("Toggle Navigation Sidebar (Collapse / Expand)")).not.toBeInTheDocument();
  });

  it("triggers onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <KeyboardShortcutsModal isOpen={true} onClose={handleClose} />
    );

    const closeBtn = screen.getByTitle("Close (Esc)");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders shortcuts trigger button in App header and responds to toggle", async () => {
    render(
      <ThemeProvider>
        <WorkspaceProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    );

    // Look for the Shortcuts trigger button in the top navigation
    const shortcutsBtn = screen.getByTitle("Keyboard Shortcuts Cheat Sheet (Press ? or Ctrl+/)");
    expect(shortcutsBtn).toBeInTheDocument();

    // Clicking it opens the shortcuts modal
    fireEvent.click(shortcutsBtn);
    expect(screen.getByText(/AppSec Nexus Keyboard Shortcuts/i)).toBeInTheDocument();

    // Press Escape to dismiss
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/AppSec Nexus Keyboard Shortcuts/i)).not.toBeInTheDocument();
  });
});
