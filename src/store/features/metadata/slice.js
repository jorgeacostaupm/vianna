import { createSlice } from "@reduxjs/toolkit";
import {
  buildMetaFromVariableTypes,
  addAttribute,
  removeAttribute,
  removeAttributeBatch,
  updateAttribute,
  createToMeta,
  updateHierarchy,
  applyOperation,
  updateDescriptions,
} from "./thunks";
import {
  createEmptyAggregationConfig,
  sanitizeAggregationConfig,
  sanitizeHierarchyNode,
} from "./utils/thunkUtils";
import { applyAttributeRemovals } from "./utils/removeAttributes";

const MAX_ASSIGNMENT_HISTORY = 100;

const toRelatedList = (node) =>
  Array.isArray(node?.related) ? node.related : [];

const findNodeIndexById = (attributes, nodeId) =>
  attributes.findIndex((node) => node.id === nodeId);

const findParentIndexByChildId = (attributes, childId) =>
  attributes.findIndex((node) => toRelatedList(node).includes(childId));

const removeFromAggregationUsedAttributes = (node, childId) => {
  if (node?.type !== "aggregation") return;
  if (!Array.isArray(node?.aggregationConfig?.usedAttributes)) return;
  node.aggregationConfig.usedAttributes =
    node.aggregationConfig.usedAttributes.filter(
    (usedId) => usedId !== childId,
  );
};

const isUsedByAggregationParent = (node, childId) =>
  Boolean(node?.aggregationConfig?.usedAttributes?.includes(childId));

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
  const targetRelated = toRelatedList(targetNode).filter(
    (id) => !movedSet.has(id),
  );
  targetNode.related = [
    ...targetRelated,
    ...moves.map((move) => move.sourceID),
  ];

  const targetIndexById = new Map();
  targetNode.related.forEach((id, index) => {
    if (movedSet.has(id)) {
      targetIndexById.set(id, index);
    }
  });

  moves.forEach((move) => {
    move.toIndex =
      targetIndexById.get(move.sourceID) ?? targetNode.related.length - 1;
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
  hierarchyRevision: -1,
};

const metaSlice = createSlice({
  name: "metadata",
  initialState: initialState,
  reducers: (create) => ({
    setInit: create.reducer((state, action) => {
      state.init = action.payload;
    }),

    setFullMeta: create.reducer((state, action) => {
      const { hierarchy, filename } = action.payload;
      state.attributes = Array.isArray(hierarchy)
        ? hierarchy.map((node) => sanitizeHierarchyNode(node))
        : [];
      state.filename = filename;
      state.loadingHierarchy = false;
      clearAssignmentHistory(state);
      state.hierarchyRevision = state.hierarchyRevision === 0 ? 1 : 0;
    }),

    changeOrder: create.reducer((state, action) => {
      const { sourceID, parentID, newIndex } = action.payload;

      const parentNode = state.attributes.find((node) =>
        node.related.includes(sourceID),
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

      state.hierarchyRevision += 0.5;
    }),

    setDescriptions: create.reducer((state, action) => {
      const descriptions = action.payload;
      state.attributes = state.attributes.map((attr) => {
        const name = attr.name;
        let description = descriptions.find(
          (item) => item.name === name,
        )?.description;
        attr.description = description ? description : "";
        return attr;
      });
      state.hierarchyRevision = 0;
    }),

    toggleAttribute: create.reducer((state, action) => {
      const { attributeID, fromFocus } = action.payload || {};
      const attributeIdx = findNodeIndexById(state.attributes, attributeID);
      if (attributeIdx === -1) return;

      state.attributes[attributeIdx].isExpanded =
        !state.attributes[attributeIdx].isExpanded;

      if (fromFocus) state.hierarchyRevision += 1;
    }),

    changeRelationship: create.reducer((state, action) => {
      const { sourceID, targetID, recover } = action.payload || {};
      const sourceIdx = findParentIndexByChildId(state.attributes, sourceID);
      const targetIdx = findNodeIndexById(state.attributes, targetID);

      if (sourceIdx === -1 || targetIdx === -1) return;

      const sourceParent = state.attributes[sourceIdx];
      const targetParent = state.attributes[targetIdx];
      if (isUsedByAggregationParent(sourceParent, sourceID)) return;

      if (recover == null || recover) {
        state.recoverableOperations.push({
          change: "relationshipNode",
          associatedId: sourceID,
          associatedParent: sourceParent.id,
          associatedData: {
            originalPos: toRelatedList(sourceParent).findIndex(
              (n) => n === sourceID,
            ),
          },
        });
      }

      const moves = applyAssignmentChange(state, [sourceID], targetParent.id);
      if (moves.length === 0) return;

      pushAssignmentHistoryEntry(state, moves);
      state.hierarchyRevision += 0.5;
    }),

    changeRelationshipBatch: create.reducer((state, action) => {
      const { sourceIDs, targetID, recover } = action.payload || {};
      if (!Array.isArray(sourceIDs) || sourceIDs.length === 0) return;

      const targetIdx = findNodeIndexById(state.attributes, targetID);
      if (targetIdx === -1) return;

      const targetParent = state.attributes[targetIdx];
      const moveCandidates = [];

      [...new Set(sourceIDs)].forEach((sourceID) => {
        const sourceIdx = findParentIndexByChildId(state.attributes, sourceID);
        if (sourceIdx === -1) return;

        const sourceParent = state.attributes[sourceIdx];
        if (isUsedByAggregationParent(sourceParent, sourceID)) return;

        moveCandidates.push({ sourceID, sourceIdx });
      });

      if (moveCandidates.length === 0) return;

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
                (n) => n === sourceID,
              ),
            },
          });
        });
      }

      const moves = applyAssignmentChange(
        state,
        moveCandidates.map((move) => move.sourceID),
        targetParent.id,
      );
      if (moves.length === 0) return;

      pushAssignmentHistoryEntry(state, moves);
      state.hierarchyRevision += 0.5;
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
        const nodeIdx = state.attributes.findIndex(
          (node) => node.id === nodeId,
        );
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
      state.hierarchyRevision += 0.5;
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
      state.hierarchyRevision += 0.5;
    }),

    aggregateSelectedNodes: create.reducer((state, action) => {
      const {
        id,
        name,
        type,
        recover,
        aggregationConfig,
        childIDs,
        parentID,
        sourceID,
      } =
        action.payload;
      const parentNode = state.attributes.find((n) => n.id === parentID);
      if (!parentNode) return;

      const newAggregationConfig =
        aggregationConfig ??
        (type === "aggregation"
          ? createEmptyAggregationConfig()
          : createEmptyAggregationConfig());

      const newNode = sanitizeHierarchyNode({
        id,
        name,
        related: [],
        type,
        aggregationConfig: newAggregationConfig,
        isExpanded: true,
        isActive: true,
        description: "",
        dtype: "determine",
      });

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
          n.related.includes(source),
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
          sourceNode.aggregationConfig?.usedAttributes
        ) {
          sourceNode.aggregationConfig.usedAttributes =
            sourceNode.aggregationConfig.usedAttributes.filter(
              (usedId) => usedId !== source,
            );
        }
      });

      state.hierarchyRevision += 0.5;
    }),
  }),
  extraReducers: (builder) => {
    builder
      .addCase(updateHierarchy.pending, (state) => {
        state.loadingHierarchy = true;
      })
      .addCase(updateHierarchy.fulfilled, (state, action) => {
        const { hierarchy, filename } = action.payload;
        state.attributes = Array.isArray(hierarchy)
          ? hierarchy.map((node) => sanitizeHierarchyNode(node))
          : [];
        state.filename = filename;
        state.loadingHierarchy = false;
        clearAssignmentHistory(state);
        state.hierarchyRevision = state.hierarchyRevision === 0 ? 1 : 0;
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
        state.attributes = Array.isArray(attributes)
          ? attributes.map((node) => sanitizeHierarchyNode(node))
          : [];
        state.descriptionsFilename = filename;
        state.loadingDescriptions = false;
        state.hierarchyRevision = state.hierarchyRevision === 0 ? 1 : 0;
      })
      .addCase(updateDescriptions.rejected, (state, action) => {
        state.loadingDescriptions = false;
        state.error = action.payload || action.error || null;
      });

    builder.addCase(buildMetaFromVariableTypes.fulfilled, (state, action) => {
      state.attributes = Array.isArray(action.payload)
        ? action.payload.map((node) => sanitizeHierarchyNode(node))
        : [];
      clearAssignmentHistory(state);
      state.hierarchyRevision = state.hierarchyRevision === 0 ? 1 : 0;
    });

    builder.addCase(createToMeta.fulfilled, (state, action) => {
      state.attributes = Array.isArray(action.payload)
        ? action.payload.map((node) => sanitizeHierarchyNode(node))
        : [];
      clearAssignmentHistory(state);
      state.hierarchyRevision = Math.min(state.hierarchyRevision - 1, 0);
    });

    builder.addCase(addAttribute.fulfilled, (state, action) => {
      const {
        id,
        name,
        parentID,
        type,
        recover,
        aggregationConfig,
        dtype,
      } = action.payload;
      const parentPosition = state.attributes.findIndex(
        (n) => n.id === parentID,
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

      let newAggregationConfig;
      if (aggregationConfig == null) {
        newAggregationConfig = createEmptyAggregationConfig();
      } else {
        newAggregationConfig = sanitizeAggregationConfig(aggregationConfig);
      }

      state.attributes.push(sanitizeHierarchyNode({
        id: id,
        name: name,
        related: [],
        type: type,
        aggregationConfig: newAggregationConfig,
        isExpanded: true,
        isActive: true,
        description: "",
        dtype: dtype ? dtype : type === "aggregation" ? "determine" : "number",
      }));

      state.attributes[parentPosition].isExpanded = true;

      state.attributes[parentPosition].related.push(id);
      state.hierarchyRevision += aggregationConfig ? 0 : 1;
    });

    builder.addCase(removeAttribute.fulfilled, (state, action) => {
      const { attributeID, recover } = action.payload;
      applyAttributeRemovals(state, [attributeID], recover);
    });

    builder.addCase(removeAttributeBatch.fulfilled, (state, action) => {
      const { removed = [], recover } = action.payload || {};
      applyAttributeRemovals(
        state,
        removed.map((node) => node.attributeID),
        recover,
      );
    });

    builder.addCase(updateAttribute.fulfilled, (state, action) => {
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
        ...sanitizeHierarchyNode(node),
        aggregationConfig: sanitizeAggregationConfig(node.aggregationConfig),
      };
      state.hierarchyRevision += recover != null || recover ? 0.5 : -0.5;
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
  toggleAttribute,
  changeRelationship,
  changeRelationshipBatch,
  setNodeOverviewAccess,
  setNodesOverviewAccess,
  undoAssignmentChange,
  redoAssignmentChange,
  aggregateSelectedNodes,
  changeOrder,
} = metaSlice.actions;

export default metaSlice.reducer;
