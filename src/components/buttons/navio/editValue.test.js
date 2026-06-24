import assert from "node:assert/strict";
import test from "node:test";

import {
  EDIT_VALUE_TYPE,
  isValidEditNumber,
  resolveEditValue,
} from "./editValue.js";

test("edit value resolver keeps numeric text or converts it to a finite number", () => {
  assert.equal(resolveEditValue("42", EDIT_VALUE_TYPE.TEXT), "42");
  assert.equal(resolveEditValue("42", EDIT_VALUE_TYPE.NUMBER), 42);
  assert.equal(resolveEditValue(" 3.5 ", EDIT_VALUE_TYPE.NUMBER), 3.5);

  assert.equal(isValidEditNumber(""), false);
  assert.equal(isValidEditNumber("Infinity"), false);
  assert.throws(() => resolveEditValue("abc", EDIT_VALUE_TYPE.NUMBER));
});
