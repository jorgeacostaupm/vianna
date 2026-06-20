import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LineChartOutlined } from "@ant-design/icons";

import { setSelectedVar } from "@/store/features/evolution";
import {
  selectEvolutionAnalysisContext,
  selectNumericVars,
} from "@/store/features/main";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import AnalysisSelectField from "@/components/ui/AnalysisSelectField";

export default function VariableSelector({ generateEvolution }) {
  const dispatch = useDispatch();
  const selectedVar = useSelector((s) => s.evolution.selectedVar);
  const { groupVar, timeVar } = useSelector(selectEvolutionAnalysisContext);
  const variables = useSelector(selectNumericVars);

  useEffect(() => {
    if (!variables.includes(selectedVar)) dispatch(setSelectedVar(null));
  }, [variables, selectedVar, dispatch]);

  return (
    <>
      <AnalysisSelectField
        label="Variable"
        value={selectedVar ?? undefined}
        onChange={(v) => dispatch(setSelectedVar(v ?? null))}
        placeholder="Select variable"
        options={variables}
        allowClear={true}
      />

      <AppButton
        preset={APP_BUTTON_PRESETS.ACTION}
        tooltip={
          groupVar && timeVar
            ? "Add evolution plot for the selected variable."
            : "Group and Time variables must be set."
        }
        icon={<LineChartOutlined />}
        onClick={() => selectedVar && generateEvolution(selectedVar)}
        disabled={!selectedVar || !groupVar || !timeVar}
      >
        Add view
      </AppButton>
    </>
  );
}
