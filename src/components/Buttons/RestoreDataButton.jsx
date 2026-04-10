import { RollbackOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import { ORDER_VARIABLE } from "@/utils/Constants";
import BarButton from "@/components/ui/BarButton";
import { setQuarantineData } from "@/store/features/main";
import { setDataframe } from "@/store/features/dataframe";
import { notifyInfo, notifyWarning } from "@/notifications";

export default function RestoreDataButton() {
  const dispatch = useDispatch();
  const selection = useSelector(
    (state) => state.main.quarantineSelection,
  );
  const quarantineData = useSelector(
    (state) => state.main.quarantineData,
  );
  const dataframe = useSelector((state) => state.dataframe.dataframe);

  function resetQuarantineSelection() {
    if (!Array.isArray(selection) || selection.length === 0) {
      notifyInfo({
        message: "No rows selected",
        description: "Select one or more quarantined rows to restore them.",
      });
      return;
    }

    const quarantineRows = Array.isArray(quarantineData) ? quarantineData : [];
    const dataRows = Array.isArray(dataframe) ? dataframe : [];
    const selectedIds = new Set(selection.map((item) => item[ORDER_VARIABLE]));

    const restoredRows = quarantineRows.filter((item) =>
      selectedIds.has(item[ORDER_VARIABLE]),
    );
    if (restoredRows.length === 0) {
      notifyWarning({
        message: "No rows restored",
        description:
          "The selected rows are no longer available in quarantine data.",
      });
      return;
    }

    const nextQuarantineData = quarantineRows.filter(
      (item) => !selectedIds.has(item[ORDER_VARIABLE]),
    );
    const nextDataframe = [...restoredRows, ...dataRows];

    dispatch(setDataframe(nextDataframe));
    dispatch(setQuarantineData(nextQuarantineData));
  }

  return (
    <BarButton
      title="Restore selected rows from quarantine"
      onClick={resetQuarantineSelection}
      icon={<RollbackOutlined />}
    />
  );
}
