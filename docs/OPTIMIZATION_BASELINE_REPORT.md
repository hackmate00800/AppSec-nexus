# AppSec Nexus — Project Size Optimization & DSA Refactoring
## Phase 1 Baseline Audit & Measurement Report

**Date**: 2026-10-20  
**Branch**: `feature/optimization-and-refactor-20261020`  
**Working Tree**: Clean  

---

### 1. Storage & Size Measurements by Category

| Category | Size (MB) | Size (Bytes) | Notes |
| :--- | :--- | :--- | :--- |
| **Total Repository Working Tree** | **10,172.06 MB** | ~10.66 GB | Includes untracked external toolchains and build targets |
| **Rust / Tauri Build Output (`src-tauri/target`)** | **8,741.58 MB** | ~9.16 GB | 85.9% of total disk consumption (debug + release artifacts) |
| **External Security Toolchains (`tools/`)** | **1,125.36 MB** | ~1.18 GB | `w64devkit` compiler (715.3 MB), `tools/bin` (335.4 MB), JADX (74.6 MB) |
| **Node.js Dependencies (`node_modules/`)** | **213.51 MB** | ~223.8 MB | 7 production dependencies, 10 development dependencies |
| **Git Object Store (`.git/`)** | **70.96 MB** | ~74.4 MB | 1 packfile (70.48 MB) |
| **Frontend Source (`src/`)** | **2.78 MB** | ~2.91 MB | 6,439-line monolith in `App.tsx` (290.97 KB) |
| **Frontend Production Build (`dist/`)** | **1.76 MB** | ~1.84 MB | Uncompressed production bundles |
| **Rust Source (`src-tauri/src/`)** | **0.71 MB** | ~744 KB | Largest file `db.rs` (124.98 KB), `validator.rs` (68.8 KB) |
| **Documentation (`docs/`)** | **0.12 MB** | ~125 KB | 19 Markdown documentation guides |
| **Burp Suite Extension (`burp-extension/`)** | **0.12 MB** | ~125 KB | Python Jython / Java Burp adapter extension |

---

### 2. Packaged Binary & Desktop Bundle Metrics

| Packaged Output | Path | Size |
| :--- | :--- | :--- |
| **Standalone Executable** | `AppSec-Nexus.exe` (root) | **7.91 MB** (8,303,104 bytes) |
| **NSIS Installer Bundle** | `src-tauri/target/release/bundle/nsis/AppSec Nexus_0.2.0_x64-setup.exe` | **3.08 MB** (3,230,064 bytes) |
| **MSI Package Bundle** | `src-tauri/target/release/bundle/msi/AppSec Nexus_0.2.0_x64_en-US.msi` | **4.09 MB** (4,292,608 bytes) |

---

### 3. Production Frontend Chunk Breakdown (`dist/assets/`)

| Chunk File | Uncompressed Size | Gzip Size (from build) | Content Analysis |
| :--- | :--- | :--- | :--- |
| `index--DLi7msB.js` | **577.93 KB** | ~141.05 KB | Core App orchestrator, settings, finding routing |
| `CyberAcademy-Dk12eeq1.js` | **522.44 KB** | ~155.04 KB | Full curriculum data, concept library, visual simulators |
| `vendor-bLqORmw_.js` | **207.61 KB** | ~66.97 KB | React, React-DOM, Lucide icons, Tauri plugins |
| `BurpIntegrationView-CuxflDFg.js`| **69.39 KB** | ~16.18 KB | Burp XML parser, request repeater, diff engine |
| `Analytics-Cy-5PDzP.js` | **54.89 KB** | ~12.33 KB | Visual telemetry charts, posture matrices |
| `CategoryWorkflowView-oGwTrKSX.js`| **54.53 KB** | ~12.82 KB | Category tool runners and workbench |
| `OrchestrationHub-C_vYowwh.js` | **46.60 KB** | ~10.63 KB | Scan profiles and scanner coordinator |
| `ChecklistPlaybookCenter-Ct8TTaNE.js` | **44.63 KB** | ~13.50 KB | Interactive compliance playbooks |
| `MentorChat-CoUroGZ9.js` | **44.48 KB** | ~12.82 KB | AI Mentor chat thread, role selector |
| `icons-iIeyy2jG.js` | **41.62 KB** | ~14.13 KB | Lucide icon subset |
| `VulnerabilityDetailPage-DQhLRLXN.js`| **34.76 KB** | ~6.84 KB | Vulnerability inspection tabs |
| `index-DcocrDrd.css` | **32.32 KB** | ~7.23 KB | Global stylesheet and themes |
| `MultiTerminalWorkspace-B0E46eGf.js`| **25.92 KB** | ~7.99 kB | Terminal emulation panes |
| Others (< 15 KB each) | ~36.8 KB | ~12 KB | Flowchart, Methodologies, Host/Mobile, Core |
| **Total Dist Bundle** | **1,760 KB (~1.76 MB)** | **~504 KB (gzipped)** | |

---

### 4. Largest Source Files in Codebase

1. `src/App.tsx` : **290.97 KB** (6,439 lines)
2. `src-tauri/src/db.rs` : **124.98 KB** (3,398 lines)
3. `src/burp/BurpIntegrationView.tsx` : **105.87 KB** (2,434 lines)
4. `src/academy/CyberAcademy.tsx` : **92.86 KB** (2,168 lines)
5. `src/orchestration/OrchestrationHub.tsx` : **83.39 KB** (1,985 lines)
6. `src/Analytics.tsx` : **81.76 KB** (1,922 lines)
7. `src/categories/CategoryWorkflowView.tsx` : **76.55 KB** (1,842 lines)
8. `src/MentorChat.tsx` : **70.19 KB** (1,692 lines)
9. `src-tauri/src/validator.rs` : **68.81 KB** (1,595 lines)
10. `src-tauri/src/lib.rs` : **67.76 KB** (1,515 lines)

---

### 5. Dependency Counts & Analysis

#### Frontend (`package.json`):
- **Production Dependencies (7)**:
  - `@tauri-apps/api`: `^2`
  - `@tauri-apps/plugin-opener`: `^2`
  - `clsx`: `^2.1.1`
  - `lucide-react`: `^1.57.0`
  - `react`: `^19.1.0`
  - `react-dom`: `^19.1.0`
  - `tailwind-merge`: `^3.7.0`
- **Dev Dependencies (10)**:
  - `@tauri-apps/cli`: `^2`
  - `@testing-library/jest-dom`: `^7.0.1`
  - `@testing-library/react`: `^16.3.3`
  - `@types/react`: `^19.1.8`
  - `@types/react-dom`: `^19.1.6`
  - `@vitejs/plugin-react`: `^6.0.2`
  - `jsdom`: `^30.1.3`
  - `typescript`: `~6.0.3`
  - `vite`: `^8.0.16`
  - `vitest`: `^5.0.5`

#### Rust Backend (`src-tauri/Cargo.toml`):
- Direct dependencies: `tauri`, `tauri-plugin-opener`, `serde`, `serde_json`, `tokio`, `rusqlite`, `reqwest`, `chrono`, `uuid`, `regex`, `url`, `sha2`, and Windows `windows-sys`.

---

### 6. Primary Sources of Project Bloat & Planned Optimization Levers

1. **Rust Debug Build Artifacts (`src-tauri/target/debug`)**:
   - Accounts for **~5.5 GB** of unnecessary debug executables (`.exe`, `.a`, `.rlib`) from past testing and debugging sessions.
   - Cleanable via `cargo clean --doc` or targeted cleaning without affecting release builds.
2. **Untracked / Legacy Compiler Copies in `tools/`**:
   - `tools/compiler/w64devkit` (715 MB) was bundled locally for C/C++ compilation.
3. **Frontend Bundle Splitting**:
   - `CyberAcademy-Dk12eeq1.js` is 522 KB because it bundles static curriculum datasets (`curriculumData.ts`, `conceptLibraryData.ts`). Code-splitting these data modules on demand will drop the initial chunk size by ~50%.
   - `index--DLi7msB.js` is 578 KB because `App.tsx` contains inline dialogs, tour data, and non-lazy components that can be split.
4. **DSA & Runtime Inefficiencies**:
   - Linear scans in finding deduplication, asset lookups, and audit log lookups in both TypeScript and Rust can be refactored to $O(1)$ HashSets/HashMaps and indexed sets.
   - Unbounded memory arrays in scan response caching.
