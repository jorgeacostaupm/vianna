import React, { useState, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

import Settings from "./Settings";
import BasicChart from "@/components/charts/BasicChart";
import useCorrelationMatrix from "./useCorrelationMatrix";
import useCorrelationMatrixData from "./useCorrelationMatrixData";
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
  range: [0, 1],
  showLegend: true,
  showLabels: true,
  colorScale: "rdBu",
};

const defaultParams = {
  groupVar: null,
  variables: [],
  nTop: 10,
  method: "pearson",
};

function Chart({ data, id, config, params }) {
  const chartRef = useRef(null);
  useCorrelationMatrix({ chartRef, data: data, config, params });
  return <BasicChart id={id} chartRef={chartRef} />;
}

export default function CorrelationMatrix({
  id,
  remove,
  sourceOrderValues = [],
}) {
  const selection = useSelector((s) => s.dataframe.present.selection);
  const [config, setConfig] = useState(defaultConfig);
  const [params, setParams] = useState(defaultParams);
  const [info, setInfo] = useState(null);
  const [data] = useCorrelationMatrixData(config.isSync, params, setInfo);

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const vars = Array.isArray(params.variables) ? params.variables : [];
        if (vars.length < 2) return false;
        return vars.every((name) => isFiniteNumericValue(row?.[name]));
      }),
    [selection, Array.isArray(params.variables) ? params.variables.join("|") : ""],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(
    () => uniqueColumns([...(params.variables || []), ORDER_VARIABLE]),
    [Array.isArray(params.variables) ? params.variables.join("|") : ""],
  );

  const chart = useMemo(() => {
    return <Chart data={data} config={config} params={params} id={id} />;
  }, [config, data, params]);

  return (
    <ViewContainer
      title={`Correlation Matrix`}
      svgIDs={[id, `${id}-legend`]}
      remove={remove}
      settings={
        <Settings
          info
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
        filename: "correlation_matrix",
        recordOrders,
        requiredVariables,
      }}
    />
  );
}
