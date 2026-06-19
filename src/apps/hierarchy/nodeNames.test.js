import test from "node:test";
import assert from "node:assert/strict";

import {
  createUniqueGeneratedNodeName,
  createUniqueNodeName,
} from "./nodeNames.js";

test("createUniqueGeneratedNodeName skips existing generated node names", () => {
  const nodes = [{ name: "node_1" }, { name: "node_2" }, { name: "age" }];

  assert.equal(createUniqueGeneratedNodeName(nodes, 1), "node_3");
});

test("createUniqueNodeName preserves unique manual names and suffixes duplicates", () => {
  const nodes = [{ name: "Score" }, { name: "Score_2" }];

  assert.equal(createUniqueNodeName(nodes, "New Score", 3), "New Score");
  assert.equal(createUniqueNodeName(nodes, "Score", 3), "Score_3");
});
