// components/SelectorPanel/AssumptionsTags.jsx
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Tag } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

import { selectVars } from "@/store/features/main";
import { checkAssumptions, setSelectedVar } from "@/store/features/compare";

import { getColorByDtype, getNameByDtype } from "@/utils/Constants";
import AutoCloseTooltip from "@/components/ui/AutoCloseTooltip";
import styles from "@/styles/App.module.css";

const grayStyle = {
  backgroundColor: "var(--color-surface-muted)",
  color: "var(--color-ink-tertiary)",
};

const tagStyle = {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "6px 10px",
  lineHeight: 1,
  gap: "6px",
  overflow: "visible",
};

const StatusTag = ({ condition, successText, failText, label }) =>
  condition !== null ? (
    <AutoCloseTooltip title={condition ? successText : failText}>
      <Tag
        icon={
          condition ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />
        }
        color={condition ? "success" : "warning"}
        style={tagStyle}
      >
        {label}
      </Tag>
    </AutoCloseTooltip>
  ) : (
    <Tag style={{ ...grayStyle, ...tagStyle }}>-</Tag>
  );

const TypeTag = ({ type }) =>
  type ? (
    <AutoCloseTooltip title={`Variable type: ${getNameByDtype(type)}`}>
      <Tag color={getColorByDtype(type)} style={tagStyle}>
        {getNameByDtype(type)}
      </Tag>
    </AutoCloseTooltip>
  ) : (
    <Tag style={{ ...grayStyle, ...tagStyle }}>-</Tag>
  );

export default function AssumptionsTags() {
  const dispatch = useDispatch();
  const variables = useSelector(selectVars);
  const assumptions = useSelector((s) => s.compare.assumptions);
  const selectedVar = useSelector((s) => s.compare.selectedVar);
  const varTypes = useSelector((s) => s.main.varTypes);
  const groupVar = useSelector((s) => s.compare.groupVar);

  const allNormal = assumptions.normality?.every((d) => d.normal);
  const type = varTypes[selectedVar] || null;

  useEffect(() => {
    if (selectedVar && groupVar) {
      dispatch(checkAssumptions());
    }
  }, [selectedVar, groupVar, dispatch]);

  useEffect(() => {
    if (!variables.includes(selectedVar)) {
      dispatch(setSelectedVar(null));
    }
  }, [variables, selectedVar, dispatch]);

  return (
    <div className={styles.assumptionsTagsGroup}>
      <StatusTag
        condition={assumptions.normality && type !== null ? allNormal : null}
        successText="All distributions meet normality"
        failText="Some distributions fail normality"
        label="μ"
      />

      <StatusTag
        condition={type !== null ? assumptions.equalVariance : null}
        successText="Homogeneous variances"
        failText="Heterogeneous variances"
        label="σ²"
      />

      <TypeTag type={type} />
    </div>
  );
}
