import { VARIABLE_VALUES_LIMIT } from "./nodeMenuConstants";

const isEmptyNumericValue = (value) =>
  value === null || value === undefined || value === "";

const isValueAtRiskOnNumericCast = (value) =>
  !isEmptyNumericValue(value) && Number.isNaN(Number(value));

const rowHasColumn = (row, columnName) =>
  Boolean(
    row && columnName && Object.prototype.hasOwnProperty.call(row, columnName),
  );

const buildPreviewValueKey = (value) => {
  if (value == null) return "null";
  if (typeof value === "object") {
    try {
      return `object:${JSON.stringify(value)}`;
    } catch {
      return `object:${String(value)}`;
    }
  }
  return `${typeof value}:${String(value)}`;
};

export const countValuesAtRisk = (rows, columnName) => {
  if (!Array.isArray(rows) || !columnName) return 0;
  return rows.reduce(
    (count, row) =>
      count + (isValueAtRiskOnNumericCast(row?.[columnName]) ? 1 : 0),
    0,
  );
};

export const getFirstFormikError = (value) => {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = getFirstFormikError(item);
      if (msg) return msg;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      const msg = getFirstFormikError(nested);
      if (msg) return msg;
    }
  }
  return null;
};

export const normalizePreviewValue = (value) => {
  if (value == null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const resolveExistingColumnName = (columnCandidates = [], datasets = []) => {
  const candidates = columnCandidates.filter(Boolean);
  for (const columnName of candidates) {
    const exists = datasets.some(
      (rows) =>
        Array.isArray(rows) &&
        rows.some((row) => rowHasColumn(row, columnName)),
    );
    if (exists) return columnName;
  }
  return null;
};

export const getVariableSampleValues = (
  rows = [],
  columnName,
  limit = VARIABLE_VALUES_LIMIT,
) => {
  if (!Array.isArray(rows) || !columnName || limit <= 0) return [];

  const values = [];
  const seen = new Set();

  for (const row of rows) {
    if (!rowHasColumn(row, columnName)) continue;
    const value = row[columnName];
    if (value === undefined) continue;
    const key = buildPreviewValueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= limit) break;
  }

  return values;
};

export const getNodeTypeLabel = (nodeType, nChildren) => {
  switch (nodeType) {
    case "attribute":
      return "Original";
    case "root":
      return "Root";
    case "aggregation":
      return nChildren === 0 ? "Measure" : "Aggregation";
    default:
      return "Unknown";
  }
};
