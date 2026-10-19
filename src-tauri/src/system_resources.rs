use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResourceStatus {
    pub os: String,
    pub disk_total_gb: f64,
    pub disk_free_gb: f64,
    pub disk_used_gb: f64,
    pub disk_warning: bool,
    pub ram_total_mb: u64,
    pub ram_avail_mb: u64,
    pub ram_used_mb: u64,
    pub ram_warning: bool,
    pub warnings: Vec<String>,
}

#[cfg(windows)]
pub fn query_system_resources() -> SystemResourceStatus {
    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;
    use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

    let mut disk_free_bytes = 0u64;
    let mut disk_total_bytes = 0u64;
    let mut warnings = Vec::new();

    let path_wide: Vec<u16> = "C:\\\0".encode_utf16().collect();
    unsafe {
        let _ = GetDiskFreeSpaceExW(
            path_wide.as_ptr(),
            &mut disk_free_bytes,
            &mut disk_total_bytes,
            std::ptr::null_mut(),
        );
    }

    let disk_total_gb = (disk_total_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    let disk_free_gb = (disk_free_bytes as f64) / (1024.0 * 1024.0 * 1024.0);
    let disk_used_gb = if disk_total_gb >= disk_free_gb {
        disk_total_gb - disk_free_gb
    } else {
        0.0
    };

    let disk_warning = disk_free_gb < 20.0;
    if disk_warning {
        warnings.push(format!(
            "Low Host Storage: C:\\ has only {:.2} GB free space remaining (minimum 20.0 GB recommended for deep scans).",
            disk_free_gb
        ));
    }

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

    let ram_total_mb = mem.ullTotalPhys / (1024 * 1024);
    let ram_avail_mb = mem.ullAvailPhys / (1024 * 1024);
    let ram_used_mb = ram_total_mb.saturating_sub(ram_avail_mb);
    let ram_warning = ram_avail_mb < 1024;

    if ram_warning {
        warnings.push(format!(
            "Low Host Memory: Only {} MB physical RAM currently free (heavy tools should run with reduced concurrency).",
            ram_avail_mb
        ));
    }

    SystemResourceStatus {
        os: "Windows 11 (x64)".to_string(),
        disk_total_gb: (disk_total_gb * 100.0).round() / 100.0,
        disk_free_gb: (disk_free_gb * 100.0).round() / 100.0,
        disk_used_gb: (disk_used_gb * 100.0).round() / 100.0,
        disk_warning,
        ram_total_mb,
        ram_avail_mb,
        ram_used_mb,
        ram_warning,
        warnings,
    }
}

#[cfg(not(windows))]
pub fn query_system_resources() -> SystemResourceStatus {
    SystemResourceStatus {
        os: "Non-Windows".to_string(),
        disk_total_gb: 100.0,
        disk_free_gb: 50.0,
        disk_used_gb: 50.0,
        disk_warning: false,
        ram_total_mb: 8192,
        ram_avail_mb: 4096,
        ram_used_mb: 4096,
        ram_warning: false,
        warnings: Vec::new(),
    }
}
