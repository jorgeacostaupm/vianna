import test from "node:test";
import assert from "node:assert/strict";

import { selectHasMainData } from "./selectors.js";

test("selectHasMainData stays true when loaded data has no visible rows", () => {
  assert.equal(
    selectHasMainData({
      dataframe: {
        dataframe: [],
        filename: "study",
      },
    }),
    true,
  );
});

test("selectHasMainData stays false for an accidental empty dataframe", () => {
  assert.equal(
    selectHasMainData({
      dataframe: {
        dataframe: [],
        filename: null,
      },
    }),
    false,
  );
});
