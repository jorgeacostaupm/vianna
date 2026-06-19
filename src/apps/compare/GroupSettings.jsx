import React, { useMemo } from "react";
import { Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";

import AnalysisSelectField from "@/components/ui/AnalysisSelectField";
import useSelectionRows from "@/hooks/useSelectionRows";
import {
  selectCategoricalVars,
  selectCompareAnalysisContext,
} from "@/store/features/main";
import { setGroupVar } from "@/store/features/compare";
import panelStyles from "@/styles/SettingsPanel.module.css";
import statsStyles from "@/styles/modules/analysisPanels.module.css";
import { getDistinctValueCount } from "@/utils/dataSummary";
import { uniqueColumns } from "@/utils/viewRecords";

const { Text } = Typography;

const formatValue = (value) => value || "Not set";

export default function GroupSettings({ disabled = false }) {
  const dispatch = useDispatch();
  const categoricalVars = useSelector(selectCategoricalVars);
  const attributes = useSelector((state) => state.metadata.attributes);
  const { idVar, groupVar, localGroupVar } = useSelector(
    selectCompareAnalysisContext,
  );
  const selectionColumns = useMemo(
    () => uniqueColumns([groupVar, idVar]),
    [groupVar, idVar],
  );
  const rows = useSelectionRows(selectionColumns);

  const selectedAttribute = useMemo(
    () => attributes?.find((attr) => attr?.name === groupVar),
    [attributes, groupVar],
  );

  const stats = useMemo(
    () => ({
      groups: getDistinctValueCount(rows, groupVar),
      subjects: getDistinctValueCount(rows, idVar),
    }),
    [rows, groupVar, idVar],
  );

  const description =
    typeof selectedAttribute?.description === "string"
      ? selectedAttribute.description.trim()
      : "";

  return (
    <>
      <AnalysisSelectField
        label="Group variable"
        value={localGroupVar ?? undefined}
        onChange={(value) => dispatch(setGroupVar(value ?? null))}
        placeholder={`Default: ${formatValue(groupVar)}`}
        options={categoricalVars}
        allowClear
        disabled={disabled}
      />
      <div className={statsStyles.contextStatsBox}>
        <div className={statsStyles.contextStatsRow}>
          <span className={statsStyles.contextStatsLabel}>Current variable</span>
          <span className={statsStyles.contextStatsValue}>
            {formatValue(groupVar)}
          </span>
        </div>
        <div className={statsStyles.contextStatsRow}>
          <span className={statsStyles.contextStatsLabel}>Groups</span>
          <span className={statsStyles.contextStatsValue}>
            {groupVar ? (stats.groups ?? 0) : "Not set"}
          </span>
        </div>
        {idVar ? (
          <div className={statsStyles.contextStatsRow}>
            <span className={statsStyles.contextStatsLabel}>Subjects</span>
            <span className={statsStyles.contextStatsValue}>
              {stats.subjects ?? 0}
            </span>
          </div>
        ) : null}
      </div>
      {description ? (
        <Text className={panelStyles.helper}>{description}</Text>
      ) : null}
    </>
  );
}
