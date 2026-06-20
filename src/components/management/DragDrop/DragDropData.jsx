import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Switch, Tooltip, Typography } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import FileImportDropzone from "./FileImportDropzone";
import { FileProcessorFactory } from "./drag";
import { updateData } from "@/store/features/dataframe";
import styles from "../Data.module.css";
import { notifyError, notifyWarning } from "@/components/notifications";

const { Text } = Typography;

const ACCEPTED_FORMATS = {
  "text/csv": [".csv"],
  "text/tab-separated-values": [".tsv"],
  "text/plain": [".txt"],
  "application/json": [".json"],
};

export default function DragDropData() {
  const dispatch = useDispatch();

  const [filename, setFilename] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [generateHierarchy, setGenerateHierarchy] = useState(true);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const isUploading = useSelector((state) => state.dataframe.loadingDataUpload);

  const handleUpload = async () => {
    if (!parsedData) return;

    try {
      await dispatch(
        updateData({
          filename,
          data: parsedData,
          isGenerateHierarchy: generateHierarchy,
        }),
      ).unwrap();
    } catch (error) {
      notifyError({
        message: "Could not upload data",
        error,
        fallback: "Data upload failed. Verify file format and content.",
      });
    }
  };

  const handleFileDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles?.[0];

    if (!file || !(file instanceof File)) {
      notifyWarning({
        message: "Invalid file",
        description: "Select a valid file to continue.",
      });
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();

    const allowedExtensions = ["csv", "tsv", "txt", "json"];
    if (!allowedExtensions.includes(extension)) {
      notifyWarning({
        message: "File type not allowed",
        description: "Accepted formats: .csv, .tsv, .txt, .json",
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
              message: "Could not read file",
              error,
              fallback: "The file content could not be parsed.",
            });
            setIsReadingFile(false);
          },
        );
      } catch (error) {
        notifyError({
          message: "Could not process file",
          error,
          fallback: "File processing failed.",
        });
        setIsReadingFile(false);
      }
    };

    reader.onerror = () => {
      notifyError({
        message: "Could not read file",
        fallback: "The file could not be read.",
      });
      setIsReadingFile(false);
    };

    reader.readAsText(file);
  }, []);

  return (
    <FileImportDropzone
      accept={ACCEPTED_FORMATS}
      onDrop={handleFileDrop}
      ariaLabel="Upload data file"
      acceptedLabel="Accepted: .csv, .tsv, .txt, .json"
      rejectedDescription="Accepted formats: .csv, .tsv, .txt, .json"
      filename={filename}
      isReadingFile={isReadingFile}
      onUpload={handleUpload}
      disabled={!parsedData || isUploading || isReadingFile}
      loading={isUploading}
    >
      <div className={styles.switchRow}>
        <Text>Reset Hierarchy</Text>
        <Tooltip title="Start a new hierarchy">
          <Switch
            size="small"
            checked={generateHierarchy}
            onChange={setGenerateHierarchy}
            disabled={isUploading}
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
          />
        </Tooltip>
      </div>
    </FileImportDropzone>
  );
}
