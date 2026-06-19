export const getSiblingReorderIndex = ({
  draggedX,
  originalIndex,
  sortedSiblings,
  assignRadius,
}) => {
  if (!Array.isArray(sortedSiblings) || sortedSiblings.length === 0) {
    return originalIndex;
  }

  // ponytail: sibling order is the tree x-axis; revisit if the layout gains a vertical sibling axis.
  for (let i = 0; i < sortedSiblings.length; i += 1) {
    const sibling = sortedSiblings[i];
    const threshold =
      i < originalIndex ? sibling.x - assignRadius : sibling.x + assignRadius;

    if (draggedX < threshold) return i;
  }

  return sortedSiblings.length;
};
