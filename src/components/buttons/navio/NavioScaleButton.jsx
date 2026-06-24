import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input, Modal, Select, Table, Tag, Typography } from "antd";
import { SlidersOutlined } from "@ant-design/icons";

import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import {
  clearNavioScaleOverrides,
  selectNavioColumns,
  selectNavioScaleOverrides,
  selectNavioScaleTypes,
  setNavioScaleOverride,
} from "@/store/features/dataframe";
import styles from "@/components/management/Data.module.css";

const { Text, Title } = Typography;

const SCALE_OPTIONS = [
  { value: "", label: "Automatic" },
  { value: "categorical", label: "Categorical" },
  { value: "ordered", label: "Ordered" },
  { value: "text", label: "Text" },
  { value: "sequential", label: "Sequential" },
  { value: "diverging", label: "Diverging" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Boolean" },
];

const formatScaleType = (type) =>
  SCALE_OPTIONS.find((option) => option.value === type)?.label || "Ignored";

export default function NavioScaleButton() {
  const dispatch = useDispatch();
  const columns = useSelector(selectNavioColumns);
  const scaleTypes = useSelector(selectNavioScaleTypes);
  const scaleOverrides = useSelector(selectNavioScaleOverrides);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const scaleTypesByAttribute = new Map(
      scaleTypes.map((item) => [item.attribute, item]),
    );
    const normalizedQuery = query.trim().toLowerCase();

    return columns
      .filter((attribute) =>
        normalizedQuery
          ? attribute.toLowerCase().includes(normalizedQuery)
          : true,
      )
      .map((attribute) => {
        const scaleType = scaleTypesByAttribute.get(attribute) || {};
        return {
          key: attribute,
          attribute,
          inferredType: scaleType.inferredType || null,
          effectiveType: scaleType.effectiveType || null,
          overrideType: scaleOverrides[attribute] || "",
        };
      });
  }, [columns, query, scaleOverrides, scaleTypes]);

  const hasOverrides = Object.keys(scaleOverrides).length > 0;

  const tableColumns = [
    {
      title: "Attribute",
      dataIndex: "attribute",
      ellipsis: true,
      sorter: (a, b) => a.attribute.localeCompare(b.attribute),
    },
    {
      title: "Automatic",
      dataIndex: "inferredType",
      width: 130,
      render: (type) => <Tag>{formatScaleType(type)}</Tag>,
      sorter: (a, b) =>
        formatScaleType(a.inferredType).localeCompare(
          formatScaleType(b.inferredType),
        ),
    },
    {
      title: "Active",
      dataIndex: "effectiveType",
      width: 130,
      render: (type, row) => (
        <Tag color={row.overrideType ? "blue" : undefined}>
          {formatScaleType(type)}
        </Tag>
      ),
      sorter: (a, b) =>
        formatScaleType(a.effectiveType).localeCompare(
          formatScaleType(b.effectiveType),
        ),
    },
    {
      title: "Override",
      dataIndex: "overrideType",
      width: 190,
      render: (type, row) => (
        <Select
          value={type}
          options={SCALE_OPTIONS}
          style={{ width: "100%" }}
          onChange={(nextType) =>
            dispatch(
              setNavioScaleOverride({
                attribute: row.attribute,
                type: nextType || null,
              }),
            )
          }
        />
      ),
    },
  ];

  return (
    <>
      <AppButton
        preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
        tooltip="Navio scales"
        tooltipPlacement="bottom"
        ariaLabel="Navio scales"
        onClick={() => setIsModalOpen(true)}
        icon={<SlidersOutlined />}
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
              Navio Scales
            </Title>
            <Text type="secondary" className={styles.modalSubtitle}>
              Inspect and override the visual scale used by each Overview
              attribute.
            </Text>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width="900px"
        footer={null}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Input.Search
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search attributes"
            allowClear
          />
          <Button
            disabled={!hasOverrides}
            onClick={() => dispatch(clearNavioScaleOverrides())}
          >
            Reset overrides
          </Button>
        </div>
        <Table
          size="small"
          columns={tableColumns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 760 }}
        />
      </Modal>
    </>
  );
}
