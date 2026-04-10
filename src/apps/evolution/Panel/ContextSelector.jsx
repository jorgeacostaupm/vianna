import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select } from "antd";

import {
  setGroupVar as setEvolutionGroupVar,
  setTimeVar as setEvolutionTimeVar,
} from "@/store/features/evolution";
import { selectCategoricalVars, selectNavioVars } from "@/store/features/main";
import {
  DEFAULT_GROUP_VARIABLE,
  DEFAULT_TIMESTAMP_VARIABLE,
} from "@/utils/Constants";
import AnalysisContextStats from "@/components/ui/AnalysisContextStats";
import styles from "@/styles/App.module.css";
import TimeOrderModal from "./TimeOrderModal";

const { Option } = Select;

export default function ContextSelector() {
  const dispatch = useDispatch();
  const groupVar = useSelector((s) => s.evolution.groupVar);
  const timeVar = useSelector((s) => s.evolution.timeVar);
  const idVar = useSelector((s) => s.main.idVar);
  const categoricalVars = useSelector(selectCategoricalVars);
  const navioVars = useSelector(selectNavioVars);

  useEffect(() => {
    if (!categoricalVars.length) return;
    if (groupVar == null) return;
    if (categoricalVars.includes(groupVar)) return;
    const fallback = categoricalVars.includes(DEFAULT_GROUP_VARIABLE)
      ? DEFAULT_GROUP_VARIABLE
      : categoricalVars[0];
    dispatch(setEvolutionGroupVar(fallback));
  }, [categoricalVars, groupVar, dispatch]);

  useEffect(() => {
    if (!navioVars.length) return;
    if (timeVar == null) return;
    if (navioVars.includes(timeVar)) return;
    const fallback = navioVars.includes(DEFAULT_TIMESTAMP_VARIABLE)
      ? DEFAULT_TIMESTAMP_VARIABLE
      : navioVars[0];
    dispatch(setEvolutionTimeVar(fallback));
  }, [navioVars, timeVar, dispatch]);

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
          onChange={(v) => dispatch(setEvolutionGroupVar(v ?? null))}
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

      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Time variable</span>
        <Select
          size="small"
          value={timeVar ?? undefined}
          onChange={(v) => dispatch(setEvolutionTimeVar(v ?? null))}
          placeholder="Select time variable"
          showSearch={true}
          filterOption={filterOption}
          optionFilterProp="children"
          notFoundContent="No variables found"
          allowClear={true}
        >
          {navioVars.map((v) => (
            <Option key={v} value={v}>
              {v}
            </Option>
          ))}
        </Select>
        <TimeOrderModal timeVar={timeVar} />
      </div>

      <AnalysisContextStats
        app="evolution"
        groupVar={groupVar}
        timeVar={timeVar}
        idVar={idVar}
      />
    </>
  );
}
