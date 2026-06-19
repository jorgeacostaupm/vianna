import { get_parser } from "@/apps/hierarchy/menu/logic/parser";
import buildAggregation from "@/apps/hierarchy/menu/logic/formulaGenerator";
import { ALL_FUNCTIONS } from "@/apps/hierarchy/menu/logic/formulaConstants";
import { extractErrorMessage } from "@/components/notifications";

let parser = get_parser();

const TEXT_OPERATIONS = new Set([
  "string",
  "lower",
  "upper",
  "trim",
  "substring",
]);
const NODE_TYPES = new Set(["root", "attribute", "aggregation"]);
const NODE_DTYPES = new Set(["root", "number", "string", "determine"]);
const AGGREGATION_OPERATIONS = new Set(["sum", "concat", "mean", "custom"]);
const NODE_ALLOWED_KEYS = new Set([
  "id",
  "name",
  "related",
  "type",
  "aggregationConfig",
  "isExpanded",
  "isActive",
  "description",
  "dtype",
]);
const AGGREGATION_ALLOWED_KEYS = new Set([
  "operation",
  "formula",
  "usedAttributes",
]);

export const ROOT_NODE_NAME = "Hierarchy Root";
const FORMULA_DEPENDENCY_REGEX = /\$\(([^)]+)\)/g;
const MEAN_TERM_REGEX =
  /([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s*\*\s*\$\(([^)]+)\)/gi;

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

const arraysEqual = (left = [], right = []) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const normalizeUsedAttributeIds = (usedAttributes) => {
  const normalizedIds = [];
  const seen = new Set();

  const pushId = (candidate) => {
    if (!Number.isInteger(candidate) || seen.has(candidate)) return;
    seen.add(candidate);
    normalizedIds.push(candidate);
  };

  if (Array.isArray(usedAttributes)) {
    usedAttributes.forEach((entry) => {
      pushId(entry);
    });
  }

  return normalizedIds;
};

const getDefaultDtypeForType = (type) => {
  if (type === "root") return "root";
  if (type === "aggregation") return "determine";
  return "number";
};

const pushIssue = (issues, nodeId, path, message) => {
  issues.push({ nodeId, path, message });
};

const setNestedError = (target, path, message) => {
  if (!path) return;
  const parts = path.split(".");
  let cursor = target;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = cursor[part] ?? message;
      return;
    }

    if (
      cursor[part] == null ||
      typeof cursor[part] !== "object" ||
      Array.isArray(cursor[part])
    ) {
      cursor[part] = {};
    }

    cursor = cursor[part];
  });
};

export const getNodeId = (node) => node?.data?.id ?? node?.id ?? null;

export const getNodeName = (node) => node?.data?.name ?? node?.name ?? null;

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

export const createEmptyAggregationConfig = () => ({
  operation: "concat",
  formula: "",
  usedAttributes: [],
});

export const sanitizeAggregationConfig = (aggregationConfig) => {
  const rawConfig =
    aggregationConfig && typeof aggregationConfig === "object"
      ? aggregationConfig
      : createEmptyAggregationConfig();

  return {
    operation: AGGREGATION_OPERATIONS.has(rawConfig.operation)
      ? rawConfig.operation
      : "concat",
    formula: typeof rawConfig.formula === "string" ? rawConfig.formula : "",
    usedAttributes: normalizeUsedAttributeIds(rawConfig.usedAttributes),
  };
};

export const sanitizeHierarchyNode = (node) => {
  const rawNode = node && typeof node === "object" ? node : {};
  const type = typeof rawNode.type === "string" ? rawNode.type : "attribute";

  return {
    id: rawNode.id,
    name: typeof rawNode.name === "string" ? rawNode.name : "",
    related: Array.isArray(rawNode.related)
      ? rawNode.related.filter((childId) => Number.isInteger(childId))
      : [],
    type,
    aggregationConfig: sanitizeAggregationConfig(rawNode.aggregationConfig),
    isExpanded:
      typeof rawNode.isExpanded === "boolean" ? rawNode.isExpanded : true,
    isActive: typeof rawNode.isActive === "boolean" ? rawNode.isActive : true,
    description:
      typeof rawNode.description === "string" ? rawNode.description : "",
    dtype:
      typeof rawNode.dtype === "string"
        ? rawNode.dtype
        : getDefaultDtypeForType(type),
  };
};

export const extractFormulaDependencyNames = (formula) => {
  if (typeof formula !== "string" || formula.trim().length === 0) return [];

  const names = [];
  const seen = new Set();
  let match = FORMULA_DEPENDENCY_REGEX.exec(formula);

  while (match) {
    const variable = String(match[1] ?? "").trim();
    if (variable && !seen.has(variable)) {
      seen.add(variable);
      names.push(variable);
    }
    match = FORMULA_DEPENDENCY_REGEX.exec(formula);
  }

  FORMULA_DEPENDENCY_REGEX.lastIndex = 0;
  return names;
};

export const extractMeanWeightsFromFormula = (formula) => {
  const weightsByName = new Map();

  if (typeof formula !== "string" || formula.trim().length === 0) {
    return weightsByName;
  }

  let match = MEAN_TERM_REGEX.exec(formula);
  while (match) {
    const rawWeight = Number(match[1]);
    const nodeName = String(match[2] ?? "").trim();
    if (nodeName && Number.isFinite(rawWeight)) {
      weightsByName.set(nodeName, rawWeight);
    }
    match = MEAN_TERM_REGEX.exec(formula);
  }

  MEAN_TERM_REGEX.lastIndex = 0;
  return weightsByName;
};

export const compileAggregationFormula = (formula) => {
  const normalizedFormula =
    typeof formula === "string" ? formula.trim() : "";

  if (normalizedFormula.length === 0) {
    return {
      valid: true,
      formula: "",
      exec: "",
      nodes: [],
      columnOperations: [],
    };
  }

  let parsed;
  try {
    parsed = parser.parse(normalizedFormula);
  } catch {
    return {
      valid: false,
      formula: normalizedFormula,
      exec: "",
      nodes: [],
      columnOperations: [],
      message: "Invalid formula syntax.",
    };
  }

  try {
    const compiled = buildAggregation(parsed);
    return {
      valid: true,
      formula: normalizedFormula,
      exec: compiled.formula,
      nodes: compiled.nodes,
      columnOperations: compiled.columnOperations,
    };
  } catch (error) {
    const detail = error?.msg || "Invalid formula.";
    const prefix = error?.error ? `${error.error}: ` : "";
    return {
      valid: false,
      formula: normalizedFormula,
      exec: "",
      nodes: [],
      columnOperations: [],
      message: `${prefix}${detail}`,
    };
  }
};

export const getAggregationExecutableFormula = (aggregationConfig) => {
  const compiled = compileAggregationFormula(aggregationConfig?.formula);
  return compiled.valid ? compiled.exec : "";
};

export const validateHierarchyNode = (node, context = {}) => {
  const issues = [];
  const nodeId = node?.id ?? null;

  if (!node || typeof node !== "object" || Array.isArray(node)) {
    pushIssue(issues, nodeId, "", "Node must be an object.");
    return issues;
  }

  Object.keys(node).forEach((key) => {
    if (!NODE_ALLOWED_KEYS.has(key)) {
      pushIssue(
        issues,
        nodeId,
        key,
        `Unexpected field \`${key}\` in hierarchy node.`,
      );
    }
  });

  if (!Number.isInteger(node.id)) {
    pushIssue(issues, nodeId, "id", "Node id must be an integer.");
  }

  if (typeof node.name !== "string" || node.name.trim().length === 0) {
    pushIssue(issues, nodeId, "name", "Node name is required.");
  }

  if (!NODE_TYPES.has(node.type)) {
    pushIssue(
      issues,
      nodeId,
      "type",
      "Node type must be `root`, `attribute`, or `aggregation`.",
    );
  }

  if (!NODE_DTYPES.has(node.dtype)) {
    pushIssue(
      issues,
      nodeId,
      "dtype",
      "Node dtype must be `root`, `number`, `string`, or `determine`.",
    );
  }

  if (!Array.isArray(node.related)) {
    pushIssue(issues, nodeId, "related", "`related` must be an array.");
  } else {
    node.related.forEach((childId, index) => {
      if (!Number.isInteger(childId)) {
        pushIssue(
          issues,
          nodeId,
          `related.${index}`,
          "Child references in `related` must be integer node IDs.",
        );
      }
    });
  }

  if (typeof node.isExpanded !== "boolean") {
    pushIssue(
      issues,
      nodeId,
      "isExpanded",
      "`isExpanded` must be boolean.",
    );
  }

  if (typeof node.isActive !== "boolean") {
    pushIssue(issues, nodeId, "isActive", "`isActive` must be boolean.");
  }

  if (typeof node.description !== "string") {
    pushIssue(
      issues,
      nodeId,
      "description",
      "`description` must be a string.",
    );
  }

  if (
    !node.aggregationConfig ||
    typeof node.aggregationConfig !== "object" ||
    Array.isArray(node.aggregationConfig)
  ) {
    pushIssue(
      issues,
      nodeId,
      "aggregationConfig",
      "`aggregationConfig` is required and must be an object.",
    );
    return issues;
  }

  Object.keys(node.aggregationConfig).forEach((key) => {
    if (!AGGREGATION_ALLOWED_KEYS.has(key)) {
      pushIssue(
        issues,
        nodeId,
        `aggregationConfig.${key}`,
        `Unexpected field \`${key}\` in aggregationConfig.`,
      );
    }
  });

  if (!AGGREGATION_OPERATIONS.has(node.aggregationConfig.operation)) {
    pushIssue(
      issues,
      nodeId,
      "aggregationConfig.operation",
      "`aggregationConfig.operation` must be `sum`, `concat`, `mean`, or `custom`.",
    );
  }

  if (typeof node.aggregationConfig.formula !== "string") {
    pushIssue(
      issues,
      nodeId,
      "aggregationConfig.formula",
      "`aggregationConfig.formula` must be a string.",
    );
  }

  if (!Array.isArray(node.aggregationConfig.usedAttributes)) {
    pushIssue(
      issues,
      nodeId,
      "aggregationConfig.usedAttributes",
      "`aggregationConfig.usedAttributes` must be an array of node IDs.",
    );
  } else {
    node.aggregationConfig.usedAttributes.forEach((usedAttributeId, index) => {
      if (!Number.isInteger(usedAttributeId)) {
        pushIssue(
          issues,
          nodeId,
          `aggregationConfig.usedAttributes.${index}`,
          "`aggregationConfig.usedAttributes` must contain integer node IDs.",
        );
      }
    });
  }

  if (node.type === "root") {
    if (node.id !== 0) {
      pushIssue(issues, nodeId, "id", "The root node id must be 0.");
    }
    if (node.name !== ROOT_NODE_NAME) {
      pushIssue(
        issues,
        nodeId,
        "name",
        `The root node name must be \`${ROOT_NODE_NAME}\`.`,
      );
    }
    if (node.dtype !== "root") {
      pushIssue(issues, nodeId, "dtype", "The root node dtype must be `root`.");
    }
  }

  const formula = node.aggregationConfig.formula;
  const usedAttributes = Array.isArray(node.aggregationConfig.usedAttributes)
    ? node.aggregationConfig.usedAttributes
    : [];

  if (node.type !== "aggregation") {
    if (formula.trim().length > 0) {
      pushIssue(
        issues,
        nodeId,
        "aggregationConfig.formula",
        "Only aggregation nodes can define formulas.",
      );
    }
    if (usedAttributes.length > 0) {
      pushIssue(
        issues,
        nodeId,
        "aggregationConfig.usedAttributes",
        "Only aggregation nodes can define usedAttributes.",
      );
    }
    return issues;
  }

  if (formula.trim().length === 0) {
    if (usedAttributes.length > 0) {
      pushIssue(
        issues,
        nodeId,
        "aggregationConfig.usedAttributes",
        "Structural aggregations must use an empty `usedAttributes` array.",
      );
    }
    return issues;
  }

  const compiled = compileAggregationFormula(formula);
  if (!compiled.valid) {
    pushIssue(
      issues,
      nodeId,
      "aggregationConfig.formula",
      compiled.message || "Invalid aggregation formula.",
    );
    return issues;
  }

  const nameToId = context?.nameToId instanceof Map ? context.nameToId : null;
  if (nameToId instanceof Map) {
    const dependencyIds = [];
    const missingDependencies = [];

    compiled.nodes.forEach((dependencyName) => {
      const dependencyId = nameToId.get(dependencyName);
      if (!Number.isInteger(dependencyId)) {
        missingDependencies.push(dependencyName);
        return;
      }
      dependencyIds.push(dependencyId);
    });

    if (missingDependencies.length > 0) {
      pushIssue(
        issues,
        nodeId,
        "aggregationConfig.formula",
        `Formula references unknown nodes: ${missingDependencies.join(", ")}.`,
      );
      return issues;
    }

    if (!arraysEqual(usedAttributes, dependencyIds)) {
      pushIssue(
        issues,
        nodeId,
        "aggregationConfig.usedAttributes",
        "`aggregationConfig.usedAttributes` must match the ordered node dependencies referenced in `aggregationConfig.formula`.",
      );
    }
  }

  if (
    Array.isArray(node.related) &&
    node.related.length > 0 &&
    usedAttributes.some((usedAttributeId) => !node.related.includes(usedAttributeId))
  ) {
    pushIssue(
      issues,
      nodeId,
      "aggregationConfig.usedAttributes",
      "Aggregation dependencies must belong to the node's `related` children when the node has children.",
    );
  }

  return issues;
};

export const validateHierarchy = (hierarchy) => {
  const issues = [];

  if (!Array.isArray(hierarchy)) {
    return {
      valid: false,
      issues: [
        {
          nodeId: null,
          path: "",
          message:
            "Invalid hierarchy file. Expected a JSON array of hierarchy nodes.",
        },
      ],
    };
  }

  if (hierarchy.length === 0) {
    return {
      valid: false,
      issues: [
        {
          nodeId: null,
          path: "",
          message: "Hierarchy file is empty.",
        },
      ],
    };
  }

  const idCounts = new Map();
  const nameCounts = new Map();

  hierarchy.forEach((node) => {
    if (Number.isInteger(node?.id)) {
      idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1);
    }
    if (typeof node?.name === "string" && node.name.trim().length > 0) {
      nameCounts.set(node.name, (nameCounts.get(node.name) || 0) + 1);
    }
  });

  const duplicateIds = new Set(
    [...idCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id]) => id),
  );
  const duplicateNames = new Set(
    [...nameCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );

  hierarchy.forEach((node) => {
    const nodeId = node?.id ?? null;

    if (duplicateIds.has(node?.id)) {
      pushIssue(issues, nodeId, "id", `Duplicate node id ${node.id}.`);
    }

    if (duplicateNames.has(node?.name)) {
      pushIssue(
        issues,
        nodeId,
        "name",
        `Duplicate node name "${node.name}". Node names must be unique.`,
      );
    }
  });

  const idToNode = new Map();
  hierarchy.forEach((node) => {
    if (Number.isInteger(node?.id) && !idToNode.has(node.id)) {
      idToNode.set(node.id, node);
    }
  });

  const nameToId = new Map();
  if (duplicateNames.size === 0) {
    hierarchy.forEach((node) => {
      if (typeof node?.name === "string" && Number.isInteger(node?.id)) {
        nameToId.set(node.name, node.id);
      }
    });
  }

  hierarchy.forEach((node) => {
    validateHierarchyNode(node, { nameToId }).forEach((issue) => {
      issues.push(issue);
    });
  });

  const parentCountById = new Map();
  idToNode.forEach((node, id) => {
    parentCountById.set(id, 0);
  });

  hierarchy.forEach((node) => {
    const nodeId = node?.id ?? null;
    const seenRelated = new Set();
    const related = Array.isArray(node?.related) ? node.related : [];
    related.forEach((childId, index) => {
      if (!Number.isInteger(childId)) return;

      if (!idToNode.has(childId)) {
        pushIssue(
          issues,
          nodeId,
          `related.${index}`,
          `Node ${nodeId} references missing child ${childId}.`,
        );
        return;
      }

      if (childId === nodeId) {
        pushIssue(
          issues,
          nodeId,
          `related.${index}`,
          "A node cannot reference itself as a child.",
        );
      }

      if (seenRelated.has(childId)) {
        pushIssue(
          issues,
          nodeId,
          `related.${index}`,
          `Child ${childId} is duplicated in \`related\`.`,
        );
        return;
      }
      seenRelated.add(childId);
      parentCountById.set(childId, (parentCountById.get(childId) || 0) + 1);
    });

    const usedAttributes = Array.isArray(node?.aggregationConfig?.usedAttributes)
      ? node.aggregationConfig.usedAttributes
      : [];
    const seenUsedAttributes = new Set();
    usedAttributes.forEach((usedAttributeId, index) => {
      if (!Number.isInteger(usedAttributeId)) return;

      if (!idToNode.has(usedAttributeId)) {
        pushIssue(
          issues,
          nodeId,
          `aggregationConfig.usedAttributes.${index}`,
          `Aggregation dependency ${usedAttributeId} does not exist in the hierarchy.`,
        );
      }

      if (seenUsedAttributes.has(usedAttributeId)) {
        pushIssue(
          issues,
          nodeId,
          `aggregationConfig.usedAttributes.${index}`,
          `Aggregation dependency ${usedAttributeId} is duplicated.`,
        );
        return;
      }
      seenUsedAttributes.add(usedAttributeId);
    });
  });

  const rootNodes = hierarchy.filter((node) => node?.type === "root");
  if (rootNodes.length !== 1) {
    issues.push({
      nodeId: null,
      path: "",
      message: "The hierarchy must contain exactly one root node.",
    });
  }

  idToNode.forEach((node, nodeId) => {
    const parentCount = parentCountById.get(nodeId) || 0;
    const isRootNode = node?.type === "root" || nodeId === 0;

    if (isRootNode) {
      if (parentCount !== 0) {
        pushIssue(
          issues,
          nodeId,
          "related",
          "The root node cannot have a parent.",
        );
      }
      return;
    }

    if (parentCount !== 1) {
      pushIssue(
        issues,
        nodeId,
        "related",
        "Every non-root node must belong to exactly one parent.",
      );
    }
  });

  const rootNode = rootNodes.length === 1 ? rootNodes[0] : null;
  if (rootNode) {
    const visited = new Set();
    const visiting = new Set();

    const visitNode = (nodeId) => {
      if (!idToNode.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        pushIssue(
          issues,
          nodeId,
          "related",
          "The hierarchy contains a cycle.",
        );
        return;
      }
      if (visited.has(nodeId)) return;

      visiting.add(nodeId);
      const node = idToNode.get(nodeId);
      const related = Array.isArray(node?.related) ? node.related : [];
      related.forEach((childId) => {
        if (Number.isInteger(childId)) {
          visitNode(childId);
        }
      });
      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    visitNode(rootNode.id);

    idToNode.forEach((node, nodeId) => {
      if (!visited.has(nodeId)) {
        pushIssue(
          issues,
          nodeId,
          "related",
          "The node is unreachable from the root node.",
        );
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

export const validateNodeForFormik = (node, hierarchy = []) => {
  const candidateHierarchy = Array.isArray(hierarchy)
    ? hierarchy.map((existingNode) =>
        existingNode?.id === node?.id ? node : existingNode,
      )
    : [node];
  const { issues } = validateHierarchy(candidateHierarchy);
  const formErrors = {};

  issues
    .filter((issue) => issue.nodeId === node?.id && issue.path)
    .forEach((issue) => {
      setNestedError(formErrors, issue.path, issue.message);
    });

  return formErrors;
};

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
        `Mean and stdev are required for node ${colName} (${id})`,
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

  return {
    aggregationConfig: {
      operation: "custom",
      formula,
      usedAttributes: [id],
    },
    name,
    dtype: getOperationDtype(operation),
  };
}

export function createNodeInfo(objectTypes) {
  let id = 1;
  const fieldInfo = [];
  for (const key in objectTypes) {
    if (Object.prototype.hasOwnProperty.call(objectTypes, key)) {
      fieldInfo.push(
        sanitizeHierarchyNode({
          id: id++,
          name: key,
          dtype: objectTypes[key],
          related: [],
          isExpanded: true,
          isActive: true,
          type: "attribute",
          description: "",
          aggregationConfig: createEmptyAggregationConfig(),
        }),
      );
    }
  }
  return fieldInfo;
}

export function isPartOfAggregation(attributeID, attributes) {
  const parent = attributes.find((attr) => attr.related.includes(attributeID));

  if (parent) {
    return parent.aggregationConfig?.usedAttributes?.includes(attributeID);
  }

  throw new Error(`Parent not found for attributeID: ${attributeID}`);
}

export const hasValidAggregationFormula = (node) => {
  if (node?.type !== "aggregation") return false;

  const formula = node?.aggregationConfig?.formula;
  if (typeof formula !== "string" || formula.trim().length === 0) {
    return false;
  }

  return compileAggregationFormula(formula).valid;
};

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
