
import HierarchyEditor from "./editor/HierarchyEditor";
import { HIER_DESC } from "@/utils/constants";
import AppsButtons from "./AppsButtons";
import MainSidebar from "../main/MainSidebar";
import SingleViewAppLayout from "@/components/ui/SingleViewAppLayout";

export default function HierarchyApp() {
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
