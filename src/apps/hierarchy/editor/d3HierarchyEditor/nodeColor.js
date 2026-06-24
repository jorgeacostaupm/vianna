import { DataType } from "../../../../utils/constants.js";

const dtypeColors = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.color,
  [DataType.TEXT.dtype]: DataType.TEXT.color,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.color,
  root: "white",
};

export function resolveNodeColor(data, hasValidFormula = false) {
  if (data?.isActive === false) {
    return "var(--chart-bg-muted)";
  }

  const dtype = data?.dtype || DataType.UNKNOWN.dtype;
  const isRootNode = data?.type === "root" || data?.id === 0;
  const isUntypedAggregationWithoutFormula =
    data?.type === "aggregation" &&
    dtype === DataType.UNKNOWN.dtype &&
    !hasValidFormula;

  if (isRootNode || isUntypedAggregationWithoutFormula) {
    return dtypeColors.root;
  }

  return dtypeColors[dtype] || dtypeColors[DataType.UNKNOWN.dtype];
}
