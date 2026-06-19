import React from "react";
import { useSelector } from "react-redux";

import AnalysisVariableSettings from "@/components/ui/AnalysisVariableSettings";
import {
  selectEvolutionAnalysisContext,
} from "@/store/features/main";
import {
  setGroupVar,
  setIdVar,
  setTimeVar,
} from "@/store/features/evolution";
import TimeOrderModal from "./Panel/TimeOrderModal";

export default function EvolutionVariableSettings() {
  const context = useSelector(selectEvolutionAnalysisContext);

  return (
    <AnalysisVariableSettings
      context={context}
      fields={["idVar", "groupVar", "timeVar"]}
      actions={{
        idVar: setIdVar,
        groupVar: setGroupVar,
        timeVar: setTimeVar,
      }}
      renderFieldExtra={(field) =>
        field === "timeVar" ? <TimeOrderModal timeVar={context.timeVar} /> : null
      }
    />
  );
}
