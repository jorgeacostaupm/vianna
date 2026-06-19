import { createSelector } from "@reduxjs/toolkit";

export const selectHierarchy = (state) => state.metadata.attributes;
export const selectCanUndoNodeAssignment = (state) =>
  (state.metadata.assignmentUndoStack?.length ?? 0) > 0;
export const selectCanRedoNodeAssignment = (state) =>
  (state.metadata.assignmentRedoStack?.length ?? 0) > 0;

export const selectDescribedNodes = createSelector(
  [selectHierarchy],
  (hierarchy) => hierarchy.filter((n) => n.description).map((n) => n.name),
);

export const selectAttributeDescriptionsByName = createSelector(
  [selectHierarchy],
  (hierarchy) =>
    hierarchy.reduce((acc, node) => {
      if (node?.type === "root" || !node?.name) return acc;
      acc[node.name] =
        typeof node.description === "string" ? node.description : "";
      return acc;
    }, {}),
);
