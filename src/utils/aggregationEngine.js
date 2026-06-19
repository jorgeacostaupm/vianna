import * as aq from "arquero";

import processFormula from "./processFormula.js";

const isEmptyNumericValue = (value) =>
  value === null || value === undefined || value === "";

const toRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeColumns = (columns) =>
  Array.isArray(columns)
    ? columns.filter((column) => column?.name && column?.formula)
    : [];

export const normalizeNumericColumn = (rows, column) =>
  toRows(rows).map((row) => {
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

export const normalizeStringColumn = (rows, column) =>
  toRows(rows).map((row) => ({
    ...row,
    [column]: row[column] == null ? null : String(row[column]),
  }));

const normalizeDerivedColumnTypes = (rows, columns) => {
  let outputRows = rows;
  columns
    .filter((column) => column?.enforceNumber)
    .forEach((column) => {
      outputRows = normalizeNumericColumn(outputRows, column.name);
    });
  return outputRows;
};

const buildDerivedFunctions = (baseRows, columns) => {
  const baseTable = aq.from(toRows(baseRows));
  return columns.reduce((formated, column) => {
    formated[column.name] = processFormula(baseTable, column.formula);
    return formated;
  }, {});
};

const deriveRowsWithFunctions = (rows, columns, formated) => {
  const safeRows = toRows(rows);
  if (safeRows.length === 0) return [];

  const derivedRows = aq.from(safeRows).derive(formated, { drop: false }).objects();
  return normalizeDerivedColumnTypes(derivedRows, columns);
};

export const deriveAggregationRows = ({
  mode = "batch",
  dataframe,
  quarantineData,
  columns,
}) => {
  const safeDataframe = toRows(dataframe);
  const safeQuarantineData = toRows(quarantineData);
  const safeColumns = normalizeColumns(
    mode === "single" ? [toRows(columns)[0]] : columns,
  );

  if (safeColumns.length === 0) {
    return {
      data: safeDataframe,
      quarantineData: safeQuarantineData,
    };
  }

  const formated = buildDerivedFunctions(safeDataframe, safeColumns);

  return {
    data: deriveRowsWithFunctions(safeDataframe, safeColumns, formated),
    quarantineData: deriveRowsWithFunctions(
      safeQuarantineData,
      safeColumns,
      formated,
    ),
  };
};

export const deriveAggregationColumnsForRows = (rows, columns) => {
  let currentRows = toRows(rows);
  normalizeColumns(columns).forEach((column) => {
    const formated = buildDerivedFunctions(currentRows, [column]);
    currentRows = deriveRowsWithFunctions(currentRows, [column], formated);
  });
  return currentRows;
};
