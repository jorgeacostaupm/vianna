import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, Input, Space, Tag, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";

import ColoredButton from "@/components/ui/ColoredButton";
import { replaceValuesWithNull } from "@/store/async/dataAsyncReducers";
import { notifyError, notifySuccess } from "@/utils/notifications";

const { Text } = Typography;
const VALUE_SEPARATOR_REGEX = /[\n;]/;

const parseNullifyValues = (rawInput) =>
  [...new Set(
    String(rawInput ?? "")
      .split(VALUE_SEPARATOR_REGEX)
      .map((value) => value.trim())
      .filter(Boolean),
  )];

const normalizeComparableValue = (value) => String(value ?? "").trim();
const isSameValue = (rowValue, candidate) => {
  if (rowValue == null) return false;
  const normalizedRowValue = normalizeComparableValue(rowValue);
  const normalizedCandidate = normalizeComparableValue(candidate);
  return (
    normalizedRowValue === normalizedCandidate || rowValue == normalizedCandidate
  );
};

export default function NullifyValuesPanel() {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nullifiedValues = useSelector(
    (state) => state.dataframe.present.nullifiedValues,
  );
  const dataframe = useSelector((state) => state.dataframe.present.dataframe) || [];
  const quarantineData =
    useSelector((state) => state.cantab.present.quarantineData) || [];

  const nullifyValues = useMemo(() => parseNullifyValues(inputValue), [inputValue]);
  const hasInputValues = nullifyValues.length > 0;
  const matchesCount = useMemo(() => {
    if (!hasInputValues) return 0;

    const countMatches = (rows) =>
      rows.reduce((acc, row) => {
        if (!row || typeof row !== "object") return acc;
        const rowMatches = Object.values(row).filter(
          (value) => nullifyValues.some((candidate) => isSameValue(value, candidate)),
        ).length;
        return acc + rowMatches;
      }, 0);

    return countMatches(dataframe) + countMatches(quarantineData);
  }, [dataframe, hasInputValues, nullifyValues, quarantineData]);

  const onReplaceValues = () => {
    if (!hasInputValues) return;
    const selectedValuesText = nullifyValues.join(", ");
    setIsSubmitting(true);
    dispatch(replaceValuesWithNull(nullifyValues))
      .unwrap()
      .then((result) => {
        const replacedCount = Number.isFinite(result?.replacedCount)
          ? result.replacedCount
          : matchesCount;
        notifySuccess({
          message: "Values replaced with null",
          description: `${replacedCount} value(s) were replaced for: ${selectedValuesText}`,
        });
        setInputValue("");
      })
      .catch((error) => {
        notifyError({
          message: "Could not nullify values",
          error,
          fallback: "Failed to replace selected values with null.",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <div style={{ display: "flex", width: "100%", gap: 8 }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Values to nullify (semicolon or new line separated)"
          style={{ flex: 1 }}
        />
        <ColoredButton
          title={`Replace selected values with null`}
          shape="default"
          icon={<EditOutlined />}
          onClick={onReplaceValues}
          placement="bottom"
          loading={isSubmitting}
          disabled={isSubmitting || !hasInputValues}
        />
      </div>
      <Text type="secondary">
        Preview matches in data and quarantine: {matchesCount}
      </Text>

      <Card
        size="small"
        title={
          <Text strong style={{ color: "var(--primary-color)" }}>
            Nullified Values
          </Text>
        }
        style={{ marginTop: 12, borderRadius: 8 }}
      >
        <Space wrap>
          {nullifiedValues.map((val, idx) => (
            <Tag key={`${val}-${idx}`} color="red">
              {val}
            </Tag>
          ))}
        </Space>
      </Card>
    </Space>
  );
}
