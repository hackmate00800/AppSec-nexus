import { ThemeDefinition, AccentDefinition, UserPreferences } from "./types";
import { isValidHexColor } from "./contrast";

export const BUILT_IN_THEMES: Record<string, ThemeDefinition> = {
  // ==========================================
  // MASTER THEME COLLECTION (10+ Premium Themes)
  // ==========================================
  vercel_minimal: {
    id: "vercel_minimal",
    name: "Vercel Minimal",
    description: "Minimal developer-grade interface, crisp black/white surfaces, restrained 1px borders, and subtle blue accents",
    category: "dark",
    tags: ["dark", "minimal", "developer"],
    isDark: true,
    colors: {
      bgPrimary: "#000000",
      bgSecondary: "#0a0a0a",
      bgCard: "#111111",
      bgCardHover: "#171717",
      borderColor: "#262626",
      borderAccent: "#38bdf8",
      textMain: "#ededed",
      textMuted: "#a1a1a1",
      textDim: "#737373",
      accentPrimary: "#0070f3",
      accentHover: "#005bb5",
      cardRadius: "6px",
      buttonRadius: "6px",
      cardShadow: "0 1px 3px rgba(0,0,0,0.4)",
    },
  },
  flip7_playful: {
    id: "flip7_playful",
    name: "Flip7 Playful",
    description: "Teal, coral, gold, warm cream surfaces, friendly rounded cards, and tactile modern SaaS energy",
    category: "light",
    tags: ["light", "colorful"],
    isDark: false,
    colors: {
      bgPrimary: "#fbf8f2",
      bgSecondary: "#f3ede2",
      bgCard: "#ffffff",
      bgCardHover: "#fefbf6",
      borderColor: "#e5dacb",
      borderAccent: "#0d9488",
      textMain: "#1c1917",
      textMuted: "#57534e",
      textDim: "#8f897e",
      accentPrimary: "#0d9488",
      accentHover: "#0f766e",
      cardRadius: "14px",
      buttonRadius: "10px",
      cardShadow: "0 4px 16px rgba(13, 148, 136, 0.08)",
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight Abyss (SOC)",
    description: "Deep navy and charcoal surfaces, high-contrast text, cool blue accents, and readable severity indicators",
    category: "security",
    tags: ["dark", "security"],
    isDark: true,
    colors: {
      bgPrimary: "#090d16",
      bgSecondary: "#0f172a",
      bgCard: "#141e33",
      bgCardHover: "#1a2744",
      borderColor: "#1e293b",
      borderAccent: "#334155",
      textMain: "#f8fafc",
      textMuted: "#94a3b8",
      textDim: "#64748b",
      accentPrimary: "#0ea5e9",
      accentHover: "#0284c7",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 4px 12px rgba(0,0,0,0.5)",
    },
  },
  cyber_neon: {
    id: "cyber_neon",
    name: "Cyber Neon",
    description: "Near-black backgrounds with electric cyan, violet, and lime accents. Readable security telemetry",
    category: "security",
    tags: ["dark", "security", "colorful"],
    isDark: true,
    colors: {
      bgPrimary: "#07090e",
      bgSecondary: "#0c1017",
      bgCard: "#121722",
      bgCardHover: "#1a2233",
      borderColor: "#1f293d",
      borderAccent: "#00f0ff",
      textMain: "#f8fafc",
      textMuted: "#38bdf8",
      textDim: "#64748b",
      accentPrimary: "#00f0ff",
      accentHover: "#00b8c4",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 0 16px rgba(0, 240, 255, 0.12)",
    },
  },
  aurora_glass: {
    id: "aurora_glass",
    name: "Aurora Glass",
    description: "Dark blue-violet gradients, refined translucent surfaces, gentle atmospheric highlights, and data visualization",
    category: "dark",
    tags: ["dark", "colorful"],
    isDark: true,
    colors: {
      bgPrimary: "#0a0817",
      bgSecondary: "#120e29",
      bgCard: "#1a1538",
      bgCardHover: "#241e4c",
      borderColor: "#2f265f",
      borderAccent: "#8b5cf6",
      textMain: "#f5f3ff",
      textMuted: "#c4b5fd",
      textDim: "#8b5cf6",
      accentPrimary: "#a855f7",
      accentHover: "#9333ea",
      cardRadius: "12px",
      buttonRadius: "8px",
      cardShadow: "0 8px 32px rgba(139, 92, 246, 0.15)",
      cardBackdrop: "blur(12px)",
    },
  },
  mint_intelligence: {
    id: "mint_intelligence",
    name: "Mint Intelligence",
    description: "Soft mint, deep teal, and dark slate. Balanced neutral clarity with high-contrast severity indicators",
    category: "security",
    tags: ["dark", "colorful", "security"],
    isDark: true,
    colors: {
      bgPrimary: "#081313",
      bgSecondary: "#0e1f1f",
      bgCard: "#142a2a",
      bgCardHover: "#1b3737",
      borderColor: "#234545",
      borderAccent: "#14b8a6",
      textMain: "#f0fdfa",
      textMuted: "#99f6e4",
      textDim: "#5eead4",
      accentPrimary: "#14b8a6",
      accentHover: "#0d9488",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 4px 14px rgba(20, 184, 166, 0.12)",
    },
  },
  amber_observatory: {
    id: "amber_observatory",
    name: "Amber Observatory",
    description: "Warm ivory, charcoal, amber, and muted orange accents. Editorial layouts, precise metric cards, and distinctive warmth",
    category: "security",
    tags: ["dark", "developer"],
    isDark: true,
    colors: {
      bgPrimary: "#15120e",
      bgSecondary: "#1c1813",
      bgCard: "#262019",
      bgCardHover: "#332b21",
      borderColor: "#3d3326",
      borderAccent: "#d97706",
      textMain: "#fef3c7",
      textMuted: "#fde68a",
      textDim: "#b45309",
      accentPrimary: "#f59e0b",
      accentHover: "#d97706",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 4px 14px rgba(245, 158, 11, 0.1)",
    },
  },
  indigo_intelligence: {
    id: "indigo_intelligence",
    name: "Indigo Intelligence",
    description: "Deep indigo surfaces, electric-indigo accents, sophisticated chart palettes, and an AI analytics visual hierarchy",
    category: "dark",
    tags: ["dark", "developer"],
    isDark: true,
    colors: {
      bgPrimary: "#0a0b1e",
      bgSecondary: "#10122e",
      bgCard: "#171a40",
      bgCardHover: "#202554",
      borderColor: "#2a3068",
      borderAccent: "#6366f1",
      textMain: "#eef2ff",
      textMuted: "#c7d2fe",
      textDim: "#818cf8",
      accentPrimary: "#6366f1",
      accentHover: "#4f46e5",
      cardRadius: "10px",
      buttonRadius: "8px",
      cardShadow: "0 4px 20px rgba(99, 102, 241, 0.15)",
    },
  },
  paper_ink: {
    id: "paper_ink",
    name: "Paper & Ink",
    description: "Editorial, documentation-inspired design with warm off-white surfaces, ink-black typography, and thin dividers",
    category: "light",
    tags: ["light", "minimal"],
    isDark: false,
    colors: {
      bgPrimary: "#fcfbf9",
      bgSecondary: "#f4f2ee",
      bgCard: "#ffffff",
      bgCardHover: "#ece8e1",
      borderColor: "#dfdacd",
      borderAccent: "#1c1917",
      textMain: "#1c1917",
      textMuted: "#44403c",
      textDim: "#78716c",
      accentPrimary: "#292524",
      accentHover: "#1c1917",
      cardRadius: "4px",
      buttonRadius: "4px",
      cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
    },
  },
  oceanic_blue: {
    id: "oceanic_blue",
    name: "Oceanic Blue",
    description: "Calm, high-trust enterprise security platform with ocean blue, deep slate surfaces, and refined telemetry",
    category: "security",
    tags: ["dark", "colorful", "security"],
    isDark: true,
    colors: {
      bgPrimary: "#0b1320",
      bgSecondary: "#0f1c30",
      bgCard: "#132540",
      bgCardHover: "#182f52",
      borderColor: "#1e3a5f",
      borderAccent: "#38bdf8",
      textMain: "#f0f6fc",
      textMuted: "#7dd3fc",
      textDim: "#0284c7",
      accentPrimary: "#0284c7",
      accentHover: "#0369a1",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 4px 16px rgba(2, 132, 199, 0.12)",
    },
  },
  solarized_studio: {
    id: "solarized_studio",
    name: "Solarized Studio",
    description: "Developer-focused technical workbench inspired by Solarized dark ergonomics with balanced cyan and blue accents",
    category: "developer",
    tags: ["dark", "developer"],
    isDark: true,
    colors: {
      bgPrimary: "#002b36",
      bgSecondary: "#073642",
      bgCard: "#094352",
      bgCardHover: "#0c5163",
      borderColor: "#586e75",
      borderAccent: "#2aa198",
      textMain: "#93a1a1",
      textMuted: "#839496",
      textDim: "#657b83",
      accentPrimary: "#268bd2",
      accentHover: "#2aa198",
      cardRadius: "4px",
      buttonRadius: "4px",
      cardShadow: "0 2px 8px rgba(0, 43, 54, 0.4)",
    },
  },
  dracula: {
    id: "dracula",
    name: "Dracula Dark",
    description: "Vibrant gothic dark palette with purple accents and crisp syntax contrast",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#282a36",
      bgSecondary: "#21222c",
      bgCard: "#343746",
      bgCardHover: "#44475a",
      borderColor: "#6272a4",
      borderAccent: "#bd93f9",
      textMain: "#f8f8f2",
      textMuted: "#bd93f9",
      textDim: "#6272a4",
    },
  },
  monokai: {
    id: "monokai",
    name: "Monokai Pro",
    description: "Iconic high-contrast dark palette with warm amber and lime highlights",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#2d2a2e",
      bgSecondary: "#221f22",
      bgCard: "#363337",
      bgCardHover: "#403e41",
      borderColor: "#49454b",
      borderAccent: "#ffd866",
      textMain: "#fcfcfa",
      textMuted: "#a9dc76",
      textDim: "#727072",
    },
  },
  nordic: {
    id: "nordic",
    name: "Nord Frost",
    description: "Arctic, north-bluish clean dark palette inspired by Scandinavian snowscapes",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#2e3440",
      bgSecondary: "#242933",
      bgCard: "#3b4252",
      bgCardHover: "#434c5e",
      borderColor: "#4c566a",
      borderAccent: "#88c0d0",
      textMain: "#eceff4",
      textMuted: "#d8dee9",
      textDim: "#81a1c1",
    },
  },
  tokyo_night: {
    id: "tokyo_night",
    name: "Tokyo Night",
    description: "Deep nocturnal blue palette inspired by the neon lights of downtown Tokyo",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#1a1b26",
      bgSecondary: "#16161e",
      bgCard: "#24283b",
      bgCardHover: "#2f354f",
      borderColor: "#3b4261",
      borderAccent: "#7aa2f7",
      textMain: "#c0caf5",
      textMuted: "#9aa5ce",
      textDim: "#565f89",
    },
  },
  one_dark: {
    id: "one_dark",
    name: "One Dark Pro",
    description: "Atom-style iconic dark grey with calm blue borders and balanced tones",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#21252b",
      bgSecondary: "#1e2227",
      bgCard: "#282c34",
      bgCardHover: "#353b45",
      borderColor: "#3e4451",
      borderAccent: "#61afef",
      textMain: "#abb2bf",
      textMuted: "#828997",
      textDim: "#5c6370",
    },
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    description: "High-octane synthwave aesthetics with electric magenta & laser cyan borders",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#0d0f18",
      bgSecondary: "#131722",
      bgCard: "#1a1f2c",
      bgCardHover: "#262d40",
      borderColor: "#ff007f",
      borderAccent: "#00f0ff",
      textMain: "#fcee0a",
      textMuted: "#00f0ff",
      textDim: "#8d99ae",
    },
  },
  obsidian: {
    id: "obsidian",
    name: "Obsidian Graphite",
    description: "Deep black and charcoal for a low-distraction developer aesthetic",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#0c0d0e",
      bgSecondary: "#121316",
      bgCard: "#181a1f",
      bgCardHover: "#20232a",
      borderColor: "#22252c",
      borderAccent: "#2e323b",
      textMain: "#f3f4f6",
      textMuted: "#9ca3af",
      textDim: "#6b7280",
    },
  },
  graphite: {
    id: "graphite",
    name: "Graphite Enterprise",
    description: "Balanced dark grey surfaces, dense readable tables, and crisp dividers",
    category: "dark",
    tags: ["dark", "minimal", "developer"],
    isDark: true,
    colors: {
      bgPrimary: "#161719",
      bgSecondary: "#1e2023",
      bgCard: "#25272c",
      bgCardHover: "#2e3137",
      borderColor: "#32353b",
      borderAccent: "#41454d",
      textMain: "#eceef1",
      textMuted: "#9ba1a6",
      textDim: "#6f747a",
      accentPrimary: "#64748b",
      cardRadius: "6px",
      buttonRadius: "4px",
      cardShadow: "0 2px 8px rgba(0,0,0,0.4)",
    },
  },
  oled: {
    id: "oled",
    name: "OLED Black",
    description: "True-black (#000000) backgrounds with high-contrast borders",
    category: "dark",
    isDark: true,
    colors: {
      bgPrimary: "#000000",
      bgSecondary: "#080808",
      bgCard: "#101010",
      bgCardHover: "#181818",
      borderColor: "#242424",
      borderAccent: "#383838",
      textMain: "#ffffff",
      textMuted: "#a3a3a3",
      textDim: "#737373",
    },
  },

  // ==========================================
  // LIGHT THEMES (Clean & High-Contrast)
  // ==========================================
  github_light: {
    id: "github_light",
    name: "GitHub Light",
    description: "Clean modern white and soft grey canvas with crisp GitHub-style borders",
    category: "light",
    isDark: false,
    colors: {
      bgPrimary: "#ffffff",
      bgSecondary: "#f6f8fa",
      bgCard: "#ffffff",
      bgCardHover: "#eaeef2",
      borderColor: "#d0d7de",
      borderAccent: "#0969da",
      textMain: "#1f2328",
      textMuted: "#57606a",
      textDim: "#8c959f",
    },
  },
  quiet_light: {
    id: "quiet_light",
    name: "Quiet Light",
    description: "Soft warm grey surfaces with soothing purple undertones and gentle contrast",
    category: "light",
    isDark: false,
    colors: {
      bgPrimary: "#f5f5f5",
      bgSecondary: "#ebebeb",
      bgCard: "#ffffff",
      bgCardHover: "#f0f0f0",
      borderColor: "#dcdcdc",
      borderAccent: "#705697",
      textMain: "#333333",
      textMuted: "#666666",
      textDim: "#888888",
    },
  },
  arctic: {
    id: "arctic",
    name: "Arctic Light & Analytics",
    description: "Crisp light surfaces, icy blue accents, delicate borders, and clean analytics clarity",
    category: "light",
    tags: ["light", "minimal"],
    isDark: false,
    colors: {
      bgPrimary: "#f8fafc",
      bgSecondary: "#ffffff",
      bgCard: "#ffffff",
      bgCardHover: "#f1f5f9",
      borderColor: "#e2e8f0",
      borderAccent: "#0284c7",
      textMain: "#0f172a",
      textMuted: "#475569",
      textDim: "#64748b",
      accentPrimary: "#0284c7",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
  },
  solarized_light: {
    id: "solarized_light",
    name: "Solarized Light",
    description: "Scientifically calibrated warm cream palette with cyan and blue accents",
    category: "light",
    isDark: false,
    colors: {
      bgPrimary: "#fdf6e3",
      bgSecondary: "#eee8d5",
      bgCard: "#fbf1c7",
      bgCardHover: "#e4ded0",
      borderColor: "#d5c4a1",
      borderAccent: "#268bd2",
      textMain: "#073642",
      textMuted: "#586e75",
      textDim: "#839496",
    },
  },

  // ==========================================
  // SECURITY-FOCUSED THEMES
  // ==========================================
  soc_terminal: {
    id: "soc_terminal",
    name: "SOC Terminal Green",
    description: "Phosphor-green console black with monospace telemetry and modern card layouts",
    category: "security",
    tags: ["dark", "security", "developer"],
    isDark: true,
    colors: {
      bgPrimary: "#050a06",
      bgSecondary: "#0a120b",
      bgCard: "#0f1a10",
      bgCardHover: "#172719",
      borderColor: "#1b3a1e",
      borderAccent: "#22c55e",
      textMain: "#4ade80",
      textMuted: "#86efac",
      textDim: "#166534",
      accentPrimary: "#22c55e",
      cardRadius: "4px",
      buttonRadius: "4px",
      cardShadow: "0 0 10px rgba(34, 197, 94, 0.12)",
    },
  },
  threat_intel: {
    id: "threat_intel",
    name: "Threat Intel",
    description: "Dark intelligence navy and cobalt with alert highlights for threat analysis",
    category: "security",
    isDark: true,
    colors: {
      bgPrimary: "#08101e",
      bgSecondary: "#0c172b",
      bgCard: "#11203b",
      bgCardHover: "#172a4d",
      borderColor: "#1d355e",
      borderAccent: "#38bdf8",
      textMain: "#e0f2fe",
      textMuted: "#7dd3fc",
      textDim: "#38bdf8",
    },
  },
  crimson: {
    id: "crimson",
    name: "AppSec Crimson",
    description: "Red-team offensive security aesthetic with deep charcoal and crimson accents",
    category: "security",
    isDark: true,
    colors: {
      bgPrimary: "#12090b",
      bgSecondary: "#1a0f12",
      bgCard: "#241519",
      bgCardHover: "#331e24",
      borderColor: "#481f28",
      borderAccent: "#f43f5e",
      textMain: "#ffe4e6",
      textMuted: "#fda4af",
      textDim: "#9f1239",
    },
  },
  forensic_slate: {
    id: "forensic_slate",
    name: "Forensic Slate",
    description: "Digital forensics laboratory aesthetic with precision cool slate and teal",
    category: "security",
    isDark: true,
    colors: {
      bgPrimary: "#0f1724",
      bgSecondary: "#162032",
      bgCard: "#1d2a40",
      bgCardHover: "#253652",
      borderColor: "#2b3e5c",
      borderAccent: "#14b8a6",
      textMain: "#f0fdfa",
      textMuted: "#99f6e4",
      textDim: "#5eead4",
    },
  },
  windows_11: {
    id: "windows_11",
    name: "Windows 11",
    description: "Fluent Design system inspired by Windows 11 with soft Mica dark surfaces, rounded geometry, and Windows blue accent",
    category: "dark",
    tags: ["dark", "minimal", "windows"],
    isDark: true,
    colors: {
      bgPrimary: "#202020",
      bgSecondary: "#272727",
      bgCard: "#2c2c2c",
      bgCardHover: "#383838",
      borderColor: "#383838",
      borderAccent: "#4cc2ff",
      textMain: "#ffffff",
      textMuted: "#d0d0d0",
      textDim: "#8a8a8a",
      accentPrimary: "#4cc2ff",
      accentHover: "#60cdff",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 4px 16px rgba(0, 0, 0, 0.28), 0 1px 2px rgba(0, 0, 0, 0.2)",
    },
  },
  windows_11_dark: {
    id: "windows_11_dark",
    name: "Windows 11 Dark",
    description: "Fluent Design dark mode featuring Mica layered depth, Segoe UI typography, and responsive acrylic highlights",
    category: "dark",
    tags: ["dark", "minimal", "windows"],
    isDark: true,
    colors: {
      bgPrimary: "#202020",
      bgSecondary: "#272727",
      bgCard: "#2c2c2c",
      bgCardHover: "#383838",
      borderColor: "#383838",
      borderAccent: "#4cc2ff",
      textMain: "#ffffff",
      textMuted: "#d0d0d0",
      textDim: "#8a8a8a",
      accentPrimary: "#4cc2ff",
      accentHover: "#60cdff",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 4px 16px rgba(0, 0, 0, 0.28), 0 1px 2px rgba(0, 0, 0, 0.2)",
    },
  },
  windows_11_light: {
    id: "windows_11_light",
    name: "Windows 11 Light",
    description: "Fluent Design light mode with clean soft gray Mica canvases, crisp 1px borders, and signature Windows blue",
    category: "light",
    tags: ["light", "minimal", "windows"],
    isDark: false,
    colors: {
      bgPrimary: "#f3f3f3",
      bgSecondary: "#f8f9fa",
      bgCard: "#ffffff",
      bgCardHover: "#fcfcfc",
      borderColor: "#e5e5e5",
      borderAccent: "#0067c0",
      textMain: "#1b1b1b",
      textMuted: "#5d5d5d",
      textDim: "#767676",
      accentPrimary: "#0067c0",
      accentHover: "#005a9e",
      cardRadius: "8px",
      buttonRadius: "6px",
      cardShadow: "0 2px 6px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04)",
    },
  },
};

export const BUILT_IN_ACCENTS: Record<string, AccentDefinition> = {
  cyan: {
    id: "cyan",
    name: "AppSec Cyan",
    hex: "#06b6d4",
    hoverHex: "#0891b2",
    subtleHex: "rgba(6, 182, 212, 0.15)",
  },
  violet: {
    id: "violet",
    name: "Electric Violet",
    hex: "#a855f7",
    hoverHex: "#9333ea",
    subtleHex: "rgba(168, 85, 247, 0.15)",
  },
  emerald: {
    id: "emerald",
    name: "Cyber Emerald",
    hex: "#10b981",
    hoverHex: "#059669",
    subtleHex: "rgba(168, 85, 247, 0.15)",
  },
  amber: {
    id: "amber",
    name: "Security Amber",
    hex: "#f59e0b",
    hoverHex: "#d97706",
    subtleHex: "rgba(245, 158, 11, 0.15)",
  },
  blue: {
    id: "blue",
    name: "Cobalt Blue",
    hex: "#3b82f6",
    hoverHex: "#2563eb",
    subtleHex: "rgba(59, 130, 246, 0.15)",
  },
  windows_blue: {
    id: "windows_blue",
    name: "Windows Blue",
    hex: "#0067c0",
    hoverHex: "#005a9e",
    subtleHex: "rgba(0, 103, 192, 0.15)",
  },
  rose: {
    id: "rose",
    name: "Crimson Rose",
    hex: "#f43f5e",
    hoverHex: "#e11d48",
    subtleHex: "rgba(244, 63, 94, 0.15)",
  },
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "midnight",
  accent: "cyan",
  density: "comfortable",
  sidebarMode: "expanded",
  reducedMotion: false,
  fontScale: "md",
  defaultTab: "analytics",
  customThemes: [],
};

export const PREFERENCES_STORAGE_KEY = "appsec_nexus_preferences_v2";

/**
 * Validate and sanitize an imported Theme JSON payload
 * Protection against JSON injection, oversized payloads, script tags, invalid colors.
 */
export function validateAndSanitizeThemeJson(rawJson: string): {
  success: boolean;
  theme?: ThemeDefinition;
  error?: string;
} {
  if (!rawJson || typeof rawJson !== "string") {
    return { success: false, error: "Empty or invalid JSON payload." };
  }

  // Maximum payload size 32KB
  if (rawJson.length > 32768) {
    return { success: false, error: "Theme JSON exceeds maximum allowable size (32 KB)." };
  }

  // Reject obvious script or style injection attempts
  if (/<script|javascript:|data:text\/html/i.test(rawJson)) {
    return { success: false, error: "Payload contains forbidden script or HTML entities." };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: "Invalid JSON syntax. Please check file format." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Theme root must be a valid JSON object." };
  }

  const name = typeof parsed.name === "string" ? parsed.name.trim().replace(/[<>]/g, "") : "";
  if (!name || name.length < 2 || name.length > 40) {
    return { success: false, error: "Theme 'name' must be a string between 2 and 40 characters." };
  }

  const description =
    typeof parsed.description === "string"
      ? parsed.description.trim().replace(/[<>]/g, "").slice(0, 120)
      : "Imported custom security theme";

  const isDark = typeof parsed.isDark === "boolean" ? parsed.isDark : true;
  const category = parsed.category === "light" || parsed.category === "security" ? parsed.category : "custom";

  // Validate colors object
  if (!parsed.colors || typeof parsed.colors !== "object") {
    return { success: false, error: "Theme missing required 'colors' object definition." };
  }

  const requiredColorKeys = [
    "bgPrimary",
    "bgSecondary",
    "bgCard",
    "bgCardHover",
    "borderColor",
    "borderAccent",
    "textMain",
    "textMuted",
    "textDim",
  ];

  const colors: Record<string, string> = {};
  for (const key of requiredColorKeys) {
    const val = parsed.colors[key];
    if (!val || typeof val !== "string" || !isValidHexColor(val)) {
      return {
        success: false,
        error: `Invalid or missing color token '${key}'. Must be a valid hex color code (e.g. #1e293b).`,
      };
    }
    colors[key] = val.trim();
  }

  const safeId =
    typeof parsed.id === "string" && /^[a-z0-9_-]{3,32}$/i.test(parsed.id)
      ? `custom-${parsed.id.toLowerCase().replace(/^custom-/, "")}`
      : `custom-${Date.now().toString(36)}`;

  const sanitizedTheme: ThemeDefinition = {
    id: safeId,
    name,
    description,
    category,
    isDark,
    isCustom: true,
    colors: colors as any,
  };

  return { success: true, theme: sanitizedTheme };
}
