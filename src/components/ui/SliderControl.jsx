import { Slider, Typography } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";

const { Text } = Typography;

export default function SliderControl({
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
