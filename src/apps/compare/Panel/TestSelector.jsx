// SelectorPanel.jsx
import React, { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Select, Tooltip } from "antd";
import {
  ExperimentOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

import tests from "@/utils/tests";
import { VariableTypes } from "@/utils/constants";
import { setSelectedTest } from "@/store/features/compare";
import { selectCompareAnalysisContext } from "@/store/features/main";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";
import panelStyles from "@/styles/modules/analysisPanels.module.css";
import styles from "./TestSelector.module.css";
import useSelectionRows from "@/hooks/useSelectionRows";
import {
  getApplicableTests,
  isTestApplicable,
} from "./applicableTests";

const { Option, OptGroup } = Select;

function getVariableTypeLabel(type) {
  if (type === VariableTypes.NUMERICAL) return "Numerical";
  if (type === VariableTypes.CATEGORICAL) return "Categorical";
  return "Unknown";
}

export default function TestSelector({ generateTest, generateRanking }) {
  const dispatch = useDispatch();
  const selectedVar = useSelector((s) => s.compare.selectedVar);
  const selectedTest = useSelector((s) => s.compare.selectedTest);

  const varTypes = useSelector((s) => s.main.varTypes);
  const { groupVar } = useSelector(selectCompareAnalysisContext);
  const selectionColumns = useMemo(
    () => (groupVar ? [groupVar] : []),
    [groupVar],
  );
  const selection = useSelectionRows(selectionColumns);
  const groups = useMemo(() => {
    if (!groupVar || !Array.isArray(selection)) return [];
    return [...new Set(selection.map((row) => row[groupVar]))].filter(
      (value) => value != null,
    );
  }, [selection, groupVar]);

  function getTypeLabel(test) {
    const category = String(test.category || "").toLowerCase();
    if (category.includes("propor")) return "Proportions";
    if (test.variableType === VariableTypes.NUMERICAL) return "Numerical";
    if (test.variableType === VariableTypes.CATEGORICAL) return "Categorical";
    return "Other";
  }

  function getCountLabel(test) {
    const supports2 = isTestApplicable(test, 2);
    const supports3 = isTestApplicable(test, 3);
    if (supports2 && !supports3) return "Pairs (n=2)";
    if (supports3) return "n>=2";
    if (supports2) return "Pairs (n=2)";
    return "Other";
  }

  const selectedVarType = selectedVar ? varTypes[selectedVar] : null;
  const applicableTests = useMemo(
    () =>
      getApplicableTests(tests, {
        groupCount: groups.length,
        variableType: selectedVarType,
      }),
    [groups.length, selectedVarType],
  );

  useEffect(() => {
    if (
      selectedTest &&
      !applicableTests.some((test) => test.label === selectedTest)
    ) {
      dispatch(setSelectedTest(null));
    }
  }, [applicableTests, dispatch, selectedTest]);

  const groupedTests = applicableTests.reduce((acc, t) => {
    const label = `${getTypeLabel(t)} — ${getCountLabel(t)}`;
    if (!acc[label]) acc[label] = [];
    acc[label].push(t);
    return acc;
  }, {});

  const preferredOrder = [
    "Numerical — Pairs (n=2)",
    "Numerical — n>=2",
    "Categorical — Pairs (n=2)",
    "Categorical — n>=2",
    "Proportions — Pairs (n=2)",
    "Proportions — n>=2",
    "Other — Pairs (n=2)",
    "Other — n>=2",
  ];

  const orderedGroups = [
    ...preferredOrder.filter((label) => groupedTests[label]),
    ...Object.keys(groupedTests)
      .filter((label) => !preferredOrder.includes(label))
      .sort(),
  ];
  const selectedTestObj = useMemo(
    () => tests.find((t) => t.label === selectedTest) || null,
    [selectedTest],
  );
  const isGroupCountApplicable = selectedTestObj
    ? isTestApplicable(selectedTestObj, groups.length)
    : false;
  const isTypeApplicable =
    selectedVarType && selectedTestObj
      ? selectedTestObj.variableType === selectedVarType
      : null;
  const isApplicableNow =
    Boolean(selectedTestObj) &&
    isGroupCountApplicable &&
    (isTypeApplicable === null || isTypeApplicable);
  const testInfoTooltip = selectedTestObj ? (
    <div className={panelStyles.testInfoTooltipContent}>
      <div>
        <strong>Test:</strong> {selectedTestObj.label}
      </div>
      <div>
        <strong>Applies to:</strong> {selectedTestObj.applicability}
      </div>
      <div>
        <strong>Current context:</strong> {groups.length} groups
        {selectedVarType
          ? `, ${getVariableTypeLabel(selectedVarType)} variable`
          : ", variable type not selected"}
      </div>
      <div>
        <strong>Current applicability:</strong>{" "}
        <span
          className={
            isApplicableNow ? styles.applicabilityYes : styles.applicabilityNo
          }
        >
          {isApplicableNow ? "Applicable" : "Not applicable"}
        </span>
      </div>
      <div>
        <strong>Reported measures:</strong>
        {selectedTestObj.reportedMeasures?.length ? (
          <ul className={panelStyles.testInfoTooltipList}>
            {selectedTestObj.reportedMeasures.map((measure) => (
              <li key={measure}>{measure}</li>
            ))}
          </ul>
        ) : (
          " Not specified."
        )}
      </div>
      <div>
        <strong>Post hoc:</strong> {selectedTestObj.postHoc}
      </div>
    </div>
  ) : (
    "Select a statistical test to view its details."
  );

  function triggerTest() {
    if (!selectedVar || !isApplicableNow) return;
    generateTest(selectedTest, selectedVar);
  }

  return (
    <>
      <div className={panelStyles.selectorField}>
        <div className={panelStyles.selectorLabelRow}>
          <span className={panelStyles.selectorLabel}>Statistical test</span>
          <Tooltip
            title={testInfoTooltip}
            placement="rightTop"
            trigger={["hover", "click"]}
          >
            <button
              type="button"
              className={`${panelStyles.testInfoTrigger}${selectedTestObj ? "" : ` ${panelStyles.testInfoTriggerInactive}`}`}
              aria-label="Show selected test information"
            >
              <InfoCircleOutlined />
            </button>
          </Tooltip>
        </div>
        <Select
          size="small"
          value={selectedTest ?? undefined}
          onChange={(v) => dispatch(setSelectedTest(v ?? null))}
          placeholder="Select test"
          listHeight={520}
          allowClear={true}
          notFoundContent={
            groupVar
              ? "No tests apply to the current context"
              : "Select a group variable first"
          }
        >
          {orderedGroups.map((category) => (
            <OptGroup key={category} label={category}>
              {groupedTests[category].map((t) => (
                <Option key={t.label} value={t.label}>
                  {t.label}
                </Option>
              ))}
            </OptGroup>
          ))}
        </Select>
      </div>

      <div className={panelStyles.compareTestActions}>
        <div className={panelStyles.compareTestActionCell}>
          <AppButton
            preset={APP_BUTTON_PRESETS.ACTION}
            tooltip={
              groupVar
                ? "Run the selected test on current variable"
                : "Group variable must be set."
            }
            tooltipPlacement={"bottom"}
            icon={<ExperimentOutlined />}
            onClick={triggerTest}
            disabled={!selectedVar || !selectedTest || !isApplicableNow}
          >
            Run test
          </AppButton>
        </div>

        <div className={panelStyles.compareTestActionCell}>
          <AppButton
            preset={APP_BUTTON_PRESETS.ACTION}
            tooltip={
              groupVar
                ? "Rank every variable compatible with the selected test"
                : "Group variable must be set."
            }
            tooltipPlacement={"bottom"}
            icon={<BarChartOutlined />}
            onClick={() => selectedTest && generateRanking(selectedTest)}
            disabled={!selectedTest || !isGroupCountApplicable}
          >
            Rank applicable variables
          </AppButton>
        </div>
      </div>
    </>
  );
}
