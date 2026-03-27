import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSelector } from "react-redux";

import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import Settings from "./Settings";

import useLineChart from "./useLineChart";
import useEvolutionData from "./useLineChartData";
import ChartWithLegend from "@/components/charts/ChartWithLegend";
import ViewContainer from "@/components/charts/ViewContainer";
import EvolutionTestsInfo from "./EvolutionTestsInfo";
import { selectVars, selectVarTypes } from "@/store/slices/cantabSlice";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";

const defaultConfig = {
  isSync: true,
  showObs: false,
  showMeans: true,
  showOverallMean: true,
  showStds: false,
  showCIs: false,
  showLmmFit: true,
  showLmmCI: false,
  showComplete: true,
  showIncomplete: false,
  showLegend: true,
  showGrid: true,
  showGridBehindAll: false,
  forceDiscreteAggregatedMode: false,
  ratioNodeScale: "sqrt",
  ratioEdgeScale: "sqrt",
  ratioNodeMinPx: 10,
  ratioNodeMaxPx: 30,
  ratioEdgeMinPx: 2.5,
  ratioEdgeMaxPx: 16,
  lmmReferenceGroup: "All",
  lmmCovariates: [],
  lmmIncludeInteraction: false,
  lmmTimeCoding: "ordered-index",
  meanPointSize: 8,
  meanAsBoxplot: false,
  subjectPointSize: 3,
  meanStrokeWidth: 5,
  subjectStrokeWidth: 1,
  testIds: ["lmm-random-intercept"],
  testTimeFrom: null,
  testTimeTo: null,
};

function Chart({ data, config, id }) {
  const chartRef = useRef(null);
  const legendRef = useRef(null);

  useLineChart({ chartRef, legendRef, data, config });

  return (
    <ChartWithLegend
      id={id}
      chartRef={chartRef}
      legendRef={legendRef}
      showLegend={config.showLegend}
    />
  );
}

export default function LineChart({
  id,
  variable,
  remove,
  sourceOrderValues = [],
}) {
  const [config, setConfig] = useState(defaultConfig);
  const varTypes = useSelector(selectVarTypes);
  const allSelectableVars = useSelector(selectVars);
  const attributes = useSelector((s) => s.metadata.attributes);
  const groupVar = useSelector((s) => s.evolution.groupVar);
  const timeVar = useSelector((s) => s.evolution.timeVar);
  const idVar = useSelector((s) => s.cantab.present.idVar);
  const selection = useSelector((s) => s.dataframe.present.selection);
  const timeRange = {
    from: config.testTimeFrom,
    to: config.testTimeTo,
  };

  const [data] = useEvolutionData(
    variable,
    config.isSync,
    config.showComplete,
    config.showIncomplete,
    config.testIds,
    timeRange,
    {
      lmmReferenceGroup: config.lmmReferenceGroup,
      lmmCovariates: config.lmmCovariates,
      lmmIncludeInteraction: config.lmmIncludeInteraction,
      lmmTimeCoding: config.lmmTimeCoding,
    }
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
    if (includeComplete && includeIncomplete) return extractOrderValues(baseRows);
    const timeValues = Array.isArray(data?.times)
      ? data.times.map((value) => String(value))
      : [];
    if (!timeValues.length) return [];

    const timesById = new Map();
    baseRows.forEach((row) => {
      const identifier = row?.[idVar];
      const timestamp = String(row?.[timeVar]);
      if (!timesById.has(identifier)) {
        timesById.set(identifier, new Set());
      }
      timesById.get(identifier).add(timestamp);
    });

    const completeIds = new Set(
      [...timesById.entries()]
        .filter(([, values]) => timeValues.every((time) => values.has(time)))
        .map(([identifier]) => identifier),
    );

    return extractOrderValues(baseRows, (row) => {
      const subjectId = row?.[idVar];
      const isComplete = completeIds.has(subjectId);
      if (includeComplete && !includeIncomplete) return isComplete;
      if (!includeComplete && includeIncomplete) return !isComplete;
      return true;
    });
  }, [
    selection,
    variable,
    groupVar,
    timeVar,
    idVar,
    config.showComplete,
    config.showIncomplete,
    Array.isArray(data?.times) ? data.times.join("|") : "",
  ]);

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(() => {
    const isLmmEnabled = (config.testIds || []).includes("lmm-random-intercept");
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

  const availableTimes = (data?.times || []).map((t) => String(t));
  const availableGroups = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.meanData || [])
            .map((entry) => entry?.group)
            .filter((group) => group != null)
            .map((group) => String(group))
        )
      ),
    [data?.meanData]
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
    const blocked = new Set([variable, idVar, timeVar, groupVar].filter(Boolean));
    setConfig((prev) => {
      const nextCovariates = (prev.lmmCovariates || []).filter(
        (name) => !blocked.has(name) && allSelectableVars.includes(name),
      );
      if (nextCovariates.length === (prev.lmmCovariates || []).length) return prev;
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
    const description = attributes?.find((attr) => attr?.name === variable)?.desc;
    return typeof description === "string" ? description.trim() : "";
  }, [attributes, variable]);

  return (
    <ViewContainer
      title={`Evolution · ${variable}`}
      hoverTitle={variableDescription || undefined}
      svgIDs={[id, `${id}-legend`]}
      info={
        data?.tests?.length ? <EvolutionTestsInfo tests={data.tests} /> : null
      }
      remove={remove}
      settings={
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
      }
      testsSettings={
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
      }
      chart={chart}
      config={config}
      setConfig={setConfig}
      recordsExport={{
        filename: `evolution_${variable || "view"}`,
        recordOrders,
        requiredVariables,
      }}
    />
  );
}
