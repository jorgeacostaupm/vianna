import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDropzone } from "react-dropzone";
import { UploadOutlined } from "@ant-design/icons";

import { FileProcessorFactory } from "./drag";
import styles from "../Data.module.css";
import { updateHierarchy } from "@/store/features/metadata";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { notifyError, notifyWarning } from "@/components/notifications";

const ACCEPTED_FORMATS = {
  "application/json": [".json"],
};

export default function DragAndDropHierarchy() {
  const dispatch = useDispatch();
  const [filename, setFilename] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const loading = useSelector((state) => state.metadata.loadingHierarchy);
  const uploadDisabled = !parsedData || loading || isReadingFile;

  const executeUpload = () => {
    dispatch(
      updateHierarchy({
        filename,
        hierarchy: parsedData,
      }),
    );
  };

  const handleUpload = () => {
    if (!parsedData) return;
    executeUpload();
  };

  const handleFileDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles?.[0];

    if (!file || !(file instanceof File)) {
      notifyWarning({
        message: "Invalid file",
        description: "Select a valid JSON file to continue.",
      });
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    if (extension !== "json") {
      notifyWarning({
        message: "Only JSON files are allowed",
        description: "Upload a .json hierarchy file.",
      });
      return;
    }

    const reader = new FileReader();
    setIsReadingFile(true);

    reader.onload = () => {
      try {
        const processor = FileProcessorFactory.getProcessor(extension);
        processor.process(
          reader.result,
          (rows) => {
            setParsedData(rows);
            setFilename(file.name);
            setIsReadingFile(false);
          },
          (error) => {
            notifyError({
              message: "Could not read hierarchy file",
              error,
              fallback: "Hierarchy file could not be parsed.",
            });
            setIsReadingFile(false);
          },
        );
      } catch (error) {
        notifyError({
          message: "Could not process hierarchy file",
          error,
          fallback: "Hierarchy file processing failed.",
        });
        setIsReadingFile(false);
      }
    };

    reader.onerror = () => {
      notifyError({
        message: "Could not read hierarchy file",
        fallback: "The hierarchy file could not be read.",
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
        description: "Accepted format: .json",
      });
    },
  });

  return (
    <>
      <div
        {...getRootProps({
          className: `${styles.dropzone} ${styles.dataDropzone}`,
          "aria-label": "Upload hierarchy file",
        })}
      >
        <input {...getInputProps()} />
        <UploadOutlined />
        <span className={styles.dataDropLabel}>
          Choose a file or drag it here
        </span>
      </div>
      <div className={styles.dataDropHint}>
        <span className={styles.subtitle}>Accepted: .json</span>
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
          disabled={uploadDisabled}
          loading={loading}
          icon={<UploadOutlined />}
          shape="default"
        >
          Import
        </AppButton>
      </div>
    </>
  );
}
