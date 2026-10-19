# AI Pipeline & Restriction Audit Report
**Project:** AppSec Nexus — Security AI Workspace  
**Date:** October 2026  
**Auditor:** Principal AI & Application Security Engineer  
**Policy Engine Version:** `2.3.0-curiosity-first-rigorous`

---

## 1. Executive Summary

AppSec Nexus features an integrated **Local Security AI Mentor** powered by locally hosted Ollama large language models. The workspace provides two primary operational roles:
1. **Quick Security AI** (`llama3.2:1b` / 1B–3B parameter models) — rapid turnaround for everyday conceptual questions, code snippets, and summaries.
2. **Deep Security AI** (`appsec-teacher-8b:latest` / `llama3:8b` / 7B–14B parameter models) — high-rigor reasoning, in-depth root cause analysis, and complex code reviews.

This audit was conducted to identify and eliminate unnecessary refusals, false-positive security filters, and technical inaccuracies while ensuring that essential application security boundaries (target scope authorization, rate limits, private data protection, and prompt role isolation) remain fully intact.

---

## 2. End-to-End AI Request & Response Pipeline

```
[User Input in MentorChat.tsx]
           │
           ▼
[Client-Side Validations & Token Budgeting]
  - Token Estimator: Byte-Pair / Subword heuristic (AiSecurityGuard.estimateTokens)
  - Context Window: 4096 / 8192 token limit checks
  - (PREVIOUSLY: Naive regex inspection blocked legitimate educational prompts) -> FIXED
           │
           ▼
[Role & Model Resolution (aiModelResolver.ts)]
  - Active Role: 'quick' vs 'deep'
  - Slot Mapping: Quick -> 1B-3B model; Deep -> 7B-14B model
  - Hardware & Installed Model Discovery (/api/tags)
           │
           ▼
[IPC Bridge: invoke("chat_with_mentor") / invoke("submit_ai_task")]
  - Async IPC to Tauri Rust Backend (ai.rs)
  - Background Task Manager with bounded semaphore queue (concurrency = 1)
           │
           ▼
[AIMentorPolicy Engine (ai.rs: AIMentorPolicy)]
  - Core System Policy Prompt injected into `role: "system"`
  - Finding Context & Validation State injected if inspecting specific vulnerability
  - Role Separation: System instructions isolated from user message history
           │
           ▼
[Local Ollama Inference Engine (127.0.0.1:11434/api/chat)]
  - HTTP POST /api/chat with streaming or non-streaming payload
  - Auto-recovery: If service unreachable, spawns 'ollama serve' subprocess
           │
           ▼
[Response Processing & Persistence]
  - Assistant message recorded in SQLite database (`ai_chat_messages`)
  - Markdown parsed with code syntax highlighting and copy-to-clipboard actions
  - UI State updated reactively
```

---

## 3. Root Cause Investigation Matrix

| ID | Component | Trigger Condition | Observed Behavior | Root Cause Evidence | Classification | Proposed Correction | Regression Test |
|---|---|---|---|---|---|---|---|
| **RC-01** | `src/MentorChat.tsx` (lines 406-427) | User asks about prompt injection, jailbreaking, or DAN personas (e.g. *"How does 'ignore previous instructions' work?"*) | Client immediately intercepted message and output `🛡️ Adversarial Prompt Injection Blocked (Cybersecurity Guard)` | `AiSecurityGuard.inspectPrompt` tested regexes on user input client-side before sending to backend | **Overly broad / False Refusal** | Removed client-side refusal gate. Defend prompt injection via system/user role separation in Ollama API. | `src/test/ai_pipeline_and_accuracy.test.tsx` (Test 13 & 14) |
| **RC-02** | `src-tauri/src/ai.rs` (`AIMentorPolicy`) | User asked about missing CSP header, offensive exploit mechanics, or unverified scanner findings | AI could conflate missing headers with confirmed XSS, or hallucinate CVSS scores | Policy prompt lacked explicit non-equivalence rules for CSP, CVSS vector constraints, and offensive topic guidance | **Policy Incompleteness** | Upgraded `AIMentorPolicy` to v2.3.0 with strict CSP rules, zero fabrication mandates, and curiosity-first educational scope. | `src/test/ai_pipeline_and_accuracy.test.tsx` (Test 1, 2, 8) |
| **RC-03** | `src/MentorChat.tsx` (lines 431-435) | User toggled Quick AI / Deep AI button, but parent passed static `selectedModel` | Model resolution checked `selectedModel \|\| roleModel`, causing stale parent model to override active role toggle | Model dispatch precedence favored stale prop over explicit user role selection | **Model Binding Defect** | Updated model resolution order to prioritize `roleModel = effectiveRole === 'quick' ? effectiveQuickModel : effectiveDeepModel`. | `src/test/ai_pipeline_and_accuracy.test.tsx` (Test 28) |
| **RC-04** | `src/test/setup.ts` | Unit tests executed `chat_with_mentor` | IPC handler returned `null` by default, forcing component into task fallback timeout | IPC mock switch lacked `case "chat_with_mentor"` | **Test Infrastructure Gap** | Added deterministic mock handler for `chat_with_mentor` returning policy-compliant answers for CSP, SQLi, and CVSS. | `src/test/ai_pipeline_and_accuracy.test.tsx` |

---

## 4. Retained vs Corrected Security Safeguards

### Corrected (Overly Broad Restrictions Eliminated)
1. **Frontend Regex Keyword Interception:** Removed hard client-side blocking on prompts mentioning `"ignore previous instructions"`, `"system prompt"`, `"jailbreak"`, or `"DAN"`. Educational and defensive inquiries on LLM security now reach the model safely.
2. **Missing Header Conflation:** Strict instruction that a missing security header (e.g. `Content-Security-Policy`, `X-Content-Type-Options`) does NOT equate to confirmed exploitable vulnerability.
3. **Keyword Refusal Bias:** Prompt explicitly instructs models that cybersecurity terms (`exploit`, `payload`, `attack`, `injection`, `reverse engineering`) do not constitute malicious intent.

### Retained (Essential Application Security Controls)
1. **System / User Role Isolation:** System instructions are permanently placed in Ollama's `role: "system"`, preventing user prompts from overriding core application boundaries.
2. **Scan Scope Validation (`src-tauri/src/scope.rs`):** Strict loopback, IPv6 link-local, and out-of-scope destination blocking prevents SSRF and unintended scanning.
3. **Database & Authorization Boundaries:** All user and tenant actions, credentials, and scan history remain isolated in SQLite.
4. **Proportionate Harmful Request Handling:** If asked to generate exploits against specific unauthorized targets, the AI pivots to explaining underlying mechanisms conceptually and offering authorized local lab alternatives (OWASP Juice Shop, DVWA).
