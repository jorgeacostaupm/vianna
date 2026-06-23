import { Select } from "antd";

import styles from "@/styles/modules/analysisPanels.module.css";

const { Option } = Select;

const defaultFilterOption = (input, option) =>
  String(option?.children ?? option?.label ?? "")
    .toLowerCase()
    .includes(input.toLowerCase());

const toOption = (option) =>
  option && typeof option === "object"
    ? option
    : { label: option, value: option };

export default function AnalysisSelectField({
  label,
  options = [],
  extra = null,
  showSearch = true,
  filterOption = defaultFilterOption,
  optionFilterProp = "children",
  notFoundContent = "No variables found",
  ...selectProps
}) {
  return (
    <div className={styles.selectorField}>
      {label ? <span className={styles.selectorLabel}>{label}</span> : null}
      <Select
        size="small"
        showSearch={showSearch}
        filterOption={filterOption}
        optionFilterProp={optionFilterProp}
        notFoundContent={notFoundContent}
        {...selectProps}
      >
        {options.map((option) => {
          const { label: optionLabel, value } = toOption(option);
          return (
            <Option key={value} value={value}>
              {optionLabel}
            </Option>
          );
        })}
      </Select>
      {extra}
    </div>
  );
}
