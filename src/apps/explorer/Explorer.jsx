import React from "react";
import { useSelector } from "react-redux";

import Bar from "./Bar";
import Navio from "@/components/Navio";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import styles from "@/styles/Charts.module.css";
import { setNavioUiState, setSelection } from "@/store/features/dataframe";
import { updateConfig } from "@/store/features/dataframe";

export default function Explorer() {
  const dt = useSelector((state) => state.dataframe.dataframe);
  const config = useSelector((state) => state.dataframe.config);
  const selection = useSelector((state) => state.dataframe.selection);
  const navioUiState = useSelector((state) => state.dataframe.navioUiState);
  const version = useSelector((state) => state.dataframe.version);
  const filename = useSelector((state) => state.dataframe.filename);
  const title = filename ? `Overview · ${filename}` : "Overview";

  return (
    <div className={styles.viewContainer} data-view-container>
      <Bar title={title} config={config} updateConfig={updateConfig} />

      {dt && dt.length > 0 ? (
        <Navio
          data={dt}
          config={config}
          setSelection={setSelection}
          selection={selection}
          navioUiState={navioUiState}
          setNavioUiState={setNavioUiState}
          resetToken={version}
        />
      ) : (
        <NoDataPlaceholder></NoDataPlaceholder>
      )}
    </div>
  );
}
