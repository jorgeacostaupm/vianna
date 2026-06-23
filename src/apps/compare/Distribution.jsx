import { useCallback, useMemo } from "react";

import ViewContainer from "@/components/charts/ViewContainer";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";
import useDistributionViewState from "./useDistributionViewState";

export default function Distribution({
  id,
  variable,
  remove,
  sourceOrderValues = [],
  config: persistedConfig,
  updateView,
  defaultConfig,
  getData,
  isRowValid,
  chartStrategies,
  fallbackChart: FallbackChart,
  settings: Settings,
}) {
  const handleConfigChange = useCallback(
    (nextConfig) => updateView?.({ config: nextConfig }),
    [updateView],
  );
  const [config, setConfig] = useWorkspaceBackedState({
    defaultValue: defaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });
  const { data, requiredVariables, recordOrders, variableDescription } =
    useDistributionViewState({
      variable,
      sourceOrderValues,
      isSync: config.isSync,
      getData,
      isRowValid,
    });

  const chart = useMemo(() => {
    if (!data?.length) return <NoDataPlaceholder />;
    const Chart = chartStrategies[config.chartType] ?? FallbackChart;
    return <Chart data={data} config={{ ...config, showGrid: true }} id={id} />;
  }, [FallbackChart, chartStrategies, config, data, id]);

  return (
    <ViewContainer
      title={`Distribution · ${variable}`}
      hoverTitle={variableDescription || undefined}
      svgIDs={[id]}
      remove={remove}
      settings={<Settings config={config} setConfig={setConfig} />}
      chart={chart}
      config={config}
      setConfig={setConfig}
      recordsExport={{
        filename: `distribution_${variable || "view"}`,
        recordOrders,
        requiredVariables,
      }}
    />
  );
}
