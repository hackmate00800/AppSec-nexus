/**
 * WCAG 2.1 Contrast Calculation & Color Verification Engine
 * Follows W3C Recommendation for Relative Luminance & Contrast Ratios
 */

export function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== "string") return null;
  const cleanHex = hex.trim().replace(/^#/, "");

  if (cleanHex.length === 3 || cleanHex.length === 4) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }

  if (cleanHex.length === 6 || cleanHex.length === 8) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }

  return null;
}

export function getChannelLuminance(value8Bit: number): number {
  const v = value8Bit / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const rL = getChannelLuminance(r);
  const gL = getChannelLuminance(g);
  const bL = getChannelLuminance(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  const rgbFg = hexToRgb(fgHex);
  const rgbBg = hexToRgb(bgHex);

  if (!rgbFg || !rgbBg) return 1.0;

  const lumFg = getRelativeLuminance(...rgbFg);
  const lumBg = getRelativeLuminance(...rgbBg);

  const l1 = Math.max(lumFg, lumBg);
  const l2 = Math.min(lumFg, lumBg);

  const ratio = (l1 + 0.05) / (l2 + 0.05);
  return Number(ratio.toFixed(2));
}

export function getContrastCompliance(ratio: number): {
  level: "AAA" | "AA" | "Fail";
  label: string;
  isAccessible: boolean;
  color: string;
} {
  if (ratio >= 7.0) {
    return { level: "AAA", label: "Pass (WCAG AAA)", isAccessible: true, color: "#10b981" };
  }
  if (ratio >= 4.5) {
    return { level: "AA", label: "Pass (WCAG AA)", isAccessible: true, color: "#10b981" };
  }
  return { level: "Fail", label: "Low Contrast (< 4.5:1)", isAccessible: false, color: "#f43f5e" };
}

export function isValidHexColor(color: string): boolean {
  if (!color || typeof color !== "string") return false;
  return /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color.trim());
}
