import { useSelector } from "react-redux";
import { Select, Typography } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";
import SwitchControl from "@/components/ui/SwitchControl";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import { AppButton } from "@/components/buttons/core";
import CorrelationVariableSettings from "../VariableSettings";
import SliderControl from "@/components/ui/SliderControl";

const { Text } = Typography;

export default function Settings({
  config,
  setConfig,
  params,
  setParams,
  invalidCountsByVariable = {},
  onAddVisibleVariables,
  isLassoEnabled,
  lassoTargetColumn,
  onStartLassoMode,
  onStopLassoMode,
}) {
  const navioColumns = useSelector(
    (state) => state.dataframe.navioColumns || []
  );

  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  const onVariablesChange = (values) => {
    setParams((prev) => ({
      ...prev,
      variables: values,
    }));
  };

  const variableOptions = navioColumns.map((key) => {
    const invalidCount = invalidCountsByVariable[key] ?? 0;
    const hasInvalidValues = invalidCount > 0;

    return {
      value: key,
      label: (
        <span
          style={
            hasInvalidValues
              ? {
                  color: "var(--color-danger, #cf1322)",
                  fontWeight: 600,
                }
              : undefined
          }
        >
          {hasInvalidValues ? `${key} (${invalidCount} invalid)` : key}
        </span>
      ),
    };
  });

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
          onChange={(v) => update("pointSize", v)}
        />
        <SliderControl
          label="Opacity"
          valueLabel={`${Math.round(config.pointOpacity * 100)}%`}
          min={0.2}
          max={1}
          step={0.05}
          value={config.pointOpacity}
          onChange={(v) => update("pointOpacity", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Legend</div>
        <SwitchControl label="Show legend"
          size="small"
            checked={config.showLegend}
            onChange={(v) => update("showLegend", v)}
        />
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Lasso Mode</div>
        <div className={panelStyles.rowStack}>
          <div className={panelStyles.inline}>
            {isLassoEnabled ? (
              <AppButton size="small" danger onClick={onStopLassoMode}>
                Stop lasso mode
              </AppButton>
            ) : (
              <AppButton size="small" type="primary" onClick={onStartLassoMode}>
                Start lasso mode
              </AppButton>
            )}
          </div>
          <Text className={panelStyles.helper}>
            {isLassoEnabled
              ? `Lasso mode active on column: ${lassoTargetColumn || "-"}. Use right click to draw lasso, left click + drag to pan, and save the partition as a categorical variable.`
              : "Enable Lasso mode to manually define PCA groups with free-form right-click lasso while keeping mouse pan/zoom navigation."}
          </Text>
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Variables</div>
        <CorrelationVariableSettings />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>PCA Variables</div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Included variables</Text>
          <Select
            size="small"
            mode="multiple"
            value={params.variables}
            onChange={onVariablesChange}
            placeholder="Select variables"
            options={variableOptions}
            disabled={!config.isSync}
          />
          <div className={panelStyles.inline}>
            <AppButton
              size="small"
              onClick={onAddVisibleVariables}
              disabled={!config.isSync}
            >
              Add all visible
            </AppButton>
          </div>
          <Text className={panelStyles.helper}>
            Variables in red cannot be used in PCA with the current selection.
          </Text>
        </div>
      </div>
    </div>
  );
}
