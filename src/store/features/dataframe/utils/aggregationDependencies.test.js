import assert from "node:assert/strict";
import test from "node:test";

import { getAffectedAggregationNodes } from "./aggregationDependencies.js";

test("getAffectedAggregationNodes returns transitive aggregations in dependency order", () => {
  const attributes = [
    { id: 1, name: "score", type: "attribute" },
    { id: 2, name: "bonus", type: "attribute" },
    {
      id: 3,
      name: "total",
      type: "aggregation",
      aggregationConfig: {
        usedAttributes: [1],
        formula: "$(score) + 1",
      },
    },
    {
      id: 4,
      name: "final",
      type: "aggregation",
      aggregationConfig: {
        usedAttributes: [],
        formula: "$(total) + $(bonus)",
      },
    },
  ];

  assert.deepEqual(
    getAffectedAggregationNodes(attributes, "score").map((node) => node.name),
    ["total", "final"],
  );
});
