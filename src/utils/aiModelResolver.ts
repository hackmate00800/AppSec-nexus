import { SecurityAiRole, SecurityAiWorkspaceConfig } from "../types";

export const RECOMMENDED_QUICK_MODEL = "llama3.2:1b";
export const RECOMMENDED_DEEP_MODEL = "llama3:8b";

export const QUICK_STORAGE_KEY = "appsec_ai_quick_model";
export const DEEP_STORAGE_KEY = "appsec_ai_deep_model";
export const ACTIVE_ROLE_STORAGE_KEY = "appsec_ai_active_role";

/**
 * Checks if a candidate model ID matches any installed model string (exact or prefix)
 */
export function isModelInstalled(candidate: string, installedModels: string[]): boolean {
  if (!candidate || !installedModels || installedModels.length === 0) return false;
  const candLower = candidate.toLowerCase();
  const candBase = candLower.split(":")[0];
  return installedModels.some((m) => {
    const mLower = m.toLowerCase();
    return mLower === candLower || mLower.split(":")[0] === candBase;
  });
}

/**
 * Strips verbose tags like ':latest' for cleaner UI presentation
 */
export function formatModelDisplayName(modelName: string): string {
  if (!modelName) return "None Configured";
  if (modelName.endsWith(":latest")) {
    return modelName.slice(0, -7);
  }
  return modelName;
}

/**
 * Heuristic classifier to determine whether an installed model is best suited
 * as a Quick Security model (1B - 3B parameter size) or Deep Security model (7B - 14B)
 */
export function isQuickCandidate(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return (
    lower.includes("1b") ||
    lower.includes("1.5b") ||
    lower.includes("2b") ||
    lower.includes("3b") ||
    lower.includes("4b") ||
    lower.includes("small") ||
    lower.includes("fast") ||
    lower.includes("tiny")
  );
}

export function isDeepCandidate(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return (
    lower.includes("8b") ||
    lower.includes("7b") ||
    lower.includes("14b") ||
    lower.includes("appsec-teacher-8b") ||
    lower.includes("cyberqwen") ||
    lower.includes("deep") ||
    lower.includes("large")
  );
}

/**
 * Resolves the active Quick and Deep model slots given available installed models
 * and persisted user preferences.
 */
export function resolveModelSlots(installedModels: string[]): {
  quickModel: string;
  deepModel: string;
  activeRole: SecurityAiRole;
  isSingleModel: boolean;
  hasInstalledModels: boolean;
} {
  const hasInstalledModels = installedModels && installedModels.length > 0;
  const isSingleModel = hasInstalledModels && installedModels.length === 1;

  // Retrieve stored configurations if any
  let storedQuick = "";
  let storedDeep = "";
  let storedRole: SecurityAiRole = "quick";

  try {
    storedQuick = localStorage.getItem(QUICK_STORAGE_KEY) || "";
    storedDeep = localStorage.getItem(DEEP_STORAGE_KEY) || "";
    const r = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (r === "quick" || r === "deep" || r === "deepseek") {
      storedRole = r;
    }
  } catch {
    // LocalStorage unavailable in certain test environments
  }

  // 1. Resolve Quick Model
  let resolvedQuick = storedQuick;
  if (!resolvedQuick || (hasInstalledModels && !isModelInstalled(resolvedQuick, installedModels))) {
    if (isSingleModel) {
      resolvedQuick = installedModels[0];
    } else if (hasInstalledModels) {
      // Find first 1B - 3B candidate
      const cand = installedModels.find(isQuickCandidate);
      resolvedQuick = cand || installedModels[0];
    } else {
      resolvedQuick = RECOMMENDED_QUICK_MODEL;
    }
  }

  // 2. Resolve Deep Model
  let resolvedDeep = storedDeep;
  if (!resolvedDeep || (hasInstalledModels && !isModelInstalled(resolvedDeep, installedModels))) {
    if (isSingleModel) {
      resolvedDeep = installedModels[0];
    } else if (hasInstalledModels) {
      // Find first 7B - 14B candidate, preferring appsec-teacher or 8b
      const cand =
        installedModels.find((m) => m.toLowerCase().includes("appsec-teacher-8b")) ||
        installedModels.find(isDeepCandidate) ||
        installedModels[installedModels.length - 1];
      resolvedDeep = cand || installedModels[0];
    } else {
      resolvedDeep = RECOMMENDED_DEEP_MODEL;
    }
  }

  return {
    quickModel: resolvedQuick,
    deepModel: resolvedDeep,
    activeRole: storedRole,
    isSingleModel,
    hasInstalledModels,
  };
}

/**
 * Persists the configured slots and active role to localStorage
 */
export function persistAiWorkspaceConfig(config: SecurityAiWorkspaceConfig): void {
  try {
    localStorage.setItem(QUICK_STORAGE_KEY, config.quick_model);
    localStorage.setItem(DEEP_STORAGE_KEY, config.deep_model);
    localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, config.active_model_role);
  } catch (err) {
    console.warn("Failed to persist AI workspace settings to localStorage:", err);
  }
}
