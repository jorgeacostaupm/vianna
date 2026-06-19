import { useRef } from "react";

import useStackedBarChart from "./useStackedBarChart";
import BasicChart from "@/components/charts/BasicChart";

export default function StackedBarChart({ data, config, id }) {
  const chartRef = useRef(null);

  useStackedBarChart({ chartRef, data, config });

  return <BasicChart id={id} chartRef={chartRef} />;
}
