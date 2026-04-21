import { DataType } from "@/utils/constants";

const dtypeColors = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.color,
  [DataType.TEXT.dtype]: DataType.TEXT.color,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.color,
  root: "white",
};

export const hasValidAggregationFormula = (nodeData) => {
  if (nodeData?.type !== "aggregation") return false;

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

export const canNodeAcceptChildren = (nodeData) => {
  if (!nodeData) return false;
  if (nodeData.type !== "aggregation") return true;
  return !hasValidAggregationFormula(nodeData);
};

export function colorNode(node) {
  if (node?.data?.isActive === false) {
    return "var(--color-surface-muted)";
  }

  const isRootNode = node?.data?.type === "root" || node?.data?.id === 0;
  const isAggregationWithoutFormula =
    node?.data?.type === "aggregation" && !hasValidAggregationFormula(node?.data);

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

export const computeNavioColumnsFromHierarchy = (attrs = []) => {
  if (!Array.isArray(attrs) || attrs.length === 0) return [];

  const attrsById = new Map(attrs.map((attr) => [attr.id, attr]));
  const rootNode =
    attrsById.get(0) || attrs.find((attr) => attr?.type === "root");

  if (!rootNode) return [];

  const visibleNodeNames = [];

  const canIncludeNode = (node) => {
    if (node.type !== "aggregation") return true;

    const hasExec =
      typeof node.info?.exec === "string"
        ? node.info.exec.trim().length > 0
        : Boolean(node.info?.exec);

    return hasExec && hasValidAggregationFormula(node);
  };

  const visitNode = (node) => {
    if (!node || node.isActive === false) return;

    const activeChildren = (Array.isArray(node.related) ? node.related : [])
      .map((childId) => attrsById.get(childId))
      .filter((child) => child && child.isActive !== false);

    const isCollapsed = node.isShown === false;
    const hasVisibleChildren = activeChildren.length > 0;
    const isRootNode = node.id === 0 || node.type === "root";

    // Depth-first, left-to-right traversal:
    // collapsed nodes and leaves are terminal visible columns.
    if (!isRootNode && (isCollapsed || !hasVisibleChildren)) {
      if (canIncludeNode(node)) {
        visibleNodeNames.push(node.name);
      }
      return;
    }

    activeChildren.forEach((child) => {
      visitNode(child);
    });
  };

  (Array.isArray(rootNode.related) ? rootNode.related : []).forEach(
    (childId) => {
      visitNode(attrsById.get(childId));
    },
  );

  return visibleNodeNames;
};
