# AI Pipeline & Restriction Fixes
**Project:** AppSec Nexus — Security AI Workspace  
**Date:** October 2026  
**Status:** Implemented & Verified  

---

## 1. Overview of Implemented Fixes

To achieve a curiosity-first, technically rigorous cybersecurity assistant with minimal unnecessary restrictions and maximum factual accuracy, targeted changes were implemented across three layers:
1. **Frontend Presentation & Input Handling (`src/MentorChat.tsx`)**
2. **Backend AI Policy Engine (`src-tauri/src/ai.rs`)**
3. **Testing & Simulation Infrastructure (`src/test/setup.ts`, `src/test/ai_pipeline_and_accuracy.test.tsx`)**

---

## 2. Frontend Layer Fixes

### A. Removal of False Refusal Gate in `src/MentorChat.tsx`
* **Previous Behavior:** When users submitted prompts containing terms like `"ignore previous instructions"`, `"system prompt"`, `"jailbreak"`, or `"DAN"`, a naive regex filter (`AiSecurityGuard.inspectPrompt`) intercepted the prompt before reaching the model and emitted:
  > `🛡️ Adversarial Prompt Injection Blocked (Cybersecurity Guard)`
* **Root Cause:** Regex blocklists on user input produce 100% false positives when students or security practitioners ask legitimate questions about LLM prompt injection mechanics, jailbreak defense, or prompt hardening.
* **Fix:** Removed the client-side blocking check from `handleSendMessage()`. User prompts now flow directly to the backend. Defense against prompt injection is properly achieved through structured role separation (`role: "system"` vs `role: "user"` in Ollama's Chat API).

### B. Correct Model-to-Role Binding
* **Previous Behavior:** If a parent component passed a stale `selectedModel` prop, switching the active role between Quick AI and Deep AI could still dispatch the old model.
* **Fix:** Updated the model resolution precedence in `MentorChat.tsx` to prioritize the active role's resolved model slot:
  ```typescript
  const roleModel = effectiveRole === "quick" ? effectiveQuickModel : effectiveDeepModel;
  const model = roleModel || selectedModel || "llama3.2:1b";
  ```

---

## 3. Backend Policy Engine Fixes (`src-tauri/src/ai.rs`)

### Upgraded `AIMentorPolicy` to v2.3.0
The policy engine was upgraded with seven comprehensive, enforceable rules injected into `role: "system"` for every Ollama chat session:

1. **Curiosity-First & Unrestricted Educational Scope:**
   - Explicitly instructs the model that terms such as *exploit*, *payload*, *vulnerability*, *penetration testing*, *SQL injection*, *XSS*, *reverse engineering*, and *malware analysis* do **NOT** indicate malicious intent and must never trigger generic refusal lectures.
   - Mandates detailed explanations of underlying protocol dynamics, AST parsers, binary memory layouts, and execution flow.

2. **Safe Handling of Real-World / Unauthorized Attack Requests:**
   - If asked to attack a specific real-world target (e.g. an unauthorized IP or domain), the AI must **not** terminate the learning interaction or emit hostile lectures.
   - Instead, the AI pivots: explaining the underlying vulnerability concept, demonstrating the methodology within authorized open labs (OWASP Juice Shop, DVWA, WebGoat, local Docker testbeds), and providing defense-in-depth mitigations.

3. **Separation of Detection vs Validation & Zero Fabrication:**
   - Automated scanner detection does not equal confirmed exploitability.
   - Prohibits inventing HTTP headers, response codes, scanner outputs, or tool findings.
   - Enforces grounding on the supplied `ValidationRecord` status (`CONFIRMED`, `NEEDS_VALIDATION`, `LIKELY_FALSE_POSITIVE`, `UNCONFIRMED`).

4. **Required Regression Policy: Missing Security Headers (CSP):**
   - Missing `Content-Security-Policy` or `Content-Security-Policy-Report-Only` is identified strictly as a **security hardening omission**, NOT confirmed Cross-Site Scripting (XSS).
   - Explains browser-side script execution restrictions and what additional evidence is required to confirm an XSS vulnerability (e.g. unencoded reflection in an executable HTML/DOM context).
   - Provides clean Nginx/Apache configuration examples without unsafe directives (`'unsafe-inline'`, `'unsafe-eval'`).
   - Details the staged rollout methodology using `Content-Security-Policy-Report-Only`.

5. **CVSS v3.1 Rigor & Severity Boundaries:**
   - Calculates CVSS scores only when complete metric vectors and verified empirical observations are present.
   - Prohibits assigning Critical or High scores based on missing headers alone.
   - Declares unverified findings as *Unassessed / Pending Verification*.

6. **Production Code Generation Quality:**
   - Provides modern, syntactically valid code snippets (Python, TypeScript, PHP, Go, Java, Nginx) with secure defaults and non-destructive retesting commands (`curl`).

7. **Adaptive Depth & Multilingual Support:**
   - Adapts explanations dynamically across *Beginner*, *Intermediate*, *Advanced*, and *Professional* levels.

---

## 4. Before-and-After Verification Scenarios

| Scenario | Before Fix | After Fix |
|---|---|---|
| **Query:** *"How does an attacker use 'ignore previous instructions' and DAN prompts to test LLM system boundaries?"* | Falsely blocked by frontend regex: `🛡️ Adversarial Prompt Injection Blocked` | Passed cleanly to model; model explains prompt injection mechanics and defensive system role separation. |
| **Query:** *"Does missing CSP header mean the site has active XSS?"* | Potential false claim that XSS is present or high severity assigned | Correctly explains CSP is an absent defense-in-depth mitigation, NOT proof of XSS; provides valid Nginx CSP and Report-Only rollout plan. |
| **Role Switch:** User toggles Quick AI to Deep AI | Could send stale model if `selectedModel` was held by parent | Dispatches `appsec-teacher-8b:latest` with thorough analytical depth. |
| **CVSS Scoring:** Missing `X-Content-Type-Options` header | Risk of fabricated CVSS 9.8 Critical score | Rejects Critical severity; assigns Low (<= 3.5) with full explanation of MIME sniffing prerequisites. |
