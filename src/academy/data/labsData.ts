import { PracticalLab } from "../types";

export const PRACTICAL_LABS: PracticalLab[] = [
  // LAB 1: SQL INJECTION
  {
    id: "lab-sqli-login",
    title: "Lab 1: SQL Injection Authentication Bypass (Safe Testbench)",
    difficulty: "beginner",
    category: "Web",
    estimatedMinutes: 20,
    scenarioDescription: "An administrative portal uses raw SQL string interpolation to verify user credentials. Your objective is to bypass authentication without knowing the password.",
    objectives: [
      "Understand the mechanics of boolean SQL query alteration",
      "Formulate a non-destructive authentication bypass payload",
      "Identify the server response indicating successful administrative bypass",
      "Observe how parameterized queries completely neutralize the attack"
    ],
    setupInstructions: [
      "1. Ensure you are running against your local lab environment (e.g. OWASP Juice Shop on http://localhost:3000 or AppSec Nexus local mock target).",
      "2. Verify target scope is configured to 'Lab Mode' in AppSec Nexus to permit localhost requests.",
      "3. Open the target login form in your browser."
    ],
    stepByStepWalkthrough: [
      {
        step: 1,
        title: "Test for Single-Quote Syntax Sensitivity",
        instruction: "In the Username field, enter `'` (a single apostrophe). Enter any dummy password and submit.",
        commandOrPayload: "admin'",
        expectedResult: "The application returns a raw database syntax error (e.g. 'Unclosed quotation mark before character string') or HTTP 500 error, confirming string interpolation."
      },
      {
        step: 2,
        title: "Craft the Boolean Tautology Payload",
        instruction: "Construct a payload that forces the WHERE clause to evaluate to TRUE for every database record, then comments out password validation.",
        commandOrPayload: "admin' OR '1'='1' -- ",
        expectedResult: "The SQL parser treats 'admin' OR '1'='1' as always TRUE, and the '-- ' sequence ignores the password check."
      },
      {
        step: 3,
        title: "Execute Authentication Bypass",
        instruction: "Submit the payload in the Username field with any random password.",
        commandOrPayload: "' OR 1=1--",
        expectedResult: "Application authenticates the session as the first database user (typically the Administrator), granting access to the private admin dashboard."
      }
    ],
    hints: [
      "Remember that different SQL dialects use different comment syntax: MySQL uses `-- ` (note the space) or `#`, while SQLite and PostgreSQL use `--`.",
      "If the input field is restricted by HTML length attributes, inspect and modify the `maxlength` attribute in DevTools."
    ],
    validationCriteria: "You have successfully obtained an authenticated session token or reached the protected admin portal without supplying a valid password.",
    cleanupInstructions: "Log out of the application to destroy the active session cookie.",
    targetRecommendation: "OWASP Juice Shop (Scoreboard login) or DVWA (SQL Injection section on Low security level).",
    warningNotice: "Never execute authentication bypass payloads against third-party production websites without explicit written authorization."
  },

  // LAB 2: REFLECTED XSS
  {
    id: "lab-xss-reflection",
    title: "Lab 2: Reflected XSS & DOM Execution Validation",
    difficulty: "beginner",
    category: "Web",
    estimatedMinutes: 20,
    scenarioDescription: "A product search bar reflects the user's query directly into the HTML response without contextual entity encoding. Your goal is to safely verify JavaScript execution.",
    objectives: [
      "Locate input reflection points in HTTP responses",
      "Break out of HTML attribute contexts safely",
      "Execute a non-destructive verification payload using `console.log`",
      "Verify how Content-Security-Policy (CSP) mitigates script execution"
    ],
    setupInstructions: [
      "1. Navigate to the search page of your authorized local training target.",
      "2. Open Developer Tools (`F12`) and switch to the Console tab."
    ],
    stepByStepWalkthrough: [
      {
        step: 1,
        title: "Identify Reflection Point",
        instruction: "Enter a unique benign alphanumeric string into the search bar, e.g. `AppSecTest998`.",
        commandOrPayload: "AppSecTest998",
        expectedResult: "Inspect page source (`Ctrl + U`) and search for `AppSecTest998`. Confirm the text appears inside the HTML response."
      },
      {
        step: 2,
        title: "Test HTML Tag Injection",
        instruction: "Submit an HTML formatting tag to test whether the server encodes `<` and `>` characters.",
        commandOrPayload: "<b>AppSecBold</b>",
        expectedResult: "If the text renders as bold formatted text rather than literal `&lt;b&gt;`, HTML injection is confirmed."
      },
      {
        step: 3,
        title: "Execute Safe Non-Destructive Proof of Concept",
        instruction: "Submit an image tag with an invalid source and an `onerror` JavaScript handler.",
        commandOrPayload: "<img src=x onerror=console.log('AppSec_XSS_Verified_'+document.domain)>",
        expectedResult: "The browser console displays 'AppSec_XSS_Verified_localhost', confirming client-side code execution."
      }
    ],
    hints: [
      "If the input is reflected inside an `<input value=\"...\">` attribute, break out using `\" onfocus=console.log(1) autofocus=\"`.",
      "Avoid using intrusive `alert(1)` popups in real security reports; use `console.log(document.domain)` as non-disruptive evidence."
    ],
    validationCriteria: "The DevTools console logs the target domain via the injected script without user interaction.",
    cleanupInstructions: "Refresh the browser to a clean URL without query parameters.",
    targetRecommendation: "DVWA (XSS Reflected) or PortSwigger Web Security Academy free XSS labs.",
    warningNotice: "Do not attempt cookie exfiltration or payload forwarding outside your isolated local lab environment."
  },

  // LAB 3: IDOR & BOLA
  {
    id: "lab-idor-tampering",
    title: "Lab 3: API Broken Object Level Authorization (BOLA)",
    difficulty: "intermediate",
    category: "API",
    estimatedMinutes: 25,
    scenarioDescription: "An API endpoint delivers user receipt details based on an integer ID in the URL. You will audit whether one user can read another user's private receipts.",
    objectives: [
      "Inspect API requests using browser DevTools or proxy",
      "Identify predictable, user-controlled object identifiers",
      "Tamper with object IDs using authenticated session tokens",
      "Verify server-side tenant isolation enforcement"
    ],
    setupInstructions: [
      "1. Open two browser windows: Browser A (logged in as User A) and Browser B (logged in as User B).",
      "2. In Browser A, view your user profile or transaction history at `/api/v1/receipts/201`."
    ],
    stepByStepWalkthrough: [
      {
        step: 1,
        title: "Analyze the Request Structure",
        instruction: "In Browser A, inspect the Network tab and note the GET request headers, including the Authorization token and URL path.",
        commandOrPayload: "GET /api/v1/receipts/201 HTTP/1.1",
        expectedResult: "Server responds with JSON containing User A's name, email, and receipt total."
      },
      {
        step: 2,
        title: "Tamper with the Object Identifier",
        instruction: "In Browser A, modify the URL to request receipt ID 202 (which belongs to User B).",
        commandOrPayload: "GET /api/v1/receipts/202 HTTP/1.1",
        expectedResult: "If vulnerable, the server returns User B's personal data instead of HTTP 403 Forbidden."
      }
    ],
    hints: [
      "Check if IDs are passed in query parameters (`?receipt_id=202`), URL paths (`/receipts/202`), or JSON POST bodies (`{\"id\": 202}`).",
      "Observe whether the server returns HTTP 403 (Forbidden) or HTTP 404 (Not Found) after secure code patching."
    ],
    validationCriteria: "You successfully view another user's private transaction record using your own authenticated account credentials.",
    cleanupInstructions: "Clear browser cache and close the secondary testing session.",
    targetRecommendation: "OWASP Juice Shop (Basket IDOR or Customer Feedback BOLA).",
    warningNotice: "BOLA testing against real production APIs can expose real customer PII; only test against your own secondary test accounts."
  }
];
