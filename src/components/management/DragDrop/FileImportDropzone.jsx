import { useDropzone } from "react-dropzone";
import { UploadOutlined } from "@ant-design/icons";

import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { notifyWarning } from "@/components/notifications";

export default function FileImportDropzone({
  accept,
  onDrop,
  ariaLabel,
  acceptedLabel,
  rejectedDescription,
  filename,
  isReadingFile = false,
  loading = false,
  disabled = false,
  onUpload,
  buttonLabel = "Import",
  children,
}) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept,
    multiple: false,
    onDropRejected: () => {
      notifyWarning({
        message: "Unsupported file",
        description: rejectedDescription,
      });
    },
  });

  return (
    <>
      <div
        {...getRootProps({
          className: `${styles.dropzone} ${styles.dataDropzone}`,
          "aria-label": ariaLabel,
        })}
      >
        <input {...getInputProps()} />
        <UploadOutlined />
        <span className={styles.dataDropLabel}>
          Choose a file or drag it here
        </span>
      </div>
      <div className={styles.dataDropHint}>
        <span className={styles.subtitle}>{acceptedLabel}</span>
        {(isReadingFile || filename) && (
          <span className={styles.text}>
            {isReadingFile ? "Reading file..." : filename}
          </span>
        )}
      </div>

      <div className={`${styles.controls} ${styles.dataImportControls}`}>
        {children}
        <AppButton
          preset={APP_BUTTON_PRESETS.ACTION}
          onClick={onUpload}
          disabled={disabled}
          loading={loading}
          icon={<UploadOutlined />}
          shape="default"
        >
          {buttonLabel}
        </AppButton>
      </div>
    </>
  );
}
