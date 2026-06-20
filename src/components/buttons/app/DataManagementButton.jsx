import React, { useState } from "react";
import { Modal, Tabs, Typography } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";

import TabData from "@/components/management/Tabs/TabData";
import TabHierarchy from "@/components/management/Tabs/TabHierarchy";
import styles from "@/components/management/Data.module.css";
import TabDescriptions from "@/components/management/Tabs/TabDescriptions";
import TabBundle from "@/components/management/Tabs/TabBundle";
import TabWorkspace from "@/components/management/Tabs/TabWorkspace";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

const { Text, Title } = Typography;

const items = [
  {
    key: "data",
    label: "Data",
    children: <TabData />,
  },
  {
    key: "hierarchy",
    label: "Hierarchy",
    children: <TabHierarchy />,
  },
  {
    key: "descriptions",
    label: "Descriptions",
    children: <TabDescriptions />,
  },
  {
    key: "zip",
    label: "Dataset bundle",
    children: <TabBundle />,
  },
  {
    key: "workspace",
    label: "Workspace",
    children: <TabWorkspace />,
  },
];

export default function DataManagementButton({
  trigger = "panel",
  buttonLabel = "Management",
  buttonType = "default",
  size = "middle",
  onOpen,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  tooltipPlacement = "top",
}) {
  const [internalIsModalOpen, setInternalIsModalOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === "boolean";
  const isModalOpen = isControlled ? controlledOpen : internalIsModalOpen;

  const setModalOpen = (nextOpen) => {
    if (!isControlled) {
      setInternalIsModalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const showModal = () => {
    onOpen?.();
    setModalOpen(true);
  };

  const handleOk = () => {
    setModalOpen(false);
  };

  const handleCancel = () => {
    setModalOpen(false);
  };

  return (
    <>
      {trigger === "panel" ? (
        <AppButton
          preset={APP_BUTTON_PRESETS.PANEL_ICON}
          tooltip="Management"
          tooltipPlacement={tooltipPlacement}
          ariaLabel="Management"
          onClick={showModal}
          icon={<DatabaseOutlined />}
        />
      ) : (
        <AppButton
          preset={APP_BUTTON_PRESETS.BRAND}
          type={buttonType}
          size={size}
          icon={<DatabaseOutlined />}
          onClick={showModal}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </AppButton>
      )}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <Title
              level={3}
              style={{
                marginTop: 0,
                marginBottom: 0,
                color: "var(--primary-color)",
              }}
            >
              Dataset Assets
            </Title>
            <Text type="secondary" className={styles.modalSubtitle}>
              Review, export, and import the data, hierarchy, descriptions, and
              workspace files used by VIANNA.
            </Text>
          </div>
        }
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        width={"800px"}
        footer={null}
      >
        <Tabs
          className={styles.managementTabs}
          defaultActiveKey="data"
          items={items}
        />
      </Modal>
    </>
  );
}
