export const buildAggregationMenuNodes = ({
  attributes = [],
  node,
  relatedNodes = [],
  meanWeights = new Map(),
}) => {
  const usedAttributeIds = new Set(
    Array.isArray(node?.aggregationConfig?.usedAttributes)
      ? node.aggregationConfig.usedAttributes
      : [],
  );
  const sourceNodes =
    relatedNodes.length > 0
      ? relatedNodes
      : attributes.filter((attribute) => {
          if (!attribute || attribute.id === node?.id || attribute.id === 0) {
            return false;
          }
          return attribute.type !== "root";
        });

  return sourceNodes
    .map((attribute) => {
      if (!attribute) return null;
      return {
        id: attribute.id,
        name: attribute.name,
        weight: meanWeights.get(attribute.name) ?? 1,
        used: usedAttributeIds.has(attribute.id),
      };
    })
    .filter((attribute) => attribute?.name);
};
