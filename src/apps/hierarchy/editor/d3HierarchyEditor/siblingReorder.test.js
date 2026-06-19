import test from "node:test";
import assert from "node:assert/strict";

import { getSiblingReorderIndex } from "./siblingReorder.js";

test("sibling reorder waits until the dragged node leaves the target drop radius", () => {
  const sortedSiblings = [{ x: 60 }, { x: 120 }];

  assert.equal(
    getSiblingReorderIndex({
      draggedX: 99,
      originalIndex: 0,
      sortedSiblings,
      assignRadius: 40,
    }),
    0,
  );

  assert.equal(
    getSiblingReorderIndex({
      draggedX: 101,
      originalIndex: 0,
      sortedSiblings,
      assignRadius: 40,
    }),
    1,
  );
});
