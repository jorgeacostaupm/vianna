import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select } from "antd";

import {
  setGroupVar as setEvolutionGroupVar,
  setTimeVar as setEvolutionTimeVar,
} from "@/store/slices/evolutionSlice";
import {
  selectCategoricalVars,
  selectNavioVars,
} from "@/store/slices/cantabSlice";
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
  const idVar = useSelector((s) => s.cantab.present.idVar);
  const categoricalVars = useSelector(selectCategoricalVars);
  const navioVars = useSelector(selectNavioVars);

  useEffect(() => {
    if (!categoricalVars.length) return;
    if (categoricalVars.includes(groupVar)) return;
    const fallback = categoricalVars.includes(DEFAULT_GROUP_VARIABLE)
      ? DEFAULT_GROUP_VARIABLE
      : categoricalVars[0];
    dispatch(setEvolutionGroupVar(fallback));
  }, [categoricalVars, groupVar, dispatch]);

  useEffect(() => {
    if (!navioVars.length) return;
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
          value={groupVar}
          onChange={(v) => dispatch(setEvolutionGroupVar(v))}
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

      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Time variable</span>
        <Select
          size="small"
          value={timeVar}
          onChange={(v) => dispatch(setEvolutionTimeVar(v))}
          placeholder="Select time variable"
          showSearch={true}
          filterOption={filterOption}
          optionFilterProp="children"
          notFoundContent="No variables found"
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
        groupVar={groupVar}
        timeVar={timeVar}
        idVar={idVar}
      />
    </>
  );
}
