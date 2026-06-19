import assert from "node:assert/strict";
import test from "node:test";

import { getAppNavigationByPathname } from "./apps.js";

test("welcome and overview are independent routes", () => {
  assert.equal(getAppNavigationByPathname("/welcome").id, "welcome");
  assert.equal(getAppNavigationByPathname("/overview").id, "overview");
  assert.equal(getAppNavigationByPathname("/").id, "welcome");
});
