import assert from "node:assert/strict";
import test from "node:test";

import { findAssetBundleEntries } from "./assetBundle.js";

test("findAssetBundleEntries accepts required bundle names", () => {
  const entries = findAssetBundleEntries([
    { name: "folder/data.csv" },
    { name: "folder/hierachy.json" },
    { name: "folder/descriptions.json" },
  ]);

  assert.equal(entries.data.name, "folder/data.csv");
  assert.equal(entries.hierarchy.name, "folder/hierachy.json");
  assert.equal(entries.descriptions.name, "folder/descriptions.json");
});

test("findAssetBundleEntries reports missing assets", () => {
  assert.throws(
    () => findAssetBundleEntries([{ name: "data.csv" }]),
    /hierarchy, descriptions/,
  );
});
