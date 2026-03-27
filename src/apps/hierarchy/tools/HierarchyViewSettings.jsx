import { Button, Select, Slider, Switch, Typography } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";

const { Text } = Typography;

const ORIENTATION_OPTIONS = [
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

const LINK_STYLE_OPTIONS = [
  { value: "smooth", label: "Smooth" },
  { value: "elbow", label: "Elbow" },
  { value: "straight", label: "Straight" },
];

export const DEFAULT_HIERARCHY_VIEW_CONFIG = {
  nodeSize: 60,
  depthSpacing: 240,
  nodeScale: 1,
  labelFontSize: 24,
  labelMaxLength: 20,
  linkWidth: 1,
  showLabels: true,
};

const sliderFormatter = (value, suffix = "") => `${value}${suffix}`;

export default function HierarchyViewSettings({
  orientation,
  onOrientationChange,
  linkStyle,
  onLinkStyleChange,
  viewConfig,
  onViewConfigChange,
}) {
  const update = (field, value) =>
    onViewConfigChange?.((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={panelStyles.panel} style={{ width: 400 }}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Layout</div>

        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Orientation</Text>
          <Select
            className={panelStyles.fixedSelect}
            size="small"
            value={orientation}
            onChange={(value) => onOrientationChange?.(value)}
            options={ORIENTATION_OPTIONS}
          />
        </div>

        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Link style</Text>
          <Select
            className={panelStyles.fixedSelect}
            size="small"
            value={linkStyle}
            onChange={(value) => onLinkStyleChange?.(value)}
            options={LINK_STYLE_OPTIONS}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Nodes</div>

        <SliderControl
          label="Size"
          valueLabel={sliderFormatter(viewConfig.nodeScale, "x")}
          min={0.6}
          max={1.8}
          step={0.05}
          value={viewConfig.nodeScale}
          onChange={(value) => update("nodeScale", value)}
        />

        <SliderControl
          label="H. space"
          valueLabel={sliderFormatter(viewConfig.nodeSize, " px")}
          min={36}
          max={140}
          step={2}
          value={viewConfig.nodeSize}
          onChange={(value) => update("nodeSize", value)}
        />

        <SliderControl
          label="V. space"
          valueLabel={sliderFormatter(viewConfig.depthSpacing, " px")}
          min={120}
          max={420}
          step={5}
          value={viewConfig.depthSpacing}
          onChange={(value) => update("depthSpacing", value)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Labels & Links</div>

        <SliderControl
          label="Label size"
          valueLabel={sliderFormatter(viewConfig.labelFontSize, " px")}
          min={12}
          max={40}
          step={1}
          value={viewConfig.labelFontSize}
          onChange={(value) => update("labelFontSize", value)}
          disabled={!viewConfig.showLabels}
        />

        <SliderControl
          label="Label chars"
          valueLabel={sliderFormatter(viewConfig.labelMaxLength, " chars")}
          min={8}
          max={60}
          step={1}
          value={viewConfig.labelMaxLength}
          onChange={(value) => update("labelMaxLength", value)}
          disabled={!viewConfig.showLabels}
        />

        <SliderControl
          label="Link width"
          valueLabel={sliderFormatter(viewConfig.linkWidth, " px")}
          min={1}
          max={6}
          step={0.2}
          value={viewConfig.linkWidth}
          onChange={(value) => update("linkWidth", value)}
        />

        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Show labels</Text>
          <Switch
            size="small"
            checked={viewConfig.showLabels}
            onChange={(value) => update("showLabels", value)}
          />
        </div>
      </div>

      <Button
        onClick={() =>
          onViewConfigChange?.(() => DEFAULT_HIERARCHY_VIEW_CONFIG)
        }
      >
        Restore defaults
      </Button>
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
