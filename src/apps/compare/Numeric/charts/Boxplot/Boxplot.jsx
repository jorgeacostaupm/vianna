import { useRef } from "react";

import useBoxplot from "./useBoxplot";
import BasicChart from "@/components/charts/BasicChart";

export default function Boxplot({ data, config, id }) {
  const chartRef = useRef(null);

  useBoxplot({ chartRef, data, config });

  return <BasicChart id={id} chartRef={chartRef} />;
}
