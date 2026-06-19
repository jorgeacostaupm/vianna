export function getVisibleRankingData(items = [], config = {}) {
  const excludedVariables = new Set(config.filterList || []);
  const rawPValueLimit = Number(config.pValue);
  const rawEffectSizeLimit = Number(config.effectSize);
  const rawNBars = Number(config.nBars);
  const pValueLimit = Number.isFinite(rawPValueLimit) ? rawPValueLimit : 1;
  const effectSizeLimit = Number.isFinite(rawEffectSizeLimit)
    ? rawEffectSizeLimit
    : 0;
  const nBars = Number.isFinite(rawNBars)
    ? Math.max(0, rawNBars)
    : items.length;
  const desc = config.desc !== false;

  return items
    .filter((item) => {
      const pValue = Number(item.pValue ?? item.p_value);
      const effectSize = getRankingMagnitude(item);

      return (
        !excludedVariables.has(item.variable) &&
        Number.isFinite(pValue) &&
        pValue < pValueLimit &&
        effectSize >= effectSizeLimit
      );
    })
    .sort((a, b) => {
      const diff = getRankingMagnitude(b) - getRankingMagnitude(a);
      return desc ? diff : -diff;
    })
    .slice(0, nBars);
}

export function getRankingMagnitude(item) {
  // ponytail: rankings are magnitude-based today; signed filters need a direction control.
  return Math.abs(Number(item?.value) || 0);
}
