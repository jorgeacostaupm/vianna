import ChartBar from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";
import { normalizeViewContainerProps } from "./view/viewContainerModel";

export default function ViewContainer(props) {
  const {
    title,
    hoverTitle,
    svgIDs,
    info,
    settings,
    testsSettings,
    testsTitle,
    lmmSettings,
    results,
    chart,
    remove,
    config,
    setConfig,
    recordsExport,
    actions,
    className,
    style,
  } = normalizeViewContainerProps(props);
  const containerClassName = [styles.viewContainer, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName} data-view-container style={style}>
      <ChartBar
        title={title}
        hoverTitle={hoverTitle}
        info={info}
        svgIDs={svgIDs}
        remove={remove}
        settings={settings}
        testsSettings={testsSettings}
        testsTitle={testsTitle}
        lmmSettings={lmmSettings}
        results={results}
        config={config}
        setConfig={setConfig}
        recordsExport={recordsExport}
        actions={actions}
      />
      {chart}
    </div>
  );
}
