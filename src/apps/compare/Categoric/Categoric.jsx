import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { getCategoricDistributionData as getData } from "@/utils/functionsCompare";
import useDistributionData from "../Numeric/useDistributionData";
import ViewContainer from "@/components/charts/ViewContainer";
import { GroupedBarChart, StackedBarChart } from "./charts";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import Settings from "./Settings";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import { extractOrderValues, uniqueColumns } from "@/utils/viewRecords";

const defaultConfig = {
  isSync: true,
  chartType: "stacked",
  stackedMode: "total",
  showLegend: true,
  showGrid: true,
  groupOrder: "alpha",
  categoryOrder: "alpha",
};
const info = "Categorical Distribution plots, Grouped or Stacked bar chart";

export default function Categoric({
  id,
  variable,
  remove,
  sourceOrderValues = [],
}) {
  const groupVar = useSelector((s) => s.compare.groupVar);
  const attributes = useSelector((s) => s.metadata.attributes);
  const selection = useSelector((s) => s.dataframe.present.selection);
  const [config, setConfig] = useState(defaultConfig);
  const [data] = useDistributionData(getData, variable, config.isSync, {
    groupVar,
  });

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const groupValue = row?.[groupVar];
        const categoryValue = row?.[variable];
        return groupValue != null && categoryValue != null;
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
    } else if (config.chartType === "stacked") {
      return <StackedBarChart data={data} config={config} id={id} />;
    } else {
      return <GroupedBarChart data={data} config={config} id={id} />;
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
