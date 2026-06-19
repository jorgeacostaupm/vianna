import React from "react";
import { Typography, Switch } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import GroupSettings from "../../GroupSettings";
import { IntervalSettings, MarkerSettings, SliderControl } from "./common";

const { Text } = Typography;

export default function PairwiseSettings({ config, setConfig }) {
  const {
    isSync,
    showCaps,
    capSize,
    markerShape,
    markerSize,
    positiveOnly,
    sortDescending,
    yAxisLabelSpace,
  } = config;

  const disabled = !isSync;
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={panelStyles.panel}>
      <MarkerSettings
        markerShape={markerShape}
        markerSize={markerSize}
        disabled={disabled}
        update={update}
      />

      <IntervalSettings
        showCaps={showCaps}
        capSize={capSize}
        disabled={disabled}
        update={update}
      />

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Positive effects only</Text>
          <Switch
            size="small"
            checked={positiveOnly}
            disabled={disabled}
            onChange={(v) => update("positiveOnly", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Sort descending</Text>
          <Switch
            size="small"
            checked={sortDescending}
            disabled={disabled}
            onChange={(v) => update("sortDescending", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid lines</Text>
          <Switch size="small" checked disabled />
        </div>
        <SliderControl
          label="Y label space"
          valueLabel={`${Number.isFinite(yAxisLabelSpace) ? yAxisLabelSpace : 160}px`}
          min={100}
          max={320}
          step={5}
          value={Number.isFinite(yAxisLabelSpace) ? yAxisLabelSpace : 160}
          disabled={disabled}
          onChange={(v) => update("yAxisLabelSpace", v)}
        />
        <AxisLabelSizeControl
          config={config}
          setConfig={setConfig}
          disabled={disabled}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Groups</div>
        <GroupSettings />
      </div>
    </div>
  );
}
