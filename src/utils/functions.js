import * as d3 from "d3";
import { PCA } from "ml-pca";
import * as aq from "arquero";
import tests from "@/utils/tests";

import { VariableTypes } from "./constants";
import { extractErrorMessage } from "@/components/notifications";

export { getVariableTypes } from "./variableTypes";

export function getFileName(route) {
  return route
    .split("/")
    .pop()
    .replace(/\.[^/.]+$/, "");
}

export function formatDecimal(value, options = {}) {
  const {
    decimalPlaces = 3,
    exponentialThreshold = 0.001,
    exponentialDecimals = 2,
    naText = "N/A",
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return naText;
  }

  if (value < 0 || value > 1) {
    return value.toExponential(exponentialDecimals);
  }

  if (value < exponentialThreshold) {
    return value.toExponential(exponentialDecimals);
  }

  return value.toFixed(decimalPlaces);
}

export async function copyClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Use the 'out of viewport hidden text area' trick
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Move textarea out of the viewport so it's not visible
    textArea.style.position = "absolute";
    textArea.style.left = "-999999px";

    document.body.prepend(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (error) {
      console.error(error);
    } finally {
      textArea.remove();
    }
  }
}

export function computePairwiseData(selection, groupVar, variable, test) {
  const table = aq.from(selection);
  const grouped = table.groupby(groupVar).objects({ grouped: "entries" });

  const testObj = tests.find((t) => t.label === test);
  if (!testObj) {
    throw new Error(`Test not found: ${test}`);
  }
  const isNumeric = testObj.variableType === VariableTypes.NUMERICAL;

  const errors = [];
  grouped.forEach(([group, rows]) => {
    rows.forEach((row) => {
      const value = row[variable];
      if (isNumeric) {
        if (
          value == null ||
          typeof value !== "number" ||
          Number.isNaN(value) ||
          !Number.isFinite(value)
        ) {
          errors.push(
            `Invalid value in attribute "${variable}" group "${group}" value: "${value}"`,
          );
        }
      } else if (value == null || Number.isNaN(value)) {
        errors.push(
          `Invalid value in attribute "${variable}" group "${group}" value: "${value}"`,
        );
      }
    });
  });

  if (errors.length) {
    throw new Error(`Invalid values found:\n${errors.join("\n")}`);
  }

  const groups = grouped.map(([name, rows]) => ({
    name,
    values: rows.map((r) => r[variable]),
  }));

  const result = testObj.run(groups);
  return {
    ...result,
    shortDescription: testObj.shortDescription || testObj.description || "",
    applicability: testObj.applicability || "",
    reportedMeasures: testObj.reportedMeasures || [],
    postHoc: testObj.postHoc || "Not specified.",
    referenceUrl: testObj.referenceUrl || "",
  };
}

export function computeRankingData({
  test,
  groupVar,
  selection,
  numericVars,
  categoricVars,
  hierarchy,
}) {
  const testObj = tests.find((t) => t.label === test);

  if (!testObj) return null;

  const variables =
    testObj.variableType === VariableTypes.NUMERICAL
      ? (numericVars ?? [])
      : (categoricVars ?? []);

  const table = aq.from(selection);
  const grouped = table.groupby(groupVar).objects({ grouped: "entries" });

  const groupCount = grouped.length;
  const metricName =
    testObj.metric?.measure ?? testObj.metric?.name ?? "Metric";
  const metricLabel = testObj.metric?.symbol
    ? `${metricName} (${testObj.metric.symbol})`
    : metricName;

  // If the selected test is globally incompatible, return an empty ranking
  // with explicit reasons instead of throwing and breaking the full view.
  if (
    typeof testObj.isApplicable === "function" &&
    !testObj.isApplicable(groupCount)
  ) {
    const reason = `Test "${testObj.label}" is not applicable for ${groupCount} groups.`;
    return {
      data: [],
      measure: metricLabel,
      skippedVariables: variables.map((variable) => ({ variable, reason })),
      includedVariables: 0,
      totalVariables: variables.length,
    };
  }

  const skippedVariables = [];

  const results = variables.reduce((acc, variable) => {
    const groups = grouped.map(([name, rows]) => ({
      name,
      values: rows.map((r) => r[variable]),
    }));

    const validationReason = getRankingVariableValidationReason(
      groups,
      testObj.variableType,
    );
    if (validationReason) {
      skippedVariables.push({
        variable,
        reason: validationReason,
      });
      return acc;
    }

    try {
      const res = testObj.run(groups);
      const metricValue = res?.metric?.value;
      const pValue = res?.pValue;

      if (typeof metricValue !== "number" || !Number.isFinite(metricValue)) {
        throw new Error("Test returned an invalid ranking metric value.");
      }
      if (typeof pValue !== "number" || !Number.isFinite(pValue)) {
        throw new Error("Test returned an invalid p-value.");
      }

      const hierarchyItem = Array.isArray(hierarchy)
        ? hierarchy.find((item) => item.name === variable)
        : null;
      acc.push({
        variable,
        value: metricValue,
        p_value: pValue,
        ...res,
        description: hierarchyItem?.description,
      });
    } catch (error) {
      skippedVariables.push({
        variable,
        reason: normalizeErrorMessage(error),
      });
    }

    return acc;
  }, []);

  return {
    data: results,
    measure: metricLabel,
    skippedVariables,
    includedVariables: results.length,
    totalVariables: variables.length,
  };
}

function getRankingVariableValidationReason(groups, variableType) {
  const invalidByGroup = groups
    .map((group) => {
      const invalidCount = group.values.reduce((count, value) => {
        if (variableType === VariableTypes.NUMERICAL) {
          const valid =
            value != null &&
            typeof value === "number" &&
            Number.isFinite(value) &&
            !Number.isNaN(value);
          return count + (valid ? 0 : 1);
        }
        const valid = value != null && !Number.isNaN(value);
        return count + (valid ? 0 : 1);
      }, 0);

      return invalidCount > 0 ? `${group.name}: ${invalidCount}` : null;
    })
    .filter(Boolean);

  if (!invalidByGroup.length) return null;

  if (variableType === VariableTypes.NUMERICAL) {
    return `Contains invalid numeric values by group (${invalidByGroup.join(
      ", ",
    )}).`;
  }

  return `Contains missing/invalid categorical values by group (${invalidByGroup.join(
    ", ",
  )}).`;
}

function normalizeErrorMessage(error) {
  return extractErrorMessage(error, "Unknown error while running test.");
}

export function getPCAData(data, params) {
  const { variables } = params;
  if (variables.length < 2 || data.length < 2) {
    return {
      points: [],
      info: [],
      skippedVariables: [],
    };
  }

  const skippedVariables = [];
  const validVars = variables.filter((v) => {
    const invalidCount = data.reduce((count, row) => {
      const n = parseFloat(row[v]);
      return count + (row[v] == null || isNaN(n) || !isFinite(n));
    }, 0);
    if (invalidCount > 0) {
      skippedVariables.push({
        variable: v,
        invalidCount,
      });
      return false;
    }
    return true;
  });

  if (validVars.length < 2) {
    return {
      points: [],
      info: [
        "PCA needs at least 2 numeric attributes without missing or invalid values.",
      ],
      skippedVariables,
    };
  }

  const matrix = data.map((row) => validVars.map((v) => parseFloat(row[v])));

  const pca = new PCA(matrix);
  const projected = pca.predict(matrix, { nComponents: 2 }).to2DArray();
  const loadings = pca.getLoadings().to2DArray();
  const explained = pca.getExplainedVariance();

  const topVars = [0, 1].map((pc) => {
    const sorted = loadings
      .map((load, i) => ({
        variable: validVars[i],
        loading: Math.abs(load[pc]),
      }))
      .sort((a, b) => b.loading - a.loading)
      .slice(0, 3)
      .map((d) => d.variable);
    return { pc: pc + 1, variance: explained[pc], variables: sorted };
  });

  const info = topVars.map(
    ({ pc, variance, variables }) =>
      `${pc === 1 ? "X" : "Y"} explains ${(variance * 100).toFixed(
        2,
      )}% of variance, influenced by ${variables.join(", ")}. \n`,
  );

  const points = projected.map(([pc1, pc2], i) => ({
    pc1,
    pc2,
    ...data[i],
  }));

  return { points, info, skippedVariables };
}

export function generateTree(attributes, nodeID) {
  const node = attributes.find((item) => item.id === nodeID);

  if (node == null) return null;

  const children = node.related.map((childID) =>
    generateTree(attributes, childID),
  );
  return {
    id: node.id,
    name: node.name,
    children: children,
    isExpanded: node.isExpanded,
    isActive: node.isActive !== false,
    type: node.type,
    dtype: node.dtype,
    formula: node?.aggregationConfig?.formula,
    description: node.description,
  };
}

export function getVisibleNodes(tree) {
  const hasFormula = (node) => {
    return typeof node?.formula === "string" && node.formula.trim().length > 0;
  };

  const filteredNodes = [];
  const queue = [tree];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || node.isActive === false) continue;

    if (
      node.isExpanded === false ||
      !node.children ||
      node.children.length === 0
    ) {
      if (node.type !== "aggregation" || hasFormula(node))
        filteredNodes.push(node.name);
    } else if (node.children && node.children.length > 0) {
      queue.push(...node.children.filter((child) => child?.isActive !== false));
    }
  }
  return filteredNodes;
}

export function getCategoricalKeys(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const allKeys = new Set();
  data.forEach((item) => {
    Object.keys(item).forEach((k) => allKeys.add(k));
  });

  const categoricalKeys = [];

  allKeys.forEach((key) => {
    const uniqueVals = new Set();
    let allNumeric = true;

    for (const obj of data) {
      const val = obj[key];
      if (val === null || val === undefined || Number.isNaN(val)) {
        allNumeric = false;
        break;
      }
      uniqueVals.add(val);
      if (uniqueVals.size >= 10) {
        allNumeric = false;
        break;
      }
    }

    if (allNumeric) {
      categoricalKeys.push(key);
    }
  });

  return categoricalKeys;
}

export function generateFileName(baseName = "data") {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Month (0–11, so add 1)
  const day = String(currentDate.getDate()).padStart(2, "0"); // Day
  const hours = String(currentDate.getHours()).padStart(2, "0"); // Hours
  const minutes = String(currentDate.getMinutes()).padStart(2, "0"); // Minutes
  const seconds = String(currentDate.getSeconds()).padStart(2, "0"); // Seconds

  const fileName = `${baseName}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  return fileName;
}

// TOOLTIP FUNCTIONS

export function fixTooltipToNode(
  nodeSelection,
  tooltip,
  yOffset = 50,
  xOffset = 0,
) {
  const node = nodeSelection.node();
  if (!node) return;

  const bbox = node.getBBox();
  const ctm = node.getScreenCTM();
  if (!ctm) return;

  // Centro del nodo en coordenadas SVG
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  // Convertir a coordenadas de pantalla
  const screenX = cx * ctm.a + ctm.e;
  const screenY = cy * ctm.d + ctm.f;

  const tooltipRect = tooltip.node().getBoundingClientRect();

  tooltip
    .style("left", `${screenX - tooltipRect.width / 2 + xOffset}px`)
    .style("top", `${screenY - tooltipRect.height - yOffset}px`)
    .style("opacity", 1)
    .style("visibility", "visible");
}

export function moveTooltip(e, tooltip, chart, yOffset = 20, xOffset = 0) {
  const [x, y] = d3.pointer(e, chart);

  const tooltipHeight =
    yOffset === 0
      ? tooltip.node().getBoundingClientRect().height / 2
      : tooltip.node().getBoundingClientRect().height;
  tooltip
    .style("left", `${x + xOffset}px`)
    .style("top", `${y - window.scrollY - tooltipHeight - yOffset}px`)
    .style("opacity", 1);
}

// add functions to arquero :)
import { addFunction } from "arquero";

const tryParseDate = (date, format) => {
  try {
    const parser = d3.timeParse(format);
    if (!parser) return null;
    return parser(date);
  } catch {
    return null;
  }
};
const fromUnix = (date) => {
  try {
    return new Date(date * 1000);
  } catch {
    return null;
  }
};

const String = (x) => {
  if (x == null) {
    return "";
  } else {
    return x.toString();
  }
};

export function getRandomInt(min = 0, max = 999999999) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// REVISAR :S (abajo)

addFunction("string", String, { override: true });
addFunction("parseDate", tryParseDate, { override: true });
addFunction("parseUnixDate", fromUnix, { override: true });
