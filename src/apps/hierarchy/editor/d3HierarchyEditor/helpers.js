import { DataType } from "@/utils/Constants";

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
  const roots = selectedNodes.filter((node) => !selectedNodes.includes(node.parent));
  const orphans = selectedNodes.filter(
    (node) => node.parent && !selectedNodes.includes(node.parent),
  );
  const mods = [...roots];

  orphans.forEach((node) => {
    if (!mods.includes(node)) mods.push(node);
  });

  return mods;
};

export const computeNavioColumnsFromHierarchy = (root, attrs = []) => {
  const attributeNames = [];
  const queue = [];
  root?.children?.forEach((child) => queue.push(child));

  for (let idx = 0; idx < queue.length; idx += 1) {
    const node = queue[idx];
    if (!node || node?.data?.isActive === false) continue;

    const isCollapsed = node._children != null;
    const hasVisibleChildren =
      Array.isArray(node.children) && node.children.length > 0;

    if (node.data.id !== 0 && (isCollapsed || !hasVisibleChildren)) {
      attributeNames.push(node.data.name);
      continue;
    }

    if (hasVisibleChildren) {
      queue.push(
        ...node.children.filter((child) => child?.data?.isActive !== false),
      );
    }
  }

  const attrsByName = new Map(attrs.map((attr) => [attr.name, attr]));
  return attributeNames.filter((attrName) => {
    const completeAttr = attrsByName.get(attrName);
    if (!completeAttr || completeAttr.isActive === false) return false;
    if (completeAttr.type !== "aggregation") return true;

    const hasExec =
      typeof completeAttr.info?.exec === "string"
        ? completeAttr.info.exec.trim().length > 0
        : Boolean(completeAttr.info?.exec);

    return hasExec && hasNodeFormula(completeAttr);
  });
};
