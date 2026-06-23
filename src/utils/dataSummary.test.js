import assert from "node:assert/strict";
import test from "node:test";

import { getDistinctValueCount } from "./dataSummary.js";

test("getDistinctValueCount counts non-empty distinct subject identifiers", () => {
  const rows = [
    { id: "s1" },
    { id: "s1" },
    { id: "s2" },
    { id: "" },
    { id: "   " },
    { id: null },
  ];

  assert.equal(getDistinctValueCount(rows, "id"), 2);
});
