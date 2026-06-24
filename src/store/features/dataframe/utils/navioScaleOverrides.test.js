import assert from "node:assert/strict";
import test from "node:test";

import {
  filterValidNavioScaleOverrides,
  pruneNavioScaleOverrides,
  renameNavioScaleOverride,
  setNavioScaleOverrideValue,
} from "./navioScaleOverrides.js";

test("navio scale override helpers set, clear, rename, and prune overrides", () => {
  let overrides = setNavioScaleOverrideValue({}, "score", "ordered");
  assert.deepEqual(overrides, { score: "ordered" });

  overrides = renameNavioScaleOverride(overrides, "score", "memory_score");
  assert.deepEqual(overrides, { memory_score: "ordered" });

  overrides = setNavioScaleOverrideValue(overrides, "group", "categorical");
  assert.deepEqual(overrides, {
    group: "categorical",
    memory_score: "ordered",
  });

  overrides = setNavioScaleOverrideValue(overrides, "group", null);
  assert.deepEqual(overrides, { memory_score: "ordered" });

  overrides = setNavioScaleOverrideValue(overrides, "memory_score", "number");
  assert.deepEqual(overrides, {});

  overrides = pruneNavioScaleOverrides(overrides, ["group"]);
  assert.deepEqual(overrides, {});

  assert.deepEqual(
    filterValidNavioScaleOverrides({ score: "ordered", age: "number" }),
    { score: "ordered" },
  );

  const validOverrides = { score: "ordered" };
  assert.equal(filterValidNavioScaleOverrides(validOverrides), validOverrides);
});
