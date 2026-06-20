import React, { useState } from "react";
import { AreaChartOutlined } from "@ant-design/icons";

import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import AnalysisSelectField from "@/components/ui/AnalysisSelectField";
import registry from "../registry";

export default function ChartSelector({ onAddChart }) {
  const [chart, setChart] = useState(null);

  return (
    <>
      <AnalysisSelectField
        label="Chart type"
        value={chart ?? undefined}
        onChange={(v) => setChart(v ?? null)}
        placeholder="Select chart type"
        options={Object.keys(registry)}
        notFoundContent="No charts found"
        allowClear={true}
      />

      <AppButton
        preset={APP_BUTTON_PRESETS.ACTION}
        tooltip={"Add the selected correlation chart"}
        icon={<AreaChartOutlined />}
        onClick={() => {
          if (chart) onAddChart(chart);
        }}
        disabled={!chart}
      >
        Add view
      </AppButton>
    </>
  );
}
