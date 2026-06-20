import { useDispatch, useSelector } from "react-redux";
import { registerOpenApp, selectAppOpenMode } from "@/store/features/main";
import { getAppNavigation } from "@/navigation/apps";
import { openApp } from "@/navigation/openApp";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

export default function GoToAppButton({ to, tooltipPlacement = "top" }) {
  const dispatch = useDispatch();
  const appConfig = getAppNavigation(to);
  const Icon = appConfig?.icon;
  const appOpenMode = useSelector(selectAppOpenMode);
  if (!appConfig || !Icon) return null;
  const appName = appConfig.label;

  const tooltipTitle =
    appOpenMode === "tab"
      ? `Open ${appName} in a new tab`
      : `Open or focus ${appName}`;

  const handleOpenTab = () => {
    dispatch(registerOpenApp(to));
    openApp(to, appOpenMode);
  };

  return (
    <AppButton
      preset={APP_BUTTON_PRESETS.PANEL_ICON}
      tooltip={tooltipTitle}
      tooltipPlacement={tooltipPlacement}
      ariaLabel={tooltipTitle}
      onClick={handleOpenTab}
      icon={<Icon />}
    />
  );
}
