import { createSelector } from "@reduxjs/toolkit";
import { DataType } from "@/utils/Constants";

export const hierarchySelector = (state) => state.metadata.attributes;
export const selectHierarchy = (state) => state.metadata.attributes;
export const selectMetadataAttributes = (state) =>
  state.metadata.attributes || [];
export const selectCanUndoNodeAssignment = (state) =>
  (state.metadata.assignmentUndoStack?.length ?? 0) > 0;
export const selectCanRedoNodeAssignment = (state) =>
  (state.metadata.assignmentRedoStack?.length ?? 0) > 0;

export const selectNumericNodes = createSelector(
  [selectHierarchy],
  (hierarchy) =>
    hierarchy
      .filter((n) => n.dtype === DataType.NUMERICAL.dtype)
      .map((n) => n.name),
);

export const selectTextNodes = createSelector([selectHierarchy], (hierarchy) =>
  hierarchy.filter((n) => n.dtype === DataType.TEXT.dtype).map((n) => n.name),
);
export const selectDetermineNodes = createSelector(
  [selectHierarchy],
  (hierarchy) =>
    hierarchy
      .filter((n) => n.dtype === DataType.UNKNOWN.dtype)
      .map((n) => n.name),
);

export const selectAggregationNodes = createSelector(
  [selectHierarchy],
  (hierarchy) =>
    hierarchy.filter((n) => n.type === "aggregation").map((n) => n.name),
);

export const selectDescribedNodes = createSelector(
  [selectHierarchy],
  (hierarchy) => hierarchy.filter((n) => n.desc).map((n) => n.name),
);
