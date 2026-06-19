import { createSlice } from "@reduxjs/toolkit";

import { getVariableTypes } from "@/utils/functions";
import {
  loadDemoData,
  nullsToQuarantine,
} from "./thunks";
import {
  applyGeneratedColumns,
  resetMainDataContext,
} from "./utils/sliceUtils";
import {
  convertColumnType,
  generateColumn,
  generateColumnBatch,
  removeBatch,
  updateData,
} from "../dataframe/thunks";
import { MAIN_CONFIG_DEFAULTS } from "./configDefaults";

const initialState = {
  quarantineData: [],
  quarantineSelection: null,
  quarantineNavioUiState: null,
  quarantineVersion: 0,

  idVar: null,
  groupVar: null,
  timeVar: null,

  varTypes: {},
  demoLoadStatus: "idle",
  openApps: [],

  config: {
    ...MAIN_CONFIG_DEFAULTS,
  },
};

const mainSlice = createSlice({
  name: "main",
  initialState,
  reducers: {
    setQuarantineData: (state, action) => {
      state.quarantineData = action.payload;
      state.quarantineSelection = action.payload;
      state.quarantineNavioUiState = null;
      state.quarantineVersion += 1;
    },
    setQuarantineSelection: (state, action) => {
      state.quarantineSelection = action.payload;
    },
    setQuarantineNavioUiState: (state, action) => {
      state.quarantineNavioUiState = action.payload || null;
    },
    setVarTypes: (state, action) => {
      state.varTypes = action.payload || {};
    },
    setTimeVar: (state, action) => {
      state.timeVar = action.payload;
    },
    setGroupVar: (state, action) => {
      state.groupVar = action.payload;
    },
    setIdVar: (state, action) => {
      state.idVar = action.payload;
    },
    updateConfig: (state, action) => {
      const { field, value } = action.payload;
      state.config = { ...state.config, [field]: value };
    },
    registerOpenApp: (state, action) => {
      const appId = action.payload;
      if (!appId || state.openApps.includes(appId)) return;
      state.openApps.push(appId);
    },
    unregisterOpenApp: (state, action) => {
      const appId = action.payload;
      state.openApps = state.openApps.filter((id) => id !== appId);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(nullsToQuarantine.fulfilled, (state, action) => {
      const quarantineData = Array.isArray(action.payload?.quarantineData)
        ? action.payload.quarantineData
        : [];

      state.quarantineData = [...state.quarantineData, ...quarantineData];
      state.quarantineSelection = state.quarantineData;
      state.quarantineNavioUiState = null;
      state.quarantineVersion += 1;
    });

    builder
      .addCase(loadDemoData.pending, (state) => {
        state.demoLoadStatus = "loading";
      })
      .addCase(loadDemoData.fulfilled, (state, action) => {
        state.demoLoadStatus = "succeeded";
        state.idVar = action.payload?.idVar ?? state.idVar;
      })
      .addCase(loadDemoData.rejected, (state) => {
        state.demoLoadStatus = "failed";
      });

    builder.addCase(updateData.fulfilled, (state, action) => {
      const { varTypes } = action.payload;
      state.varTypes = varTypes;
      resetMainDataContext(state);
    });

    builder
      .addCase(generateColumn.fulfilled, applyGeneratedColumns)
      .addCase(generateColumnBatch.fulfilled, applyGeneratedColumns)
      .addCase(removeBatch.fulfilled, applyGeneratedColumns);

    builder.addCase(convertColumnType.fulfilled, (state, action) => {
      state.varTypes = getVariableTypes(action.payload);
    });
  },
});

export default mainSlice.reducer;

export const {
  setQuarantineData,
  setQuarantineSelection,
  setQuarantineNavioUiState,
  setVarTypes,
  setTimeVar,
  setGroupVar,
  setIdVar,
  updateConfig,
  registerOpenApp,
  unregisterOpenApp,
} = mainSlice.actions;

export {
  loadDemoData,
  nullsToQuarantine,
} from "./thunks";

export {
  selectAppOpenMode,
  selectDemoLoadStatus,
  selectHasMainData,
  selectIsDemoLoading,
  selectMainConfig,
  selectDefaultAnalysisContext,
  selectCompareAnalysisContext,
  selectEvolutionAnalysisContext,
  selectCorrelationAnalysisContext,
  selectCategoricalVars,
  selectNavioVars,
  selectNumericVars,
  selectShowInformativeTooltips,
  selectUnknownVars,
  selectUnkownVars,
  selectVarTypes,
  selectVars,
} from "./selectors";
