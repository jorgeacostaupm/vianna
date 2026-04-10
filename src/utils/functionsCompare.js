import store from "@/store/store";
import * as aq from "arquero";

export function getDistributionData(data, column, groupVar, timeVar, idVar) {
  const table = aq.from(data);

  const existingColumns = table.columnNames();
  const optionalColumns = [];

  if (existingColumns.includes(timeVar)) optionalColumns.push(timeVar);
  if (existingColumns.includes(idVar)) optionalColumns.push(idVar);

  const selectedColumns = table.select(groupVar, column, ...optionalColumns);

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
          `Invalid value: "${value}" in column "${column}" (group "${type}")`
        );
      } else {
        const base = { type, value };

        // Añadir opcionales si existen en los datos
        if (timeVar && row[timeVar] !== undefined) {
          base[timeVar] = row[timeVar];
        }
        if (idVar && row[idVar] !== undefined) {
          base[idVar] = row[idVar];
        }

        resultArray.push(base);
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

export function getCategoricDistributionData(selection, variable, groupVar) {
  const groups = [...new Set(selection.map((item) => item[groupVar]))];

  const df = store.getState().dataframe.dataframe;
  const categories = [...new Set(df.map((item) => item[variable]))];

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

  const categoriesWithValues = categories.filter((c) =>
    groups.some((g) => counts[g][c] > 0)
  );

  const chartData = groups.map((g) => {
    const obj = { [groupVar]: g };
    categories.forEach((c) => {
      obj[c] = counts[g][c];
    });
    return obj;
  });

  return {
    chartData,
    categories,
    categoriesWithValues,
    catVar: variable,
    groupVar,
  };
}
