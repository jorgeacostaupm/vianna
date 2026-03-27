import { ORDER_VARIABLE } from "@/utils/Constants";

export function normalizeOrderValues(values) {
  if (!Array.isArray(values)) return [];

  const out = [];
  const seen = new Set();

  values.forEach((value) => {
    if (value === null || value === undefined) return;
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });

  return out;
}

export function compareOrderValues(a, b) {
  if (a === b) return 0;

  const numberA =
    typeof a === "number" ? a : typeof a === "string" ? Number(a) : NaN;
  const numberB =
    typeof b === "number" ? b : typeof b === "string" ? Number(b) : NaN;

  const numberComparable = Number.isFinite(numberA) && Number.isFinite(numberB);
  if (numberComparable) return numberA - numberB;

  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function sortRowsByOrderVariable(rows) {
  if (!Array.isArray(rows)) return [];
  return [...rows].sort((a, b) =>
    compareOrderValues(a?.[ORDER_VARIABLE], b?.[ORDER_VARIABLE]),
  );
}

export function extractOrderValues(rows, predicate = null) {
  if (!Array.isArray(rows)) return [];

  const values = rows
    .filter((row) => (typeof predicate === "function" ? predicate(row) : true))
    .map((row) => row?.[ORDER_VARIABLE]);

  return normalizeOrderValues(values);
}

export function uniqueColumns(columns) {
  if (!Array.isArray(columns)) return [];
  const seen = new Set();
  const out = [];

  columns.forEach((column) => {
    if (!column || seen.has(column)) return;
    seen.add(column);
    out.push(column);
  });

  return out;
}

export function isFiniteNumericValue(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue);
}

