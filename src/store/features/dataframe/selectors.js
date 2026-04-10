import { createSelector } from "@reduxjs/toolkit";

export const selectDataframeState = (state) => state.dataframe;

export const selectDataframe = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.dataframe,
);

export const selectSelection = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.selection,
);

export const selectNavioColumns = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.navioColumns || [],
);
