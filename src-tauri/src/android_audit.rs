use crate::models::{Finding, FindingSeverity};
use regex::Regex;

pub struct AndroidAuditor;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AndroidAuditReport {
    pub package_name: String,
    pub min_sdk: Option<String>,
    pub target_sdk: Option<String>,
    pub findings: Vec<Finding>,
    pub permissions_detected: Vec<String>,
    pub exported_components: Vec<String>,
}

impl AndroidAuditor {
    pub fn audit_manifest(target_id: &str, content: &str) -> AndroidAuditReport {
        let mut findings = Vec::new();
        let mut permissions_detected = Vec::new();
        let mut exported_components = Vec::new();

        // 1. Extract Package Name & SDK Versions
        let pkg_regex = Regex::new(r#"package=["']([^"']+)["']"#).unwrap();
        let min_sdk_regex = Regex::new(r#"android:minSdkVersion=["']([^"']+)["']"#).unwrap();
        let target_sdk_regex = Regex::new(r#"android:targetSdkVersion=["']([^"']+)["']"#).unwrap();

        let package_name = pkg_regex
            .captures(content)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
            .unwrap_or_else(|| "com.example.androidapp".to_string());

        let min_sdk = min_sdk_regex
            .captures(content)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string());

        let target_sdk = target_sdk_regex
            .captures(content)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string());

        // 2. Check android:debuggable="true"
        if content.contains("android:debuggable=\"true\"") || content.contains("android:debuggable='true'") {
            findings.push(Finding::new(
                target_id.to_string(),
                "Android SAST: Application is Marked as Debuggable (android:debuggable=true)".to_string(),
                FindingSeverity::Critical,
                100,
                format!("{}/AndroidManifest.xml", package_name),
                "The application is compiled in debug mode. In production, an attacker with physical or ADB access can attach JDWP debugger, extract memory strings, inspect SQLite databases, and execute arbitrary code.".to_string(),
                "AndroidAuditor".to_string(),
                "1.0.0".to_string(),
                Some("CWE-215".to_string()),
                "Set 'android:debuggable=\"false\"' in AndroidManifest.xml before building release APKs.".to_string(),
            ));
        }

        // 3. Check android:allowBackup="true"
        if content.contains("android:allowBackup=\"true\"") || (!content.contains("android:allowBackup") && !content.is_empty()) {
            findings.push(Finding::new(
                target_id.to_string(),
                "Android SAST: Insecure Application Backup Enabled (android:allowBackup=true)".to_string(),
                FindingSeverity::High,
                95,
                format!("{}/AndroidManifest.xml", package_name),
                "Application backup is enabled (default behavior if omitted). Any local adversary with ADB enabled can backup private app data, credentials, and tokens via 'adb backup' without root privileges.".to_string(),
                "AndroidAuditor".to_string(),
                "1.0.0".to_string(),
                Some("CWE-312".to_string()),
                "Explicitly set 'android:allowBackup=\"false\"' in the <application> tag of AndroidManifest.xml.".to_string(),
            ));
        }

        // 4. Check usesCleartextTraffic="true"
        if content.contains("android:usesCleartextTraffic=\"true\"") || content.contains("android:usesCleartextTraffic='true'") {
            findings.push(Finding::new(
                target_id.to_string(),
                "Android SAST: Cleartext HTTP Network Traffic Allowed (usesCleartextTraffic=true)".to_string(),
                FindingSeverity::High,
                95,
                format!("{}/network_security_config", package_name),
                "The application explicitly opts out of Android's default cleartext traffic restriction, allowing unencrypted HTTP connections prone to MITM sniffing and tampering.".to_string(),
                "AndroidAuditor".to_string(),
                "1.0.0".to_string(),
                Some("CWE-319".to_string()),
                "Set 'android:usesCleartextTraffic=\"false\"' and enforce TLS 1.3 via a strict Network Security Configuration XML.".to_string(),
            ));
        }

        // 5. Audit Exported Components (Activities, Services, Receivers, Providers)
        let component_regex = Regex::new(r#"(?s)<(activity|service|receiver|provider)\b([^>]*?)>"#).unwrap();
        for cap in component_regex.captures_iter(content) {
            let comp_type = &cap[1];
            let comp_body = &cap[2];

            let name_regex = Regex::new(r#"android:name=["']([^"']+)["']"#).unwrap();
            let comp_name = name_regex
                .captures(comp_body)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str())
                .unwrap_or("UnnamedComponent");

            let has_intent_filter = comp_body.contains("<intent-filter");
            let is_explicitly_exported = comp_body.contains("android:exported=\"true\"") || comp_body.contains("android:exported='true'");
            let has_permission = comp_body.contains("android:permission=");

            if is_explicitly_exported && !has_permission {
                let comp_str = format!("<{}> {}", comp_type, comp_name);
                exported_components.push(comp_str.clone());

                let sev = if comp_type == "provider" || comp_type == "service" {
                    FindingSeverity::High
                } else {
                    FindingSeverity::Medium
                };

                findings.push(Finding::new(
                    target_id.to_string(),
                    format!("Android SAST: Exported {} Exposed Without Permission Protection ({})", comp_type, comp_name),
                    sev,
                    90,
                    format!("{}: {}", comp_type, comp_name),
                    format!(
                        "Component '{}' has android:exported=\"true\" but is NOT protected by any custom android:permission.\n\
                        Malicious third-party apps installed on the device can invoke this component directly, pass crafted intents, or access internal logic.",
                        comp_name
                    ),
                    "AndroidAuditor".to_string(),
                    "1.0.0".to_string(),
                    Some("CWE-926".to_string()),
                    format!("Set 'android:exported=\"false\"' if internal, or declare 'android:permission=\"com.your.app.PERMISSION\"' with signature protection level."),
                ));
            } else if has_intent_filter && !comp_body.contains("android:exported=") {
                findings.push(Finding::new(
                    target_id.to_string(),
                    format!("Android SAST: Implicitly Exported {} via Intent-Filter ({})", comp_type, comp_name),
                    FindingSeverity::Medium,
                    85,
                    format!("{}: {}", comp_type, comp_name),
                    format!("Component '{}' specifies an intent-filter but omits 'android:exported'. On Android 11 and lower, this makes the component publicly accessible to all apps.", comp_name),
                    "AndroidAuditor".to_string(),
                    "1.0.0".to_string(),
                    Some("CWE-927".to_string()),
                    "Explicitly define 'android:exported=\"false\"' on all internal components.".to_string(),
                ));
            }
        }

        // 6. Audit Dangerous Permissions
        let perm_regex = Regex::new(r#"<uses-permission\s+[^>]*?android:name=["']([^"']+)["']"#).unwrap();
        for cap in perm_regex.captures_iter(content) {
            if let Some(perm) = cap.get(1) {
                let perm_name = perm.as_str().to_string();
                permissions_detected.push(perm_name.clone());

                let (sev, desc) = match perm_name.as_str() {
                    "android.permission.READ_SMS" | "android.permission.RECEIVE_SMS" | "android.permission.SEND_SMS" => (
                        FindingSeverity::Critical,
                        "App requests SMS read/send permissions. Risk of OTP theft or unauthorized toll messaging."
                    ),
                    "android.permission.RECORD_AUDIO" | "android.permission.CAMERA" => (
                        FindingSeverity::High,
                        "App requests audio/camera surveillance hardware permissions without context verification."
                    ),
                    "android.permission.ACCESS_FINE_LOCATION" | "android.permission.ACCESS_BACKGROUND_LOCATION" => (
                        FindingSeverity::Medium,
                        "App requests high-accuracy background user GPS tracking."
                    ),
                    "android.permission.READ_EXTERNAL_STORAGE" | "android.permission.WRITE_EXTERNAL_STORAGE" => (
                        FindingSeverity::Medium,
                        "Insecure legacy shared storage permission. World-readable storage leaks sensitive caches and tokens."
                    ),
                    "android.permission.SYSTEM_ALERT_WINDOW" => (
                        FindingSeverity::High,
                        "SYSTEM_ALERT_WINDOW allows drawing overlays over other apps (Tapjacking & credential phishing risk)."
                    ),
                    "android.permission.REQUEST_INSTALL_PACKAGES" => (
                        FindingSeverity::High,
                        "Permission to silently prompt arbitrary APK installations (Dropper malware vector)."
                    ),
                    _ => (FindingSeverity::Info, "")
                };

                if sev != FindingSeverity::Info {
                    findings.push(Finding::new(
                        target_id.to_string(),
                        format!("Android SAST: Dangerous Permission Requested ({})", perm_name.split('.').last().unwrap_or(&perm_name)),
                        sev,
                        95,
                        perm_name.clone(),
                        desc.to_string(),
                        "AndroidAuditor".to_string(),
                        "1.0.0".to_string(),
                        Some("CWE-250".to_string()),
                        "Evaluate principle of least privilege. Remove unnecessary permissions or implement runtime consent prompts.".to_string(),
                    ));
                }
            }
        }

        // 7. Detect Hardcoded API Keys / Secrets in Manifest
        let google_key_regex = Regex::new(r"AIza[0-9A-Za-z_-]{35}").unwrap();
        let aws_key_regex = Regex::new(r"AKIA[0-9A-Z]{16}").unwrap();

        if let Some(m) = google_key_regex.find(content) {
            findings.push(Finding::new(
                target_id.to_string(),
                "Android SAST: Hardcoded Google API Key Exposed in Manifest".to_string(),
                FindingSeverity::High,
                100,
                "AndroidManifest.xml metadata".to_string(),
                format!("Discovered embedded API key: '{}...'", &m.as_str()[..12]),
                "AndroidAuditor".to_string(),
                "1.0.0".to_string(),
                Some("CWE-798".to_string()),
                "Restrict Google API keys in Google Cloud Console by package name and SHA-1 fingerprint.".to_string(),
            ));
        }

        if let Some(m) = aws_key_regex.find(content) {
            findings.push(Finding::new(
                target_id.to_string(),
                "Android SAST: Hardcoded AWS Access Key Exposed in Manifest".to_string(),
                FindingSeverity::Critical,
                100,
                "AndroidManifest.xml metadata".to_string(),
                format!("Discovered embedded AWS Access Key: '{}...'", &m.as_str()[..8]),
                "AndroidAuditor".to_string(),
                "1.0.0".to_string(),
                Some("CWE-798".to_string()),
                "Immediately revoke the exposed AWS credentials and use temporary STS tokens with Cognito/backend authentication.".to_string(),
            ));
        }

        AndroidAuditReport {
            package_name,
            min_sdk,
            target_sdk,
            findings,
            permissions_detected,
            exported_components,
        }
    }
}
