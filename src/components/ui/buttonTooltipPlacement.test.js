import assert from "node:assert/strict";
import test from "node:test";

import { getStackedButtonTooltipPlacement } from "./buttonTooltipPlacement.js";

test("stacked button tooltips point away from the sidebar edges", () => {
  assert.equal(getStackedButtonTooltipPlacement(0, 5), "top");
  assert.equal(getStackedButtonTooltipPlacement(1, 5), "right");
  assert.equal(getStackedButtonTooltipPlacement(3, 5), "right");
  assert.equal(getStackedButtonTooltipPlacement(4, 5), "bottom");
});

test("a single stacked button keeps the top placement", () => {
  assert.equal(getStackedButtonTooltipPlacement(0, 1), "top");
});
