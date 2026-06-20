import React, { useCallback, useMemo } from "react";

import { useSelector } from "react-redux";
import {
  selectCategoricalVars,
  selectNumericVars,
} from "@/store/features/main";
import ViewContainer from "@/components/charts/ViewContainer";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import useRankingViewState from "./useRankingViewState";
import Settings from "./Settings";
import { RankingBarChart } from "./charts";
import { createRankingInitialConfig } from "./rankingDefaultConfig";
import { getRankingMagnitude } from "./rankingFilters";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";
import tests from "@/utils/tests";
import { VariableTypes } from "@/utils/constants";

export default function Ranking({
  test,
  remove,
  id,
  onVariableClick,
  sourceOrderValues = [],
  config: persistedConfig,
  updateView,
}) {
  const numericVars = useSelector(selectNumericVars);
  const categoricalVars = useSelector(selectCategoricalVars);
  const testVariableType = tests.find((candidate) => candidate.label === test)
    ?.variableType;
  const compatibleVariableCount =
    testVariableType === VariableTypes.CATEGORICAL
      ? categoricalVars.length
      : numericVars.length;
  const defaultConfig = useMemo(
    () => createRankingInitialConfig(compatibleVariableCount),
    [compatibleVariableCount],
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

  const { data, recordOrders, requiredVariables } = useRankingViewState({
    test,
    isSync: config.isSync,
    sourceOrderValues,
    numericVars,
  });
  const maxEffectSize = useMemo(
    () =>
      (data?.data || []).reduce(
        (max, item) => Math.max(max, getRankingMagnitude(item)),
        0,
      ),
    [data],
  );

  const chart = useMemo(() => {
    if (!data?.data?.length) {
      return <NoDataPlaceholder />;
    }

    return (
      <RankingBarChart
        id={id}
        data={data}
        config={config}
        onVariableClick={onVariableClick}
      />
    );
  }, [data, config, id, onVariableClick]);

  return (
    <ViewContainer
      title={`Ranking · ${test}`}
      info={data?.info}
      svgIDs={data?.data?.length ? [id] : undefined}
      remove={remove}
      config={config}
      setConfig={setConfig}
      settings={
        <Settings
          config={config}
          setConfig={setConfig}
          maxEffectSize={maxEffectSize}
        />
      }
      recordsExport={{
        filename: `ranking_${test || "view"}`,
        recordOrders,
        requiredVariables,
      }}
      chart={chart}
    />
  );
}
