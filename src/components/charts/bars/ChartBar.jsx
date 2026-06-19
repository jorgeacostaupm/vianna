import React from "react";

import BaseBar from "./BaseBar";
import { resolveChartBarActions } from "./chartBarActionStrategies";

export default function ChartBar({
  settings,
  testsSettings,
  testsTitle,
  lmmSettings,
  results,
  title,
  hoverTitle,
  svgIDs,
  remove,
  info = "",
  config,
  setConfig,
  recordsExport,
  actions = null,
}) {
  const isSync = Boolean(config?.isSync);
  const updateConfig =
    typeof setConfig === "function"
      ? (field, value) => setConfig((prev) => ({ ...prev, [field]: value }))
      : null;

  const toolbarActions = resolveChartBarActions({
    actions,
    context: {
      settings,
      testsSettings,
      testsTitle,
      lmmSettings,
      results,
      title,
      hoverTitle,
      svgIDs,
      remove,
      info,
      config,
      setConfig,
      isSync,
      updateConfig,
      recordsExport,
    },
  });

  return (
    <BaseBar title={title} hoverTitle={hoverTitle}>
      {toolbarActions.map((actionNode, index) => (
        <React.Fragment key={actionNode.key || `toolbar-action-${index}`}>
          {actionNode}
        </React.Fragment>
      ))}
    </BaseBar>
  );
}
