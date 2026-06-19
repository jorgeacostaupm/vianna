import assert from "node:assert/strict";
import test from "node:test";

import { removeColumnsFromRows } from "./rowColumns.js";

test("removeColumnsFromRows removes requested columns and ignores missing ones", () => {
  const unchangedRow = { id: 2, score: 8 };
  const rows = [
    { id: 1, score: 10, generated: 11 },
    unchangedRow,
    null,
  ];

  const result = removeColumnsFromRows(rows, ["generated", "missing"]);

  assert.deepEqual(result, [
    { id: 1, score: 10 },
    { id: 2, score: 8 },
    null,
  ]);
  assert.equal(result[1], unchangedRow);
});
