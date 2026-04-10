import React from "react";
import { useSelector } from "react-redux";
import { Button, Select, Typography, InputNumber, Slider } from "antd";
import { getTopCorrelations } from "@/utils/functionsCorrelation";
import {
  COLOR_SCALES,
  CORRELATION_METHODS,
} from "@/apps/correlation/CorrelationMatrix/constants";
import { EditOutlined } from "@ant-design/icons";
import panelStyles from "@/styles/SettingsPanel.module.css";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";

const { Text } = Typography;

export default function Settings({ config, setConfig, params, setParams }) {
  const data = useSelector((s) => s.dataframe.selection);
  const navioColumns = useSelector(
    (state) => state.dataframe.navioColumns || [],
  );

  const onVariablesChange = (variables) => {
    setParams((prev) => ({
      ...prev,
      variables,
    }));
  };

  const onClick = () => {
    const nTop = params.nTop;
    const variables = getTopCorrelations(data, nTop, params.method);
    setParams((prev) => ({
      ...prev,
      variables,
    }));
  };

  const onChange = (nTop) => {
    setParams((prev) => ({
      ...prev,
      nTop,
    }));
  };

  const onRangeChange = (range) => {
    setConfig((prev) => ({
      ...prev,
      range,
    }));
  };

  const onMethodChange = (method) => {
    setParams((prev) => ({
      ...prev,
      method,
    }));
  };

  const onColorScaleChange = (colorScale) => {
    setConfig((prev) => ({
      ...prev,
      colorScale,
    }));
  };

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Variables</div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Included variables</Text>
          <Select
            size="small"
            mode="multiple"
            value={params.variables}
            onChange={onVariablesChange}
            placeholder="Select variables"
            options={navioColumns.map((key) => ({
              value: key,
              label: key,
            }))}
            disabled={!config.isSync}
          />
        </div>
        <div className={panelStyles.inline}>
          <Text className={panelStyles.label}>Top correlations</Text>
          <InputNumber
            size="small"
            min={0}
            value={params.nTop}
            onChange={onChange}
            style={{ width: 120 }}
          />
          <Button type="primary" icon={<EditOutlined />} onClick={onClick} />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Correlation</div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Method</Text>
          <Select
            size="small"
            value={params.method}
            onChange={onMethodChange}
            options={CORRELATION_METHODS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            disabled={!config.isSync}
            className={panelStyles.control}
          />
        </div>

        <div className={panelStyles.sliderInlineRowCorrelation}>
          <Text className={panelStyles.label}>Range</Text>
          <Text className={panelStyles.value}>
            {config.range[0].toFixed(2)}-{config.range[1].toFixed(2)}
          </Text>
          <Slider
            className={panelStyles.sliderInlineControl}
            range
            min={0}
            max={1}
            step={0.01}
            value={config.range}
            onChange={onRangeChange}
            disabled={!config.isSync}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Display</div>
        <div className={panelStyles.rowStack}>
          <Text className={panelStyles.label}>Color scale</Text>
          <Select
            size="small"
            value={config.colorScale}
            onChange={onColorScaleChange}
            options={COLOR_SCALES.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            className={panelStyles.control}
          />
        </div>
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>
    </div>
  );
}
