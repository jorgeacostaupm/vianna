import test from "node:test";
import assert from "node:assert/strict";

import {
  classifySubjectsByCompleteness,
  selectSubjectIdsByCompleteness,
} from "./evolutionCompleteness.js";

const rows = [
  { id: "p1", time: "T1", value: 10 },
  { id: "p1", time: "T2", value: 20 },
  { id: "p1", time: "T3", value: 30 },
  { id: "p2", time: "T1", value: 11 },
  { id: "p2", time: "T2", value: 21 },
  { id: "p3", time: "T2", value: 22 },
  { id: "p3", time: "T3", value: 32 },
  { id: "p4", time: "T1", value: null },
  { id: "p4", time: "T3", value: 33 },
];

const options = {
  idVar: "id",
  timeVar: "time",
  valueVar: "value",
};

test("classifySubjectsByCompleteness separates complete and incomplete subjects", () => {
  const { completeIds, incompleteIds, timesById } =
    classifySubjectsByCompleteness(rows, ["T1", "T2", "T3"], options);

  assert.deepEqual([...completeIds], ["p1"]);
  assert.deepEqual([...incompleteIds].sort(), ["p2", "p3", "p4"]);
  assert.deepEqual([...timesById.get("p4")], ["T3"]);
});

test("selectSubjectIdsByCompleteness filters incomplete subjects by required timestamps", () => {
  const allSelected = selectSubjectIdsByCompleteness(rows, ["T1", "T2", "T3"], {
    ...options,
    showComplete: false,
    showIncomplete: true,
  });
  assert.deepEqual([...allSelected.selectedIds].sort(), ["p2", "p3", "p4"]);

  const filtered = selectSubjectIdsByCompleteness(rows, ["T1", "T2", "T3"], {
    ...options,
    showComplete: false,
    showIncomplete: true,
    incompleteRequiredTimes: ["T2"],
  });
  assert.deepEqual([...filtered.selectedIds].sort(), ["p2", "p3"]);

  const filteredMulti = selectSubjectIdsByCompleteness(
    rows,
    ["T1", "T2", "T3"],
    {
      ...options,
      showComplete: false,
      showIncomplete: true,
      incompleteRequiredTimes: ["T1", "T3"],
    },
  );
  assert.deepEqual([...filteredMulti.selectedIds].sort(), ["p2", "p3", "p4"]);

  const mixed = selectSubjectIdsByCompleteness(rows, ["T1", "T2", "T3"], {
    ...options,
    showComplete: true,
    showIncomplete: true,
    incompleteRequiredTimes: ["T2"],
  });
  assert.deepEqual([...mixed.selectedIds].sort(), ["p1", "p2", "p3"]);
});
