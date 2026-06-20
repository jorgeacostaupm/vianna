import { Provider } from "react-redux";
import { ConfigProvider } from "antd";

import AppRoutes from "./navigation/Routes";
import { theme } from "./theme";
import store from "@/store/store";
import NotificationHost from "@/components/notifications/ui/NotificationHost";

export default function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={theme} wave={{ disabled: true }}>
        <NotificationHost />
        <AppRoutes />
      </ConfigProvider>
    </Provider>
  );
}
