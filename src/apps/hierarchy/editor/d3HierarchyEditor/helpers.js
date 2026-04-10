import { DataType } from "@/utils/Constants";
import { getVisibleNodes } from "@/utils/functions";

const dtypeColors = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.color,
  [DataType.TEXT.dtype]: DataType.TEXT.color,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.color,
  root: "white",
};

export const hasNodeFormula = (nodeData) => {
  const formulaCandidates = [
    nodeData?.info?.formula,
    nodeData?.formula,
    nodeData?.info?.exec,
    nodeData?.exec,
  ];

  return formulaCandidates.some((value) => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return Boolean(value);
  });
};

export function colorNode(node) {
  if (node?.data?.isActive === false) {
    return "var(--color-surface-muted)";
  }

  const isRootNode = node?.data?.type === "root" || node?.data?.id === 0;
  const isAggregationWithoutFormula =
    node?.data?.type === "aggregation" && !hasNodeFormula(node?.data);

  if (isRootNode || isAggregationWithoutFormula) {
    return dtypeColors.root;
  }

  const dtype = node?.data?.dtype || DataType.UNKNOWN.dtype;
  return dtypeColors[dtype] || dtypeColors[DataType.UNKNOWN.dtype];
}

export const clampNumber = (value, min, max, fallback) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

export const getNodeLabel = (node) =>
  node?.data?.name || node?.name || `Node #${node?.id ?? "unknown"}`;

export const rangeUnordered = (a, b) => {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  const result = [];

  for (let i = start; i <= end; i += 1) {
    result.push(i);
  }

  return result;
};

export const getSelectionRootsAndOrphans = (selectedNodes) => {
  const selectedSet = new Set(selectedNodes);
  const roots = selectedNodes.filter((node) => !selectedSet.has(node.parent));
  const orphans = selectedNodes.filter(
    (node) => node.parent && !selectedSet.has(node.parent),
  );
  const mods = [...roots];
  const modsSet = new Set(mods);

  orphans.forEach((node) => {
    if (!modsSet.has(node)) {
      mods.push(node);
      modsSet.add(node);
    }
  });

  return mods;
};

export const computeNavioColumnsFromHierarchy = (root, attrs = []) => {
  return getVisibleNodes(root, attrs);
};
