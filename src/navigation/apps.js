import { APP_NAME, Apps } from "../utils/constants.js";
import {
  HomeOutlined,
  PartitionOutlined,
  BarChartOutlined,
  DotChartOutlined,
  LineChartOutlined,
  BugFilled,
} from "@ant-design/icons";

export const APP_NAV = Object.freeze({
  overview: {
    id: "overview",
    label: Apps.OVERVIEW,
    title: APP_NAME,
    path: "overview",
    windowName: "vianna-app-overview",
    icon: HomeOutlined,
  },
  hierarchy: {
    id: "hierarchy",
    label: Apps.HIERARCHY,
    title: `${APP_NAME} · ${Apps.HIERARCHY}`,
    path: "hierarchy",
    windowName: "vianna-app-hierarchy",
    icon: PartitionOutlined,
  },
  comparison: {
    id: "comparison",
    label: Apps.COMPARE,
    title: `${APP_NAME} · ${Apps.COMPARE}`,
    path: "comparison",
    windowName: "vianna-app-comparison",
    icon: BarChartOutlined,
  },
  correlation: {
    id: "correlation",
    label: Apps.CORRELATION,
    title: `${APP_NAME} · ${Apps.CORRELATION}`,
    path: "correlation",
    windowName: "vianna-app-correlation",
    icon: DotChartOutlined,
  },
  evolution: {
    id: "evolution",
    label: Apps.EVOLUTION,
    title: `${APP_NAME} · ${Apps.EVOLUTION}`,
    path: "evolution",
    windowName: "vianna-app-evolution",
    icon: LineChartOutlined,
  },
  quarantine: {
    id: "quarantine",
    label: Apps.QUARANTINE,
    title: `${APP_NAME} · ${Apps.QUARANTINE}`,
    path: "quarantine",
    windowName: "vianna-app-quarantine",
    icon: BugFilled,
  },
});

export const WELCOME_NAV = Object.freeze({
  id: "welcome",
  label: "Welcome",
  title: APP_NAME,
  path: "welcome",
  windowName: "vianna-welcome",
});

const toPathname = (path) => {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath || normalizedPath === "/") {
    return "/";
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
};

const normalizePathname = (pathname) => {
  const normalizedPathname = toPathname(pathname);
  if (normalizedPathname !== "/" && normalizedPathname.endsWith("/")) {
    return normalizedPathname.slice(0, -1);
  }

  return normalizedPathname;
};

const APP_BY_PATHNAME = Object.freeze(
  [WELCOME_NAV, ...Object.values(APP_NAV)].reduce((acc, app) => {
    acc[toPathname(app.path)] = app;
    return acc;
  }, {}),
);

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function resolveAppId(value) {
  const key = normalize(value);
  return APP_NAV[key] ? key : null;
}

export function getAppNavigation(value) {
  const appId = resolveAppId(value);
  return appId ? APP_NAV[appId] : null;
}

export function getAppNavigationByPathname(pathname) {
  return APP_BY_PATHNAME[normalizePathname(pathname)] || WELCOME_NAV;
}

export function getAppTitleByPathname(pathname) {
  const app = getAppNavigationByPathname(pathname);
  return app.title || APP_NAME;
}

export function getAppWindowNameByPathname(pathname) {
  const app = getAppNavigationByPathname(pathname);
  return app.windowName || APP_NAV.overview.windowName;
}
