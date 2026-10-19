use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MethodologyType {
    Passive,
    Active,
    Static,
    Dynamic,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MethodologyDefinition {
    pub id: String,
    pub name: String,
    pub category: String, // "Web", "API", "Network", "SourceCode", "Cloud", "Mobile"
    pub detection_objective: String,
    pub applicable_vulnerability_classes: Vec<String>,
    pub preconditions: Vec<String>,
    pub input_or_artifact_examined: String,
    pub detection_logic: String,
    pub evidence_expected: String,
    pub verification_strategy: String,
    pub known_limitations: Vec<String>,
    pub references: Vec<String>,
    pub method_type: MethodologyType,
    pub safe_lab_exercise: String,
}

pub struct MethodologyRegistry;

impl MethodologyRegistry {
    pub fn get_all() -> Vec<MethodologyDefinition> {
        vec![
            MethodologyDefinition {
                id: "METH-HTTP-HEADERS".to_string(),
                name: "HTTP Security Header Inspection".to_string(),
                category: "Web".to_string(),
                detection_objective: "Evaluate baseline defensive HTTP headers that enforce browser security policies and mitigate client-side attack vectors.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-693 (Protection Mechanism Failure)".to_string(),
                    "CWE-1021 (Clickjacking)".to_string(),
                    "CWE-319 (Cleartext Transmission)".to_string(),
                    "CWE-79 (MIME Sniffing XSS)".to_string(),
                ],
                preconditions: vec![
                    "Target web service must be reachable over HTTP/HTTPS.".to_string(),
                    "Target must belong to authorized testing scope.".to_string(),
                ],
                input_or_artifact_examined: "HTTP response headers returned on root or initial endpoint.".to_string(),
                detection_logic: "Parse HTTP response headers and verify presence of Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.".to_string(),
                evidence_expected: "Absence of required security headers or presence of deprecated/insecure directives (e.g. unsafe-inline).".to_string(),
                verification_strategy: "Non-destructive HTTP GET request; inspect received header map to confirm omission or configuration flaws.".to_string(),
                known_limitations: vec![
                    "Single-page apps may configure headers on index.html but not on subsequent API routes.".to_string(),
                    "Reverse proxies or CDN layers may inject headers in production that are missing in staging environments.".to_string(),
                ],
                references: vec![
                    "https://owasp.org/www-project-secure-headers/".to_string(),
                    "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html".to_string(),
                ],
                method_type: MethodologyType::Passive,
                safe_lab_exercise: "Inspect headers on local OWASP Juice Shop or DVWA using browser dev tools or curl -I http://localhost:3000".to_string(),
            },
            MethodologyDefinition {
                id: "METH-CORS-EVAL".to_string(),
                name: "Cross-Origin Resource Sharing (CORS) Policy Analysis".to_string(),
                category: "Web".to_string(),
                detection_objective: "Identify permissive or insecure CORS configurations that allow unauthorized cross-origin data extraction.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-942 (Overly Permissive CORS Policy)".to_string(),
                    "CWE-346 (Origin Validation Error)".to_string(),
                ],
                preconditions: vec![
                    "Target web endpoint accepting HTTP requests.".to_string(),
                    "Cross-origin requests allowed by network boundary.".to_string(),
                ],
                input_or_artifact_examined: "Access-Control-Allow-Origin, Access-Control-Allow-Credentials, and Access-Control-Allow-Methods headers.".to_string(),
                detection_logic: "Issue HTTP request with synthetic Origin header (e.g. 'https://evil-attacker.example.com') and observe if Access-Control-Allow-Origin reflects origin with Access-Control-Allow-Credentials: true.".to_string(),
                evidence_expected: "Server response echoing arbitrary Origin header alongside Access-Control-Allow-Credentials: true, or wildcard with credentials.".to_string(),
                verification_strategy: "Differential test with arbitrary Origin and 'null' Origin. Confirm whether authenticated responses are exposed to untrusted domains.".to_string(),
                known_limitations: vec![
                    "Endpoints returning public non-sensitive data with wildcard CORS are often intentional and not vulnerable.".to_string(),
                ],
                references: vec![
                    "https://portswigger.net/web-security/cors".to_string(),
                    "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS".to_string(),
                ],
                method_type: MethodologyType::Active,
                safe_lab_exercise: "Send curl -H 'Origin: https://evil.com' -I http://localhost:3000/api/users to test for origin reflection.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-SQLI-INFERENCE".to_string(),
                name: "Safe SQL Injection Error & Inference Detection".to_string(),
                category: "Web".to_string(),
                detection_objective: "Detect database syntax errors, query corruption, or differential response delays indicative of unparameterized SQL execution.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-89 (Improper Neutralization of Special Elements used in an SQL Command)".to_string(),
                ],
                preconditions: vec![
                    "Endpoint accepting user-controlled query parameters or body inputs.".to_string(),
                    "Authorized target in testing scope.".to_string(),
                ],
                input_or_artifact_examined: "HTTP request parameters, URL paths, and JSON request bodies.".to_string(),
                detection_logic: "Inject harmless boundary characters (single quote ', double quote \", comment --) and observe database error messages (e.g. ORA-, SQL syntax, SQLite error) or differential boolean states.".to_string(),
                evidence_expected: "Database error strings in HTTP response body, or deterministic boolean true/false content size discrepancies.".to_string(),
                verification_strategy: "Non-destructive paired arithmetic comparison (e.g. AND 1=1 vs AND 1=2) without data alteration or payload extraction.".to_string(),
                known_limitations: vec![
                    "Blind SQLi without error messages requires time-based inference which can fluctuate on jittery network connections.".to_string(),
                    "WAFs may block quote characters; bypass techniques should only be executed under authorization.".to_string(),
                ],
                references: vec![
                    "https://owasp.org/www-community/attacks/SQL_Injection".to_string(),
                    "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html".to_string(),
                ],
                method_type: MethodologyType::Active,
                safe_lab_exercise: "Test SQLi in DVWA (Low Security) with ' OR '1'='1 in the user ID field.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-XSS-REFLECTION".to_string(),
                name: "Cross-Site Scripting (XSS) Reflection & Encoding Analysis".to_string(),
                category: "Web".to_string(),
                detection_objective: "Determine whether untrusted input is reflected into the HTML/DOM context without contextual output encoding or sanitization.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-79 (Improper Neutralization of Input During Web Page Generation)".to_string(),
                ],
                preconditions: vec![
                    "Target web endpoint receiving query or form input.".to_string(),
                ],
                input_or_artifact_examined: "HTTP response body and reflected user input positions.".to_string(),
                detection_logic: "Inject unique canary token with HTML meta-characters (e.g. appsec<canary>'\"x) and inspect response to verify if characters are rendered verbatim without HTML entity escaping.".to_string(),
                evidence_expected: "Unescaped < > \" ' characters in HTML body, attribute context, or script block.".to_string(),
                verification_strategy: "Context-aware benign probe verifying script execution potential without harmful payload execution.".to_string(),
                known_limitations: vec![
                    "Modern frontend frameworks (React, Angular, Vue) automatically encode interpolated strings by default.".to_string(),
                    "CSP can prevent exploitation even if reflection occurs.".to_string(),
                ],
                references: vec![
                    "https://owasp.org/www-community/attacks/xss/".to_string(),
                    "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html".to_string(),
                ],
                method_type: MethodologyType::Active,
                safe_lab_exercise: "Experiment with reflected XSS in Juice Shop search box or DVWA XSS Reflected module.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-COOKIE-SECURITY".to_string(),
                name: "Session Cookie Security Flags Audit".to_string(),
                category: "Web".to_string(),
                detection_objective: "Ensure session tokens and authentication cookies are protected against client-side theft and transport eavesdropping.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-1004 (Sensitive Cookie Without HttpOnly Flag)".to_string(),
                    "CWE-614 (Sensitive Cookie in HTTPS Session Without 'Secure' Attribute)".to_string(),
                    "CWE-1275 (Sensitive Cookie with Inappropriate SameSite Attribute)".to_string(),
                ],
                preconditions: vec![
                    "Target issuing Set-Cookie headers in response to HTTP requests.".to_string(),
                ],
                input_or_artifact_examined: "Set-Cookie HTTP response headers.".to_string(),
                detection_logic: "Parse all Set-Cookie directives and inspect attributes: HttpOnly, Secure, and SameSite (Strict/Lax/None).".to_string(),
                evidence_expected: "Set-Cookie header missing HttpOnly, missing Secure on HTTPS endpoints, or missing SameSite flag.".to_string(),
                verification_strategy: "Passive inspection of response headers; verify cookie name indicates authentication or session context.".to_string(),
                known_limitations: vec![
                    "Tracking or UI preference cookies do not necessarily require HttpOnly if they contain no sensitive identifiers.".to_string(),
                ],
                references: vec![
                    "https://owasp.org/www-community/controls/SecureCookieAttribute".to_string(),
                    "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie".to_string(),
                ],
                method_type: MethodologyType::Passive,
                safe_lab_exercise: "Inspect application cookies in DevTools -> Application -> Cookies on DVWA or test apps.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-SAST-SEMGREP".to_string(),
                name: "Static Application Security Testing (SAST) Rule Matching".to_string(),
                category: "SourceCode".to_string(),
                detection_objective: "Scan source code repositories for insecure code patterns, injection flaws, hardcoded credentials, and unsafe framework API usages.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-89 (SQL Injection)".to_string(),
                    "CWE-79 (XSS)".to_string(),
                    "CWE-798 (Use of Hard-coded Credentials)".to_string(),
                    "CWE-22 (Path Traversal)".to_string(),
                    "CWE-502 (Insecure Deserialization)".to_string(),
                ],
                preconditions: vec![
                    "Access to repository source files.".to_string(),
                    "Supported programming language (Python, JS/TS, Go, Java, C#, PHP).".to_string(),
                ],
                input_or_artifact_examined: "Abstract Syntax Trees (AST) and code patterns in source files.".to_string(),
                detection_logic: "Execute semantic pattern matching rules that track data flow from untrusted source to sensitive sink functions.".to_string(),
                evidence_expected: "File path, line number, code snippet showing vulnerable API call, and AST match trace.".to_string(),
                verification_strategy: "Manual code review of taint propagation path from input to execution sink.".to_string(),
                known_limitations: vec![
                    "Static analysis cannot evaluate runtime environment variables, WAF protections, or dynamic routing configurations.".to_string(),
                ],
                references: vec![
                    "https://semgrep.dev/docs/".to_string(),
                    "https://owasp.org/www-community/Source_Code_Analysis_Tools".to_string(),
                ],
                method_type: MethodologyType::Static,
                safe_lab_exercise: "Run semgrep scan --config auto on a local vulnerable repo (e.g. NodeGoat or DVWA).".to_string(),
            },
            MethodologyDefinition {
                id: "METH-SECRET-SCAN-GITLEAKS".to_string(),
                name: "High-Entropy & Pattern Secret Detection".to_string(),
                category: "SourceCode".to_string(),
                detection_objective: "Prevent credential leakage by identifying hardcoded API keys, private keys, JWTs, and database passwords in source code and git histories.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-798 (Use of Hard-coded Credentials)".to_string(),
                    "CWE-312 (Cleartext Storage of Sensitive Information)".to_string(),
                ],
                preconditions: vec![
                    "Repository files or git commit log available for analysis.".to_string(),
                ],
                input_or_artifact_examined: "Source code strings, configuration files, environment templates, and commit patches.".to_string(),
                detection_logic: "Scan for high Shannon entropy strings combined with regular expression patterns for known cloud providers (AWS, GitHub, Google, OpenAI, Slack, Stripe).".to_string(),
                evidence_expected: "Redacted secret token, file name, commit hash, and matched rule pattern.".to_string(),
                verification_strategy: "Verify whether token is active, a sample template (e.g. 'YOUR_KEY_HERE'), or checked into revision history.".to_string(),
                known_limitations: vec![
                    "High entropy hashes (e.g. git SHA, UUIDs) can trigger false positives if entropy threshold is too low.".to_string(),
                ],
                references: vec![
                    "https://github.com/gitleaks/gitleaks".to_string(),
                    "https://cwe.mitre.org/data/definitions/798.html".to_string(),
                ],
                method_type: MethodologyType::Static,
                safe_lab_exercise: "Scan a sample .env file containing dummy AWS keys with gitleaks detect --no-git.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-PORT-SERVICE-ENUM".to_string(),
                name: "Port & Service Fingerprint Enumeration".to_string(),
                category: "Network".to_string(),
                detection_objective: "Identify open network ports, transport protocols, running services, and unpatched application daemon versions.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-200 (Information Exposure)".to_string(),
                    "CWE-668 (Exposure of Resource to Wrong Sphere)".to_string(),
                ],
                preconditions: vec![
                    "Target IP or hostname in authorized scope.".to_string(),
                    "Network layer connectivity over TCP/UDP.".to_string(),
                ],
                input_or_artifact_examined: "TCP SYN/ACK responses, banners, and protocol negotiation packets.".to_string(),
                detection_logic: "Send TCP connection probes to authorized port list, analyze response banners, and match service signatures.".to_string(),
                evidence_expected: "List of open ports, daemon names (e.g. OpenSSH 8.9), and TLS configuration details.".to_string(),
                verification_strategy: "Correlate banner information with known CVE databases and verify port accessibility from target network boundary.".to_string(),
                known_limitations: vec![
                    "Stateful firewalls and intrusion prevention systems (IPS) may drop or spoof responses.".to_string(),
                ],
                references: vec![
                    "https://nmap.org/book/man.html".to_string(),
                    "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server".to_string(),
                ],
                method_type: MethodologyType::Active,
                safe_lab_exercise: "Run nmap -sV -p 80,443,8080,3000 localhost to inspect your local developer services.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-API-SCHEMA-FUZZ".to_string(),
                name: "API Contract & Property-Based Schema Fuzzing".to_string(),
                category: "API".to_string(),
                detection_objective: "Identify unhandled server exceptions, schema deviations, type confusion, and 500 Internal Server Errors in REST/OpenAPI endpoints.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-20 (Improper Input Validation)".to_string(),
                    "CWE-754 (Improper Check for Unusual or Exceptional Conditions)".to_string(),
                ],
                preconditions: vec![
                    "OpenAPI / Swagger specification or parsed route catalog.".to_string(),
                    "Target API service running in authorized test environment.".to_string(),
                ],
                input_or_artifact_examined: "API request parameters, payloads, query strings, and header definitions.".to_string(),
                detection_logic: "Generate hypothesis-driven edge case payloads (boundary integers, extreme strings, null bytes, mismatched types) based on schema constraints.".to_string(),
                evidence_expected: "HTTP 500 status code, stack trace in response, or unhandled rejection.".to_string(),
                verification_strategy: "Replay failing request with minimal repro curl command to verify deterministic crash.".to_string(),
                known_limitations: vec![
                    "Requires accurate OpenAPI specification or thorough route discovery.".to_string(),
                ],
                references: vec![
                    "https://schemathesis.readthedocs.io/".to_string(),
                    "https://owasp.org/www-project-api-security/".to_string(),
                ],
                method_type: MethodologyType::Dynamic,
                safe_lab_exercise: "Run schemathesis against local FastAPI or Express OpenAPI JSON doc endpoint.".to_string(),
            },
            MethodologyDefinition {
                id: "METH-DEP-AUDIT-TRIVY".to_string(),
                name: "Software Composition Analysis (SCA) & CVE Matching".to_string(),
                category: "Dependency".to_string(),
                detection_objective: "Identify known vulnerable third-party libraries, container base images, and package dependencies in software manifests.".to_string(),
                applicable_vulnerability_classes: vec![
                    "CWE-1395 (Use of Vulnerable Third-Party Component)".to_string(),
                    "A06:2021-Vulnerable and Outdated Components".to_string(),
                ],
                preconditions: vec![
                    "Dependency manifest files (package.json, Cargo.lock, requirements.txt, pom.xml) or container image.".to_string(),
                ],
                input_or_artifact_examined: "Package names and exact pinned version numbers.".to_string(),
                detection_logic: "Query vulnerability databases (OSV, NVD, GitHub Advisory Database) for reported CVEs matching package versions.".to_string(),
                evidence_expected: "CVE ID, package name, installed version, fixed version, and vulnerability description.".to_string(),
                verification_strategy: "Confirm package is used in production builds and verify whether vulnerable code path is callable.".to_string(),
                known_limitations: vec![
                    "A vulnerable library may be present in node_modules but never imported or invoked by the application code.".to_string(),
                ],
                references: vec![
                    "https://trivy.dev/".to_string(),
                    "https://osv.dev/".to_string(),
                ],
                method_type: MethodologyType::Static,
                safe_lab_exercise: "Run trivy fs . in a project directory to audit package lock files for known CVEs.".to_string(),
            },
        ]
    }

    pub fn find_by_id(id: &str) -> Option<MethodologyDefinition> {
        Self::get_all().into_iter().find(|m| m.id == id)
    }

    pub fn find_for_finding(title: &str, tool: &str, cwe: Option<&str>) -> MethodologyDefinition {
        let title_lower = title.to_lowercase();
        let tool_lower = tool.to_lowercase();

        if tool_lower.contains("semgrep") {
            return Self::find_by_id("METH-SAST-SEMGREP").unwrap();
        }
        if tool_lower.contains("gitleaks") {
            return Self::find_by_id("METH-SECRET-SCAN-GITLEAKS").unwrap();
        }
        if tool_lower.contains("trivy") || tool_lower.contains("osv") {
            return Self::find_by_id("METH-DEP-AUDIT-TRIVY").unwrap();
        }
        if tool_lower.contains("nmap") || tool_lower.contains("tshark") {
            return Self::find_by_id("METH-PORT-SERVICE-ENUM").unwrap();
        }
        if tool_lower.contains("schemathesis") {
            return Self::find_by_id("METH-API-SCHEMA-FUZZ").unwrap();
        }

        if title_lower.contains("cors") || title_lower.contains("origin") {
            Self::find_by_id("METH-CORS-EVAL").unwrap()
        } else if title_lower.contains("sql") || cwe == Some("CWE-89") {
            Self::find_by_id("METH-SQLI-INFERENCE").unwrap()
        } else if title_lower.contains("xss") || title_lower.contains("cross-site scripting") || cwe == Some("CWE-79") {
            Self::find_by_id("METH-XSS-REFLECTION").unwrap()
        } else if title_lower.contains("cookie") {
            Self::find_by_id("METH-COOKIE-SECURITY").unwrap()
        } else {
            Self::find_by_id("METH-HTTP-HEADERS").unwrap()
        }
    }
}
