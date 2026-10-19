import { useState } from "react";
import {
  Layers,
  Activity,
  Globe,
  Calculator,
  Compass,
  Radio,
  FileCode,
  ArrowRight,
  Shield,
  Send,
  Zap
} from "lucide-react";

export type VisualizerTab =
  | "osi"
  | "tcp_handshake"
  | "dns"
  | "subnet"
  | "packet_journey"
  | "ports"
  | "http_explorer";

export function VisualLearningEngine() {
  const [activeVisualizer, setActiveVisualizer] = useState<VisualizerTab>("osi");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Visualizer Category Bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          padding: "8px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        {[
          { id: "osi", label: "OSI 7-Layer Explorer", icon: Layers },
          { id: "tcp_handshake", label: "TCP 3-Way Handshake", icon: Activity },
          { id: "dns", label: "DNS Resolution Flow", icon: Globe },
          { id: "subnet", label: "Subnet & CIDR Playground", icon: Calculator },
          { id: "packet_journey", label: "Packet Journey", icon: Compass },
          { id: "ports", label: "Port & Service Directory", icon: Radio },
          { id: "http_explorer", label: "HTTP Request/Response Lab", icon: FileCode },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeVisualizer === item.id;
          return (
            <button
              key={item.id}
              className={`filter-chip ${isActive ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
              }}
              onClick={() => setActiveVisualizer(item.id as VisualizerTab)}
            >
              <Icon size={14} color={isActive ? "var(--accent-cyan)" : undefined} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render selected visualizer view */}
      {activeVisualizer === "osi" && <OsiExplorerView />}
      {activeVisualizer === "tcp_handshake" && <TcpHandshakeView />}
      {activeVisualizer === "dns" && <DnsResolutionView />}
      {activeVisualizer === "subnet" && <SubnetPlaygroundView />}
      {activeVisualizer === "packet_journey" && <PacketJourneyView />}
      {activeVisualizer === "ports" && <PortExplorerView />}
      {activeVisualizer === "http_explorer" && <HttpExplorerView />}
    </div>
  );
}

// ============================================================================
// 1. OSI 7-LAYER EXPLORER
// ============================================================================
function OsiExplorerView() {
  const [selectedLayer, setSelectedLayer] = useState<number>(7);

  const layers = [
    {
      num: 7,
      name: "Application Layer",
      pdu: "Data",
      protocols: "HTTP, HTTPS, DNS, SSH, FTP, SMTP, DHCP",
      role: "User-facing protocols and application communication interfaces.",
      securityFocus: "Web vulnerability attacks (SQLi, XSS, CSRF, SSRF, IDOR), API abuse, credential stuffing, application DDoS.",
      tools: "Burp Suite, OWASP ZAP, curl, browser DevTools, Nuclei.",
      example: "Browser requests 'GET /index.html HTTP/1.1' to retrieve an interactive web document."
    },
    {
      num: 6,
      name: "Presentation Layer",
      pdu: "Data",
      protocols: "TLS/SSL, ASCII, UTF-8, JSON, XML, JPEG, Gzip",
      role: "Data translation, serialization, character encoding, compression, and cryptographic encryption/decryption.",
      securityFocus: "Insecure TLS ciphers (SSLv3, TLS 1.0/1.1), Certificate spoofing, XML External Entity (XXE), Insecure Deserialization.",
      tools: "testssl.sh, OpenSSL s_client, Wireshark TLS dissector.",
      example: "Encrypting application payload bytes with TLS 1.3 AES-GCM-256 before socket transmission."
    },
    {
      num: 5,
      name: "Session Layer",
      pdu: "Data",
      protocols: "NetBIOS, RPC, Sockets, Session Management",
      role: "Establishing, maintaining, synchronizing, and terminating communication sessions between applications.",
      securityFocus: "Session hijacking, session fixation, token replay, lack of idle session timeout, race conditions.",
      tools: "Burp Repeater/Intruder, mitmproxy, session token entropy analyzers.",
      example: "Maintaining an authenticated login session cookie across multiple subsequent HTTP requests."
    },
    {
      num: 4,
      name: "Transport Layer",
      pdu: "Segment (TCP) / Datagram (UDP)",
      protocols: "TCP, UDP, QUIC, SCTP",
      role: "End-to-end process-to-process delivery, port multiplexing, flow control, reliability, and error checking.",
      securityFocus: "SYN Flood attacks, port scanning, TCP sequence number prediction, connection hijacking, UDP amplification.",
      tools: "Nmap (-sS, -sT, -sU), netstat, ss, Wireshark, hping3.",
      example: "TCP ensures guaranteed in-order delivery to port 443 via sequence numbers and ACKs."
    },
    {
      num: 3,
      name: "Network Layer",
      pdu: "Packet",
      protocols: "IPv4, IPv6, ICMP, IPsec, OSPF, BGP",
      role: "Logical addressing, subnet routing, packet forwarding, and path selection across diverse networks.",
      securityFocus: "IP spoofing, BGP hijacking, ICMP tunneling/smurf attacks, rogue router advertisements, route poisoning.",
      tools: "traceroute / tracert, ping, iptables, Wireshark, Nmap -sn.",
      example: "Routing IP packet from client 192.168.1.50 through default gateway to public server 104.21.5.8."
    },
    {
      num: 2,
      name: "Data Link Layer",
      pdu: "Frame",
      protocols: "Ethernet (802.3), Wi-Fi (802.11), ARP, VLAN (802.1Q)",
      role: "Physical node-to-node framing, hardware MAC addressing, collision domain handling, and media access control.",
      securityFocus: "ARP spoofing / cache poisoning, MAC flooding, rogue DHCP servers, VLAN hopping, Wi-Fi deauth attacks.",
      tools: "arpspoof, aircrack-ng, ettercap, Wireshark, macchanger.",
      example: "ARP resolves the gateway IP 192.168.1.1 to the router's physical MAC address 00:1A:2B:3C:4D:5E."
    },
    {
      num: 1,
      name: "Physical Layer",
      pdu: "Bits (0s and 1s)",
      protocols: "1000BASE-T, Fiber Optic, Radio Frequencies (RF), Bluetooth",
      role: "Transmission and reception of raw unstructured bit streams over physical electrical, optical, or radio mediums.",
      securityFocus: "Physical wiretapping, rogue hardware implants (Rubber Ducky, LAN Turtle), RF jamming, physical console access.",
      tools: "Oscilloscopes, cable testers, SDR (HackRF), visual port locks.",
      example: "Voltage modulation transmitting binary pulses across an unshielded twisted-pair (UTP) Cat6 cable."
    }
  ];

  const current = layers.find((l) => l.num === selectedLayer) || layers[0];

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Layers size={20} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          OSI 7-Layer Reference Model & Attack Surface Map
        </h3>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "18px" }}>
        Click any layer to inspect its encapsulation unit (PDU), core protocols, practical example, and specific cybersecurity attack vectors.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) 2fr", gap: "20px" }}>
        {/* Layer Selection Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {layers.map((l) => {
            const isSel = selectedLayer === l.num;
            return (
              <button
                key={l.num}
                onClick={() => setSelectedLayer(l.num)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: isSel ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                  backgroundColor: isSel ? "var(--accent-primary-subtle)" : "var(--bg-secondary)",
                  color: isSel ? "var(--text-main)" : "var(--text-muted)",
                  fontWeight: isSel ? 700 : 500,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <span>
                  <strong>Layer {l.num}:</strong> {l.name}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {l.pdu}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Inspector Card */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                Layer {current.num}: {current.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "2px" }}>
                Protocol Data Unit (PDU): <strong>{current.pdu}</strong>
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                color: "var(--accent-cyan)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {current.protocols.split(", ")[0]}
            </span>
          </div>

          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
              Primary Role & Functionality
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: "1.5" }}>
              {current.role}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
              Common Protocols & Standards
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", fontFamily: "var(--font-mono, monospace)" }}>
              {current.protocols}
            </div>
          </div>

          <div style={{ backgroundColor: "var(--bg-primary)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "4px" }}>
              Real-World Flow Example
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              {current.example}
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(244, 63, 94, 0.08)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(244, 63, 94, 0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "4px" }}>
              <Shield size={14} />
              <span>Cybersecurity Attacks & Threat Surface</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-main)", lineHeight: "1.5" }}>
              {current.securityFocus}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "6px" }}>
              <strong>Auditing Tools:</strong> {current.tools}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. TCP 3-WAY HANDSHAKE VISUALIZER
// ============================================================================
function TcpHandshakeView() {
  const [step, setStep] = useState<number>(1);

  const steps = [
    {
      step: 1,
      name: "1. SYN (Synchronize Sequence Number)",
      sender: "Client",
      receiver: "Server",
      flags: "SYN=1, ACK=0",
      seq: "Seq = 1000",
      ack: "Ack = 0",
      description: "The client generates a randomized Initial Sequence Number (ISN=1000) and sends a SYN packet to port 443 requesting a new connection.",
      securityNote: "SYN Flood Attack: If an attacker sends millions of SYN packets with spoofed IPs and never responds, the server exhausts its backlog queue (SYN Cookies mitigate this)."
    },
    {
      step: 2,
      name: "2. SYN-ACK (Synchronize-Acknowledgment)",
      sender: "Server",
      receiver: "Client",
      flags: "SYN=1, ACK=1",
      seq: "Seq = 5000",
      ack: "Ack = 1001 (Client Seq + 1)",
      description: "The server allocates buffer resources, generates its own ISN (Seq=5000), acknowledges the client's sequence by incrementing it (Ack=1001), and transmits SYN-ACK.",
      securityNote: "Nmap Stealth Scan (-sS): Nmap sends SYN, receives SYN-ACK, marks the port OPEN, then immediately sends RST without finishing the handshake to avoid application logging."
    },
    {
      step: 3,
      name: "3. ACK (Connection Established)",
      sender: "Client",
      receiver: "Server",
      flags: "SYN=0, ACK=1",
      seq: "Seq = 1001",
      ack: "Ack = 5001 (Server Seq + 1)",
      description: "The client increments the server's sequence number (Ack=5001) and responds with ACK. The TCP socket state transitions to ESTABLISHED. Bi-directional data transfer begins.",
      securityNote: "TCP Connection Hijacking: If sequence numbers are predictable, an attacker on the path can inject spoofed RST or data packets into an active established stream."
    }
  ];

  const currentStep = steps.find((s) => s.step === step) || steps[0];

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            TCP 3-Way Handshake Interactive Simulator
          </h3>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`btn ${step === 1 ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={() => setStep(1)}
          >
            Step 1: SYN
          </button>
          <button
            className={`btn ${step === 2 ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={() => setStep(2)}
          >
            Step 2: SYN-ACK
          </button>
          <button
            className={`btn ${step === 3 ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            onClick={() => setStep(3)}
          >
            Step 3: ACK (Established)
          </button>
        </div>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>
        Observe how TCP guarantees reliable state synchronization between client and server, sequence number increments, and where network attacks occur.
      </p>

      {/* Visual Sequence Animation Diagram */}
      <div
        style={{
          backgroundColor: "var(--bg-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "20px",
          position: "relative",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ textAlign: "center", width: "120px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(6, 182, 212, 0.15)", border: "1px solid var(--accent-cyan)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
              <Zap size={20} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Client (Browser)</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>192.168.1.50:52410</div>
          </div>

          <div style={{ textAlign: "center", width: "120px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
              <Globe size={20} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>Server (Web App)</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>104.21.5.8:443 (HTTPS)</div>
          </div>
        </div>

        {/* Message transmission line */}
        <div
          style={{
            padding: "14px",
            borderRadius: "6px",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: step === 2 ? "var(--accent-emerald)" : "var(--accent-cyan)" }}>
            {currentStep.sender}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }}>
              <div style={{ height: "2px", flex: 1, backgroundColor: "var(--accent-cyan)" }} />
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  backgroundColor: "var(--accent-primary-subtle)",
                  border: "1px solid var(--accent-cyan)",
                  fontSize: "0.74rem",
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 700,
                  color: "var(--accent-cyan)",
                }}
              >
                {currentStep.flags} | {currentStep.seq} | {currentStep.ack}
              </div>
              <ArrowRight size={16} color="var(--accent-cyan)" />
            </div>
          </div>

          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: step === 2 ? "var(--accent-cyan)" : "var(--accent-emerald)" }}>
            {currentStep.receiver}
          </div>
        </div>
      </div>

      {/* Explanation Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", padding: "14px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "4px" }}>
            Handshake Mechanics
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-main)", lineHeight: "1.5" }}>
            {currentStep.description}
          </div>
        </div>

        <div style={{ backgroundColor: "rgba(245, 158, 11, 0.08)", padding: "14px", borderRadius: "6px", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "4px" }}>
            Cybersecurity Relevance & Scanning Implications
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-main)", lineHeight: "1.5" }}>
            {currentStep.securityNote}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. DNS RESOLUTION FLOW EXPLORER
// ============================================================================
function DnsResolutionView() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      title: "1. Local Browser & OS Cache",
      role: "Client Cache Check",
      detail: "Browser checks internal DNS cache (chrome://net-internals/#dns). If miss, queries OS resolver cache (ipconfig /displaydns) and hosts file."
    },
    {
      title: "2. Recursive Resolver (ISP / 1.1.1.1 / 8.8.8.8)",
      role: "Recursive Lookup Orchestrator",
      detail: "The client forwards request to the recursive resolver. If cached within TTL, returns immediately. Otherwise initiates hierarchical queries."
    },
    {
      title: "3. Root Nameservers (13 Logical Clusters: a.root-servers.net)",
      role: "Global Root Zone",
      detail: "Root nameserver directs the recursive resolver to the Top-Level Domain (TLD) authoritative nameserver for '.com'."
    },
    {
      title: "4. TLD Nameservers (.com / .org / .io Registry)",
      role: "Top-Level Domain Authority",
      detail: "The .com TLD server returns the authoritative nameservers for 'example.com' (e.g., ns1.cloudflare.com)."
    },
    {
      title: "5. Authoritative Nameserver (Domain Host)",
      role: "Final Source of Truth",
      detail: "Authoritative server answers with the exact DNS A record (IPv4 93.184.216.34) or AAAA record (IPv6)."
    }
  ];

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Globe size={20} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          DNS Resolution Hierarchy & Cache Traversal
        </h3>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "18px" }}>
        Trace how a domain name like <code>https://target.lab</code> is resolved into an IP address across recursive and authoritative nameservers.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {steps.map((s, idx) => {
          const isCurrent = activeStep === idx;
          return (
            <div
              key={idx}
              onClick={() => setActiveStep(idx)}
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                backgroundColor: isCurrent ? "var(--accent-primary-subtle)" : "var(--bg-secondary)",
                border: isCurrent ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: isCurrent ? "var(--accent-cyan)" : "var(--text-main)" }}>
                  {s.title}
                </span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                  {s.role}
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {s.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 4. SUBNETTING & CIDR PLAYGROUND
// ============================================================================
function SubnetPlaygroundView() {
  const [cidr, setCidr] = useState<number>(24);
  const [baseIp, setBaseIp] = useState<string>("192.168.1.0");

  const totalIps = Math.pow(2, 32 - cidr);
  const usableHosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : totalIps - 2;

  function calculateNetmask(c: number): string {
    const mask = (0xffffffff << (32 - c)) >>> 0;
    return [
      (mask >>> 24) & 0xff,
      (mask >>> 16) & 0xff,
      (mask >>> 8) & 0xff,
      mask & 0xff,
    ].join(".");
  }

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Calculator size={20} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          Interactive Subnetting & CIDR Calculator
        </h3>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "18px" }}>
        Calculate network ranges, broadcast addresses, subnet masks, and total usable hosts for network mapping and scope definition.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
            Network Base IP Address
          </label>
          <input
            type="text"
            className="input-field"
            value={baseIp}
            onChange={(e) => setBaseIp(e.target.value)}
            style={{ width: "100%", fontFamily: "var(--font-mono, monospace)", fontSize: "0.85rem" }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-main)" }}>
              CIDR Prefix Length: <strong>/{cidr}</strong>
            </label>
            <span style={{ fontSize: "0.74rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
              Mask: {calculateNetmask(cidr)}
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={32}
            value={cidr}
            onChange={(e) => setCidr(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        <div style={{ padding: "12px", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>Total IP Addresses</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "4px" }}>
            {totalIps.toLocaleString()}
          </div>
        </div>

        <div style={{ padding: "12px", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>Usable Host IPs</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "4px" }}>
            {usableHosts > 0 ? usableHosts.toLocaleString() : "Host Route (/32)"}
          </div>
        </div>

        <div style={{ padding: "12px", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>Nmap Scan Notation</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginTop: "6px", fontFamily: "monospace" }}>
            nmap -sn {baseIp}/{cidr}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. PACKET JOURNEY VISUALIZER
// ============================================================================
function PacketJourneyView() {
  const [activeStage, setActiveStage] = useState<number>(0);

  const stages = [
    { title: "1. User Types URL in Browser", detail: "Browser checks HSTS preload list and parses protocol, hostname (api.target.com), and port." },
    { title: "2. DNS Query & Resolution", detail: "Resolves hostname to IP (104.21.5.8) via recursive DNS servers." },
    { title: "3. ARP Resolution (LAN)", detail: "Resolves default gateway MAC address so frame can leave local network." },
    { title: "4. TCP Handshake", detail: "SYN -> SYN-ACK -> ACK synchronizes sequence numbers on destination port 443." },
    { title: "5. TLS 1.3 Cryptographic Handshake", detail: "ClientHello, ServerHello, KeyShare, and Certificate authentication establish encrypted session." },
    { title: "6. HTTP Request & Server Processing", detail: "Encrypted HTTP/2 or HTTP/1.1 GET request processed by reverse proxy, WAF, and backend API." },
    { title: "7. HTTP Response & Browser Rendering", detail: "Server returns 200 OK with security headers, DOM parses HTML, loads CSS/JS, and executes React." }
  ];

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Compass size={20} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          End-to-End Packet Journey: Browser to Server
        </h3>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "18px" }}>
        Follow the exact lifecycle of an HTTP request from keystroke to DOM render.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {stages.map((st, i) => (
          <div
            key={i}
            onClick={() => setActiveStage(i)}
            style={{
              padding: "10px 14px",
              borderRadius: "6px",
              backgroundColor: activeStage === i ? "var(--accent-primary-subtle)" : "var(--bg-secondary)",
              border: activeStage === i ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: activeStage === i ? "var(--accent-cyan)" : "var(--text-main)" }}>
              {st.title}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "3px" }}>
              {st.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 6. PORT & SERVICE DIRECTORY
// ============================================================================
function PortExplorerView() {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const ports = [
    { port: 21, service: "FTP", proto: "TCP", danger: "High", desc: "File Transfer Protocol. Often transmits cleartext credentials. Check for anonymous login." },
    { port: 22, service: "SSH", proto: "TCP", danger: "Low", desc: "Secure Shell. Standard remote administration. Ensure password authentication is disabled in favor of ED25519 keys." },
    { port: 25, service: "SMTP", proto: "TCP", danger: "Medium", desc: "Simple Mail Transfer Protocol. Check for open relay misconfigurations and user enumeration via VRFY/EXPN." },
    { port: 53, service: "DNS", proto: "UDP/TCP", danger: "Medium", desc: "Domain Name System. Check for zone transfer (AXFR) misconfigurations on TCP 53." },
    { port: 80, service: "HTTP", proto: "TCP", danger: "Medium", desc: "Cleartext web traffic. Should redirect immediately to HTTPS via 301/308 status." },
    { port: 443, service: "HTTPS", proto: "TCP", danger: "Info", desc: "Encrypted web traffic. Core attack surface for OWASP Top 10 and API vulnerabilities." },
    { port: 3306, service: "MySQL", proto: "TCP", danger: "Critical if public", desc: "Database server. Should NEVER be bound to public 0.0.0.0; restrict to 127.0.0.1 or VPC private subnet." },
    { port: 5432, service: "PostgreSQL", proto: "TCP", danger: "Critical if public", desc: "Database server. Check pg_hba.conf restrictions and audit default postgres user." },
    { port: 8080, service: "HTTP-Alt / Proxy", proto: "TCP", danger: "Medium", desc: "Common alternative HTTP port, Tomcat administrative panels, and proxy listeners." },
    { port: 27017, service: "MongoDB", proto: "TCP", danger: "Critical if public", desc: "NoSQL database. Frequently exposed with default no-authentication settings in cloud labs." }
  ];

  const filteredPorts = ports.filter((p) =>
    p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.port).includes(searchTerm) ||
    p.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Radio size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            Port, Protocol & Vulnerability Knowledge Base
          </h3>
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="Filter by port or service (e.g. 22, MySQL)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "240px", fontSize: "0.8rem" }}
        />
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px" }}>
        Understand why an open port is NOT automatically a vulnerability, and how security auditors evaluate exposed listening services.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
        {filteredPorts.map((p) => (
          <div
            key={p.port}
            style={{
              padding: "12px",
              borderRadius: "6px",
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                Port {p.port} ({p.service})
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: p.danger.includes("Critical") ? "rgba(244, 63, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: p.danger.includes("Critical") ? "var(--accent-rose)" : "var(--accent-amber)",
                  fontWeight: 600,
                }}
              >
                {p.proto} &bull; {p.danger}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
              {p.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 7. HTTP REQUEST / RESPONSE LAB
// ============================================================================
function HttpExplorerView() {
  const [method, setMethod] = useState<string>("GET");
  const [path, setPath] = useState<string>("/api/v1/user/profile");
  const [authHeader, setAuthHeader] = useState<string>("Bearer eyJhbGciOi...");
  const [responseStatus, setResponseStatus] = useState<number>(200);

  function handleSend() {
    if (!authHeader.trim()) {
      setResponseStatus(401);
    } else if (path.includes("admin")) {
      setResponseStatus(403);
    } else {
      setResponseStatus(200);
    }
  }

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <FileCode size={20} color="var(--accent-cyan)" />
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          Interactive HTTP Request / Response Inspector
        </h3>
      </div>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "18px" }}>
        Experiment with HTTP methods, paths, and Authorization headers in this safe local simulator to see how web servers respond.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Request Panel */}
        <div style={{ backgroundColor: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent-cyan)", marginBottom: "12px" }}>
            HTTP Request Builder
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={{
                width: "90px",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-main)",
                fontWeight: 700,
                fontSize: "0.8rem",
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              className="input-field"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Authorization Header
            </label>
            <input
              type="text"
              className="input-field"
              value={authHeader}
              onChange={(e) => setAuthHeader(e.target.value)}
              placeholder="e.g. Bearer token..."
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem" }}
            />
          </div>

          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleSend}>
            <Send size={14} /> Send Simulated Request
          </button>
        </div>

        {/* Response Panel */}
        <div style={{ backgroundColor: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>
              HTTP Response Viewer
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                fontFamily: "monospace",
                backgroundColor: responseStatus === 200 ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                color: responseStatus === 200 ? "var(--accent-emerald)" : "var(--accent-rose)",
              }}
            >
              HTTP/1.1 {responseStatus} {responseStatus === 200 ? "OK" : responseStatus === 401 ? "Unauthorized" : "Forbidden"}
            </span>
          </div>

          <pre
            style={{
              backgroundColor: "var(--bg-primary)",
              padding: "12px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontFamily: "var(--font-mono, monospace)",
              margin: 0,
              overflowX: "auto",
              color: "var(--text-main)",
            }}
          >
            {responseStatus === 200 ? (
              `Content-Type: application/json; charset=utf-8\n` +
              `Content-Security-Policy: default-src 'self'\n` +
              `X-Content-Type-Options: nosniff\n\n` +
              `{\n  "status": "success",\n  "userId": "usr_9981",\n  "role": "analyst",\n  "session": "active"\n}`
            ) : responseStatus === 401 ? (
              `WWW-Authenticate: Bearer error="invalid_token"\n` +
              `Content-Type: application/json\n\n` +
              `{\n  "error": "AuthenticationRequired",\n  "message": "Missing or malformed Authorization header."\n}`
            ) : (
              `Content-Type: application/json\n\n` +
              `{\n  "error": "PermissionDenied",\n  "message": "Administrative privilege level required to access route."\n}`
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
