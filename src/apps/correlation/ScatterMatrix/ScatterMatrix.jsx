import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import Settings from "./Settings";
import useScatter from "./useScatter";
import useScatterData from "./useScatterData";
import ViewContainer from "@/components/charts/ViewContainer";
import ChartWithLegend from "@/components/charts/ChartWithLegend";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";

function Chart({ data, id, config }) {
  const chartRef = useRef(null);
  const legendRef = useRef(null);

  useScatter({ chartRef, legendRef, data, config });

  return (
    <ChartWithLegend
      id={id}
      chartRef={chartRef}
      legendRef={legendRef}
      showLegend={config.showLegend}
      legendWidthMode="content"
    />
  );
}

export default function ScatterMatrix({
  id,
  remove,
  sourceOrderValues = [],
}) {
  const groupVar = useSelector((s) => s.correlation.groupVar);
  const selection = useSelector((s) => s.dataframe.selection);

  const [config, setConfig] = useState({
    isSync: true,
    pointSize: 4,
    pointOpacity: 0.75,
    groupVar: groupVar,
    variables: [],
    showLegend: true,
    axisLabelFontSize: 16,
  });

  useEffect(() => {
    setConfig((prev) =>
      prev.groupVar === groupVar ? prev : { ...prev, groupVar }
    );
  }, [groupVar]);

  const [data] = useScatterData(config.isSync, config);

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const vars = Array.isArray(config.variables) ? config.variables : [];
        if (vars.length < 2) return false;
        return vars.every((name) => isFiniteNumericValue(row?.[name]));
      }),
    [selection, Array.isArray(config.variables) ? config.variables.join("|") : ""],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(
    () => uniqueColumns([groupVar, ...(config.variables || []), ORDER_VARIABLE]),
    [groupVar, Array.isArray(config.variables) ? config.variables.join("|") : ""],
  );

  const chart = useMemo(() => {
    return <Chart data={data} config={config} id={id} />;
  }, [config, data]);

  return (
    <ViewContainer
      title={`Scatter Plot Matrix`}
      svgIDs={[id, `${id}-legend`]}
      remove={remove}
      settings={<Settings config={config} setConfig={setConfig} />}
      chart={chart}
      config={config}
      setConfig={setConfig}
      recordsExport={{
        filename: "scatter_matrix",
        recordOrders,
        requiredVariables,
      }}
    />
  );
}
