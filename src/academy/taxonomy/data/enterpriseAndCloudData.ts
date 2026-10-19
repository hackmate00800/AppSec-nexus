import { TaxonomyDomain } from "../types";

export const ENTERPRISE_AND_CLOUD_DOMAIN: TaxonomyDomain = {
  id: "domain-enterprise-cloud",
  title: "Cloud Infrastructure, Containers & Enterprise Identity",
  shortName: "Cloud & Enterprise",
  description: "Cloud security architecture (AWS/Azure/GCP), containerization & Kubernetes cluster security, Active Directory / Kerberos domain engineering, and identity federation (OAuth/OIDC/SAML).",
  category: "systems",
  iconName: "Cloud",
  isBeginnerRecommended: false,
  disciplines: [
    {
      id: "disc-cloud-security",
      title: "Cloud Security Architecture & IAM Governance",
      description: "Shared Responsibility Model, Identity and Access Management (IAM) policies, cloud storage security, and infrastructure configuration auditing.",
      iconName: "CloudLightning",
      phases: [
        {
          id: "phase-cloud-iam-storage",
          phaseNumber: 1,
          title: "Cloud IAM, Least Privilege & Storage Permissions",
          description: "Over-permissive role policies, cross-account access, public cloud bucket exposures, and cloud credential metadata services.",
          subPhases: [
            {
              id: "subphase-cloud-storage-exposure",
              title: "Cloud Storage Bucket Permissions & Exposure Risks",
              description: "Detect misconfigured Access Control Lists (ACLs) and bucket policies exposing sensitive cloud objects to the public internet.",
              topics: [
                {
                  id: "topic-cloud-storage-audit",
                  title: "Auditing S3 / Cloud Storage Access Control & Bucket Policies",
                  description: "Deconstruct how public read/write grants occur on AWS S3, Azure Blob, and Google Cloud Storage, and how to enforce account-level block public access.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 35,
                  technologies: ["AWS S3", "Azure Blob", "GCP Cloud Storage", "IAM Policies"],
                  prerequisites: ["topic-stride-threat-modeling"],
                  learningObjectives: [
                    "Distinguish between Bucket ACLs and IAM Bucket Policies",
                    "Identify dangerous wildcard permissions (e.g., s3:GetObject on Principal: '*')",
                    "Enable account-level S3 Block Public Access and bucket encryption",
                    "Audit cloud storage configurations using read-only CLI commands"
                  ],
                  definition: "Cloud storage exposure occurs when a cloud object storage container (such as an Amazon S3 bucket, Azure Blob container, or Google Cloud Storage bucket) has permissions configured allowing unauthenticated or broadly authenticated public users to read, list, or write objects.",
                  purpose: "Prevent sensitive corporate databases, source code backups, customer PII, and API keys from leaking publicly.",
                  technicalFoundations: "Cloud storage access is evaluated through a union of Identity-Based Policies (IAM user/role), Resource-Based Policies (Bucket Policy), Access Control Lists (legacy ACLs), and organization service control policies (SCPs). A single permissive statement with `\"Principal\": \"*\"` and `\"Effect\": \"Allow\"` overrides default private access.",
                  typesAndSubtypes: [
                    { name: "Public Read Exposure", description: "Unauthenticated internet users can download stored files via HTTP." },
                    { name: "Public List Exposure", description: "Attackers can enumerate all stored file keys using the cloud API." },
                    { name: "Public Write / Upload Exposure", description: "Attackers can upload arbitrary files, potentially hosting malware on the organization's domain." }
                  ],
                  threatModel: "Attacker objective: Exfiltrate database snapshots, proprietary models, or sensitive employee records directly via cloud storage URL.",
                  commonWeaknesses: [
                    "Disabling S3 'Block Public Access' setting to resolve integration issues without understanding risk",
                    "Granting 'AuthenticatedUsers' group access, mistakenly believing it refers only to users in their own company account",
                    "Failing to enforce server-side encryption with customer-managed KMS keys"
                  ],
                  defensiveControls: [
                    "Enable Account-Level 'Block Public Access' across all cloud storage containers",
                    "Enforce TLS in transit via bucket policy condition `\"aws:SecureTransport\": \"true\"`",
                    "Enable CloudTrail data event logging and S3 Object Lock for immutable audit logs"
                  ],
                  assessmentMethodology: "Query cloud resource configuration via native CLI to review bucket policy JSON and public access block status without downloading sensitive payload data.",
                  procedure: {
                    id: "proc-audit-s3-public-access",
                    title: "Auditing S3 Bucket Public Access Block & Policy",
                    summary: "Inspect S3 bucket public access configuration using authorized AWS CLI commands.",
                    prerequisites: ["AWS CLI configured with read-only audit credentials"],
                    safetyPrecautions: ["Read-only configuration query; zero downtime risk"],
                    scopeRequirements: ["Authorized client AWS account ID"],
                    steps: [
                      {
                        stepNumber: 1,
                        title: "Check Public Access Block Configuration",
                        objective: "Verify that all 4 public access block settings are active",
                        readOnly: true,
                        commandOrPayload: "aws s3api get-public-access-block --bucket my-authorized-audit-bucket",
                        explanation: "Retrieves status for BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, and RestrictPublicBuckets.",
                        expectedObservation: "All four attributes set to true.",
                        evidenceCollection: "Save JSON response."
                      }
                    ],
                    validationCriteria: "All 4 Block Public Access parameters must be True to prevent accidental exposure.",
                    falsePositiveAnalysis: "Buckets hosting static public web assets (e.g. documentation sites) are intentionally public; verify asset classification.",
                    severityAndImpact: {
                      severityLevel: "High",
                      businessImpact: "Direct data breach leading to regulatory fines and intellectual property disclosure.",
                      confidentiality: "High",
                      integrity: "Medium",
                      availability: "None"
                    },
                    remediation: {
                      summary: "Enable S3 Block Public Access and restrict bucket policy to specific IAM roles.",
                      codeOrConfigExample: `aws s3api put-public-access-block \\
    --bucket my-authorized-audit-bucket \\
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`,
                      language: "bash",
                      defenseInDepth: [
                        "Deploy AWS Config Rule 's3-bucket-public-read-prohibited' with automated remediation"
                      ]
                    },
                    retestProcedure: {
                      steps: ["Re-run aws s3api get-public-access-block"],
                      passCondition: "JSON reflects all 4 flags set to true.",
                      residualRiskNotes: "Ensure cross-account IAM role assumptions are also audited."
                    },
                    tools: ["aws-cli", "prowler", "cloudsploit"]
                  },
                  references: [
                    { title: "CIS Amazon Web Services Foundations Benchmark", url: "https://www.cisecurity.org/benchmark/amazon_web_services", publisher: "CIS", isOfficial: true },
                    { title: "AWS Security Documentation: Blocking public access to your Amazon S3 storage", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html", publisher: "Standard", isOfficial: true }
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
      id: "disc-container-security",
      title: "Container & Kubernetes Security",
      description: "Docker container isolation boundaries, Linux namespaces/cgroups, rootless containers, and Kubernetes cluster RBAC security.",
      iconName: "Box",
      phases: [
        {
          id: "phase-k8s-pod-security",
          phaseNumber: 1,
          title: "Pod Security & Cluster RBAC",
          description: "Container runtime privileges (privileged: true), hostPath mounts, capabilities, and Kubernetes API admission controllers.",
          subPhases: [
            {
              id: "subphase-container-breakout",
              title: "Privileged Containers & Container Breakout Defenses",
              description: "Examine risks of running containers with --privileged or mounted /var/run/docker.sock and apply Pod Security Standards (Restricted).",
              topics: [
                {
                  id: "topic-k8s-privileged-pod",
                  title: "Container Isolation Primitives & Privileged Container Hazards",
                  description: "Understand how Linux namespaces (PID, NET, MNT) and cgroups provide container isolation, and why --privileged dismantles these boundaries.",
                  skillLevel: "intermediate",
                  estimatedMinutes: 35,
                  technologies: ["Docker", "Kubernetes", "Pod Security Standards", "cgroups", "namespaces"],
                  prerequisites: ["topic-linux-suid-caps"],
                  learningObjectives: [
                    "Explain the role of namespaces, cgroups, and seccomp in container isolation",
                    "Identify why mounting the host Docker socket (/var/run/docker.sock) grants root host access",
                    "Enforce Kubernetes Pod Security Standards (Baseline & Restricted profiles)"
                  ],
                  definition: "Container isolation is a lightweight virtualization mechanism where the host Linux kernel isolates process trees (PID namespace), network interfaces (NET namespace), and mount points (MNT namespace). A privileged container disables these security boundaries, granting the containerized process direct access to host devices.",
                  purpose: "Confine web application compromises inside isolated container sandboxes, preventing lateral access to the underlying container host or cluster node.",
                  technicalFoundations: "Containers are not virtual machines; they share the host kernel. When a container runs with `--privileged`, the container runtime grants all Linux capabilities and disables AppArmor/seccomp profiles. If an attacker gains code execution in a privileged container, they can mount the host's physical disk partition (/dev/sda1) and write files directly to the host's /etc/shadow or cron directories.",
                  typesAndSubtypes: [
                    { name: "Privileged Container (privileged: true)", description: "Kernel capabilities and device isolation disabled." },
                    { name: "Docker Socket Mount (/var/run/docker.sock)", description: "Allows container to issue API commands to create sibling root containers." },
                    { name: "Host Network / PID Sharing", description: "Container inspects host processes and binds host ports directly." }
                  ],
                  threatModel: "Attacker objective: Container breakout to Node compromise, followed by cluster-wide Kubernetes secret theft.",
                  commonWeaknesses: [
                    "Running containers as root (UID 0) inside the Dockerfile without a USER directive",
                    "Mounting /var/run/docker.sock into CI/CD runners without rootless isolation",
                    "Deploying pods without securityContext constraints"
                  ],
                  defensiveControls: [
                    "Kubernetes Pod Security Admission enforcing 'restricted' profile",
                    "Run containers as non-root (USER 10001) with readOnlyRootFilesystem: true",
                    "Drop all default capabilities and add only required ones (drop: ['ALL'])"
                  ],
                  assessmentMethodology: "Inspect Kubernetes manifest YAML files and container runtime configurations for privileged flags and sensitive host volume mounts.",
                  references: [
                    { title: "Kubernetes Documentation: Pod Security Standards", url: "https://kubernetes.io/docs/concepts/security/pod-security-standards/", publisher: "Standard", isOfficial: true },
                    { title: "CIS Kubernetes Benchmark", url: "https://www.cisecurity.org/benchmark/kubernetes", publisher: "CIS", isOfficial: true }
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
