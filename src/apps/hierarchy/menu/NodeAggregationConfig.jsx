import { Select, Typography } from "antd";
import { Field } from "formik";

import AggregateComponent from "./aggregations/AggregateComponent";
import CustomAggregate from "./aggregations/CustomAggregate";
const { Text } = Typography;

const { Option } = Select;

const NodeAggregationConfig = ({ aggOp, nodes, vals, scope }) => {
  const selectStyle = {
    flex: 1,
  };

  return (
    <>
      <div>
        <Text strong>Derived measure</Text>
        <br />
        <Text type="secondary">Use {scope} to define this attribute.</Text>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
        }}
      >
        <Text strong>Operation type:</Text>
        <Field name="aggregationConfig.operation">
          {({ field, form }) => (
            <Select
              size="small"
              id="aggregationConfig.operation"
              style={selectStyle}
              value={vals?.aggregationConfig?.operation || "sum"}
              onChange={(value) => form.setFieldValue(field.name, value)}
            >
              <Option value="sum">Summatory</Option>
              <Option value="mean">Mean</Option>
              <Option value="concat">Concatenate</Option>
              <Option value="custom">Custom</Option>
            </Select>
          )}
        </Field>
      </div>

      {vals.aggregationConfig == null ||
      vals.aggregationConfig.operation !== "custom" ? (
        <AggregateComponent nodes={nodes} aggOp={aggOp} />
      ) : null}

      {vals.aggregationConfig != null &&
      vals.aggregationConfig.operation === "custom" ? (
        <CustomAggregate
          nodes={nodes}
          formula={vals.aggregationConfig.formula}
        />
      ) : null}
    </>
  );
};

export default NodeAggregationConfig;
