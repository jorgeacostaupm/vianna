import { useSelector } from "react-redux";
import { Select, Tabs, Typography } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import CorrelationVariableSettings from "../VariableSettings";
import SliderControl from "@/components/ui/SliderControl";

const { Text } = Typography;

export default function Settings({ config, setConfig }) {
  const navioColumns = useSelector(
    (state) => state.dataframe.navioColumns || []
  );

  const onVariablesChange = (values) => {
    setConfig((prev) => ({
      ...prev,
      variables: values,
    }));
  };

  const onPointSizeChange = (value) => {
    setConfig((prev) => ({
      ...prev,
      pointSize: value,
    }));
  };

  const styleSettings = (
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Points</div>
        <SliderControl
          label="Size"
          valueLabel={`${config.pointSize}px`}
          min={1}
          max={20}
          value={config.pointSize}
          onChange={onPointSizeChange}
        />
        <SliderControl
          label="Opacity"
          valueLabel={`${Math.round(config.pointOpacity * 100)}%`}
          min={0.2}
          max={1}
          step={0.05}
          value={config.pointOpacity}
          onChange={(v) =>
            setConfig((prev) => ({
              ...prev,
              pointOpacity: v,
            }))
          }
        />
      </div>
  );

  const axisSettings = (
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Axis Labels</div>
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>
  );

  const variableSettings = (
    <>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Variables</div>
        <CorrelationVariableSettings />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Scatter Variables</div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Included variables</Text>
          <Select
            size="small"
            mode="multiple"
            value={config.variables}
            onChange={onVariablesChange}
            placeholder="Select variables"
            options={navioColumns.map((key) => ({
              value: key,
              label: key,
            }))}
            disabled={!config.isSync}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className={`${panelStyles.panel} ${panelStyles.tabbedPanel}`}>
      <Tabs
        defaultActiveKey="style"
        items={[
          { key: "style", label: "Style", children: styleSettings },
          { key: "axis", label: "Axis", children: axisSettings },
          { key: "variables", label: "Variables", children: variableSettings },
        ]}
      />
    </div>
  );
}
