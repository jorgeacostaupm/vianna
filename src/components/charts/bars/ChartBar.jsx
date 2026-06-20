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
  const closeAction = toolbarActions.find(
    (action) => String(action.key) === "close",
  );
  const primaryActions = toolbarActions.filter(
    (action) => String(action.key) !== "close",
  );

  return (
    <BaseBar title={title} hoverTitle={hoverTitle}>
      {primaryActions.map((actionNode, index) => (
        <React.Fragment key={actionNode.key || `toolbar-action-${index}`}>
          {actionNode}
        </React.Fragment>
      ))}
      {closeAction}
    </BaseBar>
  );
}
