import React from "react";

import { setInitQuarantine } from "@/store/features/main";
import Quarantine from "./Quarantine";

import useRootStyles from "@/hooks/useRootStyles";
import { APP_NAME, Apps } from "@/utils/Constants";
import MainSidebar from "@/apps/main/MainSidebar";
import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";
import AppsButtons from "./AppsButtons";

const QUARANTINE_DESC =
  "The Quarantine view isolates selected records for focused inspection and recovery workflows without affecting the active exploration context.";

export default function QuarantineApp() {
  useRootStyles(setInitQuarantine, APP_NAME + " · " + Apps.QUARANTINE);

  return (
    <>
      <SingleViewAppLayout
        sidebar={
          <MainSidebar
            description={QUARANTINE_DESC}
            hideAriaLabel="Hide quarantine sidebar"
            showAriaLabel="Show quarantine sidebar"
          >
            <AppsButtons />
          </MainSidebar>
        }
        viewKey="quarantine"
      >
        <Quarantine />
      </SingleViewAppLayout>
    </>
  );
}
