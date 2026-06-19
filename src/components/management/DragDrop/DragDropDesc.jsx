import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDropzone } from "react-dropzone";
import { UploadOutlined } from "@ant-design/icons";

import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { updateDescriptions } from "@/store/features/metadata";
import { notifyError, notifyWarning } from "@/components/notifications";

const ACCEPTED_FORMATS = {
  "text/csv": [".csv"],
  "application/json": [".json"],
};

export default function DragDropDesc() {
  const dispatch = useDispatch();

  const [filename, setFilename] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const isUploading = useSelector(
    (state) => state.metadata.loadingDescriptions,
  );

  const handleUpload = async () => {
    if (!parsedData) return;

    try {
      await dispatch(
        updateDescriptions({ descriptions: parsedData, filename }),
      ).unwrap();
      setParsedData(null);
      setFilename(null);
    } catch (error) {
      notifyError({
        message: "Could not upload descriptions",
        error,
        fallback:
          "Descriptions upload failed. Verify CSV headers or JSON values.",
      });
    }
  };

  const handleFileDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles?.[0];

    if (!file) {
      notifyWarning({
        message: "Invalid file",
        description: "Select a CSV or JSON file to continue.",
      });
      return;
    }

    const reader = new FileReader();
    setIsReadingFile(true);

    reader.onload = () => {
      setParsedData(reader.result);
      setFilename(file.name);
      setIsReadingFile(false);
    };

    reader.onerror = () => {
      notifyError({
        message: "Could not read descriptions file",
        fallback: "The file could not be read.",
      });
      setIsReadingFile(false);
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFileDrop,
    maxFiles: 1,
    accept: ACCEPTED_FORMATS,
    multiple: false,
    onDropRejected: () => {
      notifyWarning({
        message: "Unsupported file",
        description: "Accepted formats: .csv, .json",
      });
    },
  });

  return (
    <>
      <div
        {...getRootProps({
          className: `${styles.dropzone} ${styles.dataDropzone}`,
          "aria-label": "Upload descriptions file",
        })}
      >
        <input {...getInputProps()} />
        <UploadOutlined />
        <span className={styles.dataDropLabel}>
          Choose a file or drag it here
        </span>
      </div>
      <div className={styles.dataDropHint}>
        <span className={styles.subtitle}>Accepted: .csv, .json</span>
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
          disabled={!parsedData || isUploading || isReadingFile}
          loading={isUploading}
          icon={<UploadOutlined />}
          shape="default"
        >
          Import
        </AppButton>
      </div>
    </>
  );
}
