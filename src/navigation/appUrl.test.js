import assert from "node:assert/strict";
import test from "node:test";

import { buildAppUrl } from "./appUrl.js";

const location = {
  origin: "http://localhost:5173",
  pathname: "/vianna/",
  search: "",
};

test("buildAppUrl keeps the root hash to one slash", () => {
  assert.equal(buildAppUrl("/", location), "http://localhost:5173/vianna/#/");
});

test("buildAppUrl accepts routes with or without a leading slash", () => {
  assert.equal(
    buildAppUrl("comparison", location),
    "http://localhost:5173/vianna/#/comparison",
  );
  assert.equal(
    buildAppUrl("/comparison", location),
    "http://localhost:5173/vianna/#/comparison",
  );
});
