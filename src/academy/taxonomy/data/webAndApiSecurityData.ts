import { TaxonomyDomain } from "../types";

export const WEB_AND_API_SECURITY_DOMAIN: TaxonomyDomain = {
  id: "domain-web-api-security",
  title: "Web & API Application Security",
  shortName: "Web & API",
  description: "Comprehensive vulnerability taxonomies, assessment methodologies, and verification procedures for modern Web Applications and REST/GraphQL APIs based on OWASP WSTG, ASVS, and OWASP API Top 10.",
  category: "application",
  iconName: "Globe",
  isBeginnerRecommended: true,
  disciplines: [
    {
      id: "disc-web-security",
      title: "Web Application Security & Vulnerabilities",
      description: "OWASP Top 10 web weakness classes, browser security models, session architecture, and server-side request behavior.",
      iconName: "Layout",
      phases: [
        {
          id: "phase-injection-vulnerabilities",
          phaseNumber: 1,
          title: "Injection Flaws & Interpreter Manipulation",
          description: "Interpreter confusion weaknesses where untrusted user input alters intended execution logic (SQLi, Command Injection, SSTI).",
          subPhases: [
            {
              id: "subphase-sqli",
              title: "SQL Injection (SQLi)",
              description: "In-band, error-based, blind boolean, and time-based SQL injection vulnerability mechanics and parameterized defenses.",
              topics: [
                {
                  id: "topic-sqli-deep-dive",
                  title: "SQL Injection: Architecture, Exploitation Vectors & Parameterized Fixes",
                  description: "Understand how unsanitized string concatenation in relational database queries creates syntax injection, and how prepared statements eliminate the vulnerability.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 45,
                  technologies: ["SQL", "PostgreSQL", "MySQL", "SQLite", "Prepared Statements"],
                  prerequisites: ["topic-osi-model", "topic-stride-threat-modeling"],
                  learningObjectives: [
                    "Distinguish between In-band, Blind (Boolean/Time), and Out-of-band SQLi",
                    "Execute safe validation proofs in an authorized lab using boundary characters (' and \")",
                    "Implement parameterized queries / prepared statements in Python, Node.js, and Java",
                    "Configure database least-privilege service accounts to limit blast radius"
                  ],
                  definition: "SQL Injection (SQLi) is an injection vulnerability that occurs when untrusted user input is directly concatenated or interpolated into a structured database query without parameterization, allowing an attacker to manipulate query structure and logic.",
                  purpose: "Educate developers and auditors on recognizing vulnerable database call patterns, verifying data exfiltration and authentication bypass risks safely in authorized labs, and enforcing parameterized architectural standards.",
                  technicalFoundations: "Relational database engines parse SQL queries through lexical analysis, syntax parsing, query optimization, and execution. When user input contains SQL metacharacters (e.g. single quote ', double dash --, UNION, OR 1=1), the parser interprets data as control commands, fundamentally altering the query tree.",
                  typesAndSubtypes: [
                    { name: "In-Band / Classic SQLi", description: "Attacker receives extracted data directly within the application's HTTP response (Union-based or Error-based)." },
                    { name: "Error-Based SQLi", description: "Database error messages intentionally or accidentally returned in responses reveal data contents." },
                    { name: "Boolean Blind SQLi", description: "Application returns differing response content (e.g., HTTP 200 vs 404, or 'Welcome back' vs 'User not found') based on evaluated true/false SQL conditions." },
                    { name: "Time-Based Blind SQLi", description: "Database is instructed to execute a time delay (e.g., SLEEP(5) or pg_sleep(5)) when a condition is true, measured via HTTP response latency." },
                    { name: "Second-Order SQLi", description: "User input is stored safely initially, but later retrieved and concatenated into a separate dynamic query without sanitization." }
                  ],
                  architectureDataFlow: "Client Browser -> HTTP Request -> Web Application Controller -> Concatenated SQL String -> Database Engine Parser -> Arbitrary Data Returned.",
                  threatModel: "Attacker objective: Complete database exfiltration, authentication bypass, data destruction (DROP TABLE), or operating system command execution (via xp_cmdshell or COPY FROM PROGRAM).",
                  commonWeaknesses: [
                    "Using string formatting or concatenation (e.g., f\"SELECT * FROM users WHERE email='{user_input}'\")",
                    "Relying on client-side regex or input blacklists that fail against alternative encodings",
                    "Database connection running as 'sa', 'postgres', or 'root' with full file read/write permissions"
                  ],
                  defensiveControls: [
                    "Mandatory Parameterized Queries / Prepared Statements across all queries",
                    "Object-Relational Mapping (ORM) frameworks with parameterized bindings",
                    "Database user least-privilege (granting only SELECT/INSERT/UPDATE on required tables; no DROP/ALTER/GRANT)",
                    "Web Application Firewall (WAF) as defense-in-depth virtual patching"
                  ],
                  assessmentMethodology: "Identify all application input vectors communicating with persistent storage, send single boundary test characters, analyze response delta without destructive side-effects, and verify with parameterized code review.",
                  procedure: {
                    id: "proc-validate-sqli",
                    title: "Authorized Safe SQL Injection Validation Procedure",
                    summary: "Safely test and validate whether an input parameter is vulnerable to SQL injection using mathematical balance queries in an authorized test environment.",
                    prerequisites: ["Target in scope with written authorization", "Web proxy (Burp Suite, OWASP ZAP, or curl)"],
                    safetyPrecautions: [
                      "Never execute DROP, UPDATE, DELETE, or sleep intervals exceeding 3 seconds",
                      "Do not extract production customer personally identifiable information (PII)"
                    ],
                    scopeRequirements: ["Authorized local lab or approved staging URL"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Establish baseline request & response",
                        objective: "Capture standard HTTP response for known valid input",
                        readOnly: true,
                        commandOrPayload: "curl -s -o /dev/null -w \"HTTP %{http_code} | Size: %{size_download}b | Time: %{time_total}s\\n\" \"http://localhost:3000/rest/products/search?q=apple\"",
                        explanation: "Records normal status code, payload length, and response timing for valid query.",
                        expectedObservation: "HTTP 200 with standard search result payload size.",
                        evidenceCollection: "Save baseline response headers and body length."
                      },
                      {
                        stepNumber: 2,
                        title: "Inject boundary character test",
                        objective: "Probe for unescaped syntax errors",
                        readOnly: true,
                        commandOrPayload: "curl -s \"http://localhost:3000/rest/products/search?q=apple'\"",
                        explanation: "A single quote breaks unescaped string literals in SQL syntax.",
                        expectedObservation: "Database error (e.g., 'SQLITE_ERROR: unrecognized token' or HTTP 500 internal server error).",
                        evidenceCollection: "Capture error stack trace or response divergence."
                      },
                      {
                        stepNumber: 3,
                        title: "Inject non-destructive Boolean logic balance test",
                        objective: "Confirm syntax interpretation without exfiltrating records",
                        readOnly: true,
                        commandOrPayload: "curl -s \"http://localhost:3000/rest/products/search?q=apple'))--\"",
                        explanation: "Closes the string literal and comments out trailing query logic; verifies syntax balancing.",
                        expectedObservation: "Query succeeds normally without error, confirming parameter controls query structure.",
                        evidenceCollection: "Compare response body with baseline."
                      }
                    ],
                    validationCriteria: "A parameter is verified vulnerable when syntax metacharacters cause database-level parsing errors or Boolean logic alterations that change the returned data set.",
                    falsePositiveAnalysis: "Application input validators that reject quotes with a generic 400 Bad Request error are NOT vulnerable. A vulnerability requires database parser involvement.",
                    severityAndImpact: {
                      cvssScore: 9.8,
                      severityLevel: "Critical",
                      businessImpact: "Full loss of database confidentiality and integrity; potential authentication bypass for administrative accounts.",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "High"
                    },
                    remediation: {
                      summary: "Refactor dynamic string concatenation into parameterized queries using prepared statement placeholders.",
                      codeOrConfigExample: `// VULNERABLE:
// const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";

// REMEDIATED (Parameterized with prepared statements):
const query = "SELECT id, email, role FROM users WHERE email = $1";
const result = await db.query(query, [req.body.email]);`,
                      language: "javascript",
                      defenseInDepth: [
                        "Enforce strict input type validation (e.g., ensure IDs are strictly integers)",
                        "Deploy database connection with read-only permissions for search queries",
                        "Suppress verbose database error messages in production responses"
                      ]
                    },
                    retestProcedure: {
                      steps: [
                        "Deploy parameterized code fix",
                        "Re-send single quote injection payload: curl -s \"http://localhost:3000/rest/products/search?q=apple'\"",
                        "Verify query executes as a literal search for the character without throwing syntax errors"
                      ],
                      passCondition: "Application handles quote literally, returning HTTP 200 with 0 search matches; no SQL errors observed.",
                      residualRiskNotes: "Ensure all related search endpoints across the fleet are similarly refactored."
                    },
                    tools: ["curl", "Burp Suite", "OWASP ZAP", "sqlmap (strictly in authorized lab)"]
                  },
                  relatedCwe: ["CWE-89", "CWE-564"],
                  relatedMitreAttack: ["T1190"],
                  references: [
                    { title: "OWASP Web Security Testing Guide: Testing for SQL Injection (WSTG-INPV-05)", url: "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection", publisher: "OWASP", isOfficial: true },
                    { title: "OWASP SQL Injection Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html", publisher: "OWASP", isOfficial: true },
                    { title: "MITRE CWE-89: Improper Neutralization of Special Elements used in an SQL Command", url: "https://cwe.mitre.org/data/definitions/89.html", publisher: "MITRE", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        },
        {
          id: "phase-access-control",
          phaseNumber: 2,
          title: "Broken Access Control & Authorization",
          description: "OWASP #1 vulnerability category covering Insecure Direct Object References (IDOR), vertical privilege escalation, and multi-tenant isolation failures.",
          subPhases: [
            {
              id: "subphase-idor-bola",
              title: "Insecure Direct Object References (IDOR / BOLA)",
              description: "Object-level access control omissions allowing one user to access or mutate resources belonging to another user.",
              topics: [
                {
                  id: "topic-idor-deep-dive",
                  title: "IDOR: Object Ownership Verification & Horizontal Privilege Escalation",
                  description: "Analyze how exposing internal database keys in URLs or payloads without validating session identity against resource ownership allows unauthorized data exposure.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 40,
                  technologies: ["REST API", "JSON", "JWT", "Access Control"],
                  prerequisites: ["topic-stride-threat-modeling"],
                  learningObjectives: [
                    "Understand how direct references (e.g. /api/invoices/1042) lead to IDOR without server-side ownership checks",
                    "Differentiate between Horizontal (peer-to-peer) and Vertical (user-to-admin) privilege escalation",
                    "Design robust object-level authorization middleware validating session userId against record tenantId",
                    "Conduct authorized multi-account testing using dual test user accounts"
                  ],
                  definition: "Insecure Direct Object References (IDOR) occur when an application provides direct access to objects based on user-supplied input (such as database primary keys, filenames, or UUIDs) without performing adequate server-side authorization checks to verify that the requesting user owns or has permission to access that object.",
                  purpose: "Train security engineers to identify missing authorization policies on data access layers and implement consistent contextual access checks.",
                  technicalFoundations: "Applications frequently reference database entities by sequential integers or UUIDs in route parameters (GET /api/documents/501). When an endpoint queries `SELECT * FROM documents WHERE id = :id` without adding `AND owner_id = :session_user_id`, any authenticated user who changes the ID parameter can view other users' sensitive records.",
                  typesAndSubtypes: [
                    { name: "Horizontal IDOR", description: "User A accesses resources belonging to User B at the same permission level." },
                    { name: "Vertical IDOR", description: "Standard user accesses admin-only configuration objects or accounts." },
                    { name: "Blind / Mutating IDOR", description: "Unauthorized UPDATE, DELETE, or state change executed without viewing output." },
                    { name: "Indirect Object Reference", description: "Use of hashed or mapped session-specific references that prevent direct enumeration." }
                  ],
                  architectureDataFlow: "Client A (Session: User 101) -> GET /api/orders/999 -> Controller retrieves Order 999 -> MISSING owner check -> Order 999 (belongs to User 202) returned to Client A.",
                  threatModel: "Attacker objective: Bulk exfiltration of all tenant records, unauthorized modification of victim data, or takeover of sensitive documents.",
                  commonWeaknesses: [
                    "Relying on UI-level hiding of buttons instead of server-side endpoint enforcement",
                    "Trusting user-supplied userId from JSON request bodies or query parameters instead of cryptographic JWT / session store",
                    "Using predictable sequential IDs without rate-limiting or ownership gates"
                  ],
                  defensiveControls: [
                    "Enforce server-side authorization policies checking session identity on every data query",
                    "Use Indirect Reference Maps or unpredictable cryptographically secure UUIDv4 identifiers",
                    "Implement centralized Access Control Layer (ACL / ABAC / RBAC) middleware"
                  ],
                  assessmentMethodology: "Authenticate as Test User A and create an object. Obtain the object identifier. Switch authentication tokens to Test User B and attempt to retrieve or mutate Test User A's object.",
                  procedure: {
                    id: "proc-validate-idor",
                    title: "Authorized Multi-Account IDOR Testing Procedure",
                    summary: "Validate object ownership enforcement using two distinct authorized test accounts.",
                    prerequisites: ["Two authorized user accounts in test scope (User A and User B)"],
                    safetyPrecautions: ["Only access test data created by your designated testing accounts"],
                    scopeRequirements: ["Authorized lab or staging environment"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Create resource as User A and note ID",
                        objective: "Generate a legitimate test resource",
                        readOnly: false,
                        commandOrPayload: "curl -s -X POST -H \"Authorization: Bearer $USER_A_TOKEN\" -H \"Content-Type: application/json\" -d '{\"title\":\"User A Private Note\"}' http://localhost:3000/api/notes",
                        explanation: "User A creates note ID 42.",
                        expectedObservation: "HTTP 201 Created with JSON {\"id\": 42, \"owner\": \"user_a\"}.",
                        evidenceCollection: "Save response JSON with created object ID."
                      },
                      {
                        stepNumber: 2,
                        title: "Attempt retrieval of resource using User B credentials",
                        objective: "Verify whether server enforces ownership boundary",
                        readOnly: true,
                        commandOrPayload: "curl -s -H \"Authorization: Bearer $USER_B_TOKEN\" http://localhost:3000/api/notes/42",
                        explanation: "User B requests Note 42 which belongs to User A.",
                        expectedObservation: "VULNERABLE if HTTP 200 with User A's note is returned. SECURE if HTTP 403 Forbidden or 404 Not Found is returned.",
                        evidenceCollection: "Capture HTTP status and response body."
                      }
                    ],
                    validationCriteria: "IDOR is confirmed if User B receives HTTP 200 with User A's private data.",
                    falsePositiveAnalysis: "If the resource was intentionally marked public or shared with organization-wide read access, this is not an IDOR.",
                    severityAndImpact: {
                      cvssScore: 8.6,
                      severityLevel: "High",
                      businessImpact: "Mass data exposure across tenants violating data protection regulations (GDPR/HIPAA).",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "None"
                    },
                    remediation: {
                      summary: "Bind all database queries to the verified authenticated user session ID.",
                      codeOrConfigExample: `// VULNERABLE:
app.get('/api/notes/:id', async (req, res) => {
  const note = await db.findNoteById(req.params.id);
  res.json(note);
});

// SECURE:
app.get('/api/notes/:id', authenticateToken, async (req, res) => {
  const note = await db.findNoteByIdAndOwner(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found or access denied' });
  }
  res.json(note);
});`,
                      language: "javascript",
                      defenseInDepth: [
                        "Adopt UUIDv4 for public-facing identifiers to prevent casual enumeration",
                        "Audit automated access logs for anomalous sequential ID crawling patterns"
                      ]
                    },
                    retestProcedure: {
                      steps: [
                        "Deploy authenticated ownership check",
                        "Re-run step 2 using User B's token against Note 42"
                      ],
                      passCondition: "Server returns HTTP 404 or 403; no sensitive fields disclosed.",
                      residualRiskNotes: "Audit all related REST methods (PUT, PATCH, DELETE) for the same entity."
                    },
                    tools: ["curl", "Burp Suite Multi-Account extension", "Postman"]
                  },
                  relatedCwe: ["CWE-639", "CWE-285"],
                  references: [
                    { title: "OWASP API Security Top 10: API1:2023 Broken Object Level Authorization", url: "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/", publisher: "OWASP", isOfficial: true },
                    { title: "OWASP WSTG: Testing for Insecure Direct Object References (WSTG-ATHZ-04)", url: "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References", publisher: "OWASP", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "disc-api-security",
      title: "API Security & Microservice Telemetry",
      description: "OWASP API Security Top 10 vulnerabilities, schema validation, rate-limiting, and GraphQL/WebSocket security architectures.",
      iconName: "Webhook",
      phases: [
        {
          id: "phase-owasp-api-top10",
          phaseNumber: 1,
          title: "OWASP API Security Top 10 Flaws",
          description: "In-depth taxonomy covering BOLA, Broken Authentication, BOPLA/Mass Assignment, Unrestricted Resource Consumption, and Broken Function Level Authorization.",
          subPhases: [
            {
              id: "subphase-bopla-mass-assignment",
              title: "Broken Object Property-Level Authorization & Mass Assignment",
              description: "API endpoints binding client-provided JSON payloads directly to database entity models without whitelisting properties.",
              topics: [
                {
                  id: "topic-mass-assignment-deep-dive",
                  title: "Mass Assignment / BOPLA: Exploitation & Whitelisting DTOs",
                  description: "Understand how submitting unexpected object properties (such as 'is_admin': true or 'role': 'superuser') in update requests mutates internal object state.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 35,
                  technologies: ["REST API", "JSON", "ORM", "DTOs"],
                  prerequisites: ["topic-idor-deep-dive"],
                  learningObjectives: [
                    "Understand how ORMs automatically bind JSON fields to database models",
                    "Identify mass assignment vectors in user registration and profile update APIs",
                    "Implement Data Transfer Objects (DTOs) with strict property whitelisting"
                  ],
                  definition: "Broken Object Property-Level Authorization (BOPLA), including Mass Assignment, occurs when an API allows a client to read or modify properties of an object that the client should not be authorized to view or change.",
                  purpose: "Prevent attackers from elevating privileges, tampering with financial balances, or setting verified flags by injecting undeclared JSON keys.",
                  technicalFoundations: "Modern application frameworks (Spring, Rails, Express, Django) allow developers to pass request bodies directly into model constructors: `User.update(req.body)`. If the JSON payload contains `{\"role\": \"admin\", \"is_verified\": true}`, the ORM writes these values to the corresponding database columns unless explicit mass-assignment protection is active.",
                  typesAndSubtypes: [
                    { name: "Mass Assignment (Write BOPLA)", description: "Client modifies privileged object properties via PUT/PATCH/POST payloads." },
                    { name: "Excessive Data Exposure (Read BOPLA)", description: "API serializes entire database records including password hashes, internal tokens, or PII into responses." }
                  ],
                  architectureDataFlow: "Client sends JSON {name: 'Jane', role: 'admin'} -> Controller calls User.update(req.body) -> Database updates user's role to 'admin'.",
                  threatModel: "Attacker escalates self to administrator or overrides pricing attributes in an e-commerce checkout flow.",
                  commonWeaknesses: [
                    "Directly passing request body into ORM update or create methods",
                    "Returning raw database models directly to API consumers",
                    "Missing schema validation filters on incoming request bodies"
                  ],
                  defensiveControls: [
                    "Use strict Data Transfer Objects (DTOs) that only expose permitted properties",
                    "Explicitly select required columns in database read queries",
                    "Enforce JSON schema validation rejecting unexpected properties (e.g., additionalProperties: false)"
                  ],
                  assessmentMethodology: "Inspect API responses to determine object property schemas. In profile or object update endpoints, inject extra parameters like 'role', 'is_admin', or 'status' and observe if values persist.",
                  references: [
                    { title: "OWASP API Security Top 10: API3:2023 Broken Object Property Level Authorization", url: "https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/", publisher: "OWASP", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
