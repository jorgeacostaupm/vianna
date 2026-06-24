import { jStat } from "jstat";
import { VariableTypes } from "../../constants";

export const chiSquareIndependence = {
  id: "chi-square-independence",
  label: "Chi-Square Test of Independence",
  description:
    "Test of independence between a grouping attribute and a categorical attribute",
  isApplicable: (count) => count >= 2,
  variableType: VariableTypes.CATEGORICAL,
  category: "Categóricas — Independencia",
  run: (groups) => {
    const groupNames = groups.map((g) => g.name);
    const categories = [...new Set(groups.flatMap((g) => g.values))];
    const r = groups.length;
    const c = categories.length;
    if (c < 2) {
      throw new Error("Chi-square test requires at least 2 categories.");
    }

    // 1) Construir la tabla de conteos global
    const counts = groups.map((g) => {
      const cnt = {};
      categories.forEach((cat) => {
        cnt[cat] = 0;
      });
      g.values.forEach((val) => {
        if (cnt[val] !== undefined) {
          cnt[val]++;
        }
      });
      return cnt;
    });
    const rowSums = counts.map((cnt) =>
      categories.reduce((sum, cat) => sum + cnt[cat], 0),
    );
    const colSums = categories.map((cat) =>
      counts.reduce((sum, cnt) => sum + cnt[cat], 0),
    );
    const N = rowSums.reduce((sum, v) => sum + v, 0);

    // 2) Calcular χ² y Cramer’s V global
    let chi2 = 0;
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const observed = counts[i][categories[j]];
        const expected = (rowSums[i] * colSums[j]) / N;
        chi2 += (observed - expected) ** 2 / expected;
      }
    }
    const df = (r - 1) * (c - 1);
    const pValue = 1 - jStat.chisquare.cdf(chi2, df);
    const denom = N * Math.min(r - 1, c - 1);
    const cramerV = denom > 0 ? Math.sqrt(chi2 / denom) : 0;

    const summaries = groups.map((g, i) => ({
      name: g.name,
      n: g.values.length,
      counts: counts[i],
    }));

    // 3) Función auxiliar para calcular Cramer’s V entre dos arrays de valores
    function computeCramersV(arr1, arr2) {
      const cnt1 = {};
      const cnt2 = {};
      categories.forEach((cat) => {
        cnt1[cat] = 0;
        cnt2[cat] = 0;
      });
      arr1.forEach((v) => {
        if (cnt1[v] !== undefined) cnt1[v]++;
      });
      arr2.forEach((v) => {
        if (cnt2[v] !== undefined) cnt2[v]++;
      });
      const n1 = arr1.length;
      const n2 = arr2.length;
      const Np = n1 + n2;
      const rowSum1 = n1;
      const rowSum2 = n2;
      const colSumsPair = categories.map((cat) => cnt1[cat] + cnt2[cat]);

      let chi2p = 0;
      categories.forEach((cat, k) => {
        const obs1 = cnt1[cat];
        const obs2 = cnt2[cat];
        const cs = colSumsPair[k];
        const exp1 = (rowSum1 * cs) / Np;
        const exp2 = (rowSum2 * cs) / Np;
        if (exp1 > 0) chi2p += (obs1 - exp1) ** 2 / exp1;
        if (exp2 > 0) chi2p += (obs2 - exp2) ** 2 / exp2;
      });
      return Math.sqrt(chi2p / Np);
    }

    // 4) Bootstrap para IC de Cramer’s V en cada par
    const pairwiseEffects = [];
    const N_BOOT = 1000; // número de réplicas
    for (let i = 0; i < r; i++) {
      for (let j = i + 1; j < r; j++) {
        const arr1 = groups[i].values;
        const arr2 = groups[j].values;
        const n1 = arr1.length;
        const n2 = arr2.length;
        const Np = n1 + n2;

        // a) Valor observado de χ² y V para este par
        const cnt1 = counts[i];
        const cnt2 = counts[j];
        const rowSum1 = rowSums[i];
        const rowSum2 = rowSums[j];

        let chi2_pair = 0;
        categories.forEach((cat) => {
          const obs1 = cnt1[cat];
          const obs2 = cnt2[cat];
          const cs = obs1 + obs2;
          const exp1 = (rowSum1 * cs) / Np;
          const exp2 = (rowSum2 * cs) / Np;
          if (exp1 > 0) chi2_pair += (obs1 - exp1) ** 2 / exp1;
          if (exp2 > 0) chi2_pair += (obs2 - exp2) ** 2 / exp2;
        });
        const df_pair = c - 1;
        const p_pair = 1 - jStat.chisquare.cdf(chi2_pair, df_pair);
        const cramerV_pair = Math.sqrt(chi2_pair / Np);

        // b) Repetir bootstrap N_BOOT veces calculando Cramer’s V
        const bootVs = [];
        for (let b = 0; b < N_BOOT; b++) {
          // muestreamos con reemplazo cada grupo por separado
          const resample1 = Array.from(
            { length: n1 },
            () => arr1[Math.floor(Math.random() * n1)],
          );
          const resample2 = Array.from(
            { length: n2 },
            () => arr2[Math.floor(Math.random() * n2)],
          );
          bootVs.push(computeCramersV(resample1, resample2));
        }
        bootVs.sort((a, b) => a - b);
        const lowerCI = bootVs[Math.floor(0.025 * N_BOOT)];
        const upperCI = bootVs[Math.floor(0.975 * N_BOOT)];

        pairwiseEffects.push({
          groups: [groupNames[i], groupNames[j]],
          value: cramerV_pair,
          measure: "Cramer's V",
          statistic: chi2_pair,
          statisticName: "χ²",
          pValue: p_pair,
          ci95: { lower: lowerCI, upper: upperCI },
        });
      }
    }

    const descriptionString = `Chi-Square test of independence (r=${r}, c=${c}, N=${N}) — χ²(${df}) = ${chi2.toFixed(
      2,
    )}, p = ${pValue.toFixed(3)}, V = ${cramerV.toFixed(3)}.`;
    const descriptionJSX = (
      <div style={{ whiteSpace: "normal", maxWidth: "none" }}>
        <div>
          Chi-Square test of independence (r={r}, c={c}, N={N})
        </div>
        <div>
          χ²({df}) = {chi2.toFixed(2)}, p = {pValue.toFixed(3)}, V ={" "}
          {cramerV.toFixed(3)}
        </div>
        <div>Group counts:</div>
        <ul style={{ paddingLeft: "1.2em", margin: 0 }}>
          {summaries.map((s, i) => (
            <li key={i}>
              {s.name} (n={s.n}):{" "}
              {categories.map((cat) => `${cat}=${s.counts[cat]}`).join(", ")}
            </li>
          ))}
        </ul>
      </div>
    );

    return {
      statisticName: "χ²",
      statistic: chi2,
      df,
      pValue,
      cramerV,
      summaries,
      summariesTitle: "Group Counts by Category",
      pairwiseEffects,
      pairwiseTitle: "Pairwise Cramer's V with 95% CI",
      descriptionString,
      descriptionJSX,
      metric: {
        name: "Cramer's V",
        symbol: "V",
        value: cramerV,
      },
    };
  },
  metric: { name: "Cramer's V", symbol: "V" },
};
