import React from "react";
import { Slider, Typography } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";

const { Text } = Typography;

export default function AxisLabelSizeControl({
  config,
  setConfig,
  label = "Axis labels",
  disabled = false,
  min = 8,
  max = 24,
  step = 1,
  defaultValue = 16,
}) {
  const currentValue = Number.isFinite(config?.axisLabelFontSize)
    ? config.axisLabelFontSize
    : defaultValue;

  const update = (value) => {
    if (typeof setConfig !== "function") return;
    const next = Math.max(min, Math.min(max, value));
    setConfig((prev) => ({
      ...prev,
      axisLabelFontSize: next,
    }));
  };

  return (
    <div className={panelStyles.sliderInlineRow}>
      <Text className={panelStyles.label}>{label}</Text>
      <Text className={panelStyles.value}>{currentValue}px</Text>
      <Slider
        className={panelStyles.sliderInlineControl}
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={update}
        disabled={disabled}
      />
    </div>
  );
}
