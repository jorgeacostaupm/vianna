import { Modal, Select, InputNumber, Input, Button, Typography } from "antd";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  ALL_FUNCTIONS,
  SPECIAL_FUNCTIONS,
  ROW_FUNCTIONS,
  COLUMN_FUNCTIONS,
} from "../menu/logic/formulaConstants";
import { applyOperation } from "@/store/async/metaAsyncReducers";
import { getCategoricalKeys } from "@/utils/functions";
import {
  buildListResultDescription,
  notify,
  notifyError,
} from "@/utils/notifications";

const { Option, OptGroup } = Select;
const { Text } = Typography;

const toNodeLabel = (node) => {
  const name = node?.name || node?.aggregationName || "Unknown node";
  const id = node?.id;
  return id != null ? `${name} (#${id})` : name;
};

const toFailureLabel = (entry) => {
  const base = toNodeLabel(entry);
  if (!entry?.reason) return base;
  return `${base}: ${entry.reason}`;
};

export default function OperationModal({
  open,
  setOpen,
  node,
  selectedNodes,
  setActive,
}) {
  const dispatch = useDispatch();

  const [operation, setOperation] = useState(null);
  const [params, setParams] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const safeSelectedNodes = Array.isArray(selectedNodes) ? selectedNodes : [];

  const data = useSelector((state) => state.dataframe.present.selection || []);
  const categoricalVars = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return getCategoricalKeys(data);
  }, [data]);

  const operationGroups = useMemo(() => {
    const rowText = ["string", "lower", "upper", "trim", "substring"];
    const rowMath = [
      "sqrt",
      "abs",
      "cbrt",
      "ceil",
      "clz32",
      "exp",
      "expm1",
      "floor",
      "fround",
      "log",
      "log10",
      "log1p",
      "log2",
      "pow",
      "round",
      "sign",
      "trunc",
      "greatest",
      "least",
    ];
    const rowDate = [
      "now",
      "timestamp",
      "datetime",
      "year",
      "quarter",
      "month",
      "week",
      "date",
      "dayofyear",
      "dayofweek",
      "hours",
      "minutes",
      "seconds",
      "milliseconds",
    ];

    const rowSet = new Set(Object.keys(ROW_FUNCTIONS));
    const known = new Set([...rowText, ...rowMath, ...rowDate]);
    const rowOther = [...rowSet].filter((fn) => !known.has(fn)).sort();

    const groups = [
      { label: "Special", items: Object.keys(SPECIAL_FUNCTIONS).sort() },
      { label: "Column", items: Object.keys(COLUMN_FUNCTIONS).sort() },
      { label: "Text operations", items: rowText.filter((f) => rowSet.has(f)) },
      {
        label: "Mathematic operations",
        items: rowMath.filter((f) => rowSet.has(f)),
      },
      { label: "Date operations", items: rowDate.filter((f) => rowSet.has(f)) },
    ];

    if (rowOther.length > 0) {
      groups.push({ label: "Other row operations", items: rowOther });
    }

    return groups.filter((group) => group.items.length > 0);
  }, []);

  useEffect(() => {
    if (!open) {
      setOperation(null);
      setParams({});
      setSubmitting(false);
    }
  }, [open]);

  const onOperationChange = (op) => {
    setOperation(op);
    const opArgs = ALL_FUNCTIONS[op]?.args ?? 0;

    if (op === "zscoreByGroup") {
      setParams({ group: null });
      return;
    }

    if (op === "zscoreByValues") {
      const values = {};
      safeSelectedNodes.forEach((n) => {
        values[n.id] = { mean: null, stdev: null };
      });
      setParams({ values });
      return;
    }

    if (opArgs === -1) {
      setParams({ args: [] });
      return;
    }

    if (opArgs > 1) {
      setParams({ args: Array(opArgs - 1).fill("") });
      return;
    }

    setParams({});
  };

  const updateNodeParam = (nodeId, key, value) => {
    setParams((prev) => ({
      ...prev,
      values: {
        ...(prev.values || {}),
        [nodeId]: {
          ...(prev.values?.[nodeId] || {}),
          [key]: value,
        },
      },
    }));
  };

  const setArgValue = (index, value) => {
    setParams((prev) => {
      const nextArgs = Array.isArray(prev.args) ? [...prev.args] : [];
      nextArgs[index] = value;
      return { ...prev, args: nextArgs };
    });
  };

  const addArgValue = () => {
    setParams((prev) => ({
      ...prev,
      args: [...(prev.args || []), ""],
    }));
  };

  const removeArgValue = (index) => {
    setParams((prev) => {
      const nextArgs = Array.isArray(prev.args) ? [...prev.args] : [];
      nextArgs.splice(index, 1);
      return { ...prev, args: nextArgs };
    });
  };

  const isEmptyArg = (value) =>
    value == null || String(value).trim().length === 0;

  const isConfirmDisabled = () => {
    if (!operation) return true;

    if (operation === "zscoreByGroup") {
      return !params.group;
    }

    if (operation === "zscoreByValues") {
      return safeSelectedNodes.some((n) => {
        const v = params.values?.[n.id];
        return !v || v.mean == null || v.stdev == null;
      });
    }

    const opArgs = ALL_FUNCTIONS[operation]?.args ?? 0;
    if (opArgs > 1) {
      const required = opArgs - 1;
      const args = params.args || [];
      return args.slice(0, required).some(isEmptyArg);
    }

    if (opArgs === -1) {
      const args = params.args || [];
      return args.some(isEmptyArg);
    }

    return false;
  };

  const onConfirm = async () => {
    if (isConfirmDisabled() || submitting) return;

    setSubmitting(true);

    try {
      const action = await dispatch(
        applyOperation({
          operation,
          params,
          node,
          selectedNodes: safeSelectedNodes,
        }),
      );

      if (applyOperation.fulfilled.match(action)) {
        const {
          total = safeSelectedNodes.length,
          applied = [],
          failed = [],
        } = action.payload || {};

        const description = buildListResultDescription({
          successLabel: `Created (${applied.length}/${total})`,
          successItems: applied.map(toNodeLabel),
          failureLabel: `Failed (${failed.length}/${total})`,
          failureItems: failed.map(toFailureLabel),
          maxItems: 5,
        });

        notify({
          message:
            failed.length === 0
              ? "Operation applied"
              : applied.length === 0
                ? "Operation failed for selection"
                : "Operation completed with warnings",
          description,
          type:
            failed.length === 0
              ? "success"
              : applied.length === 0
                ? "error"
                : "warning",
          pauseOnHover: true,
          duration: 6,
        });
      } else {
        notifyError({
          message: "Operation failed",
          error: action.payload || action.error,
          fallback: "Error applying operation to selected nodes.",
          pauseOnHover: true,
        });
      }

      setOpen(false);
      setActive(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!node?.parent) return null;

  const opArgs = ALL_FUNCTIONS[operation]?.args ?? 0;
  const needsArgs = operation && (opArgs > 1 || opArgs === -1);
  const isVariableArgs = opArgs === -1;
  const baseLabel =
    opArgs === 0
      ? "Base column not used"
      : safeSelectedNodes.length > 1
        ? `Base: ${safeSelectedNodes.length} nodes`
        : `Base: $(${node?.data?.name || node?.name})`;

  return (
    <Modal
      title="Apply Operation"
      open={open}
      onOk={onConfirm}
      onCancel={() => setOpen(false)}
      okButtonProps={{ disabled: isConfirmDisabled() || submitting }}
      confirmLoading={submitting}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>Operation</div>
        <Select
          size="small"
          style={{ width: "100%" }}
          placeholder="Select operation"
          value={operation}
          onChange={onOperationChange}
          showSearch
          optionFilterProp="children"
        >
          {operationGroups.map((group) => (
            <OptGroup key={group.label} label={group.label}>
              {group.items.map((op) => (
                <Option key={op} value={op}>
                  {op}
                </Option>
              ))}
            </OptGroup>
          ))}
        </Select>
      </div>

      {operation && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">{baseLabel}</Text>
        </div>
      )}

      {operation === "zscoreByValues" &&
        safeSelectedNodes.map((n) => (
          <div
            key={n.id}
            style={{
              padding: 12,
              marginBottom: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 6,
            }}
          >
            <div style={{ marginBottom: 8, fontWeight: 500 }}>
              {n.data?.name || n.name}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <InputNumber
                size="small"
                style={{ flex: 1 }}
                placeholder="Mean"
                value={params.values?.[n.id]?.mean}
                onChange={(v) => updateNodeParam(n.id, "mean", v)}
              />

              <InputNumber
                size="small"
                style={{ flex: 1 }}
                placeholder="Std Dev"
                min={0}
                value={params.values?.[n.id]?.stdev}
                onChange={(v) => updateNodeParam(n.id, "stdev", v)}
              />
            </div>
          </div>
        ))}

      {operation === "zscoreByGroup" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>Group by</div>
          <Select
            size="small"
            style={{ width: "100%" }}
            placeholder="Select group column"
            value={params.group}
            onChange={(group) => setParams((prev) => ({ ...prev, group }))}
          >
            {categoricalVars.map((key) => (
              <Option key={key} value={key}>
                {key}
              </Option>
            ))}
          </Select>
        </div>
      )}

      {needsArgs &&
        operation !== "zscoreByGroup" &&
        operation !== "zscoreByValues" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8 }}>Arguments</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(params.args || []).map((value, index) => (
                <div
                  key={`arg-${index}`}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <Input
                    value={value}
                    onChange={(e) => setArgValue(index, e.target.value)}
                    placeholder='e.g. 2, $(Column), "text"'
                    addonBefore={`Arg ${index + 2}`}
                  />
                  {isVariableArgs && (
                    <Button size="small" onClick={() => removeArgValue(index)}>
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {isVariableArgs && (
              <Button
                size="small"
                type="dashed"
                style={{ marginTop: 8 }}
                onClick={addArgValue}
              >
                Add argument
              </Button>
            )}
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                Use <code>$(Column)</code> for column references.
              </Text>
            </div>
          </div>
        )}
    </Modal>
  );
}
