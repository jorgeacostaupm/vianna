import * as aq from "arquero";
import processFormula from "@/utils/processFormula";
import { ORDER_VARIABLE } from "@/utils/Constants";
import { getFileName, getVariableTypes } from "@/utils/functions";
import { setQuarantineData } from "../slices/cantabSlice";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { buildMetaFromVariableTypes } from "../async/metaAsyncReducers";
import { setDataframe } from "../slices/dataSlice";

const isEmptyNumericValue = (value) =>
  value === null || value === undefined || value === "";

const normalizeNumericColumn = (rows, column) =>
  rows.map((row) => {
    const value = row[column];
    if (isEmptyNumericValue(value)) {
      return { ...row, [column]: null };
    }

    const numberValue = Number(value);
    return {
      ...row,
      [column]: Number.isNaN(numberValue) ? null : numberValue,
    };
  });

const normalizeStringColumn = (rows, column) =>
  rows.map((row) => ({
    ...row,
    [column]: row[column] == null ? null : String(row[column]),
  }));

const parseFormulaDependencies = (execFormula) => {
  if (!execFormula) return [];
  const dependencies = new Set();
  const regex = /\$\(([^)]+)\)/g;
  let match = regex.exec(execFormula);
  while (match) {
    const variable = String(match[1] ?? "").trim();
    if (variable) dependencies.add(variable);
    match = regex.exec(execFormula);
  }
  return [...dependencies];
};

const getAggregationDependencies = (node, nodeById) => {
  const usedById = Array.isArray(node?.info?.usedAttributes)
    ? node.info.usedAttributes
        .map((used) => nodeById.get(used?.id)?.name)
        .filter(Boolean)
    : [];

  const usedByFormula = parseFormulaDependencies(node?.info?.exec);
  return [...new Set([...usedById, ...usedByFormula])];
};

const sortAggregationsByDependency = (aggregationNodes, dependenciesByName) => {
  const names = aggregationNodes.map((node) => node.name);
  const nameSet = new Set(names);
  const indegree = new Map(names.map((name) => [name, 0]));
  const outgoing = new Map(names.map((name) => [name, new Set()]));

  names.forEach((name) => {
    const deps = dependenciesByName.get(name) || [];
    deps.forEach((depName) => {
      if (!nameSet.has(depName) || depName === name) return;
      indegree.set(name, (indegree.get(name) || 0) + 1);
      outgoing.get(depName).add(name);
    });
  });

  const queue = names.filter((name) => (indegree.get(name) || 0) === 0);
  const ordered = [];

  while (queue.length > 0) {
    const next = queue.shift();
    ordered.push(next);
    (outgoing.get(next) || []).forEach((target) => {
      const newDegree = (indegree.get(target) || 0) - 1;
      indegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    });
  }

  // Si hay ciclo o dependencia inválida, mantenemos los restantes en orden original.
  if (ordered.length < names.length) {
    names.forEach((name) => {
      if (!ordered.includes(name)) ordered.push(name);
    });
  }

  return ordered;
};

const recomputeAggregationColumns = (rows, aggregationNodes) => {
  let currentRows = Array.isArray(rows) ? rows : [];
  aggregationNodes.forEach((node) => {
    if (!node?.name || !node?.info?.exec) return;
    const table = aq.from(currentRows);
    const derivedFn = processFormula(table, node.info.exec);
    currentRows = table.derive({ [node.name]: derivedFn }, { drop: false }).objects();
  });
  return currentRows;
};

export const generateColumn = createAsyncThunk(
  "dataframe/agg-generate",
  async ({ colName, formula, enforceNumber = false }, { getState, rejectWithValue }) => {
    try {
      const dt = getState().dataframe.present.dataframe;
      const qt = getState().cantab.present.quarantineData;

      const table = aq.from(dt || []);

      const derivedFn = processFormula(table, formula);

      const data =
        dt && dt.length > 0
          ? table.derive({ [colName]: derivedFn }, { drop: false }).objects()
          : [];

      const quarantineData =
        qt && qt.length > 0
          ? aq
              .from(qt)
              .derive({ [colName]: derivedFn }, { drop: false })
              .objects()
          : [];

      if (enforceNumber) {
        return {
          data: normalizeNumericColumn(data, colName),
          quarantineData: normalizeNumericColumn(quarantineData, colName),
        };
      }

      return { data, quarantineData };
    } catch (error) {
      console.error(error);
      return rejectWithValue("Error aggregating values");
    }
  }
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
        : state.dataframe.present.dataframe;
      const qt = Array.isArray(inputQuarantineData)
        ? inputQuarantineData
        : state.cantab.present.quarantineData;

      const table = aq.from(dt || []);
      const formated = {};

      const columns = Array.isArray(cols) ? cols : [];
      columns.forEach((col) => {
        if (col?.info?.exec) {
          formated[col.name] = processFormula(table, col.info.exec);
        }

        /* if (!table.columnNames().includes(col.name)) {
          formated[col.name] = () => null;
        } */
      });

      const data =
        dt && dt.length > 0
          ? table.derive(formated, { drop: false }).objects()
          : [];
      const outputQuarantineData =
        qt && qt.length > 0
          ? aq.from(qt).derive(formated, { drop: false }).objects()
          : [];

      return { data, quarantineData: outputQuarantineData };
    } catch (error) {
      console.error(error);
      return rejectWithValue("Error aggregating batches");
    }
  }
);

export const generateEmpty = createAsyncThunk(
  "dataframe/agg-empty",
  async ({ colName }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dataframe.present;
      const result = aq
        .from(state.dataframe)
        .derive({ [colName]: () => null }, { drop: false })
        .objects();
      return result;
    } catch {
      return rejectWithValue("Empty aggregation failed");
    }
  }
);

export const removeColumn = createAsyncThunk(
  "dataframe/remove-col",
  async ({ colName }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dataframe.present;
      const removed = [colName];
      const result = aq.from(state.dataframe).select(aq.not(removed)).objects();
      return result;
    } catch {
      return rejectWithValue("Failed to remove attribute");
    }
  }
);

export const removeBatch = createAsyncThunk(
  "dataframe/remove-batch",
  async ({ cols }, { getState, rejectWithValue }) => {
    try {
      const state = getState().dataframe.present;
      const result = aq.from(state.dataframe).select(aq.not(cols)).objects();
      return result;
    } catch {
      return rejectWithValue("Failed to batch remove");
    }
  }
);

export const convertColumnType = createAsyncThunk(
  "dataframe/convertColumnType",
  async ({ column, dtype }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const dataframeRows = Array.isArray(state.dataframe.present.dataframe)
        ? state.dataframe.present.dataframe
        : [];
      const quarantineRows = Array.isArray(state.cantab.present.quarantineData)
        ? state.cantab.present.quarantineData
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
  }
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
          return (
            normalizedRowValue === candidate || rowValue == candidate
          );
        });

      const state = getState();
      let dataframe = Array.isArray(state.dataframe.present.dataframe)
        ? state.dataframe.present.dataframe
        : [];
      let quarantineData = Array.isArray(state.cantab.present.quarantineData)
        ? state.cantab.present.quarantineData
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
          const nodeByName = new Map(affectedNodes.map((node) => [node.name, node]));
          const orderedNodes = orderedNames
            .map((name) => nodeByName.get(name))
            .filter(Boolean);

          dataframe = recomputeAggregationColumns(dataframe, orderedNodes);
          quarantineData = recomputeAggregationColumns(quarantineData, orderedNodes);
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
  }
);

export const updateData = createAsyncThunk(
  "dataframe/load-import",
  async (
    { data, filename, isGenerateHierarchy },
    { dispatch, rejectWithValue }
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
  }
);
