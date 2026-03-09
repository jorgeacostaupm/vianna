import React from "react";
import { Checkbox, Switch, Slider, Typography, Select } from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import evolutionTests from "@/utils/evolution_tests";

const { Text } = Typography;

export default function Settings({
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
    lmmReferenceGroup,
    lmmCovariates = [],
    lmmIncludeInteraction,
    lmmTimeCoding,
    meanPointSize,
    subjectPointSize,
    meanStrokeWidth,
    subjectStrokeWidth,
    showLegend,
    showGrid,
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
  const blockedCovariates = new Set([variable, idVar, timeVar, groupVar].filter(Boolean));
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
  const pairedTests = evolutionTests.filter((test) => test.variant === "paired");
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

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Series</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Means</Text>
          <Switch checked={showMeans} onChange={(v) => update("showMeans", v)} />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Overall mean</Text>
          <Switch
            checked={showOverallMean}
            onChange={(v) => update("showOverallMean", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>STDs</Text>
          <Switch checked={showStds} onChange={(v) => update("showStds", v)} />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>95% CIs</Text>
          <Switch checked={showCIs} onChange={(v) => update("showCIs", v)} />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>LMM fit</Text>
          <Switch
            checked={showLmmFit}
            disabled={!lmmSelected}
            onChange={(v) => update("showLmmFit", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>LMM 95% CIs</Text>
          <Switch
            checked={showLmmCI}
            disabled={!lmmSelected}
            onChange={(v) => update("showLmmCI", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Observations</Text>
          <Switch checked={showObs} onChange={(v) => update("showObs", v)} />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Complete subjects</Text>
          <Switch
            checked={showComplete}
            onChange={(v) => update("showComplete", v)}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Appearance</div>
        <SliderControl
          label="Mean point size"
          value={meanPointSize}
          min={1}
          max={40}
          onChange={(v) => update("meanPointSize", v)}
        />
        <SliderControl
          label="Subject point size"
          value={subjectPointSize}
          min={1}
          max={20}
          onChange={(v) => update("subjectPointSize", v)}
        />
        <SliderControl
          label="Mean stroke width"
          value={meanStrokeWidth}
          min={1}
          max={30}
          onChange={(v) => update("meanStrokeWidth", v)}
        />
        <SliderControl
          label="Subject stroke width"
          value={subjectStrokeWidth}
          min={1}
          max={10}
          onChange={(v) => update("subjectStrokeWidth", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Tests</div>
        <div className={panelStyles.helper}>
          Select one or more tests to compute for the evolution view.
        </div>
        {!!baseTests.length && (
          <div className={panelStyles.optionList}>
            {baseTests.map(renderTestOption)}
          </div>
        )}

        {!!pairedTests.length && (
          <>
            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Paired Tests</Text>
              <div className={panelStyles.optionList}>
                {pairedTests.map(renderTestOption)}
              </div>
            </div>

            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Paired timepoints</Text>
              <Text className={panelStyles.helper}>
                Used by paired tests to compare two time points within each group.
              </Text>
              <div className={panelStyles.inline}>
                <Select
                  className={panelStyles.control}
                  options={timeOptions}
                  placeholder="Time A"
                  value={
                    availableTimes.includes(testTimeFrom) ? testTimeFrom : undefined
                  }
                  onChange={(value) => update("testTimeFrom", value)}
                  disabled={timeOptions.length < 2}
                />
                <Select
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
          </>
        )}

        {!!lmmTests.length && (
          <>
            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>LMM</Text>
              <div className={panelStyles.optionList}>
                {lmmTests.map(renderTestOption)}
              </div>
            </div>

            <div className={panelStyles.rowStack}>
              <Text className={panelStyles.label}>Mixed Model (LMM)</Text>
              <Text className={panelStyles.helper}>
                Random intercept by subject, fixed time and group, optional covariates and Time × Group interaction.
              </Text>

              <Text className={panelStyles.label}>Group reference</Text>
              <Select
                className={panelStyles.control}
                options={groupOptions}
                value={lmmReferenceGroup}
                onChange={(value) => update("lmmReferenceGroup", value)}
                disabled={!lmmSelected}
              />

              <Text className={panelStyles.label}>Covariates</Text>
              <Select
                mode="multiple"
                className={panelStyles.control}
                options={covariateOptions}
                value={lmmCovariates}
                onChange={(value) => update("lmmCovariates", value)}
                placeholder="Select fixed-effect covariates"
                disabled={!lmmSelected}
              />

              <div className={panelStyles.row}>
                <Text className={panelStyles.label}>Include Time × Group interaction</Text>
                <Switch
                  checked={Boolean(lmmIncludeInteraction)}
                  disabled={!lmmSelected || interactionDisabled}
                  onChange={(value) => update("lmmIncludeInteraction", value)}
                />
              </div>
              {interactionDisabled && (
                <Text className={panelStyles.helper}>
                  Interaction is available only when a group variable is selected.
                </Text>
              )}

              <Text className={panelStyles.label}>Time coding</Text>
              <Select
                className={panelStyles.control}
                options={timeCodingOptions}
                value={lmmTimeCoding}
                onChange={(value) => update("lmmTimeCoding", value)}
                disabled={!lmmSelected}
              />
              {!timeIsNumeric && (
                <Text className={panelStyles.helper}>
                  Current time variable is not numeric; ordered-index will be used.
                </Text>
              )}

              {!lmmSelected && (
                <Text className={panelStyles.helper}>
                  Enable the LMM test to run mixed model analysis.
                </Text>
              )}
            </div>
          </>
        )}
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Legend</Text>
          <Switch
            checked={showLegend}
            onChange={(v) => update("showLegend", v)}
          />
        </div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid</Text>
          <Switch checked={showGrid} onChange={(v) => update("showGrid", v)} />
        </div>
      </div>
    </div>
  );
}

function SliderControl({ label, value, min, max, onChange }) {
  return (
    <div className={panelStyles.rowStack}>
      <Text className={panelStyles.label}>{label}</Text>
      <Text className={panelStyles.value}>{value}px</Text>
      <Slider min={min} max={max} step={1} value={value} onChange={onChange} />
    </div>
  );
}
