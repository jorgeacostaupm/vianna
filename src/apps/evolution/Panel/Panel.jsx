
import AnalysisSidebar from "@/components/ui/AnalysisSidebar";
import AnalysisPanelSection from "@/components/ui/AnalysisPanelSection";
import VariableSelector from "./VariableSelector";
import EvolutionVariableSettings from "../VariableSettings";
import { EVO_DESC } from "@/utils/constants";

export default function Panel(props) {
  const { generateEvolution } = props;

  return (
    <AnalysisSidebar description={EVO_DESC}>
      <AnalysisPanelSection title="Analysis Context">
        <EvolutionVariableSettings />
      </AnalysisPanelSection>

      <AnalysisPanelSection title="Create Evolution View">
        <VariableSelector generateEvolution={generateEvolution} />
      </AnalysisPanelSection>
    </AnalysisSidebar>
  );
}
