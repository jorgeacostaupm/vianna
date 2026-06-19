import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ORDER_VARIABLE } from "../../../../utils/constants.js";
import { createSelectionRefForAllRows } from "./selectionRef.js";
import {
  buildMissingByAttribute,
  getAddedColumns,
  getMissingOrderValuesInSelection,
  getRemovedColumns,
  selectionHasMissingInAttributes,
} from "./missingValues.js";

describe("missingValues", () => {
  const rows = [
    { [ORDER_VARIABLE]: 1, age: 72, score: null, diagnosis: "MCI" },
    { [ORDER_VARIABLE]: 2, age: null, score: 12, diagnosis: undefined },
    { [ORDER_VARIABLE]: 3, age: 69, score: 8, diagnosis: "HC" },
  ];

  it("indexes missing values by attribute", () => {
    assert.deepEqual(buildMissingByAttribute(rows), {
      score: [1],
      age: [2],
      diagnosis: [2],
    });
  });

  it("checks only the active attributes in the current selection", () => {
    const missingByAttribute = buildMissingByAttribute(rows);
    const selectionRef = createSelectionRefForAllRows(rows);

    assert.equal(
      selectionHasMissingInAttributes({
        dataframe: rows,
        selectionRef,
        missingByAttribute,
        attributeIds: ["score"],
      }),
      true,
    );

    assert.equal(
      selectionHasMissingInAttributes({
        dataframe: rows,
        selectionRef,
        missingByAttribute,
        attributeIds: ["diagnosis"],
      }),
      true,
    );

    assert.deepEqual(
      getMissingOrderValuesInSelection({
        dataframe: rows,
        selectionRef: {
          mode: "include",
          runs: [[1, 1]],
          totalRows: 3,
          selectedCount: 1,
        },
        missingByAttribute,
        attributeIds: ["age", "diagnosis"],
      }),
      [],
    );
  });

  it("detects added and removed active columns", () => {
    assert.deepEqual(getAddedColumns(["age"], ["age", "score"]), ["score"]);
    assert.deepEqual(getRemovedColumns(["age", "score"], ["score"]), ["age"]);
  });
});
