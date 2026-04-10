// SelectorPanel.jsx
import React, { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Select, Tooltip } from "antd";
import {
  ExperimentOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

import tests from "@/utils/tests";
import { VariableTypes } from "@/utils/Constants";
import { setSelectedTest } from "@/store/features/compare";
import ColoredButton from "@/components/ui/ColoredButton";
import styles from "@/styles/App.module.css";
import { notifyError } from "@/notifications";

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
  const selection = useSelector((s) => s.dataframe.selection);
  const groupVar = useSelector((s) => s.compare.groupVar);
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

  function safeApplicable(test, count) {
    try {
      return typeof test.isApplicable === "function"
        ? test.isApplicable(count)
        : false;
    } catch {
      return false;
    }
  }

  function getCountLabel(test) {
    const supports2 = safeApplicable(test, 2);
    const supports3 = safeApplicable(test, 3);
    if (supports2 && !supports3) return "Pairs (n=2)";
    if (supports3) return "n>=2";
    if (supports2) return "Pairs (n=2)";
    return "Other";
  }

  const groupedTests = tests.reduce((acc, t) => {
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
  const selectedVarType = selectedVar ? varTypes[selectedVar] : null;
  const isGroupCountApplicable = selectedTestObj
    ? safeApplicable(selectedTestObj, groups.length)
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
    <div className={styles.testInfoTooltipContent}>
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
          <ul className={styles.testInfoTooltipList}>
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
    const testObj = tests.find((t) => t.label === selectedTest);
    const testType = testObj.variableType;
    const variableType = varTypes[selectedVar];
    if (testType === variableType && testObj.isApplicable(groups.length))
      generateTest(selectedTest, selectedVar);
    else {
      notifyError({
        message: "Selected test is not applicable",
        description: "Review variable type and number of groups for this test.",
        source: "test",
      });
    }
  }

  return (
    <>
      <div className={styles.selectorField}>
        <div className={styles.selectorLabelRow}>
          <span className={styles.selectorLabel}>Test</span>
          <Tooltip
            title={testInfoTooltip}
            placement="rightTop"
            trigger={["hover", "click"]}
          >
            <button
              type="button"
              className={`${styles.testInfoTrigger}${selectedTestObj ? "" : ` ${styles.testInfoTriggerInactive}`}`}
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

      <div className={styles.compareTestActions}>
        <div className={styles.compareTestActionCell}>
          <ColoredButton
            title={
              groupVar
                ? "Run the selected test on current variable"
                : "Group variable must be set."
            }
            placement={"bottom"}
            icon={<ExperimentOutlined />}
            onClick={triggerTest}
            disabled={!selectedVar || !selectedTest || !groupVar}
          />
        </div>

        <div className={styles.compareTestActionCell}>
          <ColoredButton
            title={
              groupVar
                ? "Compare all variables with the selected test"
                : "Group variable must be set."
            }
            placement={"bottom"}
            icon={<BarChartOutlined />}
            onClick={() => selectedTest && generateRanking(selectedTest)}
            disabled={!selectedTest || !groupVar}
          />
        </div>
      </div>
    </>
  );
}
