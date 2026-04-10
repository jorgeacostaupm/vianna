import React from "react";
import { useSelector, shallowEqual } from "react-redux";

import styles from "@/styles/Charts.module.css";
import {
  setQuarantineNavioUiState,
  setQuarantineSelection,
} from "@/store/features/main";
import Navio from "@/components/Navio";
import Bar from "./Bar";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import { updateConfig } from "@/store/features/main";

export default function Quarantine() {
  const dt = useSelector(
    (state) => state.main.quarantineData,
    shallowEqual
  );
  const selection = useSelector((state) => state.main.quarantineSelection);
  const navioUiState = useSelector((state) => state.main.quarantineNavioUiState);
  const quarantineVersion = useSelector((state) => state.main.quarantineVersion);
  const config = useSelector((state) => state.main.config);

  return (
    <div className={styles.viewContainer} data-view-container>
      <Bar title="Quarantine" config={config} updateConfig={updateConfig} />

      {dt && dt.length > 0 ? (
        <Navio
          config={config}
          data={dt}
          setSelection={setQuarantineSelection}
          selection={selection}
          navioUiState={navioUiState}
          setNavioUiState={setQuarantineNavioUiState}
          resetToken={quarantineVersion}
        />
      ) : (
        <NoDataPlaceholder message="No quarantine data available"></NoDataPlaceholder>
      )}
    </div>
  );
}
