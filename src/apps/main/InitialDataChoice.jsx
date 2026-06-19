import React, { useRef } from "react";
import { Card, Typography } from "antd";
import {
  DownloadOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import styles from "./InitialDataChoice.module.css";
import { AppButton } from "@/components/buttons/core";

const { Text } = Typography;

export default function InitialDataChoice({
  isLoadingDemo,
  autosavedWorkspaceSummary,
  onRestoreAutosave,
  onLoadWorkspace,
  onLoadDemo,
  onContinueWithoutData,
}) {
  const workspaceInputRef = useRef(null);

  const handleWorkspaceInputChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    onLoadWorkspace?.(file);
  };

  return (
    <div className={styles.mainLoadDemoData}>
      <Card>
        <div
          direction="vertical"
          size="middle"
          className={styles.initialDataChoiceContent}
        >
          <img
            src="./favicon.svg"
            alt="VIANNA"
            className={styles.initialChoiceLogo}
          />
          <Text strong className={styles.initialChoiceTitle}>
            Welcome to VIANNA
          </Text>
          <Text type="secondary" className={styles.initialChoiceText}>
            Restore previous work, load a workspace, or start from data files.
          </Text>

          <div className={styles.initialChoiceButtonsRow}>
            {autosavedWorkspaceSummary ? (
              <AppButton
                type="primary"
                icon={<SaveOutlined />}
                onClick={onRestoreAutosave}
              >
                Restore Session
              </AppButton>
            ) : null}
            <input
              ref={workspaceInputRef}
              type="file"
              accept=".json,application/json"
              className={styles.hiddenInput}
              onChange={handleWorkspaceInputChange}
            />
            <AppButton
              type={autosavedWorkspaceSummary ? "default" : "primary"}
              icon={<UploadOutlined />}
              onClick={() => workspaceInputRef.current?.click()}
            >
              Load Workspace
            </AppButton>
            <AppButton
              type="default"
              icon={<DownloadOutlined />}
              onClick={onLoadDemo}
              loading={isLoadingDemo}
            >
              Load Demo Data
            </AppButton>
            <AppButton
              type="default"
              icon={<PlayCircleOutlined />}
              onClick={onContinueWithoutData}
            >
              Continue
            </AppButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
