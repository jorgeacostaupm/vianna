import { Popover } from "antd";

import AppSwitcher from "./AppSwitcher";
import sidebarStyles from "@/styles/modules/analysisSidebar.module.css";
import navigationStyles from "@/styles/modules/navigation.module.css";

export default function AnalysisSidebarHeader({ description = null }) {
  const logoSrc = "./app_name.svg";
  const logo = (
    <img
      src={logoSrc}
      alt="VIANNA"
      className={`${navigationStyles.appBarLogo} ${sidebarStyles.analysisSidebarLogo}`}
    />
  );

  return (
    <div className={sidebarStyles.analysisSidebarHeader}>
      {description ? (
        <Popover
          content={
            <div className={navigationStyles.appBarPopoverContent}>
              {description}
            </div>
          }
          trigger="hover"
          placement="rightTop"
        >
          {logo}
        </Popover>
      ) : (
        logo
      )}

      <AppSwitcher
        appIds={["overview", "hierarchy"]}
        showManagement={false}
        className={sidebarStyles.analysisSidebarQuickLinks}
        style={{ gap: "8px" }}
      />
    </div>
  );
}
