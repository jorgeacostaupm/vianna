import test from "node:test";
import assert from "node:assert/strict";

import { NodeColors } from "../../../../utils/constants.js";
import { resolveNodeColor } from "./nodeColor.js";

test("numeric measure nodes keep the numeric color without a formula", () => {
  assert.equal(
    resolveNodeColor({
      type: "aggregation",
      dtype: "number",
      aggregationConfig: { formula: "", usedAttributes: [] },
    }),
    NodeColors.NUMERICAL,
  );
});

test("unknown aggregation nodes without a formula are white", () => {
  assert.equal(
    resolveNodeColor({
      type: "aggregation",
      dtype: "determine",
      aggregationConfig: { formula: "", usedAttributes: [] },
    }),
    "white",
  );
});
