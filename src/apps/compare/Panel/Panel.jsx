import React from "react";

import AnalysisSidebar from "@/components/ui/AnalysisSidebar";
import AnalysisPanelSection from "@/components/ui/AnalysisPanelSection";
import VariableSelector from "./VariableSelector";
import AssumptionsTags from "./AssumptionsTags";
import TestSelector from "./TestSelector";
import GroupSettings from "../GroupSettings";
import { COMP_DESC } from "@/utils/constants";

export default function Panel({
  generateDistribution,
  generateTest,
  generateRanking,
}) {
  return (
    <AnalysisSidebar description={COMP_DESC}>
      <AnalysisPanelSection title="Analysis Context">
        <GroupSettings />
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
