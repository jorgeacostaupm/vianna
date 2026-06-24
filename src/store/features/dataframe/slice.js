import { createSlice } from "@reduxjs/toolkit";

import {
  generateColumn,
  generateColumnBatch,
  renameColumnEverywhere,
  removeBatch,
} from "./thunks";

import { updateHierarchy } from "../metadata/thunks";

import { generateTree, getVisibleNodes } from "@/utils/functions";

import { replaceValuesWithNull, updateData } from "./thunks";
import {
  syncMissingStateForColumns,
  syncMissingStateForSelection,
  syncSelectionFromDataframe,
} from "./utils/sliceUtils";
import {
  pruneNavioScaleOverrides,
  renameNavioScaleOverride,
  setNavioScaleOverrideValue,
} from "./utils/navioScaleOverrides";
import {
  createSelectionRefForAllRows,
  resolveSelectionRefPayload,
} from "./utils/selectionRef";
import {
  buildMissingByAttribute,
  EMPTY_MISSING_BY_ATTRIBUTE,
  selectionHasMissingInAttributes,
} from "./utils/missingValues";
import { renameColumnInRows } from "./utils/rowColumns";

const initialState = {
  filename: null,
  loadingDataUpload: false,

  dataframe: null,

  selectionRef: createSelectionRefForAllRows([]),

  hasEmptyValues: false,
  missingByAttribute: EMPTY_MISSING_BY_ATTRIBUTE,

  navioColumns: [],
  navioUiState: null,
  navioScaleOverrides: {},
  navioScaleTypes: [],
  version: -1,

  config: {
    attrWidth: 30,
    navioLabelHeight: 150,
    navioHeight: 700,
  },

  nullifiedValues: [],
};

const dataSlice = createSlice({
  name: "dataframe",
  initialState: initialState,
  reducers: {
    setDataframe: (state, action) => {
      syncSelectionFromDataframe(state, action.payload);
      state.navioUiState = null;
      state.version += 1;
    },

    setNavioColumns: (state, action) => {
      const nextColumns = Array.isArray(action.payload) ? action.payload : [];
      syncMissingStateForColumns(state, nextColumns);
      state.navioScaleOverrides = pruneNavioScaleOverrides(
        state.navioScaleOverrides,
        state.navioColumns,
      );
    },

    setSelection: (state, action) => {
      state.selectionRef = resolveSelectionRefPayload(
        action.payload,
        state.dataframe,
      );
      syncMissingStateForSelection(state);
    },

    renameColumn: (state, action) => {
      const { prevName, newName } = action.payload;
      state.dataframe = renameColumnInRows(state.dataframe, prevName, newName);

      const navColIdx = state.navioColumns.findIndex((n) => n === prevName);
      if (navColIdx !== -1) state.navioColumns[navColIdx] = newName;
      state.navioScaleOverrides = renameNavioScaleOverride(
        state.navioScaleOverrides,
        prevName,
        newName,
      );
      state.missingByAttribute = buildMissingByAttribute(state.dataframe);
      syncMissingStateForSelection(state);

      state.version += 1;
    },

    updateConfig: (state, action) => {
      const { field, value } = action.payload;
      state.config = { ...state.config, [field]: value };
    },
    setNavioUiState: (state, action) => {
      state.navioUiState = action.payload || null;
    },
    setNavioScaleTypes: (state, action) => {
      state.navioScaleTypes = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    setNavioScaleOverride: (state, action) => {
      const { attribute, type } = action.payload || {};
      if (!attribute) return;

      state.navioScaleOverrides = setNavioScaleOverrideValue(
        state.navioScaleOverrides,
        attribute,
        type,
      );
      state.navioUiState = null;
    },
    clearNavioScaleOverrides: (state) => {
      state.navioScaleOverrides = {};
      state.navioUiState = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateHierarchy.fulfilled, (state, action) => {
      const { hierarchy } = action.payload;
      const tree = generateTree(hierarchy, 0);
      const filtered = getVisibleNodes(tree);

      syncMissingStateForColumns(state, filtered);
      state.navioScaleOverrides = pruneNavioScaleOverrides(
        state.navioScaleOverrides,
        state.navioColumns,
      );
    });

    builder.addCase(updateData.pending, (state) => {
      state.loadingDataUpload = true;
    });

    builder.addCase(updateData.fulfilled, (state, action) => {
      const { columnNames, filename, items, isNewColumns } = action.payload;
      state.filename = filename;
      state.loadingDataUpload = false;

      if (isNewColumns) {
        state.navioColumns = columnNames;
        state.navioScaleOverrides = pruneNavioScaleOverrides(
          state.navioScaleOverrides,
          state.navioColumns,
        );
      }

      state.dataframe = items;
      state.selectionRef = createSelectionRefForAllRows(items);
      state.missingByAttribute = buildMissingByAttribute(items);
      state.hasEmptyValues = selectionHasMissingInAttributes({
        dataframe: state.dataframe,
        selectionRef: state.selectionRef,
        missingByAttribute: state.missingByAttribute,
        attributeIds: state.navioColumns,
      });
      state.navioUiState = null;
      state.navioScaleTypes = [];
      state.version = 0;
      state.nullifiedValues = [];
    });

    builder.addCase(updateData.rejected, (state) => {
      state.loadingDataUpload = false;
    });

    builder
      .addCase(generateColumn.fulfilled, (state, action) => {
        syncSelectionFromDataframe(state, action.payload.data);
        state.version += 1;
      })
      .addCase(generateColumn.rejected, () => {});

    builder.addCase(generateColumnBatch.fulfilled, (state, action) => {
      syncSelectionFromDataframe(state, action.payload.data);
      state.version += 1;
    });

    builder
      .addCase(removeBatch.fulfilled, (state, action) => {
        syncSelectionFromDataframe(state, action.payload.data);
        state.version += 1;
      });

    builder.addCase(renameColumnEverywhere.fulfilled, (state, action) => {
      const { data, prevName, newName } = action.payload;
      state.navioColumns = Array.isArray(state.navioColumns)
        ? state.navioColumns.map((column) =>
            column === prevName ? newName : column,
          )
        : [];
      state.navioScaleOverrides = renameNavioScaleOverride(
        state.navioScaleOverrides,
        prevName,
        newName,
      );
      syncSelectionFromDataframe(state, data);
      state.navioUiState = null;
      state.version += 1;
    });

    builder.addCase(replaceValuesWithNull.fulfilled, (state, action) => {
      const previousValues = Array.isArray(state.nullifiedValues)
        ? state.nullifiedValues
        : [];
      const nextValues = Array.isArray(action.payload?.values)
        ? action.payload.values
        : [];
      state.nullifiedValues = [...new Set([...previousValues, ...nextValues])];
    });
  },
});

export default dataSlice.reducer;
export const {
  renameColumn,
  clearNavioScaleOverrides,
  setNavioColumns,
  setDataframe,
  setSelection,
  setNavioScaleOverride,
  setNavioScaleTypes,
  setNavioUiState,
  updateConfig,
} = dataSlice.actions;
