import jstat from "jstat";
import { VariableTypes } from "@/utils/Constants";

export const friedmanTest = {
  id: "friedman-test",
  label: "Friedman test",
  description:
    "Non-parametric test for comparing more than two paired samples.",
  isApplicable: (count) => count >= 3,
  variableType: VariableTypes.NUMERICAL,
  category: "Numéricas — Pareadas/Repetidas",
  run: (groups) => {
    const k = groups.length;
    const n = groups[0].values.length;
    if (groups.some((g) => g.values.length !== n)) {
      throw new Error("Friedman test requires equal-length groups.");
    }
    if (n < 2) {
      throw new Error("Friedman test requires at least 2 observations.");
    }
    const ranks = [];

    for (let i = 0; i < n; i++) {
      const row = groups.map((g) => g.values[i]);
      ranks.push(jstat.rank(row));
    }

    const rankSums = Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        rankSums[j] += ranks[i][j];
      }
    }

    const chiSquare =
      (12 / (n * k * (k + 1))) *
        rankSums.reduce((sum, Rj) => sum + Math.pow(Rj, 2), 0) -
      3 * n * (k + 1);

    const df = k - 1;
    const pValue = 1 - jstat.chisquare.cdf(chiSquare, df);

    return {
      statisticName: "χ²",
      statistic: chiSquare,
      pValue,
      df,
      descriptionString: `Friedman test (n=${n}, k=${k}): χ²(${df}) = ${chiSquare.toFixed(
        2,
      )}, p = ${pValue.toFixed(3)}`,
    };
  },
};
