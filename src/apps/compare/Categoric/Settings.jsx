import { Radio, Tabs } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import GroupSettings from "../GroupSettings";

export default function Settings({ config, setConfig }) {
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  const viewSettings = (
    <div className={panelStyles.section}>
      <div className={panelStyles.sectionTitle}>View</div>
      <div className={panelStyles.controlInlineRow}>
        <Radio.Group
          className={panelStyles.radioGroupCompact}
          optionType="button"
          buttonStyle="solid"
          value={config.chartType}
          size="small"
          onChange={(e) => update("chartType", e.target.value)}
        >
          <Radio.Button value="stacked">Stacked bars</Radio.Button>
          <Radio.Button value="grouped">Grouped bars</Radio.Button>
        </Radio.Group>
      </div>
      {config.chartType === "stacked" && (
        <div className={panelStyles.controlInlineRow}>
          <Radio.Group
            className={panelStyles.radioGroupCompact}
            optionType="button"
            buttonStyle="solid"
            size="small"
            value={config.stackedMode || "total"}
            onChange={(e) => update("stackedMode", e.target.value)}
          >
            <Radio.Button value="total">Totals</Radio.Button>
            <Radio.Button value="proportion">Proportions</Radio.Button>
          </Radio.Group>
        </div>
      )}
      <AxisLabelSizeControl config={config} setConfig={setConfig} />
    </div>
  );

  const groupingSettings = (
    <div className={panelStyles.section}>
      <div className={panelStyles.sectionTitle}>Groups</div>
      <GroupSettings />
    </div>
  );

  return (
    <div className={panelStyles.panel}>
      <Tabs
        defaultActiveKey="view"
        items={[
          {
            key: "view",
            label: "View",
            children: viewSettings,
          },
          {
            key: "grouping",
            label: "Grouping",
            children: groupingSettings,
          },
        ]}
      />
    </div>
  );
}
