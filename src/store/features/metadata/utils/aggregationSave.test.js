import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAggregationSavePayload } from "./aggregationSave.js";

test("aggregation without executable formula is persisted as unknown", () => {
  const payload = {
    id: 1,
    type: "aggregation",
    dtype: "number",
  };
  const aggregationConfig = {
    operation: "custom",
    formula: "$(missing",
    usedAttributes: [2],
  };

  assert.deepEqual(
    normalizeAggregationSavePayload(payload, aggregationConfig, false),
    {
      id: 1,
      type: "aggregation",
      dtype: "determine",
      aggregationConfig: {
        operation: "custom",
        formula: "",
        usedAttributes: [],
      },
    },
  );
});

test("aggregation with executable formula keeps its selected dtype", () => {
  const payload = {
    id: 1,
    type: "aggregation",
    dtype: "number",
  };
  const aggregationConfig = {
    operation: "custom",
    formula: "$(score)",
    usedAttributes: [2],
  };

  assert.deepEqual(
    normalizeAggregationSavePayload(payload, aggregationConfig, true),
    {
      id: 1,
      type: "aggregation",
      dtype: "number",
      aggregationConfig,
    },
  );
});
