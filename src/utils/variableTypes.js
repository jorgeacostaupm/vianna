export function getVariableTypes(data, options = {}) {
  const {
    maxNumDistictForCategorical = 10,
    maxNumDistictForOrdered = 90,
    howManyItemsShouldSearchForNotNull = 100,
    addAllAttribsIncludeObjects = false,
    addAllAttribsIncludeArrays = false,
  } = options;
  if (!data?.length) return {};

  const result = {};
  const sample = data.slice(0, howManyItemsShouldSearchForNotNull);
  const present = (value) => value !== null && value !== undefined && value !== "";

  Object.keys(data[0]).forEach((column) => {
    if (["__seqId", "__i", "selected"].includes(column)) return;

    const values = sample.map((row) => row[column]);
    const firstValue = values.find(present);
    if (typeof firstValue === "number") result[column] = "number";
    else if (firstValue instanceof Date) result[column] = "date";
    else if (typeof firstValue === "boolean") result[column] = "string";
    else if (Array.isArray(firstValue)) {
      if (addAllAttribsIncludeArrays) result[column] = "string";
    } else if (firstValue && typeof firstValue === "object") {
      if (addAllAttribsIncludeObjects) result[column] = "string";
    } else {
      const distinct = new Set(values.filter(present)).size;
      result[column] =
        distinct >= maxNumDistictForCategorical &&
        distinct < maxNumDistictForOrdered
          ? "number"
          : "string";
    }
  });

  return result;
}
