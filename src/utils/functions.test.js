import assert from "node:assert/strict";
import test from "node:test";

import { getVariableTypes } from "./variableTypes.js";

test("getVariableTypes preserves primitive and cardinality classification", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    numeric: index - 6,
    categorical: index % 2 ? "a" : "b",
    orderedText: `value-${index}`,
    ignored: [index],
  }));

  assert.deepEqual(getVariableTypes(rows), {
    numeric: "number",
    categorical: "string",
    orderedText: "number",
  });
});
