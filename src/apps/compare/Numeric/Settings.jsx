import { Typography, Radio, InputNumber } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import SwitchControl from "@/components/ui/SwitchControl";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import GroupSettings from "../GroupSettings";
import SliderControl from "@/components/ui/SliderControl";

const { Text } = Typography;

export default function Settings({ config, setConfig }) {
  const {
    chartType,
    nPoints,
    margin,
    range,
    useCustomRange,
    pointSize,
    showPoints,
    showLegend,
    showGrid,
    showGroupCountInLegend,
    showGroupCountInAxis,
    scaleDensityStrokeByGroupSize,
  } = config;

  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  const updateChartType = (nextType) =>
    setConfig((prev) => ({
      ...prev,
      chartType: nextType,
      showLegend: nextType === "box" || nextType === "violin" ? false : true,
    }));

  const showBins =
    chartType === "density" ||
    chartType === "histogram" ||
    chartType === "violin";

  const showMargin = chartType === "density" || chartType === "violin";
  const supportsAxisLabels = chartType === "box" || chartType === "violin";

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>View</div>
        <div className={panelStyles.controlInlineRow}>
          <Radio.Group
            className={panelStyles.radioGroupCompact}
            optionType="button"
            buttonStyle="solid"
            size="small"
            value={chartType}
            onChange={(e) => updateChartType(e.target.value)}
          >
            <Radio.Button value="density">Density</Radio.Button>
            <Radio.Button value="histogram">Histogram</Radio.Button>
            <Radio.Button value="violin">Violins</Radio.Button>
            <Radio.Button value="box">Boxplots</Radio.Button>
          </Radio.Group>
        </div>
        <SwitchControl label="Legend"
          size="small"
            checked={showLegend}
            onChange={(v) => update("showLegend", v)}
        />
        <SwitchControl label="Grid"
          size="small"
            checked={showGrid}
            onChange={(v) => update("showGrid", v)}
        />
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>

      {chartType === "box" && (
        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Observations</div>
          <SwitchControl label="Show points"
          size="small"
              checked={showPoints}
              onChange={(v) => update("showPoints", v)}
        />
          <SliderControl
            label="Point size"
            valueLabel={`${pointSize}px`}
            min={1}
            max={30}
            step={1}
            value={pointSize}
            onChange={(v) => update("pointSize", v)}
          />
        </div>
      )}

      {showBins && (
        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Distribution</div>
          <SliderControl
            label="Bins"
            valueLabel={`${nPoints}`}
            min={5}
            max={200}
            step={1}
            value={nPoints}
            onChange={(v) => update("nPoints", v)}
          />
          {showMargin && (
            <div className={panelStyles.rowStack}>
              <SliderControl
                label="Padding"
                valueLabel={`${(margin * 100).toFixed(0)}%`}
                min={0}
                max={1}
                step={0.05}
                value={margin}
                onChange={(v) => update("margin", v)}
                disabled={useCustomRange}
              />
              <Text className={panelStyles.helper}>
                Adds breathing room around the distribution.
              </Text>
            </div>
          )}
        </div>
      )}

      {(chartType === "density" || chartType === "violin") && (
        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Range</div>
          <SwitchControl label="Custom range"
          size="small"
              checked={useCustomRange}
              onChange={(checked) => update("useCustomRange", checked)}
        />
          <div className={panelStyles.inline}>
            <span className={panelStyles.helper}>Min</span>
            <InputNumber
              size="small"
              value={range[0]}
              onChange={(val) => update("range", [val ?? range[0], range[1]])}
              disabled={!useCustomRange}
            />
            <span className={panelStyles.helper}>Max</span>
            <InputNumber
              size="small"
              value={range[1]}
              onChange={(val) => update("range", [range[0], val ?? range[1]])}
              disabled={!useCustomRange}
            />
          </div>
        </div>
      )}

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Groups</div>
        <SwitchControl label="Count in legend"
          size="small"
            checked={showGroupCountInLegend}
            onChange={(v) => update("showGroupCountInLegend", v)}
        />
        {supportsAxisLabels && (
          <SwitchControl label="Count in group labels"
          size="small"
              checked={showGroupCountInAxis}
              onChange={(v) => update("showGroupCountInAxis", v)}
        />
        )}
        {chartType === "density" && (
          <SwitchControl label="Density stroke by size"
          size="small"
              checked={scaleDensityStrokeByGroupSize}
              onChange={(v) => update("scaleDensityStrokeByGroupSize", v)}
        />
        )}
        <GroupSettings />
      </div>
    </div>
  );
}
