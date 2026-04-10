import React, { useState } from "react";
import { Button, Grid, Modal, Tabs } from "antd";
import { DatabaseOutlined } from "@ant-design/icons";

import TabData from "../Tabs/TabData";
import TabHierarchy from "../Tabs/TabHierarchy";
import styles from "../Data.module.css";
import PanelButton from "@/components/ui/PanelButton";
import TabDescriptions from "../Tabs/TabDescriptions";
import TabSettings from "../Tabs/TabSettings";

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
    key: "settings",
    label: "Settings",
    children: <TabSettings />,
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
}) {
  const [internalIsModalOpen, setInternalIsModalOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === "boolean";
  const isModalOpen = isControlled ? controlledOpen : internalIsModalOpen;
  const screens = Grid.useBreakpoint();
  const modalWidth = screens.xl ? 1200 : screens.lg ? "94vw" : "96vw";
  const modalTop = screens.md ? 24 : 12;

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
        <PanelButton
          title="Management"
          ariaLabel="Management"
          onClick={showModal}
          icon={<DatabaseOutlined />}
        />
      ) : (
        <Button
          type={buttonType}
          size={size}
          icon={<DatabaseOutlined />}
          onClick={showModal}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </Button>
      )}
      <Modal
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        width={modalWidth}
        style={{ top: modalTop }}
        footer={null}
        centered={!screens.md}
        destroyOnClose
      >
        <Tabs
          className={styles.customTabs}
          defaultActiveKey="data"
          items={items}
        />
      </Modal>
    </>
  );
}
