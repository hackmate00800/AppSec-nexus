import { useState } from "react";
import {
  Compass,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Terminal,
  Activity,
  Zap,
  BookOpen
} from "lucide-react";
import { UserAcademyState } from "../types";
import { LEARNING_PATHS } from "../data/curriculumData";

interface SkillMapViewProps {
  userState: UserAcademyState;
  onNavigatePath?: (pathId: string) => void;
  onOpenAiMentor?: (query: string) => void;
}

interface SkillPillar {
  id: string;
  name: string;
  description: string;
  icon: any;
  associatedPathIds: string[];
  totalExpectedUnits: number;
}

const PILLARS: SkillPillar[] = [
  {
    id: "os",
    name: "Operating System & Terminal",
    description: "Windows CMD, PowerShell cmdlets, and Linux Bash navigation, processes, and permissions.",
    icon: Terminal,
    associatedPathIds: ["path-0"],
    totalExpectedUnits: 6
  },
  {
    id: "networking",
    name: "Networking & Protocols",
    description: "TCP/IP 3-way handshake, OSI model, DNS resolution, subnetting, and socket analysis.",
    icon: Activity,
    associatedPathIds: ["path-1"],
    totalExpectedUnits: 6
  },
  {
    id: "web_architecture",
    name: "Web Architecture & HTTP",
    description: "HTTP verbs, headers, status codes, cookies, sessions, same-origin policy, and CORS.",
    icon: Layers,
    associatedPathIds: ["path-2"],
    totalExpectedUnits: 6
  },
  {
    id: "recon",
    name: "Reconnaissance & Surface Mapping",
    description: "Passive OSINT, active port scanning, technology fingerprinting, and asset enumeration.",
    icon: Compass,
    associatedPathIds: ["path-3"],
    totalExpectedUnits: 6
  },
  {
    id: "web_pentest",
    name: "Web Application Pentesting (OWASP Top 10)",
    description: "SQLi, XSS, CSRF, SSRF, XXE, file inclusion, and client-side security controls.",
    icon: Shield,
    associatedPathIds: ["path-4", "path-5"],
    totalExpectedUnits: 12
  },
  {
    id: "api_security",
    name: "API Security (OWASP API Top 10)",
    description: "BOLA/IDOR, broken authentication, mass assignment, JWT analysis, and rate limiting.",
    icon: Zap,
    associatedPathIds: ["path-6"],
    totalExpectedUnits: 6
  },
  {
    id: "validation",
    name: "Vulnerability Validation & PoC",
    description: "Evidence-based verification, manual reproduction, root cause analysis, and eliminating false positives.",
    icon: CheckCircle2,
    associatedPathIds: ["path-7"],
    totalExpectedUnits: 6
  },
  {
    id: "remediation",
    name: "Remediation Engineering & Reporting",
    description: "Parameterized queries, strict CSP, secure password hashing, retesting, and CVSS scoring.",
    icon: Award,
    associatedPathIds: ["path-8", "path-9"],
    totalExpectedUnits: 10
  }
];

export function SkillMapView({ userState, onNavigatePath, onOpenAiMentor }: SkillMapViewProps) {
  const [selectedPillarId, setSelectedPillarId] = useState<string>(PILLARS[0].id);

  // Calculate pillar completion stats
  const pillarStats = PILLARS.map((pillar) => {
    // Find all lessons belonging to these paths
    const pathLessons = LEARNING_PATHS.filter((p) =>
      pillar.associatedPathIds.includes(p.id)
    ).flatMap((p) => p.modules.flatMap((m) => m.lessons));

    const total = pathLessons.length || pillar.totalExpectedUnits;
    const completed = pathLessons.filter((l) =>
      userState.completedLessonIds.includes(l.id)
    ).length;

    const quizPassedCount = pathLessons.filter(
      (l) => userState.quizScores[l.id]?.passed
    ).length;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    let tier: "Novice" | "Apprentice" | "Practitioner" | "Expert" = "Novice";
    if (percentage >= 80) tier = "Expert";
    else if (percentage >= 50) tier = "Practitioner";
    else if (percentage >= 20) tier = "Apprentice";

    return {
      ...pillar,
      total,
      completed,
      quizPassedCount,
      percentage,
      tier
    };
  });

  const overallScore = Math.round(
    pillarStats.reduce((acc, curr) => acc + curr.percentage, 0) / pillarStats.length
  );

  const activePillar =
    pillarStats.find((p) => p.id === selectedPillarId) || pillarStats[0];

  const lowestPillar = [...pillarStats].sort((a, b) => a.percentage - b.percentage)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Compass size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              Cybersecurity Competency & Skill Map
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(6, 182, 212, 0.2)",
                  color: "var(--accent-cyan)",
                  fontWeight: 600
                }}
              >
                8 Core Security Pillars
              </span>
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0 0" }}>
              Real-time competency matrix synthesized from completed academy curriculum modules and passed validation quizzes.
            </p>
          </div>
        </div>

        {/* Overall Competency Ring */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Overall Skill Level:</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
              {overallScore}% Competency
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Focus Area Pill */}
      {lowestPillar && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            backgroundColor: "var(--bg-secondary)",
            borderLeft: "4px solid var(--accent-amber)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Sparkles size={18} color="var(--accent-amber)" />
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700 }}>
                Recommended Learning Focus: {lowestPillar.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                You have completed {lowestPillar.completed} of {lowestPillar.total} lessons ({lowestPillar.percentage}%). Advance this pillar to level up your profile.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {onNavigatePath && lowestPillar.associatedPathIds[0] && (
              <button
                className="btn btn-primary"
                style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => onNavigatePath(lowestPillar.associatedPathIds[0])}
              >
                <span>Study Path</span>
                <ArrowRight size={13} />
              </button>
            )}

            {onOpenAiMentor && (
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => onOpenAiMentor(`Help me understand and master ${lowestPillar.name}. Provide a focused study plan.`)}
              >
                <Sparkles size={13} />
                <span>Ask AI Mentor</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid of 8 Pillars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {pillarStats.map((pillar) => {
          const Icon = pillar.icon;
          const isSelected = selectedPillarId === pillar.id;

          const tierColor =
            pillar.tier === "Expert"
              ? "var(--accent-emerald)"
              : pillar.tier === "Practitioner"
              ? "var(--accent-cyan)"
              : pillar.tier === "Apprentice"
              ? "var(--accent-amber)"
              : "var(--text-dim)";

          return (
            <div
              key={pillar.id}
              onClick={() => setSelectedPillarId(pillar.id)}
              className="card"
              style={{
                padding: "16px",
                cursor: "pointer",
                border: isSelected ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                backgroundColor: isSelected ? "var(--bg-secondary)" : "var(--bg-card)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
                transition: "all 0.15s ease"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Icon size={18} color="var(--accent-cyan)" />
                  </div>

                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      backgroundColor: `${tierColor}20`,
                      color: tierColor
                    }}
                  >
                    {pillar.tier}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 6px 0", fontSize: "0.95rem", fontWeight: 700 }}>
                  {pillar.name}
                </h3>

                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                  {pillar.description}
                </p>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-dim)" }}>
                    {pillar.completed} / {pillar.total} Units
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>
                    {pillar.percentage}%
                  </span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "var(--border-color)",
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${pillar.percentage}%`,
                      height: "100%",
                      backgroundColor: pillar.percentage > 0 ? "var(--accent-cyan)" : "transparent",
                      borderRadius: "3px",
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pillar Deep Dive Card */}
      {activePillar && (
        <div className="card" style={{ padding: "20px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-cyan)", fontWeight: 700 }}>
                Selected Pillar Focus
              </div>
              <h3 style={{ margin: "4px 0 0 0", fontSize: "1.15rem", fontWeight: 700 }}>
                {activePillar.name}
              </h3>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {onNavigatePath && activePillar.associatedPathIds[0] && (
                <button
                  className="btn btn-primary"
                  style={{ padding: "6px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={() => onNavigatePath(activePillar.associatedPathIds[0])}
                >
                  <BookOpen size={14} /> Jump to Curriculum Path
                </button>
              )}
            </div>
          </div>

          <p style={{ margin: "0 0 16px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {activePillar.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div className="card" style={{ padding: "12px", backgroundColor: "var(--bg-secondary)" }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>Completed Lessons</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "4px" }}>
                {activePillar.completed} <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 400 }}>/ {activePillar.total}</span>
              </div>
            </div>

            <div className="card" style={{ padding: "12px", backgroundColor: "var(--bg-secondary)" }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>Validation Quizzes Passed</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "4px" }}>
                {activePillar.quizPassedCount} <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 400 }}>Passed</span>
              </div>
            </div>

            <div className="card" style={{ padding: "12px", backgroundColor: "var(--bg-secondary)" }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>Current Mastery Tier</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "4px" }}>
                {activePillar.tier}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
