import React from "react";
import { Typography, Switch, Select } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import GroupSettings from "../../GroupSettings";
import { IntervalSettings, MarkerSettings } from "./common";

const { Text } = Typography;

const sortOptions = [
  { value: "name", label: "Group name" },
  { value: "value", label: "Mean value" },
];

export default function PointRangeSettings({ config, setConfig }) {
  const {
    isSync,
    showCaps,
    capSize,
    markerShape,
    markerSize,
    showZeroLine,
    sortBy,
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
          <Text className={panelStyles.label}>Zero line</Text>
          <Switch
            size="small"
            checked={showZeroLine}
            disabled={disabled}
            onChange={(v) => update("showZeroLine", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Sort by</Text>
          <Select
            size="small"
            value={sortBy}
            onChange={(v) => update("sortBy", v)}
            options={sortOptions}
            disabled={disabled}
          />
        </div>
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
