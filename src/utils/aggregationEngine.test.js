import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deriveAggregationColumnsForRows,
  deriveAggregationRows,
} from "./aggregationEngine.js";

test("deriveAggregationRows computes data and quarantine columns", () => {
  const result = deriveAggregationRows({
    mode: "single",
    dataframe: [{ score: 2 }],
    quarantineData: [{ score: 4 }],
    columns: [
      {
        name: "scorePlusOne",
        formula: '(r) => r["score"] + 1',
      },
    ],
  });

  assert.equal(result.data[0].scorePlusOne, 3);
  assert.equal(result.quarantineData[0].scorePlusOne, 5);
});

test("deriveAggregationColumnsForRows applies dependent columns in order", () => {
  const rows = deriveAggregationColumnsForRows(
    [{ a: 2, b: 3 }],
    [
      {
        name: "sum",
        formula: '(r) => r["a"] + r["b"]',
      },
      {
        name: "doubleSum",
        formula: '(r) => r["sum"] * 2',
      },
    ],
  );

  assert.deepEqual(rows, [{ a: 2, b: 3, sum: 5, doubleSum: 10 }]);
});
