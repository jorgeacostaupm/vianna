import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select, Typography, Divider } from "antd";
import DragDropData from "../DragDrop/DragDropData";
import NullifyValuesPanel from "../NullifyValuesPanel";
import { setIdVar } from "@/store/slices/cantabSlice";
import {
  selectNavioVars,
  selectCategoricalVars,
  selectNumericVars,
  selectUnkownVars,
} from "@/store/slices/cantabSlice";
import {
  getColumnValueCounts,
  getDistinctValueCount,
} from "@/utils/dataSummary";
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
  const filename = useSelector((state) => state.dataframe.present.filename);
  const dt = useSelector((state) => state.dataframe.present.dataframe);
  const vars = useSelector(selectNavioVars);
  const numericVars = useSelector(selectNumericVars);
  const categoricalVars = useSelector(selectCategoricalVars);
  const unknownVars = useSelector(selectUnkownVars);

  return (
    <div className={styles.tabColumn}>
      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Metadata
      </Title>
      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          File Name:
        </Text>{" "}
        <Text>{filename ? filename : "—"}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Nº Rows:
        </Text>{" "}
        <Text>{dt?.length || 0}</Text>
      </div>

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Summary
      </Title>
      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Numeric:
        </Text>{" "}
        <Text>{numericVars?.length || 0}</Text>
      </div>
      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Categorical:
        </Text>{" "}
        <Text>{categoricalVars?.length || 0}</Text>
      </div>
      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Unknown:
        </Text>{" "}
        <Text>{unknownVars?.length || 0}</Text>
      </div>
      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Visible measurements:
        </Text>{" "}
        <Text>{formatPreview(vars)}</Text>
      </div>
      <Divider style={{ margin: "0.75rem 0" }} />
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

const UploadPanel = () => {
  const dispatch = useDispatch();
  const idVar = useSelector((state) => state.cantab.present.idVar);
  const vars = useSelector(selectNavioVars);
  const selection = useSelector((state) => state.dataframe.present.selection);
  const dataframe = useSelector((state) => state.dataframe.present.dataframe);
  const rows = Array.isArray(selection)
    ? selection
    : Array.isArray(dataframe)
      ? dataframe
      : [];

  const idValueCounts = useMemo(
    () => getColumnValueCounts(rows, idVar),
    [rows, idVar],
  );
  const subjectCount = useMemo(
    () => getDistinctValueCount(rows, idVar) ?? 0,
    [rows, idVar],
  );
  const repeatedIdsCount = useMemo(
    () => idValueCounts.filter((item) => !item.isMissing && item.count > 1).length,
    [idValueCounts],
  );

  const handleChange = useCallback(
    (setter) => (value) => dispatch(setter(value)),
    [dispatch],
  );

  return (
    <div
      className={`${styles.tabColumn} ${styles.tabColumnWithDivider} ${styles.tabColumnScrollable}`}
    >
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

      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Configuration Measurements
      </Title>
      <Text type="secondary">
        Set the unique identifier used across analysis views.
      </Text>

      {[
        ["ID measurement", idVar, setIdVar],
      ].map(([label, value, setter]) => (
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

      <div className={styles.idFrequencyBlock}>
        {!idVar ? (
          <Text type="secondary">
            Select an ID measurement to display subject frequencies.
          </Text>
        ) : (
          <>
            <div className={styles.idFrequencyMeta}>
              <Text type="secondary">
                Subjects (unique IDs): <Text strong>{subjectCount}</Text>
              </Text>
              <Text type="secondary">
                Repeated IDs: <Text strong>{repeatedIdsCount}</Text>
              </Text>
            </div>

            <div className={styles.idFrequencyList}>
              {idValueCounts.length === 0 ? (
                <Text type="secondary">
                  No values found for the selected ID column.
                </Text>
              ) : (
                idValueCounts.map((item) => (
                  <div
                    key={`${item.value}-${item.isMissing ? "missing" : "value"}`}
                    className={styles.idFrequencyRow}
                  >
                    <Text
                      className={styles.idFrequencyValue}
                      ellipsis={{ tooltip: item.value }}
                    >
                      {item.value}
                    </Text>
                    <Text strong>{item.count}</Text>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={4} style={{ marginBottom: 4, color: "var(--primary-color)" }}>
        Nullify Values
      </Title>
      <Text type="secondary">
        Replace exact values with null across Explorer and Quarantine.
      </Text>
      <NullifyValuesPanel />
    </div>
  );
};

export default function TabData() {
  return (
    <div className={styles.tabSplit}>
      <Info />
      <UploadPanel />
    </div>
  );
}
