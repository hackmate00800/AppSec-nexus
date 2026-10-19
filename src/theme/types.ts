export type PredefinedThemeId =
  | "vercel_minimal"
  | "flip7_playful"
  | "midnight"
  | "cyber_neon"
  | "aurora_glass"
  | "arctic"
  | "mint_intelligence"
  | "graphite"
  | "amber_observatory"
  | "indigo_intelligence"
  | "soc_terminal"
  | "paper_ink"
  | "oceanic_blue"
  | "solarized_studio"
  | "obsidian"
  | "nordic"
  | "oled"
  | "dracula"
  | "monokai"
  | "tokyo_night"
  | "one_dark"
  | "cyberpunk"
  | "github_light"
  | "quiet_light"
  | "solarized_light"
  | "threat_intel"
  | "crimson"
  | "forensic_slate";

export type ThemeId = PredefinedThemeId | (string & {});

export type AccentId =
  | "cyan"
  | "violet"
  | "emerald"
  | "amber"
  | "blue"
  | "rose";

export type Density = "comfortable" | "compact";

export type SidebarMode = "expanded" | "compact";

export type FontScale = "sm" | "md" | "lg";

export type ThemeCategory =
  | "all"
  | "dark"
  | "light"
  | "security"
  | "minimal"
  | "colorful"
  | "developer"
  | "custom";

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  borderColor: string;
  borderAccent: string;
  textMain: string;
  textMuted: string;
  textDim: string;
  accentPrimary?: string;
  accentHover?: string;
  cardRadius?: string;
  buttonRadius?: string;
  cardShadow?: string;
  cardBackdrop?: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  category: "dark" | "light" | "security" | "minimal" | "colorful" | "developer" | "custom";
  tags?: string[];
  isDark: boolean;
  isCustom?: boolean;
  colors: ThemeColors;
}

export interface AccentDefinition {
  id: AccentId;
  name: string;
  hex: string;
  hoverHex: string;
  subtleHex: string;
}

export interface UserPreferences {
  theme: ThemeId;
  accent: AccentId;
  density: Density;
  sidebarMode: SidebarMode;
  reducedMotion: boolean;
  fontScale: FontScale;
  defaultTab: string;
  customThemes?: ThemeDefinition[];
}
