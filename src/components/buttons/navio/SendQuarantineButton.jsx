import { useDispatch, useSelector } from "react-redux";
import { BugFilled } from "@ant-design/icons";

import { setQuarantineData } from "@/store/features/main";
import { setDataframe } from "@/store/features/dataframe";

import { ORDER_VARIABLE } from "@/utils/constants";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { useSelectionOrderValues } from "@/hooks/useSelectionRows";

export default function SendQuarantineButton() {
  const dispatch = useDispatch();
  const selectedOrderValues = useSelectionOrderValues();
  const data = useSelector((state) => state.dataframe.dataframe);
  const qData = useSelector((state) => state.main.quarantineData) || [];

  const onQuarantine = () => {
    const selectedOrderSet = new Set(selectedOrderValues);
    const newData = data?.filter(
      (item) => !selectedOrderSet.has(item?.[ORDER_VARIABLE]),
    );

    const newQData = data?.filter((item) =>
      selectedOrderSet.has(item?.[ORDER_VARIABLE]),
    );
    dispatch(setDataframe(newData));
    dispatch(setQuarantineData([...qData, ...newQData]));
  };

  return (
    <AppButton
      preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
      tooltip={"Send selection to Quarantine view"}
      onClick={onQuarantine}
      icon={<BugFilled />}
    />
  );
}
