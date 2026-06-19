import {
  Checkbox,
  Typography,
  Select,
  InputNumber,
} from "antd";
import panelStyles from "@/styles/SettingsPanel.module.css";
import SwitchControl from "@/components/ui/SwitchControl";
import evolutionTests from "@/utils/evolution_tests";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";
import EvolutionVariableSettings from "../VariableSettings";
import SliderControl from "@/components/ui/SliderControl";

const { Text } = Typography;

const normalizeOptionalNumber = (value) => {
  if (value == null || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

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
    incompleteRequiredTimes = [],
    lmmReferenceGroup,
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
    yAxisMode = "auto",
    yAxisMin,
    yAxisMax,
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
          <div className={panelStyles.sectionTitle}>GLOBAL</div>
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

        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Variables</div>
          <EvolutionVariableSettings />
        </div>
      </div>
    );
  }

  if (mode === "lmm") {
    return (
      <div className={panelStyles.panel}>
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

            <SwitchControl
              label="Include Time × Group interaction"
              size="small"
              checked={Boolean(lmmIncludeInteraction)}
              disabled={!lmmSelected || interactionDisabled}
              onChange={(value) => update("lmmIncludeInteraction", value)}
            />
            {interactionDisabled && (
              <Text className={panelStyles.helper}>
                Interaction is available only when a group variable is selected.
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

            <Text className={panelStyles.helper}>
              Selecting `All` uses a global intercept across groups instead of
              taking one group as the model baseline.
            </Text>

            {!lmmSelected && (
              <Text className={panelStyles.helper}>
                Enable the LMM test to run mixed model analysis.
              </Text>
            )}
          </div>
        )}

        <div className={panelStyles.section}>
          <div className={panelStyles.sectionTitle}>Variables</div>
          <EvolutionVariableSettings />
        </div>
      </div>
    );
  }

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Displayed Series</div>
        <SwitchControl label="Means"
          size="small"
            checked={showMeans}
            onChange={(v) => update("showMeans", v)}
        />
        <SwitchControl label="Overall mean"
          checked={showOverallMean}
            size="small"
            onChange={(v) => update("showOverallMean", v)}
        />
        <SwitchControl label="Items"
          size="small"
            checked={showObs}
            onChange={(v) => update("showObs", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Uncertainty</div>
        <SwitchControl label="STDs"
          size="small"
            checked={showStds}
            onChange={(v) => update("showStds", v)}
        />
        <SwitchControl label="95% CIs"
          size="small"
            checked={showCIs}
            onChange={(v) => update("showCIs", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>LMM</div>
        <SwitchControl label="LMM fit"
          size="small"
            checked={showLmmFit}
            disabled={!lmmSelected}
            onChange={(v) => update("showLmmFit", v)}
        />
        <SwitchControl label="LMM 95% CIs"
          size="small"
            checked={showLmmCI}
            disabled={!lmmSelected}
            onChange={(v) => update("showLmmCI", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>View Modifiers</div>
        <SwitchControl label="Complete items"
          size="small"
            checked={showComplete}
            onChange={(v) => update("showComplete", v)}
        />
        <SwitchControl label="Incomplete items"
          size="small"
            checked={Boolean(showIncomplete)}
            onChange={(v) => update("showIncomplete", v)}
        />
        {Boolean(showIncomplete) && (
          <div className={panelStyles.rowStack}>
            <Text className={panelStyles.label}>
              Required timestamps in incomplete items
            </Text>
            <Text className={panelStyles.helper}>
              Keep only incomplete participant records that contain at least
              one selected timestamp. The others are excluded from drawing and
              calculations.
            </Text>
            <Select
              allowClear
              mode="multiple"
              size="small"
              className={panelStyles.control}
              options={timeOptions}
              placeholder="Any available timestamp"
              value={(Array.isArray(incompleteRequiredTimes)
                ? incompleteRequiredTimes
                : []
              ).filter((time) => availableTimes.includes(String(time)))}
              onChange={(value) =>
                update("incompleteRequiredTimes", value ?? [])
              }
            />
          </div>
        )}
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Y Axis</div>
        <SwitchControl label="Manual range"
          size="small"
            checked={yAxisMode === "manual"}
            onChange={(enabled) =>
              update("yAxisMode", enabled ? "manual" : "auto")
            }
        />
        <Text className={panelStyles.helper}>
          {yAxisMode === "manual"
            ? "Set min and max manually. You can leave one side empty to keep the automatic bound."
            : "Automatic range follows the visible evolution data."}
        </Text>
        <div className={panelStyles.inline}>
          <InputNumber
            size="small"
            className={panelStyles.control}
            value={yAxisMin}
            onChange={(value) =>
              update("yAxisMin", normalizeOptionalNumber(value))
            }
            addonBefore="min"
            step={0.1}
            disabled={yAxisMode !== "manual"}
          />
          <InputNumber
            size="small"
            className={panelStyles.control}
            value={yAxisMax}
            onChange={(value) =>
              update("yAxisMax", normalizeOptionalNumber(value))
            }
            addonBefore="max"
            step={0.1}
            disabled={yAxisMode !== "manual"}
          />
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Appearance</div>

        <SliderControl
          label="Mean size"
          value={meanPointSize}
          valueLabel={`${meanPointSize}px`}
          min={1}
          max={40}
          onChange={(v) => update("meanPointSize", v)}
        />
        <SliderControl
          label="Mean stroke"
          value={meanStrokeWidth}
          valueLabel={`${meanStrokeWidth}px`}
          min={1}
          max={30}
          onChange={(v) => update("meanStrokeWidth", v)}
        />
        <SliderControl
          label="Item size"
          value={subjectPointSize}
          valueLabel={`${subjectPointSize}px`}
          min={1}
          max={20}
          onChange={(v) => update("subjectPointSize", v)}
        />
        <SliderControl
          label="Item stroke"
          value={subjectStrokeWidth}
          valueLabel={`${subjectStrokeWidth}px`}
          min={1}
          max={10}
          onChange={(v) => update("subjectStrokeWidth", v)}
        />
        <SwitchControl label="Means as boxplots"
          size="small"
            checked={Boolean(meanAsBoxplot)}
            onChange={(v) => update("meanAsBoxplot", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <SwitchControl label="Legend"
          size="small"
            checked={showLegend}
            onChange={(v) => update("showLegend", v)}
        />
        <SwitchControl label="Grid"
          size="small"
            checked={showGrid}
            onChange={(v) => update("showGrid", v)}
        />
        <SwitchControl label="Grid behind all"
          size="small"
            checked={Boolean(showGridBehindAll)}
            disabled={!showGrid}
            onChange={(v) => update("showGridBehindAll", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Variables</div>
        <EvolutionVariableSettings />
      </div>
    </div>
  );
}
