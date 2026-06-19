import test from "node:test";
import assert from "node:assert/strict";

import { resolveYDomain } from "./yDomain.js";

test("resolveYDomain preserves strict manual bounds when both limits are provided", () => {
  const domain = resolveYDomain([9.9, 20.1], {
    yAxisMode: "manual",
    yAxisMin: 10,
    yAxisMax: 20,
  });

  assert.deepEqual(domain, [10, 20]);
});

test("resolveYDomain preserves the provided manual minimum when auto max matches it", () => {
  const domain = resolveYDomain([10, 10], {
    yAxisMode: "manual",
    yAxisMin: 10,
    yAxisMax: null,
  });

  assert.equal(domain[0], 10);
  assert.ok(domain[1] > 10);
});

test("resolveYDomain preserves the provided manual maximum when auto min matches it", () => {
  const domain = resolveYDomain([20, 20], {
    yAxisMode: "manual",
    yAxisMin: null,
    yAxisMax: 20,
  });

  assert.ok(domain[0] < 20);
  assert.equal(domain[1], 20);
});
