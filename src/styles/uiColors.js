export const UI_COLORS = Object.freeze({
  brand: "#0B4968",
  brandHover: "#083A54",
  brandActive: "#062F45",
  brandSoft: "rgba(11, 73, 104, 0.14)",
  brandSoftSubtle: "rgba(11, 73, 104, 0.08)",
  brandBorder: "#94B3C1",
  brandRadialTint: "rgba(11, 73, 104, 0.09)",

  accent: "#2F7D5B",
  accentHover: "#286B4F",
  accentActive: "#205640",
  accentSoft: "rgba(47, 125, 91, 0.16)",
  accentSoftSubtle: "rgba(47, 125, 91, 0.09)",
  accentBorder: "#9BC5B1",
  accentRadialTint: "rgba(47, 125, 91, 0.11)",

  ink: "#25343A",
  inkSecondary: "#4B5D64",
  inkTertiary: "#65757B",

  background: "#F2F5F5",
  surface: "#FFFFFF",
  surfaceMuted: "#F6F8F8",
  border: "#D5DEE1",
  borderStrong: "#B7C5C9",
  onBrand: "#FFFFFF",
  onBrandMuted: "#DDE8EA",
  disabledBackground: "#DCE4E6",
  disabledText: "#718086",

  success: "#2F7D5B",
  warning: "#A66918",
  error: "#B34D58",

  shadowXs: "0 1px 3px rgba(37, 52, 58, 0.12)",
  shadowSm: "0 4px 12px rgba(37, 52, 58, 0.14)",
  shadowMd: "0 12px 26px rgba(37, 52, 58, 0.18)",
  focusRing: "0 0 0 3px rgba(11, 73, 104, 0.24)",
});

export const UI_CSS_VARIABLES = Object.freeze({
  "--color-brand": UI_COLORS.brand,
  "--color-brand-hover": UI_COLORS.brandHover,
  "--color-brand-active": UI_COLORS.brandActive,
  "--color-brand-soft": UI_COLORS.brandSoft,
  "--color-brand-soft-subtle": UI_COLORS.brandSoftSubtle,
  "--color-brand-border": UI_COLORS.brandBorder,
  "--brand-radial-tint": UI_COLORS.brandRadialTint,
  "--color-accent": UI_COLORS.accent,
  "--color-accent-hover": UI_COLORS.accentHover,
  "--color-accent-active": UI_COLORS.accentActive,
  "--color-accent-soft": UI_COLORS.accentSoft,
  "--color-accent-soft-subtle": UI_COLORS.accentSoftSubtle,
  "--color-accent-border": UI_COLORS.accentBorder,
  "--accent-radial-tint": UI_COLORS.accentRadialTint,
  "--color-ink": UI_COLORS.ink,
  "--color-ink-secondary": UI_COLORS.inkSecondary,
  "--color-ink-tertiary": UI_COLORS.inkTertiary,
  "--color-bg": UI_COLORS.background,
  "--color-surface": UI_COLORS.surface,
  "--color-surface-muted": UI_COLORS.surfaceMuted,
  "--color-border": UI_COLORS.border,
  "--color-border-strong": UI_COLORS.borderStrong,
  "--color-on-brand": UI_COLORS.onBrand,
  "--color-on-brand-muted": UI_COLORS.onBrandMuted,
  "--color-disabled-bg": UI_COLORS.disabledBackground,
  "--color-disabled-text": UI_COLORS.disabledText,
  "--color-success": UI_COLORS.success,
  "--color-warning": UI_COLORS.warning,
  "--color-error": UI_COLORS.error,
  "--shadow-xs": UI_COLORS.shadowXs,
  "--shadow-sm": UI_COLORS.shadowSm,
  "--shadow-md": UI_COLORS.shadowMd,
  "--focus-ring": UI_COLORS.focusRing,
});

export function applyUiColorVariables(
  root = globalThis.document?.documentElement,
) {
  if (!root?.style) return;
  Object.entries(UI_CSS_VARIABLES).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}
