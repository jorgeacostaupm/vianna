import { useRef } from "react";

import useDensity from "./useDensity";
import BasicChart from "@/components/charts/BasicChart";

export default function Density({ data, config, id }) {
  const chartRef = useRef(null);

  useDensity({ chartRef, data, config });

  return <BasicChart id={id} chartRef={chartRef} />;
}
