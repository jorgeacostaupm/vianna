import { get_parser } from "@/apps/hierarchy/menu/logic/parser";
import buildAggregation from "@/apps/hierarchy/menu/logic/formulaGenerator";
import { ALL_FUNCTIONS } from "@/apps/hierarchy/menu/logic/formulaConstants";
import { extractErrorMessage } from "@/notifications";

let parser = get_parser();

const TEXT_OPERATIONS = new Set([
  "string",
  "lower",
  "upper",
  "trim",
  "substring",
]);

export const ROOT_NODE_NAME = "Hierarchy Root";

const sanitizeNamePart = (value) => {
  return String(value)
    .replace(/\$\(|\)/g, "")
    .replace(/["']/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
};

const buildOperationName = (operation, colName, extraArgs) => {
  const cleanedArgs = extraArgs
    .map(sanitizeNamePart)
    .filter((part) => part && part.length > 0);
  const suffix = cleanedArgs.length > 0 ? `-${cleanedArgs.join("_")}` : "";
  return `${operation}-${colName}${suffix}`;
};

const getOperationDtype = (operation) =>
  TEXT_OPERATIONS.has(operation) ? "string" : "number";

export const getNodeId = (node) => node?.data?.id ?? node?.id ?? null;

export const getNodeName = (node) => node?.data?.name ?? node?.name ?? null;

export const setHierarchyRootName = (hierarchy) => {
  if (!Array.isArray(hierarchy)) return hierarchy;

  return hierarchy.map((node) => {
    const isRootNode = node?.type === "root" || node?.id === 0;
    if (!isRootNode || node?.name === ROOT_NODE_NAME) return node;
    return { ...node, name: ROOT_NODE_NAME };
  });
};

export const getNodeLabel = (node) => {
  const nodeName = getNodeName(node);
  const nodeId = getNodeId(node);

  if (nodeName && nodeId != null) return `${nodeName} (#${nodeId})`;
  if (nodeName) return nodeName;
  if (nodeId != null) return `Node #${nodeId}`;
  return "Unknown node";
};

export const formatErrorMessage = (error, fallback = "Unknown error") =>
  extractErrorMessage(error, fallback);

export function getAggregation(operation, params, node) {
  const colName = getNodeName(node);
  const id = getNodeId(node);

  if (!colName || id == null) {
    throw new Error(`Node data is invalid: ${getNodeLabel(node)}`);
  }

  const opConfig = ALL_FUNCTIONS[operation];

  if (!opConfig) {
    throw new Error(`Unsupported operation: ${operation}`);
  }

  const opArgs = opConfig.args;
  const extraArgs = (params?.args || [])
    .map((arg) => String(arg).trim())
    .filter((arg) => arg.length > 0);

  const args = [];
  if (opArgs === 0) {
    args.push("0");
  } else {
    args.push(`$(${colName})`);
  }

  let name = "";

  if (operation === "zscore") {
    name = `Z-${colName}`;
  } else if (operation === "zscoreByGroup") {
    const group = Array.isArray(params?.group)
      ? params.group[0]
      : params?.group;
    if (!group) {
      throw new Error("Group parameter is required for zscoreByGroup");
    }
    args.push(`$(${group})`);
    name = `Z-${colName}-${group}`;
  } else if (operation === "zscoreByValues") {
    const values = params?.values || params;
    const valueParams = values?.[id] ?? values?.[node?.id];
    if (!valueParams || valueParams.mean == null || valueParams.stdev == null) {
      throw new Error(
        `Mean and stdev are required for node ${colName} (${id})`
      );
    }
    args.push(valueParams.mean, valueParams.stdev);
    name = `Z-${colName} µ:${valueParams.mean} σ:${valueParams.stdev}`;
  } else {
    if (opArgs > 1 && extraArgs.length < opArgs - 1) {
      throw new Error(`Operation ${operation} requires more arguments.`);
    }

    if (opArgs === -1) {
      args.push(...extraArgs);
    } else if (opArgs > 1) {
      args.push(...extraArgs.slice(0, opArgs - 1));
    }

    name = buildOperationName(operation, colName, extraArgs);
  }

  const formula = `${operation}(${args.join(", ")})`;
  const parsed = parser.parse(formula);
  const tmp = buildAggregation(parsed);

  const info = {
    exec: tmp.formula,
    formula,
    operation: "custom",
  };

  return {
    ...tmp,
    info,
    name,
    dtype: getOperationDtype(operation),
  };
}

export function createNodeInfo(objectTypes) {
  let id = 1;
  const fieldInfo = [];
  for (const key in objectTypes) {
    if (Object.prototype.hasOwnProperty.call(objectTypes, key)) {
      fieldInfo.push({
        id: id++,
        name: key,
        dtype: objectTypes[key],
        related: [],
        isShown: true,
        isActive: true,
        type: "attribute",
        desc: "",
      });
    }
  }
  return fieldInfo;
}

export function isPartOfAggregation(attributeID, attributes) {
  const parent = attributes.find((attr) => attr.related.includes(attributeID));

  if (parent) {
    const isUsed = parent.info?.usedAttributes?.find(
      (used) => used.id === attributeID
    );
    return isUsed;
  }

  throw new Error(`Parent not found for attributeID: ${attributeID}`);
}

export function buildHierarchyIndexes(attributes = []) {
  const idToIndex = new Map();
  const parentIndexByChildId = new Map();

  attributes.forEach((node, index) => {
    idToIndex.set(node.id, index);
    node.related?.forEach((childId) => {
      parentIndexByChildId.set(childId, index);
    });
  });

  return { idToIndex, parentIndexByChildId };
}
