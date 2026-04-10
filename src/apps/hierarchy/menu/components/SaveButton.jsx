import { useState } from "react";
import { useSelector } from "react-redux";
import { useFormikContext } from "formik";
import { Button } from "antd";
import { SaveOutlined, EyeOutlined } from "@ant-design/icons";
import * as aq from "arquero";

import processFormula from "@/utils/processFormula";
import { notifyError } from "@/notifications";
import AutoCloseTooltip from "@/components/ui/AutoCloseTooltip";
import buttonStyles from "@/styles/Buttons.module.css";

import {
  PREVIEW_LIMIT,
  PREVIEW_RESULT_COLUMN,
  PREVIEW_ROW_COLUMN,
} from "../nodeMenuConstants";
import { countValuesAtRisk, getFirstFormikError } from "../nodeMenuUtils";
import AggregationPreviewModal from "./AggregationPreviewModal";

const resolveColumnName = ({ values, initialValues, dataframe, quarantineData }) => {
  const availableNames = [values?.name, initialValues?.name].filter(Boolean);

  return (
    availableNames.find(
      (name) =>
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
    "this node"
  );
};

const buildAggregationPreview = ({ dataframe, values }) => {
  const sample = Array.isArray(dataframe) ? dataframe.slice(0, PREVIEW_LIMIT) : [];

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
        .map((attribute) => attribute?.name)
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

  return { columns, rows };
};

export default function SaveButton() {
  const {
    values,
    initialValues,
    isValid,
    isSubmitting,
    validateForm,
    submitForm,
  } = useFormikContext();
  const dataframe = useSelector((state) => state.dataframe.dataframe);
  const quarantineData = useSelector(
    (state) => state.main.quarantineData,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isAggregation = values?.type === "aggregation";
  const canPreview = Boolean(
    isAggregation && isValid && values?.info?.exec && values?.name,
  );
  const isSaveInProgress = isSaving || isSubmitting;

  const closePreview = () => {
    setPreviewOpen(false);
  };

  const handleSave = async () => {
    if (isSaveInProgress) return;

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
      const resolvedColumnName = resolveColumnName({
        values,
        initialValues,
        dataframe,
        quarantineData,
      });
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

    setIsSaving(true);
    try {
      // Let the spinner paint before potentially heavy work starts.
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      await submitForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewLoading(true);
    setPreviewError("");

    try {
      const { columns, rows } = buildAggregationPreview({ dataframe, values });
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
          disabled={isSaveInProgress}
          loading={isSaveInProgress}
          icon={<SaveOutlined />}
        ></Button>
      </AutoCloseTooltip>

      <AggregationPreviewModal
        open={previewOpen}
        onClose={closePreview}
        previewRows={previewRows}
        previewColumns={previewColumns}
        previewError={previewError}
      />
    </>
  );
}
