import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select } from "antd";

import { selectCategoricalVars } from "@/store/slices/cantabSlice";
import { setGroupVar as setCorrelationGroupVar } from "@/store/slices/correlationSlice";
import { DEFAULT_GROUP_VARIABLE } from "@/utils/Constants";
import AnalysisContextStats from "@/components/ui/AnalysisContextStats";
import styles from "@/styles/App.module.css";

const { Option } = Select;

export default function ContextSelector() {
  const dispatch = useDispatch();
  const groupVar = useSelector((s) => s.correlation.groupVar);
  const timeVar = useSelector((s) => s.evolution.timeVar);
  const idVar = useSelector((s) => s.cantab.present.idVar);
  const categoricalVars = useSelector(selectCategoricalVars);

  useEffect(() => {
    if (!categoricalVars.length) return;
    if (categoricalVars.includes(groupVar)) return;
    const fallback = categoricalVars.includes(DEFAULT_GROUP_VARIABLE)
      ? DEFAULT_GROUP_VARIABLE
      : categoricalVars[0];
    dispatch(setCorrelationGroupVar(fallback));
  }, [categoricalVars, groupVar, dispatch]);

  const filterOption = (input, option) => {
    return option.children.toLowerCase().includes(input.toLowerCase());
  };

  return (
    <>
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Group variable</span>
        <Select
          size="small"
          value={groupVar}
          onChange={(v) => dispatch(setCorrelationGroupVar(v))}
          placeholder="Select group variable"
          showSearch={true}
          filterOption={filterOption}
          optionFilterProp="children"
          notFoundContent="No variables found"
        >
          {categoricalVars.map((v) => (
            <Option key={v} value={v}>
              {v}
            </Option>
          ))}
        </Select>
      </div>

      <AnalysisContextStats
        groupVar={groupVar}
        timeVar={timeVar}
        idVar={idVar}
      />
    </>
  );
}
