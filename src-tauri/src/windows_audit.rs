use crate::models::{Finding, FindingSeverity};

pub struct WindowsAuditor;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct WindowsAuditReport {
    pub findings: Vec<Finding>,
    pub checks_run: usize,
    pub hostname: String,
    pub os_version: String,
}

impl WindowsAuditor {
    pub fn audit_system(target_id: &str) -> WindowsAuditReport {
        let mut findings = Vec::new();
        let mut checks_run = 0;

        let hostname = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "localhost".to_string());
        let os_version = std::env::var("OS").unwrap_or_else(|_| "Windows_NT".to_string());

        #[cfg(target_os = "windows")]
        {
            // 1. Check Unquoted Service Paths
            checks_run += 1;
            Self::check_unquoted_services(target_id, &mut findings);

            // 2. Check AlwaysInstallElevated Registry Keys
            checks_run += 1;
            Self::check_always_install_elevated(target_id, &mut findings);

            // 3. Check UAC (User Account Control) Configuration
            checks_run += 1;
            Self::check_uac_configuration(target_id, &mut findings);

            // 4. Check Autorun Registry Keys for Insecure/Unquoted Binaries
            checks_run += 1;
            Self::check_autoruns(target_id, &mut findings);

            // 5. Check Windows Defender & Firewall Status
            checks_run += 1;
            Self::check_defender_status(target_id, &mut findings);
        }

        #[cfg(not(target_os = "windows"))]
        {
            checks_run += 1;
            findings.push(Finding::new(
                target_id.to_string(),
                "Host Audit: Non-Windows OS Detected".to_string(),
                FindingSeverity::Info,
                100,
                hostname.clone(),
                "Windows Host Audit is designed for Windows environments. Currently running on Unix/Linux.".to_string(),
                "WindowsAuditor".to_string(),
                "1.0.0".to_string(),
                None,
                "Run Windows Host Audit on target Windows machines or audit via Remote PowerShell.".to_string(),
            ));
        }

        WindowsAuditReport {
            findings,
            checks_run,
            hostname,
            os_version,
        }
    }

    #[cfg(target_os = "windows")]
    fn check_unquoted_services(target_id: &str, findings: &mut Vec<Finding>) {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        // Query services using WMIC or PowerShell
        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-CimInstance -ClassName Win32_Service | Where-Object { $_.PathName -and ($_.PathName -notmatch '^\"') -and ($_.PathName -match ' ') -and ($_.PathName -notmatch '(?i)C:\\\\Windows\\\\') } | Select-Object -Property Name, PathName, StartMode, State | ConvertTo-Json -Compress",
            ])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !stdout.is_empty() && stdout != "null" {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    let items: Vec<serde_json::Value> = if val.is_array() {
                        val.as_array().unwrap().clone()
                    } else {
                        vec![val]
                    };

                    for s in items {
                        let name = s["Name"].as_str().unwrap_or("UnknownService");
                        let path = s["PathName"].as_str().unwrap_or("");
                        let state = s["State"].as_str().unwrap_or("Unknown");

                        findings.push(Finding::new(
                            target_id.to_string(),
                            format!("Privilege Escalation: Unquoted Service Path ({})", name),
                            FindingSeverity::High,
                            95,
                            format!("Service: {}", name),
                            format!(
                                "Windows service '{}' has an unquoted binary path with spaces: '{}'. State: {}\n\
                                Attack vector: When Windows launches an unquoted path like C:\\Program Files\\Sub Dir\\app.exe, \
                                it sequentially executes C:\\Program.exe, then C:\\Program Files\\Sub.exe if placed by a local adversary.",
                                name, path, state
                            ),
                            "WindowsAuditor".to_string(),
                            "1.0.0".to_string(),
                            Some("CWE-428".to_string()),
                            format!("Enclose the service binary path in quotes using: sc.exe config \"{}\" binPath= \"\\\"{}\\\"\"", name, path),
                        ));
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn check_always_install_elevated(target_id: &str, findings: &mut Vec<Finding>) {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        let output = Command::new("reg")
            .args(&[
                "query",
                r"HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer",
                "/v",
                "AlwaysInstallElevated",
            ])
            .creation_flags(0x08000000)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            if text.contains("0x1") {
                findings.push(Finding::new(
                    target_id.to_string(),
                    "Privilege Escalation: AlwaysInstallElevated Registry Key Enabled".to_string(),
                    FindingSeverity::Critical,
                    100,
                    r"HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer".to_string(),
                    "AlwaysInstallElevated is set to 1 in system policy. Any standard, unprivileged user can craft or run an MSI installer that executes arbitrary code with NT AUTHORITY\\SYSTEM privileges.".to_string(),
                    "WindowsAuditor".to_string(),
                    "1.0.0".to_string(),
                    Some("CWE-250".to_string()),
                    "Disable AlwaysInstallElevated in Group Policy (Computer Configuration -> Administrative Templates -> Windows Components -> Windows Installer -> Always install with elevated privileges = Disabled).".to_string(),
                ));
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn check_uac_configuration(target_id: &str, findings: &mut Vec<Finding>) {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        let output = Command::new("reg")
            .args(&[
                "query",
                r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System",
                "/v",
                "EnableLUA",
            ])
            .creation_flags(0x08000000)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            if text.contains("0x0") {
                findings.push(Finding::new(
                    target_id.to_string(),
                    "Security Misconfiguration: User Account Control (UAC) Disabled (EnableLUA=0)".to_string(),
                    FindingSeverity::High,
                    100,
                    r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System\EnableLUA".to_string(),
                    "UAC is completely disabled on this machine. Applications run with full administrative rights without prompt or isolation.".to_string(),
                    "WindowsAuditor".to_string(),
                    "1.0.0".to_string(),
                    Some("CWE-269".to_string()),
                    "Re-enable User Account Control by setting EnableLUA=1 in registry and restarting the machine.".to_string(),
                ));
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn check_autoruns(target_id: &str, findings: &mut Vec<Finding>) {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        let output = Command::new("reg")
            .args(&[
                "query",
                r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
            ])
            .creation_flags(0x08000000)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.contains("REG_SZ") || trimmed.contains("REG_EXPAND_SZ") {
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if parts.len() >= 3 {
                        let val_name = parts[0];
                        let val_data = parts[2..].join(" ");
                        // Check if path has spaces and no quotes
                        if val_data.contains(' ') && !val_data.starts_with('"') && !val_data.starts_with('\'') {
                            findings.push(Finding::new(
                                target_id.to_string(),
                                format!("Persistence/Hijacking: Unquoted Startup Registry Entry ({})", val_name),
                                FindingSeverity::Medium,
                                90,
                                format!(r"HKLM\...\Run -> {}", val_name),
                                format!("Startup registry key '{}' contains spaces without enclosing quotation marks: '{}'.", val_name, val_data),
                                "WindowsAuditor".to_string(),
                                "1.0.0".to_string(),
                                Some("CWE-428".to_string()),
                                "Enclose the executable path in double quotes in the Run registry key.".to_string(),
                            ));
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn check_defender_status(target_id: &str, findings: &mut Vec<Finding>) {
        use std::process::Command;
        use std::os::windows::process::CommandExt;

        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-MpComputerStatus | Select-Object -Property RealTimeProtectionEnabled, AntivirusEnabled, BehaviorMonitorEnabled | ConvertTo-Json -Compress",
            ])
            .creation_flags(0x08000000)
            .output();

        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                let rtp = val["RealTimeProtectionEnabled"].as_bool().unwrap_or(true);
                let av = val["AntivirusEnabled"].as_bool().unwrap_or(true);

                if !rtp || !av {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        "Defensive Posture Warning: Windows Antivirus / Real-Time Protection Inactive".to_string(),
                        FindingSeverity::High,
                        95,
                        "Windows Defender Endpoint Security".to_string(),
                        format!("Real-Time Protection is {} and Antivirus is {}.", if rtp { "Enabled" } else { "DISABLED" }, if av { "Enabled" } else { "DISABLED" }),
                        "WindowsAuditor".to_string(),
                        "1.0.0".to_string(),
                        Some("CWE-693".to_string()),
                        "Enable Windows Defender Real-time Protection via Windows Security Settings.".to_string(),
                    ));
                }
            }
        }
    }
}
