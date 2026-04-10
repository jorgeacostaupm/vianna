import React from "react";
import styles from "@/styles/Charts.module.css";

export default function ChartWithLegend({
  id,
  chartRef,
  legendRef,
  showLegend = true,
  legendWidthMode = "fixed",
}) {
  const useContentLegendWidth = legendWidthMode === "content";
  const chartClassName = showLegend
    ? useContentLegendWidth
      ? styles.distributionChartAutoLegend
      : styles.distributionChart
    : styles.distributionChartFull;
  const legendClassName = showLegend
    ? useContentLegendWidth
      ? styles.legendAutoWidth
      : styles.legend
    : styles.legendHidden;

  return (
    <div className={styles.chartLegendContainer}>
      <svg ref={chartRef} id={id} className={chartClassName} />

      <div className={legendClassName}>
        <svg ref={legendRef} id={`${id}-legend`} className={styles.legendSvg} />
      </div>
    </div>
  );
}
