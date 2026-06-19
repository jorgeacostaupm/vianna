export function valueToKey(value) {
  return String(value);
}

export function buildNodeKey(visit, value) {
  return `${String(visit)}||${valueToKey(value)}`;
}

export function buildEdgeKey(fromVisit, fromValue, toVisit, toValue) {
  return `${buildNodeKey(fromVisit, fromValue)}=>${buildNodeKey(toVisit, toValue)}`;
}

export function detectDiscreteLowCardinality(
  subjects = [],
  visits = [],
  maxDistinct = 10,
) {
  if (!Array.isArray(subjects) || !subjects.length) return false;
  if (!Array.isArray(visits) || !visits.length) return false;

  for (const visit of visits) {
    const observed = new Set();
    subjects.forEach((subject) => {
      const point = (subject?.values || []).find(
        (entry) => String(entry?.timestamp) === String(visit),
      );
      const numericValue = Number(point?.value);
      if (Number.isFinite(numericValue)) {
        observed.add(valueToKey(numericValue));
      }
    });
    if (observed.size === 0 || observed.size >= maxDistinct) return false;
  }

  return true;
}

export function detectSingleActiveEvolution(visibleGroups = []) {
  if (!Array.isArray(visibleGroups) || visibleGroups.length !== 1) return null;
  return visibleGroups[0];
}

export function buildAggregatedNodes(subjects = [], visits = []) {
  const rankByVisit = new Map(
    visits.map((visit, index) => [String(visit), index]),
  );
  const nodesByKey = new Map();

  subjects.forEach((subject) => {
    (subject?.values || []).forEach((entry) => {
      const visit = String(entry?.timestamp);
      if (!rankByVisit.has(visit)) return;

      const value = Number(entry?.value);
      if (!Number.isFinite(value)) return;

      const key = buildNodeKey(visit, value);
      if (!nodesByKey.has(key)) {
        nodesByKey.set(key, {
          key,
          visit,
          value,
          subjectIds: new Set(),
        });
      }
      nodesByKey.get(key).subjectIds.add(subject?.id);
    });
  });

  return [...nodesByKey.values()].sort((left, right) => {
    const leftRank =
      rankByVisit.get(String(left.visit)) ?? Number.MAX_SAFE_INTEGER;
    const rightRank =
      rankByVisit.get(String(right.visit)) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (left.value !== right.value) return left.value - right.value;
    return String(left.key).localeCompare(String(right.key));
  });
}

export function buildAggregatedEdges(subjects = [], visits = []) {
  const edgesByKey = new Map();
  if (!Array.isArray(visits) || visits.length < 2) return [];

  subjects.forEach((subject) => {
    const valueByVisit = new Map();
    (subject?.values || []).forEach((entry) => {
      const numericValue = Number(entry?.value);
      if (!Number.isFinite(numericValue)) return;
      valueByVisit.set(String(entry?.timestamp), numericValue);
    });

    for (let index = 0; index < visits.length - 1; index += 1) {
      const fromVisit = String(visits[index]);
      const toVisit = String(visits[index + 1]);
      if (!valueByVisit.has(fromVisit) || !valueByVisit.has(toVisit)) continue;

      const fromValue = valueByVisit.get(fromVisit);
      const toValue = valueByVisit.get(toVisit);
      const key = buildEdgeKey(fromVisit, fromValue, toVisit, toValue);

      if (!edgesByKey.has(key)) {
        edgesByKey.set(key, {
          key,
          fromVisit,
          fromValue,
          toVisit,
          toValue,
          subjectIds: new Set(),
        });
      }
      edgesByKey.get(key).subjectIds.add(subject?.id);
    }
  });

  const rankByVisit = new Map(
    visits.map((visit, index) => [String(visit), index]),
  );

  return [...edgesByKey.values()].sort((left, right) => {
    const leftRank =
      rankByVisit.get(String(left.fromVisit)) ?? Number.MAX_SAFE_INTEGER;
    const rightRank =
      rankByVisit.get(String(right.fromVisit)) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (left.fromValue !== right.fromValue) return left.fromValue - right.fromValue;
    if (left.toValue !== right.toValue) return left.toValue - right.toValue;
    return String(left.key).localeCompare(String(right.key));
  });
}

export function toggleNodeSelection(prevSelectedNodesByVisit, visit, value) {
  const visitKey = String(visit);
  const valueKey = valueToKey(value);
  const next = { ...prevSelectedNodesByVisit };
  const current = new Set(next[visitKey] || []);

  if (current.has(valueKey)) {
    current.delete(valueKey);
  } else {
    current.add(valueKey);
  }

  if (!current.size) {
    delete next[visitKey];
  } else {
    next[visitKey] = current;
  }

  return next;
}

export function toggleVisitSelection(
  prevSelectedNodesByVisit,
  visit,
  valueKeys = [],
) {
  const visitKey = String(visit);
  const next = { ...prevSelectedNodesByVisit };
  const available = [...new Set((valueKeys || []).map((value) => String(value)))];
  if (!available.length) return next;

  const current = new Set(next[visitKey] || []);
  const allSelected = available.every((value) => current.has(value));
  if (allSelected) {
    delete next[visitKey];
    return next;
  }

  next[visitKey] = new Set(available);
  return next;
}

export function clearSelectedNodes() {
  return {};
}

export function hasSelectedNodes(selectedNodesByVisit) {
  if (!selectedNodesByVisit) return false;
  return Object.values(selectedNodesByVisit).some(
    (values) => values && values.size > 0,
  );
}

export function computeCompatibleSubjects(
  selectedNodesByVisit,
  activeEvolutionSubjects = [],
) {
  const selectedEntries = Object.entries(selectedNodesByVisit || {}).filter(
    ([, allowedValues]) => allowedValues && allowedValues.size > 0,
  );

  const allIds = new Set(activeEvolutionSubjects.map((subject) => subject?.id));
  if (!selectedEntries.length) return allIds;

  const compatible = new Set();
  activeEvolutionSubjects.forEach((subject) => {
    const valueByVisit = new Map(
      (subject?.values || []).map((entry) => [
        String(entry?.timestamp),
        Number(entry?.value),
      ]),
    );

    const matchesAllVisits = selectedEntries.every(([visit, allowedValues]) => {
      if (!valueByVisit.has(visit)) return false;
      const value = valueByVisit.get(visit);
      if (!Number.isFinite(value)) return false;
      return allowedValues.has(valueToKey(value));
    });

    if (matchesAllVisits) compatible.add(subject?.id);
  });

  return compatible;
}

export function computeNodeTotals(nodes = []) {
  const totals = new Map();
  nodes.forEach((node) => {
    totals.set(node.key, node.subjectIds?.size || 0);
  });
  return totals;
}

export function computeNodeCompatibleCounts(
  nodes = [],
  compatibleSubjects = new Set(),
) {
  const compatibleCounts = new Map();
  nodes.forEach((node) => {
    let count = 0;
    (node.subjectIds || []).forEach((subjectId) => {
      if (compatibleSubjects.has(subjectId)) count += 1;
    });
    compatibleCounts.set(node.key, count);
  });
  return compatibleCounts;
}

export function computeEdgeTotals(edges = []) {
  const totals = new Map();
  edges.forEach((edge) => {
    totals.set(edge.key, edge.subjectIds?.size || 0);
  });
  return totals;
}

export function computeEdgeCompatibleCounts(
  edges = [],
  compatibleSubjects = new Set(),
) {
  const compatibleCounts = new Map();
  edges.forEach((edge) => {
    let count = 0;
    (edge.subjectIds || []).forEach((subjectId) => {
      if (compatibleSubjects.has(subjectId)) count += 1;
    });
    compatibleCounts.set(edge.key, count);
  });
  return compatibleCounts;
}
