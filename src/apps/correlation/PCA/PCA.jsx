import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import Settings from "./Settings";
import ChartWithLegend from "@/components/charts/ChartWithLegend";
import usePCAPlot from "./usePCAPlot";
import usePCAData from "./usePCAData";
import ViewContainer from "@/components/charts/ViewContainer";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";

const defaultConfig = {
  isSync: true,
  pointSize: 2,
  pointOpacity: 0.75,
  showLegend: true,
  groupVar: null,
};

const defaultParams = {
  groupVar: null,
  variables: [],
  nTop: 10,
};

function Chart({ data, id, config }) {
  const chartRef = useRef(null);
  const legendRef = useRef(null);

  usePCAPlot({ chartRef, legendRef, data, config });

  return (
    <ChartWithLegend
      id={id}
      chartRef={chartRef}
      legendRef={legendRef}
      showLegend={config.showLegend}
    />
  );
}

export default function PCA({ id, remove, sourceOrderValues = [] }) {
  const groupVar = useSelector((s) => s.correlation.groupVar);
  const selection = useSelector((s) => s.dataframe.present.selection);
  const [config, setConfig] = useState(defaultConfig);
  const [params, setParams] = useState(defaultParams);
  const [info, setInfo] = useState(null);
  const [data] = usePCAData(config.isSync, params, setInfo);

  const validPcaVariables = useMemo(() => {
    const vars = Array.isArray(params.variables) ? params.variables : [];
    return vars.filter((name) =>
      (selection || []).every((row) => isFiniteNumericValue(row?.[name])),
    );
  }, [selection, Array.isArray(params.variables) ? params.variables.join("|") : ""]);

  const liveOrderValues = useMemo(() => {
    if ((selection || []).length < 2 || validPcaVariables.length < 2) return [];
    return extractOrderValues(selection);
  }, [selection, validPcaVariables]);

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(
    () =>
      uniqueColumns([groupVar, ...validPcaVariables, ORDER_VARIABLE]),
    [groupVar, validPcaVariables],
  );

  useEffect(() => {
    setConfig((prev) =>
      prev.groupVar === groupVar ? prev : { ...prev, groupVar }
    );
  }, [groupVar]);

  const chart = useMemo(() => {
    return <Chart data={data} config={config} id={id} />;
  }, [config, data]);

  return (
    <ViewContainer
      title={`PCA · ${params.variables.length} Variables`}
      svgIDs={[id, `${id}-legend`]}
      remove={remove}
      settings={
        <Settings
          info={info}
          config={config}
          setConfig={setConfig}
          params={params}
          setParams={setParams}
        />
      }
      chart={chart}
      config={config}
      setConfig={setConfig}
      info={info}
      recordsExport={{
        filename: "pca",
        recordOrders,
        requiredVariables,
      }}
    />
  );
}
