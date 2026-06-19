import { useRef } from "react";

import useViolinplot from "./useViolinplot";
import BasicChart from "@/components/charts/BasicChart";

export default function Vilonplot({ data, config, id }) {
  const chartRef = useRef(null);

  useViolinplot({ chartRef, data, config });

  return <BasicChart id={id} chartRef={chartRef} />;
}
