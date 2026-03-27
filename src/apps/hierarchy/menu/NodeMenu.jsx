import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pubsub } from "@/utils/pubsub";
import { Formik, Form, useFormikContext, useField } from "formik";
import { Input, Typography, Button, Modal } from "antd";
import { SaveOutlined, EyeOutlined } from "@ant-design/icons";
import * as aq from "arquero";

import { updateAttribute } from "@/store/async/metaAsyncReducers";
import processFormula from "@/utils/processFormula";
import { notifyError } from "@/utils/notifications";

import { NodeBar } from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";
import buttonStyles from "@/styles/Buttons.module.css";

import { NodeSchema } from "./NodeValidation";
import NodeInfo from "./NodeInfo";
import NodeAggregationConfig from "./NodeAggregationConfig";
import CustomMeasure from "./aggregations/CustomMeasure";
import AutoCloseTooltip from "@/components/ui/AutoCloseTooltip";

const { Text } = Typography;
const { subscribe, unsubscribe } = pubsub;
const PREVIEW_LIMIT = 5;
const PREVIEW_RESULT_COLUMN = "__preview_result__";
const PREVIEW_ROW_COLUMN = "__preview_row__";
const VARIABLE_VALUES_LIMIT = 5;

const isEmptyNumericValue = (value) =>
  value === null || value === undefined || value === "";

const isValueAtRiskOnNumericCast = (value) =>
  !isEmptyNumericValue(value) && Number.isNaN(Number(value));

const countValuesAtRisk = (rows, columnName) => {
  if (!Array.isArray(rows) || !columnName) return 0;
  return rows.reduce(
    (count, row) => count + (isValueAtRiskOnNumericCast(row?.[columnName]) ? 1 : 0),
    0,
  );
};

const getFirstFormikError = (value) => {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = getFirstFormikError(item);
      if (msg) return msg;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      const msg = getFirstFormikError(nested);
      if (msg) return msg;
    }
  }
  return null;
};

const normalizePreviewValue = (value) => {
  if (value == null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const rowHasColumn = (row, columnName) =>
  Boolean(
    row &&
      columnName &&
      Object.prototype.hasOwnProperty.call(row, columnName),
  );

const resolveExistingColumnName = (columnCandidates = [], datasets = []) => {
  const candidates = columnCandidates.filter(Boolean);
  for (const columnName of candidates) {
    const exists = datasets.some(
      (rows) => Array.isArray(rows) && rows.some((row) => rowHasColumn(row, columnName)),
    );
    if (exists) return columnName;
  }
  return null;
};

const buildPreviewValueKey = (value) => {
  if (value == null) return "null";
  if (typeof value === "object") {
    try {
      return `object:${JSON.stringify(value)}`;
    } catch {
      return `object:${String(value)}`;
    }
  }
  return `${typeof value}:${String(value)}`;
};

const getVariableSampleValues = (rows = [], columnName, limit = VARIABLE_VALUES_LIMIT) => {
  if (!Array.isArray(rows) || !columnName || limit <= 0) return [];

  const values = [];
  const seen = new Set();

  for (const row of rows) {
    if (!rowHasColumn(row, columnName)) continue;
    const value = row[columnName];
    if (value === undefined) continue;
    const key = buildPreviewValueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= limit) break;
  }

  return values;
};

const NodeMenu = () => {
  const [node, setNode] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const [openMenu, toggleMenu] = useState(false);
  const attributes = useSelector((state) => state.metadata.attributes);
  const dataframe = useSelector((state) => state.dataframe.present.dataframe);
  const quarantineData = useSelector(
    (state) => state.cantab.present.quarantineData,
  );
  const attributesRef = useRef(attributes);

  const dispatch = useDispatch();

  const formRef = useRef(null);
  const resizeRef = useRef();

  useEffect(() => {
    setNode(() => attributes.find((n) => n.id === nodeId));
    attributesRef.current = attributes;
  }, [attributes]);

  useEffect(() => {
    const handleNodeInspection = ({ nodeId }) => {
      const attrs = attributesRef.current;
      const foundNode = attrs.find((n) => n.id === nodeId);
      setNode(foundNode);
      setNodeId(nodeId);
      toggleMenu(nodeId != null);
    };

    const handleToggleInspect = () => {
      toggleMenu((prev) => !prev);
    };

    const handleUntoggle = () => {
      toggleMenu(false);
    };

    subscribe("nodeInspectionNode", handleNodeInspection);
    subscribe("toggleInspectMenu", handleToggleInspect);
    subscribe("untoggleEvent", handleUntoggle);

    return () => {
      unsubscribe("nodeInspectionNode", handleNodeInspection);
      unsubscribe("toggleInspectMenu", handleToggleInspect);
      unsubscribe("untoggleEvent", handleUntoggle);
    };
  }, []);

  useEffect(() => {
    pubsub.publish("nodeMenuVisibilityChanged", { isOpen: openMenu });
  }, [openMenu]);

  useEffect(() => {
    const handleUnload = () => {
      formRef.current?.handleSubmit();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  if (node == null) {
    return;
  }

  const onSubmit = async (values, { setSubmitting }) => {
    try {
      await dispatch(updateAttribute({ ...values, recover: true })).unwrap();
    } finally {
      setSubmitting(false);
    }
  };

  const availableNodes = node.related
    .map((i) => {
      const n = attributes.find((n) => n.id === i);
      if (n == null) return null;
      const isUsed =
        node.info && node.info.usedAttributes.some((u) => u.id === n.id);
      return { id: n.id, name: n.name, weight: 1, used: isUsed };
    })
    .filter((n) => n != null);

  const closeTab = () => toggleMenu((prev) => !prev);

  return (
    openMenu && (
      <div className={styles.nodeInfo}>
        <NodeBar title={"Node Menu"} remove={closeTab}></NodeBar>
        <Formik
          innerRef={formRef}
          initialValues={node}
          onSubmit={onSubmit}
          validationSchema={NodeSchema}
          validateOnMount={true}
          enableReinitialize={true}
        >
          {({ values }) => {
            const previewColumn = resolveExistingColumnName(
              [values?.name, node?.name],
              [dataframe, quarantineData],
            );
            const previewValues = previewColumn
              ? getVariableSampleValues(dataframe, previewColumn, VARIABLE_VALUES_LIMIT)
              : [];

            return (
              <Form className={styles.nodeInfoBody} ref={resizeRef}>
                <NodeName />

                <NodeInfo
                  nChildren={availableNodes.length}
                  nodeType={node.type == null ? "root" : node.type}
                  nodeId={node.id}
                  DType={node.dtype}
                  height={node.height}
                />

                {node?.type === "attribute" ? (
                  <NodeVariablePreview
                    values={previewValues}
                    columnName={previewColumn}
                  />
                ) : null}

                <NodeDescriptionField />

                {values.type === "aggregation" ? (
                  availableNodes.length === 0 ? (
                    <CustomMeasure formula={values.info.formula}></CustomMeasure>
                  ) : (
                    <NodeAggregationConfig
                      aggOp={values.info.operation || "sum"}
                      nodes={availableNodes}
                      vals={values}
                      save={<SaveButton></SaveButton>}
                    />
                  )
                ) : (
                  <div
                    style={{ display: "flex", justifyContent: "center", gap: 12 }}
                  >
                    <SaveButton></SaveButton>
                  </div>
                )}
              </Form>
            );
          }}
        </Formik>
      </div>
    )
  );
};

export default NodeMenu;

export function SaveButton() {
  const {
    values,
    initialValues,
    isValid,
    isSubmitting,
    validateForm,
    submitForm,
  } = useFormikContext();
  const dataframe = useSelector((state) => state.dataframe.present.dataframe);
  const quarantineData = useSelector(
    (state) => state.cantab.present.quarantineData,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const isAggregation = values?.type === "aggregation";
  const canPreview = Boolean(
    isAggregation && isValid && values?.info?.exec && values?.name,
  );

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const handleSave = async () => {
    const errors = await validateForm();
    const firstError = getFirstFormikError(errors);

    if (firstError) {
      notifyError({
        message: "Could not save node",
        description: firstError,
        pauseOnHover: true,
      });
      return;
    }

    const isConvertingToNumeric =
      values?.dtype === "number" && initialValues?.dtype !== "number";

    if (isConvertingToNumeric) {
      const availableNames = [values?.name, initialValues?.name].filter(Boolean);
      const resolvedColumnName =
        availableNames.find((name) =>
          (Array.isArray(dataframe) &&
            dataframe.some((row) =>
              Object.prototype.hasOwnProperty.call(row || {}, name),
            )) ||
          (Array.isArray(quarantineData) &&
            quarantineData.some((row) =>
              Object.prototype.hasOwnProperty.call(row || {}, name),
            )),
        ) ||
        values?.name ||
        initialValues?.name ||
        "this node";

      const riskCount =
        countValuesAtRisk(dataframe, resolvedColumnName) +
        countValuesAtRisk(quarantineData, resolvedColumnName);

      const proceed = window.confirm(
        `Converting "${resolvedColumnName}" to numeric may cause data loss.\n` +
          `${riskCount} item(s) are at risk of being lost.\n` +
          `Non-numeric values will be replaced with null.\n\n` +
          `Do you want to continue?`,
      );
      if (!proceed) return;
    }

    await submitForm();
  };

  const handlePreview = () => {
    setPreviewLoading(true);
    setPreviewError("");

    try {
      const sample = Array.isArray(dataframe)
        ? dataframe.slice(0, PREVIEW_LIMIT)
        : [];

      if (sample.length === 0) {
        throw new Error("No rows available in the dataset.");
      }

      if (!values?.info?.exec) {
        throw new Error("Aggregation formula is not ready yet.");
      }

      const table = aq.from(sample);
      const derivedFn = processFormula(table, values.info.exec);
      const derivedRows = table
        .derive({ [PREVIEW_RESULT_COLUMN]: derivedFn }, { drop: false })
        .objects();

      const sourceColumns = [
        ...new Set(
          (values?.info?.usedAttributes || [])
            .map((attr) => attr?.name)
            .filter(Boolean),
        ),
      ];
      const resultColumn = values.name || "Result";
      const columns = [PREVIEW_ROW_COLUMN, ...sourceColumns, resultColumn];
      const rows = derivedRows.map((row, index) => {
        const previewRow = {
          [PREVIEW_ROW_COLUMN]: index + 1,
          [resultColumn]: row[PREVIEW_RESULT_COLUMN],
        };

        sourceColumns.forEach((column) => {
          previewRow[column] = row[column];
        });

        return previewRow;
      });

      setPreviewColumns(columns);
      setPreviewRows(rows);
      setPreviewOpen(true);
    } catch (error) {
      setPreviewRows([]);
      setPreviewColumns([]);
      setPreviewError(error?.message || "Failed to compute preview.");
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <>
      <>
        {isAggregation ? (
          <AutoCloseTooltip title={`Preview ${PREVIEW_LIMIT} rows`}>
            <Button
              shape="circle"
              size="large"
              className={buttonStyles.coloredButton}
              onClick={handlePreview}
              disabled={!canPreview}
              loading={previewLoading}
              icon={<EyeOutlined />}
            ></Button>
          </AutoCloseTooltip>
        ) : null}
        <AutoCloseTooltip title="Save">
          <Button
            shape="circle"
            size="large"
            className={buttonStyles.coloredButton}
            onClick={handleSave}
            disabled={isSubmitting}
            loading={isSubmitting}
            icon={<SaveOutlined />}
          ></Button>
        </AutoCloseTooltip>
      </>

      <Modal
        title={`Aggregation Preview (first ${PREVIEW_LIMIT} rows)`}
        open={previewOpen}
        onCancel={closePreview}
        footer={null}
        destroyOnClose
      >
        {previewError ? (
          <Text type="danger">{previewError}</Text>
        ) : previewRows.length === 0 ? (
          <Text type="secondary">No preview rows available.</Text>
        ) : (
          <div
            style={{
              maxHeight: 280,
              overflow: "auto",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {previewColumns.map((column) => (
                    <th
                      key={column}
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "var(--color-surface-muted)",
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--color-border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {column === PREVIEW_ROW_COLUMN ? "#" : column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={`preview-row-${rowIndex}`}>
                    {previewColumns.map((column) => (
                      <td
                        key={`${column}-${rowIndex}`}
                        style={{
                          padding: "6px 8px",
                          borderBottom: "1px solid var(--color-border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {normalizePreviewValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
          This preview does not save anything and runs only on the first{" "}
          {PREVIEW_LIMIT} rows.
        </Text>
      </Modal>
    </>
  );
}

const NodeName = () => {
  const [field] = useField("name");
  const { errors } = useFormikContext();

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Text strong>Name:</Text>
        <Input
          id="name"
          {...field}
          style={{
            padding: "5px",
            flex: 1,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-evenly",
          color: "red",
        }}
      >
        {errors?.name}
      </div>
    </>
  );
};
function NodeDescriptionField() {
  const [field, , helpers] = useField("desc");

  function onChange(e) {
    const value = e.target.value;
    helpers.setValue(value);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Text strong>Description:</Text>
      <Input.TextArea
        id="desc"
        {...field}
        rows={4}
        onChange={onChange}
        value={field.value}
      />
    </div>
  );
}

function NodeVariablePreview({ values = [], columnName }) {
  if (!columnName) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Text strong>Sample values:</Text>
        <Text type="secondary">No data found for this variable.</Text>
      </div>
    );
  }

  if (!values.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Text strong>Sample values:</Text>
        <Text type="secondary">No values available for this variable.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Text strong>Sample values ({VARIABLE_VALUES_LIMIT}):</Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.map((value, index) => (
          <Text code key={`${normalizePreviewValue(value)}-${index}`}>
            {normalizePreviewValue(value)}
          </Text>
        ))}
      </div>
    </div>
  );
}
