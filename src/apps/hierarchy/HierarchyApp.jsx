import React from "react";

import HierarchyEditor from "./editor/HierarchyEditor";
import { Apps, APP_NAME, HIER_DESC } from "@/utils/Constants";
import { setInit } from "@/store/features/metadata";
import useRootStyles from "@/hooks/useRootStyles";
import AppsButtons from "./AppsButtons";
import MainSidebar from "../main/MainSidebar";
import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";

export default function HierarchyApp() {
  useRootStyles(setInit, APP_NAME + " · " + Apps.HIERARCHY);

  return (
    <>
      <SingleViewAppLayout
        sidebar={
          <MainSidebar
            description={HIER_DESC}
            hideAriaLabel="Hide hierarchy sidebar"
            showAriaLabel="Show hierarchy sidebar"
          >
            <AppsButtons />
          </MainSidebar>
        }
        viewKey="hierarchy"
      >
        <HierarchyEditor />
      </SingleViewAppLayout>
    </>
  );
}
