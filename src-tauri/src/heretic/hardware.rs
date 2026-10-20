use super::types::{CompatibilityLevel, HardwareDiagnosticReport};
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

pub struct HardwareDetector;

impl HardwareDetector {
    pub fn find_python_executable() -> Option<String> {
        #[cfg(target_os = "windows")]
        {
            let candidates = [
                r"C:\Python314\python.exe",
                r"C:\Python313\python.exe",
                r"C:\Python312\python.exe",
                r"C:\Python311\python.exe",
                r"C:\Python310\python.exe",
            ];
            for c in &candidates {
                if Path::new(c).exists() {
                    return Some(c.to_string());
                }
            }
            if let Ok(local) = std::env::var("LOCALAPPDATA") {
                let p = PathBuf::from(local).join("Programs").join("Python");
                if let Ok(entries) = std::fs::read_dir(&p) {
                    for entry in entries.flatten() {
                        let exe = entry.path().join("python.exe");
                        if exe.exists() {
                            return Some(exe.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let unix_candidates = [
                "/usr/bin/python3",
                "/usr/local/bin/python3",
                "/usr/bin/python",
            ];
            for c in &unix_candidates {
                if Path::new(c).exists() {
                    return Some(c.to_string());
                }
            }
        }

        if let Ok(path_var) = std::env::var("PATH") {
            for dir in std::env::split_paths(&path_var) {
                let p3 = dir.join(if cfg!(windows) { "python3.exe" } else { "python3" });
                if p3.exists() {
                    return Some(p3.to_string_lossy().to_string());
                }
                let p = dir.join(if cfg!(windows) { "python.exe" } else { "python" });
                if p.exists() {
                    return Some(p.to_string_lossy().to_string());
                }
            }
        }

        None
    }

    #[cfg(windows)]
    fn get_creation_flags() -> u32 {
        0x08000000 // CREATE_NO_WINDOW
    }

    pub fn detect_hardware() -> HardwareDiagnosticReport {
        let mut warnings = Vec::new();
        let mut recommendations = Vec::new();

        // 1. RAM & Disk via Win32 API
        #[cfg(windows)]
        let (disk_total_gb, disk_free_gb, ram_total_mb, ram_avail_mb) = {
            use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;
            use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

            let mut disk_free_bytes = 0u64;
            let mut disk_total_bytes = 0u64;
            let path_wide: Vec<u16> = "C:\\\0".encode_utf16().collect();
            unsafe {
                let _ = GetDiskFreeSpaceExW(
                    path_wide.as_ptr(),
                    &mut disk_free_bytes,
                    &mut disk_total_bytes,
                    std::ptr::null_mut(),
                );
            }

            let d_tot = (disk_total_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
            let d_free = (disk_free_bytes as f64) / (1024.0 * 1024.0 * 1024.0);

            let mut mem = MEMORYSTATUSEX {
                dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
                dwMemoryLoad: 0,
                ullTotalPhys: 0,
                ullAvailPhys: 0,
                ullTotalPageFile: 0,
                ullAvailPageFile: 0,
                ullTotalVirtual: 0,
                ullAvailVirtual: 0,
                ullAvailExtendedVirtual: 0,
            };

            unsafe {
                let _ = GlobalMemoryStatusEx(&mut mem);
            }

            let r_tot = mem.ullTotalPhys / (1024 * 1024);
            let r_free = mem.ullAvailPhys / (1024 * 1024);

            ((d_tot * 10.0).round() / 10.0, (d_free * 10.0).round() / 10.0, r_tot, r_free)
        };

        #[cfg(not(windows))]
        let (disk_total_gb, disk_free_gb, ram_total_mb, ram_avail_mb) = (100.0, 50.0, 16384, 8192);

        // 2. GPU Detection
        let mut gpu_name = "Standard Display Adapter".to_string();
        let mut gpu_vram_mb = 0u64;
        let mut cuda_available = false;

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let mut cmd = Command::new("powershell");
            cmd.args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, AdapterRAM | ConvertTo-Json",
            ]);
            cmd.creation_flags(Self::get_creation_flags());

            if let Ok(output) = cmd.output() {
                if output.status.success() {
                    let text = String::from_utf8_lossy(&output.stdout);
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(n) = json.get("Name").and_then(|v| v.as_str()) {
                            gpu_name = n.to_string();
                        }
                        if let Some(ram) = json.get("AdapterRAM").and_then(|v| v.as_u64()) {
                            gpu_vram_mb = ram / (1024 * 1024);
                        }
                    }
                }
            }

            // Check nvidia-smi for dedicated CUDA capability
            let mut smi_cmd = Command::new("nvidia-smi");
            smi_cmd.creation_flags(Self::get_creation_flags());
            if let Ok(smi_out) = smi_cmd.output() {
                if smi_out.status.success() {
                    cuda_available = true;
                }
            }
        }

        // 3. Python detection (Windows)
        let python_path = Self::find_python_executable();
        let mut python_version = None;
        let mut pytorch_version = None;
        let mut heretic_installed = false;
        let mut heretic_version = None;

        if let Some(ref py_bin) = python_path {
            let mut ver_cmd = Command::new(py_bin);
            ver_cmd.arg("--version");
            #[cfg(windows)]
            ver_cmd.creation_flags(Self::get_creation_flags());

            if let Ok(output) = ver_cmd.output() {
                if output.status.success() {
                    let v_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    let v_err = String::from_utf8_lossy(&output.stderr).trim().to_string();
                    let combined = if !v_str.is_empty() { v_str } else { v_err };
                    python_version = Some(combined);
                }
            }

            // Check PyTorch
            let mut torch_cmd = Command::new(py_bin);
            torch_cmd.args(["-c", "import torch; print(f'{torch.__version__}|{torch.cuda.is_available()}')"]);
            #[cfg(windows)]
            torch_cmd.creation_flags(Self::get_creation_flags());

            if let Ok(output) = torch_cmd.output() {
                if output.status.success() {
                    let out = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    let parts: Vec<&str> = out.split('|').collect();
                    if let Some(tv) = parts.first() {
                        pytorch_version = Some(tv.to_string());
                    }
                    if let Some(cuda_flag) = parts.get(1) {
                        if cuda_flag.trim().eq_ignore_ascii_case("true") {
                            cuda_available = true;
                        }
                    }
                }
            }

            // Check Heretic
            let mut heretic_cmd = Command::new(py_bin);
            heretic_cmd.args(["-m", "heretic", "--help"]);
            #[cfg(windows)]
            heretic_cmd.creation_flags(Self::get_creation_flags());

            if let Ok(output) = heretic_cmd.output() {
                if output.status.success() {
                    heretic_installed = true;
                    heretic_version = Some("heretic-llm (active)".to_string());
                }
            }
        }

        // 4. WSL2 detection
        let mut wsl_installed = false;
        let mut wsl_distro = None;
        let mut wsl_python_version = None;

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let mut wsl_cmd = Command::new("wsl");
            wsl_cmd.args(["--status"]);
            wsl_cmd.creation_flags(Self::get_creation_flags());

            if let Ok(output) = wsl_cmd.output() {
                if output.status.success() {
                    wsl_installed = true;
                    let text = String::from_utf8_lossy(&output.stdout);
                    if text.contains("Ubuntu") {
                        wsl_distro = Some("Ubuntu (WSL2)".to_string());
                    } else {
                        wsl_distro = Some("Default WSL2 Distro".to_string());
                    }

                    // Query Python inside WSL2
                    let mut wsl_py = Command::new("wsl");
                    wsl_py.args(["python3", "--version"]);
                    wsl_py.creation_flags(Self::get_creation_flags());
                    if let Ok(py_out) = wsl_py.output() {
                        if py_out.status.success() {
                            let py_str = String::from_utf8_lossy(&py_out.stdout).trim().to_string();
                            if !py_str.is_empty() {
                                wsl_python_version = Some(py_str);
                            }
                        }
                    }
                }
            }
        }

        // 5. Compute compatibility level & warnings
        let mut compatibility_level = CompatibilityLevel::Supported;

        if disk_free_gb < 15.0 {
            compatibility_level = CompatibilityLevel::Blocked;
            warnings.push(format!(
                "Low Disk Space: Only {:.1} GB free on C:\\. Downloading source models and exporting checkpoints requires at least 15–20 GB.",
                disk_free_gb
            ));
        } else if disk_free_gb < 30.0 {
            warnings.push(format!(
                "Limited Disk Space: {:.1} GB free. Processing 4B–8B models may consume 10–15 GB during optimization.",
                disk_free_gb
            ));
        }

        if ram_avail_mb < 4096 {
            if compatibility_level != CompatibilityLevel::Blocked {
                compatibility_level = CompatibilityLevel::SupportedWithWarnings;
            }
            warnings.push(format!(
                "Low Available Memory: Only {} MB RAM free. Enable 'bnb_4bit' quantization and CPU offloading to avoid Out-Of-Memory termination.",
                ram_avail_mb
            ));
        }

        if !cuda_available {
            if compatibility_level != CompatibilityLevel::Blocked {
                compatibility_level = CompatibilityLevel::SupportedWithWarnings;
            }
            warnings.push(format!(
                "Integrated Graphics Detected ({}): NVIDIA CUDA acceleration is not active. Heretic will run using CPU tensors and CPU offload, which is functional but slower.",
                gpu_name
            ));
            recommendations.push("Keep trial count lower (e.g. 20–50 trials) when running on CPU without dedicated CUDA.".to_string());
        } else {
            recommendations.push(format!("CUDA acceleration verified on {}.", gpu_name));
        }

        if wsl_installed {
            recommendations.push("WSL2 Ubuntu detected. If native Windows dependency builds fail, execution mode 'wsl' provides full Linux PyTorch and bitsandbytes compatibility.".to_string());
        }

        if !heretic_installed {
            recommendations.push("Heretic package is not yet detected in the active Python environment. Use the 'Setup Heretic Environment' button to install 'heretic-llm' via pip.".to_string());
        }

        HardwareDiagnosticReport {
            os: if cfg!(windows) { "Windows 11 (x64)".to_string() } else { "Linux (x64)".to_string() },
            gpu_name,
            gpu_vram_mb,
            cuda_available,
            ram_total_mb,
            ram_avail_mb,
            disk_total_gb,
            disk_free_gb,
            python_version,
            python_path,
            pytorch_version,
            wsl_installed,
            wsl_distro,
            wsl_python_version,
            heretic_installed,
            heretic_version,
            compatibility_level,
            warnings,
            recommendations,
        }
    }
}

/// Dispatches hardware and environment detection.
pub async fn detect_hardware() -> HardwareDiagnosticReport {
    HardwareDetector::detect_hardware()
}

/// Runs pip install for heretic-llm in the chosen execution environment (native Windows or WSL).
pub async fn install_or_update_heretic(use_wsl: bool) -> Result<String, String> {
    let mut cmd = if use_wsl {
        let mut c = Command::new("wsl");
        c.args(["pip3", "install", "--upgrade", "heretic-llm"]);
        c
    } else {
        let py = HardwareDetector::find_python_executable().unwrap_or_else(|| "python".to_string());
        let mut c = Command::new(py);
        c.args(["-m", "pip", "install", "--upgrade", "heretic-llm"]);
        c
    };

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(HardwareDetector::get_creation_flags());
    }

    match cmd.output() {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(format!("Environment setup completed successfully.\n{}", stdout))
            } else {
                Err(format!(
                    "pip install failed (exit {:?}):\nSTDOUT: {}\nSTDERR: {}",
                    out.status.code(),
                    stdout,
                    stderr
                ))
            }
        }
        Err(e) => Err(format!("Failed to execute pip process: {}", e)),
    }
}
