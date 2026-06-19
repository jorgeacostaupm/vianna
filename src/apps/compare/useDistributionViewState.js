import { useMemo } from "react";
import { useSelector } from "react-redux";

import { ORDER_VARIABLE } from "@/utils/constants";
import { selectCompareAnalysisContext } from "@/store/features/main";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import useSelectionRows from "@/hooks/useSelectionRows";
import { extractOrderValues, uniqueColumns } from "@/utils/viewRecords";
import useDistributionData from "./Numeric/useDistributionData";

export default function useDistributionViewState({
  variable,
  sourceOrderValues = [],
  isSync,
  getData,
  isRowValid,
}) {
  const { groupVar, timeVar } = useSelector(selectCompareAnalysisContext);
  const attributes = useSelector((s) => s.metadata.attributes);

  const requiredVariables = useMemo(
    () => uniqueColumns([groupVar, variable, ORDER_VARIABLE]),
    [groupVar, variable],
  );

  const selection = useSelectionRows(requiredVariables);
  const [data] = useDistributionData(getData, variable, isSync, {
    groupVar,
    timeVar,
  });

  const liveOrderValues = useMemo(
    () =>
      extractOrderValues(selection, (row) =>
        isRowValid({
          row,
          groupVar,
          variable,
        }),
      ),
    [selection, groupVar, variable, isRowValid],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const variableDescription = useMemo(() => {
    const description = attributes?.find(
      (attr) => attr?.name === variable,
    )?.description;
    return typeof description === "string" ? description.trim() : "";
  }, [attributes, variable]);

  return {
    data,
    requiredVariables,
    recordOrders,
    variableDescription,
  };
}
