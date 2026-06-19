import { getDistributionData as getData } from "@/utils/functionsCompare";
import { Density, Histogram } from "./charts";
import Settings from "./Settings";
import Boxplot from "./charts/Boxplot/Boxplot";
import Vilonplot from "./charts/Violinplot/Violinplot";
import { isFiniteNumericValue } from "@/utils/viewRecords";
import numericDefaultConfig from "./numericDefaultConfig";
import Distribution from "../Distribution";

const chartStrategies = {
  density: Density,
  violin: Vilonplot,
  box: Boxplot,
  histogram: Histogram,
};

const isNumericRowValid = ({ row, groupVar, variable }) => {
  const groupValue = row?.[groupVar];
  const value = row?.[variable];
  return groupValue != null && isFiniteNumericValue(value);
};

export default function Numeric(props) {
  return (
    <Distribution
      {...props}
      defaultConfig={numericDefaultConfig}
      getData={getData}
      isRowValid={isNumericRowValid}
      chartStrategies={chartStrategies}
      fallbackChart={Histogram}
      settings={Settings}
    />
  );
}
