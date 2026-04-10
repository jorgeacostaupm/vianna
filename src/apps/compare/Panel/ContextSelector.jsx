import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select } from "antd";

import { selectCategoricalVars } from "@/store/features/main";
import { setGroupVar as setCompareGroupVar } from "@/store/features/compare";
import { DEFAULT_GROUP_VARIABLE } from "@/utils/Constants";
import AnalysisContextStats from "@/components/ui/AnalysisContextStats";
import styles from "@/styles/App.module.css";

const { Option } = Select;

export default function ContextSelector() {
  const dispatch = useDispatch();
  const groupVar = useSelector((s) => s.compare.groupVar);
  const timeVar = useSelector((s) => s.evolution.timeVar);
  const idVar = useSelector((s) => s.main.idVar);
  const categoricalVars = useSelector(selectCategoricalVars);

  useEffect(() => {
    if (!categoricalVars.length) return;
    if (groupVar == null) return;
    if (categoricalVars.includes(groupVar)) return;
    const fallback = categoricalVars.includes(DEFAULT_GROUP_VARIABLE)
      ? DEFAULT_GROUP_VARIABLE
      : categoricalVars[0];
    dispatch(setCompareGroupVar(fallback));
  }, [categoricalVars, groupVar, dispatch]);

  const filterOption = (input, option) => {
    return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0;
  };

  return (
    <>
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Group variable</span>
        <Select
          size="small"
          value={groupVar ?? undefined}
          onChange={(v) => dispatch(setCompareGroupVar(v ?? null))}
          placeholder="Select variable"
          showSearch={true}
          filterOption={filterOption}
          optionFilterProp="children"
          notFoundContent="No variables found"
          allowClear={true}
        >
          {categoricalVars.map((v) => (
            <Option key={v} value={v}>
              {v}
            </Option>
          ))}
        </Select>
      </div>

      <AnalysisContextStats
        app="comparison"
        groupVar={groupVar}
        timeVar={timeVar}
        idVar={idVar}
      />
    </>
  );
}
