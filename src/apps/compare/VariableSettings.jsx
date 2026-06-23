import { useSelector } from "react-redux";

import AnalysisVariableSettings from "@/components/ui/AnalysisVariableSettings";
import { selectCompareAnalysisContext } from "@/store/features/main";
import { setGroupVar } from "@/store/features/compare";

export default function CompareVariableSettings() {
  const context = useSelector(selectCompareAnalysisContext);

  return (
    <AnalysisVariableSettings
      context={context}
      fields={["groupVar"]}
      variant="cards"
      actions={{
        groupVar: setGroupVar,
      }}
    />
  );
}
