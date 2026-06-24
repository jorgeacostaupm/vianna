import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Tabs, Typography, Select, Input, Radio } from "antd";
import { EditOutlined, FormOutlined } from "@ant-design/icons";
import { selectNavioVars } from "@/store/features/main";
import { setDataframe } from "@/store/features/dataframe";
import { ORDER_VARIABLE } from "@/utils/constants";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { generateColumnBatch } from "@/store/features/dataframe";
import { useSelectionOrderValues } from "@/hooks/useSelectionRows";
import { getAffectedAggregationNodes } from "@/store/features/dataframe/utils/aggregationDependencies";
import NullifyValuesPanel from "@/components/management/NullifyValuesPanel";
import styles from "@/components/management/Data.module.css";
import {
  EDIT_VALUE_TYPE,
  isValidEditNumber,
  resolveEditValue,
} from "./editValue";

const { Text, Title } = Typography;

function TabBody({ subtitle, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Text type="secondary" className={styles.modalSubtitle}>
        {subtitle}
      </Text>
      {children}
    </div>
  );
}

function EditColumn() {
  const dispatch = useDispatch();
  const [column, setColumn] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [valueType, setValueType] = useState(EDIT_VALUE_TYPE.TEXT);

  const data = useSelector((state) => state.dataframe.dataframe);
  const attributes = useSelector((state) => state.metadata.attributes);
  const vars = useSelector(selectNavioVars);
  const selectedOrderValues = useSelectionOrderValues();

  const selectedOrderSet = new Set(selectedOrderValues);
  const canApplyEdit =
    Boolean(column) &&
    (valueType !== EDIT_VALUE_TYPE.NUMBER || isValidEditNumber(inputValue));
  const editTooltip = !column
    ? "Select a column to edit"
    : !canApplyEdit
      ? "Enter a valid number"
      : `Change selection ${column} values to ${inputValue} as ${valueType}`;

  const onEditSelection = () => {
    if (!canApplyEdit) return;

    const editValue = resolveEditValue(inputValue, valueType);

    const updatedData = data.map((item) =>
      selectedOrderSet.has(item?.[ORDER_VARIABLE])
        ? { ...item, [column]: editValue }
        : item,
    );

    dispatch(setDataframe(updatedData));

    const matchedAggregations = getAffectedAggregationNodes(attributes, column);

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

export default function EditColumnButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => setIsModalOpen(true);
  const hideModal = () => setIsModalOpen(false);

  const items = [
    {
      key: "edit-column",
      label: "Edit Column",
      children: (
        <TabBody subtitle="Change one column value for the currently selected Overview records.">
          <EditColumn />
        </TabBody>
      ),
    },
    {
      key: "nullify-values",
      label: "Nullify Values",
      children: (
        <TabBody subtitle="Replace matching values with null across data and quarantine records.">
          <NullifyValuesPanel />
        </TabBody>
      ),
    },
  ];

  return (
    <>
      <AppButton
        preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
        tooltip="Edit data values"
        tooltipPlacement="bottom"
        ariaLabel="Edit data values"
        onClick={showModal}
        icon={<FormOutlined />}
      />
      <Modal
        title={
          <div className={styles.modalTitle}>
            <Title
              level={3}
              style={{
                marginTop: 0,
                marginBottom: 0,
                color: "var(--primary-color)",
              }}
            >
              Edit Data Values
            </Title>
            <Text type="secondary" className={styles.modalSubtitle}>
              Edit selected Overview records or replace matching values with
              null across the active dataset.
            </Text>
          </div>
        }
        open={isModalOpen}
        onCancel={hideModal}
        width="800px"
        footer={null}
      >
        <Tabs
          className={styles.managementTabs}
          defaultActiveKey="edit-column"
          items={items}
        />
      </Modal>
    </>
  );
}
