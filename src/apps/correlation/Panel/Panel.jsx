
import AnalysisSidebar from "@/components/ui/AnalysisSidebar";
import AnalysisPanelSection from "@/components/ui/AnalysisPanelSection";
import ChartSelector from "./ChartSelector";
import CorrelationVariableSettings from "../VariableSettings";
import { CORR_DESC } from "@/utils/constants";

export default function Panel({ addChart, closeAllViews, hasViews = false }) {
  return (
    <AnalysisSidebar
      description={CORR_DESC}
      onCloseAllViews={closeAllViews}
      closeAllViewsDisabled={!hasViews}
    >
      <AnalysisPanelSection title="Analysis Context">
        <CorrelationVariableSettings />
      </AnalysisPanelSection>

      <AnalysisPanelSection title="Create Correlation View">
        <ChartSelector onAddChart={addChart} />
      </AnalysisPanelSection>
    </AnalysisSidebar>
  );
}
