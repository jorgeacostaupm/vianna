import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button, Tooltip } from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";

import { FileProcessorFactory } from "./drag";

import buttonStyles from "@/styles/Buttons.module.css";
import styles from "../Data.module.css";
import tests from "@/utils/tests";
import { notifyError, notifyWarning } from "@/notifications";

const ACCEPTED_FORMATS = ".json";

export default function DragAndDropTest() {
  const [filename, setFilename] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  const handleUpload = () => {
    if (parsedData) {
      tests.push(parsedData);
    }
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

    const reader = new FileReader();
    const extension = file.name.split(".").pop().toLowerCase();

    reader.onload = () => {
      try {
        const processor = FileProcessorFactory.getProcessor(extension);
        processor.process(reader.result, setParsedData, (error) => {
          notifyError({
            message: "Could not process file",
            error,
            fallback: "File parsing failed.",
          });
        });
        setFilename(file.name);
      } catch (error) {
        notifyError({
          message: "Could not process file",
          error,
          fallback: "File processing failed.",
        });
      }
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    maxFiles: 1,
    accept: ACCEPTED_FORMATS,
  });

  return (
    <>
      <div {...getRootProps({ className: styles.dropzone })}>
        <input {...getInputProps()} />
        {!isDragActive && (
          <div className={styles.dropContent}>
            {!filename && <PlusOutlined />}
            <span className={styles.text}>
              {filename || "Click or drop a file"}
            </span>
            {!filename && (
              <span className={styles.subtitle}>
                Accepted: {ACCEPTED_FORMATS}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <Tooltip title="Upload parsed data">
          <Button
            shape="circle"
            className={buttonStyles.barButton}
            onClick={handleUpload}
            disabled={!parsedData}
          >
            <UploadOutlined />
          </Button>
        </Tooltip>
      </div>
    </>
  );
}
