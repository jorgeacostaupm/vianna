import { useEffect, useRef } from "react";
import { Select } from "antd";
import { useField, useFormikContext } from "formik";
import { Typography } from "antd";
import { DataType } from "@/utils/Constants";
const { Text } = Typography;

const dtypeMap = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.name,
  [DataType.TEXT.dtype]: DataType.TEXT.name,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.name,
};

const dtypeColor = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.color,
  [DataType.TEXT.dtype]: DataType.TEXT.color,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.color,
};

const NodeInfo = ({ nChildren, nodeType }) => {
  const [field, , helpers] = useField("dtype");
  const { errors } = useFormikContext();
  const { setValue } = helpers;
  const selectRef = useRef();

  useEffect(() => {
    const selector = selectRef.current?.querySelector(".ant-select-selector");
    if (selector) {
      selector.style.backgroundColor = dtypeColor[field.value];
      selector.style.color = "white";
      selector.style.border = "none";
      selector.style.fontWeight = "bold";
      selector.style.textAlign = "center";
    }
  }, [field.value]);

  const dtypeOptions = Object.keys(dtypeMap).map((key) => ({
    value: key,
    label: dtypeMap[key],
  }));

  let nodeName = "";
  switch (nodeType) {
    case "attribute":
      nodeName = "Original";
      break;
    case "root":
      nodeName = "Root";
      break;
    case "aggregation":
      nodeName = nChildren === 0 ? "Measure" : "Aggregation";
      break;
    default:
      nodeName = "Unknown";
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Text strong>Nº Children:</Text>
        <Text strong>{nChildren}</Text>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Text strong>Node type:</Text>
        <Text strong>{nodeName}</Text>
      </div>

      {field.value !== "root" && (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Text strong>Data type:</Text>
          <div ref={selectRef}>
            <Select size="small"
              value={field.value}
              onChange={(value) => setValue(value)}
              options={dtypeOptions}
              style={{
                width: 140,
                borderRadius: 6,
              }}
              dropdownStyle={{ textAlign: "center" }}
            />
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          color: "red",
        }}
      >
        {errors?.dtype}
      </div>
    </>
  );
};

export default NodeInfo;
