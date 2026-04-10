import { createSelector } from "@reduxjs/toolkit";

import { HIDDEN_VARIABLES, VariableTypes } from "@/utils/Constants";
import { MAIN_CONFIG_DEFAULTS } from "./configDefaults";

export const selectMainState = (state) => state.main;
export const selectDataframeState = (state) => state.dataframe;

export const selectMainDataframe = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.dataframe,
);

export const selectDemoLoadStatus = createSelector(
  [selectMainState],
  (mainState) => mainState.demoLoadStatus,
);

export const selectHasMainData = createSelector(
  [selectMainDataframe],
  (dataframe) => Array.isArray(dataframe) && dataframe.length > 0,
);

export const selectIsDemoLoading = createSelector(
  [selectDemoLoadStatus],
  (demoLoadStatus) => demoLoadStatus === "loading",
);

export const selectVarTypes = createSelector(
  [selectMainState],
  (mainState) => mainState.varTypes,
);

export const selectMainConfig = createSelector(
  [selectMainState],
  (mainState) => mainState.config || MAIN_CONFIG_DEFAULTS,
);

export const selectShowInformativeTooltips = createSelector(
  [selectMainConfig],
  (config) => config.showInformativeTooltips !== false,
);

export const selectAppOpenMode = createSelector(
  [selectMainConfig],
  (config) => (config.appOpenMode === "tab" ? "tab" : "window"),
);

export const selectAppBrandColor = createSelector(
  [selectMainConfig],
  (config) =>
    typeof config.appBrandColor === "string" &&
    config.appBrandColor.trim().length > 0
      ? config.appBrandColor
      : MAIN_CONFIG_DEFAULTS.appBrandColor,
);

export const selectNavioColumns = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.navioColumns,
);

const isSelectableColumn = (key, navioColumns) =>
  typeof key === "string" &&
  key.trim().length > 0 &&
  navioColumns?.includes(key) &&
  !HIDDEN_VARIABLES.includes(key);

const createVarTypeSelector = (predicate) =>
  createSelector([selectVarTypes, selectNavioColumns], (varTypes, navioColumns) =>
    Object.entries(varTypes)
      .filter(([key, type]) => predicate(type) && isSelectableColumn(key, navioColumns))
      .map(([key]) => key),
  );

export const selectNumericVars = createVarTypeSelector(
  (type) => type === VariableTypes.NUMERICAL,
);

export const selectCategoricalVars = createVarTypeSelector(
  (type) => type === VariableTypes.CATEGORICAL,
);

export const selectUnknownVars = createVarTypeSelector(
  (type) => type === VariableTypes.UNKNOWN,
);

// Backward-compatible alias for older imports.
export const selectUnkownVars = selectUnknownVars;

export const selectVars = createVarTypeSelector(
  (type) =>
    type === VariableTypes.CATEGORICAL || type === VariableTypes.NUMERICAL,
);

export const selectNavioVars = createSelector(
  [selectVarTypes, selectNavioColumns],
  (varTypes, navioColumns) =>
    Object.keys(varTypes).filter((key) => isSelectableColumn(key, navioColumns)),
);
