import { useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import MainApp from "@/apps/main/MainApp";
import WelcomeApp from "@/apps/main/WelcomeApp";
import CompareApp from "@/apps/compare/CompareApp";
import EvolutionApp from "@/apps/evolution/EvolutionApp";
import CorrelationApp from "@/apps/correlation/CorrelationApp";
import QuarantineApp from "@/apps/quarantine/QuarantineApp";
import HierarchyApp from "@/apps/hierarchy/HierarchyApp";
import {
  APP_NAV,
  WELCOME_NAV,
  getAppNavigationByPathname,
  getAppTitleByPathname,
  getAppWindowNameByPathname,
} from "@/navigation/apps";
import { useDispatch } from "react-redux";
import { registerOpenApp } from "@/store/features/main";

function RoutedViews() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = getAppTitleByPathname(pathname);
    window.name = getAppWindowNameByPathname(pathname);
  }, [pathname]);

  useEffect(() => {
    const appId = getAppNavigationByPathname(pathname).id;
    if (appId !== WELCOME_NAV.id) dispatch(registerOpenApp(appId));
  }, [dispatch, pathname]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={WELCOME_NAV.path} replace />} />
      <Route path={WELCOME_NAV.path} element={<WelcomeApp />} />
      <Route path={APP_NAV.overview.path} element={<MainApp />} />
      <Route path={APP_NAV.hierarchy.path} element={<HierarchyApp />} />
      <Route path={APP_NAV.quarantine.path} element={<QuarantineApp />} />
      <Route path={APP_NAV.comparison.path} element={<CompareApp />} />
      <Route path={APP_NAV.evolution.path} element={<EvolutionApp />} />
      <Route path={APP_NAV.correlation.path} element={<CorrelationApp />} />

      <Route
        path="*"
        element={<Navigate to={WELCOME_NAV.path} replace />}
      />
    </Routes>
  );
}

export default function AppRoutes() {
  return (
    <HashRouter>
      <RoutedViews />
    </HashRouter>
  );
}
