import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Button, Radio } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { selectNavioVars } from "@/store/features/main";
import { generateFileName } from "@/utils/functions";
import buttonStyles from "@/styles/Buttons.module.css";
import PopoverButton from "@/components/ui/PopoverButton";
import styles from "./ExportButton.module.css";

function ExportOptions() {
  const fullData = useSelector((state) => state.dataframe.dataframe);
  const selectionRows = useSelector(
    (state) => state.dataframe.selection,
  );
  const visibleVariables = useSelector(selectNavioVars);
  const [includeAllVars, setIncludeAllVars] = useState(false);

  const buildCsv = (rows, includeAllVars = false) => {
    if (!rows || rows.length === 0) return "";

    const keys = includeAllVars ? Object.keys(rows[0]) : visibleVariables;
    const csvRows = [keys.join(",")];

    rows.forEach((obj) => {
      const values = keys.map((key) => obj[key]);
      csvRows.push(values.join(","));
    });

    return csvRows.join("\n");
  };

  const downloadCsv = (rows, name, includeAllVars = false) => {
    const csvData = buildCsv(rows, includeAllVars);
    const blob = new Blob([csvData], { type: "text/csv" });
    const href = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = href;
    downloadLink.download = generateFileName(name);
    downloadLink.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Button
          className={`${buttonStyles.myButton} ${styles.exportButton}`}
          onClick={() =>
            downloadCsv(
              selectionRows,
              includeAllVars ? "selection_all_vars" : "selection_visible_vars",
              includeAllVars,
            )
          }
        >
          Selection
        </Button>
        <Button
          className={`${buttonStyles.myButton} ${styles.exportButton}`}
          onClick={() =>
            downloadCsv(
              fullData,
              includeAllVars ? "all_all_vars" : "all_visible_vars",
              includeAllVars,
            )
          }
        >
          All data
        </Button>
      </div>

      <div className={styles.row}>
        <Radio.Group
          value={includeAllVars ? "all" : "visible"}
          onChange={(event) => setIncludeAllVars(event.target.value === "all")}
          className={styles.toggle}
        >
          <Radio.Button value="visible">Visible variables</Radio.Button>
          <Radio.Button value="all">All variables</Radio.Button>
        </Radio.Group>
      </div>
    </div>
  );
}

export default function ExportButton() {
  return (
    <PopoverButton
      content={<ExportOptions />}
      icon={<DownloadOutlined />}
      title={"Export data"}
    />
  );
}
