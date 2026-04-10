import { Typography } from "antd";

import { normalizePreviewValue } from "../nodeMenuUtils";

const { Text } = Typography;

export default function NodeVariablePreview({ values = [], columnName }) {
  if (!columnName) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Text strong>Sample values:</Text>
        <Text type="secondary">No data found for this variable.</Text>
      </div>
    );
  }

  if (!values.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Text strong>Sample values:</Text>
        <Text type="secondary">No values available for this variable.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
      <Text strong>Sample:</Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.map((value, index) => (
          <Text code key={`${normalizePreviewValue(value)}-${index}`}>
            {normalizePreviewValue(value)}
          </Text>
        ))}
      </div>
    </div>
  );
}
