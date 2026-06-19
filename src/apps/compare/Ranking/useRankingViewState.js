import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import {
  selectCategoricalVars,
  selectCompareAnalysisContext,
} from "@/store/features/main";
import { computeRankingData } from "@/utils/functions";
import { ORDER_VARIABLE } from "@/utils/constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import { notifyError, notifyWarning } from "@/components/notifications";
import { extractOrderValues, uniqueColumns } from "@/utils/viewRecords";
import useSelectionRows from "@/hooks/useSelectionRows";

export default function useRankingViewState({
  test,
  isSync,
  sourceOrderValues = [],
  numericVars,
}) {
  const skippedSignatureRef = useRef("");
  const { groupVar } = useSelector(selectCompareAnalysisContext);
  const categoricVars = useSelector(selectCategoricalVars);
  const hierarchy = useSelector((state) => state.metadata.attributes);

  const selectionColumns = useMemo(
    () =>
      uniqueColumns([
        groupVar,
        ...numericVars,
        ...categoricVars,
        ORDER_VARIABLE,
      ]),
    [groupVar, numericVars, categoricVars],
  );
  const selection = useSelectionRows(selectionColumns);

  const [data, setData] = useState(null);

  const liveOrderValues = useMemo(
    () => extractOrderValues(selection, (row) => row?.[groupVar] != null),
    [selection, groupVar],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = useMemo(() => {
    const attemptedVariables = [
      ...(data?.data || []).map((item) => item?.variable),
      ...(data?.skippedVariables || []).map((item) => item?.variable),
    ];
    return uniqueColumns([groupVar, ...attemptedVariables, ORDER_VARIABLE]);
  }, [groupVar, data]);

  useEffect(() => {
    if (!test || !groupVar || !isSync) {
      setData(null);
      skippedSignatureRef.current = "";
      return;
    }

    try {
      const result = computeRankingData({
        test,
        groupVar,
        selection,
        numericVars,
        categoricVars,
        hierarchy,
      });
      setData(result);

      const skipped = result?.skippedVariables ?? [];
      if (!skipped.length) {
        skippedSignatureRef.current = "";
        return;
      }

      const signature = skipped
        .map(({ variable, reason }) => `${variable}:${reason}`)
        .join("|");
      if (signature === skippedSignatureRef.current) {
        return;
      }
      skippedSignatureRef.current = signature;

      const maxItems = 8;
      const details = skipped
        .slice(0, maxItems)
        .map(({ variable, reason }) => `${variable}: ${reason}`)
        .join("\n");
      const extra =
        skipped.length > maxItems
          ? `\n...and ${skipped.length - maxItems} more.`
          : "";

      notifyWarning({
        message: "Ranking generated with skipped variables",
        description: `${skipped.length} variable(s) were excluded:\n${details}${extra}`,
        placement: "bottomRight",
        source: "test",
      });
    } catch (error) {
      console.error(error);
      notifyError({
        message: "Could not compute ranking data",
        error: error.message || String(error),
        fallback: "Ranking calculation failed.",
        placement: "bottomRight",
        source: "test",
      });
      setData(null);
      skippedSignatureRef.current = "";
    }
  }, [
    selection,
    groupVar,
    numericVars,
    categoricVars,
    test,
    isSync,
    hierarchy,
  ]);

  return {
    data,
    recordOrders,
    requiredVariables,
  };
}
