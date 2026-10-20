use crate::heretic::types::{ExportValidationResult, OllamaImportParams, OllamaImportResult};
use std::fs;
use std::path::Path;
use std::process::Command;

/// Validates an exported model directory produced by Heretic.
pub fn validate_export_dir<P: AsRef<Path>>(dir_path: P) -> ExportValidationResult {
    let path = dir_path.as_ref();
    if !path.exists() {
        return ExportValidationResult {
            is_valid: false,
            artifact_format: "unknown".to_string(),
            total_size_bytes: 0,
            files_found: Vec::new(),
            missing_files: vec!["Directory does not exist".to_string()],
            has_config_json: false,
            has_tokenizer: false,
            has_weights: false,
            error: Some(format!("Directory not found: {}", path.display())),
        };
    }

    if !path.is_dir() {
        return ExportValidationResult {
            is_valid: false,
            artifact_format: "unknown".to_string(),
            total_size_bytes: 0,
            files_found: Vec::new(),
            missing_files: vec!["Specified path is not a directory".to_string()],
            has_config_json: false,
            has_tokenizer: false,
            has_weights: false,
            error: Some("Specified path is a file, not a directory".to_string()),
        };
    }

    let mut files_found = Vec::new();
    let mut total_size_bytes: u64 = 0;
    let mut has_config_json = false;
    let mut has_tokenizer = false;
    let mut has_safetensors = false;
    let mut has_gguf = false;
    let mut has_bin = false;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    let file_size = metadata.len();
                    total_size_bytes += file_size;
                    files_found.push(format!("{} ({:.2} MB)", file_name, file_size as f64 / (1024.0 * 1024.0)));

                    let lower = file_name.to_lowercase();
                    if lower == "config.json" {
                        has_config_json = true;
                    }
                    if lower.contains("tokenizer") || lower == "vocab.json" {
                        has_tokenizer = true;
                    }
                    if lower.ends_with(".safetensors") {
                        has_safetensors = true;
                    }
                    if lower.ends_with(".gguf") {
                        has_gguf = true;
                    }
                    if lower.ends_with(".bin") {
                        has_bin = true;
                    }
                }
            }
        }
    }

    let has_weights = has_safetensors || has_gguf || has_bin;
    let artifact_format = if has_safetensors {
        "safetensors".to_string()
    } else if has_gguf {
        "gguf".to_string()
    } else if has_bin {
        "pytorch_bin".to_string()
    } else {
        "unknown".to_string()
    };

    let mut missing_files = Vec::new();
    if !has_config_json && !has_gguf {
        missing_files.push("config.json".to_string());
    }
    if !has_tokenizer && !has_gguf {
        missing_files.push("tokenizer.json / tokenizer_config.json".to_string());
    }
    if !has_weights {
        missing_files.push("model weights (*.safetensors or *.gguf)".to_string());
    }

    let is_valid = (has_safetensors && has_config_json) || has_gguf;
    let error = if !is_valid {
        Some(format!(
            "Missing required files for Ollama import: {}",
            missing_files.join(", ")
        ))
    } else {
        None
    };

    ExportValidationResult {
        is_valid,
        artifact_format,
        total_size_bytes,
        files_found,
        missing_files,
        has_config_json,
        has_tokenizer,
        has_weights,
        error,
    }
}

/// Generates a standard Modelfile for importing into Ollama.
pub fn generate_modelfile(
    model_dir: &Path,
    custom_system_prompt: Option<&str>,
    context_size: Option<u32>,
    temperature: Option<f32>,
) -> String {
    // Normalise Windows path for Ollama Modelfile (forward slashes work consistently)
    let path_str = model_dir.to_string_lossy().replace('\\', "/");

    let mut modelfile = format!("FROM \"{}\"\n\n", path_str);

    let default_system = "You are AppSec Nexus AI, an advanced, highly skilled defensive cybersecurity assistant. You provide precise, rigorous, safe technical explanations, security architecture designs, threat modeling, vulnerability detection methodologies, and remediation code.";
    let system_prompt = custom_system_prompt.unwrap_or(default_system);
    modelfile.push_str(&format!("SYSTEM \"\"\"{}\"\"\"\n\n", system_prompt));

    // Common chat template compatible with Qwen / LLaMA Instruct
    modelfile.push_str("TEMPLATE \"\"\"{{ if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}{{ if .Prompt }}<|im_start|>user\n{{ .Prompt }}<|im_end|>\n{{ end }}<|im_start|>assistant\n{{ .Response }}<|im_end|>\"\"\"\n\n");

    modelfile.push_str("PARAMETER stop \"<|im_start|>\"\n");
    modelfile.push_str("PARAMETER stop \"<|im_end|>\"\n");
    modelfile.push_str("PARAMETER stop \"<|endoftext|>\"\n");

    if let Some(ctx) = context_size {
        modelfile.push_str(&format!("PARAMETER num_ctx {}\n", ctx));
    } else {
        modelfile.push_str("PARAMETER num_ctx 4096\n");
    }

    if let Some(temp) = temperature {
        modelfile.push_str(&format!("PARAMETER temperature {}\n", temp));
    } else {
        modelfile.push_str("PARAMETER temperature 0.7\n");
    }

    modelfile
}

/// Executes `ollama create <model_name> -f <modelfile_path>` to import the model.
pub fn import_model_to_ollama(
    output_dir: &Path,
    params: &OllamaImportParams,
) -> Result<OllamaImportResult, String> {
    let validation = validate_export_dir(output_dir);
    if !validation.is_valid {
        return Err(format!(
            "Cannot import to Ollama: export directory validation failed. {}",
            validation.error.unwrap_or_default()
        ));
    }

    // Write Modelfile into output directory
    let modelfile_content = generate_modelfile(
        output_dir,
        params.custom_system_prompt.as_deref(),
        params.context_size,
        params.temperature,
    );
    let modelfile_path = output_dir.join("Modelfile");
    if let Err(e) = fs::write(&modelfile_path, &modelfile_content) {
        return Err(format!("Failed to write Modelfile at {}: {}", modelfile_path.display(), e));
    }

    // Run `ollama create <name> -f <modelfile_path>`
    let mut cmd = Command::new("ollama");
    cmd.arg("create")
        .arg(&params.model_name)
        .arg("-f")
        .arg(&modelfile_path);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = match cmd.output() {
        Ok(out) => out,
        Err(e) => {
            return Err(format!(
                "Failed to execute 'ollama create'. Is Ollama installed and in PATH? Error: {}",
                e
            ));
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let mut logs = Vec::new();
    for line in stdout.lines() {
        if !line.trim().is_empty() {
            logs.push(line.to_string());
        }
    }
    for line in stderr.lines() {
        if !line.trim().is_empty() {
            logs.push(line.to_string());
        }
    }

    if !output.status.success() {
        return Ok(OllamaImportResult {
            success: false,
            model_name: params.model_name.clone(),
            modelfile_path: modelfile_path.to_string_lossy().to_string(),
            logs,
            error: Some(format!(
                "Ollama create failed with exit code {:?}: {}",
                output.status.code(),
                stderr
            )),
        });
    }

    Ok(OllamaImportResult {
        success: true,
        model_name: params.model_name.clone(),
        modelfile_path: modelfile_path.to_string_lossy().to_string(),
        logs,
        error: None,
    })
}
