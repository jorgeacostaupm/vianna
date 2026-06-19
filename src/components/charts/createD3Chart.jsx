import { useRef } from "react";
import BasicChart from "./BasicChart";

export default function createD3Chart(useChart) {
  return function D3Chart({ id, ...props }) {
    const chartRef = useRef(null);
    useChart({ chartRef, ...props });
    return <BasicChart id={id} chartRef={chartRef} />;
  };
}
