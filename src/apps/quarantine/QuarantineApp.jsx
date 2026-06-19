
import Quarantine from "./Quarantine";
import { QUARANTINE_DESC } from "@/utils/constants";
import MainSidebar from "@/apps/main/MainSidebar";
import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";
import AppsButtons from "../hierarchy/AppsButtons";

export default function QuarantineApp() {
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
