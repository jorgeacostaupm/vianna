import React, { useCallback } from "react";
import { Slider, Typography } from "antd";
import { useDispatch } from "react-redux";
import { SettingOutlined } from "@ant-design/icons";
import PopoverButton from "@/components/ui/PopoverButton";
import panelStyles from "@/styles/SettingsPanel.module.css";

const { Text } = Typography;

function SettingsContent({ config, updateConfig }) {
  const dispatch = useDispatch();

  const handleUpdateConfig = useCallback(
    (field, value) => dispatch(updateConfig({ field, value })),
    [dispatch],
  );

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Settings</div>
        <div className={panelStyles.sliderInlineRowOverview}>
          <Text strong>Navio Height</Text>
          <Text className={panelStyles.value}>{config.navioHeight}px</Text>
          <Slider
            className={panelStyles.sliderInlineControl}
            min={400}
            max={3000}
            step={50}
            defaultValue={config.navioHeight}
            onChangeComplete={(v) => handleUpdateConfig("navioHeight", v)}
          />
        </div>

        <div className={panelStyles.sliderInlineRowOverview}>
          <Text strong>Attribute Width</Text>
          <Text className={panelStyles.value}>{config.attrWidth}px</Text>
          <Slider
            className={panelStyles.sliderInlineControl}
            min={10}
            max={100}
            step={5}
            defaultValue={config.attrWidth}
            onChangeComplete={(v) => handleUpdateConfig("attrWidth", v)}
          />
        </div>

        <div className={panelStyles.sliderInlineRowOverview}>
          <Text strong>Label Height</Text>
          <Text className={panelStyles.value}>{config.navioLabelHeight}px</Text>
          <Slider
            className={panelStyles.sliderInlineControl}
            min={100}
            max={200}
            step={10}
            defaultValue={config.navioLabelHeight}
            onChangeComplete={(v) => handleUpdateConfig("navioLabelHeight", v)}
          />
        </div>
      </div>

      {/*       <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Button icon={<RedoOutlined />} onClick={handleRedoData} type="default">
          Redo Data
        </Button>
        <Button icon={<UndoOutlined />} onClick={handleUndoData} type="default">
          Undo Data
        </Button>
      </div> */}
    </div>
  );
}

export default function SettingsButton({ config, updateConfig }) {
  return (
    <PopoverButton
      content={<SettingsContent config={config} updateConfig={updateConfig} />}
      icon={<SettingOutlined />}
      panelWidth={420}
    />
  );
}
