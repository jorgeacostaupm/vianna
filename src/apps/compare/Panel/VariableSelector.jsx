import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Select } from "antd";
import { AreaChartOutlined } from "@ant-design/icons";

import { selectVars } from "@/store/slices/cantabSlice";
import { checkAssumptions, setSelectedVar } from "@/store/slices/compareSlice";
import ColoredButton from "@/components/ui/ColoredButton";
import styles from "@/styles/App.module.css";

const { Option } = Select;

export default function VariableSelector({ generateDistribution }) {
  const dispatch = useDispatch();
  const variables = useSelector(selectVars);
  const selectedVar = useSelector((s) => s.compare.selectedVar);
  const groupVar = useSelector((s) => s.compare.groupVar);

  useEffect(() => {
    if (selectedVar && groupVar) {
      dispatch(checkAssumptions());
    }
  }, [selectedVar, groupVar, dispatch]);

  useEffect(() => {
    if (!variables.includes(selectedVar)) dispatch(setSelectedVar(null));
  }, [variables, selectedVar, dispatch]);

  const filterOption = (input, option) => {
    return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0;
  };

  return (
    <>
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Variable</span>
        <Select
          size="small"
          value={selectedVar}
          onChange={(v) => dispatch(setSelectedVar(v))}
          placeholder="Search or select variable"
          showSearch={true}
          filterOption={filterOption}
          optionFilterProp="children"
          notFoundContent="No variables found"
          allowClear={true}
        >
          {variables.map((v) => (
            <Option key={v} value={v}>
              {v}
            </Option>
          ))}
        </Select>
      </div>

      <ColoredButton
        title={
          groupVar
            ? "Add distribution plots for the selected variable."
            : "Group variable must be set."
        }
        icon={<AreaChartOutlined />}
        onClick={() => selectedVar && generateDistribution(selectedVar)}
        disabled={!selectedVar || !groupVar}
      />
    </>
  );
}
