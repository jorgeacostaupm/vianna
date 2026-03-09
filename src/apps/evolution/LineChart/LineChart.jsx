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
  showLegend: true,
  showGrid: true,
  lmmReferenceGroup: "All",
  lmmCovariates: [],
  lmmIncludeInteraction: false,
  lmmTimeCoding: "ordered-index",
  meanPointSize: 8,
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

export default function LineChart({ id, variable, remove }) {
  const [config, setConfig] = useState(defaultConfig);
  const varTypes = useSelector(selectVarTypes);
  const allSelectableVars = useSelector(selectVars);
  const groupVar = useSelector((s) => s.evolution.groupVar);
  const timeVar = useSelector((s) => s.evolution.timeVar);
  const idVar = useSelector((s) => s.cantab.present.idVar);
  const timeRange = {
    from: config.testTimeFrom,
    to: config.testTimeTo,
  };

  const [data] = useEvolutionData(
    variable,
    config.isSync,
    config.showComplete,
    config.testIds,
    timeRange,
    {
      lmmReferenceGroup: config.lmmReferenceGroup,
      lmmCovariates: config.lmmCovariates,
      lmmIncludeInteraction: config.lmmIncludeInteraction,
      lmmTimeCoding: config.lmmTimeCoding,
    }
  );

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

  return (
    <ViewContainer
      title={`Evolution · ${variable}`}
      svgIDs={[id, `${id}-legend`]}
      info={
        data?.tests?.length ? <EvolutionTestsInfo tests={data.tests} /> : null
      }
      remove={remove}
      settings={
        <Settings
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
    />
  );
}
