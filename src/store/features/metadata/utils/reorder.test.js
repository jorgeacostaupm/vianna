import assert from "node:assert/strict";
import test from "node:test";

import { moveRelatedIdsAsBlock } from "./reorder.js";

test("moveRelatedIdsAsBlock moves selected siblings as one ordered block", () => {
  assert.deepEqual(
    moveRelatedIdsAsBlock([1, 2, 3, 4, 5], [2, 4], 3),
    [1, 3, 5, 2, 4],
  );
});

test("moveRelatedIdsAsBlock rejects partial sibling selections", () => {
  const related = [1, 2, 3];

  assert.equal(moveRelatedIdsAsBlock(related, [2, 9], 0), related);
});
