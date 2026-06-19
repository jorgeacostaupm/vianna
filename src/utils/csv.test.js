import assert from "node:assert/strict";
import test from "node:test";

import { getRowColumns, toCsv } from "./csv.js";

test("toCsv uses every row column and escapes CSV control characters", () => {
  const rows = [{ id: 1, text: 'a,"b"' }, { id: 2, extra: "later" }];

  assert.deepEqual(getRowColumns(rows), ["id", "text", "extra"]);
  assert.equal(
    toCsv(rows),
    'id,text,extra\n1,"a,""b""",\n2,,later',
  );
});
