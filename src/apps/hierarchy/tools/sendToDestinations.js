const normalizeSearchText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getNodeName = (node) =>
  node?.data?.name || node?.name || `Node #${node?.id ?? "unknown"}`;

const getNodeType = (node) => node?.data?.type || node?.type || "node";

export const getNodePath = (node) =>
  (node?.ancestors?.() || [])
    .reverse()
    .map(getNodeName)
    .join(" / ");

const getInvalidDestinationIds = (movingNodes) => {
  const invalidIds = new Set();

  movingNodes.forEach((node) => {
    (node?.descendants?.() || [node]).forEach((descendant) => {
      if (descendant?.id != null) invalidIds.add(descendant.id);
    });
  });

  return invalidIds;
};

const getMatchScore = ({ name, path }, query) => {
  if (!query) return 0;

  const lowerName = normalizeSearchText(name);
  const lowerPath = normalizeSearchText(path);

  if (lowerName === query) return 0;
  if (lowerName.startsWith(query)) return 1;
  if (lowerName.includes(query)) return 2;
  if (lowerPath.includes(query)) return 3;
  return null;
};

export function getSendToDestinations({ root, movingNodes, query = "" }) {
  const nodesToMove = Array.isArray(movingNodes) ? movingNodes : [];
  const invalidIds = getInvalidDestinationIds(nodesToMove);
  const normalizedQuery = normalizeSearchText(query);

  return (root?.descendants?.() || [])
    .map((node) => {
      const name = getNodeName(node);
      const path = getNodePath(node);
      const score = getMatchScore({ name, path }, normalizedQuery);

      return {
        id: node.id,
        name,
        path,
        type: getNodeType(node),
        score,
      };
    })
    .filter((destination) => {
      if (invalidIds.has(destination.id)) return false;
      return destination.score != null;
    })
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
    );
}
