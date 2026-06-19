import { useSelector } from "react-redux";
import { Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import DragDropHierarchy from "../DragDrop/DragDropHierarchy";
import { generateFileName } from "@/utils/functions";
import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

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

const Info = () => {
  const filename = useSelector((state) => state.metadata.filename);
  const dt = useSelector((state) => state.metadata.attributes);
  const nodes = Array.isArray(dt) ? dt : [];
  const measurementCount = nodes.filter(
    (node) => node?.type !== "root" && node?.type !== "aggregation",
  ).length;
  const aggregationCount = nodes.filter(
    (node) => node?.type === "aggregation",
  ).length;
  const unknownCount = nodes.filter(
    (node) => node?.type !== "root" && node?.dtype === "determine",
  ).length;

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
            Nº Nodes:
          </Text>{" "}
          <Text type="secondary">{nodes.length}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nº Measurements:
          </Text>{" "}
          <Text type="secondary">{measurementCount}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nº Aggregations:
          </Text>{" "}
          <Text type="secondary">{aggregationCount}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Unknown Attributes:
          </Text>{" "}
          <Text type="secondary">{unknownCount}</Text>
        </div>
      </div>

      <div className={styles.exportButtonRow}>
        <AppButton
          preset={APP_BUTTON_PRESETS.ACTION}
          className={styles.primaryExportButton}
          onClick={() =>
            downloadTextFile({
              content: JSON.stringify(dt || [], null, 2),
              filename: `${generateFileName("hierarchy")}.json`,
              mimeType: "application/json;charset=utf-8;",
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
      <DragDropHierarchy />
    </div>
  );
};

export default function TabHierarchy() {
  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.tabSplit}>
        <Info />
        <UploadPanel />
      </div>
    </div>
  );
}
