import * as d3 from "d3";
import { PCA } from "ml-pca";
import * as aq from "arquero";
import { jStat } from "jstat";
import { UMAP } from "umap-js";
import tests from "@/utils/tests";

import { VariableTypes, ORDER_VARIABLE } from "./Constants";
import { extractErrorMessage } from "@/notifications";

export function generateId() {
  return "id-" + Date.now().toString(36);
}

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
            `Invalid value in column "${variable}" group "${group}" value: "${value}"`
          );
        }
      } else if (value == null || Number.isNaN(value)) {
        errors.push(
          `Invalid value in column "${variable}" group "${group}" value: "${value}"`
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
      ? numericVars ?? []
      : categoricVars ?? [];

  const table = aq.from(selection);
  const grouped = table.groupby(groupVar).objects({ grouped: "entries" });

  const groupCount = grouped.length;
  const metricName = testObj.metric?.measure ?? testObj.metric?.name ?? "Metric";
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
      testObj.variableType
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
        desc: hierarchyItem?.desc,
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

      return invalidCount > 0
        ? `${group.name}: ${invalidCount}`
        : null;
    })
    .filter(Boolean);

  if (!invalidByGroup.length) return null;

  if (variableType === VariableTypes.NUMERICAL) {
    return `Contains invalid numeric values by group (${invalidByGroup.join(
      ", "
    )}).`;
  }

  return `Contains missing/invalid categorical values by group (${invalidByGroup.join(
    ", "
  )}).`;
}

function normalizeErrorMessage(error) {
  return extractErrorMessage(error, "Unknown error while running test.");
}

export function computeEvolutionObservationData(
  data,
  variable,
  groupVar,
  timeVar,
  idVar
) {
  const table = aq.from(data);
  const groupedTable = table
    .groupby(idVar)
    .select(idVar, groupVar, variable, timeVar, ORDER_VARIABLE);

  return groupedTable.objects({ grouped: "entries" }).map(([id, rows]) => [
    id,
    rows.sort((a, b) => {
      const va = a[ORDER_VARIABLE],
        vb = b[ORDER_VARIABLE];
      return typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { numeric: true });
    }),
  ]);
}

export function getCategoricDistributionData(selection, variable, groupVar) {
  const groups = [...new Set(selection.map((item) => item[groupVar]))];
  const categories = [...new Set(selection.map((item) => item[variable]))];

  const counts = {};
  groups.forEach((g) => {
    counts[g] = {};
    categories.forEach((c) => {
      counts[g][c] = 0;
    });
  });

  selection.forEach((item) => {
    const g = item[groupVar];
    const c = item[variable];
    if (g != null && c != null) {
      counts[g][c] = (counts[g][c] || 0) + 1;
    }
  });

  const chartData = groups.map((g) => {
    const obj = { [groupVar]: g };
    categories.forEach((c) => {
      obj[c] = counts[g][c];
    });
    return obj;
  });

  return { chartData, categories, catVar: variable, groupVar };
}

export function getUMAPData(data, params) {
  const { variables, nNeighbors = 15, minDist = 0.1, nComponents = 2 } = params;

  const matrix = [];
  const metadata = [];

  if (variables.length < 2 || data.length < 2) {
    return null;
  }

  for (let i = 0; i < data.length; i++) {
    const row = variables.map((v) => parseFloat(data[i][v]));
    if (row.every((val) => !isNaN(val))) {
      matrix.push(row);
      metadata.push({ original: data[i] });
    }
  }

  const umap = new UMAP({
    nNeighbors,
    minDist,
    nComponents,
  });

  const embedding = umap.fit(matrix);

  const points = embedding.map((coords, i) => {
    const result = { ...metadata[i].original };
    coords.forEach((value, j) => {
      result[`pc${j + 1}`] = value;
    });
    return result;
  });

  const summary = `UMAP completed: ${nComponents}D projection, ${nNeighbors} neighbors, minDist ${minDist}.`;

  return { points, summary };
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
        "PCA needs at least 2 numeric variables without missing or invalid values.",
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
        2
      )}% of variance, influenced by ${variables.join(", ")}. \n`
  );

  const points = projected.map(([pc1, pc2], i) => ({
    pc1,
    pc2,
    ...data[i],
  }));

  return { points, info, skippedVariables };
}

export function getScatterData(data, params) {
  const { variables } = params;
  if (variables?.length < 2) return null;
  return data;
}

export function getDistributionData(data, column, groupVar) {
  const table = aq.from(data);
  const selectedColumns = table.select(groupVar, column);
  const grouped = selectedColumns.groupby(groupVar);
  const resultArray = [];
  const errors = [];

  grouped.objects({ grouped: "entries" }).forEach(([type, rows]) => {
    rows.forEach((row) => {
      const value = row[column];

      if (
        value == null ||
        typeof value !== "number" ||
        Number.isNaN(value) ||
        !Number.isFinite(value)
      ) {
        errors.push(
          `Invalid value: "${value}" in column "${column}" (group "${type})"`
        );
      } else {
        resultArray.push({ type, value });
      }
    });
  });

  if (errors.length) {
    throw new Error(
      `Invalid values found:\n` + errors.map((msg) => ` • ${msg}`).join("\n")
    );
  }

  return resultArray;
}

export function getEvolutionData(data, variable, groupVar, timeVar) {
  const table = aq.from(data);
  const groupedTable = table
    .groupby(groupVar, timeVar)
    .select(groupVar, variable, timeVar);

  const groups = groupedTable.objects({ grouped: "entries" });

  const errors = [];
  groups.forEach(([group, timeEntries]) => {
    timeEntries.forEach(([time, rows]) => {
      rows.forEach((row) => {
        const v = row[variable];
        if (
          v == null ||
          typeof v !== "number" ||
          Number.isNaN(v) ||
          !Number.isFinite(v)
        ) {
          errors.push(
            `Invalid value "${v}" for "${variable}" in group "${group}" time "${time}"`
          );
        }
      });
    });
  });
  if (errors.length) {
    throw new Error(
      "Invalid values found:\n" + errors.map((msg) => ` • ${msg}`).join("\n")
    );
  }

  return groups.map(([group, timeEntries]) => {
    const obj = { population: group };
    timeEntries.forEach(([time, rows]) => {
      const arr = rows.map((d) => d[variable]);
      const mean = arr.reduce((sum, value) => sum + value, 0) / arr.length;
      const std = Math.sqrt(
        arr.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
          arr.length
      );
      obj[time] = { mean, std };
    });
    return obj;
  });
}

export function generateTree(attributes, nodeID) {
  const node = attributes.find((item) => item.id === nodeID);

  if (node == null) return null;

  const children = node.related.map((childID) =>
    generateTree(attributes, childID)
  );
  return {
    id: node.id,
    name: node.name,
    children: children,
    isShown: node.isShown,
    isActive: node.isActive !== false,
    type: node.type,
    dtype: node.dtype,
    formula: node?.info?.formula,
    exec: node?.info?.exec,
    desc: node.desc,
  };
}

export function getVisibleNodes(tree) {
  const hasFormula = (node) => {
    const values = [node?.formula, node?.exec];
    return values.some((value) => {
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return Boolean(value);
    });
  };

  const filteredNodes = [];
  const queue = [tree];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || node.isActive === false) continue;

    if (
      node.isShown === false ||
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

export function getEvolutionZscores(groups, timeVar) {
  const z_scores = [];
  const pops = [];

  groups.forEach((group) => {
    const populationName = group[0];
    const population = group[1];

    const timestamps = [...new Set(population.map((d) => d[timeVar]).sort())];
    const len = timestamps.length;
    const min = timestamps[0];
    const max = timestamps[len - 1];

    const extremeVisits = population.filter(
      (d) => d[timeVar] == max || d[timeVar] == min
    );
    const cleanedPopulation = aq.from(extremeVisits);

    // Calcular Z-scores
    const group_z_scores = computeZscores(cleanedPopulation, timeVar).map(
      (d) => ({
        population: populationName,
        variable: d.variable,
        value: d.value,
        p_value: d.p_value,
      })
    );

    z_scores.push(...group_z_scores);
    pops.push(populationName);
  });

  return { data: z_scores, populations: pops };
}

export function computeZscores(table, grouping) {
  const grouped_table = table.groupby(grouping);
  const numeric_columns = getNumericCols(table);

  const z_scores = [];
  numeric_columns.forEach((variable) => {
    const stats = getStats(grouped_table, variable, grouping);
    const means = stats.array("mean");
    const std = stats.array("std").map((d) => (d ? d : 0));
    const count = stats.array("count");

    const z_score =
      (means[0] - means[1]) /
      Math.sqrt(std[0] ** 2 / count[0] + std[1] ** 2 / count[1]);

    const p_value = 2 * (1 - jStat.normal.cdf(Math.abs(z_score), 0, 1));

    const obj = {
      variable: variable,
      value: z_score,
      p_value: p_value,
      my_value: "lalalala",
      statistics: stats.objects(),
    };

    if (!Number.isNaN(z_score) && Number.isFinite(z_score)) z_scores.push(obj);
  });

  return z_scores;
}

export function getNumericCols(table) {
  return table
    .columnNames()
    .filter((col) => table.array(col).every((v) => !isNaN(+v)));
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

export function getStats(grouped_table, variable, grouping_var) {
  const stats = grouped_table
    .rollup({
      mean: aq.op.average(variable),
      std: aq.op.stdev(variable),
      variance: aq.op.variance(variable),
      count: aq.op.count(),
    })
    .rename({
      [grouping_var]: "group",
    });

  return stats;
}

function isNumeric(value) {
  return value !== null && value !== undefined && value !== "" && !isNaN(value);
}

export function identifyTypes(array, cardinalityThreshold = 0.3) {
  if (!Array.isArray(array) || array.length === 0) return {};
  const fields = Object.keys(array[0]);
  const result = {};

  for (const field of fields) {
    const validValues = array
      .map((item) => item[field])
      .filter((v) => v !== null && v !== undefined && v !== "");

    const distinctCount = new Set(validValues).size;
    const ratio =
      validValues.length > 0 ? distinctCount / validValues.length : 0;
    const allNumeric = validValues.length > 0 && validValues.every(isNumeric);

    if (ratio <= cardinalityThreshold) {
      result[field] = VariableTypes.CATEGORICAL;
      continue;
    }

    if (allNumeric) {
      result[field] = VariableTypes.NUMERICAL;
      continue;
    }

    result[field] = VariableTypes.UNKNOWN;
  }

  return result;
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

export function hasEmptyValues(data, state) {
  if (!data || data.length === 0) return false;

  const hasEmptyValues = data.some((row) =>
    Object.values(row).some(
      (value) =>
        value === null ||
        value === undefined ||
        (typeof value === "number" && isNaN(value))
    )
  );

  state.hasEmptyValues = hasEmptyValues;
}

export function pickColumns(items, columns) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const obj = { [ORDER_VARIABLE]: item[ORDER_VARIABLE] };
    columns.forEach((col) => {
      if (Object.prototype.hasOwnProperty.call(item, col)) {
        obj[col] = item[col];
      }
    });
    return obj;
  });
}

export const getVariableTypes = (data, options = {}) => {
  const {
    maxNumDistictForCategorical = 10,
    maxNumDistictForOrdered = 90,
    howManyItemsShouldSearchForNotNull = 100,
    addAllAttribsIncludeObjects = false,
    addAllAttribsIncludeArrays = false,
  } = options;

  const result = {};

  if (!data || data.length === 0) {
    return result;
  }

  const columnNames = Object.keys(data[0]);

  const getAttrib = (item, attrib) => {
    if (typeof attrib === "function") {
      try {
        return attrib(item);
      } catch {
        return undefined;
      }
    } else {
      return item[attrib];
    }
  };

  const findNotNull = (data, attr) => {
    let val;
    for (
      let i = 0;
      i < howManyItemsShouldSearchForNotNull && i < data.length;
      i++
    ) {
      val = getAttrib(data[i], attr);
      if (val !== null && val !== undefined && val !== "") {
        return val;
      }
    }
    return val;
  };

  columnNames.forEach((col) => {
    if (col === "__seqId" || col === "__i" || col === "selected") {
      return;
    }

    const firstNotNull = findNotNull(data, col);

    if (
      firstNotNull === null ||
      firstNotNull === undefined ||
      firstNotNull === ""
    ) {
      const distinctValues = new Set(
        data
          .slice(0, howManyItemsShouldSearchForNotNull)
          .map((d) => getAttrib(d, col))
          .filter((v) => v !== null && v !== undefined && v !== "")
      ).size;

      if (distinctValues < maxNumDistictForCategorical) {
        result[col] = "string";
      } else if (distinctValues < maxNumDistictForOrdered) {
        result[col] = "number";
      } else {
        result[col] = "string";
      }
    } else if (typeof firstNotNull === "number") {
      const hasNegative = data.some((d) => {
        const val = getAttrib(d, col);
        return val !== null && val !== undefined && val < 0;
      });

      result[col] = hasNegative ? "number" : "number";
    } else if (firstNotNull instanceof Date) {
      result[col] = "date";
    } else if (typeof firstNotNull === "boolean") {
      result[col] = "string";
    } else if (Array.isArray(firstNotNull)) {
      if (addAllAttribsIncludeArrays) {
        result[col] = "string";
      }
    } else if (typeof firstNotNull === "object") {
      if (addAllAttribsIncludeObjects) {
        result[col] = "string";
      }
    } else {
      const distinctValues = new Set(
        data
          .slice(0, howManyItemsShouldSearchForNotNull)
          .map((d) => getAttrib(d, col))
          .filter((v) => v !== null && v !== undefined && v !== "")
      ).size;

      if (distinctValues < maxNumDistictForCategorical) {
        result[col] = "string";
      } else if (distinctValues < maxNumDistictForOrdered) {
        result[col] = "number";
      } else {
        result[col] = "string";
      }
    }
  });

  return result;
};

// TOOLTIP FUNCTIONS

export function fixTooltipToNode(
  nodeSelection,
  tooltip,
  yOffset = 50,
  xOffset = 0
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

export function renderContextTooltip() {}

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

export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// REVISAR :S (abajo)

addFunction("string", String, { override: true });
addFunction("parseDate", tryParseDate, { override: true });
addFunction("parseUnixDate", fromUnix, { override: true });
