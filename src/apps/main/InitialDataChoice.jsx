import React, { useRef } from "react";
import { Card, Typography } from "antd";
import {
  DatabaseOutlined,
  ExperimentOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import styles from "./InitialDataChoice.module.css";
import {
  AppButton,
  APP_BUTTON_PRESETS,
} from "@/components/buttons/core";

const { Text, Title } = Typography;

const formatSavedAt = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function InitialDataChoice({
  isLoadingDemo,
  autosavedWorkspaceSummary,
  onRestoreAutosave,
  onLoadWorkspace,
  onLoadDemo,
  onStartWithData,
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
      <Card className={styles.welcomeCard}>
        <div className={styles.initialDataChoiceContent}>
          <img
            src="./favicon.svg"
            alt="VIANNA"
            className={styles.initialChoiceLogo}
          />
          <Title level={1} className={styles.initialChoiceTitle}>
            Welcome to VIANNA
          </Title>
          <Text type="secondary" className={styles.initialChoiceText}>
            Load data, organize variables, and build coordinated analytical
            views for exploratory research.
          </Text>

          {autosavedWorkspaceSummary ? (
            <section
              className={styles.savedSession}
              aria-labelledby="saved-session-title"
            >
              <div className={styles.savedSessionHeader}>
                <Text strong id="saved-session-title">
                  Autosaved session
                </Text>
                <Text type="secondary" className={styles.savedSessionDate}>
                  {formatSavedAt(autosavedWorkspaceSummary.savedAt)}
                </Text>
              </div>
              <div className={styles.savedSessionSummary}>
                <div>
                  <span>Data</span>
                  <strong>
                    {autosavedWorkspaceSummary.dataFilename || "Untitled"}
                  </strong>
                </div>
                <div>
                  <span>Records</span>
                  <strong>{autosavedWorkspaceSummary.rowCount}</strong>
                </div>
                <div>
                  <span>Hierarchy nodes</span>
                  <strong>{autosavedWorkspaceSummary.nodeCount}</strong>
                </div>
              </div>
              <AppButton
                preset={APP_BUTTON_PRESETS.BRAND}
                type="primary"
                icon={<SaveOutlined />}
                onClick={onRestoreAutosave}
                block
              >
                Restore autosaved session
              </AppButton>
            </section>
          ) : null}

          <section
            className={styles.startSection}
            aria-labelledby="start-session-title"
          >
            <div className={styles.sectionHeading}>
              <Text strong id="start-session-title">
                Start a new session
              </Text>
              <Text type="secondary">
                Import your own dataset or explore the included demo first.
              </Text>
            </div>

            <div className={styles.primaryActions}>
              <AppButton
                preset={APP_BUTTON_PRESETS.BRAND}
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={onStartWithData}
              >
                Import data files
              </AppButton>
              <AppButton
                preset={APP_BUTTON_PRESETS.ACTION}
                icon={<ExperimentOutlined />}
                onClick={onLoadDemo}
                loading={isLoadingDemo}
              >
                Explore demo dataset
              </AppButton>
            </div>

            <input
              ref={workspaceInputRef}
              type="file"
              accept=".json,application/json"
              className={styles.hiddenInput}
              onChange={handleWorkspaceInputChange}
            />
            <div className={styles.secondaryActions}>
              <AppButton
                preset={APP_BUTTON_PRESETS.ACTION}
                icon={<FolderOpenOutlined />}
                onClick={() => workspaceInputRef.current?.click()}
              >
                Open workspace file
              </AppButton>
              <AppButton
                preset={APP_BUTTON_PRESETS.ACTION}
                icon={<FileAddOutlined />}
                onClick={onContinueWithoutData}
              >
                Open empty workspace
              </AppButton>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
