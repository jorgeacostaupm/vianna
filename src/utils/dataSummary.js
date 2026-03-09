export const MISSING_VALUE_LABEL = "(missing)";

export function hasNonEmptyValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function normalizeValue(value) {
  return String(value);
}

function sortByCountThenValue(a, b) {
  if (b.count !== a.count) return b.count - a.count;
  return a.value.localeCompare(b.value, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function getDistinctValueCount(rows, column) {
  if (!Array.isArray(rows) || rows.length === 0 || !column) {
    return null;
  }

  const uniqueValues = new Set();
  for (const row of rows) {
    const value = row?.[column];
    if (!hasNonEmptyValue(value)) continue;
    uniqueValues.add(normalizeValue(value));
  }

  return uniqueValues.size;
}

export function getColumnValueCounts(rows, column, options = {}) {
  const { includeMissing = true } = options;
  if (!Array.isArray(rows) || rows.length === 0 || !column) {
    return [];
  }

  const counts = new Map();
  let missingCount = 0;

  for (const row of rows) {
    const value = row?.[column];
    if (!hasNonEmptyValue(value)) {
      missingCount += 1;
      continue;
    }

    const key = normalizeValue(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const items = Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      count,
      isMissing: false,
    }))
    .sort(sortByCountThenValue);

  if (includeMissing && missingCount > 0) {
    items.push({
      value: MISSING_VALUE_LABEL,
      count: missingCount,
      isMissing: true,
    });
  }

  return items;
}
