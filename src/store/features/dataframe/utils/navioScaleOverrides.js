export const VALID_NAVIO_SCALE_TYPES = new Set([
  "boolean",
  "categorical",
  "date",
  "diverging",
  "ordered",
  "sequential",
  "text",
]);

export const EMPTY_NAVIO_SCALE_OVERRIDES = Object.freeze({});

export const setNavioScaleOverrideValue = (
  overrides,
  attribute,
  type,
) => {
  if (!attribute) return overrides || EMPTY_NAVIO_SCALE_OVERRIDES;

  const nextOverrides = { ...(overrides || {}) };
  if (VALID_NAVIO_SCALE_TYPES.has(type)) nextOverrides[attribute] = type;
  else delete nextOverrides[attribute];
  return nextOverrides;
};

export const renameNavioScaleOverride = (overrides, prevName, newName) => {
  if (!prevName || !newName || prevName === newName) {
    return overrides || EMPTY_NAVIO_SCALE_OVERRIDES;
  }
  if (!overrides?.[prevName]) return overrides || EMPTY_NAVIO_SCALE_OVERRIDES;

  const nextOverrides = { ...overrides, [newName]: overrides[prevName] };
  delete nextOverrides[prevName];
  return nextOverrides;
};

export const pruneNavioScaleOverrides = (overrides, columns) => {
  const columnSet = new Set(Array.isArray(columns) ? columns : []);
  const entries = Object.entries(overrides || {}).filter(([column]) =>
    columnSet.has(column),
  );
  if (entries.length === 0) return EMPTY_NAVIO_SCALE_OVERRIDES;
  if (entries.length === Object.keys(overrides || {}).length) return overrides;
  return Object.fromEntries(entries);
};

export const filterValidNavioScaleOverrides = (overrides) => {
  const entries = Object.entries(overrides || {});
  if (entries.length === 0) return EMPTY_NAVIO_SCALE_OVERRIDES;

  const validEntries = entries.filter(([, type]) =>
    VALID_NAVIO_SCALE_TYPES.has(type),
  );
  if (validEntries.length === 0) return EMPTY_NAVIO_SCALE_OVERRIDES;
  if (validEntries.length === entries.length) return overrides;

  return Object.fromEntries(validEntries);
};
