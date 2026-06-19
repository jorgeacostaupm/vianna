import { createSelector } from "@reduxjs/toolkit";

import { HIDDEN_VARIABLES, VariableTypes } from "../../../utils/constants.js";
import { MAIN_CONFIG_DEFAULTS } from "./configDefaults.js";

const selectMainState = (state) => state.main;
const selectDataframeState = (state) => state.dataframe;

export const selectDemoLoadStatus = createSelector(
  [selectMainState],
  (mainState) => mainState.demoLoadStatus,
);

export const selectHasMainData = createSelector(
  [selectDataframeState],
  (dataframeState) => {
    const dataframe = dataframeState.dataframe;
    const filename = dataframeState.filename;

    return (
      (Array.isArray(dataframe) && dataframe.length > 0) ||
      (typeof filename === "string" && filename.trim().length > 0)
    );
  },
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

export const selectAppOpenMode = createSelector([selectMainConfig], (config) =>
  config.appOpenMode === "tab" ? "tab" : "window",
);

const selectNavioColumns = createSelector(
  [selectDataframeState],
  (dataframeState) => dataframeState.navioColumns,
);

const isSelectableColumn = (key, navioColumns) =>
  typeof key === "string" &&
  key.trim().length > 0 &&
  navioColumns?.includes(key) &&
  !HIDDEN_VARIABLES.includes(key);

const createVarTypeSelector = (predicate) =>
  createSelector(
    [selectVarTypes, selectNavioColumns],
    (varTypes, navioColumns) =>
      Object.entries(varTypes)
        .filter(
          ([key, type]) =>
            predicate(type) && isSelectableColumn(key, navioColumns),
        )
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
    Object.keys(varTypes).filter((key) =>
      isSelectableColumn(key, navioColumns),
    ),
);

export const selectDefaultAnalysisContext = createSelector(
  [selectMainState],
  (mainState) => ({
    idVar: mainState.idVar,
    groupVar: mainState.groupVar,
    timeVar: mainState.timeVar,
  }),
);

export const selectCompareAnalysisContext = createSelector(
  [(state) => state.compare, selectMainState],
  (compareState, mainState) => ({
    idVar: compareState.idVar ?? mainState.idVar,
    groupVar: compareState.groupVar ?? mainState.groupVar,
    timeVar: compareState.timeVar ?? mainState.timeVar,
    localIdVar: compareState.idVar,
    localGroupVar: compareState.groupVar,
    localTimeVar: compareState.timeVar,
  }),
);

export const selectEvolutionAnalysisContext = createSelector(
  [(state) => state.evolution, selectMainState],
  (evolutionState, mainState) => ({
    idVar: evolutionState.idVar ?? mainState.idVar,
    groupVar: evolutionState.groupVar ?? mainState.groupVar,
    timeVar: evolutionState.timeVar ?? mainState.timeVar,
    localIdVar: evolutionState.idVar,
    localGroupVar: evolutionState.groupVar,
    localTimeVar: evolutionState.timeVar,
  }),
);

export const selectCorrelationAnalysisContext = createSelector(
  [(state) => state.correlation, selectMainState],
  (correlationState, mainState) => ({
    idVar: correlationState.idVar ?? mainState.idVar,
    groupVar: correlationState.groupVar ?? mainState.groupVar,
    timeVar: correlationState.timeVar ?? mainState.timeVar,
    localIdVar: correlationState.idVar,
    localGroupVar: correlationState.groupVar,
    localTimeVar: correlationState.timeVar,
  }),
);
