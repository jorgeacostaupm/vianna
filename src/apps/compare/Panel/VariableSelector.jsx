import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AreaChartOutlined } from "@ant-design/icons";

import {
  selectCompareAnalysisContext,
  selectVars,
} from "@/store/features/main";
import { checkAssumptions, setSelectedVar } from "@/store/features/compare";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import AnalysisSelectField from "@/components/ui/AnalysisSelectField";

export default function VariableSelector({ generateDistribution }) {
  const dispatch = useDispatch();
  const variables = useSelector(selectVars);
  const selectedVar = useSelector((s) => s.compare.selectedVar);
  const { groupVar } = useSelector(selectCompareAnalysisContext);

  useEffect(() => {
    if (selectedVar && groupVar) {
      dispatch(checkAssumptions());
    }
  }, [selectedVar, groupVar, dispatch]);

  useEffect(() => {
    if (!variables.includes(selectedVar)) dispatch(setSelectedVar(null));
  }, [variables, selectedVar, dispatch]);

  return (
    <>
      <AnalysisSelectField
        label="Attribute"
        value={selectedVar ?? undefined}
        onChange={(v) => dispatch(setSelectedVar(v ?? null))}
        placeholder="Select attribute"
        options={variables}
        allowClear={true}
      />

      <AppButton
        preset={APP_BUTTON_PRESETS.ACTION}
        tooltip={
          groupVar
            ? "Add distribution plots for the selected attribute."
            : "Group attribute must be set."
        }
        tooltipPlacement={"bottom"}
        icon={<AreaChartOutlined />}
        onClick={() => selectedVar && generateDistribution(selectedVar)}
        disabled={!selectedVar || !groupVar}
      >
        Add view
      </AppButton>
    </>
  );
}
