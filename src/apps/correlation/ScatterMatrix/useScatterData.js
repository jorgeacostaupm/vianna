import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";

import { notifyError } from "@/components/notifications";
import { selectCorrelationAnalysisContext } from "@/store/features/main";
import useSelectionRows from "@/hooks/useSelectionRows";
import { ORDER_VARIABLE } from "@/utils/constants";
import { uniqueColumns } from "@/utils/viewRecords";

export default function useScatterData(isSync = true, params) {
  const [data, setData] = useState([]);
  const { idVar } = useSelector(selectCorrelationAnalysisContext);
  const selectionColumns = useMemo(
    () =>
      uniqueColumns([
        params?.groupVar,
        ...(params?.variables || []),
        idVar,
        ORDER_VARIABLE,
      ]),
    [
      params?.groupVar,
      Array.isArray(params?.variables) ? params.variables.join("|") : "",
      idVar,
    ],
  );
  const selection = useSelectionRows(selectionColumns);

  useEffect(() => {
    if (!isSync) return;

    try {
      const { variables } = params;
      const res = variables.length >= 2 ? selection : null;
      setData(res);
    } catch (error) {
      notifyError({
        message: "Could not prepare scatter matrix data",
        error,
        fallback: "Failed to prepare data for the scatter matrix.",
      });
      setData(null);
    }
  }, [isSync, params, selection]);

  return [data, setData];
}
