import { createAsyncThunk } from "@reduxjs/toolkit";
import * as aq from "arquero";
import {
  convertColumnType,
  generateColumn,
  generateColumnBatch,
  renameColumnEverywhere,
  removeBatch,
} from "../dataframe/thunks";
import {
  generateTree,
  getFileName,
  getRandomInt,
  getVisibleNodes,
} from "@/utils/functions";
import {
  buildHierarchyIndexes,
  createNodeInfo,
  createEmptyAggregationConfig,
  formatErrorMessage,
  getAggregation,
  getAggregationExecutableFormula,
  getNodeId,
  getNodeLabel,
  getNodeName,
  isPartOfAggregation,
  ROOT_NODE_NAME,
  sanitizeAggregationConfig,
  sanitizeHierarchyNode,
  validateHierarchy,
} from "./utils/thunkUtils";
import { normalizeAggregationSavePayload } from "./utils/aggregationSave";

export const applyOperation = createAsyncThunk(
  "metadata/applyOperation",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const { operation, params, selectedNodes } = payload;

      if (!selectedNodes || selectedNodes.length === 0) {
        throw new Error("No nodes selected");
      }

      const applied = [];
      const failed = [];
      const candidates = [];

      selectedNodes.forEach((selectedNode) => {
        const nodeId = getNodeId(selectedNode);
        const nodeName = getNodeName(selectedNode) || getNodeLabel(selectedNode);

        try {
          const agg = getAggregation(operation, params, selectedNode);
          candidates.push({
            nodeId,
            nodeName,
            createdNodeId: getRandomInt(),
            aggregation: agg,
          });
        } catch (error) {
          failed.push({
            id: nodeId,
            name: nodeName,
            reason: formatErrorMessage(error),
          });
        }
      });

      const createdMetadata = [];

      for (const candidate of candidates) {
        try {
          await dispatch(
            addAttribute({
              id: candidate.createdNodeId,
              name: candidate.aggregation.name,
              type: "aggregation",
              parentID: candidate.nodeId,
              aggregationConfig: candidate.aggregation.aggregationConfig,
              dtype: candidate.aggregation.dtype || "number",
            }),
          ).unwrap();
          createdMetadata.push(candidate);
        } catch (error) {
          failed.push({
            id: candidate.nodeId,
            name: candidate.nodeName,
            reason: formatErrorMessage(error),
          });
        }
      }

      if (createdMetadata.length > 0) {
        try {
          await dispatch(
            generateColumnBatch({
              cols: createdMetadata.map((candidate) => ({
                name: candidate.aggregation.name,
                aggregationConfig: candidate.aggregation.aggregationConfig,
                dtype: candidate.aggregation.dtype || "number",
              })),
              silentSuccess: true,
            }),
          ).unwrap();

          createdMetadata.forEach((candidate) => {
            applied.push({
              id: candidate.nodeId,
              name: candidate.nodeName,
              aggregationName: candidate.aggregation.name,
            });
          });
        } catch (error) {
          const generationError = formatErrorMessage(
            error,
            "Error generating operation columns.",
          );

          for (const candidate of createdMetadata) {
            let reason = generationError;
            try {
              await dispatch(
                removeAttribute({
                  attributeID: candidate.createdNodeId,
                  recover: false,
                }),
              ).unwrap();
            } catch (cleanupError) {
              const cleanupMsg = formatErrorMessage(cleanupError, null);
              if (cleanupMsg) {
                reason = `${reason}. Cleanup failed: ${cleanupMsg}`;
              }
            }

            failed.push({
              id: candidate.nodeId,
              name: candidate.nodeName,
              reason,
            });
          }
        }
      }

      return {
        operation,
        total: selectedNodes.length,
        applied,
        failed,
      };
    } catch (err) {
      console.error("applyOperation error:", formatErrorMessage(err));
      return rejectWithValue(formatErrorMessage(err, "Error applying operation."));
    }
  }
);

export const createToMeta = createAsyncThunk(
  "metadata/createToMeta",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const allNodes = getState().metadata.attributes || [];
      const attributes = allNodes
        .filter((n) => n.type === "attribute")
        .map((n) => n.name);

      const newAggregations = payload.filter(
        (m) => m.type === "aggregation" && !attributes.includes(m.name)
      );

      const oldAggregations = allNodes
        .filter((m) => m.type === "aggregation")
        .map((n) => n.name);

      await dispatch(removeBatch({ cols: oldAggregations })).unwrap();
      await dispatch(generateColumnBatch({ cols: newAggregations })).unwrap();

      return payload;
    } catch (err) {
      return rejectWithValue(
        err.message || "Error building meta automatically."
      );
    }
  }
);

export const buildMetaFromVariableTypes = createAsyncThunk(
  "metadata/buildMetaFromVariableTypes",
  async (payload, { rejectWithValue }) => {
    try {
      const nodeInfo = createNodeInfo(payload);

      const root = {
        id: 0,
        name: ROOT_NODE_NAME,
        description: "Just the root of the hierarchy",
        type: "root",
        dtype: "root",
        isExpanded: true,
        isActive: true,
        related: nodeInfo.map((n) => n.id),
        aggregationConfig: createEmptyAggregationConfig(),
      };

      return [sanitizeHierarchyNode(root), ...nodeInfo];
    } catch (err) {
      return rejectWithValue(
        err.message || "Error building meta from attribute types."
      );
    }
  }
);

const isDuplicateNameIssue = (issue) =>
  issue?.path === "name" &&
  typeof issue?.message === "string" &&
  issue.message.startsWith("Duplicate node name");

const getBlockingNodeUpdateIssue = (issues, nodeId) =>
  issues.find((issue) => {
    if (issue?.nodeId === nodeId) return true;
    return !isDuplicateNameIssue(issue);
  });

export const addAttribute = createAsyncThunk(
  "metadata/addAttribute",
  async (payload, { rejectWithValue }) => {
    try {
      const { name, type } = payload;

      if (!name || !type) {
        return rejectWithValue("Attribute name or type is missing.");
      }

      return payload;
    } catch (err) {
      return rejectWithValue(err.message || "Error adding attribute.");
    }
  }
);

export const updateAttribute = createAsyncThunk(
  "metadata/updateAttribute",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const normalizedAggregationConfig = sanitizeAggregationConfig(
        payload?.aggregationConfig,
      );
      const executableFormula = getAggregationExecutableFormula(
        normalizedAggregationConfig,
      );
      const normalizedPayload = normalizeAggregationSavePayload(
        payload,
        normalizedAggregationConfig,
        Boolean(executableFormula),
      );
      const { name, type, recover, dtype } = normalizedPayload;
      const shouldEnforceNumberOnAggregation =
        type === "aggregation" &&
        Boolean(executableFormula) &&
        dtype === "number";
      const shouldMaterializeAggregation =
        type === "aggregation" && Boolean(executableFormula);

      const attributes = getState().metadata.attributes || [];
      const existingNode = attributes.find((node) => node?.id === payload?.id);
      const previousAttributeName =
        existingNode?.type === "attribute" ? existingNode.name : null;
      const previousAggregationName =
        existingNode?.type === "aggregation" ? existingNode.name : null;
      const previousAggregationFormula = getAggregationExecutableFormula(
        existingNode?.aggregationConfig,
      );
      const candidateNode = sanitizeHierarchyNode({
        ...normalizedPayload,
      });
      const candidateHierarchy = attributes.map((node) =>
        node?.id === candidateNode.id ? candidateNode : node,
      );
      const validation = validateHierarchy(candidateHierarchy);
      if (!validation.valid) {
        const blockingIssue = getBlockingNodeUpdateIssue(
          validation.issues,
          candidateNode.id,
        );
        if (blockingIssue) {
          throw new Error(blockingIssue.message || "Invalid node.");
        }
      }

      if (shouldMaterializeAggregation) {
        await dispatch(
          generateColumn({
            colName: name,
            formula: executableFormula,
            enforceNumber: shouldEnforceNumberOnAggregation,
            silentSuccess: true,
          })
        ).unwrap();

        if (previousAggregationName && previousAggregationName !== name) {
          await dispatch(
            removeBatch({ cols: [previousAggregationName], silentSuccess: true }),
          ).unwrap();
        }
      } else if (type === "aggregation" && previousAggregationFormula) {
        await dispatch(
          removeBatch({
            cols: [previousAggregationName || name],
            silentSuccess: true,
          }),
        ).unwrap();
      } else if (
        type === "attribute" &&
        previousAttributeName &&
        previousAttributeName !== name
      ) {
        await dispatch(
          renameColumnEverywhere({
            prevName: previousAttributeName,
            newName: name,
          }),
        ).unwrap();
      }

      const shouldConvertColumnType =
        dtype !== "determine" &&
        !shouldEnforceNumberOnAggregation &&
        (type !== "aggregation" || shouldMaterializeAggregation);

      if (shouldConvertColumnType) {
        await dispatch(convertColumnType({ column: name, dtype })).unwrap();
      }

      if (recover == null || recover) {
        return {
          node: candidateNode,
          recover: null,
        };
      } else {
        return {
          node: candidateNode,
          recover: false,
        };
      }
    } catch (error) {
      const message = formatErrorMessage(error, "Error updating attribute.");
      return rejectWithValue({ node: { ...payload }, error: message });
    }
  }
);

export const removeAttribute = createAsyncThunk(
  "metadata/removeAttribute",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const { attributeID } = payload;
      const attributes = getState().metadata.attributes;

      if (!Array.isArray(attributes))
        return rejectWithValue("Metadata attributes are not available.");

      const node = attributes.find((n) => {
        return n.id === attributeID;
      });
      if (!node)
        return rejectWithValue(`Attribute with ID ${attributeID} not found.`);

      const isUsed = isPartOfAggregation(attributeID, attributes);
      if (isUsed)
        return rejectWithValue("Node is part of an existing aggregation");

      if (node.type === "aggregation") {
        await dispatch(removeBatch({ cols: [node.name] })).unwrap();
      }

      return payload;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const getNodeDepth = (nodeId, parentIndexByChildId, attributes) => {
  let depth = 0;
  let cursorId = nodeId;
  const visited = new Set();

  while (!visited.has(cursorId)) {
    visited.add(cursorId);
    const parentIdx = parentIndexByChildId.get(cursorId);
    if (parentIdx == null) return depth;

    const parentNode = attributes[parentIdx];
    if (!parentNode) return depth;

    depth += 1;
    cursorId = parentNode.id;
  }

  return depth;
};

export const removeAttributeBatch = createAsyncThunk(
  "metadata/removeAttributeBatch",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      const { attributeIDs, recover } = payload || {};
      const attributes = getState().metadata.attributes;

      if (!Array.isArray(attributes)) {
        return rejectWithValue("Metadata attributes are not available.");
      }

      const requestedIds = Array.isArray(attributeIDs)
        ? attributeIDs
        : [attributeIDs];
      const uniqueIds = [...new Set(requestedIds)].filter(Number.isInteger);

      if (uniqueIds.length === 0) {
        return rejectWithValue("No attributes provided.");
      }

      const { idToIndex, parentIndexByChildId } =
        buildHierarchyIndexes(attributes);

      const sortedIds = uniqueIds.sort(
        (a, b) =>
          getNodeDepth(b, parentIndexByChildId, attributes) -
          getNodeDepth(a, parentIndexByChildId, attributes),
      );

      const removed = [];
      const failed = [];

      sortedIds.forEach((attributeID) => {
        if (attributeID === 0) {
          failed.push({ attributeID, reason: "The root node cannot be deleted" });
          return;
        }

        const nodeIdx = idToIndex.get(attributeID);
        if (nodeIdx == null) {
          failed.push({ attributeID, reason: "Node no longer exists" });
          return;
        }

        const parentIdx = parentIndexByChildId.get(attributeID);
        if (parentIdx == null) {
          failed.push({
            attributeID,
            reason: "Current parent not found in hierarchy",
          });
          return;
        }

        const parentNode = attributes[parentIdx];
        const isUsed =
          parentNode?.aggregationConfig?.usedAttributes?.includes(attributeID);

        if (isUsed) {
          failed.push({
            attributeID,
            reason: "Node is part of an existing aggregation",
          });
          return;
        }

        const node = attributes[nodeIdx];
        removed.push({
          attributeID,
          name: node.name,
          type: node.type,
        });
      });

      const cols = removed
        .filter((node) => node.type === "aggregation")
        .map((node) => node.name);

      if (cols.length > 0) {
        await dispatch(removeBatch({ cols })).unwrap();
      }

      return {
        recover,
        removed,
        failed,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const updateHierarchy = createAsyncThunk(
  "metadata/updateHierarchy",
  async ({ hierarchy, filename }, { dispatch, rejectWithValue }) => {
    try {
      if (!Array.isArray(hierarchy)) {
        throw new Error(
          "Invalid hierarchy file. Expected a JSON array of hierarchy nodes."
        );
      }

      if (hierarchy.length === 0) {
        throw new Error("Hierarchy file is empty.");
      }

      const validation = validateHierarchy(hierarchy);
      if (!validation.valid) {
        throw new Error(validation.issues[0]?.message || "Invalid hierarchy.");
      }

      const normalizedHierarchy = hierarchy.map((node) =>
        sanitizeHierarchyNode(node),
      );

      const normalizedFilename = getFileName(filename);
      const tree = generateTree(normalizedHierarchy, 0);
      if (!tree) {
        throw new Error("Invalid hierarchy: root node could not be generated.");
      }

      const navioColumns = getVisibleNodes(tree);
      await dispatch(
        generateColumnBatch({ cols: normalizedHierarchy, silentSuccess: true }),
      ).unwrap();
      return {
        filename: normalizedFilename,
        hierarchy: normalizedHierarchy,
        navioColumns,
      };
    } catch (error) {
      console.error("updateHierarchy failed:", error);
      return rejectWithValue(error.message || "Unknown error");
    }
  }
);

function parseDescriptionsPayload(descriptions) {
  const rawDescriptions =
    typeof descriptions === "string" ? descriptions.trim() : descriptions;

  if (typeof rawDescriptions !== "string") {
    throw new Error("Invalid descriptions file. Expected CSV or JSON text.");
  }

  if (!rawDescriptions) {
    throw new Error("Descriptions file is empty.");
  }

  if (rawDescriptions.startsWith("{") || rawDescriptions.startsWith("[")) {
    const parsed = JSON.parse(rawDescriptions);
    if (
      !parsed ||
      Array.isArray(parsed) ||
      typeof parsed !== "object"
    ) {
      throw new Error(
        "Invalid descriptions JSON. Expected an object keyed by attribute name."
      );
    }

    return Object.entries(parsed).reduce((acc, [name, description]) => {
      const key = typeof name === "string" ? name.trim() : "";
      if (!key) return acc;

      if (typeof description !== "string") {
        throw new Error(
          `Invalid description for "${key}". JSON values must be strings.`
        );
      }

      acc[key] = {
        description: description.trim(),
      };

      return acc;
    }, {});
  }

  const table = aq.fromCSV(rawDescriptions);

  return table.objects().reduce((acc, row) => {
    const key = row.name?.trim();
    if (!key) return acc;

    acc[key] = {
      description: row.description?.trim() ?? "",
      decimalPlaces:
        row["Decimal Places"] != null ? Number(row["Decimal Places"]) : null,
      task: row.Task?.trim() ?? null,
      variant: row.Variant?.trim() ?? null,
    };

    return acc;
  }, {});
}

export const updateDescriptions = createAsyncThunk(
  "metadata/updateDescriptions",
  async ({ descriptions, filename }, { getState, rejectWithValue }) => {
    try {
      const descMap = parseDescriptionsPayload(descriptions);

      const attributes = getState().metadata.attributes.map((attr) => {
        const entry = descMap[attr.name];

        return entry
          ? {
              ...attr,
              description: entry.description,
            }
          : attr;
      });

      return {
        attributes,
        filename: getFileName(filename),
      };
    } catch (error) {
      return rejectWithValue(error?.message ?? "Failed to update descriptions");
    }
  }
);
