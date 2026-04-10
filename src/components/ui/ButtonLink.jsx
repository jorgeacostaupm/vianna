import React from "react";
import { useSelector } from "react-redux";
import { Apps } from "@/utils/Constants";
import { selectAppOpenMode } from "@/store/features/main";
import PanelButton from "./PanelButton";

const APP_ROUTE_MAP = {
  overview: Apps.OVERVIEW,
  metadata: Apps.HIERARCHY,
  compare: Apps.COMPARE,
  correlation: Apps.CORRELATION,
  evolution: Apps.EVOLUTION,
  cantab: Apps.QUARANTINE,
};

const APP_WINDOW_TARGET_MAP = {
  overview: "vianna-app-overview",
  metadata: "vianna-app-metadata",
  compare: "vianna-app-compare",
  evolution: "vianna-app-evolution",
  correlation: "vianna-app-correlation",
  cantab: "vianna-app-cantab",
};

const buildAppUrl = (route) => {
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return route ? `${base}#/${route}` : `${base}#/`;
};

export default function LinkButton({ to, icon }) {
  const route = to || "";
  const routePath = route === "overview" ? "" : route;
  const appOpenMode = useSelector(selectAppOpenMode);
  const appName = APP_ROUTE_MAP[route] || route;
  const targetName =
    appOpenMode === "tab"
      ? "_blank"
      : APP_WINDOW_TARGET_MAP[route] || `vianna-app-${route}`;

  const tooltipTitle =
    appOpenMode === "tab"
      ? `Open ${appName} in a new tab`
      : `Open or focus ${appName}`;

  const handleOpenTab = () => {
    if (!route) return;

    window.dispatchEvent(new Event("app:close-tooltips"));
    const appWindow = window.open(buildAppUrl(routePath), targetName);
    if (appWindow && typeof appWindow.focus === "function") {
      appWindow.focus();
    }
  };

  return (
    <PanelButton
      title={tooltipTitle}
      ariaLabel={tooltipTitle}
      onClick={handleOpenTab}
      icon={icon}
    />
  );
}
