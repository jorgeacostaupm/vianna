import { useEffect, useState } from "react";
import * as aq from "arquero";

import tests from "@/utils/tests";
import { computePairwiseData } from "@/utils/functions";
import { notifyError, notifyInfo } from "@/components/notifications";
import buildTestInfoContent from "./testInfoContent";

function computePointRangeData(selection, groupVar, variable, test) {
  const table = aq.from(selection);
  const groupedTable = table.groupby(groupVar);
  const rawGroups = groupedTable.objects({ grouped: "entries" });

  const errors = [];
  rawGroups.forEach(([name, rows]) => {
    rows.forEach((row) => {
      const value = row[variable];
      if (
        value == null ||
        typeof value !== "number" ||
        Number.isNaN(value) ||
        !Number.isFinite(value)
      ) {
        errors.push(
          `Invalid value in attribute "${variable}" group "${name}" value: "${value}"`,
        );
      }
    });
  });

  if (errors.length) {
    throw new Error(`Invalid values found:\n${errors.map((msg) => ` • ${msg}`).join("\n")}`);
  }

  const groups = rawGroups.map(([name, rows]) => ({
    name,
    values: rows.map((row) => row[variable]),
  }));

  const testObj = tests.find((item) => item.label === test);
  if (!testObj) {
    throw new Error(`Test not found: ${test}`);
  }

  const response = testObj.run(groups);
  return {
    ...response,
    shortDescription: testObj.shortDescription || testObj.description || "",
    applicability: testObj.applicability || "",
    reportedMeasures: testObj.reportedMeasures || [],
    postHoc: testObj.postHoc || "Not specified.",
    referenceUrl: testObj.referenceUrl || "",
  };
}

export default function useStatTestData({
  mode,
  selection,
  groupVar,
  variable,
  test,
  isSync,
}) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!variable || !test || !groupVar) {
      setData(null);
      return;
    }
    if (!isSync) return;

    try {
      let result = null;

      if (mode === "pairwise") {
        result = computePairwiseData(selection, groupVar, variable, test);
        if (!result?.pairwiseEffects || result.pairwiseEffects.length === 0) {
          notifyInfo({
            message: "No pairwise effects available",
            description: "The selected test does not provide pairwise effects.",
            placement: "bottomRight",
            source: "test",
          });
          setData(null);
          return;
        }
      } else if (mode === "pointrange") {
        result = computePointRangeData(selection, groupVar, variable, test);
      } else {
        setData(null);
        return;
      }

      setData({
        ...result,
        info: buildTestInfoContent(result),
      });
    } catch (error) {
      notifyError({
        message:
          mode === "pairwise"
            ? "Could not compute pairwise effects"
            : "Could not compute test summaries",
        error,
        fallback:
          mode === "pairwise"
            ? "Pairwise effect calculation failed."
            : "Summary calculation failed for the selected attribute.",
        placement: "bottomRight",
        source: "test",
      });
      setData(null);
    }
  }, [mode, variable, test, selection, groupVar, isSync]);

  return data;
}
