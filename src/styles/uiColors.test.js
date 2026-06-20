import assert from "node:assert/strict";
import test from "node:test";

import { UI_COLORS } from "./uiColors.js";

const luminance = (hex) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (left, right) => {
  const leftLuminance = luminance(left);
  const rightLuminance = luminance(right);
  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  );
};

test("UI text and brand colors meet WCAG AA on their intended surfaces", () => {
  assert.ok(contrast(UI_COLORS.brand, UI_COLORS.onBrand) >= 4.5);
  assert.ok(contrast(UI_COLORS.accent, UI_COLORS.onBrand) >= 4.5);
  assert.ok(contrast(UI_COLORS.inkTertiary, UI_COLORS.surface) >= 4.5);
});
