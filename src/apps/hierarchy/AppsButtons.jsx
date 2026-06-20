import { useSelector } from "react-redux";

import AppSwitcher from "@/components/ui/AppSwitcher";

const APPS_WITH_DATA = ["comparison", "evolution", "correlation", "quarantine"];

export default function AppsButtons() {
  const dt = useSelector((state) => state.dataframe.dataframe);
  const appIds = dt ? ["overview", ...APPS_WITH_DATA] : ["overview"];

  return <AppSwitcher appIds={appIds} managementAtEnd stackedTooltipPlacement />;
}
