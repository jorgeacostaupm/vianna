import { useCallback, useMemo, useState } from "react";

import Settings from "./Settings";
import createD3Chart from "@/components/charts/createD3Chart";
import useCorrelationMatrix from "./useCorrelationMatrix";
import useCorrelationMatrixData from "./useCorrelationMatrixData";
import ViewContainer from "@/components/charts/ViewContainer";
import { createViewModel } from "@/components/charts/view/createViewModel";
import { ORDER_VARIABLE } from "@/utils/constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import useSelectionRows from "@/hooks/useSelectionRows";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";
import {
  correlationMatrixDefaultConfig,
  correlationMatrixDefaultParams,
} from "./correlationMatrixDefaults";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";

const Chart = createD3Chart(useCorrelationMatrix);

export default function CorrelationMatrix({
  id,
  remove,
  sourceOrderValues = [],
  config: persistedConfig,
  params: persistedParams,
  updateView,
}) {
  const handleConfigChange = useCallback(
    (nextConfig) => updateView?.({ config: nextConfig }),
    [updateView],
  );
  const handleParamsChange = useCallback(
    (nextParams) => updateView?.({ params: nextParams }),
    [updateView],
  );
  const [config, setConfig] = useWorkspaceBackedState({
    defaultValue: correlationMatrixDefaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });
  const [params, setParams] = useWorkspaceBackedState({
    defaultValue: correlationMatrixDefaultParams,
    persistedValue: persistedParams,
    onChange: handleParamsChange,
  });
  const [info, setInfo] = useState(null);
  const selectionColumns = useMemo(
    () => uniqueColumns([...(params.variables || []), ORDER_VARIABLE]),
    [Array.isArray(params.variables) ? params.variables.join("|") : ""],
  );
  const selection = useSelectionRows(selectionColumns);
  const [data] = useCorrelationMatrixData(config.isSync, params, setInfo);

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const vars = Array.isArray(params.variables) ? params.variables : [];
        if (vars.length < 2) return false;
        return vars.every((name) => isFiniteNumericValue(row?.[name]));
      }),
    [
      selection,
      Array.isArray(params.variables) ? params.variables.join("|") : "",
    ],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(
    () => uniqueColumns([...(params.variables || []), ORDER_VARIABLE]),
    [Array.isArray(params.variables) ? params.variables.join("|") : ""],
  );

  const chart = useMemo(() => {
    return <Chart data={data} config={config} params={params} id={id} />;
  }, [config, data, params]);

  const viewModel = createViewModel({
    title: "Correlation Matrix",
    svgIDs: [id],
    remove,
    settings: (
      <Settings
        info
        config={config}
        setConfig={setConfig}
        params={params}
        setParams={setParams}
      />
    ),
    chart,
    config,
    setConfig,
    info,
    recordsExport: {
      filename: "correlation_matrix",
      recordOrders,
      requiredVariables,
    },
  });

  return <ViewContainer view={viewModel} />;
}
