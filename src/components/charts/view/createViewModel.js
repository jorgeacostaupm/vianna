function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function createViewModel({
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
  style,
  className,
} = {}) {
  const toolbar = {
    svgIDs,
    info,
    settings,
    testsSettings,
    testsTitle,
    lmmSettings,
    results,
    recordsExport,
    actions,
  };

  return {
    title,
    hoverTitle,
    remove,
    chart,
    config,
    setConfig,
    toolbar: Object.entries(toolbar).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {}),
    ...(isObject(style) ? { style } : {}),
    ...(className ? { className } : {}),
  };
}
