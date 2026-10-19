import { TaxonomyDomain } from "../types";

export const SYSTEMS_SECURITY_DOMAIN: TaxonomyDomain = {
  id: "domain-systems-security",
  title: "Operating Systems & Host Security (Windows & Linux)",
  shortName: "Systems Security",
  description: "Comprehensive architectural security, privilege models, kernel hardening, vulnerability taxonomies, and host assessment procedures for Windows and Linux environments.",
  category: "systems",
  iconName: "Server",
  isBeginnerRecommended: true,
  disciplines: [
    {
      id: "disc-windows-security",
      title: "Windows Security Architecture, Hardening & Vulnerabilities",
      description: "NTFS security descriptors, User Account Control (UAC), Active Directory / Kerberos authentication, security baselines, and Windows vulnerability assessment.",
      iconName: "Monitor",
      phases: [
        {
          id: "phase-win-identity-access",
          phaseNumber: 1,
          title: "Windows Identity, Access Control & Privilege Management",
          description: "Access Control Lists (DACLs/SACLs), security identifiers (SIDs), access tokens, UAC virtualization, and local privilege boundaries.",
          subPhases: [
            {
              id: "subphase-win-privileges",
              title: "User Account Control & Token Privileges",
              description: "Filtered administrative tokens, elevation triggers, integrity levels (High vs Medium vs Low), and privilege assignments (SeDebugPrivilege, SeImpersonatePrivilege).",
              topics: [
                {
                  id: "topic-win-token-privileges",
                  title: "Windows Access Tokens, Integrity Levels & Sensitive Privileges",
                  description: "Deconstruct how Windows processes inherit security tokens, how Integrity Levels restrict cross-process communication, and how sensitive privileges can be audited.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 40,
                  technologies: ["Windows API", "Access Tokens", "PowerShell", "whoami"],
                  prerequisites: ["topic-cpu-rings-memory"],
                  learningObjectives: [
                    "Inspect user token privileges and group memberships via whoami /priv and whoami /groups",
                    "Understand Mandatory Integrity Control (MIC) and UIPI message isolation",
                    "Identify high-risk privileges: SeImpersonatePrivilege, SeAssignPrimaryTokenPrivilege, SeBackupPrivilege",
                    "Configure security policies to restrict sensitive privilege delegation to service accounts"
                  ],
                  definition: "A Windows access token is an internal operating system object that describes the security context of a process or thread, including the user's Security Identifier (SID), group SIDs, assigned user privileges, and Mandatory Integrity Level.",
                  purpose: "Determines whether a thread is authorized to open handles to securable objects (files, registry keys, named pipes, processes) and execute restricted system tasks.",
                  technicalFoundations: "When a user logs on, the Local Security Authority Subsystem Service (LSASS) validates credentials and creates an initial logon session with an access token. By default, members of the Administrators group receive a 'filtered token' with administrative privileges stripped and Medium Integrity Level. Running 'Run as Administrator' triggers UAC to launch the process with the unrestricted token at High Integrity Level.",
                  typesAndSubtypes: [
                    { name: "Primary Token", description: "Created by executive subsystem; assigned to a process representing its default identity." },
                    { name: "Impersonation Token", description: "Assigned to a specific thread to temporarily act on behalf of another client security context." },
                    { name: "Integrity Levels", description: "Untrusted (0x0000), Low (0x1000), Medium (0x2000), High (0x3000), System (0x4000)." }
                  ],
                  threatModel: "Attacker objective: Token manipulation or potato-style privilege escalation (e.g. JuicyPotato / PrintSpoofer) leveraging SeImpersonatePrivilege on local service accounts.",
                  commonWeaknesses: [
                    "Leaving SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege enabled on internet-facing web server service accounts",
                    "Disabling UAC or setting 'Never Notify' enabling silent background administrative process execution"
                  ],
                  defensiveControls: [
                    "Virtual Service Accounts / Group Managed Service Accounts (gMSA) with minimum required rights",
                    "Enforce UAC 'Always Notify' setting",
                    "Deploy Windows Defender Credential Guard to isolate LSASS memory using virtualization-based security (VBS)"
                  ],
                  assessmentMethodology: "Execute read-only token queries in standard PowerShell/cmd sessions without attempting unauthorized token duplication.",
                  procedure: {
                    id: "proc-audit-win-privs",
                    title: "Auditing Windows Account Privileges and Integrity Level",
                    summary: "Inspect the current session's security identifiers, privilege table, and integrity level using standard administrative utilities.",
                    prerequisites: ["Local Windows user terminal"],
                    safetyPrecautions: ["Read-only command; zero system risk"],
                    scopeRequirements: ["Authorized local audit machine"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Query Assigned Privileges",
                        objective: "Check active privileges in current process token",
                        readOnly: true,
                        commandOrPayload: "whoami /priv",
                        explanation: "Enumerates all privileges assigned to the current access token and their state (Enabled or Disabled).",
                        expectedObservation: "Table listing Privilege Name, Description, and State (e.g., SeChangeNotifyPrivilege).",
                        evidenceCollection: "Save terminal output."
                      },
                      {
                        stepNumber: 2,
                        title: "Query Integrity Level & Group SIDs",
                        objective: "Verify whether token is running at High, Medium, or Low integrity",
                        readOnly: true,
                        commandOrPayload: "whoami /groups | findstr /i \"Integrity Label Level\"",
                        explanation: "Filters the groups table to display the Mandatory Label (e.g. 'Mandatory Label\\High Mandatory Level').",
                        expectedObservation: "Mandatory Label displaying Medium or High Integrity.",
                        evidenceCollection: "Record integrity level in audit notes."
                      }
                    ],
                    validationCriteria: "Token privilege table accurately documented; high-risk privileges flagged for least-privilege review.",
                    falsePositiveAnalysis: "Privileges marked 'Disabled' can still be programmatically enabled by the process if listed in the token.",
                    severityAndImpact: {
                      severityLevel: "Medium",
                      businessImpact: "Excessive privileges assigned to service accounts facilitate immediate lateral movement or local privilege escalation upon initial breach.",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "High"
                    },
                    remediation: {
                      summary: "Remove unnecessary user rights assignments via Local Security Policy (secpol.msc) -> User Rights Assignment.",
                      codeOrConfigExample: "secpol.msc -> Local Policies -> User Rights Assignment -> Remove unneeded service accounts from 'Impersonate a client after authentication'",
                      defenseInDepth: [
                        "Enable Credential Guard to protect NTLM and Kerberos ticket material in memory"
                      ]
                    },
                    retestProcedure: {
                      steps: ["Re-log in as service account and re-run whoami /priv"],
                      passCondition: "High-risk privileges are absent from the returned privilege list.",
                      residualRiskNotes: "Certain built-in Windows services require specific privileges to function; always test service restarts."
                    },
                    tools: ["whoami", "PowerShell", "secpol.msc"]
                  },
                  references: [
                    { title: "Microsoft Learn: Access Tokens and Security Context", url: "https://learn.microsoft.com/en-us/windows/win32/secauthz/access-tokens", publisher: "Microsoft", isOfficial: true },
                    { title: "CIS Microsoft Windows 11 Enterprise Benchmark", url: "https://www.cisecurity.org/benchmark/microsoft_windows_desktop", publisher: "CIS", isOfficial: true }
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
      id: "disc-linux-security",
      title: "Linux Security Architecture, Hardening & Auditing",
      description: "Linux kernel permissions, POSIX ACLs, Linux capabilities, systemd isolation, SSH hardening, and security assessment methodologies.",
      iconName: "Terminal",
      phases: [
        {
          id: "phase-linux-permissions",
          phaseNumber: 1,
          title: "Linux Permissions, Ownership & Capabilities",
          description: "Standard permissions (rwx), SUID/SGID bits, sticky bits, extended attributes, and fine-grained Linux POSIX capabilities.",
          subPhases: [
            {
              id: "subphase-suid-capabilities",
              title: "SUID Binaries & Linux Capabilities Auditing",
              description: "Detect misconfigured Set-User-ID binaries and dangerous Linux capabilities (e.g. cap_setuid, cap_net_raw, cap_dac_override).",
              topics: [
                {
                  id: "topic-linux-suid-caps",
                  title: "Auditing SUID Files, Capabilities & Privilege Boundaries",
                  description: "Learn how the SUID bit alters execution context to the file owner, how Linux capabilities split root privileges into discrete slices, and how to audit binaries for privilege escalation vectors.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 35,
                  technologies: ["Linux", "SUID", "POSIX Capabilities", "getcap", "find"],
                  prerequisites: ["topic-cpu-rings-memory"],
                  learningObjectives: [
                    "Explain the security function of SUID (chmod u+s) and why it represents a high-risk security boundary",
                    "Understand how Linux Capabilities (CAP_*) replace coarse-grained root permissions",
                    "Audit the filesystem for unauthorized or dangerous SUID binaries using find",
                    "Verify file capabilities using getcap to prevent privilege escalation"
                  ],
                  definition: "SUID (Set User ID upon execution) is a Unix file permission bit that allows a program to execute with the effective privileges of the file's owner (often root) rather than the executing user. Linux Capabilities divide traditional root power into distinct, granular privileges.",
                  purpose: "Enables unprivileged users to execute specific necessary tasks (like changing their password via /usr/bin/passwd or creating ping sockets via cap_net_raw) without granting full unconstrained root access.",
                  technicalFoundations: "When an executable with the SUID bit (octal 4000) is executed, the kernel sets the process's Effective User ID (EUID) to the file owner's UID while preserving the Real User ID (RUID) of the caller. If the executable contains programming flaws (e.g. relative path resolution, arbitrary file read, or shell escapes as cataloged in GTFOBins), unprivileged users can elevate to root.",
                  typesAndSubtypes: [
                    { name: "Standard SUID Binary", description: "Legitimate system utilities (e.g. passwd, su, sudo) requiring elevated permissions." },
                    { name: "Misconfigured SUID Binary", description: "General-purpose utilities (e.g. nmap, vim, find, bash) unintentionally assigned SUID permissions." },
                    { name: "Linux Capability (cap_setuid)", description: "Allows arbitrary manipulation of process UIDs without full root power." },
                    { name: "Linux Capability (cap_dac_override)", description: "Bypasses all file read, write, and execute permission checks." }
                  ],
                  threatModel: "Attacker objective: Local Privilege Escalation (LPE) by executing an unconstrained SUID binary or weaponizing an unsafe capability.",
                  commonWeaknesses: [
                    "Assigning SUID bit to scripting interpreters (e.g. python, bash, perl)",
                    "Custom compiled C binaries lacking drop-privilege logic before executing sub-shells",
                    "Writable SUID binaries allowing modification of executable machine code"
                  ],
                  defensiveControls: [
                    "Mount user-writable partitions (/tmp, /home, /dev/shm) with the 'nosuid' mount option",
                    "Replace SUID binaries with granular Linux capabilities where possible",
                    "Regularly audit the filesystem for unexpected SUID/SGID binaries using automated baselines"
                  ],
                  assessmentMethodology: "Perform read-only filesystem searches for binaries with octal 4000 and query file capabilities without running exploits.",
                  procedure: {
                    id: "proc-audit-suid-capabilities",
                    title: "Auditing SUID Binaries and Capabilities on Linux",
                    summary: "Inspect the filesystem for SUID binaries and extended capabilities using native Linux commands.",
                    prerequisites: ["Standard user terminal access on Linux host"],
                    safetyPrecautions: ["Read-only find command; does not modify permissions"],
                    scopeRequirements: ["Authorized local or VM Linux host"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Enumerate SUID Files on System",
                        objective: "Locate all files owned by root with the SUID bit set",
                        readOnly: true,
                        commandOrPayload: "find / -perm -4000 -user root -type f 2>/dev/null | sort",
                        explanation: "Searches filesystem for files with permission mask -4000 owned by UID 0, suppressing permission errors.",
                        expectedObservation: "Standard system list: /usr/bin/passwd, /usr/bin/sudo, /usr/bin/chfn.",
                        evidenceCollection: "Save list to suid_inventory.txt."
                      },
                      {
                        stepNumber: 2,
                        title: "Enumerate Extended Capabilities",
                        objective: "Identify binaries granted capabilities beyond standard permissions",
                        readOnly: true,
                        commandOrPayload: "getcap -r / 2>/dev/null",
                        explanation: "Recursively queries extended file attributes for capability security descriptors.",
                        expectedObservation: "Legitimate entries like /usr/bin/ping = cap_net_raw+ep.",
                        evidenceCollection: "Save output to capabilities_inventory.txt."
                      }
                    ],
                    validationCriteria: "All listed SUID and capability binaries are compared against standard distribution baselines; unexpected entries flagged.",
                    falsePositiveAnalysis: "Standard distribution utilities like passwd and su are expected to have SUID. Only unexpected binaries (e.g. python, find, curl) represent findings.",
                    severityAndImpact: {
                      severityLevel: "High",
                      businessImpact: "Dangerous SUID binaries grant immediate unprivileged-to-root privilege escalation, resulting in complete host compromise.",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "High"
                    },
                    remediation: {
                      summary: "Remove the SUID bit from non-essential binaries using chmod u-s.",
                      codeOrConfigExample: "# Remove SUID bit:\nchmod u-s /path/to/binary\n\n# Configure nosuid in /etc/fstab for temporary mounts:\n/tmp  ext4  defaults,nosuid,nodev,noexec  0 0",
                      language: "bash",
                      defenseInDepth: [
                        "Enforce AppArmor or SELinux profiles confining binaries regardless of SUID permissions"
                      ]
                    },
                    retestProcedure: {
                      steps: ["Re-run: find /path/to/binary -perm -4000"],
                      passCondition: "Command returns no output; file permissions show standard -rwxr-xr-x.",
                      residualRiskNotes: "Package manager updates can occasionally restore default permissions; incorporate checks into configuration management (Ansible/Puppet)."
                    },
                    tools: ["find", "getcap", "chmod", "setcap"]
                  },
                  references: [
                    { title: "Linux Programmer's Manual: capabilities(7)", url: "https://man7.org/linux/man-pages/man7/capabilities.7.html", publisher: "Linux", isOfficial: true },
                    { title: "CIS Linux Distribution Benchmarks", url: "https://www.cisecurity.org/benchmark/ubuntu_linux", publisher: "CIS", isOfficial: true }
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
