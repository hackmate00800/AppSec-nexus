import { TaxonomyDomain } from "../types";

export const ETHICAL_HACKING_DOMAIN: TaxonomyDomain = {
  id: "domain-ethical-hacking",
  title: "Ethical Hacking & Penetration Testing Methodologies",
  shortName: "Methodology",
  description: "Standardized 10-phase authorized penetration testing framework covering Rules of Engagement, Reconnaissance, Threat Modeling, Controlled Safe Validation, Severity Scoring, Reporting, and Retesting.",
  category: "operations",
  iconName: "Terminal",
  isBeginnerRecommended: true,
  disciplines: [
    {
      id: "disc-pentest-lifecycle",
      title: "10-Phase Professional Penetration Testing Lifecycle",
      description: "Industry-standard methodology aligned with PTES, NIST SP 800-115, and OWASP WSTG ensuring lawful, reproducible, and non-destructive security assessments.",
      iconName: "ShieldAlert",
      phases: [
        {
          id: "phase-roe-authorization",
          phaseNumber: 1,
          title: "Authorization, Scoping & Rules of Engagement (RoE)",
          description: "Establish legal authority, explicit scope boundaries, out-of-bounds assets, permitted testing hours, communication escalation chains, and emergency stop triggers.",
          subPhases: [
            {
              id: "subphase-legal-roe",
              title: "Legal Authorization & Scoping Contracts",
              description: "Written consent requirements, CFAA / Computer Misuse Act safe harbor provisions, third-party cloud provider notification, and rate limit boundaries.",
              topics: [
                {
                  id: "topic-roe-scoping-contract",
                  title: "Rules of Engagement (RoE) Document & Scope Boundary Enforcement",
                  description: "Structure a legally binding Rules of Engagement document that defines authorized target URLs, IP CIDR ranges, excluded critical infrastructure, and emergency contact procedures.",
                  skillLevel: "beginner",
                  estimatedMinutes: 30,
                  technologies: ["Legal Authorization", "Scope Governance", "SSRF Safe Harbor"],
                  prerequisites: ["topic-stride-threat-modeling"],
                  learningObjectives: [
                    "Draft an industry-standard Rules of Engagement (RoE) agreement",
                    "Define explicit in-scope and out-of-scope assets with precision",
                    "Establish emergency stop triggers and notification channels for critical findings"
                  ],
                  definition: "The Rules of Engagement (RoE) is a formal, legally binding document executed between an authorized security assessment team and an asset owner, delineating the exact boundaries, permissions, schedule, technical constraints, and emergency escalation paths of a security assessment.",
                  purpose: "Protects security professionals and organizations from criminal liability, prevents accidental disruption of production operations, and establishes clear ground rules for non-destructive testing.",
                  technicalFoundations: "Without explicit written authorization signed by a corporate officer with legal authority over the computing assets, scanning or probing computer networks violates cybercrime statutes (e.g. US Computer Fraud and Abuse Act 18 U.S.C. § 1030, UK Computer Misuse Act 1990). The RoE establishes legal safe harbor by defining authorized actions, testing windows, originating IP addresses, and excluded third-party services.",
                  typesAndSubtypes: [
                    { name: "In-Scope Assets", description: "Explicit list of domain names, CIDR IP ranges, API endpoints, or mobile applications authorized for testing." },
                    { name: "Out-of-Scope Assets", description: "Third-party payment gateways, shared cloud infrastructure, production databases, and physical office premises explicitly forbidden from testing." },
                    { name: "Emergency Stop Condition", description: "Predefined event (e.g. unexpected service disruption, database corruption, or discovery of active third-party breach) requiring immediate testing cessation." }
                  ],
                  threatModel: "Risk: Unauthorized testing leading to legal prosecution, accidental disruption of production availability, or exposure of non-authorized third-party tenant data.",
                  commonWeaknesses: [
                    "Testing domains hosted on shared infrastructure without verifying domain IP boundaries",
                    "Failing to document emergency escalation phone numbers for 24/7 incident responders",
                    "Allowing automated scanners to spider external links pointing to unapproved third-party vendors"
                  ],
                  defensiveControls: [
                    "AppSec Nexus ScopeValidator with regex host filters and SSRF loopback protections",
                    "Dedicated testing environments / non-production staging mirrors with anonymized test data",
                    "Mutual non-disclosure agreements (NDAs) and liability limitation clauses"
                  ],
                  assessmentMethodology: "Verify that all target URLs match the authorized RoE document prior to initiating baseline scans or manual testing.",
                  procedure: {
                    id: "proc-verify-scope-bounds",
                    title: "Pre-Assessment Scope Verification Checklist",
                    summary: "Perform pre-flight verification to confirm that targets resolve to authorized IP ranges and do not traverse third-party boundaries.",
                    prerequisites: ["Executed RoE signed by client"],
                    safetyPrecautions: ["No scan traffic until checklist verification is complete"],
                    scopeRequirements: ["Target hostname in RoE scope"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "DNS Resolution & IP Ownership Check",
                        objective: "Verify target hostname resolves to client-owned IP or authorized cloud tenant",
                        readOnly: true,
                        commandOrPayload: "nslookup api.acme.corp",
                        explanation: "Resolves the target domain to its primary IPv4 address.",
                        expectedObservation: "A valid IP address within the authorized CIDR range specified in the RoE.",
                        evidenceCollection: "Save DNS resolution transcript with timestamp."
                      },
                      {
                        stepNumber: 2,
                        title: "Configure Scope Whitelist in AppSec Nexus",
                        objective: "Lock platform scanner to authorized domain and subpaths",
                        readOnly: true,
                        commandOrPayload: "Set allowed_hosts: [\"api.acme.corp\"], allowed_ports: [443], excluded_paths: [\"/logout\", \"/admin/delete\"]",
                        explanation: "Enforces strict client-side and backend ScopeValidator checks on all outgoing requests.",
                        expectedObservation: "Target scope badge reflects 'Protected Scope' in UI.",
                        evidenceCollection: "Screenshot of Target configuration."
                      }
                    ],
                    validationCriteria: "Target hostname and resolved IP address precisely match the signed RoE exhibit.",
                    falsePositiveAnalysis: "Content Delivery Networks (CDNs) like Cloudflare or Akamai return shared CDN anycast IPs; verify that testing agreement explicitly covers CDN-fronted hosts.",
                    severityAndImpact: {
                      severityLevel: "Info",
                      businessImpact: "Essential compliance control ensuring ethical and legal safety.",
                      confidentiality: "None",
                      integrity: "None",
                      availability: "None"
                    },
                    remediation: {
                      summary: "Maintain signed copies of all RoE documents for 3 years following assessment completion.",
                      defenseInDepth: ["Automate pre-flight scope validation in scanning tooling"]
                    },
                    retestProcedure: {
                      steps: ["Re-verify scope configuration prior to each testing phase"],
                      passCondition: "All requested URLs match whitelist.",
                      residualRiskNotes: "Cloud auto-scaling can shift IP addresses; rely on authoritative hostnames where possible."
                    },
                    tools: ["nslookup", "dig", "AppSec Nexus ScopeValidator"]
                  },
                  references: [
                    { title: "NIST SP 800-115: Technical Guide to Information Security Testing and Assessment", url: "https://csrc.nist.gov/publications/detail/sp/800-115/final", publisher: "NIST", isOfficial: true },
                    { title: "Penetration Testing Execution Standard (PTES): Pre-engagement Interactions", url: "http://www.pentest-standard.org/index.php/Pre-engagement", publisher: "Standard", isOfficial: true }
                  ],
                  lastReviewedDate: "2026-10-18"
                }
              ]
            }
          ]
        },
        {
          id: "phase-controlled-validation",
          phaseNumber: 7,
          title: "Controlled Safe Validation & Proof-of-Concept",
          description: "Distinguish automated candidate alerts from confirmed true positives using non-destructive, minimal-evidence validation techniques.",
          subPhases: [
            {
              id: "subphase-safe-poc",
              title: "Safe Evidence Capture & Non-Destructive Proofs",
              description: "Principles of demonstrating exploitability without data corruption, denial of service, or unauthorized exposure of real customer records.",
              topics: [
                {
                  id: "topic-non-destructive-poc",
                  title: "Non-Destructive Validation & Minimum Necessary Evidence",
                  description: "Learn how to confirm vulnerability presence while strictly adhering to the principle of least disruption and minimal data exposure.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 35,
                  technologies: ["Proof of Concept", "Evidence Handling", "Vulnerability Validation"],
                  prerequisites: ["topic-roe-scoping-contract"],
                  learningObjectives: [
                    "Distinguish between harmless proof-of-concept indicators and destructive exploitation",
                    "Apply the Principle of Minimum Necessary Evidence (e.g., retrieving whoami or id instead of dumping entire shadow file)",
                    "Document precise preconditions, observations, and timestamps for remediation verification"
                  ],
                  definition: "Controlled safe validation is the practice of confirming the existence and real-world exploitability of a vulnerability by demonstrating a reliable, minimal proof-of-concept that causes zero data destruction, preserves system availability, and captures only the evidence required for engineers to remediate.",
                  purpose: "Eliminates false positives from scanner reports without exposing the organization to accidental downtime or operational damage.",
                  technicalFoundations: "Automated vulnerability scanners rely on heuristic pattern matching, resulting in frequent false positives. Security analysts must validate findings. In ethical testing, validation must stop at the exact threshold where exploitability is proven: for Command Injection, executing `whoami` or `hostname`; for SQLi, demonstrating arithmetic balance `2 = (1+1)`; for SSRF, requesting an isolated DNS callback or internal health check.",
                  typesAndSubtypes: [
                    { name: "Syntax Proof", description: "Demonstrating that parser structure is altered without executing payloads." },
                    { name: "Read-Only Proof", description: "Querying unprivileged non-sensitive environment metadata (e.g. system date or host architecture)." },
                    { name: "Out-of-Band (OOB) Canary", description: "Triggering a controlled DNS or HTTP callback to a designated auditor-controlled listener." }
                  ],
                  threatModel: "Risk: Tester uses aggressive automated exploit scripts that crash a production database or inadvertently write test data into customer account balances.",
                  commonWeaknesses: [
                    "Using default destructive payloads found online (e.g. rm -rf or DROP DATABASE)",
                    "Downloading entire production database tables when verifying a single column is vulnerable",
                    "Failing to clean up temporary test records created during proof-of-concept execution"
                  ],
                  defensiveControls: [
                    "AppSec Nexus Validation Engine with strict non-destructive probe constraints",
                    "Isolated test tenant environments",
                    "Real-time database transaction rollbacks during automated validation runs"
                  ],
                  assessmentMethodology: "Define expected observation before executing validation probe; immediately record timestamp, request headers, response payload, and stop testing upon confirmation.",
                  references: [
                    { title: "OWASP WSTG: Conducting Penetration Tests Safely", url: "https://owasp.org/www-project-web-security-testing-guide/", publisher: "OWASP", isOfficial: true },
                    { title: "PTES: Reporting and Threat Modeling Protocols", url: "http://www.pentest-standard.org/", publisher: "Standard", isOfficial: true }
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
