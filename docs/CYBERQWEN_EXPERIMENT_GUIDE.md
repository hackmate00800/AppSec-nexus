# CyberQwen: From Base Model to Fine-Tuned + Heretic Cybersecurity LLM
## Learner's Guide & Full Experiment Log

A practical walkthrough of the exact experiment: choosing Qwen3-4B, building a custom cyber dataset with a stronger teacher (DeepSeek V3.2), validating it, fine-tuning with QLoRA on an RTX 4060 Laptop GPU (8 GB VRAM), benchmarking the result, applying Heretic for refusal-direction ablation, measuring the capability/refusal trade-off, and serving the finished local model.

---

## 1. Experiment Overview

The experiment had three major goals:

```
Base Qwen3-4B
      │
      ▼
Custom Cybersecurity Benchmark (Baseline)
      │
      ▼
Synthetic Cybersecurity Distillation Dataset (2,971 Q&A pairs via DeepSeek V3.2)
      │
      ▼
QLoRA Fine-Tuning (4-bit NF4, RTX 4060 8GB)
      │
      ▼
CyberQwen (+13.28% benchmark gain)
      │
      ▼
Heretic Refusal-Direction Ablation (Trial 50)
      │
      ▼
CyberQwen + Heretic (Refusals reduced from 94/100 to 7/100, -2.96% capability change)
```

| Parameter | Specification |
| :--- | :--- |
| **Student Model** | `Qwen/Qwen3-4B-Instruct-2507` |
| **Teacher Model** | `deepseek/deepseek-v3.2` via OpenRouter |
| **Training Method** | QLoRA, 4-bit NF4 |
| **Hardware** | NVIDIA RTX 4060 Laptop GPU (8 GB VRAM) |
| **Training Samples** | 2,971 final verified Q&A examples |
| **Selected Heretic Trial** | Trial 50 |
| **Refusal Reduction** | 94/100 down to 7/100 (92.55% relative reduction) |
| **Paired Capability Trade-off**| -2.96% |

---

## 2. Environment Setup

### Recommended Directory
Native WSL2 storage is strongly recommended over Windows-mounted OneDrive folders for performance:

```bash
mkdir -p ~/cyber-qwen
cd ~/cyber-qwen

python3 -m venv .venv
source .venv/bin/activate
pip install -U pip

# Core packages
pip install torch transformers accelerate bitsandbytes
pip install peft datasets trl requests
```

### GPU Verification
```bash
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

---

## 3. Base Model Download & 4-bit Sanity Check

```bash
hf download Qwen/Qwen3-4B-Instruct-2507 --local-dir ./Qwen3-4B-Instruct-2507
```

### 4-bit Inference Test
```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

MODEL = "./Qwen3-4B-Instruct-2507"
tokenizer = AutoTokenizer.from_pretrained(MODEL)
qconfig = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)
model = AutoModelForCausalLM.from_pretrained(
    MODEL,
    quantization_config=qconfig,
    device_map="cuda",
)

messages = [{"role": "user", "content": "Explain ARP spoofing and how defenders detect it."}]
text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tokenizer(text, return_tensors="pt").to(model.device)

with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=300, do_sample=False)
generated = out[0][inputs["input_ids"].shape[1]:]
print(tokenizer.decode(generated, skip_special_tokens=True))
```

---

## 4. Benchmark Sealing & Dataset Generation

Keep the 50-question evaluation set sealed in `benchmark/eval_questions.json` and never train on it.

### Topic Seeds (`data/topics.json`)
Covers 60 core cybersecurity areas: TCP/IP, ARP, DNS, DHCP, routing, NAT, firewalls, VPNs, TLS/HTTPS, PKI, Wi-Fi security, Linux permissions, process security, persistence, SSH, systemd, Windows auth, event logs, PowerShell, Active Directory, SQLi, XSS, CSRF, SSRF, auth/authz flaws, session security, JWT, OAuth, API security, file uploads, path traversal, memory corruption, reverse engineering, malware analysis, DFIR, SOC/SIEM analysis, crypto, and container security.

### Teacher Generation (`scripts/generate_questions.py` & `generate_answers.py`)
- Used DeepSeek V3.2 to generate questions in concurrent batches of 10 with retries.
- Technical validator reviewed batches of 40: accepted, rewritten, or rejected faulty premises.
- Teacher answered each question targeting 150-450 words of practical, information-dense guidance without hidden chain-of-thought.
- Saved into `data/training_dataset.jsonl` (2,971 examples).

---

## 5. QLoRA Fine-Tuning

- **Model**: `Qwen3-4B-Instruct-2507`
- **Target Modules**: `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`
- **LoRA Config**: `r=16`, `lora_alpha=32`, `lora_dropout=0.05`
- **Trainable Parameters**: 33.0M (0.8145% of 4.055B)
- **Batch Size**: 1 with gradient accumulation 8 (effective batch size 8)
- **Optimizer**: `paged_adamw_8bit`
- **Precision**: FP16 mixed precision
- **Training Time**: ~2h 06m on RTX 4060 Laptop (7.8 GB / 8.2 GB VRAM peak)
- **Loss**: Train loss 1.382, Eval loss 1.467

---

## 6. Benchmarking & LoRA Merge

### Custom Benchmark Results
| Evaluation | Base Qwen3-4B | CyberQwen (LoRA) | Delta |
| :--- | :--- | :--- | :--- |
| **Score (out of 5)** | 4.105 | **4.650** | **+13.28%** |
| **Head-to-Head** | 17 wins | **32 wins** | 1 tie |

### Merging Weights
```python
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE_MODEL = "./Qwen3-4B-Instruct-2507"
ADAPTER = "./models/cyber-qwen3-4b-lora"
OUTPUT = "./models/cyber-qwen3-4b-merged"

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype=torch.float16, device_map="cpu", trust_remote_code=True)
model = PeftModel.from_pretrained(model, ADAPTER)
model = model.merge_and_unload()
model.save_pretrained(OUTPUT, safe_serialization=True, max_shard_size="4GB")
tokenizer.save_pretrained(OUTPUT)
```

---

## 7. Heretic Refusal-Direction Ablation

Ablating the refusal vector directly from the merged model removes over-defensive refusals while retaining cybersecurity reasoning:

### Heretic Configuration (`config.toml`)
```toml
dtypes = ["float16"]
quantization = "bnb_4bit"
device_map = "auto"
max_memory = { "0" = "7GB", "cpu" = "24GB" }
n_trials = 50
n_startup_trials = 20
```

### Candidate Selection
- **Trial 37**: 3/100 refusals, KL divergence 0.0259
- **Trial 50 (Selected)**: 4/100 refusals, KL divergence **0.0059** (lowest divergence near minimum refusal rate)

### Refusal Rate & Capability Trade-off
- **Refusals on `mlabonne/harmful_behaviors` (100 prompts)**:
  - CyberQwen merged: **94 / 100**
  - CyberQwen + Heretic (Trial 50): **7 / 100** (92.55% reduction)
- **Capability Benchmark Comparison**:
  - CyberQwen: 4.395 / 5
  - CyberQwen + Heretic: 4.265 / 5 (-2.96% change)

---

## 8. Integrating CyberQwen into AppSec via Ollama

To use this model inside AppSec's AI Mentor:

### Step 1: Quantize to GGUF using `llama.cpp`
```bash
python3 /path/to/llama.cpp/convert_hf_to_gguf.py ./models/cyber-qwen3-4b-heretic \
    --outfile ./cyberqwen-4b-heretic.q4_k_m.gguf \
    --outtype q4_k_m
```

### Step 2: Create an Ollama Modelfile
Create a file named `Modelfile`:
```dockerfile
FROM ./cyberqwen-4b-heretic.q4_k_m.gguf

TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>"""

PARAMETER stop "<|im_start|>"
PARAMETER stop "<|im_end|>"
PARAMETER temperature 0.3
PARAMETER top_p 0.9

SYSTEM """You are CyberQwen, an expert application security engineer and penetration testing mentor embedded inside AppSec. You provide dual-perspective security reasoning, offensive proof-of-concept mechanics for authorized CTFs/labs, and rigorous defensive mitigations."""
```

### Step 3: Register in Ollama
```bash
ollama create cyberqwen:latest -f Modelfile
```

### Step 4: Select in AppSec
Once registered:
1. Open AppSec.
2. Under **AI Model Setup**, `cyberqwen:latest` will appear in the installed Ollama models list.
3. Assign it to the **Quick AI** or **Deep AI** slot, or select it directly from the AI Mentor model dropdown.
