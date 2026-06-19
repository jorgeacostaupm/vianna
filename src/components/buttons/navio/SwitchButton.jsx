import { useDispatch, useSelector } from "react-redux";
import { RetweetOutlined } from "@ant-design/icons";

import { setDataframe } from "@/store/features/dataframe";
import { setQuarantineData } from "@/store/features/main";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

export default function SwitchButton() {
  const dispatch = useDispatch();
  const qData = useSelector((s) => s.main.quarantineData);
  const oData = useSelector((s) => s.dataframe.dataframe);

  function onClick() {
    dispatch(setDataframe(qData));
    dispatch(setQuarantineData(oData));
  }

  return (
    <AppButton
      preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
      tooltip={"Switch data between Quarantine and Explorer"}
      onClick={onClick}
      icon={<RetweetOutlined />}
    />
  );
}
