import { useSelector } from "react-redux";
import { Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

import DragDropDesc from "../DragDrop/DragDropDesc";
import {
  selectAttributeDescriptionsByName,
  selectDescribedNodes,
} from "@/store/features/metadata";
import styles from "../Data.module.css";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { generateFileName } from "@/utils/functions";

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

const getExportableDescriptions = (descriptionsByName) =>
  Object.entries(descriptionsByName || {})
    .filter(([, description]) => {
      return typeof description === "string" && description.trim().length > 0;
    })
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));

const Info = () => {
  const filename = useSelector((state) => state.metadata.descriptionsFilename);
  const attributes = useSelector(selectDescribedNodes);
  const allAttributes = useSelector((state) => state.metadata.attributes) || [];
  const describedSet = new Set(attributes);
  const missing = Array.from(
    new Set(
      allAttributes
        .filter((attr) => attr.type !== "root")
        .map((attr) => attr.name),
    ),
  ).filter((name) => !describedSet.has(name));
  const totalCount = attributes.length + missing.length;
  const coverage = totalCount
    ? `${((attributes.length / totalCount) * 100).toFixed(1)}%`
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
            Descriptions:
          </Text>{" "}
          <Text type="secondary">{attributes.length}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Measurements:
          </Text>{" "}
          <Text type="secondary">{totalCount}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Missing descriptions:
          </Text>{" "}
          <Text type="secondary">{missing.length}</Text>
        </div>

        <div>
          <Text strong style={{ color: "var(--primary-color)" }}>
            Coverage:
          </Text>{" "}
          <Text type="secondary">{coverage}</Text>
        </div>
      </div>

      <ExportDescriptions />
    </div>
  );
};

const ExportDescriptions = () => {
  const descriptionsByName = useSelector(selectAttributeDescriptionsByName);
  const entries = getExportableDescriptions(descriptionsByName);
  const disabled = entries.length === 0;

  const handleExport = () => {
    const content = JSON.stringify(Object.fromEntries(entries), null, 2);

    downloadTextFile({
      content,
      filename: `${generateFileName("descriptions")}.json`,
      mimeType: "application/json;charset=utf-8;",
    });
  };

  return (
    <div className={styles.exportButtonRow}>
      <AppButton
        preset={APP_BUTTON_PRESETS.ACTION}
        className={styles.primaryExportButton}
        onClick={handleExport}
        disabled={disabled}
        icon={<DownloadOutlined />}
        shape="default"
      >
          Export descriptions
      </AppButton>
    </div>
  );
};

const UploadDesc = () => {
  return (
    <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Import
      </Title>
      <DragDropDesc />
    </div>
  );
};

export default function TabDescriptions() {
  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.tabSplit}>
        <Info />
        <UploadDesc />
      </div>
    </div>
  );
}
