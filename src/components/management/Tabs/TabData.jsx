import React from "react";
import { useSelector } from "react-redux";
import { Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import DragDropData from "../DragDrop/DragDropData";
import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { generateFileName } from "@/utils/functions";

const { Title, Text } = Typography;

const escapeCsvCell = (value) => {
  const normalized = String(value ?? "");
  if (!/[",\n\r]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
};

const downloadTextFile = ({ content, filename, mimeType }) => {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
};

const buildCsv = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );
  return [
    keys.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      keys.map((key) => escapeCsvCell(row?.[key])).join(","),
    ),
  ].join("\n");
};

const isMissingValue = (value) =>
  value == null || (typeof value === "string" && value.trim() === "");

const Info = () => {
  const filename = useSelector((state) => state.dataframe.filename);
  const dt = useSelector((state) => state.dataframe.dataframe);
  const columns = Array.isArray(dt)
    ? Array.from(
        dt.reduce((set, row) => {
          Object.keys(row || {}).forEach((key) => set.add(key));
          return set;
        }, new Set()),
      )
    : [];
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
            File Name:
          </Text>{" "}
          <Text type="secondary">{filename ? filename : "—"}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nº Rows:
          </Text>{" "}
          <Text type="secondary">{dt?.length || 0}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nº Columns:
          </Text>{" "}
          <Text type="secondary">{columnCount}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Missing Values:
          </Text>{" "}
          <Text type="secondary">{missingValues}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Missing %:
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
              content: buildCsv(dt),
              filename: `${generateFileName("data")}.csv`,
              mimeType: "text/csv;charset=utf-8;",
            })
          }
          disabled={!Array.isArray(dt) || dt.length === 0}
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
