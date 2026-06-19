import { ORDER_VARIABLE } from "../../../../utils/constants.js";
import {
  compareOrderValues,
  normalizeOrderValues,
  uniqueColumns,
} from "../../../../utils/viewRecords.js";

const DEFAULT_MODE = "all";
const VALID_MODES = new Set(["all", "include", "exclude"]);

export const EMPTY_SELECTION_REF = Object.freeze({
  mode: DEFAULT_MODE,
  runs: [],
  totalRows: 0,
  selectedCount: 0,
});

export function createSelectionRefForAllRows(dataframe) {
  const totalRows = Array.isArray(dataframe) ? dataframe.length : 0;
  return {
    mode: DEFAULT_MODE,
    runs: [],
    totalRows,
    selectedCount: totalRows,
  };
}

export function resolveSelectionRefPayload(payload, dataframe) {
  const universeOrderValues = getDataframeOrderValues(dataframe);

  if (payload == null) {
    return buildSelectionRefFromOrderValues([], universeOrderValues);
  }

  if (Array.isArray(payload)) {
    return buildSelectionRefFromOrderValues(
      extractOrderValuesFromRows(payload),
      universeOrderValues,
    );
  }

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.orderValues)) {
      return buildSelectionRefFromOrderValues(
        payload.orderValues,
        universeOrderValues,
      );
    }
    if (payload.selectionRef && typeof payload.selectionRef === "object") {
      return normalizeSelectionRef(payload.selectionRef, universeOrderValues);
    }
    if (payload.mode || payload.runs) {
      return normalizeSelectionRef(payload, universeOrderValues);
    }
  }

  return buildSelectionRefFromOrderValues([], universeOrderValues);
}

function getDataframeOrderValues(dataframe) {
  if (!Array.isArray(dataframe) || dataframe.length === 0) return [];
  return normalizeOrderValues(
    dataframe
      .map((row) => row?.[ORDER_VARIABLE])
      .filter((value) => value != null),
  ).sort(compareOrderValues);
}

export function getSelectionOrderValuesFromDataframe(selectionRef, dataframe) {
  const universeOrderValues = getDataframeOrderValues(dataframe);
  return resolveSelectionOrderValues(selectionRef, universeOrderValues);
}

export function projectSelectionRows({
  dataframe,
  selectionRef,
  requiredColumns = null,
  fallbackColumns = [],
}) {
  if (!Array.isArray(dataframe) || dataframe.length === 0) return [];

  const universeOrderValues = getDataframeOrderValues(dataframe);
  const selectedOrderValues = resolveSelectionOrderValues(
    selectionRef,
    universeOrderValues,
  );
  if (selectedOrderValues.length === 0) return [];

  const rowsByOrder = buildRowsByOrderMap(dataframe);
  const columns = resolveProjectionColumns(requiredColumns, fallbackColumns);

  const rows = [];
  for (let index = 0; index < selectedOrderValues.length; index += 1) {
    const orderValue = selectedOrderValues[index];
    const row = rowsByOrder.get(orderValue);
    if (!row) continue;

    if (!columns) {
      rows.push(row);
      continue;
    }

    const projected = { [ORDER_VARIABLE]: row?.[ORDER_VARIABLE] };
    columns.forEach((column) => {
      if (Object.prototype.hasOwnProperty.call(row, column)) {
        projected[column] = row[column];
      }
    });
    rows.push(projected);
  }

  return rows;
}

function buildSelectionRefFromOrderValues(orderValues, universeOrderValues) {
  const normalizedUniverse =
    normalizeOrderValues(universeOrderValues).sort(compareOrderValues);
  const selectedSet = new Set(normalizeOrderValues(orderValues));
  const normalizedSelected = normalizedUniverse.filter((value) =>
    selectedSet.has(value),
  );

  const totalRows = normalizedUniverse.length;
  const selectedCount = normalizedSelected.length;

  if (totalRows === 0) {
    return {
      mode: "include",
      runs: [],
      totalRows: 0,
      selectedCount: 0,
    };
  }

  if (selectedCount === totalRows) {
    return {
      mode: "all",
      runs: [],
      totalRows,
      selectedCount,
    };
  }

  const excluded = normalizedUniverse.filter(
    (value) => !selectedSet.has(value),
  );
  const useExcludeMode = excluded.length < normalizedSelected.length;

  return {
    mode: useExcludeMode ? "exclude" : "include",
    runs: buildRunsFromOrderValues(
      useExcludeMode ? excluded : normalizedSelected,
    ),
    totalRows,
    selectedCount,
  };
}

function normalizeSelectionRef(inputRef, universeOrderValues) {
  const mode = VALID_MODES.has(inputRef?.mode) ? inputRef.mode : DEFAULT_MODE;
  const normalizedUniverse =
    normalizeOrderValues(universeOrderValues).sort(compareOrderValues);
  const totalRows = normalizedUniverse.length;

  if (mode === "all") {
    return {
      mode: "all",
      runs: [],
      totalRows,
      selectedCount: totalRows,
    };
  }

  const runs = Array.isArray(inputRef?.runs)
    ? inputRef.runs
        .map((run) => {
          if (!Array.isArray(run) || run.length < 2) return null;
          const [start, end] = run;
          if (start == null || end == null) return null;
          return [start, end];
        })
        .filter(Boolean)
    : [];

  const reconstructedValues =
    mode === "include"
      ? expandRunsToSet(runs)
      : expandRunsToSet(runs, normalizedUniverse);

  const selectedCount =
    mode === "include"
      ? normalizedUniverse.filter((value) => reconstructedValues.has(value))
          .length
      : normalizedUniverse.filter((value) => !reconstructedValues.has(value))
          .length;

  return {
    mode,
    runs: buildRunsFromOrderValues(
      mode === "include"
        ? normalizedUniverse.filter((value) => reconstructedValues.has(value))
        : normalizedUniverse.filter((value) => reconstructedValues.has(value)),
    ),
    totalRows,
    selectedCount,
  };
}

function resolveSelectionOrderValues(selectionRef, universeOrderValues) {
  const normalizedUniverse =
    normalizeOrderValues(universeOrderValues).sort(compareOrderValues);
  if (normalizedUniverse.length === 0) return [];

  const mode = VALID_MODES.has(selectionRef?.mode)
    ? selectionRef.mode
    : DEFAULT_MODE;
  if (mode === "all") return normalizedUniverse;

  const runs = Array.isArray(selectionRef?.runs) ? selectionRef.runs : [];
  const valueSet = expandRunsToSet(runs, normalizedUniverse);

  if (mode === "include") {
    return normalizedUniverse.filter((value) => valueSet.has(value));
  }

  return normalizedUniverse.filter((value) => !valueSet.has(value));
}

function extractOrderValuesFromRows(rows) {
  return rows
    .map((row) => {
      if (row && typeof row === "object") {
        return row?.[ORDER_VARIABLE];
      }
      return row;
    })
    .filter((value) => value !== null && value !== undefined);
}

function buildRunsFromOrderValues(orderValues) {
  const values = normalizeOrderValues(orderValues).sort(compareOrderValues);
  if (values.length === 0) return [];

  const runs = [];
  let start = values[0];
  let previous = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index];
    if (isConsecutive(previous, current)) {
      previous = current;
      continue;
    }

    runs.push([start, previous]);
    start = current;
    previous = current;
  }

  runs.push([start, previous]);
  return runs;
}

function isConsecutive(left, right) {
  const leftNumber = typeof left === "number" ? left : Number(left);
  const rightNumber = typeof right === "number" ? right : Number(right);

  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
    return false;
  }

  if (!Number.isInteger(leftNumber) || !Number.isInteger(rightNumber)) {
    return false;
  }

  return rightNumber === leftNumber + 1;
}

function expandRunsToSet(runs, universeOrderValues = null) {
  const output = new Set();
  if (!Array.isArray(runs) || runs.length === 0) return output;

  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    if (!Array.isArray(run) || run.length < 2) continue;
    const [start, end] = run;

    const startNumber = typeof start === "number" ? start : Number(start);
    const endNumber = typeof end === "number" ? end : Number(end);
    const canExpandRange =
      Number.isFinite(startNumber) &&
      Number.isFinite(endNumber) &&
      Number.isInteger(startNumber) &&
      Number.isInteger(endNumber) &&
      endNumber >= startNumber;

    if (!canExpandRange) {
      output.add(start);
      if (end !== start) output.add(end);
      continue;
    }

    for (let value = startNumber; value <= endNumber; value += 1) {
      output.add(value);
    }
  }

  if (!Array.isArray(universeOrderValues) || universeOrderValues.length === 0) {
    return output;
  }

  const universeSet = new Set(universeOrderValues);
  return new Set([...output].filter((value) => universeSet.has(value)));
}

function buildRowsByOrderMap(dataframe) {
  const map = new Map();
  for (let index = 0; index < dataframe.length; index += 1) {
    const row = dataframe[index];
    const orderValue = row?.[ORDER_VARIABLE];
    if (
      orderValue === null ||
      orderValue === undefined ||
      map.has(orderValue)
    ) {
      continue;
    }
    map.set(orderValue, row);
  }
  return map;
}

function resolveProjectionColumns(requiredColumns, fallbackColumns) {
  const explicitColumns = Array.isArray(requiredColumns)
    ? requiredColumns
    : null;
  const baseColumns = explicitColumns || fallbackColumns;
  const normalizedColumns = uniqueColumns(baseColumns).filter(
    (column) => column && column !== ORDER_VARIABLE,
  );

  return normalizedColumns;
}
