import {
  CategoryValidationInput,
  CategoryValidationResult,
} from "./types";

export function sanitizeEvidence(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/(authorization:\s*(bearer|basic)\s+)[a-zA-Z0-9_\-\.\+/=]+/gi, "$1[REDACTED_AUTH_TOKEN]")
    .replace(/(password|passwd|api_key|token|secret|access_token|client_secret)(=|:\s*)[^\s&,;\}]+/gi, "$1$2[REDACTED_SECRET]")
    .replace(/(phpsessid|jsessionid|sessionid|connect\.sid|jwt)=[^;\s]+/gi, "$1=[REDACTED_COOKIE]");
}

// =========================================================================
// 1. WEB SECURITY VALIDATION RULES
// =========================================================================
export function validateWebFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = input.rawEvidence || "";
  const body = (input.responseBodySnippet || evidence).toLowerCase();
  const headers = input.responseHeaders || {};

  // SQL Injection
  if (title.includes("sql") || title.includes("sqli")) {
    const sqlErrors = [
      "syntax error in sql statement",
      "you have an error in your sql syntax",
      "warning: mysql",
      "unclosed quotation mark after the character string",
      "pg_query(): query failed",
      "ora-00933",
      "sqlite3::sqlexception",
    ];
    const hasSqlError = sqlErrors.some((err) => body.includes(err));
    if (hasSqlError) {
      return {
        status: "Confirmed",
        confidenceScore: 95,
        hypothesis: "Direct SQL syntax error reflection confirms backend database query interpolation.",
        actualObservation: "Observed distinct database error message directly reflected in HTTP response body.",
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 500)),
        contradictingEvidence: "None. Backend error leakage proves unparameterized query execution.",
        recommendedRemediation: "Utilize parameterized prepared statements or ORM binding. Never concatenate user input directly into queries.",
        suggestedRetestCommand: `curl -s -i "${input.affectedAsset}?id=1%27"`,
      };
    }
    return {
      status: "Potential",
      confidenceScore: 50,
      hypothesis: "Heuristic scanner flagged SQL injection, but response body lacks distinct SQL syntax errors.",
      actualObservation: "No database driver exception strings detected in response payload.",
      supportingEvidence: "Scanner anomaly or differential timing.",
      contradictingEvidence: "HTTP response code did not yield a 500 database error.",
      recommendedRemediation: "Perform time-based or out-of-band blind SQL injection testing in a controlled staging lab.",
      suggestedRetestCommand: `curl -s -i "${input.affectedAsset}?id=1%20WAITFOR%20DELAY%20'0:0:5'"`,
    };
  }

  // Cross-Site Scripting (XSS)
  if (title.includes("xss") || title.includes("cross-site script")) {
    const rawEv = input.rawEvidence || "";
    const hasUnencodedTag = /<script\b[^>]*>|onerror\s*=|onload\s*=|javascript:/i.test(rawEv);
    const hasHtmlContentType = Object.entries(headers).some(
      ([k, v]) => k.toLowerCase() === "content-type" && v.toLowerCase().includes("text/html")
    );

    if (hasUnencodedTag && (hasHtmlContentType || body.includes("<script>"))) {
      return {
        status: "Confirmed",
        confidenceScore: 92,
        hypothesis: "Reflected payload contains raw unescaped HTML/JavaScript tags executable in DOM context.",
        actualObservation: "Observed unencoded script or inline event handler in HTML response.",
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 400)),
        contradictingEvidence: "None. Response lacks Content-Security-Policy or context-aware entity encoding.",
        recommendedRemediation: "Apply context-aware HTML/JavaScript entity encoding and enforce a strict Content-Security-Policy: script-src 'self'.",
        suggestedRetestCommand: `curl -s "${input.affectedAsset}?q=<script>alert(1)</script>" | grep -i "<script>"`,
      };
    }
    return {
      status: "Needs Manual Review",
      confidenceScore: 55,
      hypothesis: "Scanner detected reflection, but payload appears encoded or is returned in JSON/plain-text context.",
      actualObservation: "Reflection observed, but browser may not parse content as executable HTML markup.",
      supportingEvidence: "Payload appears in non-HTML MIME type or with partial sanitization.",
      contradictingEvidence: "Content-Type header is application/json or characters are entity-encoded.",
      recommendedRemediation: "Verify whether the application serves this parameter with Content-Type: application/json and X-Content-Type-Options: nosniff.",
      suggestedRetestCommand: `curl -s -I "${input.affectedAsset}?q=test"`,
    };
  }

  // Security Headers / CSP
  if (title.includes("csp") || title.includes("content security policy") || title.includes("header")) {
    const cspHeader = Object.entries(headers).find(([k]) => k.toLowerCase() === "content-security-policy");
    if (!cspHeader && (title.includes("csp") || title.includes("missing"))) {
      return {
        status: "Confirmed",
        confidenceScore: 90,
        hypothesis: "Content-Security-Policy HTTP response header is absent from HTTP response.",
        actualObservation: "HTTP response headers do not contain a 'Content-Security-Policy' directive.",
        supportingEvidence: "Target headers inspected; Content-Security-Policy header is missing.",
        contradictingEvidence: "None.",
        recommendedRemediation: "Configure web server or reverse proxy to serve Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'.",
        suggestedRetestCommand: `curl -s -I "${input.affectedAsset}" | grep -i "content-security-policy"`,
      };
    }
  }

  return {
    status: "Likely",
    confidenceScore: 70,
    hypothesis: `Web vulnerability hypothesis for ${input.findingTitle}.`,
    actualObservation: "Automated web audit observed potential vulnerability pattern.",
    supportingEvidence: sanitizeEvidence(evidence.slice(0, 300)),
    contradictingEvidence: "Requires targeted active probe to confirm exploitability.",
    recommendedRemediation: "Review web server and application configuration against OWASP Web Security Testing Guide v4.2.",
    suggestedRetestCommand: `curl -s -i "${input.affectedAsset}"`,
  };
}

// =========================================================================
// 2. API SECURITY VALIDATION RULES
// =========================================================================
export function validateApiFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = input.rawEvidence || "";
  const body = (input.responseBodySnippet || evidence).toLowerCase();

  // BOLA / IDOR (Broken Object Level Authorization)
  if (title.includes("bola") || title.includes("idor") || title.includes("object level")) {
    const hasObjectAccess = body.includes("account_id") || body.includes("user_id") || body.includes("email") || body.includes("balance");
    if (hasObjectAccess && (input.observedStatus === 200 || evidence.includes("200 OK"))) {
      return {
        status: "Confirmed",
        confidenceScore: 94,
        hypothesis: "Endpoint yields sensitive foreign object data when accessed using distinct non-owner identity credentials.",
        actualObservation: "HTTP 200 OK received with full account object payload containing sensitive identifiers.",
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 400)),
        contradictingEvidence: "None. Backend authorization filter did not validate record ownership prior to serving data.",
        recommendedRemediation: "Implement robust server-side ownership checks: verify currently authenticated user session owns the requested object record before returning it.",
        suggestedRetestCommand: `curl -s -H "Authorization: Bearer [TOKEN_USER_B]" "${input.affectedAsset}/records/USER_A_ID"`,
      };
    }
    return {
      status: "Needs Manual Review",
      confidenceScore: 60,
      hypothesis: "Potential BOLA/IDOR flagged, but multi-user credential validation is required to ensure data belongs to another tenant.",
      actualObservation: "Endpoint accepts variable numerical or UUID path parameters.",
      supportingEvidence: "Parameter manipulation accepted without immediately returning 403 Forbidden.",
      contradictingEvidence: "Data returned may be public or tenant-isolated.",
      recommendedRemediation: "Execute dual-token matrix verification in an authorized test environment with two separate user accounts.",
      suggestedRetestCommand: `curl -s -I -H "Authorization: Bearer [TOKEN_USER_B]" "${input.affectedAsset}/1024"`,
    };
  }

  // Excessive Data Exposure
  if (title.includes("excessive") || title.includes("exposure") || title.includes("pii") || title.includes("password_hash")) {
    const sensitiveKeys = ["password_hash", "salt", "secret", "private_key", "ssn", "credit_card", "cvv", "api_key"];
    const matchedKey = sensitiveKeys.find((k) => body.includes(k));
    if (matchedKey) {
      return {
        status: "Confirmed",
        confidenceScore: 96,
        hypothesis: `API endpoint leaks sensitive backend data field '${matchedKey}' in serialized JSON response.`,
        actualObservation: `Detected sensitive key '${matchedKey}' directly exposed in response body.`,
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 400)),
        contradictingEvidence: "None. Sensitive fields should never be transmitted to client frontend.",
        recommendedRemediation: "Implement response Data Transfer Objects (DTOs) or field-filtering serializers. Strip internal data attributes prior to JSON serialization.",
        suggestedRetestCommand: `curl -s "${input.affectedAsset}" | grep -i "${matchedKey}"`,
      };
    }
  }

  // Rate Limiting
  if (title.includes("rate limit") || title.includes("throttle") || title.includes("burst")) {
    if (evidence.includes("429 Too Many Requests") || headersMatch(input.responseHeaders, "retry-after")) {
      return {
        status: "False Positive",
        confidenceScore: 90,
        hypothesis: "Rate limiting is active and returned HTTP 429 Too Many Requests.",
        actualObservation: "Endpoint properly throttles high-frequency requests with HTTP 429 response.",
        supportingEvidence: "HTTP 429 and Retry-After header detected during burst audit.",
        contradictingEvidence: "Application correctly protects against denial of service and brute force.",
        recommendedRemediation: "Maintain existing rate-limiting thresholds and ensure IP-spoofing via X-Forwarded-For is prevented at the gateway.",
        suggestedRetestCommand: `for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" "${input.affectedAsset}"; done`,
      };
    } else {
      return {
        status: "Likely",
        confidenceScore: 75,
        hypothesis: "Endpoint allowed rapid consecutive requests without triggering HTTP 429 or throttling headers.",
        actualObservation: "No rate limit headers (X-RateLimit-Remaining) or throttling status codes observed.",
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 300)),
        contradictingEvidence: "Application may have higher enterprise quota thresholds or downstream WAF.",
        recommendedRemediation: "Enforce API gateway rate limiting (e.g. Kong, Envoy, or Cloudflare) configured to maximum 100 requests per minute per authenticated client.",
        suggestedRetestCommand: `for i in {1..50}; do curl -s -o /dev/null -w "%{http_code}\n" "${input.affectedAsset}"; done`,
      };
    }
  }

  return {
    status: "Likely",
    confidenceScore: 70,
    hypothesis: `API security verification for ${input.findingTitle}.`,
    actualObservation: "API test observed potential weakness in authorization, schema, or configuration.",
    supportingEvidence: sanitizeEvidence(evidence.slice(0, 300)),
    contradictingEvidence: "Review endpoint OpenAPI / Swagger schema for expected behavior.",
    recommendedRemediation: "Align API architecture with OWASP API Security Top 10 guidelines.",
    suggestedRetestCommand: `curl -s -i "${input.affectedAsset}"`,
  };
}

// =========================================================================
// 3. OPERATING SYSTEM SECURITY VALIDATION RULES
// =========================================================================
export function validateOsFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = input.rawEvidence.toLowerCase();

  // SeImpersonatePrivilege / SeDebugPrivilege (Windows)
  if (title.includes("seimpersonate") || title.includes("sedebug") || title.includes("token privilege")) {
    if (evidence.includes("enabled") || evidence.includes("seimpersonateprivilege")) {
      return {
        status: "Confirmed",
        confidenceScore: 98,
        hypothesis: "Process token holds SeImpersonatePrivilege or SeDebugPrivilege enabled, enabling potential local privilege escalation (e.g. RoguePotato / PrintSpoofer).",
        actualObservation: "Observed active SeImpersonatePrivilege in whoami /priv output.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 400)),
        contradictingEvidence: "None. Service runs with dangerous token privilege.",
        recommendedRemediation: "Run background services under virtual service accounts (NT SERVICE\\) or least-privileged standard user accounts without impersonation privileges.",
        suggestedRetestCommand: "whoami /priv",
      };
    }
  }

  // Unquoted Service Path (Windows)
  if (title.includes("unquoted service") || title.includes("service path")) {
    const hasSpaceAndNoQuote = evidence.includes("program files") && !evidence.includes('"');
    if (hasSpaceAndNoQuote) {
      return {
        status: "Confirmed",
        confidenceScore: 92,
        hypothesis: "Windows service binary path contains spaces and lacks surrounding quotation marks.",
        actualObservation: "Service ImagePath contains unquoted whitespace path susceptible to binary hijacking.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
        contradictingEvidence: "None. Path string matches unquoted path signature.",
        recommendedRemediation: 'Wrap the binary path string in quotation marks in the Windows Registry (HKLM\\SYSTEM\\CurrentControlSet\\Services\\<ServiceName>). Example: "C:\\Program Files\\App\\service.exe"',
        suggestedRetestCommand: `wmic service get name,displayname,pathname,startmode | findstr /i "c:\\" | findstr /i /v """`,
      };
    }
  }

  // Linux SUID Binaries
  if (title.includes("suid") || title.includes("setuid") || title.includes("sudo")) {
    const dangerousSuid = ["/bin/bash", "/bin/sh", "/usr/bin/python", "/usr/bin/find", "/usr/bin/vim", "/usr/bin/nmap"];
    const matched = dangerousSuid.find((bin) => evidence.includes(bin));
    if (matched) {
      return {
        status: "Confirmed",
        confidenceScore: 95,
        hypothesis: `Standard shell or scripting executable ${matched} possesses SUID root bit set, permitting trivial root privilege escalation.`,
        actualObservation: `SUID bit detected on GTFOBins executable: ${matched}`,
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
        contradictingEvidence: "None.",
        recommendedRemediation: `Remove SUID permission bit: chmod u-s ${matched}`,
        suggestedRetestCommand: `find / -perm -4000 -type f 2>/dev/null`,
      };
    }
  }

  return {
    status: "Potential",
    confidenceScore: 65,
    hypothesis: `OS baseline check for ${input.findingTitle}.`,
    actualObservation: "System configuration observation requires privilege inspection.",
    supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
    contradictingEvidence: "Local host permissions and environment factors may restrict exploitation.",
    recommendedRemediation: "Harden operating system according to CIS Operating System Benchmarks.",
    suggestedRetestCommand: "systeminfo",
  };
}

// =========================================================================
// 4. SOFTWARE & APPLICATION SECURITY VALIDATION RULES
// =========================================================================
export function validateSoftwareFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = input.rawEvidence || "";
  const evLower = evidence.toLowerCase();

  // Insecure Deserialization / Code Execution
  if (title.includes("deserialization") || title.includes("pickle") || title.includes("eval")) {
    if (evLower.includes("pickle.loads") || evLower.includes("eval(") || evLower.includes("yaml.load(")) {
      return {
        status: "Confirmed",
        confidenceScore: 95,
        hypothesis: "Direct invocation of unsafe deserialization function with user-controlled input stream.",
        actualObservation: "Detected dangerous function invocation in source code or stack trace.",
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 400)),
        contradictingEvidence: "None. Functions execute arbitrary bytecode/code during unpacking.",
        recommendedRemediation: "Replace binary serialization with safe structured formats (JSON, Protocol Buffers). Use yaml.safe_load() instead of yaml.load().",
        suggestedRetestCommand: "grep -rnE '(pickle\\.loads|yaml\\.load\\(|eval\\()' ./src",
      };
    }
  }

  // Hardcoded Secrets
  if (title.includes("secret") || title.includes("hardcoded") || title.includes("api key") || title.includes("private key")) {
    const hasSecretPattern = /AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16}|-----BEGIN PRIVATE KEY-----/i.test(evidence);
    if (hasSecretPattern) {
      return {
        status: "Confirmed",
        confidenceScore: 99,
        hypothesis: "High-entropy secret key or cryptographic private key directly embedded in source repository.",
        actualObservation: "Observed known cloud provider API key or PEM certificate header pattern in code repository.",
        supportingEvidence: sanitizeEvidence(evidence.slice(0, 300)),
        contradictingEvidence: "None. Secrets in version control are permanently exposed.",
        recommendedRemediation: "Immediately revoke and rotate the exposed credential. Store secrets in environment variables or an enterprise secret manager (Vault, AWS Secrets Manager).",
        suggestedRetestCommand: "gitleaks detect --source . -v",
      };
    }
  }

  // Vulnerable Dependency / SCA
  if (title.includes("cve-") || title.includes("dependency") || title.includes("vulnerable package")) {
    return {
      status: "Likely",
      confidenceScore: 80,
      hypothesis: `Third-party dependency flagged with documented vulnerability.`,
      actualObservation: "Package manifest specifies a version with a known published security advisory.",
      supportingEvidence: sanitizeEvidence(evidence.slice(0, 300)),
      contradictingEvidence: "Vulnerable function code may not be reachable or invoked in this application workflow.",
      recommendedRemediation: "Upgrade the vulnerable library to the latest patched semantic version in package.json / pom.xml / requirements.txt.",
      suggestedRetestCommand: "npm audit || pip-audit",
    };
  }

  return {
    status: "Potential",
    confidenceScore: 60,
    hypothesis: `Static code or application security rule evaluation for ${input.findingTitle}.`,
    actualObservation: "Static analysis rule pattern matched in source code.",
    supportingEvidence: sanitizeEvidence(evidence.slice(0, 300)),
    contradictingEvidence: "Manual code review required to verify reachability and data flow taint.",
    recommendedRemediation: "Review code flow with application development team and apply OWASP Secure Coding Practices.",
    suggestedRetestCommand: "semgrep --config=auto .",
  };
}

// =========================================================================
// 5. ANDROID APPLICATION SECURITY VALIDATION RULES
// =========================================================================
export function validateAndroidFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const manifest = (input.rawEvidence || "").toLowerCase();

  // Exported Components without Permissions
  if (title.includes("exported") || title.includes("component") || title.includes("activity") || title.includes("provider")) {
    if (manifest.includes('android:exported="true"') && !manifest.includes("android:permission=")) {
      return {
        status: "Confirmed",
        confidenceScore: 94,
        hypothesis: "Android application component is explicitly exported to third-party applications without requiring an access permission.",
        actualObservation: "AndroidManifest.xml contains exported=true without android:permission guard attribute.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 400)),
        contradictingEvidence: "None. Any application installed on the device can launch or query this component.",
        recommendedRemediation: 'Set android:exported="false" unless the component is intentionally exposed. If external access is required, guard it with a signature-level android:permission.',
        suggestedRetestCommand: "adb shell am start -n com.app/.TargetActivity",
      };
    }
  }

  // Debuggable Flag Enabled
  if (title.includes("debuggable")) {
    if (manifest.includes('android:debuggable="true"')) {
      return {
        status: "Confirmed",
        confidenceScore: 98,
        hypothesis: "Application binary built with android:debuggable='true', allowing JDWP debugger attachment and memory dumping.",
        actualObservation: "android:debuggable='true' verified in AndroidManifest.xml application element.",
        supportingEvidence: 'android:debuggable="true"',
        contradictingEvidence: "None.",
        recommendedRemediation: "Disable debugging in release builds: set android:debuggable='false' in release build variant configuration.",
        suggestedRetestCommand: "aapt dump badging app-release.apk | grep debuggable",
      };
    }
  }

  // Insecure Cleartext Traffic Allowed
  if (title.includes("cleartext") || title.includes("traffic") || title.includes("http")) {
    if (manifest.includes('android:usescleartexttraffic="true"')) {
      return {
        status: "Confirmed",
        confidenceScore: 91,
        hypothesis: "Application permits unencrypted HTTP network communication, susceptible to adversary Man-In-The-Middle (MITM) eavesdropping.",
        actualObservation: "usesCleartextTraffic='true' found in application manifest.",
        supportingEvidence: 'android:usesCleartextTraffic="true"',
        contradictingEvidence: "None.",
        recommendedRemediation: "Set android:usesCleartextTraffic='false' and implement networkSecurityConfig requiring TLS 1.3.",
        suggestedRetestCommand: "apkanalyzer manifest print app.apk | grep -i cleartext",
      };
    }
  }

  return {
    status: "Potential",
    confidenceScore: 65,
    hypothesis: `Mobile security finding evaluation for ${input.findingTitle}.`,
    actualObservation: "Android audit pattern observed in manifest or decompiled bytecode.",
    supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
    contradictingEvidence: "Dynamic behavior analysis needed to confirm runtime exploitability.",
    recommendedRemediation: "Comply with OWASP Mobile Application Security Verification Standard (MASVS v2.0).",
    suggestedRetestCommand: "jadx -d out app.apk",
  };
}

// =========================================================================
// 6. DESKTOP APPLICATION SECURITY VALIDATION RULES
// =========================================================================
export function validateDesktopFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = (input.rawEvidence || "").toLowerCase();

  // DLL Hijacking / Binary Planting
  if (title.includes("dll") || title.includes("hijack") || title.includes("search order")) {
    if (evidence.includes("writable") || evidence.includes("c:\\users\\") || evidence.includes("temp")) {
      return {
        status: "Confirmed",
        confidenceScore: 90,
        hypothesis: "Desktop executable attempts to load dependent dynamic library from writable local directory before system directory.",
        actualObservation: "Observed missing DLL query in writable application execution folder.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 350)),
        contradictingEvidence: "None. Local adversary can place malicious DLL payload in search path.",
        recommendedRemediation: "Call SetDllDirectory(L\"\") at startup and use absolute paths with LoadLibraryExW using LOAD_LIBRARY_SEARCH_SYSTEM32.",
        suggestedRetestCommand: "procmon /AcceptEula /Quiet (Filter by Result: NAME NOT FOUND on .dll)",
      };
    }
  }

  // Missing ASLR / DEP Protections
  if (title.includes("aslr") || title.includes("dep") || title.includes("safe-seh") || title.includes("mitigation")) {
    if (evidence.includes("dynamicbase: false") || evidence.includes("nxcompat: false") || evidence.includes("aslr disabled")) {
      return {
        status: "Confirmed",
        confidenceScore: 95,
        hypothesis: "Compiled desktop binary lacks modern compiler exploit mitigations (ASLR / DEP).",
        actualObservation: "PE header characteristics show DYNAMIC_BASE or NX_COMPAT flags are omitted.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
        contradictingEvidence: "None. Binary compiled without /DYNAMICBASE or /NXCOMPAT linker flags.",
        recommendedRemediation: "Recompile desktop binary in Visual Studio with /DYNAMICBASE (ASLR), /NXCOMPAT (DEP), and /GS (Buffer Security Check).",
        suggestedRetestCommand: "dumpbin /headers app.exe | findstr /i \"dynamic base nx\"",
      };
    }
  }

  return {
    status: "Likely",
    confidenceScore: 70,
    hypothesis: `Desktop application security posture check for ${input.findingTitle}.`,
    actualObservation: "Desktop security probe identified potential local exploit vulnerability.",
    supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
    contradictingEvidence: "Local system account privileges influence exploitability.",
    recommendedRemediation: "Apply desktop binary hardening and secure local IPC configurations.",
    suggestedRetestCommand: "checksec --file=app.exe",
  };
}

// =========================================================================
// 7. NETWORK SECURITY VALIDATION RULES
// =========================================================================
export function validateNetworkFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = (input.rawEvidence || "").toLowerCase();

  // Cleartext / Insecure Network Protocols (Telnet, FTP, HTTP, SNMP)
  if (title.includes("telnet") || title.includes("ftp") || title.includes("cleartext") || title.includes("snmp")) {
    const isCleartextPort = [21, 23, 69, 161].some((p) => input.affectedAsset.includes(`:${p}`) || evidence.includes(`port ${p}`));
    if (isCleartextPort || evidence.includes("telnet") || evidence.includes("vsftpd")) {
      return {
        status: "Confirmed",
        confidenceScore: 96,
        hypothesis: "Cleartext legacy management or file transfer protocol exposed over network perimeter.",
        actualObservation: "Network port active and responsive to unencrypted protocol handshake.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
        contradictingEvidence: "None. Protocol transmits passwords and session tokens in plaintext.",
        recommendedRemediation: "Disable legacy unencrypted service. Transition to SSH (port 22) or SFTP/FTPS, and block port at the firewall.",
        suggestedRetestCommand: `nmap -sV -p 21,23,69,161 ${input.affectedAsset.replace(/https?:\/\//, "").split(":")[0]}`,
      };
    }
  }

  // Deprecated TLS Protocols / Weak Ciphers
  if (title.includes("ssl") || title.includes("tls") || title.includes("cipher") || title.includes("sweet32")) {
    const weakCiphers = ["sslv2", "sslv3", "tls 1.0", "tls 1.1", "rc4", "3des", "des-cbc3", "null"];
    const matched = weakCiphers.find((c) => evidence.includes(c));
    if (matched) {
      return {
        status: "Confirmed",
        confidenceScore: 93,
        hypothesis: `Web server / network service negotiates deprecated or vulnerable cipher suite '${matched}'.`,
        actualObservation: `Cryptographic handshake completed using legacy cipher/protocol: ${matched}.`,
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 350)),
        contradictingEvidence: "None.",
        recommendedRemediation: "Disable SSLv3, TLS 1.0, and TLS 1.1 in reverse proxy configuration. Require TLS 1.2 and TLS 1.3 with AEAD cipher suites (e.g. ECDHE-ECDSA-AES128-GCM-SHA256).",
        suggestedRetestCommand: `testssl.sh --protocols --ciphers ${input.affectedAsset}`,
      };
    }
  }

  return {
    status: "Likely",
    confidenceScore: 75,
    hypothesis: `Network perimeter finding evaluation for ${input.findingTitle}.`,
    actualObservation: "Network port scan or service enumeration revealed active listening endpoint.",
    supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
    contradictingEvidence: "Service may be protected by IP allowlists or upstream firewall filters.",
    recommendedRemediation: "Audit network attack surface and restrict ingress to authorized IP ranges.",
    suggestedRetestCommand: `nmap -sT -T4 "${input.affectedAsset}"`,
  };
}

// =========================================================================
// 8. CLOUD SECURITY VALIDATION RULES
// =========================================================================
export function validateCloudFinding(input: CategoryValidationInput): CategoryValidationResult {
  const title = input.findingTitle.toLowerCase();
  const evidence = (input.rawEvidence || "").toLowerCase();

  // Public Storage Bucket (S3 / Blob)
  if (title.includes("s3") || title.includes("bucket") || title.includes("blob") || title.includes("public access")) {
    if (evidence.includes("allusers") || evidence.includes("publicread") || evidence.includes("anonymous") || evidence.includes("200 ok") || evidence.includes('"principal": "*"') || evidence.includes("'principal': '*'")) {
      return {
        status: "Confirmed",
        confidenceScore: 97,
        hypothesis: "Cloud storage bucket policy permits unauthenticated anonymous read or list operations.",
        actualObservation: "Storage container responded to anonymous unauthenticated HTTP GET request with object listing or content.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 350)),
        contradictingEvidence: "None.",
        recommendedRemediation: "Enable AWS S3 Block Public Access (all 4 settings) or Azure Private Endpoint storage container access policy.",
        suggestedRetestCommand: `aws s3 ls s3://target-bucket --no-sign-request`,
      };
    }
  }

  // Overly Permissive IAM Policy (Wildcard Action: *)
  if (title.includes("iam") || title.includes("wildcard") || title.includes("administratoraccess")) {
    if (evidence.includes('"action": "*"') || evidence.includes("'action': '*'") || evidence.includes('"resource": "*"')) {
      return {
        status: "Confirmed",
        confidenceScore: 94,
        hypothesis: "IAM policy grants wildcard permissions ('*') across all cloud resource targets.",
        actualObservation: "Detected Action: * and Resource: * in IAM policy document.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 350)),
        contradictingEvidence: "None. Violates Principle of Least Privilege.",
        recommendedRemediation: "Scope IAM permissions down to only necessary API actions and specific Resource ARNs using AWS IAM Access Analyzer.",
        suggestedRetestCommand: "aws iam get-policy-version --policy-arn <ARN> --version-id v1",
      };
    }
  }

  // Security Group Open to 0.0.0.0/0
  if (title.includes("security group") || title.includes("0.0.0.0/0") || title.includes("ingress")) {
    if (evidence.includes("0.0.0.0/0") && (evidence.includes("22") || evidence.includes("3389") || evidence.includes("5432") || evidence.includes("27017"))) {
      return {
        status: "Confirmed",
        confidenceScore: 95,
        hypothesis: "Cloud security group permits inbound traffic from 0.0.0.0/0 directly to sensitive administration or database ports.",
        actualObservation: "Security group ingress rule allows universal internet access to restricted port.",
        supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
        contradictingEvidence: "None.",
        recommendedRemediation: "Restrict ingress CIDR blocks to corporate VPN gateway IPs or transition to AWS Systems Manager Session Manager / Azure Bastion.",
        suggestedRetestCommand: "aws ec2 describe-security-groups --group-ids <sg-id>",
      };
    }
  }

  return {
    status: "Likely",
    confidenceScore: 72,
    hypothesis: `Cloud posture evaluation for ${input.findingTitle}.`,
    actualObservation: "Cloud configuration audit identified deviation from CIS Cloud Foundations Benchmark.",
    supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
    contradictingEvidence: "Requires correlation with cloud tenant inventory and tags.",
    recommendedRemediation: "Review infrastructure as code (Terraform/CloudFormation) and remediate with automated drift detection.",
    suggestedRetestCommand: "prowler aws",
  };
}

// 9. Controlled Laboratory & Exploit Validation
export function validateLabFinding(input: CategoryValidationInput): CategoryValidationResult {
  const ev = (input.rawEvidence || "").toLowerCase();

  // Safety Gate: Ensure laboratory validation is strictly isolated
  if (ev.includes("session opened") || ev.includes("meterpreter") || ev.includes("exploit completed") || ev.includes("poc confirmed")) {
    return {
      status: "Confirmed",
      confidenceScore: 95,
      hypothesis: "Laboratory proof-of-concept verification succeeded in isolated test environment.",
      actualObservation: "Controlled proof-of-concept confirmed vulnerability in sandbox without weaponization or side effects.",
      supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
      contradictingEvidence: "No production impact observed; verified strictly within authorized test scope.",
      recommendedRemediation: "Apply security patch or configuration update immediately, then re-run isolated verification test.",
      suggestedRetestCommand: "msfconsole -q -x 'check'",
    };
  }

  if (ev.includes("vulnerable") || ev.includes("target appears to be vulnerable") || ev.includes("poc executed")) {
    return {
      status: "Likely",
      confidenceScore: 80,
      hypothesis: "Lab diagnostic indicator shows service matches vulnerable signature.",
      actualObservation: "Remote target returned vulnerable banner or protocol handshake in test harness.",
      supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
      contradictingEvidence: "Dynamic payload delivery was not executed to prevent target instability.",
      recommendedRemediation: "Verify build version and vendor advisory; test remediation in staging sandbox.",
      suggestedRetestCommand: "check target in isolated lab",
    };
  }

  return {
    status: "Potential",
    confidenceScore: 50,
    hypothesis: "Laboratory finding identified; requires explicit operator approval before verification.",
    actualObservation: "Initial vulnerability hypothesis logged in lab assessment workflow.",
    supportingEvidence: sanitizeEvidence(input.rawEvidence.slice(0, 300)),
    contradictingEvidence: "Laboratory safety gates require explicit target confirmation.",
    recommendedRemediation: "Confirm test environment boundaries and apply vendor security hardening.",
    suggestedRetestCommand: "audit lab target",
  };
}

// Master Category Validation Dispatcher
export function dispatchCategoryValidation(
  category: string,
  input: CategoryValidationInput
): CategoryValidationResult {
  switch (category.toLowerCase()) {
    case "web":
      return validateWebFinding(input);
    case "api":
      return validateApiFinding(input);
    case "os":
      return validateOsFinding(input);
    case "software":
      return validateSoftwareFinding(input);
    case "android":
      return validateAndroidFinding(input);
    case "desktop":
      return validateDesktopFinding(input);
    case "network":
      return validateNetworkFinding(input);
    case "cloud":
      return validateCloudFinding(input);
    case "lab":
      return validateLabFinding(input);
    default:
      return validateWebFinding(input);
  }
}

function headersMatch(headers?: Record<string, string>, targetHeader?: string): boolean {
  if (!headers || !targetHeader) return false;
  return Object.keys(headers).some((k) => k.toLowerCase() === targetHeader.toLowerCase());
}
