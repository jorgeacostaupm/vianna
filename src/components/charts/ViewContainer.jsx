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
  return (
    <div className={styles.viewContainer} data-view-container>
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
