import React from "react";
import {
  Globe,
  Webhook,
  Terminal,
  Code2,
  Smartphone,
  Monitor,
  Radio,
  Cloud,
  FlaskConical,
  Shield,
} from "lucide-react";
import { SecurityCategory } from "./types";
import { CATEGORY_REGISTRY, ALL_SECURITY_CATEGORIES } from "./registry";

interface CategorySelectorProps {
  activeCategory: SecurityCategory;
  onSelectCategory: (category: SecurityCategory) => void;
  compact?: boolean;
}

export function getCategoryIcon(iconName: string, size = 16, color?: string) {
  switch (iconName) {
    case "Globe":
      return <Globe size={size} color={color} />;
    case "Webhook":
      return <Webhook size={size} color={color} />;
    case "Terminal":
      return <Terminal size={size} color={color} />;
    case "Code2":
      return <Code2 size={size} color={color} />;
    case "Smartphone":
      return <Smartphone size={size} color={color} />;
    case "Monitor":
      return <Monitor size={size} color={color} />;
    case "Radio":
      return <Radio size={size} color={color} />;
    case "Cloud":
      return <Cloud size={size} color={color} />;
    case "FlaskConical":
      return <FlaskConical size={size} color={color} />;
    default:
      return <Shield size={size} color={color} />;
  }
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  activeCategory,
  onSelectCategory,
  compact = false,
}) => {
  const currentDef = CATEGORY_REGISTRY[activeCategory] || CATEGORY_REGISTRY.web;

  if (compact) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <select
          value={activeCategory}
          onChange={(e) => onSelectCategory(e.target.value as SecurityCategory)}
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: `1px solid ${currentDef.color}`,
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
          data-testid="category-compact-select"
        >
          {ALL_SECURITY_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.shortLabel}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        overflowX: "auto",
        padding: "6px 2px",
        scrollbarWidth: "none",
      }}
      data-testid="category-selector-pillbar"
    >
      {ALL_SECURITY_CATEGORIES.map((cat) => {
        const isActive = cat.id === activeCategory;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: "0.82rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#ffffff" : "var(--text-secondary)",
              background: isActive
                ? `linear-gradient(135deg, ${cat.color}, #1e293b)`
                : "var(--bg-card)",
              border: isActive
                ? `1px solid ${cat.color}`
                : "1px solid var(--border-color)",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              whiteSpace: "nowrap",
              boxShadow: isActive ? `0 2px 10px ${cat.color}33` : "none",
            }}
            data-testid={`category-pill-${cat.id}`}
            title={cat.description}
          >
            {getCategoryIcon(cat.iconName, 14, isActive ? "#ffffff" : cat.color)}
            <span>{cat.shortLabel}</span>
            {isActive && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  display: "inline-block",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
