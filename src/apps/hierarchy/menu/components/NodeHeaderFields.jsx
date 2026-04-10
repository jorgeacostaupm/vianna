import { useEffect, useRef } from "react";
import { useField, useFormikContext } from "formik";
import { Input, Select, Tag, Typography } from "antd";

import { dtypeColor, dtypeMap } from "../nodeMenuConstants";
import { getNodeTypeLabel } from "../nodeMenuUtils";

const { Text } = Typography;

export default function NodeHeaderFields({ nChildren, nodeType }) {
  const [nameField] = useField("name");
  const [dtypeField, , dtypeHelpers] = useField("dtype");
  const selectRef = useRef();
  const { setValue } = dtypeHelpers;

  useEffect(() => {
    const selector = selectRef.current?.querySelector(".ant-select-selector");
    if (!selector) return;

    selector.style.backgroundColor =
      dtypeColor[dtypeField.value] || "var(--color-ink-secondary)";
    selector.style.color = "white";
    selector.style.border = "none";
    selector.style.fontWeight = "bold";
    selector.style.textAlign = "center";
  }, [dtypeField.value]);

  const dtypeOptions = Object.keys(dtypeMap).map((key) => ({
    value: key,
    label: dtypeMap[key],
  }));
  const nodeTypeLabel = getNodeTypeLabel(nodeType, nChildren);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Text strong style={{ flexShrink: 0 }}>
          Name:
        </Text>
        <Input id="name" {...nameField} size="small" style={{ flex: 1 }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Text strong>Type:</Text>
        <br />
        <div ref={selectRef}>
          <Select
            size="small"
            value={dtypeField.value}
            onChange={(value) => setValue(value)}
            options={dtypeOptions}
            style={{
              width: 150,
              borderRadius: 6,
            }}
            dropdownStyle={{ textAlign: "center" }}
          />
        </div>
        <Tag>{nodeTypeLabel}</Tag>
      </div>
    </>
  );
}
