import { CloseSquareOutlined } from "@ant-design/icons";

import {
  AppButton,
  APP_BUTTON_PRESETS,
  APP_BUTTON_VARIANTS,
} from "@/components/buttons/core";
import AnalysisSidebarHeader from "./AnalysisSidebarHeader";
import sidebarStyles from "@/styles/modules/analysisSidebar.module.css";

export default function AnalysisSidebar({
  description = null,
  children,
  onCloseAllViews,
  closeAllViewsDisabled = false,
}) {
  return (
    <div className={sidebarStyles.analysisSidebar}>
      <AnalysisSidebarHeader description={description} />

      <div className={sidebarStyles.analysisSidebarContent}>{children}</div>

      {onCloseAllViews ? (
        <div className={sidebarStyles.analysisSidebarFooter}>
          <AppButton
            preset={APP_BUTTON_PRESETS.ACTION}
            variant={APP_BUTTON_VARIANTS.TOOLBAR}
            block
            disabled={closeAllViewsDisabled}
            icon={<CloseSquareOutlined />}
            onClick={onCloseAllViews}
          >
            Close all views
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
