import { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { Provider, useSelector } from "react-redux";
import { ConfigProvider } from "antd";

import AppRoutes from "./core/Routes";
import { createTheme } from "./theme";
import store, { initializeStoreSync } from "@/store/store";
import NotificationHost from "@/notifications/ui/NotificationHost";
import { applyBrandCssVariables, sanitizeBrandColor } from "@/utils/appTheme";
import { MAIN_CONFIG_DEFAULTS } from "@/store/features/main/configDefaults";

import "./styles/index.css";
import "./styles/charts.css";

function AppShell() {
  const configuredBrandColor = useSelector(
    (state) => state.main.config?.appBrandColor,
  );
  const brandColor = sanitizeBrandColor(
    configuredBrandColor || MAIN_CONFIG_DEFAULTS.appBrandColor,
  );

  const theme = useMemo(() => createTheme(brandColor), [brandColor]);

  useEffect(() => {
    applyBrandCssVariables(brandColor);
  }, [brandColor]);

  return (
    <ConfigProvider theme={theme}>
      <NotificationHost />
      <AppRoutes></AppRoutes>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppShell />
    </Provider>
  );
}

const bootstrap = async () => {
  try {
    await initializeStoreSync();
  } catch (error) {
    console.error("Store synchronization bootstrap failed:", error);
  }

  createRoot(document.getElementById("root")).render(<App />);
};

bootstrap();
