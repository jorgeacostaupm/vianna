import React, { useCallback, useMemo } from "react";

import ViewContainer from "@/components/charts/ViewContainer";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { isFiniteNumericValue } from "@/utils/viewRecords";
import useTestViewState from "./useTestViewState";
import useStatTestData from "./useStatTestData";
import { TEST_VIEW_STRATEGIES } from "./testViewStrategies";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";

const isNumericRowValid = ({ row, groupVar, variable }) => {
  const groupValue = row?.[groupVar];
  const value = row?.[variable];
  return groupValue != null && isFiniteNumericValue(value);
};

export default function StatTestView({
  mode,
  id,
  variable,
  test,
  remove,
  sourceOrderValues = [],
  config: persistedConfig,
  updateView,
}) {
  const strategy = TEST_VIEW_STRATEGIES[mode];

  if (!strategy) {
    return null;
  }

  const handleConfigChange = useCallback(
    (nextConfig) => updateView?.({ config: nextConfig }),
    [updateView],
  );
  const [config, setConfig] = useWorkspaceBackedState({
    defaultValue: strategy.defaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });
  const SettingsComponent = strategy.SettingsComponent;

  const {
    groupVar,
    selection,
    requiredVariables,
    recordOrders,
    variableDescription,
  } = useTestViewState({
    variable,
    sourceOrderValues,
    isSync: config.isSync,
    isRowValid: isNumericRowValid,
  });

  const data = useStatTestData({
    mode,
    selection,
    groupVar,
    variable,
    test,
    isSync: config.isSync,
  });

  const colorGroups = strategy.getColorGroups(data);
  const { colorDomain } = useGroupColorDomain(groupVar, colorGroups);

  const title = strategy.getTitle({
    test,
    variable,
    data,
  });

  const hasData = strategy.hasData(data);

  const chart = useMemo(() => {
    if (!hasData) {
      return <NoDataPlaceholder />;
    }

    return strategy.renderChart({
      id,
      data,
      config,
      colorDomain,
    });
  }, [strategy, hasData, id, data, config, colorDomain]);

  return (
    <ViewContainer
      title={title}
      hoverTitle={variableDescription || undefined}
      info={data?.info}
      svgIDs={hasData ? [id] : undefined}
      remove={remove}
      config={config}
      setConfig={setConfig}
      settings={
        <SettingsComponent config={config} setConfig={setConfig} />
      }
      recordsExport={{
        filename: `${strategy.filenamePrefix}_${variable || "view"}`,
        recordOrders,
        requiredVariables,
      }}
      chart={chart}
    />
  );
}
