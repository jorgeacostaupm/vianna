import { Select, Typography } from "antd";
import { Field } from "formik";

import AggregateComponent from "./aggregations/AggregateComponent";
import CustomAggregate from "./aggregations/CustomAggregate";
const { Text } = Typography;

const { Option } = Select;

const NodeAggregationConfig = ({ aggOp, nodes, vals, save }) => {
  const selectStyle = {
    flex: 1,
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
        }}
      >
        <Text strong>Operation type:</Text>
        <Field name="info.operation">
          {({ field, form }) => (
            <Select size="small"
              id="info.operation"
              style={selectStyle}
              value={vals?.info?.operation || "sum"}
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

      {vals.info == null || vals.info.operation !== "custom" ? (
        <AggregateComponent nodes={nodes} aggOp={aggOp} save={save} />
      ) : null}

      {vals.info != null && vals.info.operation === "custom" ? (
        <CustomAggregate nodes={nodes} formula={vals.info.formula} save={save} />
      ) : null}
    </>
  );
};

export default NodeAggregationConfig;
