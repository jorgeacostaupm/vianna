import panelStyles from "@/styles/SettingsPanel.module.css";
import SwitchControl from "@/components/ui/SwitchControl";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import GroupSettings from "../../GroupSettings";
import { IntervalSettings, MarkerSettings, SliderControl } from "./common";

export default function PairwiseSettings({ config, setConfig }) {
  const {
    isSync,
    showCaps,
    capSize,
    markerShape,
    markerSize,
    positiveOnly,
    sortDescending,
    yAxisLabelSpace,
  } = config;

  const disabled = !isSync;
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={panelStyles.panel}>
      <MarkerSettings
        markerShape={markerShape}
        markerSize={markerSize}
        disabled={disabled}
        update={update}
      />

      <IntervalSettings
        showCaps={showCaps}
        capSize={capSize}
        disabled={disabled}
        update={update}
      />

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <SwitchControl label="Positive effects only"
          size="small"
            checked={positiveOnly}
            disabled={disabled}
            onChange={(v) => update("positiveOnly", v)}
        />
        <SwitchControl label="Sort descending"
          size="small"
            checked={sortDescending}
            disabled={disabled}
            onChange={(v) => update("sortDescending", v)}
        />
        <SliderControl
          label="Y label space"
          valueLabel={`${Number.isFinite(yAxisLabelSpace) ? yAxisLabelSpace : 160}px`}
          min={100}
          max={320}
          step={5}
          value={Number.isFinite(yAxisLabelSpace) ? yAxisLabelSpace : 160}
          disabled={disabled}
          onChange={(v) => update("yAxisLabelSpace", v)}
        />
        <AxisLabelSizeControl
          config={config}
          setConfig={setConfig}
          disabled={disabled}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Groups</div>
        <GroupSettings />
      </div>
    </div>
  );
}
