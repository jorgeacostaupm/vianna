import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import styles from "@/styles/App.module.css";
import { getDistinctValueCount } from "@/utils/dataSummary";

const buildLabel = (baseLabel, variable) =>
  variable ? `${baseLabel} (${variable})` : baseLabel;

const formatCount = (count, variable) =>
  variable ? String(count ?? 0) : "Not set";

export default function AnalysisContextStats({
  groupVar = null,
  timeVar = null,
  idVar = null,
}) {
  const selection = useSelector((state) => state.dataframe.present.selection);
  const dataframe = useSelector((state) => state.dataframe.present.dataframe);
  const selectedRecords = Array.isArray(selection)
    ? selection.length
    : Array.isArray(dataframe)
      ? dataframe.length
      : 0;
  const rows = Array.isArray(selection)
    ? selection
    : Array.isArray(dataframe)
      ? dataframe
      : [];

  const stats = useMemo(
    () => ({
      groups: getDistinctValueCount(rows, groupVar),
      visits: getDistinctValueCount(rows, timeVar),
      subjects: getDistinctValueCount(rows, idVar),
    }),
    [rows, groupVar, timeVar, idVar],
  );

  return (
    <div className={styles.contextStatsBox}>
      <div className={styles.contextStatsRow}>
        <span className={styles.contextStatsLabel}>Selected records</span>
        <span className={styles.contextStatsValue}>
          {selectedRecords.toLocaleString("en-US")}
        </span>
      </div>

      <div className={styles.contextStatsRow}>
        <span className={styles.contextStatsLabel}>
          {buildLabel("Groups", groupVar)}
        </span>
        <span className={styles.contextStatsValue}>
          {formatCount(stats.groups, groupVar)}
        </span>
      </div>

      <div className={styles.contextStatsRow}>
        <span className={styles.contextStatsLabel}>
          {buildLabel("Visits", timeVar)}
        </span>
        <span className={styles.contextStatsValue}>
          {formatCount(stats.visits, timeVar)}
        </span>
      </div>

      <div className={styles.contextStatsRow}>
        <span className={styles.contextStatsLabel}>
          {buildLabel("Subjects", idVar)}
        </span>
        <span className={styles.contextStatsValue}>
          {formatCount(stats.subjects, idVar)}
        </span>
      </div>
    </div>
  );
}
