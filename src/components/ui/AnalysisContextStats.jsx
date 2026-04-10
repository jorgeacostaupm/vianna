import React, { useMemo } from "react";
import { useSelector } from "react-redux";

import styles from "@/styles/App.module.css";
import { getDistinctValueCount } from "@/utils/dataSummary";

const buildLabel = (baseLabel, variable) =>
  variable ? `${baseLabel} (${variable})` : baseLabel;

const formatCount = (count, variable) =>
  variable ? String(count ?? 0) : "Not set";

const APP_STATS_VISIBILITY = {
  comparison: { visits: false },
  correlation: { visits: false },
  evolution: { visits: true },
};

export default function AnalysisContextStats({
  app = "default",
  groupVar = null,
  timeVar = null,
  idVar = null,
  visibleStats = {},
}) {
  const selection = useSelector((state) => state.dataframe.selection);
  const dataframe = useSelector((state) => state.dataframe.dataframe);
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

  const appVisibleStats = APP_STATS_VISIBILITY[app] || {};
  const shouldShow = {
    selectedRecords: true,
    groups: true,
    visits: true,
    subjects: true,
    ...appVisibleStats,
    ...visibleStats,
  };

  return (
    <div className={styles.contextStatsBox}>
      {shouldShow.selectedRecords ? (
        <div className={styles.contextStatsRow}>
          <span className={styles.contextStatsLabel}>Selected records</span>
          <span className={styles.contextStatsValue}>
            {selectedRecords.toLocaleString("en-US")}
          </span>
        </div>
      ) : null}

      {shouldShow.groups ? (
        <div className={styles.contextStatsRow}>
          <span className={styles.contextStatsLabel}>
            {buildLabel("Groups", groupVar)}
          </span>
          <span className={styles.contextStatsValue}>
            {formatCount(stats.groups, groupVar)}
          </span>
        </div>
      ) : null}

      {shouldShow.visits ? (
        <div className={styles.contextStatsRow}>
          <span className={styles.contextStatsLabel}>
            {buildLabel("Visits", timeVar)}
          </span>
          <span className={styles.contextStatsValue}>
            {formatCount(stats.visits, timeVar)}
          </span>
        </div>
      ) : null}

      {shouldShow.subjects ? (
        <div className={styles.contextStatsRow}>
          <span className={styles.contextStatsLabel}>
            {buildLabel("Subjects", idVar)}
          </span>
          <span className={styles.contextStatsValue}>
            {formatCount(stats.subjects, idVar)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
