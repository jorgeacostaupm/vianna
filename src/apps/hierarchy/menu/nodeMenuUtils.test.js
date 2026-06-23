import test from "node:test";
import assert from "node:assert/strict";

import { buildAggregationMenuNodes } from "./aggregationMenuNodes.js";

test("buildAggregationMenuNodes falls back to global variables for measure nodes", () => {
  const attributes = [
    { id: 0, name: "root", type: "root" },
    { id: 1, name: "Age", type: "attribute" },
    { id: 2, name: "Score", type: "attribute" },
    {
      id: 3,
      name: "Derived",
      type: "aggregation",
      aggregationConfig: { usedAttributes: [2] },
    },
  ];

  const nodes = buildAggregationMenuNodes({
    attributes,
    node: attributes[3],
    relatedNodes: [],
  });

  assert.deepEqual(nodes, [
    { id: 1, name: "Age", weight: 1, used: false },
    { id: 2, name: "Score", weight: 1, used: true },
  ]);
});

test("buildAggregationMenuNodes prefers related child nodes when present", () => {
  const node = {
    id: 4,
    name: "Domain",
    aggregationConfig: { usedAttributes: [2] },
  };
  const relatedNodes = [
    { id: 1, name: "Age", type: "attribute" },
    { id: 2, name: "Score", type: "attribute" },
  ];

  const nodes = buildAggregationMenuNodes({
    attributes: [{ id: 3, name: "Global", type: "attribute" }],
    node,
    relatedNodes,
  });

  assert.deepEqual(
    nodes.map((availableNode) => availableNode.name),
    ["Age", "Score"],
  );
});
