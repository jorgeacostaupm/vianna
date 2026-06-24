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
      metadata: {
        loadingHierarchy: true,
        attributes: [{ id: 1 }],
        hierarchyViewSettings: {
          orientation: "horizontal",
          linkStyle: "elbow",
          viewConfig: { nodeScale: 1.4 },
        },
      },
      dataframe: {
        loadingDataUpload: true,
        filename: "data.csv",
        dataframe: [{ id: "p1" }],
        navioScaleOverrides: { age: "ordered" },
      },
      notifications: { items: ["ignore"] },
    },
    "#/comparison",
  );

  assert.equal(snapshot.route, "#/comparison");
  assert.equal(snapshot.state.main.demoLoadStatus, "idle");
  assert.equal(snapshot.state.dataframe.loadingDataUpload, false);
  assert.deepEqual(snapshot.state.dataframe.navioScaleOverrides, {
    age: "ordered",
  });
  assert.equal(snapshot.state.metadata.loadingHierarchy, false);
  assert.equal(snapshot.state.metadata.hierarchyViewSettings.orientation, "horizontal");
  assert.equal(snapshot.state.metadata.hierarchyViewSettings.linkStyle, "elbow");
  assert.equal(snapshot.state.metadata.hierarchyViewSettings.viewConfig.nodeScale, 1.4);
  assert.equal(snapshot.state.notifications, undefined);
  assert.equal(workspaceHasContent(snapshot), true);
});

test("workspace restore preserves current notifications", () => {
  const workspace = normalizeWorkspace({
    state: {
      main: { idVar: "subject" },
      dataframe: {
        dataframe: [],
        navioScaleOverrides: { age: "ordered" },
      },
    },
  });
  const restored = applyWorkspaceState(
    { main: { idVar: "old" }, notifications: { items: ["keep"] } },
    workspace,
  );

  assert.equal(restored.main.idVar, "subject");
  assert.deepEqual(restored.dataframe.navioScaleOverrides, {
    age: "ordered",
  });
  assert.deepEqual(restored.notifications, { items: ["keep"] });
});
