import { useSelector } from "react-redux";
import { Select, Typography } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import SwitchControl from "@/components/ui/SwitchControl";
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

  return (
    <div className={panelStyles.panel}>
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

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Legend</div>
        <SwitchControl label="Show legend"
          size="small"
            checked={config.showLegend}
            onChange={(v) =>
              setConfig((prev) => ({
                ...prev,
                showLegend: v,
              }))
            }
        />
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>

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
    </div>
  );
}
