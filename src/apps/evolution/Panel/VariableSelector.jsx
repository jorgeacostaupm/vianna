import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Select } from "antd";
import { LineChartOutlined } from "@ant-design/icons";

import { setSelectedVar } from "@/store/features/evolution";
import { selectNumericVars } from "@/store/features/main";
import ColoredButton from "@/components/ui/ColoredButton";
import styles from "@/styles/App.module.css";

const { Option } = Select;

export default function VariableSelector({ generateEvolution }) {
  const dispatch = useDispatch();
  const selectedVar = useSelector((s) => s.evolution.selectedVar);
  const groupVar = useSelector((s) => s.evolution.groupVar);
  const timeVar = useSelector((s) => s.evolution.timeVar);
  const variables = useSelector(selectNumericVars);

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
          placeholder="Select variable"
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
          groupVar && timeVar
            ? "Add evolution plot for the selected variable."
            : "Group and Time variables must be set."
        }
        icon={<LineChartOutlined />}
        onClick={() => selectedVar && generateEvolution(selectedVar)}
        disabled={!selectedVar || !groupVar || !timeVar}
      />
    </>
  );
}
