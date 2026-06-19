import { buildAppUrl } from "@/navigation/appUrl";
import { getAppNavigation } from "@/navigation/apps";

export function openApp(appId, appOpenMode = "window") {
  const appConfig = getAppNavigation(appId);
  if (!appConfig) return;

  const targetName = appOpenMode === "tab" ? "_blank" : appConfig.windowName;
  const appWindow = window.open(buildAppUrl(appConfig.path), targetName);
  if (appWindow && typeof appWindow.focus === "function") {
    appWindow.focus();
  }
}
