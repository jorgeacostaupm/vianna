import { CloseOutlined } from "@ant-design/icons";

import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

import BaseBar from "./BaseBar";

export default function NodeBar({ title, remove }) {
  return (
    <BaseBar title={title} draggable={false}>
      {remove && (
        <AppButton
          preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
          tooltip="Close"
          icon={<CloseOutlined />}
          onClick={remove}
        />
      )}
    </BaseBar>
  );
}
