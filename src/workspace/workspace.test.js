import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWorkspaceState,
  createWorkspaceSnapshot,
  normalizeWorkspace,
  workspaceHasContent,
} from "./workspace.js";

test("workspace snapshot keeps restorable state and runtime flags out", () => {
  const snapshot = createWorkspaceSnapshot(
    {
      main: { demoLoadStatus: "loading", idVar: "id" },
      compare: { workspace: { views: [{ id: "v1" }], layout: [] } },
      evolution: {},
      correlation: {},
      metadata: { loadingHierarchy: true, attributes: [{ id: 1 }] },
      dataframe: {
        loadingDataUpload: true,
        filename: "data.csv",
        dataframe: [{ id: "p1" }],
      },
      notifications: { items: ["ignore"] },
    },
    "#/comparison",
  );

  assert.equal(snapshot.route, "#/comparison");
  assert.equal(snapshot.state.main.demoLoadStatus, "idle");
  assert.equal(snapshot.state.dataframe.loadingDataUpload, false);
  assert.equal(snapshot.state.metadata.loadingHierarchy, false);
  assert.equal(snapshot.state.notifications, undefined);
  assert.equal(workspaceHasContent(snapshot), true);
});

test("workspace restore preserves current notifications", () => {
  const workspace = normalizeWorkspace({
    state: {
      main: { idVar: "subject" },
      dataframe: { dataframe: [] },
    },
  });
  const restored = applyWorkspaceState(
    { main: { idVar: "old" }, notifications: { items: ["keep"] } },
    workspace,
  );

  assert.equal(restored.main.idVar, "subject");
  assert.deepEqual(restored.notifications, { items: ["keep"] });
});
