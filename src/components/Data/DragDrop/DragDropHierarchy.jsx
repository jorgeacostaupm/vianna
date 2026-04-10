import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDropzone } from "react-dropzone";
import { Modal } from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";

import { FileProcessorFactory } from "./drag";
import styles from "../Data.module.css";
import { updateHierarchy } from "@/store/features/metadata";
import ColoredButton from "@/components/ui/ColoredButton";
import { notifyError, notifyWarning } from "@/notifications";

const ACCEPTED_FORMATS = {
  "application/json": [".json"],
};

export default function DragAndDropHierarchy() {
  const dispatch = useDispatch();
  const hierarchy = useSelector((state) => state.metadata.attributes) || [];
  const [filename, setFilename] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const loading = useSelector((state) => state.metadata.loadingHierarchy);

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

    const existingNodes = hierarchy.filter((node) => node?.type !== "root");
    Modal.confirm({
      title: "Replace current hierarchy?",
      content:
        existingNodes.length > 0
          ? `This action will replace the current hierarchy (${existingNodes.length} existing nodes).`
          : "This action will set the hierarchy from the uploaded file.",
      okText: "Replace hierarchy",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: executeUpload,
    });
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    maxFiles: 1,
    accept: ACCEPTED_FORMATS,
    onDropRejected: () => {
      notifyWarning({
        message: "Unsupported file",
        description: "Accepted format: .json",
      });
    },
  });

  return (
    <>
      <div {...getRootProps({ className: styles.dropzone })}>
        <input {...getInputProps()} />
        {!isDragActive && (
          <div className={styles.dropContent}>
            {!filename && <PlusOutlined />}
            <span className={styles.text}>
              {isReadingFile
                ? "Reading file..."
                : filename || "Click or drop a JSON file"}
            </span>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <ColoredButton
          onClick={handleUpload}
          disabled={!parsedData || loading || isReadingFile}
          loading={loading}
          icon={<UploadOutlined />}
          shape="default"
        >
          Upload Hierarchy
        </ColoredButton>
      </div>
    </>
  );
}
