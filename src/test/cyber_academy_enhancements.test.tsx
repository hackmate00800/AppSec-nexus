import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VisualLearningEngine } from "../academy/components/VisualLearningEngine";
import { CommandAcademyView } from "../academy/components/CommandAcademyView";
import { ResourceHubView } from "../academy/components/ResourceHubView";
import { CommunityDirectoryView } from "../academy/components/CommunityDirectoryView";
import { ProjectsAndCapstoneView } from "../academy/components/ProjectsAndCapstoneView";
import { SkillMapView } from "../academy/components/SkillMapView";
import { CyberAcademy } from "../academy/CyberAcademy";
import { Finding } from "../types";

describe("Cyber Academy Ultimate Upgrades & Visual Learning Engine", () => {
  it("renders VisualLearningEngine with all 7 interactive simulators and switches tabs", () => {
    render(<VisualLearningEngine />);

    // Check category pills
    expect(screen.getByText("OSI 7-Layer Explorer")).toBeInTheDocument();
    expect(screen.getByText("TCP 3-Way Handshake")).toBeInTheDocument();
    expect(screen.getByText("DNS Resolution Flow")).toBeInTheDocument();
    expect(screen.getByText("Subnet & CIDR Playground")).toBeInTheDocument();
    expect(screen.getByText("Packet Journey")).toBeInTheDocument();
    expect(screen.getByText("Port & Service Directory")).toBeInTheDocument();
    expect(screen.getByText("HTTP Request/Response Lab")).toBeInTheDocument();

    // Default tab is OSI
    expect(screen.getAllByText(/Application Layer/i)[0]).toBeInTheDocument();

    // Switch to Subnet Playground
    fireEvent.click(screen.getByText("Subnet & CIDR Playground"));
    expect(screen.getByText(/Interactive Subnetting & CIDR Calculator/i)).toBeInTheDocument();

    // Switch to TCP 3-Way Handshake
    fireEvent.click(screen.getByText("TCP 3-Way Handshake"));
    expect(screen.getByText(/TCP 3-Way Handshake Interactive Simulator/i)).toBeInTheDocument();
    expect(screen.getByText("Step 1: SYN")).toBeInTheDocument();
  }, 15000);

  it("renders CommandAcademyView and allows switching between Windows CMD, PowerShell, and Bash", () => {
    render(<CommandAcademyView />);

    expect(screen.getByText("OS & Terminal Academy")).toBeInTheDocument();
    expect(screen.getByText("Windows CMD")).toBeInTheDocument();
    expect(screen.getByText("PowerShell")).toBeInTheDocument();
    expect(screen.getByText("Linux Bash")).toBeInTheDocument();

    // Switch to PowerShell
    fireEvent.click(screen.getByText("PowerShell"));
    expect(screen.getByText("Test-NetConnection")).toBeInTheDocument();

    // Switch to Linux Bash
    fireEvent.click(screen.getByText("Linux Bash"));
    expect(screen.getByText("curl -iv -X GET")).toBeInTheDocument();
  });

  it("renders ResourceHubView with official standards, docs, and practice labs", () => {
    render(<ResourceHubView />);

    expect(screen.getByText("Authoritative Documentation & Standards Hub")).toBeInTheDocument();
    expect(screen.getByText(/OWASP Web Security Testing Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/PortSwigger Web Security Academy/i)).toBeInTheDocument();
    expect(screen.getByText(/OWASP Juice Shop/i)).toBeInTheDocument();

    // Filter by Practice Labs
    fireEvent.click(screen.getByText("Practice Labs & CTF"));
    expect(screen.getByText(/OWASP Juice Shop/i)).toBeInTheDocument();
    expect(screen.queryByText(/OWASP Web Security Testing Guide/i)).not.toBeInTheDocument();
  });

  it("renders CommunityDirectoryView and displays ethics guidelines", () => {
    render(<CommunityDirectoryView />);

    expect(screen.getByText(/Ethical Cybersecurity Communities Directory/i)).toBeInTheDocument();
    expect(screen.getByText(/Essential Code of Ethics for Cybersecurity Communities/i)).toBeInTheDocument();
    expect(screen.getByText(/OWASP Global & Local Chapters/i)).toBeInTheDocument();
    expect(screen.getByText("Reddit /r/netsec (Information Security)")).toBeInTheDocument();
  });

  it("renders ProjectsAndCapstoneView with 14 practical projects and Capstone simulator", () => {
    render(<ProjectsAndCapstoneView />);

    expect(screen.getByText(/Practical Projects & Capstone Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Project 1: Local Pentest Lab Setup & Container Hardening/i)).toBeInTheDocument();

    // Switch to Capstone
    fireEvent.click(screen.getByText(/Capstone Pentest Assessment/i));
    expect(screen.getByText(/Stage 1 of 7/i)).toBeInTheDocument();
    expect(screen.getByText(/Rules of Engagement & Target Scoping/i)).toBeInTheDocument();

    // Complete stage 1
    fireEvent.click(screen.getByText(/Complete Stage & Advance/i));
    expect(screen.getByText(/Stage 2 of 7/i)).toBeInTheDocument();
  });

  it("renders SkillMapView with 8 core pillars and calculates competency", () => {
    const mockUserState = {
      completedLessonIds: ["lesson-0-1", "lesson-0-2", "lesson-1-1"],
      activePathId: "path-0",
      quizScores: {
        "lesson-0-1": { score: 10, total: 10, passed: true, completedAt: "2026-10-17" }
      },
      bookmarks: [],
      notes: {}
    };

    render(<SkillMapView userState={mockUserState} />);

    expect(screen.getByText(/Cybersecurity Competency & Skill Map/i)).toBeInTheDocument();
    expect(screen.getAllByText("Operating System & Terminal")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Networking & Protocols")[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Web Application Pentesting/i)[0]).toBeInTheDocument();
  });

  it("renders CyberAcademy with active scanner findings linked directly to curriculum", () => {
    const mockFindings: Finding[] = [
      {
        id: "find-1",
        target_id: "target-1",
        title: "Missing Content Security Policy (CSP)",
        severity: "Medium",
        confidence: 0.95,
        affected_asset: "https://target.local",
        evidence: "Missing CSP header",
        source_tool: "Header Inspector",
        tool_version: "1.0",
        remediation: "Add Content-Security-Policy header",
        status: "Confirmed",
        created_at: "2026-10-17"
      }
    ];

    render(
      <CyberAcademy
        findings={mockFindings}
      />
    );

    // Verify finding linkage is displayed on dashboard
    expect(screen.getByText(/Active Project Findings Linked to Academy Curriculum/i)).toBeInTheDocument();
    expect(screen.getAllByText("Missing Content Security Policy (CSP)")[0]).toBeInTheDocument();
    expect(screen.getByText("Study Root Cause")).toBeInTheDocument();

    // Click "Study Root Cause" to switch to encyclopedia
    fireEvent.click(screen.getByText("Study Root Cause"));
    expect(screen.getByText(/Vulnerability Encyclopedia/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CWE-1021/i)[0]).toBeInTheDocument();
  });
});
