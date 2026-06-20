import styles from "./AppButton.module.css";

export const APP_BUTTON_VARIANTS = Object.freeze({
  UNSTYLED: "unstyled",
  BRAND: "brand",
  TOOLBAR: "toolbar",
  TOOLBAR_MUTED: "toolbarMuted",
  PANEL: "panel",
  ACTION: "action",
  BORDERED: "bordered",
});

const VARIANT_CLASS_MAP = Object.freeze({
  [APP_BUTTON_VARIANTS.UNSTYLED]: "",
  [APP_BUTTON_VARIANTS.BRAND]: "",
  [APP_BUTTON_VARIANTS.TOOLBAR]: styles.toolbarButton,
  [APP_BUTTON_VARIANTS.TOOLBAR_MUTED]: styles.toolbarButtonMuted,
  [APP_BUTTON_VARIANTS.PANEL]: styles.panelButton,
  [APP_BUTTON_VARIANTS.ACTION]: styles.actionButton,
  [APP_BUTTON_VARIANTS.BORDERED]: styles.borderedButton,
});

export const APP_BUTTON_PRESETS = Object.freeze({
  BRAND: "brand",
  TOOLBAR_ICON: "toolbarIcon",
  PANEL_ICON: "panelIcon",
  ACTION: "action",
});

const PRESET_PROPS_MAP = Object.freeze({
  [APP_BUTTON_PRESETS.BRAND]: {
    variant: APP_BUTTON_VARIANTS.BRAND,
    type: "primary",
  },
  [APP_BUTTON_PRESETS.TOOLBAR_ICON]: {
    variant: APP_BUTTON_VARIANTS.TOOLBAR,
    size: "small",
  },
  [APP_BUTTON_PRESETS.PANEL_ICON]: {
    variant: APP_BUTTON_VARIANTS.PANEL,
    size: "large",
  },
  [APP_BUTTON_PRESETS.ACTION]: {
    variant: APP_BUTTON_VARIANTS.ACTION,
  },
});

export function resolveButtonVariantClassName(variant) {
  return VARIANT_CLASS_MAP[variant] ?? "";
}

export function resolveButtonPresetProps(preset) {
  return PRESET_PROPS_MAP[preset] ?? null;
}

export function resolveButtonActiveClassName(active) {
  return active ? styles.buttonActive : "";
}
