import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDropzone } from "react-dropzone";
import { Typography } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

import { FileProcessorFactory } from "../DragDrop/drag";
import {
  createAssetBundleZip,
  readAssetBundle,
} from "@/components/management/assetBundle";
import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { updateData } from "@/store/features/dataframe";
import {
  selectAttributeDescriptionsByName,
  updateDescriptions,
  updateHierarchy,
} from "@/store/features/metadata";
import { generateFileName } from "@/utils/functions";
import { toCsv } from "@/utils/csv";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/components/notifications";

const { Title, Text } = Typography;

const ACCEPTED_FORMATS = {
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
};

const downloadBlob = ({ blob, filename }) => {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
};

const parseFileContent = ({ text, extension }) =>
  new Promise((resolve, reject) => {
    try {
      FileProcessorFactory.getProcessor(extension).process(
        text,
        resolve,
        reject,
      );
    } catch (error) {
      reject(error);
    }
  });

const Info = () => {
  const dataFilename = useSelector((state) => state.dataframe.filename);
  const hierarchyFilename = useSelector((state) => state.metadata.filename);
  const descriptionsFilename = useSelector(
    (state) => state.metadata.descriptionsFilename,
  );
  const rows = useSelector((state) => state.dataframe.dataframe);
  const hierarchy = useSelector((state) => state.metadata.attributes);
  const descriptionsByName = useSelector(selectAttributeDescriptionsByName);
  const rowCount = Array.isArray(rows) ? rows.length : 0;
  const nodeCount = Array.isArray(hierarchy) ? hierarchy.length : 0;

  const handleExport = () => {
    const zip = createAssetBundleZip([
      { name: "data.csv", content: toCsv(rows) },
      {
        name: "hierarchy.json",
        content: JSON.stringify(hierarchy || [], null, 2),
      },
      {
        name: "descriptions.json",
        content: JSON.stringify(descriptionsByName, null, 2),
      },
    ]);

    downloadBlob({
      blob: zip,
      filename: `${generateFileName("dataset-assets")}.zip`,
    });
  };

  return (
    <div className={styles.tabColumn}>
      <Title level={5} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Current
      </Title>

      <div className={styles.dataStats}>
        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Data:
          </Text>{" "}
          <Text type="secondary">{dataFilename || "—"}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Hierarchy:
          </Text>{" "}
          <Text type="secondary">{hierarchyFilename || "—"}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Descriptions:
          </Text>{" "}
          <Text type="secondary">{descriptionsFilename || "—"}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nº Rows:
          </Text>{" "}
          <Text type="secondary">{rowCount}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nº Nodes:
          </Text>{" "}
          <Text type="secondary">{nodeCount}</Text>
        </div>
      </div>

      <div className={styles.exportButtonRow}>
        <AppButton
          preset={APP_BUTTON_PRESETS.ACTION}
          className={styles.primaryExportButton}
          onClick={handleExport}
          disabled={rowCount === 0 || nodeCount === 0}
          icon={<DownloadOutlined />}
          shape="default"
        >
          Export
        </AppButton>
      </div>
    </div>
  );
};

const UploadPanel = () => {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles?.[0];

    if (!file || !(file instanceof File)) {
      notifyWarning({
        message: "Invalid file",
        description: "Select a valid ZIP file to continue.",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      notifyWarning({
        message: "Unsupported file",
        description: "Accepted format: .zip",
      });
      return;
    }

    setFile(file);
    setFilename(file.name);
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsReadingFile(true);
    setIsUploading(true);

    try {
      const bundle = await readAssetBundle(file);
      setIsReadingFile(false);

      const data = await parseFileContent(bundle.data);
      const hierarchy = await parseFileContent(bundle.hierarchy);

      await dispatch(
        updateData({
          data,
          filename: bundle.data.name,
          isGenerateHierarchy: true,
          silentSuccess: true,
        }),
      ).unwrap();

      await dispatch(
        updateHierarchy({
          hierarchy,
          filename: bundle.hierarchy.name,
          silentSuccess: true,
        }),
      ).unwrap();

      await dispatch(
        updateDescriptions({
          descriptions: bundle.descriptions.text,
          filename: bundle.descriptions.name,
          silentSuccess: true,
        }),
      ).unwrap();

      notifySuccess({
        message: "Dataset assets imported",
        description: "Data, hierarchy, and descriptions were loaded.",
      });
    } catch (error) {
      notifyError({
        message: "Could not import ZIP",
        error,
        fallback: "ZIP import failed. Verify filenames and file contents.",
      });
    } finally {
      setIsReadingFile(false);
      setIsUploading(false);
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
        description: "Accepted format: .zip",
      });
    },
  });

  return (
    <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Import
      </Title>
      <div
        {...getRootProps({
          className: `${styles.dropzone} ${styles.dataDropzone}`,
          "aria-label": "Upload dataset assets ZIP",
        })}
      >
        <input {...getInputProps()} />
        <UploadOutlined />
        <span className={styles.dataDropLabel}>
          Choose a file or drag it here
        </span>
      </div>
      <div className={styles.dataDropHint}>
        <span className={styles.subtitle}>
          Required: data, hierarchy, descriptions
        </span>
        {(isReadingFile || filename) && (
          <span className={styles.text}>
            {isReadingFile ? "Reading file..." : filename}
          </span>
        )}
      </div>

      <div className={`${styles.controls} ${styles.dataImportControls}`}>
        <AppButton
          preset={APP_BUTTON_PRESETS.ACTION}
          onClick={handleUpload}
          disabled={!filename || isUploading}
          loading={isUploading}
          icon={<UploadOutlined />}
          shape="default"
        >
          Import
        </AppButton>
      </div>
    </div>
  );
};

export default function TabBundle() {
  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.tabSplit}>
        <Info />
        <UploadPanel />
      </div>
    </div>
  );
}
