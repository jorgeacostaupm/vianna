import { Modal, Typography } from "antd";

import { PREVIEW_LIMIT, PREVIEW_ROW_COLUMN } from "../nodeMenuConstants";
import { normalizePreviewValue } from "../nodeMenuUtils";

const { Text } = Typography;

export default function AggregationPreviewModal({
  open,
  onClose,
  previewRows,
  previewColumns,
  previewError,
}) {
  return (
    <Modal
      title={`Aggregation Preview (first ${PREVIEW_LIMIT} rows)`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {previewError ? (
        <Text type="danger">{previewError}</Text>
      ) : previewRows.length === 0 ? (
        <Text type="secondary">No preview rows available.</Text>
      ) : (
        <div
          style={{
            maxHeight: 280,
            overflow: "auto",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {previewColumns.map((column) => (
                  <th
                    key={column}
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "var(--color-surface-muted)",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderBottom: "1px solid var(--color-border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column === PREVIEW_ROW_COLUMN ? "#" : column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={`preview-row-${rowIndex}`}>
                  {previewColumns.map((column) => (
                    <td
                      key={`${column}-${rowIndex}`}
                      style={{
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--color-border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {normalizePreviewValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
        This preview does not save anything and runs only on the first{" "}
        {PREVIEW_LIMIT} rows.
      </Text>
    </Modal>
  );
}
