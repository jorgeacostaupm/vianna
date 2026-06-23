import { useMemo } from "react";
import { useSelector } from "react-redux";

import Bar from "./Bar";
import Navio from "@/components/Navio";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import useSelectionRows from "@/hooks/useSelectionRows";
import styles from "@/styles/Charts.module.css";
import { setNavioUiState, setSelection } from "@/store/features/dataframe";
import { selectDefaultAnalysisContext } from "@/store/features/main";
import { updateConfig } from "@/store/features/dataframe";
import { getDistinctValueCount } from "@/utils/dataSummary";

export default function Explorer() {
  const dt = useSelector((state) => state.dataframe.dataframe);
  const config = useSelector((state) => state.dataframe.config);
  const navioUiState = useSelector((state) => state.dataframe.navioUiState);
  const version = useSelector((state) => state.dataframe.version);
  const filename = useSelector((state) => state.dataframe.filename);
  const { idVar } = useSelector(selectDefaultAnalysisContext);
  const selectionColumns = useMemo(() => (idVar ? [idVar] : []), [idVar]);
  const selectionRows = useSelectionRows(selectionColumns);
  const title = filename ? `Overview · ${filename}` : "Overview";
  const selectedSubjectCount = useMemo(() => {
    if (!idVar) return null;
    return getDistinctValueCount(selectionRows, idVar) ?? 0;
  }, [idVar, selectionRows]);
  const totalSubjectCount = useMemo(() => {
    if (!idVar) return null;
    return getDistinctValueCount(dt, idVar);
  }, [dt, idVar]);

  return (
    <div className={styles.viewContainer} data-view-container>
      <Bar title={title} config={config} updateConfig={updateConfig} />
      <OverviewSubjectCount
        selected={selectedSubjectCount}
        total={totalSubjectCount}
      />

      {dt && dt.length > 0 ? (
        <Navio
          data={dt}
          config={config}
          setSelection={setSelection}
          selectionPayloadMode="orderValues"
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

function OverviewSubjectCount({ selected, total }) {
  if (selected == null || total == null) return null;

  const label = `${selected} / ${total} subjects`;

  return (
    <div className={styles.viewRecordCount} aria-label={label} title={label}>
      {label}
    </div>
  );
}
