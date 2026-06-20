import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import FileImportDropzone from "./FileImportDropzone";
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

  return (
    <FileImportDropzone
      accept={ACCEPTED_FORMATS}
      onDrop={handleFileDrop}
      ariaLabel="Upload descriptions file"
      acceptedLabel="Accepted: .csv, .json"
      rejectedDescription="Accepted formats: .csv, .json"
      filename={filename}
      isReadingFile={isReadingFile}
      onUpload={handleUpload}
      disabled={!parsedData || isUploading || isReadingFile}
      loading={isUploading}
    />
  );
}
