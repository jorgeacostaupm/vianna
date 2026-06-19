import React, { useCallback, useMemo } from "react";

import { getCategoricDistributionData as getData } from "@/utils/functionsCompare";
import ViewContainer from "@/components/charts/ViewContainer";
import { GroupedBarChart, StackedBarChart } from "./charts";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import Settings from "./Settings";
import useDistributionViewState from "../useDistributionViewState";
import categoricDefaultConfig from "./categoricDefaultConfig";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";

const chartStrategies = {
  stacked: StackedBarChart,
  grouped: GroupedBarChart,
};

const isCategoricRowValid = ({ row, groupVar, variable }) => {
  const groupValue = row?.[groupVar];
  const categoryValue = row?.[variable];
  return groupValue != null && categoryValue != null;
};

export default function Categoric({
  id,
  variable,
  remove,
  sourceOrderValues = [],
  config: persistedConfig,
  updateView,
}) {
  const handleConfigChange = useCallback(
    (nextConfig) => updateView?.({ config: nextConfig }),
    [updateView],
  );
  const [config, setConfig] = useWorkspaceBackedState({
    defaultValue: categoricDefaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });

  const { data, requiredVariables, recordOrders, variableDescription } =
    useDistributionViewState({
      variable,
      sourceOrderValues,
      isSync: config.isSync,
      getData,
      isRowValid: isCategoricRowValid,
    });

  const chart = useMemo(() => {
    if (!data || data.length === 0) {
      return <NoDataPlaceholder />;
    }

    const ChartComponent = chartStrategies[config.chartType] ?? GroupedBarChart;
    return <ChartComponent data={data} config={config} id={id} />;
  }, [config, data, id]);

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
