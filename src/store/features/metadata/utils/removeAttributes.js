const toRelatedList = (node) =>
  Array.isArray(node?.related) ? node.related : [];

const removeFromAggregationUsedAttributes = (node, childId) => {
  if (node?.type !== "aggregation") return;
  if (!Array.isArray(node?.aggregationConfig?.usedAttributes)) return;
  node.aggregationConfig.usedAttributes =
    node.aggregationConfig.usedAttributes.filter((usedId) => usedId !== childId);
};

export function applyAttributeRemovals(state, attributeIDs, recover) {
  if (!Array.isArray(state?.attributes) || !Array.isArray(attributeIDs)) {
    return 0;
  }

  let removedCount = 0;

  attributeIDs.forEach((attributeID) => {
    if (attributeID === 0) return;

    const parentIdx = state.attributes.findIndex((node) =>
      toRelatedList(node).includes(attributeID),
    );
    if (parentIdx === -1) return;

    const attribute = state.attributes.find((node) => node.id === attributeID);
    if (!attribute) return;

    const parentNode = state.attributes[parentIdx];

    parentNode.related = toRelatedList(parentNode).filter(
      (id) => id !== attributeID,
    );
    parentNode.related = [...parentNode.related, ...toRelatedList(attribute)];
    removeFromAggregationUsedAttributes(parentNode, attributeID);

    state.attributes = state.attributes.filter(
      (node) => node.id !== attributeID,
    );
    removedCount += 1;
  });

  if (removedCount > 0) {
    // ponytail: one revision bump for the batch; per-node undo history stays as before.
    state.hierarchyRevision += recover ? 0.5 : -0.5;
  }

  return removedCount;
}
