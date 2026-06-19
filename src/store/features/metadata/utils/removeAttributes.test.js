import assert from "node:assert/strict";
import test from "node:test";

import { applyAttributeRemovals } from "./removeAttributes.js";

test("applyAttributeRemovals removes selected descendants in one batch", () => {
  const state = {
    attributes: [
      {
        id: 0,
        name: "root",
        type: "root",
        related: [1],
        aggregationConfig: { usedAttributes: [] },
      },
      {
        id: 1,
        name: "parent",
        type: "aggregation",
        related: [2],
        aggregationConfig: { usedAttributes: [] },
      },
      {
        id: 2,
        name: "child",
        type: "attribute",
        related: [3],
        aggregationConfig: { usedAttributes: [] },
      },
      {
        id: 3,
        name: "grandchild",
        type: "attribute",
        related: [],
        aggregationConfig: { usedAttributes: [] },
      },
    ],
    recoverableOperations: [],
    hierarchyRevision: 0,
  };

  const removedCount = applyAttributeRemovals(state, [2, 1], undefined);

  assert.equal(removedCount, 2);
  assert.deepEqual(
    state.attributes.map((node) => node.id),
    [0, 3],
  );
  assert.deepEqual(state.attributes[0].related, [3]);
  assert.equal(state.hierarchyRevision, -0.5);
});
