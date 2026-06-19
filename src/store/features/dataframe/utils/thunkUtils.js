import {
  deriveAggregationColumnsForRows,
  deriveAggregationRows,
  normalizeNumericColumn,
  normalizeStringColumn,
} from "@/utils/aggregationEngine";
import { getAggregationExecutableFormula } from "@/store/features/metadata/utils/thunkUtils";
export {
  getAffectedAggregationNodes,
  getAggregationDependencies,
  sortAggregationsByDependency,
} from "./aggregationDependencies";

let aggregationWorker = null;
let workerRequestId = 0;
const workerRequests = new Map();

export { normalizeNumericColumn, normalizeStringColumn };

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

  return deriveAggregationRows(payload);
};

export const recomputeAggregationColumns = (rows, aggregationNodes) => {
  const columns = (Array.isArray(aggregationNodes) ? aggregationNodes : [])
    .map((node) => ({
      name: node?.name,
      formula: getAggregationExecutableFormula(node?.aggregationConfig),
      enforceNumber: Boolean(node?.dtype === "number"),
    }))
    .filter((column) => column.name && column.formula);

  return deriveAggregationColumnsForRows(rows, columns);
};
