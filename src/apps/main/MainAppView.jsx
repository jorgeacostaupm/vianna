import React from "react";

import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";

import Explorer from "../explorer";
import AppsButtons from "./AppsButtons";
import MainSidebar from "./MainSidebar";

export default function MainAppView({
  isDataManagementOpen,
  isSettingsOpen,
  onDataManagementOpenChange,
  onSettingsOpenChange,
}) {
  const sidebar = (
    <MainSidebar>
      <AppsButtons
        dataManagementOpen={isDataManagementOpen}
        onDataManagementOpenChange={onDataManagementOpenChange}
        settingsOpen={isSettingsOpen}
        onSettingsOpenChange={onSettingsOpenChange}
      />
    </MainSidebar>
  );

  return (
    <SingleViewAppLayout sidebar={sidebar} viewKey="explorer">
      <Explorer />
    </SingleViewAppLayout>
  );
}
