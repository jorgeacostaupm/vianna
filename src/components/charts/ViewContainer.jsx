import React from "react";
import ChartBar from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";

export default function ViewContainer({
  title,
  hoverTitle,
  svgIDs,
  info,
  settings,
  testsSettings,
  chart,
  remove,
  config,
  setConfig,
  recordsExport,
}) {
  const axisLabelFontSize = Number.isFinite(config?.axisLabelFontSize)
    ? config.axisLabelFontSize
    : null;
  const containerStyle =
    axisLabelFontSize != null
      ? { "--axis-label-font-size": `${axisLabelFontSize}px` }
      : undefined;

  return (
    <div
      className={styles.viewContainer}
      data-view-container
      style={containerStyle}
    >
      <ChartBar
        title={title}
        hoverTitle={hoverTitle}
        info={info}
        svgIDs={svgIDs}
        remove={remove}
        settings={settings}
        testsSettings={testsSettings}
        config={config}
        setConfig={setConfig}
        recordsExport={recordsExport}
      />
      {chart}
    </div>
  );
}
