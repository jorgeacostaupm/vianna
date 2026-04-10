const HEX_SHORT_RE = /^[0-9a-fA-F]{3}$/;
const HEX_FULL_RE = /^[0-9a-fA-F]{6}$/;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clampChannel = (value) => clamp(Math.round(value), 0, 255);

export const DEFAULT_BRAND_COLOR = "#4e6698";

const normalizeHexColor = (value) => {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/^#/, "");
  if (HEX_SHORT_RE.test(raw)) {
    return `#${raw
      .split("")
      .map((channel) => channel + channel)
      .join("")
      .toLowerCase()}`;
  }
  if (HEX_FULL_RE.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
};

const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex) || DEFAULT_BRAND_COLOR;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }) => {
  const toHex = (channel) => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixRgb = (base, target, weight) => {
  const ratio = clamp(weight, 0, 1);
  return {
    r: base.r + (target.r - base.r) * ratio,
    g: base.g + (target.g - base.g) * ratio,
    b: base.b + (target.b - base.b) * ratio,
  };
};

const tone = (hexColor, amount) => {
  const base = hexToRgb(hexColor);
  const target = amount >= 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  return rgbToHex(mixRgb(base, target, Math.abs(amount)));
};

const rgba = (hexColor, alpha) => {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

export const sanitizeBrandColor = (value) =>
  normalizeHexColor(value) || DEFAULT_BRAND_COLOR;

export const buildBrandPalette = (colorValue) => {
  const brandColor = sanitizeBrandColor(colorValue);
  const brandHover = tone(brandColor, -0.12);
  const brandActive = tone(brandColor, -0.24);
  const brandSoft = rgba(brandColor, 0.16);
  const brandSoftSubtle = rgba(brandColor, 0.12);
  const brandRadialTint = rgba(brandColor, 0.12);
  const focusRingColor = rgba(brandColor, 0.25);

  return {
    brandColor,
    brandHover,
    brandActive,
    brandSoft,
    brandSoftSubtle,
    brandRadialTint,
    focusRingColor,
    brandBorder: tone(brandColor, 0.55),
    chartSeries1: brandColor,
    chartSeries2: tone(brandColor, 0.1),
    chartSeries3: tone(brandColor, 0.2),
    chartSeries4: tone(brandColor, 0.3),
    chartSeries5: tone(brandColor, -0.08),
    chartSeries6: tone(brandColor, 0.08),
    chartSeries7: tone(brandColor, 0.18),
    chartSeries8: tone(brandColor, 0.28),
    chartSeries9: tone(brandColor, -0.18),
    chartSeries10: tone(brandColor, 0.36),
  };
};

export const applyBrandCssVariables = (colorValue) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = buildBrandPalette(colorValue);

  root.style.setProperty("--color-brand", palette.brandColor);
  root.style.setProperty("--color-brand-hover", palette.brandHover);
  root.style.setProperty("--color-brand-active", palette.brandActive);
  root.style.setProperty("--color-brand-soft", palette.brandSoft);
  root.style.setProperty("--primary-color", palette.brandColor);
  root.style.setProperty("--chart-focus", palette.brandColor);
  root.style.setProperty("--focus-ring", `0 0 0 3px ${palette.focusRingColor}`);
  root.style.setProperty("--brand-radial-tint", palette.brandRadialTint);
  root.style.setProperty("--chart-series-1", palette.chartSeries1);
  root.style.setProperty("--chart-series-2", palette.chartSeries2);
  root.style.setProperty("--chart-series-3", palette.chartSeries3);
  root.style.setProperty("--chart-series-4", palette.chartSeries4);
  root.style.setProperty("--chart-series-5", palette.chartSeries5);
  root.style.setProperty("--chart-series-6", palette.chartSeries6);
  root.style.setProperty("--chart-series-7", palette.chartSeries7);
  root.style.setProperty("--chart-series-8", palette.chartSeries8);
  root.style.setProperty("--chart-series-9", palette.chartSeries9);
  root.style.setProperty("--chart-series-10", palette.chartSeries10);
};
