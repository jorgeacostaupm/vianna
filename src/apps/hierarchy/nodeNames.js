const DEFAULT_PREFIX = "node";

const getExistingNames = (nodes = []) =>
  new Set(
    (Array.isArray(nodes) ? nodes : [])
      .map((node) => node?.name)
      .filter((name) => typeof name === "string" && name.trim().length > 0),
  );

const getUniqueWithSuffix = (baseName, existingNames) => {
  let index = 2;
  let candidate = `${baseName}_${index}`;

  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName}_${index}`;
  }

  return candidate;
};

export const createUniqueGeneratedNodeName = (
  nodes = [],
  startIndex = (Array.isArray(nodes) ? nodes.length : 0) + 1,
  prefix = DEFAULT_PREFIX,
) => {
  const existingNames = getExistingNames(nodes);
  const safePrefix =
    typeof prefix === "string" && prefix.trim() ? prefix.trim() : DEFAULT_PREFIX;
  let index = Number.isInteger(startIndex) ? Math.max(1, startIndex) : 1;
  let candidate = `${safePrefix}_${index}`;

  // ponytail: linear scan is fine for interactive trees; precompute prefix
  // counters if very large imported hierarchies make node creation slow.
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${safePrefix}_${index}`;
  }

  return candidate;
};

export const createUniqueNodeName = (nodes = [], preferredName, startIndex) => {
  const existingNames = getExistingNames(nodes);
  const trimmedPreferred =
    typeof preferredName === "string" ? preferredName.trim() : "";

  if (!trimmedPreferred) {
    return createUniqueGeneratedNodeName(nodes, startIndex);
  }

  if (!existingNames.has(trimmedPreferred)) {
    return trimmedPreferred;
  }

  return getUniqueWithSuffix(trimmedPreferred, existingNames);
};
