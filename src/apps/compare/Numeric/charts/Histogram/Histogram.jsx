import { useRef } from "react";

import useHistogram from "./useHistogram";
import BasicChart from "@/components/charts/BasicChart";

export default function Histogram({ data, config, id }) {
  const chartRef = useRef(null);

  useHistogram({ chartRef, data, config });

  return <BasicChart id={id} chartRef={chartRef} />;
}
