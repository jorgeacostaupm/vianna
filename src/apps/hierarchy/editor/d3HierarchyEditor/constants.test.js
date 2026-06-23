import test from "node:test";
import assert from "node:assert/strict";

import {
  assignRadius,
  getGhostCircleMinDistance,
  ghostCircleGap,
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

test("getGhostCircleMinDistance keeps ghost circles separated by the configured gap", () => {
  assert.equal(
    getGhostCircleMinDistance(assignRadius),
    assignRadius * 2 + ghostCircleGap,
  );
});
