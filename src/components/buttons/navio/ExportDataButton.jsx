import { useSelector } from "react-redux";
import { DownloadOutlined } from "@ant-design/icons";
import Papa from "papaparse";

import { selectSelection } from "@/store/features/dataframe";
import { generateFileName } from "@/utils/functions";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

export default function ExportDataButton() {
  const selectionRows = useSelector(selectSelection);

  const exportSelection = () => {
    if (!selectionRows.length) return;
    const csvData = Papa.unparse(selectionRows);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = href;
    downloadLink.download = `${generateFileName("selection_visible_vars")}.csv`;
    downloadLink.click();
    URL.revokeObjectURL(href);
  };

  return (
    <AppButton
      preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
      tooltip="Export current selection"
      icon={<DownloadOutlined />}
      onClick={exportSelection}
      disabled={!selectionRows.length}
      ariaLabel="Export current selection"
    />
  );
}
