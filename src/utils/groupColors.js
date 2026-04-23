import * as d3 from "d3";

const TABLEAU_YELLOW = "#edc949";

export const GROUP_CATEGORICAL_PALETTE = [
  ...d3.schemeTableau10.filter((color) => color !== TABLEAU_YELLOW),
  TABLEAU_YELLOW,
];

const dataframeGroupCache = new WeakMap();

export function normalizeGroupList(groups) {
  if (!Array.isArray(groups)) return [];

  const seen = new Set();
  const normalized = [];

  for (const group of groups) {
    if (group == null || seen.has(group)) continue;
    seen.add(group);
    normalized.push(group);
  }

  return normalized;
}

export function compareGroupsAlphanumerically(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortGroupsAlphanumerically(groups) {
  return normalizeGroupList(groups).sort(compareGroupsAlphanumerically);
}

export function getOrderedGroupsFromDataframe(dataframe, groupVar) {
  if (!Array.isArray(dataframe) || !groupVar) return [];

  let cacheByColumn = dataframeGroupCache.get(dataframe);
  if (!cacheByColumn) {
    cacheByColumn = new Map();
    dataframeGroupCache.set(dataframe, cacheByColumn);
  }

  if (cacheByColumn.has(groupVar)) {
    return cacheByColumn.get(groupVar);
  }

  const seen = new Set();
  const ordered = [];

  for (const row of dataframe) {
    if (!row || typeof row !== "object") continue;

    const value = row[groupVar];
    if (value == null || seen.has(value)) continue;

    seen.add(value);
    ordered.push(value);
  }

  cacheByColumn.set(groupVar, ordered);
  return ordered;
}
