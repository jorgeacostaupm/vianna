import { createSelector } from "@reduxjs/toolkit";

import {
  EMPTY_SELECTION_REF,
  getSelectionOrderValuesFromDataframe,
  projectSelectionRows,
} from "./utils/selectionRef";

export const selectDataframeState = (state) => state.dataframe;

export const selectDataframe = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.dataframe,
);

export const selectNavioColumns = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.navioColumns || [],
);

export const selectSelectionRef = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.selectionRef || EMPTY_SELECTION_REF,
);

export const selectSelectionOrderValues = createSelector(
  [selectDataframe, selectSelectionRef],
  (dataframe, selectionRef) =>
    getSelectionOrderValuesFromDataframe(selectionRef, dataframe),
);

export const selectSelection = createSelector(
  [selectDataframe, selectSelectionRef, selectNavioColumns],
  (dataframe, selectionRef, navioColumns) =>
    projectSelectionRows({
      dataframe,
      selectionRef,
      fallbackColumns: navioColumns,
    }),
);

export const makeSelectProjectedSelection = () =>
  createSelector(
    [
      selectDataframe,
      selectSelectionRef,
      selectNavioColumns,
      (_state, requiredColumns) => requiredColumns,
    ],
    (dataframe, selectionRef, navioColumns, requiredColumns) =>
      projectSelectionRows({
        dataframe,
        selectionRef,
        requiredColumns,
        fallbackColumns: navioColumns,
      }),
  );
