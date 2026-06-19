import { useDispatch, useSelector } from "react-redux";
import { WarningTwoTone } from "@ant-design/icons";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import { nullsToQuarantine } from "@/store/features/main";

export default function WarningNullButton() {
  const dispatch = useDispatch();
  const hasEmptyInSelection = useSelector(
    (state) => state.dataframe.hasEmptyValues,
  );

  const onNullQuarantine = () => {
    dispatch(nullsToQuarantine());
  };

  return (
    hasEmptyInSelection && (
      <AppButton
        preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
        tooltip="Current selection has missing values in visible columns. Click to send those records to Quarantine"
        onClick={onNullQuarantine}
        icon={<WarningTwoTone twoToneColor={["#000", "#f5dd07"]} />}
      />
    )
  );
}
