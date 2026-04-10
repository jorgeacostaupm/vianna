import React from "react";
import { Typography, Radio, Slider, InputNumber, Switch } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";

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
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Legend</Text>
          <Switch
            size="small"
            checked={showLegend}
            onChange={(v) => update("showLegend", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid</Text>
          <Switch
            size="small"
            checked={showGrid}
            onChange={(v) => update("showGrid", v)}
          />
        </div>
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Group size</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Count in legend</Text>
          <Switch
            size="small"
            checked={showGroupCountInLegend}
            onChange={(v) => update("showGroupCountInLegend", v)}
          />
        </div>
        {supportsAxisLabels && (
          <div className={panelStyles.row}>
            <Text className={panelStyles.label}>Count in group labels</Text>
            <Switch
              size="small"
              checked={showGroupCountInAxis}
              onChange={(v) => update("showGroupCountInAxis", v)}
            />
          </div>
        )}
        {chartType === "density" && (
          <div className={panelStyles.row}>
            <Text className={panelStyles.label}>Density stroke by size</Text>
            <Switch
              size="small"
              checked={scaleDensityStrokeByGroupSize}
              onChange={(v) => update("scaleDensityStrokeByGroupSize", v)}
            />
          </div>
        )}
      </div>

      {chartType === "box" && (
        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Observations</div>
          <div className={panelStyles.row}>
            <Text className={panelStyles.label}>Show points</Text>
            <Switch
              size="small"
              checked={showPoints}
              onChange={(v) => update("showPoints", v)}
            />
          </div>
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
          <div className={panelStyles.row}>
            <Text className={panelStyles.label}>Custom range</Text>
            <Switch
              size="small"
              checked={useCustomRange}
              onChange={(checked) => update("useCustomRange", checked)}
            />
          </div>
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
    </div>
  );
}

function SliderControl({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
}) {
  return (
    <div className={panelStyles.sliderInlineRow}>
      <Text className={panelStyles.label}>{label}</Text>
      <Text className={panelStyles.value}>{valueLabel}</Text>
      <Slider
        className={panelStyles.sliderInlineControl}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
