import { useCallback, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { Tabs, Typography } from "antd";

import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import Settings from "./Settings";

import useLineChart from "./useLineChart";
import useEvolutionData from "./useLineChartData";
import createD3Chart from "@/components/charts/createD3Chart";
import ViewContainer from "@/components/charts/ViewContainer";
import { createViewModel } from "@/components/charts/view/createViewModel";
import EvolutionTestsInfo from "./EvolutionTestsInfo";
import lineChartDefaultConfig from "./lineChartDefaultConfig";
import {
  selectEvolutionAnalysisContext,
  selectVars,
  selectVarTypes,
} from "@/store/features/main";
import { ORDER_VARIABLE } from "@/utils/constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import useSelectionRows from "@/hooks/useSelectionRows";
import { selectSubjectIdsByCompleteness } from "@/utils/evolutionCompleteness";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";

const { Text } = Typography;

const Chart = createD3Chart(useLineChart);

function ToolbarTabs({ configContent, resultsContent, emptyMessage }) {
  return (
    <Tabs
      defaultActiveKey="config"
      items={[
        {
          key: "config",
          label: "Config",
          children: configContent,
        },
        {
          key: "results",
          label: "Results",
          children:
            resultsContent || (
              <Text type="secondary">{emptyMessage || "No results available."}</Text>
            ),
        },
      ]}
    />
  );
}

export default function LineChart({
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
    defaultValue: lineChartDefaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });
  const varTypes = useSelector(selectVarTypes);
  const allSelectableVars = useSelector(selectVars);
  const attributes = useSelector((s) => s.metadata.attributes);
  const { groupVar, timeVar, idVar } = useSelector(
    selectEvolutionAnalysisContext,
  );
  const selectionColumns = useMemo(() => {
    const isLmmEnabled = (config.testIds || []).includes(
      "lmm-random-intercept",
    );
    const lmmCovariates = isLmmEnabled ? config.lmmCovariates || [] : [];
    return uniqueColumns([
      variable,
      groupVar,
      timeVar,
      idVar,
      ...lmmCovariates,
      ORDER_VARIABLE,
    ]);
  }, [
    variable,
    groupVar,
    timeVar,
    idVar,
    Array.isArray(config.testIds) ? config.testIds.join("|") : "",
    Array.isArray(config.lmmCovariates) ? config.lmmCovariates.join("|") : "",
  ]);
  const selection = useSelectionRows(selectionColumns);
  const timeRange = {
    from: config.testTimeFrom,
    to: config.testTimeTo,
  };

  const [data] = useEvolutionData(
    variable,
    config.isSync,
    config.showComplete,
    config.showIncomplete,
    config.incompleteRequiredTimes,
    config.testIds,
    timeRange,
    {
      lmmReferenceGroup: config.lmmReferenceGroup,
      lmmCovariates: config.lmmCovariates,
      lmmIncludeInteraction: config.lmmIncludeInteraction,
      lmmTimeCoding: config.lmmTimeCoding,
    },
  );

  const liveOrderValues = useMemo(() => {
    const baseRows = Array.isArray(selection)
      ? selection.filter((row) => {
          const value = row?.[variable];
          return (
            row?.[groupVar] != null &&
            row?.[timeVar] != null &&
            row?.[idVar] != null &&
            isFiniteNumericValue(value)
          );
        })
      : [];

    const includeComplete = Boolean(config.showComplete);
    const includeIncomplete = Boolean(config.showIncomplete);
    if (!includeComplete && !includeIncomplete) return [];
    const timeValues = Array.isArray(data?.times)
      ? data.times.map((value) => String(value))
      : [];
    if (!timeValues.length) return [];
    const { selectedIds } = selectSubjectIdsByCompleteness(baseRows, timeValues, {
      idVar,
      timeVar,
      valueVar: variable,
      showComplete: includeComplete,
      showIncomplete: includeIncomplete,
      incompleteRequiredTimes: config.incompleteRequiredTimes,
    });

    return extractOrderValues(baseRows, (row) => {
      const subjectId = row?.[idVar];
      return selectedIds.has(subjectId);
    });
  }, [
    selection,
    variable,
    groupVar,
    timeVar,
    idVar,
    config.showComplete,
    config.showIncomplete,
    Array.isArray(config.incompleteRequiredTimes)
      ? config.incompleteRequiredTimes.join("|")
      : "",
    Array.isArray(data?.times) ? data.times.join("|") : "",
  ]);

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = selectionColumns;

  const availableTimes = (data?.times || []).map((t) => String(t));
  const availableGroups = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.meanData || [])
            .map((entry) => entry?.group)
            .filter((group) => group != null)
            .map((group) => String(group)),
        ),
      ),
    [data?.meanData],
  );

  useEffect(() => {
    if (!availableTimes.length) return;
    setConfig((prev) => {
      let from = prev.testTimeFrom;
      let to = prev.testTimeTo;
      if (!availableTimes.includes(from)) from = availableTimes[0];
      if (!availableTimes.includes(to))
        to = availableTimes[availableTimes.length - 1];
      if (from === to && availableTimes.length > 1) {
        to = availableTimes.find((t) => t !== from) ?? to;
      }
      if (from === prev.testTimeFrom && to === prev.testTimeTo) return prev;
      return { ...prev, testTimeFrom: from, testTimeTo: to };
    });
  }, [availableTimes.join("|")]);

  useEffect(() => {
    const available = new Set(availableTimes);
    setConfig((prev) => {
      const nextIncompleteRequiredTimes = (
        Array.isArray(prev.incompleteRequiredTimes)
          ? prev.incompleteRequiredTimes
          : []
      ).filter((time) => available.has(String(time)));
      if (
        nextIncompleteRequiredTimes.length ===
        (Array.isArray(prev.incompleteRequiredTimes)
          ? prev.incompleteRequiredTimes.length
          : 0)
      ) {
        return prev;
      }
      return {
        ...prev,
        incompleteRequiredTimes: nextIncompleteRequiredTimes,
      };
    });
  }, [availableTimes.join("|")]);

  useEffect(() => {
    const allowed = new Set(["All", ...availableGroups]);
    setConfig((prev) => {
      if (allowed.has(prev.lmmReferenceGroup)) return prev;
      return { ...prev, lmmReferenceGroup: "All" };
    });
  }, [availableGroups.join("|")]);

  useEffect(() => {
    const timeIsNumeric = varTypes?.[timeVar] === "number";
    if (timeIsNumeric) return;
    setConfig((prev) => {
      if (prev.lmmTimeCoding !== "continuous") return prev;
      return { ...prev, lmmTimeCoding: "ordered-index" };
    });
  }, [timeVar, varTypes]);

  useEffect(() => {
    const blocked = new Set(
      [variable, idVar, timeVar, groupVar].filter(Boolean),
    );
    setConfig((prev) => {
      const nextCovariates = (prev.lmmCovariates || []).filter(
        (name) => !blocked.has(name) && allSelectableVars.includes(name),
      );
      if (nextCovariates.length === (prev.lmmCovariates || []).length)
        return prev;
      return { ...prev, lmmCovariates: nextCovariates };
    });
  }, [
    variable,
    idVar,
    timeVar,
    groupVar,
    Array.isArray(allSelectableVars) ? allSelectableVars.join("|") : "",
  ]);

  const chart = useMemo(() => {
    if (!data || data.length === 0) {
      return <NoDataPlaceholder />;
    } else {
      return <Chart data={data} config={config} id={id} />;
    }
  }, [config, data]);
  const variableDescription = useMemo(() => {
    const description = attributes?.find(
      (attr) => attr?.name === variable,
    )?.description;
    return typeof description === "string" ? description.trim() : "";
  }, [attributes, variable]);
  const globalTestResults = useMemo(
    () => (data?.tests || []).filter((test) => test.variant !== "lmm"),
    [data?.tests],
  );
  const lmmResults = useMemo(
    () => (data?.tests || []).filter((test) => test.variant === "lmm"),
    [data?.tests],
  );
  const globalSettingsContent = (
    <Settings
      mode="tests"
      config={config}
      setConfig={setConfig}
      availableTimes={availableTimes}
      availableGroups={availableGroups}
      variable={variable}
      idVar={idVar}
      timeVar={timeVar}
      groupVar={groupVar}
      variableOptions={allSelectableVars}
      varTypes={varTypes}
    />
  );
  const lmmSettingsContent = (
    <Settings
      mode="lmm"
      config={config}
      setConfig={setConfig}
      availableTimes={availableTimes}
      availableGroups={availableGroups}
      variable={variable}
      idVar={idVar}
      timeVar={timeVar}
      groupVar={groupVar}
      variableOptions={allSelectableVars}
      varTypes={varTypes}
    />
  );

  const viewModel = createViewModel({
    title: `Evolution · ${variable}`,
    hoverTitle: variableDescription || undefined,
    svgIDs: [id],
    remove,
    settings: (
      <Settings
        mode="series-appearance"
        config={config}
        setConfig={setConfig}
        availableTimes={availableTimes}
        availableGroups={availableGroups}
        variable={variable}
        idVar={idVar}
        timeVar={timeVar}
        groupVar={groupVar}
        variableOptions={allSelectableVars}
        varTypes={varTypes}
      />
    ),
    testsSettings: (
      <ToolbarTabs
        configContent={globalSettingsContent}
        resultsContent={
          globalTestResults.length ? (
            <EvolutionTestsInfo tests={globalTestResults} />
          ) : null
        }
        emptyMessage="No global test results available."
      />
    ),
    testsTitle: "GLOBAL",
    lmmSettings: (
      <ToolbarTabs
        configContent={lmmSettingsContent}
        resultsContent={
          lmmResults.length ? <EvolutionTestsInfo tests={lmmResults} /> : null
        }
        emptyMessage="No LMM results available."
      />
    ),
    chart,
    config,
    setConfig,
    actions: [
      "sync",
      "records-export",
      "download",
      "tests",
      "lmm",
      "settings",
      "close",
    ],
    recordsExport: {
      filename: `evolution_${variable || "view"}`,
      recordOrders,
      requiredVariables,
    },
  });

  return <ViewContainer view={viewModel} />;
}
