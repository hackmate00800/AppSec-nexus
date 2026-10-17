import { ToolEntry } from "../types";

export const TOOLS_KNOWLEDGE_BASE: ToolEntry[] = [
  // 1. NUCLEI
  {
    id: "tool-nuclei",
    name: "Nuclei (ProjectDiscovery)",
    category: "web_scanner",
    licenseType: "Open Source",
    website: "https://nuclei.projectdiscovery.io/",
    description: "Fast and customizable vulnerability scanner based on simple YAML-based DSL templates. Detects CVEs, misconfigurations, exposed panels, and zero-day signatures across web assets.",
    installationGuide: {
      windows: "winget install ProjectDiscovery.Nuclei  # Or download prebuilt zip from GitHub Releases",
      linux: "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
      packageManager: "brew install nuclei (macOS/Linux) or pacman -S nuclei"
    },
    workflow: [
      "1. Download and sync latest community CVE templates: `nuclei -update-templates`",
      "2. Perform passive enumeration or technology discovery using httpx or crawler.",
      "3. Run targeted CVE template scan against authorized target: `nuclei -u https://target.lab -severity high,critical`",
      "4. Manually verify matches to eliminate false positives before generating the client report."
    ],
    essentialCommands: [
      {
        command: "nuclei -update-templates",
        description: "Sync the latest community-maintained vulnerability and CVE templates.",
        context: "Daily threat feed update"
      },
      {
        command: "nuclei -u https://target.com -severity critical,high",
        description: "Scan a single target filtering only for Critical and High severity vulnerabilities.",
        context: "Targeted web audit"
      },
      {
        command: "nuclei -u https://target.com -t cves/2024/ -rate-limit 150",
        description: "Run 2024 CVE checks while enforcing rate limits to avoid server disruption.",
        context: "Production safe audit"
      },
      {
        command: "nuclei -l targets.txt -o findings.txt -jsonl",
        description: "Scan multiple target URLs from a file and write results in structured JSON Lines format.",
        context: "Bulk automation"
      }
    ],
    outputInterpretation: "Each finding outputs: `[severity] [template-id] [protocol] https://target/path`. Green/Cyan indicates informational or low risk; Yellow indicates Medium; Orange/Red indicates High or Critical exploitable vulnerabilities.",
    limitationsAndFalsePositives: [
      "May flag false positives if edge WAFs or CDNs return 200 OK responses with generic error pages.",
      "Does not deeply crawl complex Single Page Applications (SPAs) or stateful multi-step business logic workflows.",
      "Aggressive scanning rates without `-rate-limit` flags can trigger server rate-limiting or accidental denial of service."
    ],
    integratedInAppSecNexus: true,
    appsecNexusToolId: "nuclei"
  },

  // 2. NMAP
  {
    id: "tool-nmap",
    name: "Nmap (Network Mapper)",
    category: "network",
    licenseType: "Open Source",
    website: "https://nmap.org/",
    description: "The world's standard network discovery and port scanner. Discovers live hosts, open TCP/UDP ports, operating system fingerprints, and running service versions via the Nmap Scripting Engine (NSE).",
    installationGuide: {
      windows: "winget install Insecure.Nmap  # Installs nmap.exe and Npcap packet capture driver",
      linux: "sudo apt install nmap  # Or dnf install nmap",
      packageManager: "brew install nmap"
    },
    workflow: [
      "1. Confirm target IP address is within authorized scope: `nmap -sn 192.168.1.0/24` (Host Discovery)",
      "2. Scan top 1,000 TCP ports: `nmap -sS -T4 target.lab` (SYN Stealth Scan)",
      "3. Perform deep service version detection and default script checks on open ports: `nmap -sV -sC -p 80,443,22 target.lab`",
      "4. Export output in greppable and XML formats for ingestion: `nmap -oA scan_output target.lab`"
    ],
    essentialCommands: [
      {
        command: "nmap -sS -T4 -p 1-1000 target.com",
        description: "Fast TCP SYN stealth scan against top 1000 ports.",
        context: "Initial reconnaissance"
      },
      {
        command: "nmap -sV -sC -p 80,443 target.com",
        description: "Version detection (-sV) and default NSE safety scripts (-sC) against web ports.",
        context: "Service enumeration"
      },
      {
        command: "nmap -p- --min-rate 1000 target.com",
        description: "Scan all 65,535 TCP ports with a minimum packet rate of 1000 packets/sec.",
        context: "Complete port audit"
      },
      {
        command: "nmap --script ssl-enum-ciphers -p 443 target.com",
        description: "Audit TLS cipher suites and flag deprecated SSL 3.0 / TLS 1.0 protocols.",
        context: "TLS security check"
      }
    ],
    outputInterpretation: "Ports are classified as `open` (application listening), `closed` (host returned RST packet), `filtered` (firewall dropped packets without response), or `unfiltered` (host reachable but state undetermined).",
    limitationsAndFalsePositives: [
      "SYN scans require root/Administrator privileges on the local scanning machine to craft raw socket headers.",
      "Stateful firewalls may show all ports as filtered or spoof open ports to confuse automated scanners.",
      "UDP port scanning is significantly slower than TCP due to OS ICMP rate limiting."
    ],
    integratedInAppSecNexus: true,
    appsecNexusToolId: "nmap"
  },

  // 3. HTTPX
  {
    id: "tool-httpx",
    name: "httpx (ProjectDiscovery)",
    category: "recon",
    licenseType: "Open Source",
    website: "https://github.com/projectdiscovery/httpx",
    description: "Fast and multi-purpose HTTP toolkit that allows running multiple probes. Probes web servers for HTTP status codes, titles, technologies, TLS certificates, and redirects across thousands of domains.",
    installationGuide: {
      windows: "winget install ProjectDiscovery.httpx",
      linux: "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
      packageManager: "brew install httpx"
    },
    workflow: [
      "1. Collect subdomains or live IP ranges from reconnaissance.",
      "2. Pipe live targets into httpx to probe for working web interfaces: `cat domains.txt | httpx -title -status-code -tech-detect`",
      "3. Filter responses returning HTTP 200/301/302 for vulnerability scanning.",
      "4. Identify sensitive exposed services (admin dashboards, Grafana, Jenkins, API gateways)."
    ],
    essentialCommands: [
      {
        command: "httpx -u https://target.com -title -tech-detect -status-code",
        description: "Inspect title, web technology stack, and HTTP status code.",
        context: "Single target probing"
      },
      {
        command: "httpx -l domains.txt -ports 80,443,8080,8443 -threads 50",
        description: "Probe multiple web ports across a list of subdomains with 50 worker threads.",
        context: "Attack surface mapping"
      },
      {
        command: "httpx -u https://target.com -sc -cl -ct -location",
        description: "Display Status Code, Content-Length, Content-Type, and Redirect Location.",
        context: "Endpoint fingerprinting"
      }
    ],
    outputInterpretation: "Outputs clean tabular or JSON streams showing which URLs responded, their page title, server header, response size, and detected software frameworks (e.g. `[200] [WordPress, Nginx] https://blog.target.com`).",
    limitationsAndFalsePositives: [
      "Probing thousands of endpoints concurrently can trigger defensive rate-limits or IP bans on target networks.",
      "Does not analyze deep page logic; strictly performs high-throughput HTTP header and banner collection."
    ],
    integratedInAppSecNexus: true,
    appsecNexusToolId: "httpx"
  },

  // 4. OWASP ZAP
  {
    id: "tool-zap",
    name: "OWASP ZAP (Zed Attack Proxy)",
    category: "proxy",
    licenseType: "Open Source",
    website: "https://www.zaproxy.org/",
    description: "The world's most popular free and open-source web application security scanner and intercepting proxy. Maintained by the community and Software Security Project.",
    installationGuide: {
      windows: "winget install OWASP.ZAP  # Or download Windows installer (.exe)",
      linux: "sudo snap install zaproxy --classic",
      packageManager: "brew install --cask zap"
    },
    workflow: [
      "1. Launch ZAP and configure browser proxy to `127.0.0.1:8080` with the ZAP root CA certificate installed.",
      "2. Explore the web application manually to populate the Site Tree with genuine session state.",
      "3. Run the automated Spider to discover hidden links and endpoints.",
      "4. Execute an Active Scan against the scoped site to test for SQLi, XSS, and command injection."
    ],
    essentialCommands: [
      {
        command: "zap.sh -cmd -quickurl https://target.com -quickout report.json",
        description: "Run automated baseline scan in headless CLI mode and export JSON report.",
        context: "CI/CD integration"
      },
      {
        command: "zap-full-scan.py -t https://target.com -r zap_report.html",
        description: "Execute full active scan in Docker container with HTML reporting.",
        context: "Dockerized testing"
      }
    ],
    outputInterpretation: "Categorizes findings into 4 risk flags: High (Red), Medium (Orange), Low (Yellow), and Informational (Blue) with confidence scores (Certain, Firm, Tentative).",
    limitationsAndFalsePositives: [
      "Active scanner can submit forms that create real records or delete data if testing against production databases.",
      "Requires Java (JRE 17+) to run on host systems."
    ],
    integratedInAppSecNexus: true,
    appsecNexusToolId: "zap"
  },

  // 5. BURP SUITE COMMUNITY EDITION
  {
    id: "tool-burpsuite",
    name: "Burp Suite Community Edition (PortSwigger)",
    category: "proxy",
    licenseType: "Community / Free",
    website: "https://portswigger.net/burp/communitydownload",
    description: "The industry-standard interactive intercepting HTTP proxy for manual web application security testing, request tampering, and API analysis.",
    installationGuide: {
      windows: "winget install PortSwigger.BurpSuite.Community",
      linux: "sh burpsuite_community_linux_v*.sh",
      packageManager: "brew install --cask burp-suite"
    },
    workflow: [
      "1. Launch Burp Proxy and start the built-in Chromium browser (no certificate setup required).",
      "2. Toggle 'Intercept is on' in the Proxy tab to pause and inspect HTTP requests in flight.",
      "3. Send interesting requests to Repeater (`Ctrl + R`) to manually modify headers, cookies, and parameters.",
      "4. Use Decoder to encode/decode Base64, URL, Hex, and JWT tokens."
    ],
    essentialCommands: [
      {
        command: "Ctrl + R (Repeater)",
        description: "Send any intercepted request to Repeater for isolated manual payload testing.",
        context: "Manual API verification"
      },
      {
        command: "Ctrl + I (Intruder)",
        description: "Send request to Intruder to configure payload positions for parameter fuzzing.",
        context: "Fuzzing & brute force"
      }
    ],
    outputInterpretation: "Provides raw request and response viewers with side-by-side hexadecimal, render, and header inspections.",
    limitationsAndFalsePositives: [
      "Community Edition intentionally throttles Intruder fuzzing speeds to encourage professional licensing.",
      "Automated active vulnerability scanning is restricted to Burp Suite Professional."
    ],
    integratedInAppSecNexus: false
  },

  // 6. WIRESHARK
  {
    id: "tool-wireshark",
    name: "Wireshark Network Protocol Analyzer",
    category: "network",
    licenseType: "Open Source",
    website: "https://www.wireshark.org/",
    description: "Deep packet inspection tool for capturing and analyzing raw network traffic in real time. Decodes hundreds of protocols and reconstructs TCP streams.",
    installationGuide: {
      windows: "winget install WiresharkFoundation.Wireshark",
      linux: "sudo apt install wireshark tshark",
      packageManager: "brew install --cask wireshark"
    },
    workflow: [
      "1. Select the active network interface (e.g. Ethernet, Wi-Fi).",
      "2. Apply a Capture Filter to limit packet volume: `host 192.168.1.5 and port 80`.",
      "3. Inspect packet headers, identify cleartext credentials or protocol anomalies.",
      "4. Right-click a packet and choose 'Follow > TCP Stream' to read the full bidirectional conversation."
    ],
    essentialCommands: [
      {
        command: "http.request.method == \"POST\"",
        description: "Display filter showing only HTTP POST requests (form submissions, logins).",
        context: "Packet filtering"
      },
      {
        command: "tcp.flags.syn == 1 && tcp.flags.ack == 0",
        description: "Filter showing initial TCP connection initiation packets.",
        context: "SYN flood detection"
      },
      {
        command: "tshark -r capture.pcap -Y \"http\" -T fields -e http.host -e http.request.uri",
        description: "Extract requested hosts and URIs from a PCAP file using command-line tshark.",
        context: "Headless forensic analysis"
      }
    ],
    outputInterpretation: "Color-codes packets: Green for TCP, Light Blue for UDP, Dark Blue for DNS, and Black for packet errors or retransmissions.",
    limitationsAndFalsePositives: [
      "Cannot decrypt modern TLS 1.3 payloads unless provided with the browser's SSLKEYLOGFILE premaster secrets.",
      "Capturing large high-speed interfaces can rapidly generate multi-gigabyte files that consume local disk."
    ],
    integratedInAppSecNexus: true,
    appsecNexusToolId: "pcap-auditor"
  }
];
