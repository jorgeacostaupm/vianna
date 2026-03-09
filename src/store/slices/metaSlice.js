import { createSlice } from "@reduxjs/toolkit";
import {
  buildMetaFromVariableTypes,
  addAttribute,
  removeAttribute,
  updateAttribute,
  createToMeta,
  updateHierarchy,
  toggleAttribute,
  changeRelationship,
  applyOperation,
  updateDescriptions,
} from "../async/metaAsyncReducers";

import { pubsub } from "@/utils/pubsub";
import {
  extractErrorMessage,
  notifyError,
  notifyInfo,
  notifySuccess,
} from "@/utils/notifications";
const { publish } = pubsub;

const initialState = {
  init: false,
  filename: null,
  descriptionsFilename: null,
  attributes: [],
  source: null,
  loadingStatus: "ready",
  recoverableOperations: [],
  version: -1,
};

const isUserCanceledError = (payload, error) => {
  const message = String(
    payload?.error || payload?.message || payload || error?.message || "",
  ).toLowerCase();
  return message.includes("canceled by user");
};

export const metaSlice = createSlice({
  name: "metadata",
  initialState: initialState,
  reducers: (create) => ({
    setInit: create.reducer((state, action) => {
      state.init = action.payload;
    }),

    setFullMeta: create.reducer((state, action) => {
      const { hierarchy, filename } = action.payload;
      state.attributes = hierarchy;
      state.filename = filename;
      state.loadingStatus = "done";
      state.version = state.version === 0 ? 1 : 0;
    }),

    changeOrder: create.reducer((state, action) => {
      const { sourceID, parentID, newIndex } = action.payload;

      const parentNode = state.attributes.find((node) =>
        node.related.includes(sourceID)
      );

      if (!parentNode) return;
      if (parentNode.id !== parentID) return;

      const oldIndex = parentNode.related.indexOf(sourceID);

      if (
        oldIndex === -1 ||
        newIndex < 0 ||
        newIndex >= parentNode.related.length
      ) {
        return;
      }

      parentNode.related.splice(oldIndex, 1);
      parentNode.related.splice(newIndex, 0, sourceID);

      state.version += 0.5;
    }),

    setDescriptions: create.reducer((state, action) => {
      const descriptions = action.payload;
      state.attributes = state.attributes.map((attr) => {
        const name = attr.name;
        let desc = descriptions.find((item) => item.name === name)?.description;
        attr.desc = desc ? desc : "";
        return attr;
      });
      state.version = 0;

      notifySuccess({
        message: "Descriptions imported",
      });
    }),

    setNodeOverviewAccess: create.reducer((state, action) => {
      const { nodeId, isActive } = action.payload || {};
      if (nodeId == null || typeof isActive !== "boolean") return;

      const nodeIdx = state.attributes.findIndex((node) => node.id === nodeId);
      if (nodeIdx === -1) return;
      if (state.attributes[nodeIdx].type === "root") return;

      if (state.attributes[nodeIdx].isActive === isActive) return;
      state.attributes[nodeIdx].isActive = isActive;
      state.version += 1;
    }),

    setNodesOverviewAccess: create.reducer((state, action) => {
      const { nodeIds, isActive } = action.payload || {};
      if (!Array.isArray(nodeIds) || typeof isActive !== "boolean") return;
      if (nodeIds.length === 0) return;

      let hasChanges = false;

      nodeIds.forEach((nodeId) => {
        const nodeIdx = state.attributes.findIndex((node) => node.id === nodeId);
        if (nodeIdx === -1) return;
        if (state.attributes[nodeIdx].type === "root") return;
        if (state.attributes[nodeIdx].isActive === isActive) return;

        state.attributes[nodeIdx].isActive = isActive;
        hasChanges = true;
      });

      if (hasChanges) {
        state.version += 1;
      }
    }),

    aggregateSelectedNodes: create.reducer((state, action) => {
      const { id, name, type, recover, info, childIDs, parentID, sourceID } =
        action.payload;
      const parentNode = state.attributes.find((n) => n.id === parentID);
      if (!parentNode) return;

      const newInfo =
        info ??
        (type === "aggregation"
          ? { operation: "concat", exec: "", formula: "", usedAttributes: [] }
          : {});

      const newNode = {
        id,
        name,
        related: [],
        type,
        info: newInfo,
        isShown: true,
        isActive: true,
        desc: "",
        dtype: "determine",
      };

      state.attributes.unshift(newNode);
      const insertPos = parentNode.related.findIndex((n) => n === sourceID);

      if (insertPos !== -1) {
        parentNode.related.splice(insertPos, 0, id);
      } else {
        parentNode.related.unshift(id);
      }

      const targetNode = state.attributes.find((n) => n.id === id);

      childIDs.forEach((source) => {
        const sourceNode = state.attributes.find((n) =>
          n.related.includes(source)
        );
        if (!sourceNode) return;

        if (recover == null || recover) {
          state.recoverableOperations.push({
            change: "relationshipNode",
            associatedId: source,
            associatedParent: sourceNode.id,
            associatedData: {
              originalPos: sourceNode.related.findIndex((n) => n === source),
            },
          });
        }

        sourceNode.related = sourceNode.related.filter((n) => n !== source);
        targetNode.related = [
          ...targetNode.related.filter((n) => n !== source),
          source,
        ];

        if (
          sourceNode.type === "aggregation" &&
          sourceNode.info?.usedAttributes
        ) {
          sourceNode.info.usedAttributes =
            sourceNode.info.usedAttributes.filter((n) => n.id !== source);
        }
      });

      state.version += 0.5;
    }),
  }),
  extraReducers: (builder) => {
    builder
      .addCase(changeRelationship.fulfilled, (state, action) => {
        const { sourceID, recover, sourceIdx, targetIdx } = action.payload;

        if (recover == null || recover) {
          state.recoverableOperations.push({
            change: "relationshipNode",
            associatedId: sourceID,
            associatedParent: state.attributes[sourceIdx].id,
            associatedData: {
              originalPos: state.attributes[sourceIdx].related.findIndex(
                (n) => n === sourceID
              ),
            },
          });
        }

        state.attributes[sourceIdx].related = state.attributes[
          sourceIdx
        ].related.filter((n) => n !== sourceID);

        state.attributes[targetIdx].related = [
          ...state.attributes[targetIdx].related.filter((n) => n !== sourceID),
          sourceID,
        ];
        state.attributes[targetIdx].isShown = true;

        if (state.attributes[sourceIdx].type === "aggregation") {
          const usedAttributes = state.attributes[
            sourceIdx
          ].info.usedAttributes.filter((n) => n.id !== sourceID);
          state.attributes[sourceIdx].info.usedAttributes = usedAttributes;
        }

        state.version += 0.5;
      })
      .addCase(changeRelationship.rejected, (state, action) => {
        const isSilent = Boolean(action.meta?.arg?.silent);
        if (isSilent) return;

        notifyError({
          message: "Could not reassign node",
          error: action.payload || action.error,
          fallback: "Unable to update parent-child relation for the node.",
        });
        state.version += 0.5;
      });

    builder
      .addCase(toggleAttribute.fulfilled, (state, action) => {
        const { attributeIdx, fromFocus } = action.payload;
        state.attributes[attributeIdx].isShown =
          !state.attributes[attributeIdx].isShown;

        if (fromFocus) state.version += 1;
      })
      .addCase(toggleAttribute.rejected, (state, action) => {
        console.error(action.payload || "Unknown error toggling attribute.");
        state.error = action.payload;
      });

    builder.addCase(updateHierarchy.fulfilled, (state, action) => {
      const { hierarchy, filename } = action.payload;
      state.attributes = hierarchy;
      state.filename = filename;
      state.loadingStatus = "done";
      state.version = state.version === 0 ? 1 : 0;
    });
    builder.addCase(updateHierarchy.rejected, (state, action) => {
      notifyError({
        message: "Could not update hierarchy",
        error: action.payload || action.error,
        fallback: "Hierarchy update failed.",
        pauseOnHover: true,
      });
    });

    builder.addCase(updateDescriptions.fulfilled, (state, action) => {
      const { attributes, filename } = action.payload;
      state.attributes = attributes;
      state.descriptionsFilename = filename;
      state.version = state.version === 0 ? 1 : 0;
    });

    builder.addCase(buildMetaFromVariableTypes.fulfilled, (state, action) => {
      state.attributes = action.payload;
      state.version = state.version === 0 ? 1 : 0;
    });
    builder.addCase(buildMetaFromVariableTypes.rejected, (state, action) => {
      publish("addAlertNotification", {
        type: "error",
        msg: `Import Hierarchy Failure:\n${action.payload}`,
      });
    });

    builder.addCase(createToMeta.fulfilled, (state, action) => {
      state.attributes = action.payload;
      state.version = Math.min(state.version - 1, 0);
    });
    builder.addCase(createToMeta.rejected, (state, action) => {
      publish("addAlertNotification", {
        type: "error",
        msg: `Failure to Save Created Hierarchy:\n${action.payload}`,
      });
    });

    builder.addCase(addAttribute.fulfilled, (state, action) => {
      const { id, name, parentID, type, recover, info, dtype } = action.payload;
      const parentPosition = state.attributes.findIndex(
        (n) => n.id === parentID
      );
      if (parentPosition === -1) return;

      if (recover == null || recover) {
        state.recoverableOperations.push({
          change: "addNode",
          associatedId: id,
          associatedParent: null,
          associatedData: null,
        });
      }

      let newInfo;
      if (info == null) {
        newInfo = {
          operation: "concat",
          exec: "",
          formula: "",
          usedAttributes: [],
        };
      } else {
        newInfo = info;
      }

      state.attributes.push({
        id: id,
        name: name,
        related: [],
        type: type,
        info: newInfo,
        isShown: true,
        isActive: true,
        desc: "",
        dtype: dtype ? dtype : type === "aggregation" ? "determine" : "number",
      });

      state.attributes[parentPosition].isShown = true;

      state.attributes[parentPosition].related.push(id);
      state.loadingStatus = "done";
      state.version += info ? 0 : 1;
    });

    builder
      .addCase(removeAttribute.fulfilled, (state, action) => {
        const { attributeID, recover } = action.payload;
        if (attributeID === 0) return; // avoid removing the root node.

        const parentIdx = state.attributes.findIndex((n) =>
          n.related.includes(attributeID)
        );

        if (recover == null || recover) {
          const attrRelatedPos = state.attributes[parentIdx].related.findIndex(
            (n) => n == attributeID
          );
          const attribute = state.attributes.find((n) => n.id === attributeID);
          if (attribute == null) return;
          if (attribute.type === "attribute") {
            state.recoverableOperations = [];
          } else {
            state.recoverableOperations.push({
              change: "removeNode",
              associatedId: attributeID,
              associatedNodePosition: attrRelatedPos,
              associatedParent: state.attributes[parentIdx].id,
              associatedData: { ...attribute },
            });
          }
        }

        state.attributes[parentIdx].related = state.attributes[
          parentIdx
        ].related.filter((d) => d !== attributeID);

        const node = state.attributes.find((n) => n.id === attributeID);
        state.attributes[parentIdx].related = [
          ...state.attributes[parentIdx].related,
          ...node.related,
        ];

        if (state.attributes[parentIdx].info) {
          state.attributes[parentIdx].info.usedAttributes = state.attributes[
            parentIdx
          ].info.usedAttributes.filter((n) => n.id !== attributeID);
        }
        state.attributes = state.attributes.filter(
          (att) => att.id !== attributeID
        );

        state.version += recover ? 0.5 : -0.5;
      })
      .addCase(removeAttribute.rejected, (state, action) => {
        notifyError({
          message: "Could not remove node",
          error: action.payload || action.error,
          fallback: "Node removal failed.",
          pauseOnHover: true,
        });
      });

    builder
      .addCase(updateAttribute.fulfilled, (state, action) => {
        const { node, recover } = action.payload;

        const idx = state.attributes.findIndex((n) => n.id === node.id);
        if (idx == null || idx === -1) return;

        if (recover == null || recover) {
          state.recoverableOperations.push({
            change: "updateNode",
            associatedId: node.id,
            associatedParent: null,
            associatedData: { ...state.attributes[idx] },
          });
        }

        state.attributes[idx] = {
          ...state.attributes[idx],
          ...node,
        };
        state.loadingStatus = "done";
        state.version += recover != null || recover ? 0.5 : -0.5;
      })
      .addCase(updateAttribute.rejected, (state, action) => {
        if (isUserCanceledError(action.payload, action.error)) {
          notifyInfo({
            message: "Node update canceled",
          });
          return;
        }
        const description = extractErrorMessage(
          action.payload || action.error,
          "Node update failed.",
        );

        notifyError({
          message: "Could not update node",
          description,
          pauseOnHover: true,
        });
      });

    builder
      .addCase(applyOperation.fulfilled, (state, action) => {
        const appliedCount = action.payload?.applied?.length || 0;
        if (appliedCount > 0) {
          state.version += 1;
        }
      })
      .addCase(applyOperation.rejected, (state, action) => {
        notifyError({
          message: "Operation failed",
          error: action.payload || action.error,
          fallback: "Error applying operation to selected nodes.",
          pauseOnHover: true,
        });
      });
  },
});

export const {
  setInit,
  setFullMeta,
  setDescriptions,
  setNodeOverviewAccess,
  setNodesOverviewAccess,
  aggregateSelectedNodes,
  setFocusNode,
  changeOrder,
} = metaSlice.actions;

export default metaSlice.reducer;
