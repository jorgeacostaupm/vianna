import * as aq from "arquero";
import processFormula from "@/utils/processFormula";

const isEmptyNumericValue = (value) =>
  value === null || value === undefined || value === "";

let aggregationWorker = null;
let workerRequestId = 0;
const workerRequests = new Map();

export const normalizeNumericColumn = (rows, column) =>
  rows.map((row) => {
    const value = row[column];
    if (isEmptyNumericValue(value)) {
      return { ...row, [column]: null };
    }

    const numberValue = Number(value);
    return {
      ...row,
      [column]: Number.isNaN(numberValue) ? null : numberValue,
    };
  });

export const normalizeStringColumn = (rows, column) =>
  rows.map((row) => ({
    ...row,
    [column]: row[column] == null ? null : String(row[column]),
  }));

const applySingleDerivationToRows = ({
  rows,
  colName,
  derivedFn,
  enforceNumber = false,
}) => {
  const table = aq.from(rows || []);
  const outputRows =
    rows && rows.length > 0
      ? table.derive({ [colName]: derivedFn }, { drop: false }).objects()
      : [];

  if (!enforceNumber) return outputRows;
  return normalizeNumericColumn(outputRows, colName);
};

const applyBatchDerivationToRows = ({ rows, columns, formated }) => {
  if (!rows || rows.length === 0) return [];
  const table = aq.from(rows || []);
  let outputRows = table.derive(formated, { drop: false }).objects();

  const enforceNumberColumns = columns
    .filter((column) => column?.enforceNumber)
    .map((column) => column.name);

  enforceNumberColumns.forEach((columnName) => {
    outputRows = normalizeNumericColumn(outputRows, columnName);
  });

  return outputRows;
};

const runDerivationLocally = ({ mode, dataframe, quarantineData, columns }) => {
  if (mode === "single") {
    const column = columns[0];
    const baseTable = aq.from(dataframe || []);
    const derivedFn = processFormula(baseTable, column.formula);

    const data = applySingleDerivationToRows({
      rows: dataframe,
      colName: column.name,
      derivedFn,
      enforceNumber: Boolean(column.enforceNumber),
    });

    const quarantine = applySingleDerivationToRows({
      rows: quarantineData,
      colName: column.name,
      derivedFn,
      enforceNumber: Boolean(column.enforceNumber),
    });

    return { data, quarantineData: quarantine };
  }

  const baseTable = aq.from(dataframe || []);
  const formated = {};
  columns.forEach((column) => {
    if (!column?.name || !column?.formula) return;
    formated[column.name] = processFormula(baseTable, column.formula);
  });

  const data = applyBatchDerivationToRows({
    rows: dataframe,
    columns,
    formated,
  });

  const quarantine = applyBatchDerivationToRows({
    rows: quarantineData,
    columns,
    formated,
  });

  return { data, quarantineData: quarantine };
};

const getAggregationWorker = () => {
  if (typeof Worker === "undefined") return null;

  if (!aggregationWorker) {
    aggregationWorker = new Worker(
      new URL("../../../../workers/aggregationWorker.js", import.meta.url),
      { type: "module" },
    );

    aggregationWorker.onmessage = (event) => {
      const { requestId, ok, payload, error } = event.data || {};
      const pending = workerRequests.get(requestId);
      if (!pending) return;
      workerRequests.delete(requestId);
      if (ok) {
        pending.resolve(payload);
        return;
      }
      pending.reject(new Error(error || "Aggregation worker failed"));
    };

    aggregationWorker.onerror = (event) => {
      const error = event?.message || "Aggregation worker crashed";
      workerRequests.forEach(({ reject }) => reject(new Error(error)));
      workerRequests.clear();
      aggregationWorker = null;
    };
  }

  return aggregationWorker;
};

const runDerivationInWorker = (payload) => {
  const worker = getAggregationWorker();
  if (!worker) return null;

  const requestId = ++workerRequestId;
  return new Promise((resolve, reject) => {
    workerRequests.set(requestId, { resolve, reject });
    worker.postMessage({
      requestId,
      ...payload,
    });
  });
};

export const computeAggregationRows = async ({
  mode,
  dataframe,
  quarantineData,
  columns,
}) => {
  const payload = {
    mode,
    dataframe: Array.isArray(dataframe) ? dataframe : [],
    quarantineData: Array.isArray(quarantineData) ? quarantineData : [],
    columns: Array.isArray(columns) ? columns : [],
  };

  try {
    const workerResult = await runDerivationInWorker(payload);
    if (workerResult) return workerResult;
  } catch {
    // Fallback local if worker is unavailable or crashes.
  }

  return runDerivationLocally(payload);
};

const parseFormulaDependencies = (execFormula) => {
  if (!execFormula) return [];
  const dependencies = new Set();
  const regex = /\$\(([^)]+)\)/g;
  let match = regex.exec(execFormula);
  while (match) {
    const variable = String(match[1] ?? "").trim();
    if (variable) dependencies.add(variable);
    match = regex.exec(execFormula);
  }
  return [...dependencies];
};

export const getAggregationDependencies = (node, nodeById) => {
  const usedById = Array.isArray(node?.info?.usedAttributes)
    ? node.info.usedAttributes
        .map((used) => nodeById.get(used?.id)?.name)
        .filter(Boolean)
    : [];

  const usedByFormula = parseFormulaDependencies(node?.info?.exec);
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

  // Si hay ciclo o dependencia inválida, mantenemos los restantes en orden original.
  if (ordered.length < names.length) {
    names.forEach((name) => {
      if (!ordered.includes(name)) ordered.push(name);
    });
  }

  return ordered;
};

export const recomputeAggregationColumns = (rows, aggregationNodes) => {
  let currentRows = Array.isArray(rows) ? rows : [];
  aggregationNodes.forEach((node) => {
    if (!node?.name || !node?.info?.exec) return;
    const table = aq.from(currentRows);
    const derivedFn = processFormula(table, node.info.exec);
    currentRows = table.derive({ [node.name]: derivedFn }, { drop: false }).objects();
  });
  return currentRows;
};
