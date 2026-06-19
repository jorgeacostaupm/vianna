
import AnalysisSidebarHeader from "./AnalysisSidebarHeader";
import sidebarStyles from "@/styles/modules/analysisSidebar.module.css";

export default function AnalysisSidebar({
  description = null,
  children,
}) {
  return (
    <div className={sidebarStyles.analysisSidebar}>
      <AnalysisSidebarHeader description={description} />

      <div className={sidebarStyles.analysisSidebarContent}>
        {children}
      </div>
    </div>
  );
}
