import React from "react";
import { useSelector } from "react-redux";
import { Typography, Divider } from "antd";

import DragDropDesc from "../DragDrop/DragDropDesc";
import { selectDescribedNodes } from "@/store/features/metadata";
import styles from "../Data.module.css";

const { Title, Text } = Typography;
const formatPreview = (arr, max = 12) => {
  if (!arr || arr.length === 0) return "—";
  const preview = arr.slice(0, max);
  const remaining = arr.length - preview.length;
  return remaining > 0
    ? `${preview.join(", ")} (+${remaining} more)`
    : preview.join(", ");
};

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

  return (
    <div className={styles.tabColumn}>
      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Metadata
      </Title>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          File Name:
        </Text>{" "}
        <Text type="secondary">{filename ? filename : "—"}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Nº Descriptions:
        </Text>{" "}
        <Text type="secondary">{attributes.length}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Measurements with description:
        </Text>{" "}
        <Text type="secondary">{formatPreview([...attributes].sort())}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Missing descriptions:
        </Text>{" "}
        <Text type="secondary">{formatPreview(missing.sort())}</Text>
      </div>

    </div>
  );
};

const UploadDesc = () => {
  return (
    <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
      <Title
        level={4}
        style={{ marginBottom: 4, color: "var(--primary-color)" }}
      >
        Upload Descriptions
      </Title>
      <Text type="secondary">
        Each row maps a measurement name to its description.
      </Text>
      <DragDropDesc />

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Expected File
      </Title>
      <div>
        <Text type="secondary">
          Upload a CSV with headers `name` and `description`.
        </Text>
      </div>
      <div>
        <Text type="secondary">
          `name` must match the measurement names in your data.
        </Text>
      </div>
      <div>
        <Text type="secondary">
          One row per measurement is recommended; if a measurement appears
          multiple times, the last one takes priority.
        </Text>
      </div>
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
