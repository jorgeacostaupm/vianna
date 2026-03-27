import React, { useState } from "react";
import { Select } from "antd";
import { AreaChartOutlined } from "@ant-design/icons";

import styles from "@/styles/App.module.css";
import ColoredButton from "@/components/ui/ColoredButton";
import registry from "../registry";

const { Option } = Select;

export default function ChartSelector({ addView }) {
  const [chart, setChart] = useState(null);

  return (
    <>
      <div className={styles.selectorField}>
        <span className={styles.selectorLabel}>Chart type</span>
        <Select
          size="small"
          onChange={(v) => setChart(v)}
          placeholder="Select graph"
          showSearch={true}
          optionFilterProp="children"
        >
          {Object.keys(registry).map((v) => (
            <Option key={v} value={v}>
              {v}
            </Option>
          ))}
        </Select>
      </div>

      <ColoredButton
        title={"Add the selected correlation chart"}
        icon={<AreaChartOutlined />}
        onClick={() => {
          if (chart) addView(chart);
        }}
      />
    </>
  );
}
