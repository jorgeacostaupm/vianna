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
  changeRelationshipBatch,
  applyOperation,
  updateDescriptions,
} from "./thunks";

const MAX_ASSIGNMENT_HISTORY = 100;

const toRelatedList = (node) => (Array.isArray(node?.related) ? node.related : []);

const findNodeIndexById = (attributes, nodeId) =>
  attributes.findIndex((node) => node.id === nodeId);

const findParentIndexByChildId = (attributes, childId) =>
  attributes.findIndex((node) => toRelatedList(node).includes(childId));

const removeFromAggregationUsedAttributes = (node, childId) => {
  if (node?.type !== "aggregation") return;
  if (!Array.isArray(node?.info?.usedAttributes)) return;
  node.info.usedAttributes = node.info.usedAttributes.filter(
    (used) => used.id !== childId,
  );
};

const applyAssignmentChange = (state, sourceIDs, targetParentID) => {
  if (!Array.isArray(sourceIDs) || sourceIDs.length === 0) return [];

  const targetIdx = findNodeIndexById(state.attributes, targetParentID);
  if (targetIdx === -1) return [];

  const targetNode = state.attributes[targetIdx];
  const uniqueSourceIDs = [...new Set(sourceIDs)];
  const moves = [];

  uniqueSourceIDs.forEach((sourceID) => {
    const sourceIdx = findParentIndexByChildId(state.attributes, sourceID);
    if (sourceIdx === -1) return;

    const sourceParent = state.attributes[sourceIdx];
    const sourceRelated = toRelatedList(sourceParent);
    const fromIndex = sourceRelated.findIndex((id) => id === sourceID);
    if (fromIndex === -1) return;

    sourceParent.related = sourceRelated.filter((id) => id !== sourceID);
    removeFromAggregationUsedAttributes(sourceParent, sourceID);

    moves.push({
      sourceID,
      fromParentID: sourceParent.id,
      fromIndex,
      toParentID: targetParentID,
      toIndex: -1,
    });
  });

  if (moves.length === 0) return [];

  const movedSet = new Set(moves.map((move) => move.sourceID));
  const targetRelated = toRelatedList(targetNode).filter((id) => !movedSet.has(id));
  targetNode.related = [...targetRelated, ...moves.map((move) => move.sourceID)];
  targetNode.isShown = true;

  const targetIndexById = new Map();
  targetNode.related.forEach((id, index) => {
    if (movedSet.has(id)) {
      targetIndexById.set(id, index);
    }
  });

  moves.forEach((move) => {
    move.toIndex = targetIndexById.get(move.sourceID) ?? targetNode.related.length - 1;
  });

  return moves;
};

const pushAssignmentHistoryEntry = (state, moves) => {
  if (!Array.isArray(moves) || moves.length === 0) return;

  state.assignmentUndoStack.push({
    moves: moves.map((move) => ({ ...move })),
  });
  if (state.assignmentUndoStack.length > MAX_ASSIGNMENT_HISTORY) {
    state.assignmentUndoStack.shift();
  }
  state.assignmentRedoStack = [];
};

const applyAssignmentHistoryEntry = (state, entry, mode) => {
  const attributes = state.attributes;
  const rawMoves = Array.isArray(entry?.moves) ? entry.moves : [];
  if (rawMoves.length === 0) return false;

  const moves = [];
  const seen = new Set();
  rawMoves.forEach((move) => {
    if (move?.sourceID == null || seen.has(move.sourceID)) return;
    seen.add(move.sourceID);
    moves.push(move);
  });
  if (moves.length === 0) return false;

  const nodeIndexById = new Map();
  const parentIdByChildId = new Map();
  attributes.forEach((node, index) => {
    nodeIndexById.set(node.id, index);
    toRelatedList(node).forEach((childId) => {
      parentIdByChildId.set(childId, node.id);
    });
  });

  const removeChildByLookup = (childID) => {
    const parentID = parentIdByChildId.get(childID);
    if (parentID == null) return false;

    const parentIdx = nodeIndexById.get(parentID);
    if (parentIdx == null) return false;

    const parentNode = attributes[parentIdx];
    const currentRelated = toRelatedList(parentNode);
    const nextRelated = currentRelated.filter((id) => id !== childID);
    if (nextRelated.length === currentRelated.length) return false;

    parentNode.related = nextRelated;
    removeFromAggregationUsedAttributes(parentNode, childID);
    parentIdByChildId.delete(childID);
    return true;
  };

  const insertChildByLookup = (parentID, childID, desiredIndex) => {
    const parentIdx = nodeIndexById.get(parentID);
    if (parentIdx == null) return false;

    const parentNode = attributes[parentIdx];
    const related = toRelatedList(parentNode).filter((id) => id !== childID);
    const clampedIndex = Number.isInteger(desiredIndex)
      ? Math.max(0, Math.min(desiredIndex, related.length))
      : related.length;

    related.splice(clampedIndex, 0, childID);
    parentNode.related = related;
    parentNode.isShown = true;
    parentIdByChildId.set(childID, parentID);
    return true;
  };

  moves.forEach((move) => {
    removeChildByLookup(move.sourceID);
  });

  const groupedMoves = new Map();
  moves.forEach((move) => {
    const parentID = mode === "undo" ? move.fromParentID : move.toParentID;
    if (parentID == null) return;

    if (!groupedMoves.has(parentID)) {
      groupedMoves.set(parentID, []);
    }
    groupedMoves.get(parentID).push(move);
  });

  let movedCount = 0;
  groupedMoves.forEach((group, parentID) => {
    const sorted = group.slice().sort((a, b) => {
      const aIndex = mode === "undo" ? a.fromIndex : a.toIndex;
      const bIndex = mode === "undo" ? b.fromIndex : b.toIndex;
      const safeA = Number.isInteger(aIndex) ? aIndex : Number.MAX_SAFE_INTEGER;
      const safeB = Number.isInteger(bIndex) ? bIndex : Number.MAX_SAFE_INTEGER;
      if (safeA !== safeB) return safeA - safeB;
      return String(a.sourceID).localeCompare(String(b.sourceID));
    });

    sorted.forEach((move) => {
      const desiredIndex = mode === "undo" ? move.fromIndex : move.toIndex;
      if (insertChildByLookup(parentID, move.sourceID, desiredIndex)) {
        movedCount += 1;
      }
    });
  });

  return movedCount > 0;
};

const clearAssignmentHistory = (state) => {
  state.assignmentUndoStack = [];
  state.assignmentRedoStack = [];
};

const initialState = {
  init: false,
  filename: null,
  descriptionsFilename: null,
  attributes: [],
  source: null,
  loadingHierarchy: false,
  loadingDescriptions: false,
  recoverableOperations: [],
  assignmentUndoStack: [],
  assignmentRedoStack: [],
  hierarchyRevision: 0,
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
      state.loadingHierarchy = false;
      clearAssignmentHistory(state);
      state.hierarchyRevision += 1;
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

      state.hierarchyRevision += 1;
    }),

    setDescriptions: create.reducer((state, action) => {
      const descriptions = action.payload;
      state.attributes = state.attributes.map((attr) => {
        const name = attr.name;
        let desc = descriptions.find((item) => item.name === name)?.description;
        attr.desc = desc ? desc : "";
        return attr;
      });
      state.hierarchyRevision += 1;
    }),

    setNodeOverviewAccess: create.reducer((state, action) => {
      const { nodeId, isActive } = action.payload || {};
      if (nodeId == null || typeof isActive !== "boolean") return;

      const nodeIdx = state.attributes.findIndex((node) => node.id === nodeId);
      if (nodeIdx === -1) return;
      if (state.attributes[nodeIdx].type === "root") return;

      if (state.attributes[nodeIdx].isActive === isActive) return;
      state.attributes[nodeIdx].isActive = isActive;
      state.hierarchyRevision += 1;
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
        state.hierarchyRevision += 1;
      }
    }),

    undoAssignmentChange: create.reducer((state) => {
      const historyEntry =
        state.assignmentUndoStack[state.assignmentUndoStack.length - 1];
      if (!historyEntry) return;

      const applied = applyAssignmentHistoryEntry(state, historyEntry, "undo");
      state.assignmentUndoStack.pop();
      if (!applied) return;

      state.assignmentRedoStack.push(historyEntry);
      state.hierarchyRevision += 1;
    }),

    redoAssignmentChange: create.reducer((state) => {
      const historyEntry =
        state.assignmentRedoStack[state.assignmentRedoStack.length - 1];
      if (!historyEntry) return;

      const applied = applyAssignmentHistoryEntry(state, historyEntry, "redo");
      state.assignmentRedoStack.pop();
      if (!applied) return;

      state.assignmentUndoStack.push(historyEntry);
      if (state.assignmentUndoStack.length > MAX_ASSIGNMENT_HISTORY) {
        state.assignmentUndoStack.shift();
      }
      state.hierarchyRevision += 1;
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

      state.hierarchyRevision += 1;
    }),
  }),
  extraReducers: (builder) => {
    builder
      .addCase(changeRelationship.fulfilled, (state, action) => {
        const { sourceID, recover, sourceIdx, targetIdx } = action.payload;
        const sourceParent = state.attributes[sourceIdx];
        const targetParent = state.attributes[targetIdx];
        if (!sourceParent || !targetParent) return;

        if (recover == null || recover) {
          state.recoverableOperations.push({
            change: "relationshipNode",
            associatedId: sourceID,
            associatedParent: sourceParent.id,
            associatedData: {
              originalPos: toRelatedList(sourceParent).findIndex(
                (n) => n === sourceID
              ),
            },
          });
        }

        const moves = applyAssignmentChange(state, [sourceID], targetParent.id);
        if (moves.length === 0) return;

        pushAssignmentHistoryEntry(state, moves);
        state.hierarchyRevision += 1;
      })
      .addCase(changeRelationship.rejected, (state, action) => {
        const isSilent = Boolean(action.meta?.arg?.silent);
        if (isSilent) return;
        state.error = action.payload || action.error || null;
      });

    builder
      .addCase(changeRelationshipBatch.fulfilled, (state, action) => {
        const { recover, targetIdx, moveCandidates } = action.payload;
        if (!Array.isArray(moveCandidates) || moveCandidates.length === 0) return;

        const movedIds = moveCandidates.map((move) => move.sourceID);
        const targetParent = state.attributes[targetIdx];
        if (!targetParent) return;

        if (recover == null || recover) {
          moveCandidates.forEach(({ sourceID, sourceIdx }) => {
            const sourceParent = state.attributes[sourceIdx];
            if (!sourceParent) return;

            state.recoverableOperations.push({
              change: "relationshipNode",
              associatedId: sourceID,
              associatedParent: sourceParent.id,
              associatedData: {
                originalPos: toRelatedList(sourceParent).findIndex(
                  (n) => n === sourceID
                ),
              },
            });
          });
        }

        const moves = applyAssignmentChange(state, movedIds, targetParent.id);
        if (moves.length === 0) return;

        pushAssignmentHistoryEntry(state, moves);
        state.hierarchyRevision += 1;
      })
      .addCase(changeRelationshipBatch.rejected, (state, action) => {
        const isSilent = Boolean(action.meta?.arg?.silent);
        if (isSilent) return;
        state.error = action.payload || action.error || null;
      });

    builder
      .addCase(toggleAttribute.fulfilled, (state, action) => {
        const { attributeIdx, fromFocus } = action.payload;
        state.attributes[attributeIdx].isShown =
          !state.attributes[attributeIdx].isShown;

        if (fromFocus) state.hierarchyRevision += 1;
      })
      .addCase(toggleAttribute.rejected, (state, action) => {
        console.error(action.payload || "Unknown error toggling attribute.");
        state.error = action.payload;
      });

    builder
      .addCase(updateHierarchy.pending, (state) => {
        state.loadingHierarchy = true;
      })
      .addCase(updateHierarchy.fulfilled, (state, action) => {
        const { hierarchy, filename } = action.payload;
        state.attributes = hierarchy;
        state.filename = filename;
        state.loadingHierarchy = false;
        clearAssignmentHistory(state);
        state.hierarchyRevision += 1;
      })
      .addCase(updateHierarchy.rejected, (state, action) => {
        state.loadingHierarchy = false;
        state.error = action.payload || action.error || null;
      });

    builder
      .addCase(updateDescriptions.pending, (state) => {
        state.loadingDescriptions = true;
      })
      .addCase(updateDescriptions.fulfilled, (state, action) => {
        const { attributes, filename } = action.payload;
        state.attributes = attributes;
        state.descriptionsFilename = filename;
        state.loadingDescriptions = false;
        state.hierarchyRevision += 1;
      })
      .addCase(updateDescriptions.rejected, (state, action) => {
        state.loadingDescriptions = false;
        state.error = action.payload || action.error || null;
      });

    builder.addCase(buildMetaFromVariableTypes.fulfilled, (state, action) => {
      state.attributes = action.payload;
      clearAssignmentHistory(state);
      state.hierarchyRevision += 1;
    });

    builder.addCase(createToMeta.fulfilled, (state, action) => {
      state.attributes = action.payload;
      clearAssignmentHistory(state);
      state.hierarchyRevision += 1;
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
      state.hierarchyRevision += 1;
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

        state.hierarchyRevision += 1;
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
        state.hierarchyRevision += 1;
      });

    builder.addCase(applyOperation.fulfilled, (state, action) => {
      const { applied = [] } = action.payload || {};
      const appliedCount = applied.length;
      if (appliedCount > 0) {
        state.hierarchyRevision += 1;
      }
    });

    builder.addCase(applyOperation.rejected, (state, action) => {
      state.error = action.payload || action.error || null;
    });
  },
});

export const {
  setInit,
  setFullMeta,
  setDescriptions,
  setNodeOverviewAccess,
  setNodesOverviewAccess,
  undoAssignmentChange,
  redoAssignmentChange,
  aggregateSelectedNodes,
  changeOrder,
} = metaSlice.actions;

export default metaSlice.reducer;
