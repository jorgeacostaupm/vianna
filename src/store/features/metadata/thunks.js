import { createAsyncThunk } from "@reduxjs/toolkit";
import * as aq from "arquero";
import {
  generateEmpty,
  generateColumn,
  removeColumn,
  removeBatch,
  generateColumnBatch,
} from "../dataframe/thunks";
import {
  generateTree,
  getFileName,
  getRandomInt,
  getVisibleNodes,
} from "@/utils/functions";
import { convertColumnType } from "../dataframe/thunks";
import {
  buildHierarchyIndexes,
  createNodeInfo,
  formatErrorMessage,
  getAggregation,
  getNodeId,
  getNodeLabel,
  getNodeName,
  isPartOfAggregation,
  ROOT_NODE_NAME,
  setHierarchyRootName,
} from "./utils/thunkUtils";

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
          // Se evita generateEmpty en este flujo para no sobrescribir luego el resultado de generateColumnBatch.
          await dispatch(
            addAttribute({
              id: candidate.createdNodeId,
              name: candidate.aggregation.name,
              type: "aggregation",
              parentID: candidate.nodeId,
              info: candidate.aggregation.info,
              dtype: candidate.aggregation.dtype || "number",
              skipGenerateEmpty: true,
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
                info: candidate.aggregation.info,
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

      await dispatch(removeBatch({ cols: oldAggregations }));
      await dispatch(generateColumnBatch({ cols: newAggregations }));

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
        desc: "Just the root of the hierarchy",
        type: "root",
        dtype: "root",
        isShown: true,
        isActive: true,
        related: nodeInfo.map((n) => n.id),
      };

      return [root, ...nodeInfo];
    } catch (err) {
      return rejectWithValue(
        err.message || "Error building meta from variable types."
      );
    }
  }
);

export const toggleAttribute = createAsyncThunk(
  "metadata/toggleAttribute",
  async ({ attributeID, fromFocus }, { getState, rejectWithValue }) => {
    try {
      const state = getState().metadata;
      const attributes = state.attributes;

      const attributeIdx = attributes.findIndex((n) => n.id === attributeID);
      if (attributeIdx === -1) {
        return rejectWithValue(`The node ${attributeID} does not exist.`);
      }
      return { attributeIdx, fromFocus };
    } catch (err) {
      return rejectWithValue(err.message || "Error toggling attribute.");
    }
  }
);

export const addAttribute = createAsyncThunk(
  "metadata/addAttribute",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const { name, type, skipGenerateEmpty = false } = payload;

      if (!name || !type) {
        return rejectWithValue("Attribute name or type is missing.");
      }

      if (type === "aggregation" && !skipGenerateEmpty) {
        dispatch(generateEmpty({ colName: name }));
      }

      return payload;
    } catch (err) {
      return rejectWithValue(err.message || "Error adding attribute.");
    }
  }
);

export const updateAttribute = createAsyncThunk(
  "metadata/updateAttribute",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const { name, type, info, recover, dtype } = payload;
      const shouldEnforceNumberOnAggregation =
        type === "aggregation" && Boolean(info?.exec) && dtype === "number";

      if (type === "aggregation") {
        if (!info?.exec) {
          await dispatch(generateEmpty({ colName: name, silentSuccess: true })).unwrap();
        } else {
          await dispatch(
            generateColumn({
              colName: name,
              formula: info.exec,
              enforceNumber: shouldEnforceNumberOnAggregation,
              silentSuccess: true,
            })
          ).unwrap();
        }
      }

      if (dtype !== "determine" && !shouldEnforceNumberOnAggregation) {
        await dispatch(convertColumnType({ column: name, dtype })).unwrap();
      }

      if (recover == null || recover) {
        return { node: { ...payload }, recover: null };
      } else {
        const newNode = { ...payload };
        delete newNode.recover;
        return { node: { ...newNode }, recover: false };
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
        dispatch(removeColumn({ colName: node.name }));
      }

      return payload;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const changeRelationship = createAsyncThunk(
  "attributes/changeRelationship",
  async ({ sourceID, targetID, recover }, { getState, rejectWithValue }) => {
    const attributes = getState().metadata.attributes;

    const sourceIdx = attributes.findIndex((n) => n.related.includes(sourceID));
    const targetIdx = attributes.findIndex((n) => n.id === targetID);

    if (sourceIdx === -1 || targetIdx === -1) {
      return rejectWithValue("Source or target not found");
    }

    const isUsed = isPartOfAggregation(sourceID, attributes);
    if (isUsed)
      return rejectWithValue("Node is part of an existing aggregation");

    return {
      sourceID,
      recover,
      sourceIdx,
      targetIdx,
    };
  }
);

export const changeRelationshipBatch = createAsyncThunk(
  "attributes/changeRelationshipBatch",
  async ({ sourceIDs, targetID, recover }, { getState, rejectWithValue }) => {
    const attributes = getState().metadata.attributes;

    if (!Array.isArray(sourceIDs) || sourceIDs.length === 0) {
      return rejectWithValue("No source nodes provided");
    }

    const { idToIndex, parentIndexByChildId } = buildHierarchyIndexes(attributes);
    const targetIdx = idToIndex.get(targetID);

    if (targetIdx == null) {
      return rejectWithValue("Target not found");
    }

    const uniqueSourceIDs = [...new Set(sourceIDs)];
    const moveCandidates = [];
    const failed = [];

    uniqueSourceIDs.forEach((sourceID) => {
      const sourceIdx = parentIndexByChildId.get(sourceID);
      if (sourceIdx == null || idToIndex.get(sourceID) == null) {
        failed.push({ sourceID, reason: "Source node not found" });
        return;
      }

      const sourceParent = attributes[sourceIdx];
      const isUsed = sourceParent?.info?.usedAttributes?.find(
        (used) => used.id === sourceID
      );

      if (isUsed) {
        failed.push({
          sourceID,
          reason: "Node is part of an existing aggregation",
        });
        return;
      }

      moveCandidates.push({ sourceID, sourceIdx });
    });

    return {
      recover,
      targetIdx,
      moveCandidates,
      failed,
    };
  }
);

export const updateHierarchy = createAsyncThunk(
  "metadata/updateHierarchy",
  async ({ hierarchy, filename }, { dispatch, rejectWithValue }) => {
    try {
      const normalizedFilename = getFileName(filename);
      const normalizedHierarchy = setHierarchyRootName(hierarchy);
      const tree = generateTree(normalizedHierarchy, 0);
      const navioColumns = getVisibleNodes(tree, normalizedHierarchy);
      dispatch(generateColumnBatch({ cols: normalizedHierarchy }));
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

export const updateDescriptions = createAsyncThunk(
  "metadata/updateDescriptions",
  async ({ descriptions, filename }, { getState, rejectWithValue }) => {
    try {
      const table = aq.fromCSV(descriptions);

      const descMap = table.objects().reduce((acc, row) => {
        const key = row.name?.trim();
        if (!key) return acc;

        acc[key] = {
          description: row.description?.trim() ?? "",
          decimalPlaces:
            row["Decimal Places"] != null
              ? Number(row["Decimal Places"])
              : null,
          task: row.Task?.trim() ?? null,
          variant: row.Variant?.trim() ?? null,
        };

        return acc;
      }, {});

      const attributes = getState().metadata.attributes.map((attr) => {
        const entry = descMap[attr.name];

        return entry
          ? {
              ...attr,
              desc: entry.description,
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
