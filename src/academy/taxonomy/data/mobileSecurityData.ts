import { TaxonomyDomain } from "../types";

export const MOBILE_SECURITY_DOMAIN: TaxonomyDomain = {
  id: "domain-mobile-security",
  title: "Mobile Security (Android & iOS Architecture)",
  shortName: "Mobile Security",
  description: "Android and iOS mobile operating system security architectures, application sandboxing, OWASP MASVS controls, IPC component auditing, and reverse-engineering defenses.",
  category: "application",
  iconName: "Smartphone",
  isBeginnerRecommended: false,
  disciplines: [
    {
      id: "disc-android-security",
      title: "Android Operating System & Application Security",
      description: "Android platform security architecture, application sandboxing, AndroidManifest.xml permissions, exported IPC components, and secure keystore storage.",
      iconName: "Shield",
      phases: [
        {
          id: "phase-android-ipc-components",
          phaseNumber: 1,
          title: "Android IPC Components & Attack Surface",
          description: "Activities, Services, Broadcast Receivers, and Content Providers, exported attributes, and Intent manipulation vulnerabilities.",
          subPhases: [
            {
              id: "subphase-exported-components",
              title: "Exported Component Vulnerabilities & Deep Links",
              description: "Audit AndroidManifest.xml for unintentionally exported activities and vulnerable intent filters permitting unauthorized inter-process communication.",
              topics: [
                {
                  id: "topic-exported-activities-intents",
                  title: "Exported Activities, Broadcast Receivers & Intent Redirection",
                  description: "Deconstruct how setting android:exported=\"true\" without custom permissions exposes private app functions to malicious third-party apps on the device.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 40,
                  technologies: ["Android", "APK", "AndroidManifest.xml", "adb", "Intents"],
                  prerequisites: ["topic-osi-model"],
                  learningObjectives: [
                    "Inspect AndroidManifest.xml for exported activities and services",
                    "Understand how malicious third-party apps on Android can send implicit Intents to exported components",
                    "Implement signature-level permissions and android:exported=\"false\" for internal components",
                    "Conduct authorized adb command-line testing on test emulators"
                  ],
                  definition: "Exported component vulnerability occurs when an Android application component (Activity, Service, Receiver, or Provider) has its `android:exported` attribute set to true (or implicit through intent-filters in older SDKs) without requiring appropriate signature or runtime permissions, allowing any other application on the device to launch it.",
                  purpose: "Prevent unauthorized applications installed on the same device from bypassing authentication screens, accessing internal sensitive data, or triggering privileged actions.",
                  technicalFoundations: "The Android security model isolates apps into unique Linux user IDs (UIDs). Inter-App communication relies on Intents passed through the Binder kernel driver. If an Activity that handles sensitive transactions (like PIN reset or authentication token display) is marked exported, any untrusted app can construct an explicit Intent to launch that Activity directly, completely bypassing the preceding login UI.",
                  typesAndSubtypes: [
                    { name: "Exported Activity", description: "UI screen reachable by external apps (e.g. adb shell am start)." },
                    { name: "Exported Broadcast Receiver", description: "Listens for system-wide or custom broadcasts; vulnerable to forged broadcast injection." },
                    { name: "Exported Content Provider", description: "Database interface; vulnerable to SQL injection or unauthorized read/write access." },
                    { name: "Intent Redirection", description: "Component forwards an untrusted Intent to a sensitive unexported internal component." }
                  ],
                  architectureDataFlow: "Malicious App -> Intent {Component: TargetApp/PrivateActivity} -> Binder IPC -> Target App launches PrivateActivity without authentication.",
                  threatModel: "Attacker objective: Unauthorized data retrieval, account takeover, or arbitrary code execution via exported WebView bridge.",
                  commonWeaknesses: [
                    "Omitting explicit android:exported declaration on components containing intent filters",
                    "Exporting diagnostic/debug activities in release production builds",
                    "Failing to validate extra parameters passed inside incoming Intents"
                  ],
                  defensiveControls: [
                    "Set android:exported=\"false\" on all components not intended for public interaction",
                    "Require custom signature permissions (android:protectionLevel=\"signature\") for internal IPC",
                    "Use explicit Intents and validate calling package identity via getCallingPackage()"
                  ],
                  assessmentMethodology: "Decompile the APK using apktool or jadx, inspect AndroidManifest.xml, and test component launching via adb on an authorized test device.",
                  procedure: {
                    id: "proc-audit-android-manifest",
                    title: "Auditing AndroidManifest.xml for Exported Components",
                    summary: "Extract and inspect manifest definitions from an authorized APK to detect unintentionally exported components.",
                    prerequisites: ["apktool or jadx installed", "Authorized test APK"],
                    safetyPrecautions: ["Perform analysis inside isolated sandbox or emulator"],
                    scopeRequirements: ["Client-authorized mobile binary"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Decompile APK Manifest",
                        objective: "Decode binary AndroidManifest.xml into readable XML",
                        readOnly: true,
                        commandOrPayload: "apktool d target_app.apk -o decoded_apk -f --no-src",
                        explanation: "Decodes resources and generates human-readable AndroidManifest.xml in decoded_apk/.",
                        expectedObservation: "Directory decoded_apk created with decoded AndroidManifest.xml.",
                        evidenceCollection: "Copy AndroidManifest.xml to evidence folder."
                      },
                      {
                        stepNumber: 2,
                        title: "Filter for Exported Activities & Providers",
                        objective: "Identify components accessible to third-party applications",
                        readOnly: true,
                        commandOrPayload: "grep -n -C 2 'android:exported=\"true\"' decoded_apk/AndroidManifest.xml",
                        explanation: "Searches for explicit exported declarations across all components.",
                        expectedObservation: "List of exported activity and receiver tags.",
                        evidenceCollection: "Document line numbers and component class names."
                      }
                    ],
                    validationCriteria: "Any sensitive internal activity marked exported without protectionLevel=\"signature\" represents an access control finding.",
                    falsePositiveAnalysis: "Main launcher activities (`android.intent.action.MAIN`) must be exported so the Android OS launcher can start the app. Only non-launcher internal activities represent vulnerabilities.",
                    severityAndImpact: {
                      severityLevel: "High",
                      businessImpact: "Allows local malicious apps on user devices to bypass biometric/PIN screens and exfiltrate user data.",
                      confidentiality: "High",
                      integrity: "High",
                      availability: "None"
                    },
                    remediation: {
                      summary: "Mark internal components android:exported=\"false\" in AndroidManifest.xml.",
                      codeOrConfigExample: `<!-- SECURE CONFIGURATION -->
<activity
    android:name=".ui.AccountDetailsActivity"
    android:exported="false" />

<!-- IF EXPORT IS REQUIRED FOR PARTNER APPS, REQUIRE SIGNATURE PERMISSION -->
<permission
    android:name="com.acme.app.PERMISSION_INTERNAL"
    android:protectionLevel="signature" />

<activity
    android:name=".ui.PartnerIntegrationActivity"
    android:exported="true"
    android:permission="com.acme.app.PERMISSION_INTERNAL" />`,
                      language: "xml",
                      defenseInDepth: [
                        "Verify calling package signature dynamically in code before processing incoming intent data"
                      ]
                    },
                    retestProcedure: {
                      steps: [
                        "Recompile and install patched APK on test emulator",
                        "Attempt to launch component via adb: adb shell am start -n com.acme.app/.ui.AccountDetailsActivity"
                      ],
                      passCondition: "adb returns 'SecurityException: Permission Denial' or component cannot be found.",
                      residualRiskNotes: "Verify deep link handlers also validate URI parameters strictly."
                    },
                    tools: ["apktool", "jadx", "adb", "grep"]
                  },
                  references: [
                    { title: "OWASP Mobile Application Security Verification Standard (MASVS-PLATFORM)", url: "https://mas.owasp.org/MASVS/07-MASVS-PLATFORM/", publisher: "OWASP", isOfficial: true },
                    { title: "Android Developers: App Security Best Practices", url: "https://developer.android.com/privacy-and-security/security-best-practices", publisher: "Android", isOfficial: true }
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
