import React, { useCallback, useState } from "react";
import { Typography } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useDropzone } from "react-dropzone";

import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import {
  createWorkspaceSnapshot,
  downloadWorkspace,
  readWorkspaceFile,
  restoreWorkspace,
} from "@/workspace/workspace";
import { generateFileName } from "@/utils/functions";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/components/notifications";

const { Title, Text } = Typography;

const ACCEPTED_FORMATS = {
  "application/json": [".json"],
};

export default function TabWorkspace() {
  const dispatch = useDispatch();
  const state = useSelector((reduxState) => reduxState);
  const [file, setFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    const route = window.location?.hash || "#/";
    downloadWorkspace(
      createWorkspaceSnapshot(state, route),
      `${generateFileName("workspace")}.vianna-workspace.json`,
    );
  };

  const handleFileDrop = useCallback((acceptedFiles) => {
    const nextFile = acceptedFiles?.[0];
    if (!nextFile || !(nextFile instanceof File)) {
      notifyWarning({
        message: "Invalid file",
        description: "Select a valid workspace JSON file.",
      });
      return;
    }
    setFile(nextFile);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const workspace = await readWorkspaceFile(file);
      dispatch(restoreWorkspace(workspace));
      notifySuccess({
        message: "Workspace imported",
        description: "Workspace state was restored.",
      });
    } catch (error) {
      notifyError({
        message: "Could not import workspace",
        error,
        fallback: "Workspace import failed. Verify the JSON file.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFileDrop,
    maxFiles: 1,
    accept: ACCEPTED_FORMATS,
    multiple: false,
    onDropRejected: () => {
      notifyWarning({
        message: "Unsupported file",
        description: "Accepted format: .json",
      });
    },
  });

  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.tabSplit}>
        <div className={styles.tabColumn}>
          <Title level={5} style={{ marginTop: 0, color: "var(--primary-color)" }}>
            Export
          </Title>
          <Text type="secondary">
            Save the current data, hierarchy, selections, analysis context, and
            open analysis views.
          </Text>
          <div className={styles.exportButtonRow}>
            <AppButton
              preset={APP_BUTTON_PRESETS.ACTION}
              className={styles.primaryExportButton}
              onClick={handleExport}
              icon={<DownloadOutlined />}
              shape="default"
            >
              Save workspace
            </AppButton>
          </div>
        </div>

        <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
          <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
            Import
          </Title>
          <div
            {...getRootProps({
              className: `${styles.dropzone} ${styles.dataDropzone}`,
              "aria-label": "Upload workspace JSON",
            })}
          >
            <input {...getInputProps()} />
            <UploadOutlined />
            <span className={styles.dataDropLabel}>
              Choose a file or drag it here
            </span>
          </div>
          <div className={styles.dataDropHint}>
            <span className={styles.subtitle}>Workspace JSON</span>
            {file ? <span className={styles.text}>{file.name}</span> : null}
          </div>

          <div className={`${styles.controls} ${styles.dataImportControls}`}>
            <AppButton
              preset={APP_BUTTON_PRESETS.ACTION}
              onClick={handleImport}
              disabled={!file || isImporting}
              loading={isImporting}
              icon={<UploadOutlined />}
              shape="default"
            >
              Load workspace
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
