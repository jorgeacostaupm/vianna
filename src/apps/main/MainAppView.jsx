import React from "react";

import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";

import Explorer from "../explorer";
import AppsButtons from "./AppsButtons";
import InitialDataChoice from "./InitialDataChoice";
import MainSidebar from "./MainSidebar";

export default function MainAppView({
  shouldShowInitialChoice,
  isLoadingDemo,
  isDataManagementOpen,
  onDataManagementOpenChange,
  onLoadDemo,
  onLoadMyData,
  onContinueWithoutData,
}) {
  const sidebar = shouldShowInitialChoice ? null : (
    <MainSidebar>
      <AppsButtons
        dataManagementOpen={isDataManagementOpen}
        onDataManagementOpenChange={onDataManagementOpenChange}
      />
    </MainSidebar>
  );

  return (
    <SingleViewAppLayout sidebar={sidebar} viewKey="explorer">
      {shouldShowInitialChoice ? (
        <InitialDataChoice
          isLoadingDemo={isLoadingDemo}
          onLoadDemo={onLoadDemo}
          onLoadMyData={onLoadMyData}
          onContinueWithoutData={onContinueWithoutData}
        />
      ) : (
        <Explorer />
      )}
    </SingleViewAppLayout>
  );
}
