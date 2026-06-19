import { useRef } from "react";

import useGroupedBarChart from "./useGroupedBarChart";
import BasicChart from "@/components/charts/BasicChart";

export default function GroupedBarChart({ data, config, id }) {
  const chartRef = useRef(null);

  useGroupedBarChart({ chartRef, data, config });

  return <BasicChart id={id} chartRef={chartRef} />;
}
