import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "antd";
import { TableOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";

import BarButton from "@/components/ui/BarButton";
import { selectNavioVars } from "@/store/features/main";
import { ORDER_VARIABLE } from "@/utils/Constants";
import { generateFileName } from "@/utils/functions";
import { getViewOverlayPosition } from "@/components/ui/popupPosition";
import {
  normalizeOrderValues,
  sortRowsByOrderVariable,
  uniqueColumns,
} from "@/utils/viewRecords";
import styles from "@/components/ui/DownloadButton.module.css";

const EXPORT_MODES = [
  { key: "visible", label: "Visible variables" },
  { key: "all", label: "All variables" },
  { key: "required", label: "Required variables" },
];

export default function ViewRecordsDownloadButton({
  filename = "records",
  recordOrders = [],
  requiredVariables = [],
}) {
  const [open, setOpen] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState(undefined);
  const [isFixedOverlay, setIsFixedOverlay] = useState(false);
  const triggerRef = useRef(null);

  const fullData = useSelector((state) => state.dataframe.dataframe);
  const visibleVariables = useSelector(selectNavioVars);
  const normalizedOrders = useMemo(
    () => normalizeOrderValues(recordOrders),
    [recordOrders],
  );

  const rowsByOrder = useMemo(() => {
    const map = new Map();
    (Array.isArray(fullData) ? fullData : []).forEach((row) => {
      const orderValue = row?.[ORDER_VARIABLE];
      if (orderValue === null || orderValue === undefined || map.has(orderValue)) {
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

  const updateOverlayPosition = useCallback(() => {
    const position = getViewOverlayPosition(triggerRef.current);
    setOverlayStyle(position || undefined);
    setIsFixedOverlay(Boolean(position));
  }, []);

  useEffect(() => {
    if (!open || !isFixedOverlay) return undefined;

    const updatePosition = () => updateOverlayPosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isFixedOverlay, updateOverlayPosition]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) updateOverlayPosition();
    setOpen(nextOpen);
  };

  const onMenuClick = ({ key }) => {
    const columns = resolveColumns({
      mode: key,
      rows,
      visibleVariables,
      requiredVariables,
    });
    if (!columns.length) return;

    const csv = buildCsv(rows, columns);
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = generateFileName(`${filename}_${key}`);
    link.click();
    URL.revokeObjectURL(href);
  };

  const menu = {
    items: EXPORT_MODES,
    onClick: onMenuClick,
  };

  return (
    <Dropdown
      menu={menu}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      trigger={["click"]}
      disabled={disabled}
      overlayClassName={isFixedOverlay ? styles.dropdownOverlayFixed : ""}
      overlayStyle={overlayStyle}
      getPopupContainer={() => document.body}
    >
      <span ref={triggerRef}>
        <BarButton
          title="Download records"
          icon={<TableOutlined />}
          disabled={disabled}
        />
      </span>
    </Dropdown>
  );
}

function resolveColumns({ mode, rows, visibleVariables, requiredVariables }) {
  if (!rows?.length) return [];

  const row = rows[0];

  const allColumns = Object.keys(row);
  const visible = uniqueColumns(visibleVariables);
  const required = uniqueColumns(requiredVariables);

  const baseColumns =
    mode === "all" ? allColumns : mode === "required" ? required : visible;

  const existing = baseColumns.filter((column) =>
    Object.prototype.hasOwnProperty.call(row, column),
  );
  const withOrder = [ORDER_VARIABLE, ...existing.filter((c) => c !== ORDER_VARIABLE)];
  return uniqueColumns(withOrder);
}

function buildCsv(rows, columns) {
  if (!rows?.length || !columns?.length) return "";

  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(row?.[column])).join(","),
  );
  return [header, ...body].join("\n");
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

