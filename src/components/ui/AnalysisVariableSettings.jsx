import React, { useMemo } from "react";
import { Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";

import AnalysisSelectField from "@/components/ui/AnalysisSelectField";
import useSelectionRows from "@/hooks/useSelectionRows";
import {
  selectCategoricalVars,
  selectNavioVars,
} from "@/store/features/main";
import styles from "@/styles/modules/analysisPanels.module.css";
import panelStyles from "@/styles/SettingsPanel.module.css";
import { getDistinctValueCount } from "@/utils/dataSummary";
import { uniqueColumns } from "@/utils/viewRecords";

const { Text } = Typography;

const FIELD_LABELS = {
  idVar: "ID variable",
  groupVar: "Group variable",
  timeVar: "Time variable",
};

const STAT_LABELS = {
  idVar: "Subjects",
  groupVar: "Groups",
  timeVar: "Time points",
};

const formatValue = (value) => value || "Not set";

export default function AnalysisVariableSettings({
  context,
  actions,
  fields,
  renderFieldExtra,
}) {
  const dispatch = useDispatch();
  const categoricalVars = useSelector(selectCategoricalVars);
  const navioVars = useSelector(selectNavioVars);
  const attributes = useSelector((state) => state.metadata.attributes);
  const activeColumns = useMemo(
    () => uniqueColumns(fields.map((field) => context?.[field])),
    [fields, context],
  );
  const rows = useSelectionRows(activeColumns);

  return (
    <>
      {fields.map((field) => {
        const action = actions?.[field];
        if (!action) return null;

        const effectiveValue = context?.[field] ?? null;
        const localValue =
          context?.[`local${field[0].toUpperCase()}${field.slice(1)}`] ?? null;
        const options = field === "groupVar" ? categoricalVars : navioVars;
        const rawDescription = attributes?.find(
          (attr) => attr?.name === effectiveValue,
        )?.description;
        const description =
          typeof rawDescription === "string" ? rawDescription.trim() : "";
        const count = getDistinctValueCount(rows, effectiveValue);

        return (
          <div className={panelStyles.rowStack} key={field}>
            <AnalysisSelectField
              label={FIELD_LABELS[field] || field}
              value={localValue ?? undefined}
              onChange={(value) => dispatch(action(value ?? null))}
              placeholder={`Default: ${formatValue(effectiveValue)}`}
              options={options}
              allowClear
              extra={renderFieldExtra?.(field, context) ?? null}
            />
            <div className={styles.contextStatsBox}>
              <div className={styles.contextStatsRow}>
                <span className={styles.contextStatsLabel}>Current variable</span>
                <span className={styles.contextStatsValue}>
                  {formatValue(effectiveValue)}
                </span>
              </div>
              {effectiveValue ? (
                <div className={styles.contextStatsRow}>
                  <span className={styles.contextStatsLabel}>
                    {STAT_LABELS[field] || "Values"}
                  </span>
                  <span className={styles.contextStatsValue}>
                    {count ?? 0}
                  </span>
                </div>
              ) : null}
            </div>
            {description ? (
              <Text className={panelStyles.helper}>{description}</Text>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
