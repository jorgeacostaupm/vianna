import React, { useState } from "react";
import { Grid, Modal, Tabs, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import TabSettings from "@/components/management/Tabs/TabSettings";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import AnalysisSelectField from "@/components/ui/AnalysisSelectField";
import {
  selectCategoricalVars,
  selectDefaultAnalysisContext,
  selectNavioVars,
  setGroupVar,
  setIdVar,
  setTimeVar,
} from "@/store/features/main";
import styles from "@/components/management/Data.module.css";

const { Text, Title } = Typography;

function VariablesSettingsTab() {
  const dispatch = useDispatch();
  const { idVar, groupVar, timeVar } = useSelector(selectDefaultAnalysisContext);
  const navioVars = useSelector(selectNavioVars);
  const categoricalVars = useSelector(selectCategoricalVars);

  return (
    <div className={styles.settingsPanel}>
      <section className={styles.settingsSection}>
        <AnalysisSelectField
          label="ID attribute"
          value={idVar ?? undefined}
          onChange={(value) => dispatch(setIdVar(value ?? null))}
          placeholder="Select ID attribute"
          options={navioVars}
          allowClear
        />
        <Text type="secondary" className={styles.settingsHint}>
          Default subject identifier used by analysis components.
        </Text>
      </section>

      <section className={styles.settingsSection}>
        <AnalysisSelectField
          label="Group attribute"
          value={groupVar ?? undefined}
          onChange={(value) => dispatch(setGroupVar(value ?? null))}
          placeholder="Select group attribute"
          options={categoricalVars}
          allowClear
        />
        <Text type="secondary" className={styles.settingsHint}>
          Default grouping attribute for comparison, evolution, and correlation.
        </Text>
      </section>

      <section className={styles.settingsSection}>
        <AnalysisSelectField
          label="Time attribute"
          value={timeVar ?? undefined}
          onChange={(value) => dispatch(setTimeVar(value ?? null))}
          placeholder="Select time attribute"
          options={navioVars}
          allowClear
        />
        <Text type="secondary" className={styles.settingsHint}>
          Default time attribute for longitudinal views.
        </Text>
      </section>
    </div>
  );
}

export default function AppSettingsButton({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  tooltipPlacement = "top",
}) {
  const [internalIsModalOpen, setInternalIsModalOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === "boolean";
  const isModalOpen = isControlled ? controlledOpen : internalIsModalOpen;
  const screens = Grid.useBreakpoint();

  const setModalOpen = (nextOpen) => {
    if (!isControlled) {
      setInternalIsModalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <>
      <AppButton
        preset={APP_BUTTON_PRESETS.PANEL_ICON}
        tooltip="Settings"
        tooltipPlacement={tooltipPlacement}
        ariaLabel="Settings"
        onClick={() => setModalOpen(true)}
        icon={<SettingOutlined />}
      />
      <Modal
        title={
          <div className={styles.modalTitle}>
            <Title level={3} style={{ margin: 0, color: "var(--primary-color)" }}>
              Settings
            </Title>
            <Text type="secondary" className={styles.modalSubtitle}>
              Configure application behavior and default analysis attributes.
            </Text>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={screens.md ? 640 : "96vw"}
        centered={!screens.md}
        destroyOnClose
      >
        <Tabs
          className={styles.managementTabs}
          defaultActiveKey="general"
          items={[
            {
              key: "general",
              label: "General",
              children: <TabSettings />,
            },
            {
              key: "variables",
              label: "Attributes",
              children: <VariablesSettingsTab />,
            },
          ]}
        />
      </Modal>
    </>
  );
}
