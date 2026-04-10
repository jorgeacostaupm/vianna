import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select, Typography, Divider } from "antd";
import DragDropData from "../DragDrop/DragDropData";
import NullifyValuesPanel from "../NullifyValuesPanel";
import { setIdVar } from "@/store/features/main";
import { selectNavioVars } from "@/store/features/main";
import styles from "../Data.module.css";

const { Title, Text } = Typography;

const Info = () => {
  const dispatch = useDispatch();
  const idVar = useSelector((state) => state.main.idVar);
  const filename = useSelector((state) => state.dataframe.filename);
  const dt = useSelector((state) => state.dataframe.dataframe);
  const vars = useSelector(selectNavioVars);
  const handleChange = useCallback(
    (setter) => (value) => dispatch(setter(value)),
    [dispatch],
  );

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
          Nº Rows:
        </Text>{" "}
        <Text type="secondary">{dt?.length || 0}</Text>
      </div>

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        ID Attribute
      </Title>
      <Text type="secondary">
        Set the unique identifier used across analysis views.
      </Text>

      {[["ID measurement", idVar, setIdVar]].map(([label, value, setter]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text strong style={{ color: "var(--primary-color)" }}>
            {label}:
          </Text>
          <Select
            style={{ width: "60%", marginTop: 0 }}
            value={value}
            onChange={handleChange(setter)}
            placeholder={`Select ${label.toLowerCase()}`}
            options={vars.map((key) => ({ label: key, value: key }))}
          />
        </div>
      ))}

      <Divider style={{ margin: "1rem 0" }} />

      <Title
        level={4}
        style={{ marginBottom: 4, color: "var(--primary-color)" }}
      >
        Nullify Values
      </Title>
      <Text type="secondary">
        Replace exact values with null across Explorer and Quarantine.
      </Text>
      <NullifyValuesPanel />
    </div>
  );
};

const UploadPanel = () => {
  return (
    <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
      <Title
        level={4}
        style={{ marginBottom: 4, color: "var(--primary-color)" }}
      >
        Upload Data
      </Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Text type="secondary">
          Each column becomes a measurement. Types are detected automatically
          from the values.
        </Text>
      </div>

      <DragDropData />

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={5} style={{ margin: 0, color: "var(--primary-color)" }}>
        Expected File
      </Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Text type="secondary">
          Rows are observations and each field is a measurement.
        </Text>
        <Text type="secondary">
          For JSON, upload an array of objects and make sure every object shares
          the same keys.
        </Text>
        <Text type="secondary">
          Missing values can be left blank and will be treated as nulls.
        </Text>
      </div>
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
