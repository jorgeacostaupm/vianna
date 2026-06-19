import React, { useState } from "react";

import MainAppView from "./MainAppView";

export default function MainApp() {
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <MainAppView
      isDataManagementOpen={isDataManagementOpen}
      isSettingsOpen={isSettingsOpen}
      onDataManagementOpenChange={setIsDataManagementOpen}
      onSettingsOpenChange={setIsSettingsOpen}
    />
  );
}
