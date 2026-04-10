import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";

import { getDistributionData as getData } from "@/utils/functionsCompare";
import useDistributionData from "./useDistributionData";
import ViewContainer from "@/components/charts/ViewContainer";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import { Density, Histogram } from "./charts";
import Settings from "./Settings";
import Boxplot from "./charts/Boxplot/Boxplot";
import Vilonplot from "./charts/Violinplot/Violinplot";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";

const defaultConfig = {
  chartType: "box",
  isSync: true,
  showLegend: false,
  showGrid: true,
  useCustomRange: false,
  range: [null, null],
  nPoints: 30,
  margin: 0.5,
  xForce: 0.05,
  yForce: 1.0,
  collideForce: 0.8,
  alpha: 0.8,
  alphaDecay: 0.2,
  timeout: 500,
  pointSize: 3,
  showPoints: false,
  showGroupCountInLegend: true,
  showGroupCountInAxis: true,
  scaleDensityStrokeByGroupSize: true,
  axisLabelFontSize: 16,
};
const info = "";

export default function Numeric({ id, variable, remove, sourceOrderValues = [] }) {
  const groupVar = useSelector((s) => s.compare.groupVar);
  const attributes = useSelector((s) => s.metadata.attributes);
  const selection = useSelector((s) => s.dataframe.selection);
  const [config, setConfig] = useState(defaultConfig);
  const [data] = useDistributionData(getData, variable, config.isSync, {
    groupVar,
  });

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const groupValue = row?.[groupVar];
        const value = row?.[variable];
        return groupValue != null && isFiniteNumericValue(value);
      }),
    [selection, groupVar, variable],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(
    () => uniqueColumns([groupVar, variable, ORDER_VARIABLE]),
    [groupVar, variable],
  );
  const variableDescription = useMemo(() => {
    const description = attributes?.find((attr) => attr?.name === variable)?.desc;
    return typeof description === "string" ? description.trim() : "";
  }, [attributes, variable]);

  const chart = useMemo(() => {
    if (!data || data.length === 0) {
      return <NoDataPlaceholder />;
    } else if (config.chartType === "density") {
      return <Density data={data} config={config} id={id} />;
    } else if (config.chartType === "violin") {
      return <Vilonplot data={data} config={config} id={id} />;
    } else if (config.chartType === "box") {
      return <Boxplot data={data} config={config} id={id} />;
    } else {
      return <Histogram data={data} config={config} id={id} />;
    }
  }, [config, data]);

  return (
    <ViewContainer
      title={`Distribution · ${variable}`}
      hoverTitle={variableDescription || undefined}
      svgIDs={[id, `${id}-legend`]}
      info={info}
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
