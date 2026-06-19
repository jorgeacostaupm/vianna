import React, { useMemo } from "react";
import { FileTextOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";

import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { ORDER_VARIABLE } from "@/utils/constants";
import { generateFileName } from "@/utils/functions";
import { toCsv } from "@/utils/csv";
import {
  normalizeOrderValues,
  sortRowsByOrderVariable,
  uniqueColumns,
} from "@/utils/viewRecords";

export default function ViewRecordsDownloadButton({
  filename = "records",
  recordOrders = [],
  requiredVariables = [],
}) {
  const fullData = useSelector((state) => state.dataframe.dataframe);
  const normalizedOrders = useMemo(
    () => normalizeOrderValues(recordOrders),
    [recordOrders],
  );

  const rowsByOrder = useMemo(() => {
    const map = new Map();
    (Array.isArray(fullData) ? fullData : []).forEach((row) => {
      const orderValue = row?.[ORDER_VARIABLE];
      if (
        orderValue === null ||
        orderValue === undefined ||
        map.has(orderValue)
      ) {
        return;
      }
      map.set(orderValue, row);
    });
    return map;
  }, [fullData]);

  const rows = useMemo(() => {
    const matched = normalizedOrders
      .map((orderValue) => rowsByOrder.get(orderValue))
      .filter(Boolean);

    return sortRowsByOrderVariable(matched);
  }, [normalizedOrders, rowsByOrder]);

  const disabled = rows.length === 0;
  const downloadRecords = () => {
    const columns = resolveColumns({ rows, requiredVariables });
    if (!columns.length) return;

    const csv = toCsv(rows, columns);
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = generateFileName(`${filename}_required`);
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <AppButton
      preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
      tooltip="Download view data"
      ariaLabel="Download view data"
      icon={<FileTextOutlined />}
      disabled={disabled}
      onClick={downloadRecords}
    />
  );
}

function resolveColumns({ rows, requiredVariables }) {
  if (!rows?.length) return [];

  const row = rows[0];

  const required = uniqueColumns(requiredVariables);
  const existing = required.filter((column) =>
    Object.prototype.hasOwnProperty.call(row, column),
  );
  const withOrder = [
    ORDER_VARIABLE,
    ...existing.filter((c) => c !== ORDER_VARIABLE),
  ];
  return uniqueColumns(withOrder);
}
