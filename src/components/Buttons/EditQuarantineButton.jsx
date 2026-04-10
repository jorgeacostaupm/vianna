import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select, Input } from "antd";
import { EditOutlined, FormOutlined } from "@ant-design/icons";

import { selectNavioVars, setQuarantineData } from "@/store/features/main";
import { generateColumnBatch } from "@/store/features/dataframe";
import { ORDER_VARIABLE } from "@/utils/Constants";
import PopoverButton from "@/components/ui/PopoverButton";
import BarButton from "@/components/ui/BarButton";

function EditColumn() {
  const dispatch = useDispatch();
  const [column, setColumn] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const selection = useSelector(
    (state) => state.main.quarantineSelection
  );
  const data = useSelector((state) => state.main.quarantineData);
  const attributes = useSelector((state) => state.metadata.attributes);
  const vars = useSelector(selectNavioVars);

  const ids = selection?.map((item) => item[ORDER_VARIABLE]);

  const onEditSelection = () => {
    if (!data || !column) return;

    const updatedData = data.map((item) =>
      ids?.includes(item[ORDER_VARIABLE])
        ? { ...item, [column]: inputValue }
        : item
    );

    dispatch(setQuarantineData(updatedData));

    const matchedAggregations = attributes.filter(
      (attr) =>
        attr.type === "aggregation" &&
        attr.info?.usedAttributes?.some((d) => d.name === column)
    );

    if (matchedAggregations.length > 0) {
      dispatch(
        generateColumnBatch({
          cols: matchedAggregations,
        })
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
        <BarButton
          title={`Change selection ${column} values to ${inputValue}`}
          onClick={onEditSelection}
          icon={<EditOutlined />}
          placement="bottom"
        />
      </div>
    </>
  );
}

export default function EditQuarantineButton() {
  return (
    <PopoverButton
      content={<EditColumn />}
      icon={<FormOutlined />}
      title="Edit column values for quarantine selection"
    />
  );
}
