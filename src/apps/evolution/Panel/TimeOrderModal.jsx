import React, { useEffect, useMemo, useState } from "react";
import { Button, Modal, Select, Switch, Tag, Typography } from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import {
  resetTimeOrderConfig,
  setTimeOrderConfig,
} from "@/store/features/evolution";
import {
  normalizeTimeOrderConfig,
  resolveTimeOrderMode,
  sortTimeValues,
  TimeOrderDirection,
  TimeOrderMode,
} from "@/utils/evolutionTimeOrder";
import styles from "./TimeOrderModal.module.css";

const { Text } = Typography;
const EMPTY_SELECTION = Object.freeze([]);

const modeOptions = [
  { value: TimeOrderMode.AUTO, label: "Auto detect" },
  { value: TimeOrderMode.DATE, label: "Date" },
  { value: TimeOrderMode.NUMERIC, label: "Numeric" },
  { value: TimeOrderMode.TEXT, label: "Text" },
];

const directionOptions = [
  { value: TimeOrderDirection.ASC, label: "Ascending" },
  { value: TimeOrderDirection.DESC, label: "Descending" },
];

function getModeLabel(mode) {
  switch (mode) {
    case TimeOrderMode.DATE:
      return "Date";
    case TimeOrderMode.NUMERIC:
      return "Numeric";
    case TimeOrderMode.TEXT:
      return "Text";
    default:
      return "Auto";
  }
}

function buildManualList(values, config) {
  return sortTimeValues(values, {
    ...config,
    useManualOrder: true,
  });
}

export default function TimeOrderModal({ timeVar }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const selection = useSelector(
    (s) => s.dataframe.selection ?? EMPTY_SELECTION,
  );
  const storedConfig = useSelector((s) =>
    timeVar ? s.evolution.timeOrderByVar?.[timeVar] : null,
  );

  const [draftConfig, setDraftConfig] = useState(
    normalizeTimeOrderConfig(storedConfig),
  );

  useEffect(() => {
    if (!open) return;
    setDraftConfig(normalizeTimeOrderConfig(storedConfig));
  }, [open, storedConfig, timeVar]);

  const values = useMemo(() => {
    if (!timeVar) return [];
    return selection.map((row) => row?.[timeVar]);
  }, [selection, timeVar]);

  const normalizedStoredConfig = useMemo(
    () => normalizeTimeOrderConfig(storedConfig),
    [storedConfig],
  );

  const resolvedStoredMode = useMemo(
    () => resolveTimeOrderMode(values, normalizedStoredConfig),
    [values, normalizedStoredConfig],
  );

  const storedPreview = useMemo(
    () => sortTimeValues(values, normalizedStoredConfig),
    [values, normalizedStoredConfig],
  );

  const resolvedDraftMode = useMemo(
    () => resolveTimeOrderMode(values, draftConfig),
    [values, draftConfig],
  );

  const autoDraftPreview = useMemo(
    () => sortTimeValues(values, { ...draftConfig, useManualOrder: false }),
    [values, draftConfig],
  );

  const manualPreview = useMemo(
    () => buildManualList(values, draftConfig),
    [values, draftConfig],
  );

  const displayPreview = draftConfig.useManualOrder
    ? manualPreview
    : autoDraftPreview;

  const onToggleManualOrder = (enabled) => {
    setDraftConfig((prev) => {
      if (!enabled) {
        return { ...prev, useManualOrder: false };
      }

      const seed =
        prev.manualOrder && prev.manualOrder.length
          ? prev.manualOrder
          : sortTimeValues(values, { ...prev, useManualOrder: false });

      return { ...prev, useManualOrder: true, manualOrder: seed };
    });
  };

  const moveManualItem = (index, direction) => {
    setDraftConfig((prev) => {
      const currentList = buildManualList(values, prev);
      const target = index + direction;
      if (target < 0 || target >= currentList.length) return prev;

      const next = [...currentList];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;

      return {
        ...prev,
        useManualOrder: true,
        manualOrder: next,
      };
    });
  };

  const applyChanges = () => {
    if (!timeVar) return;
    dispatch(
      setTimeOrderConfig({
        timeVar,
        config: normalizeTimeOrderConfig(draftConfig),
      }),
    );
    setOpen(false);
  };

  const resetCurrentVariable = () => {
    if (!timeVar) return;
    dispatch(resetTimeOrderConfig(timeVar));
    setDraftConfig(normalizeTimeOrderConfig(null));
  };

  const hasValues = storedPreview.length > 0;
  const previewText = hasValues
    ? storedPreview.slice(0, 4).join(" | ")
    : "No values available in current selection.";

  return (
    <>
      <div className={styles.triggerWrap}>
        <Button
          block
          icon={<SortAscendingOutlined />}
          onClick={() => setOpen(true)}
          disabled={!timeVar}
        >
          Time Order
        </Button>
        <div className={styles.meta}>
          <Tag color="blue">
            {normalizedStoredConfig.useManualOrder
              ? "Manual"
              : normalizedStoredConfig.valueMode === TimeOrderMode.AUTO
                ? `Auto (${getModeLabel(resolvedStoredMode)})`
                : getModeLabel(normalizedStoredConfig.valueMode)}
          </Tag>
          <Tag>
            {normalizedStoredConfig.direction === TimeOrderDirection.ASC
              ? "Asc"
              : "Desc"}
          </Tag>
        </div>
        <Text className={styles.preview} title={previewText}>
          {previewText}
        </Text>
      </div>

      <Modal
        title={
          timeVar
            ? `Time order configuration - ${timeVar}`
            : "Time order configuration"
        }
        open={open}
        onCancel={() => setOpen(false)}
        width={680}
        footer={
          <div className={styles.modalFooter}>
            <Button onClick={resetCurrentVariable}>
              Reset variable settings
            </Button>
            <Button type="primary" onClick={applyChanges}>
              Apply
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        }
      >
        <div className={styles.controls}>
          <div className={styles.control}>
            <Text className={styles.label}>Interpret values as</Text>
            <Select
              size="small"
              value={draftConfig.valueMode}
              options={modeOptions}
              onChange={(value) =>
                setDraftConfig((prev) => ({ ...prev, valueMode: value }))
              }
            />
            <Text className={styles.helper}>
              {draftConfig.valueMode === TimeOrderMode.AUTO ? (
                <>
                  Auto resolved as <b>{getModeLabel(resolvedDraftMode)}</b>.
                </>
              ) : (
                <>
                  Mode fixed to <b>{getModeLabel(draftConfig.valueMode)}</b>.
                </>
              )}
            </Text>
          </div>

          <div className={styles.control}>
            <Text className={styles.label}>Direction</Text>
            <Select
              size="small"
              value={draftConfig.direction}
              options={directionOptions}
              onChange={(value) =>
                setDraftConfig((prev) => ({ ...prev, direction: value }))
              }
            />
          </div>

          <div className={styles.control}>
            <Text className={styles.label}>Manual order</Text>
            <div className={styles.manualControlInput}>
              <Switch
                className={styles.manualSwitch}
                size="small"
                checked={draftConfig.useManualOrder}
                onChange={onToggleManualOrder}
              />
            </div>
          </div>
        </div>

        <div className={styles.previewWrap}>
          <div className={styles.previewTitle}>Order preview</div>
          {displayPreview.length === 0 ? (
            <div className={styles.empty}>
              No values found for this variable in the current selection.
            </div>
          ) : (
            <div className={styles.valueList}>
              {displayPreview.map((value, index) => (
                <div key={`${value}-${index}`} className={styles.valueRow}>
                  <div className={styles.valueIndex}>{index + 1}</div>
                  <div className={styles.valueLabel} title={value}>
                    {value}
                  </div>
                  {draftConfig.useManualOrder && (
                    <div className={styles.actions}>
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={index === 0}
                        onClick={() => moveManualItem(index, -1)}
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={index === displayPreview.length - 1}
                        onClick={() => moveManualItem(index, 1)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
