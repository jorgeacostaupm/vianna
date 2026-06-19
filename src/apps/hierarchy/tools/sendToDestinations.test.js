import test from "node:test";
import assert from "node:assert/strict";

import { getSendToDestinations } from "./sendToDestinations.js";

const makeNode = ({ id, name, parent = null }) => {
  const node = {
    id,
    data: { id, name, type: id === 0 ? "root" : "aggregation" },
    parent,
    children: [],
  };

  if (parent) parent.children.push(node);

  node.ancestors = () => {
    const nodes = [];
    let current = node;
    while (current) {
      nodes.push(current);
      current = current.parent;
    }
    return nodes;
  };

  node.descendants = () => [
    node,
    ...node.children.flatMap((child) => child.descendants()),
  ];

  return node;
};

test("send-to destinations exclude the moving node and descendants", () => {
  const root = makeNode({ id: 0, name: "Root" });
  const cognition = makeNode({ id: 1, name: "Cognition", parent: root });
  makeNode({ id: 2, name: "Memory", parent: cognition });
  makeNode({ id: 3, name: "Clinical", parent: root });

  const destinations = getSendToDestinations({
    root,
    movingNodes: [cognition],
    query: "",
  });

  assert.deepEqual(
    destinations.map((destination) => destination.id),
    [0, 3],
  );
});
