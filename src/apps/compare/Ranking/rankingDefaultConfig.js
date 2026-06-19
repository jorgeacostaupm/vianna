export const rankingDefaultConfig = {
  isSync: true,
  filterList: [],
  nBars: 10,
  pValue: 0.05,
  effectSize: 0,
  desc: true,
  showGrid: true,
  axisLabelFontSize: 16,
};

export function createRankingInitialConfig(numericVarCount = 0) {
  return {
    ...rankingDefaultConfig,
    nBars: Math.min(numericVarCount, rankingDefaultConfig.nBars),
  };
}
