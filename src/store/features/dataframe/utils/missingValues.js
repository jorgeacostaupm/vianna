import { ORDER_VARIABLE } from "../../../../utils/constants.js";
import { uniqueColumns } from "../../../../utils/viewRecords.js";
import { getSelectionOrderValuesFromDataframe } from "./selectionRef.js";

export const EMPTY_MISSING_BY_ATTRIBUTE = Object.freeze({});

export function isMissingValue(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

export function buildMissingByAttribute(dataframe) {
  if (!Array.isArray(dataframe) || dataframe.length === 0) return {};

  const missingByAttribute = {};

  for (let rowIndex = 0; rowIndex < dataframe.length; rowIndex += 1) {
    const row = dataframe[rowIndex];
    if (!row || typeof row !== "object") continue;

    const orderValue = row[ORDER_VARIABLE];
    if (orderValue === null || orderValue === undefined) continue;

    Object.keys(row).forEach((column) => {
      if (!isMissingValue(row[column])) return;
      if (!missingByAttribute[column]) missingByAttribute[column] = [];
      missingByAttribute[column].push(orderValue);
    });
  }

  return missingByAttribute;
}

export function selectionHasMissingInAttributes({
  dataframe,
  selectionRef,
  missingByAttribute,
  attributeIds,
}) {
  const selectedOrderValues = getSelectionOrderValuesFromDataframe(
    selectionRef,
    dataframe,
  );

  return hasMissingInOrderValues({
    selectedOrderValues,
    missingByAttribute,
    attributeIds,
  });
}

export function hasMissingInOrderValues({
  selectedOrderValues,
  missingByAttribute,
  attributeIds,
}) {
  if (!Array.isArray(selectedOrderValues) || selectedOrderValues.length === 0) {
    return false;
  }

  const selectedSet = new Set(selectedOrderValues);
  const columnsToCheck = uniqueColumns(attributeIds);
  if (columnsToCheck.length === 0) return false;

  for (let columnIndex = 0; columnIndex < columnsToCheck.length; columnIndex += 1) {
    const missingOrderValues = missingByAttribute?.[columnsToCheck[columnIndex]];
    if (!Array.isArray(missingOrderValues) || missingOrderValues.length === 0) {
      continue;
    }

    for (let rowIndex = 0; rowIndex < missingOrderValues.length; rowIndex += 1) {
      if (selectedSet.has(missingOrderValues[rowIndex])) return true;
    }
  }

  return false;
}

export function getMissingOrderValuesInSelection({
  dataframe,
  selectionRef,
  missingByAttribute,
  attributeIds,
}) {
  const selectedOrderValues = getSelectionOrderValuesFromDataframe(
    selectionRef,
    dataframe,
  );
  if (selectedOrderValues.length === 0) return [];

  const selectedSet = new Set(selectedOrderValues);
  const affected = new Set();
  const columnsToCheck = uniqueColumns(attributeIds);

  for (let columnIndex = 0; columnIndex < columnsToCheck.length; columnIndex += 1) {
    const missingOrderValues = missingByAttribute?.[columnsToCheck[columnIndex]];
    if (!Array.isArray(missingOrderValues) || missingOrderValues.length === 0) {
      continue;
    }

    for (let rowIndex = 0; rowIndex < missingOrderValues.length; rowIndex += 1) {
      const orderValue = missingOrderValues[rowIndex];
      if (selectedSet.has(orderValue)) affected.add(orderValue);
    }
  }

  return selectedOrderValues.filter((orderValue) => affected.has(orderValue));
}

export function getAddedColumns(previousColumns, nextColumns) {
  const previousSet = new Set(uniqueColumns(previousColumns));
  return uniqueColumns(nextColumns).filter((column) => !previousSet.has(column));
}

export function getRemovedColumns(previousColumns, nextColumns) {
  const nextSet = new Set(uniqueColumns(nextColumns));
  return uniqueColumns(previousColumns).filter((column) => !nextSet.has(column));
}
