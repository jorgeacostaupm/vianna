import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, ColorPicker, Divider, Radio, Switch, Typography } from "antd";

import {
  selectAppBrandColor,
  selectAppOpenMode,
  selectShowInformativeTooltips,
  updateConfig,
} from "@/store/features/main";
import { MAIN_CONFIG_DEFAULTS } from "@/store/features/main/configDefaults";
import { sanitizeBrandColor } from "@/utils/appTheme";
import styles from "../Data.module.css";

const { Text, Title } = Typography;

const COLOR_PRESETS = [
  { label: "Blue", value: "#4e6698" },
  { label: "Emerald", value: "#1f8f78" },
  { label: "Amber", value: "#b07a2a" },
  { label: "Coral", value: "#c45f66" },
  { label: "Slate", value: "#5e6b82" },
];

export default function TabSettings() {
  const dispatch = useDispatch();
  const showInformativeTooltips = useSelector(selectShowInformativeTooltips);
  const appOpenMode = useSelector(selectAppOpenMode);
  const appBrandColor = sanitizeBrandColor(useSelector(selectAppBrandColor));

  const handleConfigUpdate = (field, value) => {
    dispatch(updateConfig({ field, value }));
  };

  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.settingsPanel}>
        <Title level={4} style={{ margin: 0, color: "var(--primary-color)" }}>
          Settings
        </Title>
        <Text type="secondary">
          Configure informative tooltips, how applications open, and the main
          application color.
        </Text>

        <Divider style={{ margin: "0.25rem 0 0.5rem 0" }} />

        <section className={styles.settingsSection}>
          <div className={styles.settingsRowBetween}>
            <Text strong style={{ color: "var(--primary-color)" }}>
              Informative tooltips
            </Text>
            <Switch
              checked={showInformativeTooltips}
              onChange={(checked) =>
                handleConfigUpdate("showInformativeTooltips", checked)
              }
            />
          </div>
          <Text type="secondary" className={styles.settingsHint}>
            Show helper hints on toolbar buttons and controls.
          </Text>
        </section>

        <section className={styles.settingsSection}>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Open applications in
          </Text>
          <Radio.Group
            className={styles.settingsRadioGroup}
            optionType="button"
            buttonStyle="solid"
            value={appOpenMode}
            onChange={(event) =>
              handleConfigUpdate("appOpenMode", event.target.value)
            }
          >
            <Radio.Button value="window">New window</Radio.Button>
            <Radio.Button value="tab">New tab</Radio.Button>
          </Radio.Group>
          <Text type="secondary" className={styles.settingsHint}>
            Choose if app buttons open a dedicated window or a browser tab.
          </Text>
        </section>

        {/*         <section className={styles.settingsSection}>
          <div className={styles.settingsRowBetween}>
            <Text strong style={{ color: "var(--primary-color)" }}>
              Main color
            </Text>
            <ColorPicker
              value={appBrandColor}
              showText
              onChangeComplete={(color) =>
                handleConfigUpdate("appBrandColor", color.toHexString())
              }
            />
          </div>

          <div className={styles.colorPresetGrid}>
            {COLOR_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                className={styles.colorPresetButton}
                onClick={() => handleConfigUpdate("appBrandColor", preset.value)}
              >
                <span
                  className={styles.colorPresetDot}
                  style={{ backgroundColor: preset.value }}
                />
                {preset.label}
              </Button>
            ))}
          </div>

          <div>
            <Button
              type="link"
              style={{ paddingInline: 0 }}
              onClick={() =>
                handleConfigUpdate(
                  "appBrandColor",
                  MAIN_CONFIG_DEFAULTS.appBrandColor,
                )
              }
            >
              Restore default color
            </Button>
          </div>
        </section> */}
      </div>
    </div>
  );
}
