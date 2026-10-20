import React, { useState } from "react";
import {
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Layers,
} from "lucide-react";

export interface ZeroDayRecord {
  id: string;
  name: string;
  cveId: string;
  affectedSoftware: string;
  affectedVersions: string;
  status:
    | "Actively Exploited In-The-Wild"
    | "Coordinated Disclosure"
    | "Unpatched / 0-Day"
    | "Patch Available"
    | "Proof-of-Concept Public";
  discoveryDate: string;
  disclosureDate: string;
  vendorAcknowledged: boolean;
  patchStatus: "Available" | "Pending" | "Workaround Only";
  exploitationConfidence: "High" | "Medium" | "Verified PoC" | "Unconfirmed";
  rootCauseType: string;
  mitigationSummary: string;
  researchTimeline: { date: string; event: string }[];
}

export const ZERO_DAY_INTEL: ZeroDayRecord[] = [
  {
    id: "zd-2024-chrome-v8",
    name: "V8 JavaScript Engine Type Confusion RCE",
    cveId: "CVE-2024-4671",
    affectedSoftware: "Google Chrome / Chromium",
    affectedVersions: "< 124.0.6367.201",
    status: "Actively Exploited In-The-Wild",
    discoveryDate: "2024-05-08",
    disclosureDate: "2024-05-09",
    vendorAcknowledged: true,
    patchStatus: "Available",
    exploitationConfidence: "High",
    rootCauseType: "Type Confusion (CWE-843) in V8 Turbofan JIT compiler optimizer.",
    mitigationSummary: "Update Chromium browser to version 124.0.6367.201+ or enable V8 Sandbox hardening mode.",
    researchTimeline: [
      { date: "2024-05-08", event: "Anonymous researcher reports active in-the-wild exploitation to Google Threat Analysis Group (TAG)." },
      { date: "2024-05-09", event: "Google confirms zero-day exploitation and releases emergency desktop patch." },
      { date: "2024-05-10", event: "CISA adds CVE-2024-4671 to Known Exploited Vulnerabilities catalog." },
    ],
  },
  {
    id: "zd-2024-ivanti-connect",
    name: "Ivanti Connect Secure Server-Side Request Forgery & Command Injection",
    cveId: "CVE-2024-21887",
    affectedSoftware: "Ivanti Connect Secure VPN (ICS) / Policy Secure",
    affectedVersions: "9.x, 22.x",
    status: "Actively Exploited In-The-Wild",
    discoveryDate: "2023-12-15",
    disclosureDate: "2024-01-10",
    vendorAcknowledged: true,
    patchStatus: "Available",
    exploitationConfidence: "High",
    rootCauseType: "Command Injection (CWE-78) chained with SAML component SSRF (CWE-918).",
    mitigationSummary: "Apply Ivanti mitigation XML package or update to patched firmware release.",
    researchTimeline: [
      { date: "2023-12-15", event: "Mandiant detects zero-day attacks targeting internal corporate VPN gateways." },
      { date: "2024-01-10", event: "Ivanti publishes advisory and initial XML mitigation instructions." },
      { date: "2024-01-31", event: "Full firmware security patches released across all hardware platforms." },
    ],
  },
  {
    id: "zd-2023-moveit-sqli",
    name: "MOVEit Transfer Pre-Auth SQL Injection Chained RCE",
    cveId: "CVE-2023-34362",
    affectedSoftware: "Progress MOVEit Transfer",
    affectedVersions: "All versions prior to May 2023 patch",
    status: "Actively Exploited In-The-Wild",
    discoveryDate: "2023-05-28",
    disclosureDate: "2023-05-31",
    vendorAcknowledged: true,
    patchStatus: "Available",
    exploitationConfidence: "High",
    rootCauseType: "SQL Injection (CWE-89) in guestuser.aspx web handler allowing session token forge.",
    mitigationSummary: "Block external HTTP/HTTPS traffic to port 80/443 on MOVEit Transfer and apply patch 2023.0.1+.",
    researchTimeline: [
      { date: "2023-05-28", event: "Widespread data exfiltration detected across public internet-facing MOVEit servers." },
      { date: "2023-05-31", event: "Progress Software issues urgent zero-day advisory and emergency patch." },
      { date: "2023-06-02", event: "Public PoC analysis confirms unauthenticated session tampering." },
    ],
  },
];

export interface ZeroDayResearchWorkspaceProps {
  onNavigateTab: (tab: string) => void;
}

export const ZeroDayResearchWorkspace: React.FC<ZeroDayResearchWorkspaceProps> = ({ onNavigateTab }) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>("zd-2024-chrome-v8");
  
  const [activeResearchTab, setActiveResearchTab] = useState<"taxonomy" | "intelligence" | "safemode">("taxonomy");

  const activeRecord = ZERO_DAY_INTEL.find((r) => r.id === selectedRecordId) || ZERO_DAY_INTEL[0];

  const handleAskMentor = (promptText: string) => {
    const event = new CustomEvent("appsec-ai-mentor-query", {
      detail: {
        prompt: promptText,
        topic: "Zero-Day Research & Patch Analysis",
      },
    });
    window.dispatchEvent(event);
    onNavigateTab("mentor");
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-rose-400" size={24} />
            <h1 className="text-2xl font-bold tracking-tight text-white">Zero-Day Vulnerability Research Workspace</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Strict terminology distinctions, patch diff analysis, responsible disclosure guidelines, and threat intelligence.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveResearchTab("taxonomy")}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              activeResearchTab === "taxonomy" ? "bg-rose-950 text-rose-300 border border-rose-800" : "text-slate-400 hover:text-white"
            }`}
          >
            0-Day Taxonomy & Rules
          </button>
          <button
            onClick={() => setActiveResearchTab("intelligence")}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              activeResearchTab === "intelligence" ? "bg-rose-950 text-rose-300 border border-rose-800" : "text-slate-400 hover:text-white"
            }`}
          >
            Threat Intelligence Tracker
          </button>
          <button
            onClick={() => setActiveResearchTab("safemode")}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              activeResearchTab === "safemode" ? "bg-rose-950 text-rose-300 border border-rose-800" : "text-slate-400 hover:text-white"
            }`}
          >
            Safe Research Mode & Patch Diffing
          </button>
        </div>
      </div>

      {/* TAB 1: Taxonomy & Terminology */}
      {activeResearchTab === "taxonomy" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-rose-400" />
              <span>Rigorous Zero-Day Categorization Standards</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Do not label a vulnerability "zero-day" merely because it is recent or lacks a patch. Adhere to authoritative definitions:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              {
                title: "True Zero-Day (0-Day)",
                badge: "Strict Definition",
                color: "rose",
                desc: "A software vulnerability unknown to the vendor, with zero days of notice for developers to create a patch before threat actors exploit it.",
              },
              {
                title: "Vulnerability Without Fix",
                badge: "Unpatched (N-Day)",
                color: "amber",
                desc: "Publicly disclosed vulnerability where the vendor has not yet released a security patch, but the flaw is known to defenders.",
              },
              {
                title: "Coordinated Disclosure (CVD)",
                badge: "Responsible",
                color: "cyan",
                desc: "Vulnerability reported confidentially to the vendor under a fixed embargo window (typically 90 days) to allow patch creation.",
              },
              {
                title: "Actively Exploited In-The-Wild",
                badge: "CISA KEV",
                color: "rose",
                desc: "Empirically verified that malicious threat actors are executing weaponized exploits against real production systems.",
              },
              {
                title: "Proof-of-Concept (PoC)",
                badge: "Validation Code",
                color: "blue",
                desc: "Educational or validation code demonstrating that a vulnerability exists without providing operational weaponization.",
              },
              {
                title: "Unverified Vulnerability Claim",
                badge: "Hypothesis",
                color: "slate",
                desc: "Public claims of a zero-day without verifiable technical evidence, reproducible proof-of-concept, or vendor confirmation.",
              },
            ].map((t, i) => (
              <div key={i} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{t.title}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-2 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Threat Intelligence Tracker */}
      {activeResearchTab === "intelligence" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Zero-Day Feed */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Active Zero-Day Records ({ZERO_DAY_INTEL.length})
            </span>
            {ZERO_DAY_INTEL.map((zd) => {
              const isSelected = zd.id === selectedRecordId;
              return (
                <button
                  key={zd.id}
                  onClick={() => setSelectedRecordId(zd.id)}
                  className={`p-3 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-slate-800/90 border-rose-500/80 shadow-md shadow-rose-950"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-rose-400">{zd.cveId}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      {zd.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white mb-1">{zd.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{zd.affectedSoftware} ({zd.affectedVersions})</div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Intelligence Dossier */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      {activeRecord.cveId}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {activeRecord.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">{activeRecord.name}</h2>
                  <div className="text-xs text-slate-400 mt-1">
                    Target: {activeRecord.affectedSoftware} | Versions: {activeRecord.affectedVersions}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleAskMentor(
                      `Explain the root cause and mitigation strategy for zero-day ${activeRecord.cveId} (${activeRecord.name}). How can defensive teams detect exploitation?`
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0"
                >
                  <Sparkles size={12} className="text-cyan-400" />
                  <span>Analyze with AI</span>
                </button>
              </div>

              {/* Technical Root Cause */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Technical Root Cause</span>
                <p className="text-slate-300 leading-relaxed">{activeRecord.rootCauseType}</p>
              </div>

              {/* Mitigation Summary */}
              <div className="bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/50 text-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Defensive Mitigation</span>
                <p className="text-emerald-200 leading-relaxed">{activeRecord.mitigationSummary}</p>
              </div>

              {/* Research Timeline */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Verified Research & Disclosure Timeline
                </span>
                <div className="space-y-2">
                  {activeRecord.researchTimeline.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs bg-slate-950 p-2.5 rounded border border-slate-800 font-sans">
                      <span className="text-cyan-400 font-mono font-bold shrink-0">{item.date}</span>
                      <span className="text-slate-300">{item.event}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Safe Research Mode & Patch Diffing */}
      {activeResearchTab === "safemode" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Safe Security Research & Patch Diff Analysis Methodology</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Guidance for studying vulnerabilities ethically in isolated sandbox environments without operational exploitation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">1. Git & Binary Patch Diffing</h3>
              <p className="text-slate-300 leading-relaxed">
                When a vendor releases a security patch, analyze the commit diff (e.g. `git diff v1.2.0..v1.2.1`) to identify added bounds checks, input sanitization routines, or changed logic.
              </p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-cyan-300 border border-slate-800">
                # Inspect patch changes between versions:<br />
                git diff tag-1.4.0 tag-1.4.1 -- src/security_handler.c
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">2. Isolated Air-Gapped Labs</h3>
              <p className="text-slate-300 leading-relaxed">
                Always reproduce vulnerability proofs in virtual machines or container sandboxes configured with host-only networking to prevent unexpected external traffic or accidental propagation.
              </p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-emerald-300 border border-slate-800">
                # Docker host-isolated lab network:<br />
                docker network create --internal isolated_lab_net
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
