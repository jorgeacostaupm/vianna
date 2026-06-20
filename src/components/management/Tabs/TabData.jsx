import { useSelector } from "react-redux";
import { Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import DragDropData from "../DragDrop/DragDropData";
import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { generateFileName } from "@/utils/functions";
import { getRowColumns, toCsv } from "@/utils/csv";

const { Title, Text } = Typography;

const downloadTextFile = ({ content, filename, mimeType }) => {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
};

const isMissingValue = (value) =>
  value == null || (typeof value === "string" && value.trim() === "");

const Info = () => {
  const filename = useSelector((state) => state.dataframe.filename);
  const dt = useSelector((state) => state.dataframe.dataframe);
  const columns = getRowColumns(dt);
  const columnCount = columns.length;
  const missingValues = Array.isArray(dt)
    ? dt.reduce(
        (total, row) =>
          total +
          columns.reduce(
            (count, column) => count + (isMissingValue(row?.[column]) ? 1 : 0),
            0,
          ),
        0,
      )
    : 0;
  const cellCount = (dt?.length || 0) * columnCount;
  const missingPercent = cellCount
    ? `${((missingValues / cellCount) * 100).toFixed(1)}%`
    : "0%";

  return (
    <div className={styles.tabColumn}>
      <Title level={5} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Current
      </Title>
      <div className={styles.dataStats}>
        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            File:
          </Text>{" "}
          <Text type="secondary">{filename ? filename : "—"}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Rows:
          </Text>{" "}
          <Text type="secondary">{dt?.length || 0}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Columns:
          </Text>{" "}
          <Text type="secondary">{columnCount}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Missing values:
          </Text>{" "}
          <Text type="secondary">{missingValues}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Missing values (%):
          </Text>{" "}
          <Text type="secondary">{missingPercent}</Text>
        </div>
      </div>

      <div className={styles.exportButtonRow}>
        <AppButton
          preset={APP_BUTTON_PRESETS.ACTION}
          className={styles.primaryExportButton}
          onClick={() =>
            downloadTextFile({
              content: toCsv(dt, columns),
              filename: `${generateFileName("data")}.csv`,
              mimeType: "text/csv;charset=utf-8;",
            })
          }
          disabled={!Array.isArray(dt) || dt.length === 0}
          icon={<DownloadOutlined />}
          shape="default"
        >
          Export data
        </AppButton>
      </div>
    </div>
  );
};

const UploadPanel = () => {
  return (
    <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Import
      </Title>
      <DragDropData />
    </div>
  );
};

export default function TabData() {
  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.tabSplit}>
        <Info />
        <UploadPanel />
      </div>
    </div>
  );
}
