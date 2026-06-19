
import { PairwiseChart, PointRangeChart } from "./charts";
import PairwiseSettings from "./settings/PairwiseSettings";
import PointRangeSettings from "./settings/PointRangeSettings";

const pairwiseDefaultConfig = {
  isSync: true,
  showCaps: true,
  capSize: 3,
  markerShape: "circle",
  markerSize: 5,
  positiveOnly: true,
  sortDescending: true,
  axisLabelFontSize: 16,
  yAxisLabelSpace: 160,
};

const pointRangeDefaultConfig = {
  isSync: true,
  showCaps: true,
  capSize: 3,
  markerShape: "circle",
  markerSize: 5,
  showZeroLine: true,
  sortBy: "name",
  axisLabelFontSize: 16,
};

export const TEST_VIEW_STRATEGIES = {
  pairwise: {
    defaultConfig: pairwiseDefaultConfig,
    SettingsComponent: PairwiseSettings,
    filenamePrefix: "pairwise",
    hasData: (data) => Boolean(data?.pairwiseEffects?.length),
    getColorGroups: () => [],
    getTitle: ({ test, variable, data }) =>
      [test, data?.pairwiseTitle || "Effect sizes", variable]
        .filter(Boolean)
        .join(" · "),
    renderChart: ({ id, data, config }) => (
      <PairwiseChart id={id} data={data} config={config} />
    ),
  },
  pointrange: {
    defaultConfig: pointRangeDefaultConfig,
    SettingsComponent: PointRangeSettings,
    filenamePrefix: "summary",
    hasData: (data) => Boolean(data?.summaries?.length),
    getColorGroups: (data) => data?.summaries?.map((entry) => entry.name) || [],
    getTitle: ({ test, variable, data }) =>
      [test, data?.summariesTitle || "Summary", variable]
        .filter(Boolean)
        .join(" · "),
    renderChart: ({ id, data, config, colorDomain }) => (
      <PointRangeChart
        id={id}
        data={data}
        config={config}
        colorDomain={colorDomain}
      />
    ),
  },
};
