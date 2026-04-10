import * as aq from "arquero";

import processFormula from "../utils/processFormula";

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

const deriveSingle = ({ dataframe, quarantineData, columns }) => {
  const [column] = Array.isArray(columns) ? columns : [];
  if (!column?.name || !column?.formula) {
    return {
      data: Array.isArray(dataframe) ? dataframe : [],
      quarantineData: Array.isArray(quarantineData) ? quarantineData : [],
    };
  }

  const baseTable = aq.from(dataframe || []);
  const derivedFn = processFormula(baseTable, column.formula);

  const derivedData =
    Array.isArray(dataframe) && dataframe.length > 0
      ? baseTable.derive({ [column.name]: derivedFn }, { drop: false }).objects()
      : [];

  const derivedQuarantine =
    Array.isArray(quarantineData) && quarantineData.length > 0
      ? aq
          .from(quarantineData)
          .derive({ [column.name]: derivedFn }, { drop: false })
          .objects()
      : [];

  if (!column.enforceNumber) {
    return { data: derivedData, quarantineData: derivedQuarantine };
  }

  return {
    data: normalizeNumericColumn(derivedData, column.name),
    quarantineData: normalizeNumericColumn(derivedQuarantine, column.name),
  };
};

const deriveBatch = ({ dataframe, quarantineData, columns }) => {
  const safeColumns = Array.isArray(columns)
    ? columns.filter((column) => column?.name && column?.formula)
    : [];

  if (safeColumns.length === 0) {
    return {
      data: Array.isArray(dataframe) ? dataframe : [],
      quarantineData: Array.isArray(quarantineData) ? quarantineData : [],
    };
  }

  const baseTable = aq.from(dataframe || []);
  const formated = {};
  safeColumns.forEach((column) => {
    formated[column.name] = processFormula(baseTable, column.formula);
  });

  let derivedData =
    Array.isArray(dataframe) && dataframe.length > 0
      ? baseTable.derive(formated, { drop: false }).objects()
      : [];

  let derivedQuarantine =
    Array.isArray(quarantineData) && quarantineData.length > 0
      ? aq.from(quarantineData).derive(formated, { drop: false }).objects()
      : [];

  const enforceNumberColumns = safeColumns
    .filter((column) => column.enforceNumber)
    .map((column) => column.name);

  enforceNumberColumns.forEach((columnName) => {
    derivedData = normalizeNumericColumn(derivedData, columnName);
    derivedQuarantine = normalizeNumericColumn(derivedQuarantine, columnName);
  });

  return { data: derivedData, quarantineData: derivedQuarantine };
};

self.onmessage = (event) => {
  const { requestId, mode, dataframe, quarantineData, columns } = event.data || {};
  try {
    const payload =
      mode === "single"
        ? deriveSingle({ dataframe, quarantineData, columns })
        : deriveBatch({ dataframe, quarantineData, columns });

    self.postMessage({
      requestId,
      ok: true,
      payload,
    });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error?.message || "Aggregation worker failed",
    });
  }
};
