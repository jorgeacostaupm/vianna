export const normalizeAggregationSavePayload = (
  payload,
  aggregationConfig,
  hasExecutableFormula,
) => {
  if (payload?.type !== "aggregation" || hasExecutableFormula) {
    return {
      ...payload,
      aggregationConfig,
    };
  }

  return {
    ...payload,
    dtype: "determine",
    aggregationConfig: {
      ...aggregationConfig,
      formula: "",
      usedAttributes: [],
    },
  };
};
