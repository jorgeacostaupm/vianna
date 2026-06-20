export function isTestApplicable(test, groupCount) {
  try {
    return typeof test?.isApplicable === "function"
      ? Boolean(test.isApplicable(groupCount))
      : false;
  } catch {
    return false;
  }
}

export function getApplicableTests(tests, { groupCount, variableType } = {}) {
  return (Array.isArray(tests) ? tests : []).filter(
    (test) =>
      isTestApplicable(test, groupCount) &&
      (!variableType || test.variableType === variableType),
  );
}
