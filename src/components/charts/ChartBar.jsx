import React from "react";
import {
  SettingOutlined,
  ExperimentOutlined,
  InfoCircleFilled,
  CloseOutlined,
  SyncOutlined,
} from "@ant-design/icons";

import styles from "@/styles/ChartBar.module.css";
import DownloadButton from "@/components/ui/DownloadButton";
import ViewRecordsDownloadButton from "@/components/ui/ViewRecordsDownloadButton";
import BarButton from "@/components/ui/BarButton";
import PopoverButton from "@/components/ui/PopoverButton";
import buttonStyles from "@/styles/Buttons.module.css";

export default function ChartBar({
  settings,
  testsSettings,
  title,
  hoverTitle,
  svgIDs,
  remove,
  info = "",
  config,
  setConfig,
  recordsExport,
}) {
  const isSync = Boolean(config?.isSync);
  const titleHoverText = hoverTitle || title;
  const updateConfig = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={styles.chartBar} data-view-bar>
      <div
        className={`${styles.dragHandle} drag-handle ${styles.chartTitle}`}
        title={titleHoverText}
      >
        {title}
      </div>

      <div className={styles.right}>
        {setConfig && (
          <BarButton
            title={
              isSync
                ? "Disable sync with Explorer selection"
                : "Enable sync with Explorer selection"
            }
            icon={<SyncOutlined />}
            onClick={() => updateConfig("isSync", !isSync)}
            className={
              isSync ? buttonStyles.barButton : buttonStyles.greyBarButton
            }
          />
        )}
        {recordsExport && <ViewRecordsDownloadButton {...recordsExport} />}
        {svgIDs && <DownloadButton svgIds={svgIDs} filename={`${title}`} />}

        {info && (
          <PopoverButton
            content={info}
            icon={<InfoCircleFilled />}
            title={"Info"}
          />
        )}

        <PopoverButton
          content={settings}
          icon={<SettingOutlined />}
          panelWidth={400}
        />
        {testsSettings && (
          <PopoverButton
            content={testsSettings}
            icon={<ExperimentOutlined />}
            title={"Tests"}
            panelWidth={400}
          />
        )}
        {remove && (
          <BarButton title="Close" icon={<CloseOutlined />} onClick={remove} />
        )}
      </div>
    </div>
  );
}

export function NodeBar({ title, remove }) {
  return (
    <div className={styles.chartBar} data-view-bar>
      <div className={styles.chartTitle} title={title}>
        {title}
      </div>

      <div className={styles.right}>
        {remove && (
          <BarButton title="Close" icon={<CloseOutlined />} onClick={remove} />
        )}
      </div>
    </div>
  );
}

export function Bar({ children, title }) {
  return (
    <div className={styles.chartBar} data-view-bar>
      <div
        className={`${styles.dragHandle} drag-handle ${styles.chartTitle}`}
        title={title}
      >
        {title}
      </div>

      <div className={styles.right}>{children}</div>
    </div>
  );
}
