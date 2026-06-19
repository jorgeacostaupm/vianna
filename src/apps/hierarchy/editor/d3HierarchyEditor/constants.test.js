import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveTransitionDuration,
  transitionDuration,
} from "./constants.js";

test("resolveTransitionDuration keeps normal hierarchy animations enabled", () => {
  assert.equal(resolveTransitionDuration(), transitionDuration);
});

test("resolveTransitionDuration skips hierarchy animations when requested", () => {
  assert.equal(resolveTransitionDuration({ instant: true }), 0);
  assert.equal(
    resolveTransitionDuration({ animateTransitions: false }),
    0,
  );
});
