import { deriveAggregationRows } from "../utils/aggregationEngine";

self.onmessage = (event) => {
  const { requestId, mode, dataframe, quarantineData, columns } = event.data || {};
  try {
    const payload = deriveAggregationRows({
      mode,
      dataframe,
      quarantineData,
      columns,
    });

    self.postMessage({
      requestId,
      ok: true,
      payload,
    });
  } catch (error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error?.message || "Aggregation worker failed",
    });
  }
};
