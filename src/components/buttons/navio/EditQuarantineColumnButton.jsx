import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select, Input } from "antd";
import { EditOutlined, FormOutlined } from "@ant-design/icons";

import { selectNavioVars, setQuarantineData } from "@/store/features/main";
import { generateColumnBatch } from "@/store/features/dataframe";
import { ORDER_VARIABLE } from "@/utils/constants";
import PopoverButton from "@/components/buttons/ui/PopoverButton";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { extractFormulaDependencyNames } from "@/store/features/metadata/utils/thunkUtils";

function EditColumn() {
  const dispatch = useDispatch();
  const [column, setColumn] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const selection = useSelector((state) => state.main.quarantineSelection);
  const data = useSelector((state) => state.main.quarantineData);
  const attributes = useSelector((state) => state.metadata.attributes);
  const vars = useSelector(selectNavioVars);

  const ids = selection?.map((item) => item[ORDER_VARIABLE]);

  const onEditSelection = () => {
    if (!data || !column) return;
    const columnNodeId = attributes.find((attr) => attr?.name === column)?.id;

    const updatedData = data.map((item) =>
      ids?.includes(item[ORDER_VARIABLE])
        ? { ...item, [column]: inputValue }
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
        <AppButton
          preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
          tooltip={`Change selection ${column} values to ${inputValue}`}
          tooltipPlacement="bottom"
          onClick={onEditSelection}
          icon={<EditOutlined />}
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
