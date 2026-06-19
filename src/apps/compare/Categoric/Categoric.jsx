import { getCategoricDistributionData as getData } from "@/utils/functionsCompare";
import { GroupedBarChart, StackedBarChart } from "./charts";
import Settings from "./Settings";
import categoricDefaultConfig from "./categoricDefaultConfig";
import Distribution from "../Distribution";

const chartStrategies = {
  stacked: StackedBarChart,
  grouped: GroupedBarChart,
};

const isCategoricRowValid = ({ row, groupVar, variable }) => {
  const groupValue = row?.[groupVar];
  const categoryValue = row?.[variable];
  return groupValue != null && categoryValue != null;
};

export default function Categoric(props) {
  return (
    <Distribution
      {...props}
      defaultConfig={categoricDefaultConfig}
      getData={getData}
      isRowValid={isCategoricRowValid}
      chartStrategies={chartStrategies}
      fallbackChart={GroupedBarChart}
      settings={Settings}
    />
  );
}
