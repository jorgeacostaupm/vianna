import { jStat } from "jstat";
import { VariableTypes } from "../../constants";

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function clampProbability(pValue) {
  if (!Number.isFinite(pValue)) return NaN;
  return Math.max(0, Math.min(1, pValue));
}

function holmAdjust(pValues) {
  const m = pValues.length;
  if (m === 0) return [];
  const ordered = pValues
    .map((p, index) => ({ p: clampProbability(p), index }))
    .sort((a, b) => a.p - b.p);

  const adjusted = new Array(m);
  let runningMax = 0;
  for (let rank = 0; rank < m; rank++) {
    const candidate = Math.min(1, ordered[rank].p * (m - rank));
    runningMax = Math.max(runningMax, candidate);
    adjusted[ordered[rank].index] = runningMax;
  }
  return adjusted;
}

function hedgesCorrection(df) {
  if (!Number.isFinite(df) || df <= 1) return 1;
  return 1 - 3 / (4 * df - 1);
}

export const welschAnova = {
  id: "anova-welch",
  label: "Welch ANOVA",
  description:
    "Comparison of k ≥ 2 independent groups, robust to unequal variances, with t-based CIs, Holm-adjusted pairwise Welch t-tests, and Hedges’ g",
  isApplicable: (count) => count >= 2,
  variableType: VariableTypes.NUMERICAL,
  category: "Numéricas — Independientes",
  run: (groups) => {
    const alpha = 0.05;
    const k = groups.length;
    const groupNames = groups.map((g) => g.name);
    const groupSizes = groups.map((g) => g.values.length);
    if (groupSizes.some((n) => n < 2)) {
      throw new Error(
        "Welch ANOVA requires at least 2 observations per group.",
      );
    }
    const N = groupSizes.reduce((sum, n) => sum + n, 0);
    const groupMeans = groups.map((g) => jStat.mean(g.values));
    const groupVars = groups.map((g) => jStat.variance(g.values, true));
    if (groupVars.some((v) => v <= 0 || !Number.isFinite(v))) {
      throw new Error("Welch ANOVA requires non-zero variance in each group.");
    }
    const weights = groupSizes.map((n, i) => n / groupVars[i]);
    const W = weights.reduce((sum, w) => sum + w, 0);
    const weightedMean =
      groupMeans.reduce((sum, m, i) => sum + weights[i] * m, 0) / W;
    const df1 = k - 1;
    const between =
      weights.reduce(
        (sum, w, i) => sum + w * Math.pow(groupMeans[i] - weightedMean, 2),
        0,
      ) / df1;
    const corrDenominator = groups.reduce(
      (sum, _, i) =>
        sum + Math.pow(1 - weights[i] / W, 2) / (groupSizes[i] - 1),
      0,
    );
    if (corrDenominator <= 0) {
      throw new Error("Welch ANOVA failed due to invalid variance correction.");
    }
    const correction = ((2 * (k - 2)) / (k * k - 1)) * corrDenominator;
    const FValue = between / (1 + correction);
    const df2 = (k * k - 1) / (3 * corrDenominator);
    const pValue = 1 - jStat.centralF.cdf(FValue, df1, df2);

    // ANOVA SS-based omega squared, reported explicitly as a descriptive global effect.
    const grandMean =
      groupMeans.reduce((sum, mean, i) => sum + mean * groupSizes[i], 0) / N;
    const ssBetween = groupMeans.reduce(
      (sum, mean, i) => sum + groupSizes[i] * Math.pow(mean - grandMean, 2),
      0,
    );
    const ssWithin = groupVars.reduce(
      (sum, variance, i) => sum + (groupSizes[i] - 1) * variance,
      0,
    );
    const ssTotal = ssBetween + ssWithin;
    const msWithin = ssWithin / (N - k);
    const omegaDenominator = ssTotal + msWithin;
    const omegaSquared =
      omegaDenominator > 0
        ? clamp01((ssBetween - df1 * msWithin) / omegaDenominator)
        : 0;

    const summaries = groups.map((g, i) => {
      const se = Math.sqrt(groupVars[i] / groupSizes[i]);
      const sd = Math.sqrt(groupVars[i]);
      const tCrit = jStat.studentt.inv(1 - alpha / 2, groupSizes[i] - 1);
      const m = groupMeans[i];
      return {
        name: g.name,
        n: groupSizes[i],
        measure: "Mean",
        value: m,
        sd,
        variance: groupVars[i],
        ci95: {
          lower: m - tCrit * se,
          upper: m + tCrit * se,
        },
      };
    });

    const pairwiseRaw = [];
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const n1 = groupSizes[i];
        const n2 = groupSizes[j];
        const v1 = groupVars[i];
        const v2 = groupVars[j];
        const m1 = groupMeans[i];
        const m2 = groupMeans[j];
        const diff = m1 - m2;
        const seDiff = Math.sqrt(v1 / n1 + v2 / n2);
        const tStat = diff / seDiff;
        const dfPair =
          Math.pow(v1 / n1 + v2 / n2, 2) /
          (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
        const pRaw = clampProbability(
          2 * (1 - jStat.studentt.cdf(Math.abs(tStat), dfPair)),
        );
        const sdAverage = Math.sqrt((v1 + v2) / 2);
        const dUnpooled = diff / sdAverage;
        const dfEffect = n1 + n2 - 2;
        const hedgesJ = hedgesCorrection(dfEffect);
        const g = hedgesJ * dUnpooled;
        const seG = Math.sqrt((n1 + n2) / (n1 * n2) + (g * g) / (2 * dfEffect));
        const tCritG = jStat.studentt.inv(1 - alpha / 2, dfEffect);

        pairwiseRaw.push({
          groups: [groupNames[i], groupNames[j]],
          value: g,
          measure: "Hedges’ g",
          ci95: {
            lower: g - tCritG * seG,
            upper: g + tCritG * seG,
          },
          statistic: tStat,
          statisticName: "T-Statistic",
          pRaw,
        });
      }
    }
    const pAdjusted = holmAdjust(pairwiseRaw.map((pair) => pair.pRaw));
    const pairwiseEffects = pairwiseRaw.map((pair, index) => {
      const { pRaw, ...rest } = pair;
      return {
        ...rest,
        pValueRaw: pRaw,
        pValue: pAdjusted[index],
        pAdjustMethod: "Holm",
      };
    });

    const descriptionString =
      `Welch’s ANOVA of ${k} groups (N=${N}) — F(${df1}, ${df2.toFixed(
        1,
      )}) = ${FValue.toFixed(2)}, p = ${pValue.toFixed(
        3,
      )}, ω² = ${omegaSquared.toFixed(3)} (SS-based).` +
      ` Pairwise Welch t-tests use Holm-adjusted p-values; pairwise effect size is Hedges’ g.` +
      ` Tested groups: ${groupNames
        .map(
          (name, i) =>
            `${name} (n=${groupSizes[i]}, x̄=${groupMeans[i].toFixed(
              3,
            )}, sd=${Math.sqrt(groupVars[i]).toFixed(3)})`,
        )
        .join("; ")}`;

    const descriptionJSX = (
      <div
        style={{
          maxWidth: "none",
          whiteSpace: "pre-wrap",
          display: "flex",
          gap: "5px",
          flexDirection: "column",
        }}
      >
        <div>
          Welch’s ANOVA of {k} groups (N={N})
        </div>
        <div>
          F({df1}, {df2.toFixed(1)}) = {FValue.toFixed(2)}
        </div>
        <div>ω² (SS-based) = {omegaSquared.toFixed(3)}</div>
        <div>p = {pValue.toFixed(3)}</div>
        <div>
          Pairwise Welch t-tests with Holm-adjusted p-values; effect size:
          Hedges&apos; g.
        </div>
        <div>Tested groups:</div>
        <ul style={{ paddingLeft: "1.2em", margin: 0 }}>
          {groupNames.map((name, i) => (
            <li key={i}>
              {name} (n={groupSizes[i]}, x̄={groupMeans[i].toFixed(3)}, sd=
              {Math.sqrt(groupVars[i]).toFixed(3)})
            </li>
          ))}
        </ul>
      </div>
    );

    return {
      statisticName: "F",
      statistic: FValue,
      df1,
      df2,
      pValue,
      omegaSquared,
      summaries,
      summariesTitle: "Means & t-based 95% CI",
      pairwiseEffects,
      pairwiseTitle: "Pairwise Effect Sizes (Hedges’ g)",
      descriptionString,
      descriptionJSX,
      pairwiseCorrection: "Holm",
      omegaSquaredDefinition:
        "ω² = (SSbetween - (k - 1) * MSwithin) / (SStotal + MSwithin)",
      metric: {
        name: "omega squared (SS-based)",
        symbol: "ω²",
        value: omegaSquared,
      },
    };
  },
  metric: { measure: "Omega Squared", symbol: "ω²" },
};
