export const moveRelatedIdsAsBlock = (related, sourceIDs, newIndex) => {
  if (!Array.isArray(related) || !Array.isArray(sourceIDs)) return related;
  if (!Number.isInteger(newIndex)) return related;

  const sourceSet = new Set(sourceIDs.filter((id) => id != null));
  if (sourceSet.size === 0) return related;

  const moving = related.filter((id) => sourceSet.has(id));
  if (moving.length !== sourceSet.size) return related;

  const remaining = related.filter((id) => !sourceSet.has(id));
  if (newIndex < 0 || newIndex > remaining.length) return related;

  const next = [
    ...remaining.slice(0, newIndex),
    ...moving,
    ...remaining.slice(newIndex),
  ];

  return next.every((id, index) => id === related[index]) ? related : next;
};
