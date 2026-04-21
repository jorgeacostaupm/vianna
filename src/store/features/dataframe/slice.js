import { createSlice } from "@reduxjs/toolkit";
import * as aq from "arquero";

import {
  generateColumn,
  generateColumnBatch,
  generateEmpty,
  removeBatch,
  removeColumn,
  syncNavioColumns,
} from "./thunks";

import { updateHierarchy } from "../metadata/thunks";

import { generateTree, getVisibleNodes } from "@/utils/functions";

import { replaceValuesWithNull, updateData } from "./thunks";
import {
  areColumnsEqual,
  syncSelectionFromDataframe,
} from "./utils/sliceUtils";
import {
  createSelectionRefForAllRows,
  resolveSelectionRefPayload,
  selectionHasEmptyValues,
} from "./utils/selectionRef";

const initialState = {
  filename: null,
  loadingDataUpload: false,

  dataframe: null,
  original: null,

  selection: null,
  selectionRef: createSelectionRefForAllRows([]),
  selectionIds: null,

  hasEmptyValues: false,

  navioColumns: [],
  navioUiState: null,
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
      if (!areColumnsEqual(state.navioColumns, nextColumns)) {
        state.navioColumns = nextColumns;
      }
    },

    setSelection: (state, action) => {
      state.selectionRef = resolveSelectionRefPayload(action.payload, state.dataframe);
      state.selection = null;
      state.hasEmptyValues = selectionHasEmptyValues({
        dataframe: state.dataframe,
        selectionRef: state.selectionRef,
        visibleColumns: state.navioColumns,
      });
    },

    renameColumn: (state, action) => {
      const { prevName, newName } = action.payload;
      state.dataframe = aq
        .from(state.dataframe)
        .rename({ [prevName]: newName })
        .objects();

      const navColIdx = state.navioColumns.findIndex((n) => n === prevName);
      state.navioColumns[navColIdx] = newName;

      state.version += 1;
    },

    updateConfig: (state, action) => {
      const { field, value } = action.payload;
      state.config = { ...state.config, [field]: value };
    },
    setNavioUiState: (state, action) => {
      state.navioUiState = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateHierarchy.fulfilled, (state, action) => {
      const { hierarchy } = action.payload;
      const tree = generateTree(hierarchy, 0);
      const filtered = getVisibleNodes(tree);

      state.navioColumns = filtered;
      state.hasEmptyValues = selectionHasEmptyValues({
        dataframe: state.dataframe,
        selectionRef: state.selectionRef,
        visibleColumns: state.navioColumns,
      });
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
        state.original = columnNames;
      }

      state.dataframe = items;
      state.selectionRef = createSelectionRefForAllRows(items);
      state.selection = null;
      state.hasEmptyValues = selectionHasEmptyValues({
        dataframe: state.dataframe,
        selectionRef: state.selectionRef,
        visibleColumns: state.navioColumns,
      });
      state.navioUiState = null;
      state.version = 0;
      state.nullifiedValues = [];
    });

    builder.addCase(updateData.rejected, (state) => {
      state.loadingDataUpload = false;
    });

    builder
      .addCase(syncNavioColumns.fulfilled, (state, action) => {
        const nextColumns = Array.isArray(action.payload?.columns)
          ? action.payload.columns
          : [];

        if (!areColumnsEqual(state.navioColumns, nextColumns)) {
          state.navioColumns = nextColumns;
        }

        state.hasEmptyValues = Boolean(action.payload?.hasEmptyValues);
      })
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
      .addCase(generateEmpty.fulfilled, (state, action) => {
        syncSelectionFromDataframe(state, action.payload);
        state.version += 1;
      })
      .addCase(removeColumn.fulfilled, (state, action) => {
        syncSelectionFromDataframe(state, action.payload);
        state.version += 1;
      })
      .addCase(removeBatch.fulfilled, (state, action) => {
        syncSelectionFromDataframe(state, action.payload);
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
  setNavioColumns,
  setDataframe,
  setSelection,
  setNavioUiState,
  updateConfig,
} = dataSlice.actions;

/* const deriveOperation = (a, o, t, f) => {
  switch (t) {
    case "string":
      return `(r) => string(r[\"${a}\"])`;
    case "number":
      return `(r) => parse_float(r[\"${a}\"])`;
    case "date":
      if (o == "string") {
        return `(r) => parseDate(r[\"${a}\"], \"${f}\")`; // todo add format
      } else if (o == "number") {
        return `(r) => parseUnixDate(r[\"${a}\"])`; // todo add format
      } else {
        return `(r) => r[\"${a}\"]`;
      }
    default:
      return "(r) => null";
  }
}; */
