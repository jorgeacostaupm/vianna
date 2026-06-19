import React from "react";
import { useSelector } from "react-redux";

import AnalysisVariableSettings from "@/components/ui/AnalysisVariableSettings";
import {
  selectCorrelationAnalysisContext,
} from "@/store/features/main";
import {
  setGroupVar,
  setIdVar,
} from "@/store/features/correlation";

export default function CorrelationVariableSettings() {
  const context = useSelector(selectCorrelationAnalysisContext);

  return (
    <AnalysisVariableSettings
      context={context}
      fields={["idVar", "groupVar"]}
      actions={{
        idVar: setIdVar,
        groupVar: setGroupVar,
      }}
    />
  );
}
