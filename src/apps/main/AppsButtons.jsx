import { useSelector } from "react-redux";

import AppSwitcher from "@/components/ui/AppSwitcher";

const APPS_WITH_DATA = ["comparison", "evolution", "correlation", "quarantine"];

export default function AppsButtons({
  dataManagementOpen,
  onDataManagementOpenChange,
  settingsOpen,
  onSettingsOpenChange,
}) {
  const dt = useSelector((state) => state.dataframe.dataframe);
  const appIds = dt ? ["hierarchy", ...APPS_WITH_DATA] : ["hierarchy"];

  return (
    <AppSwitcher
      appIds={appIds}
      managementAtEnd
      dataManagementButtonProps={{
        open: dataManagementOpen,
        onOpenChange: onDataManagementOpenChange,
      }}
      settingsButtonProps={{
        open: settingsOpen,
        onOpenChange: onSettingsOpenChange,
      }}
    />
  );
}
