import assert from "node:assert/strict";
import test from "node:test";

import { getApplicableTests } from "./applicableTests.js";

const tests = [
  {
    label: "numeric pair",
    variableType: "number",
    isApplicable: (groups) => groups === 2,
  },
  {
    label: "numeric multi-group",
    variableType: "number",
    isApplicable: (groups) => groups >= 2,
  },
  {
    label: "categorical",
    variableType: "string",
    isApplicable: (groups) => groups >= 2,
  },
];

test("filters by group count and selected variable type", () => {
  assert.deepEqual(
    getApplicableTests(tests, { groupCount: 3, variableType: "number" }).map(
      ({ label }) => label,
    ),
    ["numeric multi-group"],
  );
});

test("keeps every compatible variable type when no variable is selected", () => {
  assert.deepEqual(
    getApplicableTests(tests, { groupCount: 2 }).map(({ label }) => label),
    ["numeric pair", "numeric multi-group", "categorical"],
  );
});
