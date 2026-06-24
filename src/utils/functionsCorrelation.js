import * as ss from "simple-statistics";
import { ORDER_VARIABLE } from "./constants";

const DEFAULT_METHOD = "pearson";

function normalizeMethod(method) {
  if (!method || typeof method !== "string") return DEFAULT_METHOD;
  const key = method.trim().toLowerCase();
  if (key === "spearman" || key === "kendall" || key === "pearson") return key;
  return DEFAULT_METHOD;
}

function kendallTauB(column1, column2) {
  const n = Math.min(column1.length, column2.length);
  if (n < 2) return 0;

  let concordant = 0;
  let discordant = 0;
  let tiesX = 0;
  let tiesY = 0;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = column1[i] - column1[j];
      const dy = column2[i] - column2[j];

      if (dx === 0 && dy === 0) {
        tiesX += 1;
        tiesY += 1;
        continue;
      }

      if (dx === 0) {
        tiesX += 1;
        continue;
      }

      if (dy === 0) {
        tiesY += 1;
        continue;
      }

      if (dx * dy > 0) {
        concordant += 1;
      } else if (dx * dy < 0) {
        discordant += 1;
      }
    }
  }

  const denom = Math.sqrt(
    (concordant + discordant + tiesX) * (concordant + discordant + tiesY),
  );
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return (concordant - discordant) / denom;
}

function computeCorrelation(method, column1, column2) {
  const normalized = normalizeMethod(method);
  if (normalized === "spearman") {
    return ss.sampleRankCorrelation(column1, column2);
  }
  if (normalized === "kendall") {
    return kendallTauB(column1, column2);
  }
  return ss.sampleCorrelation(column1, column2);
}

export function getCorrelationData(data, params) {
  const { variables, method } = params;
  const errors = [];

  if (variables.length < 2) return null;

  data.forEach((row) => {
    variables.forEach((varName) => {
      const raw = row[varName];
      const num = parseFloat(raw);
      if (
        raw == null ||
        typeof raw === "boolean" ||
        Number.isNaN(num) ||
        !Number.isFinite(num)
      ) {
        errors.push(`Invalid value: "${raw}" in attribute "${varName}"`);
      }
    });
  });

  if (errors.length) {
    throw new Error(
      "Invalid values found:\n" + errors.map((msg) => ` • ${msg}`).join("\n"),
    );
  }

  const correlationMatrix = [];

  for (let i = 0; i < variables.length; i++) {
    const var1 = variables[i];
    const column1 = data.map((d) => parseFloat(d[var1]));

    for (let j = i; j < variables.length; j++) {
      const var2 = variables[j];
      const column2 = data.map((d) => parseFloat(d[var2]));

      if (var1 === var2) {
        correlationMatrix.push({
          x: var1,
          y: var2,
          value: 1,
        });
        continue;
      } else if (column1.length === column2.length && column1.length > 1) {
        const correlation = computeCorrelation(method, column1, column2);

        correlationMatrix.push({
          x: var1,
          y: var2,
          value: correlation,
        });
      }
    }
  }

  return correlationMatrix;
}

export function getTopCorrelations(data, nTop, method = DEFAULT_METHOD) {
  if (!data || data.length < 2 || !nTop || !Number.isInteger(nTop) || nTop <= 0)
    return null;

  const variables = Object.keys(data[0]).filter((key) => {
    return (
      typeof data[0][key] === "number" &&
      Number.isFinite(data[0][key]) &&
      key !== ORDER_VARIABLE
    );
  });

  if (variables.length < 2) return null;

  const correlations = [];
  for (let i = 0; i < variables.length; i++) {
    const var1 = variables[i];
    const column1 = data.map((d) => parseFloat(d[var1]));

    for (let j = i + 1; j < variables.length; j++) {
      const var2 = variables[j];
      const column2 = data.map((d) => parseFloat(d[var2]));

      if (
        column1.length === column2.length &&
        column1.length > 1 &&
        var1 !== var2
      ) {
        const correlation = computeCorrelation(method, column1, column2);
        if (!Number.isNaN(correlation)) {
          correlations.push({ x: var1, y: var2, value: correlation });
        }
      }
    }
  }

  const topCorrelations = correlations
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, nTop);

  const selectedVariables = new Set();
  topCorrelations.forEach((c) => {
    selectedVariables.add(c.x);
    selectedVariables.add(c.y);
  });

  const topVars = Array.from(selectedVariables);

  return topVars;
}
