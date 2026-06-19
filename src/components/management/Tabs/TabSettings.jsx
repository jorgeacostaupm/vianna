import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Radio, Switch, Typography } from "antd";

import {
  selectAppOpenMode,
  selectShowInformativeTooltips,
  updateConfig,
} from "@/store/features/main";
import styles from "../Data.module.css";

const { Text } = Typography;

export default function TabSettings() {
  const dispatch = useDispatch();
  const showInformativeTooltips = useSelector(selectShowInformativeTooltips);
  const appOpenMode = useSelector(selectAppOpenMode);

  const handleConfigUpdate = (field, value) => {
    dispatch(updateConfig({ field, value }));
  };

  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.settingsPanel}>
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
      </div>
    </div>
  );
}
