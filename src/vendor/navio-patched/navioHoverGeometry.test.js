import assert from "node:assert/strict";
import test from "node:test";

import {
  getNavioBrushOverlayWidth,
  isNavioXWithinAttribBounds,
} from "./navio.js";

test("brush overlay width is local to the visible attribute span", () => {
  assert.equal(getNavioBrushOverlayWidth(320, 620), 300);
});

test("hover bounds reject the empty area to the right of attributes", () => {
  assert.equal(isNavioXWithinAttribBounds(621, 320, 620), false);
  assert.equal(isNavioXWithinAttribBounds(620, 320, 620), true);
});
