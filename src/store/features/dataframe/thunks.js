import * as aq from "arquero";
import { ORDER_VARIABLE } from "@/utils/constants";
import { getFileName, getVariableTypes } from "@/utils/functions";
import { setQuarantineData } from "../main/slice";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { buildMetaFromVariableTypes } from "../metadata/thunks";
import { setDataframe } from "./slice";
import {
  areColumnsEqual,
} from "./utils/sliceUtils";
import {
  selectionHasEmptyValues,
} from "./utils/selectionRef";
import {
  computeAggregationRows,
  getAggregationDependencies,
  normalizeNumericColumn,
  normalizeStringColumn,
  recomputeAggregationColumns,
  sortAggregationsByDependency,
} from "./utils/thunkUtils";

export const syncNavioColumns = createAsyncThunk(
  "dataframe/syncNavioColumns",
  async (columns, { getState, rejectWithValue }) => {
    try {
      const dataframeState = getState().dataframe;
      const nextColumns = Array.isArray(columns) ? columns : [];
      const currentColumns = Array.isArray(dataframeState.navioColumns)
        ? dataframeState.navioColumns
        : [];
      const effectiveColumns = areColumnsEqual(currentColumns, nextColumns)
        ? currentColumns
        : nextColumns;

      const hasEmptyValues = selectionHasEmptyValues({
        dataframe: dataframeState.dataframe,
        selectionRef: dataframeState.selectionRef,
        visibleColumns: effectiveColumns,
      });

      return {
        columns: effectiveColumns,
        hasEmptyValues,
      };
    } catch (err) {
      return rejectWithValue(err?.message || "Error syncing navio columns.");
    }
  },
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
        .filter((column) => column?.name && column?.info?.exec)
        .map((column) => ({
          name: column.name,
          formula: column.info.exec,
          enforceNumber: Boolean(column?.dtype === "number"),
        }));

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

export const generateEmpty = createAsyncThunk(
  "dataframe/agg-empty",
  async ({ colName }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dataframe;
      const result = aq
        .from(state.dataframe)
        .derive({ [colName]: () => null }, { drop: false })
        .objects();
      return result;
    } catch {
      return rejectWithValue("Empty aggregation failed");
    }
  },
);

export const removeColumn = createAsyncThunk(
  "dataframe/remove-col",
  async ({ colName }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dataframe;
      const removed = [colName];
      const result = aq.from(state.dataframe).select(aq.not(removed)).objects();
      return result;
    } catch {
      return rejectWithValue("Failed to remove attribute");
    }
  },
);

export const removeBatch = createAsyncThunk(
  "dataframe/remove-batch",
  async ({ cols }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dataframe;
      const result = aq.from(state.dataframe).select(aq.not(cols)).objects();
      return result;
    } catch {
      return rejectWithValue("Failed to batch remove");
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
        const aggregationNodes = hierarchy.filter(
          (node) => node?.type === "aggregation" && node?.name,
        );
        const nodeById = new Map(hierarchy.map((node) => [node.id, node]));
        const dependenciesByAggregation = new Map();
        const dependentsBySource = new Map();

        aggregationNodes.forEach((agg) => {
          const deps = getAggregationDependencies(agg, nodeById);
          dependenciesByAggregation.set(agg.name, deps);
          deps.forEach((depName) => {
            if (!dependentsBySource.has(depName)) {
              dependentsBySource.set(depName, new Set());
            }
            dependentsBySource.get(depName).add(agg.name);
          });
        });

        const affectedAggregationNames = new Set();
        const queue = [...changedColumns];

        while (queue.length > 0) {
          const sourceName = queue.shift();
          const dependents = dependentsBySource.get(sourceName);
          if (!dependents) continue;
          dependents.forEach((dependentName) => {
            if (affectedAggregationNames.has(dependentName)) return;
            affectedAggregationNames.add(dependentName);
            queue.push(dependentName);
          });
        }

        if (affectedAggregationNames.size > 0) {
          const affectedNodes = aggregationNodes.filter((node) =>
            affectedAggregationNames.has(node.name),
          );
          const orderedNames = sortAggregationsByDependency(
            affectedNodes,
            dependenciesByAggregation,
          );
          const nodeByName = new Map(
            affectedNodes.map((node) => [node.name, node]),
          );
          const orderedNodes = orderedNames
            .map((name) => nodeByName.get(name))
            .filter(Boolean);

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
        dispatch(buildMetaFromVariableTypes(meta));
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
