const parseFormulaDependencies = (execFormula) => {
  const dependencies = new Set();
  const regex = /\$\(([^)]+)\)/g;
  let match = regex.exec(execFormula || "");
  while (match) {
    const variable = String(match[1] ?? "").trim();
    if (variable) dependencies.add(variable);
    match = regex.exec(execFormula);
  }
  return [...dependencies];
};

export const getAggregationDependencies = (node, nodeById) => {
  const usedById = Array.isArray(node?.aggregationConfig?.usedAttributes)
    ? node.aggregationConfig.usedAttributes
        .map((usedId) => nodeById.get(usedId)?.name)
        .filter(Boolean)
    : [];

  const usedByFormula = parseFormulaDependencies(
    node?.aggregationConfig?.formula,
  );
  return [...new Set([...usedById, ...usedByFormula])];
};

export const sortAggregationsByDependency = (
  aggregationNodes,
  dependenciesByName,
) => {
  const names = aggregationNodes.map((node) => node.name);
  const nameSet = new Set(names);
  const indegree = new Map(names.map((name) => [name, 0]));
  const outgoing = new Map(names.map((name) => [name, new Set()]));

  names.forEach((name) => {
    const deps = dependenciesByName.get(name) || [];
    deps.forEach((depName) => {
      if (!nameSet.has(depName) || depName === name) return;
      indegree.set(name, (indegree.get(name) || 0) + 1);
      outgoing.get(depName).add(name);
    });
  });

  const queue = names.filter((name) => (indegree.get(name) || 0) === 0);
  const ordered = [];

  while (queue.length > 0) {
    const next = queue.shift();
    ordered.push(next);
    (outgoing.get(next) || []).forEach((target) => {
      const newDegree = (indegree.get(target) || 0) - 1;
      indegree.set(target, newDegree);
      if (newDegree === 0) queue.push(target);
    });
  }

  // ponytail: cycles keep original order; upgrade to UI validation if formulas can be edited here.
  if (ordered.length < names.length) {
    names.forEach((name) => {
      if (!ordered.includes(name)) ordered.push(name);
    });
  }

  return ordered;
};

export const getAffectedAggregationNodes = (attributes, changedColumns) => {
  const sourceColumns = Array.isArray(changedColumns)
    ? changedColumns.filter(Boolean)
    : [changedColumns].filter(Boolean);
  if (sourceColumns.length === 0) return [];

  const nodes = Array.isArray(attributes) ? attributes : [];
  const aggregationNodes = nodes.filter(
    (node) => node?.type === "aggregation" && node?.name,
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const dependenciesByAggregation = new Map();
  const dependentsBySource = new Map();

  aggregationNodes.forEach((agg) => {
    const deps = getAggregationDependencies(agg, nodeById);
    dependenciesByAggregation.set(agg.name, deps);
    deps.forEach((depName) => {
      if (!dependentsBySource.has(depName)) {
        dependentsBySource.set(depName, new Set());
      }
      dependentsBySource.get(depName).add(agg.name);
    });
  });

  const affectedAggregationNames = new Set();
  const queue = [...sourceColumns];

  while (queue.length > 0) {
    const sourceName = queue.shift();
    const dependents = dependentsBySource.get(sourceName);
    if (!dependents) continue;
    dependents.forEach((dependentName) => {
      if (affectedAggregationNames.has(dependentName)) return;
      affectedAggregationNames.add(dependentName);
      queue.push(dependentName);
    });
  }

  const affectedNodes = aggregationNodes.filter((node) =>
    affectedAggregationNames.has(node.name),
  );
  const orderedNames = sortAggregationsByDependency(
    affectedNodes,
    dependenciesByAggregation,
  );
  const nodeByName = new Map(affectedNodes.map((node) => [node.name, node]));
  return orderedNames.map((name) => nodeByName.get(name)).filter(Boolean);
};
