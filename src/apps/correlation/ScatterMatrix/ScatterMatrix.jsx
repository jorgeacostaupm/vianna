import { useCallback, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import Settings from "./Settings";
import useScatter from "./useScatter";
import useScatterData from "./useScatterData";
import ViewContainer from "@/components/charts/ViewContainer";
import { createViewModel } from "@/components/charts/view/createViewModel";
import createD3Chart from "@/components/charts/createD3Chart";
import { ORDER_VARIABLE } from "@/utils/constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import useSelectionRows from "@/hooks/useSelectionRows";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";
import { selectCorrelationAnalysisContext } from "@/store/features/main";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";

const Chart = createD3Chart(useScatter);

export default function ScatterMatrix({
  id,
  remove,
  sourceOrderValues = [],
  config: persistedConfig,
  updateView,
}) {
  const { groupVar } = useSelector(selectCorrelationAnalysisContext);

  const defaultConfig = useMemo(
    () => ({
      isSync: true,
      pointSize: 4,
      pointOpacity: 0.75,
      groupVar: groupVar,
      variables: [],
      showLegend: true,
      axisLabelFontSize: 16,
    }),
    [groupVar],
  );
  const handleConfigChange = useCallback(
    (nextConfig) => updateView?.({ config: nextConfig }),
    [updateView],
  );
  const [config, setConfig] = useWorkspaceBackedState({
    defaultValue: defaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });

  useEffect(() => {
    setConfig((prev) =>
      prev.groupVar === groupVar ? prev : { ...prev, groupVar },
    );
  }, [groupVar]);
  const requiredVariables = useMemo(
    () =>
      uniqueColumns([groupVar, ...(config.variables || []), ORDER_VARIABLE]),
    [
      groupVar,
      Array.isArray(config.variables) ? config.variables.join("|") : "",
    ],
  );
  const selection = useSelectionRows(requiredVariables);

  const [data] = useScatterData(config.isSync, config);

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const vars = Array.isArray(config.variables) ? config.variables : [];
        if (vars.length < 2) return false;
        return vars.every((name) => isFiniteNumericValue(row?.[name]));
      }),
    [
      selection,
      Array.isArray(config.variables) ? config.variables.join("|") : "",
    ],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const chart = useMemo(() => {
    return <Chart data={data} config={config} id={id} />;
  }, [config, data]);

  const viewModel = createViewModel({
    title: "Scatter Plot Matrix",
    svgIDs: [id],
    remove,
    settings: <Settings config={config} setConfig={setConfig} />,
    chart,
    config,
    setConfig,
    recordsExport: {
      filename: "scatter_matrix",
      recordOrders,
      requiredVariables,
    },
  });

  return <ViewContainer view={viewModel} />;
}
