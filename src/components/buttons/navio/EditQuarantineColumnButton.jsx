import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select, Input, Radio } from "antd";
import { EditOutlined, FormOutlined } from "@ant-design/icons";

import { selectNavioVars, setQuarantineData } from "@/store/features/main";
import { generateColumnBatch } from "@/store/features/dataframe";
import { ORDER_VARIABLE } from "@/utils/constants";
import PopoverButton from "@/components/buttons/ui/PopoverButton";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { extractFormulaDependencyNames } from "@/store/features/metadata/utils/thunkUtils";
import {
  EDIT_VALUE_TYPE,
  isValidEditNumber,
  resolveEditValue,
} from "./editValue";

function EditColumn() {
  const dispatch = useDispatch();
  const [column, setColumn] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [valueType, setValueType] = useState(EDIT_VALUE_TYPE.TEXT);

  const selection = useSelector((state) => state.main.quarantineSelection);
  const data = useSelector((state) => state.main.quarantineData);
  const attributes = useSelector((state) => state.metadata.attributes);
  const vars = useSelector(selectNavioVars);

  const ids = selection?.map((item) => item[ORDER_VARIABLE]);
  const canApplyEdit =
    Boolean(column) &&
    (valueType !== EDIT_VALUE_TYPE.NUMBER || isValidEditNumber(inputValue));
  const editTooltip = !column
    ? "Select a column to edit"
    : !canApplyEdit
      ? "Enter a valid number"
      : `Change selection ${column} values to ${inputValue} as ${valueType}`;

  const onEditSelection = () => {
    if (!data || !canApplyEdit) return;
    const columnNodeId = attributes.find((attr) => attr?.name === column)?.id;
    const editValue = resolveEditValue(inputValue, valueType);

    const updatedData = data.map((item) =>
      ids?.includes(item[ORDER_VARIABLE])
        ? { ...item, [column]: editValue }
        : item,
    );

    dispatch(setQuarantineData(updatedData));

    const matchedAggregations = attributes.filter(
      (attr) =>
        attr.type === "aggregation" &&
        (
          (Number.isInteger(columnNodeId) &&
            attr.aggregationConfig?.usedAttributes?.includes(columnNodeId)) ||
          extractFormulaDependencyNames(attr.aggregationConfig?.formula).includes(column)
        ),
    );

    if (matchedAggregations.length > 0) {
      dispatch(
        generateColumnBatch({
          cols: matchedAggregations,
        }),
      );
    }
  };

  return (
    <>
      <div style={{ display: "flex", width: "100%", gap: 8 }}>
        <Select
          value={column}
          onChange={setColumn}
          showSearch
          placeholder="Select a column to edit"
          options={vars.map((key) => ({ label: key, value: key }))}
          style={{ flex: 1 }}
          filterOption={(input, option) =>
            option.label.toLowerCase().includes(input.toLowerCase())
          }
          allowClear
        />
      </div>

      <div style={{ display: "flex", width: "100%", gap: 8 }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="New values"
          style={{ flex: 1 }}
        />
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          size="small"
          value={valueType}
          onChange={(e) => setValueType(e.target.value)}
          style={{ whiteSpace: "nowrap" }}
        >
          <Radio.Button value={EDIT_VALUE_TYPE.TEXT}>Text</Radio.Button>
          <Radio.Button value={EDIT_VALUE_TYPE.NUMBER}>Number</Radio.Button>
        </Radio.Group>
        <AppButton
          preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
          tooltip={editTooltip}
          tooltipPlacement="bottom"
          onClick={onEditSelection}
          icon={<EditOutlined />}
          disabled={!canApplyEdit}
        />
      </div>
    </>
  );
}

export default function EditQuarantineColumnButton() {
  return (
    <PopoverButton
      content={<EditColumn />}
      icon={<FormOutlined />}
      title="Edit column values for quarantine selection"
    />
  );
}
