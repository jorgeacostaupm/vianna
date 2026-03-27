import React from "react";
import {
  Checkbox,
  Switch,
  Slider,
  Typography,
  Select,
  Popover,
  InputNumber,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import panelStyles from "@/styles/SettingsPanel.module.css";
import evolutionTests from "@/utils/evolution_tests";

const { Text } = Typography;

export default function Settings({
  mode = "series-appearance",
  config,
  setConfig,
  availableTimes = [],
  availableGroups = [],
  variable,
  idVar,
  timeVar,
  groupVar,
  variableOptions = [],
  varTypes = {},
}) {
  const {
    showObs,
    showMeans,
    showOverallMean,
    showStds,
    showCIs,
    showLmmFit,
    showLmmCI,
    showComplete,
    showIncomplete,
    lmmReferenceGroup,
    forceDiscreteAggregatedMode,
    ratioNodeScale,
    ratioEdgeScale,
    ratioNodeMinPx,
    ratioNodeMaxPx,
    ratioEdgeMinPx,
    ratioEdgeMaxPx,
    lmmCovariates = [],
    lmmIncludeInteraction,
    lmmTimeCoding,
    meanPointSize,
    meanAsBoxplot,
    subjectPointSize,
    meanStrokeWidth,
    subjectStrokeWidth,
    showLegend,
    showGrid,
    showGridBehindAll,
    testIds = [],
    testTimeFrom,
    testTimeTo,
  } = config;
  const lmmSelected = testIds.includes("lmm-random-intercept");
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));
  const toggleTest = (testId, checked) => {
    const next = checked
      ? [...new Set([...(testIds || []), testId])]
      : (testIds || []).filter((id) => id !== testId);
    update("testIds", next);
  };

  const timeOptions = availableTimes.map((t) => ({
    label: t,
    value: t,
  }));
  const groupOptions = [
    { label: "All", value: "All" },
    ...availableGroups
      .filter((group) => group !== "All")
      .map((group) => ({
        label: group,
        value: group,
      })),
  ];
  const blockedCovariates = new Set(
    [variable, idVar, timeVar, groupVar].filter(Boolean),
  );
  const covariateOptions = (variableOptions || [])
    .filter((name) => !blockedCovariates.has(name))
    .map((name) => {
      const type = varTypes?.[name] === "number" ? "num" : "cat";
      return {
        label: `${name} (${type})`,
        value: name,
      };
    });
  const timeIsNumeric = varTypes?.[timeVar] === "number";
  const timeCodingOptions = [
    { label: "ordered-index", value: "ordered-index" },
    { label: "continuous", value: "continuous", disabled: !timeIsNumeric },
  ];
  const interactionDisabled = !groupVar;
  const lmmTestId = "lmm-random-intercept";
  const baseTests = evolutionTests.filter(
    (test) => test.variant !== "paired" && test.id !== lmmTestId,
  );
  const pairedTests = evolutionTests.filter(
    (test) => test.variant === "paired",
  );
  const lmmTests = evolutionTests.filter((test) => test.id === lmmTestId);

  const renderTestOption = (test) => (
    <div key={test.id} className={panelStyles.optionItem}>
      <Checkbox
        checked={testIds.includes(test.id)}
        onChange={(e) => toggleTest(test.id, e.target.checked)}
      />
      <div className={panelStyles.optionBody}>
        <div className={panelStyles.optionTitle}>{test.label}</div>
        <div className={panelStyles.optionDesc}>{test.description}</div>
      </div>
    </div>
  );

  if (mode === "tests") {
    return (
      <div className={panelStyles.panel}>
        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Tests</div>
          <Text className={panelStyles.helper}>
            Select one or more tests to compute for the evolution view.
          </Text>
          {!!baseTests.length && (
            <div className={panelStyles.optionList}>
              {baseTests.map(renderTestOption)}
            </div>
          )}
        </div>

        {!!pairedTests.length && (
          <div className={panelStyles.section}>
            <div className={panelStyles.sectionTitle}>Paired</div>
            <div className={panelStyles.optionList}>
              {pairedTests.map(renderTestOption)}
            </div>

            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Paired timepoints</Text>
              <Text className={panelStyles.helper}>
                Used by paired tests to compare two time points within each
                group.
              </Text>
              <div className={panelStyles.inline}>
                <Select
                  size="small"
                  className={panelStyles.control}
                  options={timeOptions}
                  placeholder="Time A"
                  value={
                    availableTimes.includes(testTimeFrom)
                      ? testTimeFrom
                      : undefined
                  }
                  onChange={(value) => update("testTimeFrom", value)}
                  disabled={timeOptions.length < 2}
                />
                <Select
                  size="small"
                  className={panelStyles.control}
                  options={timeOptions}
                  placeholder="Time B"
                  value={
                    availableTimes.includes(testTimeTo) ? testTimeTo : undefined
                  }
                  onChange={(value) => update("testTimeTo", value)}
                  disabled={timeOptions.length < 2}
                />
              </div>
              {availableTimes.length < 2 && (
                <Text className={panelStyles.helper}>
                  At least two time points are needed to run paired tests.
                </Text>
              )}
            </div>
          </div>
        )}

        {!!lmmTests.length && (
          <div className={panelStyles.section}>
            <div className={panelStyles.sectionTitle}>Mixed Model (LMM)</div>
            <div className={panelStyles.optionList}>
              {lmmTests.map(renderTestOption)}
            </div>

            <Text className={panelStyles.helper}>
              Random intercept by subject, fixed time and group, optional
              covariates and Time × Group interaction.
            </Text>

            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Group reference</Text>
              <Select
                size="small"
                className={panelStyles.control}
                options={groupOptions}
                value={lmmReferenceGroup}
                onChange={(value) => update("lmmReferenceGroup", value)}
                disabled={!lmmSelected}
              />
            </div>

            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Covariates</Text>
              <Select
                size="small"
                mode="multiple"
                className={panelStyles.control}
                options={covariateOptions}
                value={lmmCovariates}
                onChange={(value) => update("lmmCovariates", value)}
                placeholder="Select fixed-effect covariates"
                disabled={!lmmSelected}
              />
            </div>

            <div className={panelStyles.row}>
              <Text className={panelStyles.label}>
                Include Time × Group interaction
              </Text>
              <Switch
                size="small"
                checked={Boolean(lmmIncludeInteraction)}
                disabled={!lmmSelected || interactionDisabled}
                onChange={(value) => update("lmmIncludeInteraction", value)}
              />
            </div>
            {interactionDisabled && (
              <Text className={panelStyles.helper}>
                Interaction is available only when a group variable is
                selected.
              </Text>
            )}

            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Time coding</Text>
              <Select
                size="small"
                className={panelStyles.control}
                options={timeCodingOptions}
                value={lmmTimeCoding}
                onChange={(value) => update("lmmTimeCoding", value)}
                disabled={!lmmSelected}
              />
            </div>
            {!timeIsNumeric && (
              <Text className={panelStyles.helper}>
                Current time variable is not numeric; ordered-index will be
                used.
              </Text>
            )}

            {!lmmSelected && (
              <Text className={panelStyles.helper}>
                Enable the LMM test to run mixed model analysis.
              </Text>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Displayed Series</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Means</Text>
          <Switch
            size="small"
            checked={showMeans}
            onChange={(v) => update("showMeans", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Overall mean</Text>
          <Switch
            checked={showOverallMean}
            size="small"
            onChange={(v) => update("showOverallMean", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Items</Text>
          <Switch
            size="small"
            checked={showObs}
            onChange={(v) => update("showObs", v)}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Uncertainty</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>STDs</Text>
          <Switch
            size="small"
            checked={showStds}
            onChange={(v) => update("showStds", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>95% CIs</Text>
          <Switch
            size="small"
            checked={showCIs}
            onChange={(v) => update("showCIs", v)}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>LMM</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>LMM fit</Text>
          <Switch
            size="small"
            checked={showLmmFit}
            disabled={!lmmSelected}
            onChange={(v) => update("showLmmFit", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>LMM 95% CIs</Text>
          <Switch
            size="small"
            checked={showLmmCI}
            disabled={!lmmSelected}
            onChange={(v) => update("showLmmCI", v)}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>View Modifiers</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Complete items</Text>
          <Switch
            size="small"
            checked={showComplete}
            onChange={(v) => update("showComplete", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Incomplete items</Text>
          <Switch
            size="small"
            checked={Boolean(showIncomplete)}
            onChange={(v) => update("showIncomplete", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <span className={panelStyles.labelInline}>
            <Text className={panelStyles.label}>Ratio Mode</Text>
            <Popover
              trigger="hover"
              placement="bottomLeft"
              content={
                <div className={panelStyles.compactPopover}>
                  Activates automatically with one visible group and
                  low-cardinality values per visit. This switch forces that
                  ratio view.
                </div>
              }
            >
              <InfoCircleOutlined className={panelStyles.infoIcon} />
            </Popover>
          </span>
          <Switch
            size="small"
            checked={Boolean(forceDiscreteAggregatedMode)}
            onChange={(v) => update("forceDiscreteAggregatedMode", v)}
          />
        </div>
        {Boolean(forceDiscreteAggregatedMode) && (
          <>
            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Node size scale</Text>
              <div className={panelStyles.scaleInline}>
                <Select
                  size="small"
                  className={panelStyles.scaleSelect}
                  value={ratioNodeScale || "sqrt"}
                  options={[
                    { label: "Square root", value: "sqrt" },
                    { label: "Linear", value: "linear" },
                    { label: "Logarithmic", value: "log" },
                  ]}
                  onChange={(v) => update("ratioNodeScale", v)}
                />
                <InputNumber
                  size="small"
                  className={panelStyles.scaleNumber}
                  min={1}
                  value={ratioNodeMinPx}
                  onChange={(v) => update("ratioNodeMinPx", v)}
                  addonBefore="min"
                />
                <InputNumber
                  size="small"
                  className={panelStyles.scaleNumber}
                  min={1}
                  value={ratioNodeMaxPx}
                  onChange={(v) => update("ratioNodeMaxPx", v)}
                  addonBefore="max"
                />
              </div>
            </div>
            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Edge size scale</Text>
              <div className={panelStyles.scaleInline}>
                <Select
                  size="small"
                  className={panelStyles.scaleSelect}
                  value={ratioEdgeScale || "sqrt"}
                  options={[
                    { label: "Square root", value: "sqrt" },
                    { label: "Linear", value: "linear" },
                    { label: "Logarithmic", value: "log" },
                  ]}
                  onChange={(v) => update("ratioEdgeScale", v)}
                />
                <InputNumber
                  size="small"
                  className={panelStyles.scaleNumber}
                  min={0.5}
                  step={0.5}
                  value={ratioEdgeMinPx}
                  onChange={(v) => update("ratioEdgeMinPx", v)}
                  addonBefore="min"
                />
                <InputNumber
                  size="small"
                  className={panelStyles.scaleNumber}
                  min={0.5}
                  step={0.5}
                  value={ratioEdgeMaxPx}
                  onChange={(v) => update("ratioEdgeMaxPx", v)}
                  addonBefore="max"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Appearance</div>

        <SliderControl
          label="Mean size"
          value={meanPointSize}
          min={1}
          max={40}
          onChange={(v) => update("meanPointSize", v)}
        />
        <SliderControl
          label="Mean stroke"
          value={meanStrokeWidth}
          min={1}
          max={30}
          onChange={(v) => update("meanStrokeWidth", v)}
        />
        <SliderControl
          label="Item size"
          value={subjectPointSize}
          min={1}
          max={20}
          onChange={(v) => update("subjectPointSize", v)}
        />
        <SliderControl
          label="Item stroke"
          value={subjectStrokeWidth}
          min={1}
          max={10}
          onChange={(v) => update("subjectStrokeWidth", v)}
        />
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Means as boxplots</Text>
          <Switch
            size="small"
            checked={Boolean(meanAsBoxplot)}
            onChange={(v) => update("meanAsBoxplot", v)}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Legend</Text>
          <Switch
            size="small"
            checked={showLegend}
            onChange={(v) => update("showLegend", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid</Text>
          <Switch
            size="small"
            checked={showGrid}
            onChange={(v) => update("showGrid", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid behind all</Text>
          <Switch
            size="small"
            checked={Boolean(showGridBehindAll)}
            disabled={!showGrid}
            onChange={(v) => update("showGridBehindAll", v)}
          />
        </div>
      </div>
    </div>
  );
}

function SliderControl({ label, value, min, max, onChange }) {
  return (
    <div className={panelStyles.sliderInlineRow}>
      <Text className={panelStyles.label}>{label}</Text>
      <Text className={panelStyles.value}>{value}px</Text>
      <Slider
        className={panelStyles.sliderInlineControl}
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
