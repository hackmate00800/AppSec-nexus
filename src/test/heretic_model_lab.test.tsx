import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { hereticService } from "../services/hereticService";
import { ModelLabView } from "../components/model_lab/ModelLabView";
import {
  HardwareDiagnosticReport,
  HereticJobRecord,
} from "../types/heretic";

describe("Heretic Model Lab Service & Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hereticService.detectHardware returns valid hardware diagnostics report", async () => {
    const report = await hereticService.detectHardware();
    expect(report).toBeDefined();
    expect(report.gpu_name).toBeDefined();
    expect(report.ram_total_mb).toBeGreaterThan(0);
    expect(report.disk_free_gb).toBeGreaterThan(0);
    expect(["supported", "supported_with_warnings", "blocked"]).toContain(report.compatibility_level);
  });

  it("hereticService.validateExport accurately detects Safetensors and required files", async () => {
    const val = await hereticService.validateExport("C:\\test\\model_dir");
    expect(val.is_valid).toBe(true);
    expect(val.has_config_json).toBe(true);
    expect(val.has_weights).toBe(true);
    expect(val.artifact_format).toBe("safetensors");
  });

  it("hereticService.startJob spawns job with correct configuration", async () => {
    const job = await hereticService.startJob({
      source_model: "Qwen/Qwen3-4B-Instruct-2507",
      output_dir: "C:\\AppSecNexus\\heretic_models\\test",
      quantization: "bnb_4bit",
      device_map: "auto",
      n_trials: 50,
      skip_optimization: false,
      execution_mode: "native",
    });

    expect(job).toBeDefined();
    expect(job.status).toBe("running");
    expect(job.source_model).toBe("Qwen/Qwen3-4B-Instruct-2507");
    expect(job.config.quantization).toBe("bnb_4bit");
  });

  it("hereticService.importToOllama runs Modelfile creation without error", async () => {
    const importRes = await hereticService.importToOllama({
      job_id: "test-job-123",
      model_name: "cyberqwen-heretic:4b",
      custom_system_prompt: "You are a defensive cybersecurity assistant.",
    });

    expect(importRes.success).toBe(true);
    expect(importRes.model_name).toBe("cyberqwen-heretic:4b");
  });

  it("hereticService.runEvaluation computes accurate refusal rate and score", async () => {
    const evalRes = await hereticService.runEvaluation("cyberqwen-heretic:4b", "test-job-123");
    expect(evalRes.total_prompts).toBe(10);
    expect(evalRes.refusal_rate).toBeGreaterThanOrEqual(0);
    expect(evalRes.refusal_rate).toBeLessThanOrEqual(100);
    expect(evalRes.technical_quality_score).toBeGreaterThan(0);
  });
});

describe("Heretic Model Lab UI Components", () => {
  const mockReport: HardwareDiagnosticReport = {
    os: "Windows 11 (x64)",
    gpu_name: "Intel(R) Iris(R) Xe Graphics",
    gpu_vram_mb: 1024,
    cuda_available: false,
    ram_total_mb: 16384,
    ram_avail_mb: 8192,
    disk_total_gb: 256.0,
    disk_free_gb: 95.4,
    python_version: "Python 3.12.3",
    python_path: "C:\\Python312\\python.exe",
    pytorch_version: "2.5.1+cpu",
    wsl_installed: true,
    wsl_distro: "Ubuntu (WSL2)",
    wsl_python_version: "Python 3.12.3",
    heretic_installed: true,
    heretic_version: "0.1.0",
    compatibility_level: "supported_with_warnings",
    warnings: ["NVIDIA CUDA acceleration not detected. Offloading to CPU tensors."],
    recommendations: ["WSL2 Ubuntu is available and recommended for optimal Linux wheel compatibility."],
  };

  const mockJobs: HereticJobRecord[] = [
    {
      id: "job-abc-123",
      source_model: "Qwen/Qwen3-4B-Instruct-2507",
      output_path: "C:\\AppSecNexus\\heretic_models\\job-abc-123",
      status: "completed",
      stage: "ready_for_ollama",
      execution_mode: "native",
      config: {
        source_model: "Qwen/Qwen3-4B-Instruct-2507",
        output_dir: "C:\\AppSecNexus\\heretic_models\\job-abc-123",
        quantization: "bnb_4bit",
        device_map: "auto",
        n_trials: 50,
        skip_optimization: false,
        execution_mode: "native",
      },
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 125000,
      ollama_model_name: "cyberqwen-heretic:4b",
      exported_files: ["model.safetensors", "config.json", "tokenizer.json"],
    },
  ];

  beforeEach(() => {
    vi.spyOn(hereticService, "detectHardware").mockResolvedValue(mockReport);
    vi.spyOn(hereticService, "getJobs").mockResolvedValue(mockJobs);
    vi.spyOn(hereticService, "getJobLogs").mockResolvedValue([
      { id: 1, job_id: "job-abc-123", line: "Optimizing refusal direction trial 1/50", timestamp: new Date().toISOString() },
      { id: 2, job_id: "job-abc-123", line: "Exporting modified Safetensors weights...", timestamp: new Date().toISOString() },
    ]);
  });

  it("renders Model Lab header and subview tabs", async () => {
    render(<ModelLabView />);

    expect(screen.getByText("Heretic Model Lab")).toBeInTheDocument();
    expect(screen.getByText("Abliteration & Optuna TPE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hardware & Setup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Job Monitor/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export & Ollama/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Evaluation Benchmark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Test Chat/i })).toBeInTheDocument();
  });

  it("displays hardware diagnostics and compatibility badge", async () => {
    render(<ModelLabView />);

    await waitFor(() => {
      expect(screen.getByText("Intel(R) Iris(R) Xe Graphics")).toBeInTheDocument();
      expect(screen.getByText(/Compatible \(CPU \/ Offload\)/i)).toBeInTheDocument();
      expect(screen.getByText(/NVIDIA CUDA acceleration not detected/i)).toBeInTheDocument();
    });
  });

  it("switches to Job Monitor subtab and displays logs", async () => {
    render(<ModelLabView />);

    const monitorBtn = screen.getByRole("button", { name: /Job Monitor/i });
    fireEvent.click(monitorBtn);

    await waitFor(() => {
      expect(screen.getByText(/Abliteration Jobs/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimizing refusal direction trial 1\/50/i)).toBeInTheDocument();
    });
  });

  it("switches to Export & Ollama subtab with Modelfile generator", async () => {
    render(<ModelLabView />);

    const exportBtn = screen.getByRole("button", { name: /Export & Ollama/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText(/Import into Local Ollama Service/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("cyberqwen-heretic:4b")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Ollama Model/i })).toBeInTheDocument();
    });
  });

  it("switches to Test Chat subtab and allows triggering AI mentor assignment", async () => {
    const onAssign = vi.fn();
    render(<ModelLabView onAssignToMentor={onAssign} />);

    const chatBtn = screen.getByRole("button", { name: /Test Chat/i });
    fireEvent.click(chatBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Assign as Active AI Mentor/i })).toBeInTheDocument();
    });

    const assignBtn = screen.getByRole("button", { name: /Assign as Active AI Mentor/i });
    fireEvent.click(assignBtn);
    expect(onAssign).toHaveBeenCalledWith("cyberqwen-heretic:4b");
  });
});
