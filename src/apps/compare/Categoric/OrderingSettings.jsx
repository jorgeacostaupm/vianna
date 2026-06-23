import { Select, Typography } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";

const { Text } = Typography;

const orderOptions = [
  { value: "alpha", label: "Alphabetical" },
  { value: "count", label: "By count" },
];

export default function OrderingSettings({ config, setConfig }) {
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Ordering</div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Groups</Text>
          <Select
            size="small"
            value={config.groupOrder}
            onChange={(v) => update("groupOrder", v)}
            options={orderOptions}
          />
        </div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Categories</Text>
          <Select
            size="small"
            value={config.categoryOrder}
            onChange={(v) => update("categoryOrder", v)}
            options={orderOptions}
          />
        </div>
      </div>
    </div>
  );
}
