import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import { notifyError } from "@/components/notifications";
import { selectCompareAnalysisContext, selectVars } from "@/store/features/main";
import useSelectionRows from "@/hooks/useSelectionRows";
import { uniqueColumns } from "@/utils/viewRecords";

export default function useDistributionData(
  getData,
  variable,
  isSync = true,
  { groupVar = null, timeVar = null } = {}
) {
  const [data, setData] = useState([]);
  const { idVar } = useSelector(selectCompareAnalysisContext);
  const variables = useSelector(selectVars);
  const selectionColumns = useMemo(
    () => uniqueColumns([groupVar, variable, timeVar, idVar]),
    [groupVar, variable, timeVar, idVar],
  );
  const selection = useSelectionRows(selectionColumns);

  useEffect(() => {
    if (!isSync || !variables.includes(variable) || !groupVar) return;

    try {
      const result = getData(selection, variable, groupVar, timeVar, idVar);
      setData(result);
    } catch (error) {
      notifyError({
        message: "Could not compute distribution data",
        error,
        fallback: "Distribution calculation failed.",
      });
      setData(null);
    }
  }, [isSync, variable, selection, groupVar, timeVar, idVar, variables, getData]);

  return [data, setData];
}
