import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import MainAppView from "./MainAppView";

export default function MainApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(
    () => Boolean(location.state?.openDataManagement),
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!location.state?.openDataManagement) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  return (
    <MainAppView
      isDataManagementOpen={isDataManagementOpen}
      isSettingsOpen={isSettingsOpen}
      onDataManagementOpenChange={setIsDataManagementOpen}
      onSettingsOpenChange={setIsSettingsOpen}
    />
  );
}
