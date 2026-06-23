import * as aq from "arquero";
import { ORDER_VARIABLE } from "@/utils/constants";
import { getFileName, getVariableTypes } from "@/utils/functions";
import { setQuarantineData } from "../main/slice";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { buildMetaFromVariableTypes } from "../metadata/thunks";
import { getAggregationExecutableFormula } from "../metadata/utils/thunkUtils";
import { setDataframe } from "./slice";
import {
  computeAggregationRows,
  getAffectedAggregationNodes,
  normalizeNumericColumn,
  normalizeStringColumn,
  recomputeAggregationColumns,
} from "./utils/thunkUtils";
import {
  removeColumnsFromRows,
  renameColumnInRows,
} from "./utils/rowColumns";

const hasColumnInRows = (rows, column) =>
  Array.isArray(rows) &&
  rows.some(
    (row) =>
      row &&
      typeof row === "object" &&
      Object.prototype.hasOwnProperty.call(row, column),
  );

export const generateColumn = createAsyncThunk(
  "dataframe/agg-generate",
  async (
    { colName, formula, enforceNumber = false },
    { getState, rejectWithValue },
  ) => {
    try {
      const dt = getState().dataframe.dataframe;
      const qt = getState().main.quarantineData;
      return await computeAggregationRows({
        mode: "single",
        dataframe: dt,
        quarantineData: qt,
        columns: [{ name: colName, formula, enforceNumber }],
      });
    } catch (error) {
      console.error(error);
      return rejectWithValue("Error aggregating values");
    }
  },
);

export const generateColumnBatch = createAsyncThunk(
  "dataframe/agg-generate-batch",
  async (
    { cols, dataframe, quarantineData: inputQuarantineData },
    { getState, rejectWithValue },
  ) => {
    try {
      const state = getState();
      const dt = Array.isArray(dataframe)
        ? dataframe
        : state.dataframe.dataframe;
      const qt = Array.isArray(inputQuarantineData)
        ? inputQuarantineData
        : state.main.quarantineData;

      const columns = Array.isArray(cols) ? cols : [];
      const normalizedColumns = columns
        .map((column) => ({
          name: column?.name,
          formula: getAggregationExecutableFormula(column?.aggregationConfig),
          enforceNumber: Boolean(column?.dtype === "number"),
        }))
        .filter((column) => column.name && column.formula);

      if (normalizedColumns.length === 0) {
        return {
          data: Array.isArray(dt) ? dt : [],
          quarantineData: Array.isArray(qt) ? qt : [],
        };
      }

      return await computeAggregationRows({
        mode: "batch",
        dataframe: dt,
        quarantineData: qt,
        columns: normalizedColumns,
      });
    } catch (error) {
      console.error(error);
      return rejectWithValue("Error aggregating batches");
    }
  },
);

export const removeBatch = createAsyncThunk(
  "dataframe/remove-batch",
  async ({ cols }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      return {
        data: removeColumnsFromRows(state.dataframe.dataframe, cols),
        quarantineData: removeColumnsFromRows(state.main.quarantineData, cols),
      };
    } catch {
      return rejectWithValue("Failed to batch remove");
    }
  },
);

export const renameColumnEverywhere = createAsyncThunk(
  "dataframe/rename-column",
  async ({ prevName, newName }, { getState, rejectWithValue }) => {
    try {
      if (!prevName || !newName) {
        throw new Error("Column names are required.");
      }

      const state = getState();
      const dataframe = Array.isArray(state.dataframe.dataframe)
        ? state.dataframe.dataframe
        : [];
      const quarantineData = Array.isArray(state.main.quarantineData)
        ? state.main.quarantineData
        : [];

      if (prevName === newName) {
        return {
          prevName,
          newName,
          data: dataframe,
          quarantineData,
        };
      }

      const hasRows = dataframe.length > 0 || quarantineData.length > 0;
      const sourceExists =
        hasColumnInRows(dataframe, prevName) ||
        hasColumnInRows(quarantineData, prevName);
      if (hasRows && !sourceExists) {
        throw new Error(`Column "${prevName}" was not found in the dataset.`);
      }

      const targetExists =
        hasColumnInRows(dataframe, newName) ||
        hasColumnInRows(quarantineData, newName);
      if (targetExists) {
        throw new Error(`Column "${newName}" already exists in the dataset.`);
      }

      return {
        prevName,
        newName,
        data: renameColumnInRows(dataframe, prevName, newName),
        quarantineData: renameColumnInRows(quarantineData, prevName, newName),
      };
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to rename column.");
    }
  },
);

export const convertColumnType = createAsyncThunk(
  "dataframe/convertColumnType",
  async ({ column, dtype }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const dataframeRows = Array.isArray(state.dataframe.dataframe)
        ? state.dataframe.dataframe
        : [];
      const quarantineRows = Array.isArray(state.main.quarantineData)
        ? state.main.quarantineData
        : [];

      let newData = dataframeRows;
      let newQuarantineData = quarantineRows;

      switch (dtype) {
        case "number": {
          newData = normalizeNumericColumn(dataframeRows, column);
          newQuarantineData = normalizeNumericColumn(quarantineRows, column);
          break;
        }

        case "string":
          newData = normalizeStringColumn(dataframeRows, column);
          newQuarantineData = normalizeStringColumn(quarantineRows, column);
          break;

        default:
          throw new Error(`Unsupported dtype: ${dtype}`);
      }

      dispatch(setDataframe(newData));
      dispatch(setQuarantineData(newQuarantineData));

      return newData;
    } catch (err) {
      console.error(err);
      return rejectWithValue(err?.message || "Error converting column type");
    }
  },
);

export const replaceValuesWithNull = createAsyncThunk(
  "dataframe/replaceValuesWithNull",
  async (value, { getState, dispatch, rejectWithValue }) => {
    try {
      const normalizeComparableValue = (input) => String(input ?? "").trim();
      const valuesToNullify = [
        ...new Set(
          (Array.isArray(value) ? value : [value])
            .flatMap((entry) => String(entry ?? "").split(/[\n;]/))
            .map((entry) => normalizeComparableValue(entry))
            .filter(Boolean),
        ),
      ];
      if (valuesToNullify.length === 0) {
        return {
          values: [],
          replacedCount: 0,
        };
      }

      const shouldNullify = (rowValue) =>
        rowValue != null &&
        valuesToNullify.some((candidate) => {
          const normalizedRowValue = normalizeComparableValue(rowValue);
          return normalizedRowValue === candidate || rowValue == candidate;
        });

      const state = getState();
      let dataframe = Array.isArray(state.dataframe.dataframe)
        ? state.dataframe.dataframe
        : [];
      let quarantineData = Array.isArray(state.main.quarantineData)
        ? state.main.quarantineData
        : [];
      const hierarchy = Array.isArray(state.metadata?.attributes)
        ? state.metadata.attributes
        : [];
      let replacedCount = 0;
      const changedColumns = new Set();

      const nullifyRows = (rows) =>
        rows.map((row) => {
          if (!row || typeof row !== "object") return row;

          let rowChanged = false;
          const nextRow = { ...row };
          Object.keys(nextRow).forEach((key) => {
            if (shouldNullify(nextRow[key])) {
              nextRow[key] = null;
              replacedCount += 1;
              changedColumns.add(key);
              rowChanged = true;
            }
          });

          return rowChanged ? nextRow : row;
        });

      dataframe = nullifyRows(dataframe);
      quarantineData = nullifyRows(quarantineData);

      if (changedColumns.size > 0 && hierarchy.length > 0) {
        const orderedNodes = getAffectedAggregationNodes(hierarchy, [
          ...changedColumns,
        ]);
        if (orderedNodes.length > 0) {
          dataframe = recomputeAggregationColumns(dataframe, orderedNodes);
          quarantineData = recomputeAggregationColumns(
            quarantineData,
            orderedNodes,
          );
        }
      }

      dispatch(setDataframe(dataframe));
      dispatch(setQuarantineData(quarantineData));

      return {
        values: valuesToNullify,
        replacedCount,
      };
    } catch {
      return rejectWithValue("Something went wrong nullifiying values");
    }
  },
);

export const updateData = createAsyncThunk(
  "dataframe/load-import",
  async (
    { data, filename, isGenerateHierarchy },
    { dispatch, rejectWithValue },
  ) => {
    try {
      let dt = aq.from(data);
      const meta = getVariableTypes(data);
      dt = dt.derive({ [ORDER_VARIABLE]: aq.op.row_number() });
      if (isGenerateHierarchy) {
        await dispatch(buildMetaFromVariableTypes(meta)).unwrap();
      }
      return {
        filename: getFileName(filename),
        items: dt.objects(),
        columnNames: dt.columnNames().filter((d) => d !== ORDER_VARIABLE),
        isNewColumns: isGenerateHierarchy,
        varTypes: meta,
      };
    } catch {
      return rejectWithValue("Something is wrong with API data");
    }
  },
);
