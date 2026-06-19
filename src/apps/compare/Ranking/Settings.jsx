import React from "react";
import { Typography, Radio, Slider, Switch } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import GroupSettings from "../GroupSettings";

const { Text } = Typography;

export default function Settings({ config, setConfig, maxEffectSize = 0 }) {
  const {
    desc,
    nBars = 10,
    pValue = 0.05,
    effectSize = 0,
    showGrid,
  } = config;
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));
  const effectSizeSliderMax = Math.max(
    1,
    effectSize,
    Math.ceil(maxEffectSize * 100) / 100,
  );

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Ordering</div>
        <div className={panelStyles.controlInlineRow}>
          <Radio.Group
            className={panelStyles.radioGroupCompact}
            optionType="button"
            buttonStyle="solid"
            size="small"
            value={desc ? "desc" : "asc"}
            onChange={(e) => update("desc", e.target.value === "desc")}
          >
            <Radio.Button value="asc">Ascending</Radio.Button>
            <Radio.Button value="desc">Descending</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Filters</div>
        <SliderControl
          label="p-value"
          valueLabel={pValue.toFixed(2)}
          min={0}
          max={1}
          step={0.01}
          value={pValue}
          onChange={(v) => update("pValue", v)}
        />
        <SliderControl
          label="Effect size"
          valueLabel={effectSize.toFixed(2)}
          min={0}
          max={effectSizeSliderMax}
          step={0.01}
          value={effectSize}
          onChange={(v) => update("effectSize", v)}
        />
        <SliderControl
          label="Bars"
          valueLabel={`${nBars}`}
          min={1}
          max={50}
          step={1}
          value={nBars}
          onChange={(v) => update("nBars", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid lines</Text>
          <Switch
            size="small"
            checked={showGrid}
            onChange={(v) => update("showGrid", v)}
          />
        </div>
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Groups</div>
        <GroupSettings />
      </div>
    </div>
  );
}

function SliderControl({ label, valueLabel, min, max, step, value, onChange }) {
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
      />
    </div>
  );
}
