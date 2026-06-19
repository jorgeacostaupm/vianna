function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pick(primary, fallback) {
  return primary !== undefined ? primary : fallback;
}

function resolveAxisLabelContainerStyle(config, baseStyle) {
  const axisLabelFontSize = Number.isFinite(config?.axisLabelFontSize)
    ? config.axisLabelFontSize
    : null;
  if (axisLabelFontSize == null) {
    return baseStyle;
  }
  return {
    ...(isObject(baseStyle) ? baseStyle : {}),
    "--axis-label-font-size": `${axisLabelFontSize}px`,
  };
}

export function normalizeViewContainerProps(props = {}) {
  const view = isObject(props.view) ? props.view : {};
  const toolbar = isObject(view.toolbar) ? view.toolbar : {};

  const config = pick(view.config, props.config);
  const setConfig = pick(view.setConfig, props.setConfig);

  return {
    title: pick(view.title, props.title),
    hoverTitle: pick(view.hoverTitle, props.hoverTitle),
    svgIDs: pick(toolbar.svgIDs, pick(view.svgIDs, props.svgIDs)),
    info: pick(toolbar.info, pick(view.info, props.info)),
    settings: pick(toolbar.settings, pick(view.settings, props.settings)),
    testsSettings: pick(
      toolbar.testsSettings,
      pick(view.testsSettings, props.testsSettings),
    ),
    testsTitle: pick(toolbar.testsTitle, pick(view.testsTitle, props.testsTitle)),
    lmmSettings: pick(
      toolbar.lmmSettings,
      pick(view.lmmSettings, props.lmmSettings),
    ),
    results: pick(toolbar.results, pick(view.results, props.results)),
    remove: pick(view.remove, props.remove),
    recordsExport: pick(
      toolbar.recordsExport,
      pick(view.recordsExport, props.recordsExport),
    ),
    actions: pick(toolbar.actions, pick(view.actions, props.actions)),
    chart: pick(view.chart, pick(props.chart, props.children)),
    className: pick(view.className, props.className),
    style: resolveAxisLabelContainerStyle(
      config,
      pick(view.style, props.style),
    ),
    config,
    setConfig,
  };
}
