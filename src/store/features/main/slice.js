import { createSlice } from "@reduxjs/toolkit";

import { getVariableTypes } from "@/utils/functions";
import {
  loadDemoData,
  nullsToQuarantine,
  setGroupVar,
  setIdVar,
  setTimeVar,
} from "./thunks";
import {
  applyGeneratedColumns,
  resetMainDataContext,
  syncSelectionContextFromItems,
} from "./utils/sliceUtils";
import {
  convertColumnType,
  generateColumn,
  generateColumnBatch,
  updateData,
} from "../dataframe/thunks";
import { setDataframe, setSelection } from "../dataframe/slice";
import { MAIN_CONFIG_DEFAULTS } from "./configDefaults";

const initialState = {
  selectedIds: [],
  scenarioRunResults: [],

  notApi: null,

  init: false,
  initQuarantine: false,

  hasEmptyValues: false,

  quarantineData: [],
  quarantineSelection: null,
  quarantineNavioUiState: null,
  quarantineVersion: 0,
  filteredData: null,

  pop_metadata: null,

  descriptions: {},

  idVar: null,
  groupVar: null,
  timeVar: null,

  ids: null,
  groups: null,
  timestamps: null,

  selectionIds: null,
  selectionGroups: null,
  selectionTimestamps: null,

  varTypes: {},
  demoLoadStatus: "idle",

  config: {
    ...MAIN_CONFIG_DEFAULTS,
  },
};

const mainSlice = createSlice({
  name: "main",
  initialState,
  reducers: {
    setInit: (state, action) => {
      state.init = action.payload;
    },
    setFilteredData: (state, action) => {
      state.filteredData = action.payload;
    },
    setInitQuarantine: (state, action) => {
      state.initQuarantine = action.payload;
    },
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
    setAttrWidth: (state, action) => {
      state.config.attrWidth = action.payload;
    },
    setScenarioRunResults: (state, action) => {
      state.scenarioRunResults = action.payload;
    },
    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
    },
    setVarTypes: (state, action) => {
      state.varTypes = action.payload || {};
    },
    updateConfig: (state, action) => {
      const { field, value } = action.payload;
      state.config = { ...state.config, [field]: value };
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setDataframe, (state, action) => {
      syncSelectionContextFromItems(state, action.payload);
    });

    builder.addCase(setSelection, (state, action) => {
      syncSelectionContextFromItems(state, action.payload, { selectionOnly: true });
    });

    builder
      .addCase(setTimeVar.fulfilled, (state, action) => {
        state.timeVar = action.payload.timeVar;
        state.timestamps = action.payload.timestamps;
        state.selectionTimestamps = action.payload.timestamps;
      })
      .addCase(setGroupVar.fulfilled, (state, action) => {
        state.groupVar = action.payload.groupVar;
        state.groups = action.payload.groups;
        state.selectionGroups = action.payload.groups;
      })
      .addCase(setIdVar.fulfilled, (state, action) => {
        state.idVar = action.payload.idVar;
        state.ids = action.payload.ids;
        state.selectionIds = action.payload.ids;
      });

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
      .addCase(loadDemoData.fulfilled, (state) => {
        state.demoLoadStatus = "succeeded";
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
      .addCase(generateColumnBatch.fulfilled, applyGeneratedColumns);

    builder.addCase(convertColumnType.fulfilled, (state, action) => {
      state.varTypes = getVariableTypes(action.payload);
    });
  },
});

export default mainSlice.reducer;

export const {
  setInit,
  setFilteredData,
  setAttrWidth,
  setScenarioRunResults,
  setSelectedIds,
  setInitQuarantine,
  setQuarantineData,
  setQuarantineSelection,
  setQuarantineNavioUiState,
  setVarTypes,
  updateConfig,
} = mainSlice.actions;

export {
  loadDemoData,
  nullsToQuarantine,
  setGroupVar,
  setIdVar,
  setTimeVar,
} from "./thunks";

export {
  selectAppBrandColor,
  selectAppOpenMode,
  selectDemoLoadStatus,
  selectHasMainData,
  selectIsDemoLoading,
  selectMainConfig,
  selectMainDataframe,
  selectCategoricalVars,
  selectNavioColumns,
  selectNavioVars,
  selectNumericVars,
  selectShowInformativeTooltips,
  selectUnknownVars,
  selectUnkownVars,
  selectVarTypes,
  selectVars,
} from "./selectors";
