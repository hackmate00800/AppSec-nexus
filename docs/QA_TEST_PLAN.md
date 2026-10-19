# AppSec Nexus — Comprehensive QA Test Plan & Verification Strategy

**Document Type:** Formal Quality Assurance & Test Strategy Specification  
**Version:** 1.0  
**Application:** AppSec Nexus Desktop Security Platform  
**Target Environments:** Windows 10/11 Desktop, Tauri 2 Shell, Node.js v20+, Rust 1.80+  

---

## 1. Objectives & Scope

This Quality Assurance Test Plan establishes the testing requirements, automation strategy, validation protocols, and acceptance criteria across all tiers of the AppSec Nexus desktop application.

### In-Scope Modules:
1. **Core Platform & Tauri IPC Shell:** Capability restrictions, command exposure, background Tokio task lifecycles, and SQLite persistence.
2. **Target & Scope Management:** Target creation, scope boundaries (allowed hosts, prefixes, ports, exclusions), loopback protection, and local lab approvals.
3. **Scan Engine & External Tool Integrations:** Nuclei, OWASP ZAP, Nmap, ProjectDiscovery httpx, Burp Suite XML imports, Windows host audit.
4. **Vulnerability Validation Engine:** Active HTTP probing, response analysis, confidence scoring, and AI policy grounding.
5. **Unified Findings Management:** Create, Read, Update, Delete, Bulk operations, Confirmation modals, and CWE/CVE mapping.
6. **Issue Documentation & Tracking Center:** Stable SHA-256 deduplication, lifecycle transitions, internal notes, 6 report templates, and multi-format exports (PDF, Markdown, JSON, CSV).
7. **Two-Model Ollama AI Workspace:** Quick Security AI (`llama3.2:1b`), Deep Security AI (`llama3:8b`), slot mappings, model discovery, and offline degradation.
8. **Cyber Academy & Visual Learning Engine:** 7 interactive network simulators, Command Academy, Resource Hub, and Capstone pentest simulator.
9. **Design System & Theme Personalization:** 5 distinct themes, dynamic accents, live preview with rollback, and WCAG AA contrast.
10. **Help Center & Interactive Guided Tours:** Step-by-step walkthroughs, searchable security guides, and persistent penetration testing workflows.
11. **UI Responsiveness & Accessibility:** Verification across 8 viewports (320px to 1920px), keyboard navigation, focus management, and screen-reader accessibility.

---

## 2. Test Architecture & Automated Test Suites

The automated test framework utilizes **Vitest**, **React Testing Library**, **jsdom**, and **mocked Tauri IPC invokers** (`src/test/setup.ts`).

| Test Suite File | Category | Focus Areas | Automated Tests |
| :--- | :--- | :--- | :---: |
| `src/test/features.test.tsx` | End-to-End / Core | Navigation sidebar, tabs, core workflows | **11** |
| `src/test/data_management_crud.test.tsx` | Integration / CRUD | Target, Finding, Endpoint, Scan history CRUD | **12** |
| `src/test/issue_documentation_and_export.test.tsx` | End-to-End / Reports | Issue center, deduplication, 6 templates, exports | **13** |
| `src/test/two_model_workspace.test.tsx` | Integration / AI | Quick/Deep AI roles, slot mapping, system info | **7** |
| `src/test/validation_engine.test.tsx` | Integration / Security | Live vulnerability probe, confidence score, facts | **6** |
| `src/test/design_system_and_themes.test.tsx` | Component / UX | 5 themes, live preview rollback, accent colors | **10** |
| `src/test/ui_responsiveness.test.tsx` | Layout / Responsive | 320px–1920px viewports, table wrappers, cards | **7** |
| `src/test/help_and_tour_system.test.tsx` | Component / Tour | Welcome tour, 10+ Help articles, guided workflows | **5** |
| `src/test/cyber_academy_enhancements.test.tsx` | Component / Academy | 7 visual simulators, Command academy, resources | **7** |
| `src/test/security_dsa_algorithms.test.ts` | Unit / Algorithm | Bloom filter, Trie, Priority Queue, Graph, Token bucket | **10** |
| `src/test/performance_dsa.test.ts` | Unit / Performance | Large-scale finding deduplication & search latency | **2** |
| `src/test/errors_and_edge_cases.test.tsx` | Integration / Resilience | Offline AI, empty inputs, network disconnects | **6** |
| `src/test/workspace_controls_and_docking.test.tsx` | Component / Workspace | Tab switching, tab closing, docking restoration | **4** |
| `src/test/interactive_workspace_and_ai_task.test.tsx` | Integration / Concurrency | Split-pane resizing, dashboard widgets, AI tasks | **4** |
| **Total Automated Tests** | | | **104** |

---

## 3. Detailed Test Cases Matrix

### Suite A: Target & Scope Management
- **TC-TGT-001:** Create and authorize target with strict URL prefix and port constraints.
  - *Preconditions:* Application running on Dashboard.
  - *Steps:* Open Target Modal -> Enter `http://localhost:3000` -> Configure scope -> Save.
  - *Expected:* Target stored in SQLite; out-of-scope targets rejected; local lab flag recorded.
  - *Result:* **PASS** (Covered in `data_management_crud.test.tsx`).
- **TC-TGT-002:** Prevent out-of-scope scan invocation.
  - *Steps:* Configure scope for `example.com` -> Attempt scan on `169.254.169.254`.
  - *Expected:* Backend returns validation error; request blocked prior to transmission.
  - *Result:* **PASS** (Covered in `data_management_crud.test.tsx`).

### Suite B: Two-Model Ollama AI Workspace
- **TC-AI-001:** Verify exactly two model choice cards (Quick Security AI vs Deep Security AI).
  - *Steps:* Navigate to "AppSec AI" tab -> Observe primary model selection cards.
  - *Expected:* Exactly two cards rendered: Quick (`llama3.2:1b`) and Deep (`llama3:8b`).
  - *Result:* **PASS** (Covered in `two_model_workspace.test.tsx`).
- **TC-AI-002:** Model role switching in Mentor Chat.
  - *Steps:* Select Quick AI -> Send prompt -> Switch to Deep AI -> Send prompt.
  - *Expected:* Model parameter reflects active role; conversation history preserved.
  - *Result:* **PASS** (Covered in `two_model_workspace.test.tsx`).
- **TC-AI-003:** Offline Ollama handling.
  - *Steps:* Simulate offline endpoint `http://127.0.0.1:11434` -> Observe UI.
  - *Expected:* Offline status badge displayed; application remains fully usable.
  - *Result:* **PASS** (Covered in `errors_and_edge_cases.test.tsx`).

### Suite C: Issue Documentation, Tracking & Export System
- **TC-ISS-001:** Automated issue deduplication via SHA-256 fingerprinting.
  - *Steps:* Record issue `ISS-001` -> Record duplicate issue with same component and title.
  - *Expected:* Fingerprint matches existing record; `occurrence_count` increments; timeline updated.
  - *Result:* **PASS** (Covered in `issue_documentation_and_export.test.tsx`).
- **TC-ISS-002:** Reopening resolved issues upon scan re-detection.
  - *Steps:* Mark issue as `Fixed` -> Re-trigger detection probe.
  - *Expected:* Status transitions automatically to `RetestFailed`; alert logged in timeline.
  - *Result:* **PASS** (Covered in `models.rs` and `db.rs`).
- **TC-ISS-003:** Professional Report Generation across 6 templates.
  - *Steps:* Select scope -> Select template (`technical_vulnerability`) -> Trigger generation.
  - *Expected:* Synthesized Markdown report generated with metrics, findings, and remediation.
  - *Result:* **PASS** (Covered in `issue_documentation_and_export.test.tsx`).
- **TC-ISS-004:** Multi-format deliverable exports.
  - *Steps:* Click Print/PDF, Markdown, JSON, and CSV export buttons.
  - *Expected:* Client initiates file download with proper MIME type and sanitized filename.
  - *Result:* **PASS** (Covered in `issue_documentation_and_export.test.tsx`).

### Suite D: UI Responsiveness & Visual Hierarchy
- **TC-RESP-001:** Mobile viewport rendering (320px – 390px).
  - *Steps:* Resize window to 375x667 -> Verify navigation, stat cards, and data tables.
  - *Expected:* No horizontal scrollbar on body; tables enclosed in responsive scroll container.
  - *Result:* **PASS** (Covered in `ui_responsiveness.test.tsx`).
- **TC-RESP-002:** Large desktop rendering (1440px – 1920px).
  - *Steps:* Render at 1920x1080 -> Verify multi-column grid alignment and drawer docking.
  - *Expected:* Clean spacing, appropriate typography scale, zero clipping.
  - *Result:* **PASS** (Covered in `ui_responsiveness.test.tsx`).

---

## 4. Defect Classification & Severity Standards

1. **Critical (P0):** Application crash, remote code execution risk, unconstrained scan out-of-scope, or secret exposure.
2. **High (P1):** Data loss, broken CRUD persistence, failure to export reports, or complete scanner failure.
3. **Medium (P2):** UI/UX layout collision, incorrect badge status, missing error message, or filter malfunction.
4. **Low (P3):** Styling inconsistency, minor typographical error, or animation glitch.

---

## 5. Execution Protocol & Verification Gates

All pull requests and release builds must pass the following continuous quality gates:
1. `npm test -- --run` — 100% green across all 14 test suites.
2. `npx tsc --noEmit` — 0 TypeScript compilation errors under strict mode.
3. `npm run build` — Clean Vite production bundle generation without unresolved imports.
4. `cargo check` — Clean Rust backend compilation with 0 warnings.
