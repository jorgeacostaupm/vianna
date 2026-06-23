
import AnalysisSidebar from "@/components/ui/AnalysisSidebar";
import AnalysisPanelSection from "@/components/ui/AnalysisPanelSection";
import VariableSelector from "./VariableSelector";
import AssumptionsTags from "./AssumptionsTags";
import TestSelector from "./TestSelector";
import CompareVariableSettings from "../VariableSettings";
import { COMP_DESC } from "@/utils/constants";

export default function Panel({
  generateDistribution,
  generateTest,
  generateRanking,
  closeAllViews,
  hasViews = false,
}) {
  return (
    <AnalysisSidebar
      description={COMP_DESC}
      onCloseAllViews={closeAllViews}
      closeAllViewsDisabled={!hasViews}
    >
      <AnalysisPanelSection title="Analysis Context">
        <CompareVariableSettings />
      </AnalysisPanelSection>

      <AnalysisPanelSection title="Create Distribution View">
        <VariableSelector generateDistribution={generateDistribution} />
        <AssumptionsTags />
      </AnalysisPanelSection>

      <AnalysisPanelSection title="Run Statistical Tests">
        <TestSelector
          generateTest={generateTest}
          generateRanking={generateRanking}
        />
      </AnalysisPanelSection>
    </AnalysisSidebar>
  );
}
