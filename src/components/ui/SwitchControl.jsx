import { Switch, Typography } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";

const { Text } = Typography;

export default function SwitchControl({ label, ...props }) {
  const text = typeof label === "string" ? label.trim() : label;
  return (
    <div className={panelStyles.row}>
      <Text className={panelStyles.label}>{text}</Text>
      <Switch {...props} />
    </div>
  );
}
