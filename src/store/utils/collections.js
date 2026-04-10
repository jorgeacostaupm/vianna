export const getDistinctValues = (items, key) => {
  if (!Array.isArray(items) || !key) return [];
  return [...new Set(items.map((item) => item?.[key]))];
};
