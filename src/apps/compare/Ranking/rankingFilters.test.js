import test from "node:test";
import assert from "node:assert/strict";

import { getVisibleRankingData } from "./rankingFilters.js";

test("getVisibleRankingData filters by p-value and absolute effect size", () => {
  const rows = [
    { variable: "small", value: 0.2, p_value: 0.01 },
    { variable: "negative", value: -0.8, pValue: 0.02 },
    { variable: "large", value: 1.2, p_value: 0.04 },
    { variable: "not-significant", value: 2, p_value: 0.2 },
    { variable: "excluded", value: 3, p_value: 0.001 },
  ];

  const visible = getVisibleRankingData(rows, {
    filterList: ["excluded"],
    pValue: 0.05,
    effectSize: 0.5,
    desc: true,
    nBars: 2,
  });

  assert.deepEqual(
    visible.map((item) => item.variable),
    ["large", "negative"],
  );
});
