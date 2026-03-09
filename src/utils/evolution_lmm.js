import jstatPkg from "jstat";

const { jStat } = jstatPkg;

const MIN_VARIANCE = 1e-8;
const UNKNOWN_GROUP = "All";
const MISSING_WARNING_THRESHOLD = 0.3;
const HIGH_LEVEL_WARNING_THRESHOLD = 12;

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

function sampleVariance(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((acc, value) => acc + value, 0) / n;
  let ss = 0;
  for (let i = 0; i < n; i += 1) {
    const diff = values[i] - mean;
    ss += diff * diff;
  }
  return ss / (n - 1);
}

function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function zeroMatrix(size) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function isFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n);
}

function applySubjectInverseToVector(vector, sigma2, tau2) {
  const n = vector.length;
  const denom = sigma2 + n * tau2;
  const base = 1 / sigma2;
  const shrink = tau2 / (sigma2 * denom);
  const total = vector.reduce((acc, value) => acc + value, 0);
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = vector[i] * base - shrink * total;
  }
  return out;
}

function applySubjectInverseToMatrix(matrix, sigma2, tau2) {
  const n = matrix.length;
  if (n === 0) return [];
  const p = matrix[0].length;
  const denom = sigma2 + n * tau2;
  const base = 1 / sigma2;
  const shrink = tau2 / (sigma2 * denom);

  const colSums = new Array(p).fill(0);
  for (let i = 0; i < n; i += 1) {
    const row = matrix[i];
    for (let j = 0; j < p; j += 1) colSums[j] += row[j];
  }

  const out = Array.from({ length: n }, () => new Array(p).fill(0));
  for (let i = 0; i < n; i += 1) {
    const row = matrix[i];
    const outRow = out[i];
    for (let j = 0; j < p; j += 1) {
      outRow[j] = row[j] * base - shrink * colSums[j];
    }
  }
  return out;
}

function choleskyDecompose(matrix) {
  const n = matrix.length;
  const lower = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let sum = matrix[i][j];
      for (let k = 0; k < j; k += 1) sum -= lower[i][k] * lower[j][k];

      if (i === j) {
        if (!Number.isFinite(sum) || sum <= 1e-12) return null;
        lower[i][j] = Math.sqrt(sum);
      } else {
        lower[i][j] = sum / lower[j][j];
      }
    }
  }

  return lower;
}

function solveCholesky(lower, rhs) {
  const n = lower.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let sum = rhs[i];
    for (let k = 0; k < i; k += 1) sum -= lower[i][k] * y[k];
    y[i] = sum / lower[i][i];
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = y[i];
    for (let k = i + 1; k < n; k += 1) sum -= lower[k][i] * x[k];
    x[i] = sum / lower[i][i];
  }
  return x;
}

function invertFromCholesky(lower) {
  const n = lower.length;
  const inverse = Array.from({ length: n }, () => Array(n).fill(0));

  for (let col = 0; col < n; col += 1) {
    const e = new Array(n).fill(0);
    e[col] = 1;
    const solved = solveCholesky(lower, e);
    for (let row = 0; row < n; row += 1) inverse[row][col] = solved[row];
  }
  return inverse;
}

function matVec(matrix, vector) {
  const n = matrix.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    for (let j = 0; j < vector.length; j += 1) sum += matrix[i][j] * vector[j];
    out[i] = sum;
  }
  return out;
}

function quadraticForm(vector, matrix) {
  const mv = matVec(matrix, vector);
  return dot(vector, mv);
}

function logDetFromCholesky(lower) {
  let sum = 0;
  for (let i = 0; i < lower.length; i += 1) {
    sum += Math.log(lower[i][i]);
  }
  return 2 * sum;
}

function evaluateREML(subjects, p, sigma2, tau2, { includeCovBeta = false } = {}) {
  if (!(sigma2 > 0) || !(tau2 >= 0)) return null;
  const A = zeroMatrix(p);
  const b = new Array(p).fill(0);
  let yViny = 0;
  let logDetV = 0;
  let nObs = 0;

  for (let si = 0; si < subjects.length; si += 1) {
    const subject = subjects[si];
    const Xi = subject.X;
    const yi = subject.y;
    const n = yi.length;
    nObs += n;

    const denom = sigma2 + n * tau2;
    if (!(denom > 0)) return null;

    logDetV += (n - 1) * Math.log(sigma2) + Math.log(denom);

    const wiy = applySubjectInverseToVector(yi, sigma2, tau2);
    const WiXi = applySubjectInverseToMatrix(Xi, sigma2, tau2);

    yViny += dot(yi, wiy);

    for (let j = 0; j < p; j += 1) {
      let sumBy = 0;
      for (let r = 0; r < n; r += 1) sumBy += Xi[r][j] * wiy[r];
      b[j] += sumBy;

      for (let k = 0; k < p; k += 1) {
        let sumA = 0;
        for (let r = 0; r < n; r += 1) sumA += Xi[r][j] * WiXi[r][k];
        A[j][k] += sumA;
      }
    }
  }

  const chol = choleskyDecompose(A);
  if (!chol) return null;

  const beta = solveCholesky(chol, b);
  const Abeta = matVec(A, beta);
  let rss = yViny - 2 * dot(beta, b) + dot(beta, Abeta);

  if (!Number.isFinite(rss)) return null;
  rss = Math.max(rss, 1e-10);

  const logDetA = logDetFromCholesky(chol);
  const objective =
    0.5 * (logDetV + logDetA + rss + (nObs - p) * Math.log(2 * Math.PI));

  if (!Number.isFinite(objective)) return null;

  return {
    objective,
    sigma2,
    tau2,
    beta,
    A,
    b,
    rss,
    nObs,
    covBeta: includeCovBeta ? invertFromCholesky(chol) : null,
  };
}

function optimizeVariances(subjects, p) {
  const yValues = subjects.flatMap((subject) => subject.y);
  const yVar = Math.max(sampleVariance(yValues), 1);
  const subjectMeans = subjects
    .map((subject) => {
      if (!subject.y.length) return null;
      return subject.y.reduce((acc, value) => acc + value, 0) / subject.y.length;
    })
    .filter((value) => Number.isFinite(value));
  const betweenVar = Math.max(sampleVariance(subjectMeans), yVar * 0.05);

  const sigmaInit = Math.max(yVar - betweenVar, yVar * 0.25, MIN_VARIANCE);
  const tauInit = Math.max(Math.min(betweenVar, yVar), MIN_VARIANCE);
  const logMin = Math.log(Math.max(yVar * 1e-6, MIN_VARIANCE));
  const logMax = Math.log(Math.max(yVar * 1e3, 1));

  const cache = new Map();
  const evaluateAtLogs = (logSigma2, logTau2) => {
    const ls = clamp(logSigma2, logMin, logMax);
    const lt = clamp(logTau2, logMin, logMax);
    const key = `${ls.toFixed(6)}|${lt.toFixed(6)}`;
    if (cache.has(key)) return cache.get(key);

    const sigma2 = Math.exp(ls);
    const tau2 = Math.exp(lt);
    const evaluation = evaluateREML(subjects, p, sigma2, tau2);
    const out = evaluation ? { ...evaluation, logSigma2: ls, logTau2: lt } : null;
    cache.set(key, out);
    return out;
  };

  let best =
    evaluateAtLogs(Math.log(sigmaInit), Math.log(tauInit)) ||
    evaluateAtLogs(Math.log(yVar), Math.log(yVar * 0.1)) ||
    evaluateAtLogs(Math.log(yVar * 0.7), Math.log(yVar * 0.3));

  if (!best) {
    throw new Error("LMM optimization failed at initialization.");
  }

  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  let step = 0.9;
  let iterations = 0;

  while (iterations < 80 && step > 0.01) {
    iterations += 1;
    let improved = false;

    for (let i = 0; i < directions.length; i += 1) {
      const direction = directions[i];
      const candidate = evaluateAtLogs(
        best.logSigma2 + direction[0] * step,
        best.logTau2 + direction[1] * step,
      );
      if (!candidate) continue;
      if (candidate.objective < best.objective - 1e-9) {
        best = candidate;
        improved = true;
      }
    }

    if (!improved) step *= 0.5;
  }

  return {
    ...best,
    converged: step <= 0.02,
    iterations,
    finalStep: step,
  };
}

function buildContrastRow(name, contrast, beta, covBeta, alpha) {
  const zCrit = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const estimate = dot(contrast, beta);
  const variance = Math.max(quadraticForm(contrast, covBeta), 0);
  const se = Math.sqrt(variance);
  const statistic = se > 0 ? estimate / se : NaN;
  const pValue = Number.isFinite(statistic)
    ? 2 * (1 - jStat.normal.cdf(Math.abs(statistic), 0, 1))
    : NaN;

  return {
    name,
    estimate,
    se,
    statisticName: "z",
    statistic,
    wald: Number.isFinite(statistic) ? statistic * statistic : NaN,
    pValue,
    ci95: {
      lower: estimate - zCrit * se,
      upper: estimate + zCrit * se,
    },
  };
}

function resolveCovariateType(values, declaredType = null) {
  if (declaredType === "number") return "numeric";
  if (declaredType === "string") return "categorical";

  const nonMissing = values.filter((value) => normalizeString(value) !== "");
  if (!nonMissing.length) return "categorical";
  const allNumeric = nonMissing.every((value) => isFiniteNumber(value));
  return allNumeric ? "numeric" : "categorical";
}

function buildTimeEncoding({ rows, times, timeVar, requestedCoding = "auto" }) {
  const values = rows.map((row) => row?.[timeVar]);
  const nonMissing = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const isNumericTime = nonMissing.length === values.length && values.length > 0;

  let mode = requestedCoding;
  if (mode === "auto") {
    mode = isNumericTime ? "continuous" : "ordered-index";
  }

  if (mode === "continuous" && !isNumericTime) {
    mode = "ordered-index";
  }

  if (mode === "continuous") {
    return {
      mode,
      isNumericTime,
      getScore: (row) => Number(row?.[timeVar]),
    };
  }

  const orderedTimes = Array.isArray(times) ? times.map((time) => String(time)) : [];
  const byTime = new Map();
  orderedTimes.forEach((time, index) => {
    if (!byTime.has(time)) byTime.set(time, index);
  });

  values.forEach((value) => {
    const label = normalizeString(value);
    if (!label) return;
    if (!byTime.has(label)) byTime.set(label, byTime.size);
  });

  return {
    mode: "ordered-index",
    isNumericTime,
    getScore: (row) => {
      const label = normalizeString(row?.[timeVar]);
      if (!label || !byTime.has(label)) return NaN;
      return byTime.get(label);
    },
    orderedTimes,
    scoreByTime: byTime,
  };
}

function normalizeGroupValue(rawValue) {
  const text = normalizeString(rawValue);
  return text || UNKNOWN_GROUP;
}

function buildPreparedRows({
  rawRows,
  outcomeVar,
  idVar,
  timeVar,
  groupVar,
  covariates,
  declaredVarTypes,
  includeGroupEffect,
  requestedTimeCoding,
  times,
}) {
  const warnings = [];
  const sourceRows = Array.isArray(rawRows) ? rawRows : [];
  const timeEncoding = buildTimeEncoding({
    rows: sourceRows,
    times,
    timeVar,
    requestedCoding: requestedTimeCoding,
  });

  if (!sourceRows.length) {
    throw new Error("No data available for this test.");
  }

  const outcomeValues = sourceRows
    .map((row) => Number(row?.[outcomeVar]))
    .filter((value) => Number.isFinite(value));
  if (!outcomeValues.length) {
    throw new Error("Outcome variable must be numeric.");
  }

  const covariateInfo = (covariates || []).map((name) => {
    const values = sourceRows.map((row) => row?.[name]);
    const type = resolveCovariateType(values, declaredVarTypes?.[name]);
    const missing = values.filter((value) => normalizeString(value) === "").length;
    const missingRate = sourceRows.length > 0 ? missing / sourceRows.length : 0;
    if (missingRate > MISSING_WARNING_THRESHOLD) {
      warnings.push(
        `Covariate "${name}" has ${(missingRate * 100).toFixed(1)}% missing values.`,
      );
    }
    return {
      name,
      type,
      missing,
      missingRate,
    };
  });

  const modelVariableSet = new Set([outcomeVar, idVar, timeVar]);
  if (includeGroupEffect && groupVar) modelVariableSet.add(groupVar);
  covariateInfo.forEach((cov) => modelVariableSet.add(cov.name));

  const rowsAfterCompleteCase = [];
  for (let i = 0; i < sourceRows.length; i += 1) {
    const row = sourceRows[i];
    const idValue = normalizeString(row?.[idVar]);
    const outcome = Number(row?.[outcomeVar]);
    const timeScore = timeEncoding.getScore(row);

    if (!idValue) continue;
    if (!Number.isFinite(outcome)) continue;
    if (!Number.isFinite(timeScore)) continue;

    const prepared = {
      id: idValue,
      outcome,
      timeScore,
      timeLabel: String(row?.[timeVar]),
      group: includeGroupEffect && groupVar ? normalizeGroupValue(row?.[groupVar]) : UNKNOWN_GROUP,
      covariates: {},
    };

    let valid = true;
    for (let ci = 0; ci < covariateInfo.length; ci += 1) {
      const cov = covariateInfo[ci];
      const rawValue = row?.[cov.name];
      if (cov.type === "numeric") {
        const num = Number(rawValue);
        if (!Number.isFinite(num)) {
          valid = false;
          break;
        }
        prepared.covariates[cov.name] = num;
      } else {
        const text = normalizeString(rawValue);
        if (!text) {
          valid = false;
          break;
        }
        prepared.covariates[cov.name] = text;
      }
    }

    if (!valid) continue;
    rowsAfterCompleteCase.push(prepared);
  }

  const subjectMap = new Map();
  rowsAfterCompleteCase.forEach((row) => {
    if (!subjectMap.has(row.id)) {
      subjectMap.set(row.id, {
        id: row.id,
        group: row.group,
        rows: [],
      });
    }
    const subject = subjectMap.get(row.id);
    subject.rows.push(row);
  });

  const subjectsWithMinObs = [];
  subjectMap.forEach((subject) => {
    if (subject.rows.length >= 2) subjectsWithMinObs.push(subject);
  });

  if (!subjectsWithMinObs.length) {
    throw new Error("Too few observations remain after filtering missing values.");
  }

  const filteredRows = subjectsWithMinObs.flatMap((subject) => subject.rows);
  const groupLevels = Array.from(
    new Set(filteredRows.map((row) => row.group).filter((group) => group != null)),
  ).sort((a, b) => a.localeCompare(b));

  if (includeGroupEffect && groupVar && groupLevels.length < 2) {
    throw new Error("Selected group variable has insufficient levels for comparison.");
  }

  if (covariateInfo.length && covariateInfo.length > subjectsWithMinObs.length / 4) {
    warnings.push(
      "The number of covariates is high relative to the number of subjects.",
    );
  }

  const covariateDefinitions = covariateInfo.map((cov) => {
    if (cov.type === "numeric") {
      const values = filteredRows.map((row) => row.covariates[cov.name]);
      return {
        ...cov,
        levels: null,
        referenceLevel: null,
        meanValue: mean(values),
      };
    }

    const levels = Array.from(
      new Set(filteredRows.map((row) => row.covariates[cov.name])),
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    if (levels.length > HIGH_LEVEL_WARNING_THRESHOLD) {
      warnings.push(
        `Categorical covariate "${cov.name}" has ${levels.length} levels.`,
      );
    }

    return {
      ...cov,
      levels,
      referenceLevel: levels[0] ?? null,
      meanValue: null,
    };
  });

  return {
    rowsBeforeFiltering: sourceRows.length,
    rowsAfterCompleteCase: rowsAfterCompleteCase.length,
    rowsAfterSubjectFilter: filteredRows.length,
    subjectCountAfterFilter: subjectsWithMinObs.length,
    subjects: subjectsWithMinObs,
    groupLevels,
    warnings,
    covariateDefinitions,
    timeEncoding,
    modelVariables: Array.from(modelVariableSet),
  };
}

function resolveReferenceGroup(groupLevels, referenceGroup, referenceMode) {
  if (!groupLevels.length) return null;
  if (referenceMode === "all") return groupLevels[0];

  const requested = normalizeString(referenceGroup);
  if (requested && groupLevels.includes(requested)) return requested;
  return groupLevels[0];
}

function buildDesignMetadata({
  includeGroupEffect,
  includeInteraction,
  groupLevels,
  referenceGroup,
  covariateDefinitions,
}) {
  const fixedEffectNames = ["Intercept", "Time"];
  const dummyLevels =
    includeGroupEffect && groupLevels.length > 1
      ? groupLevels.filter((level) => level !== referenceGroup)
      : [];

  dummyLevels.forEach((level) => {
    fixedEffectNames.push(`Group: ${level} vs ${referenceGroup}`);
  });

  if (includeInteraction) {
    dummyLevels.forEach((level) => {
      fixedEffectNames.push(`Time × Group: ${level} vs ${referenceGroup}`);
    });
  }

  const covariateColumns = [];
  covariateDefinitions.forEach((cov) => {
    if (cov.type === "numeric") {
      covariateColumns.push({
        covariate: cov.name,
        type: "numeric",
        level: null,
        name: `Covariate: ${cov.name}`,
      });
      return;
    }

    const levels = Array.isArray(cov.levels) ? cov.levels : [];
    const reference = cov.referenceLevel;
    levels
      .filter((level) => level !== reference)
      .forEach((level) => {
        covariateColumns.push({
          covariate: cov.name,
          type: "categorical",
          level,
          reference,
          name: `Covariate: ${cov.name} (${level} vs ${reference})`,
        });
      });
  });

  covariateColumns.forEach((column) => fixedEffectNames.push(column.name));

  return {
    fixedEffectNames,
    dummyLevels,
    covariateColumns,
  };
}

function getDesignRow({
  timeScore,
  group,
  covariates,
  dummyLevels,
  includeInteraction,
  covariateColumns,
}) {
  const row = [1, timeScore];

  dummyLevels.forEach((level) => {
    row.push(group === level ? 1 : 0);
  });

  if (includeInteraction) {
    dummyLevels.forEach((level) => {
      row.push(group === level ? timeScore : 0);
    });
  }

  covariateColumns.forEach((column) => {
    if (column.type === "numeric") {
      row.push(Number(covariates?.[column.covariate]));
    } else {
      row.push(covariates?.[column.covariate] === column.level ? 1 : 0);
    }
  });

  return row;
}

function buildSubjectsForModel({
  preparedSubjects,
  dummyLevels,
  includeInteraction,
  covariateColumns,
}) {
  return preparedSubjects
    .map((subject) => {
      const rows = [...subject.rows].sort((a, b) => a.timeScore - b.timeScore);
      const X = rows.map((row) =>
        getDesignRow({
          timeScore: row.timeScore,
          group: row.group,
          covariates: row.covariates,
          dummyLevels,
          includeInteraction,
          covariateColumns,
        }),
      );

      return {
        id: subject.id,
        group: subject.group,
        X,
        y: rows.map((row) => row.outcome),
        timeScores: rows.map((row) => row.timeScore),
      };
    })
    .filter((subject) => subject.y.length >= 2);
}

function buildPredictions({
  times,
  groupLevels,
  groupSubjectCounts,
  dummyLevels,
  includeInteraction,
  covariateColumns,
  covariateDefaults,
  beta,
  covBeta,
  alpha,
  timeEncoding,
  referenceMode,
}) {
  const zCrit = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const timeLabels = Array.isArray(times) ? times.map((time) => String(time)) : [];

  const resolveTimeScore = (timeLabel) => {
    if (timeEncoding.mode === "continuous") {
      const value = Number(timeLabel);
      return Number.isFinite(value) ? value : NaN;
    }
    if (timeEncoding.scoreByTime?.has(timeLabel)) {
      return timeEncoding.scoreByTime.get(timeLabel);
    }
    return NaN;
  };

  const buildPredictionForGroup = (group) => {
    const values = timeLabels.map((timeLabel) => {
      const timeScore = resolveTimeScore(timeLabel);
      if (!Number.isFinite(timeScore)) {
        return {
          time: timeLabel,
          timeScore,
          fit: NaN,
          ci95: { lower: NaN, upper: NaN },
        };
      }

      const x = getDesignRow({
        timeScore,
        group,
        covariates: covariateDefaults,
        dummyLevels,
        includeInteraction,
        covariateColumns,
      });
      const fit = dot(x, beta);
      const varFit = Math.max(quadraticForm(x, covBeta), 0);
      const se = Math.sqrt(varFit);

      return {
        time: timeLabel,
        timeScore,
        fit,
        ci95: {
          lower: fit - zCrit * se,
          upper: fit + zCrit * se,
        },
      };
    });

    return { group, values };
  };

  const byGroup = groupLevels.map((group) => buildPredictionForGroup(group));

  if (referenceMode !== "all" || !groupLevels.length) return byGroup;

  const totalSubjects =
    groupLevels.reduce(
      (acc, group) => acc + (groupSubjectCounts.get(group) || 0),
      0,
    ) || 1;

  const allValues = timeLabels.map((timeLabel) => {
    const entries = byGroup
      .map((groupEntry) => {
        const value = groupEntry.values.find((entry) => entry.time === timeLabel);
        const weight = groupSubjectCounts.get(groupEntry.group) || 0;
        return { value, weight };
      })
      .filter((entry) => Number.isFinite(entry?.value?.fit) && entry.weight > 0);

    if (!entries.length) {
      return {
        time: timeLabel,
        timeScore: resolveTimeScore(timeLabel),
        fit: NaN,
        ci95: { lower: NaN, upper: NaN },
      };
    }

    const fit =
      entries.reduce((acc, entry) => acc + entry.value.fit * entry.weight, 0) /
      totalSubjects;
    const lower =
      entries.reduce((acc, entry) => acc + entry.value.ci95.lower * entry.weight, 0) /
      totalSubjects;
    const upper =
      entries.reduce((acc, entry) => acc + entry.value.ci95.upper * entry.weight, 0) /
      totalSubjects;

    return {
      time: timeLabel,
      timeScore: resolveTimeScore(timeLabel),
      fit,
      ci95: { lower, upper },
    };
  });

  return [{ group: UNKNOWN_GROUP, values: allValues }, ...byGroup];
}

function buildRandomEffects(subjects, beta, tau2, sigma2) {
  return subjects.map((subject) => {
    const fitted = matVec(subject.X, beta);
    const residuals = subject.y.map((value, index) => value - fitted[index]);
    const n = residuals.length;
    const sumResiduals = residuals.reduce((acc, value) => acc + value, 0);
    const randomIntercept = (tau2 * sumResiduals) / (sigma2 + n * tau2);
    const posteriorVariance = (tau2 * sigma2) / (sigma2 + n * tau2);

    return {
      id: subject.id,
      group: subject.group,
      nObservations: n,
      randomIntercept,
      posteriorSd: Math.sqrt(Math.max(posteriorVariance, 0)),
    };
  });
}

function buildInterpretation({ timeEffect, fixedEffects, hasGroupEffect, hasInteraction }) {
  const lines = [];
  const timeSignificant = Number(timeEffect?.pValue) < 0.05;

  if (timeSignificant) {
    lines.push(
      "Se observó un efecto lineal significativo del tiempo en el modelo mixto.",
    );
  } else {
    lines.push(
      "No se observó un efecto lineal significativo del tiempo tras ajustar el modelo mixto.",
    );
  }

  if (hasGroupEffect) {
    const groupTerms = (fixedEffects || []).filter(
      (effect) => effect.name.startsWith("Group:") && !effect.name.startsWith("Time ×"),
    );
    const significantGroup = groupTerms.some((effect) => Number(effect.pValue) < 0.05);
    lines.push(
      significantGroup
        ? "Se observaron diferencias medias significativas entre grupos."
        : "No se detectaron diferencias medias significativas entre grupos.",
    );
  }

  if (hasInteraction) {
    const interactionTerms = (fixedEffects || []).filter((effect) =>
      effect.name.startsWith("Time × Group:"),
    );
    const significantInteraction = interactionTerms.some(
      (effect) => Number(effect.pValue) < 0.05,
    );
    lines.push(
      significantInteraction
        ? "Se observaron diferencias en las trayectorias temporales entre grupos."
        : "No se observaron diferencias significativas en trayectorias entre grupos.",
    );
  }

  return lines.join(" ");
}

function fitRandomInterceptLmmInternal({
  rawRows,
  times,
  outcomeVar,
  idVar,
  timeVar,
  groupVar,
  includeGroupEffect,
  covariates,
  includeTimeGroupInteraction,
  timeCoding,
  referenceGroup = null,
  referenceMode = "group",
  alpha,
  declaredVarTypes,
}) {
  const prepared = buildPreparedRows({
    rawRows,
    outcomeVar,
    idVar,
    timeVar,
    groupVar,
    covariates,
    declaredVarTypes,
    includeGroupEffect,
    requestedTimeCoding: timeCoding,
    times,
  });

  const {
    rowsBeforeFiltering,
    rowsAfterCompleteCase,
    rowsAfterSubjectFilter,
    subjects,
    groupLevels,
    warnings,
    covariateDefinitions,
    timeEncoding,
  } = prepared;

  if (subjects.length < 2) {
    throw new Error("LMM requires at least 2 subjects with valid observations.");
  }

  const includeGroup = Boolean(includeGroupEffect && groupLevels.length > 1);
  const includeInteraction = Boolean(includeTimeGroupInteraction && includeGroup);

  const resolvedReferenceGroup = includeGroup
    ? resolveReferenceGroup(groupLevels, referenceGroup, referenceMode)
    : null;

  const { fixedEffectNames, dummyLevels, covariateColumns } = buildDesignMetadata({
    includeGroupEffect: includeGroup,
    includeInteraction,
    groupLevels,
    referenceGroup: resolvedReferenceGroup,
    covariateDefinitions,
  });

  const modelSubjects = buildSubjectsForModel({
    preparedSubjects: subjects,
    dummyLevels,
    includeInteraction,
    covariateColumns,
  });

  const nObservations = modelSubjects.reduce(
    (acc, subject) => acc + subject.y.length,
    0,
  );

  if (nObservations <= fixedEffectNames.length + 1) {
    throw new Error("Not enough observations to estimate fixed effects.");
  }

  const nDistinctTimeScores = new Set(
    modelSubjects.flatMap((subject) => subject.timeScores),
  ).size;
  if (nDistinctTimeScores < 2) {
    throw new Error("LMM requires at least 2 distinct time points.");
  }

  const optimization = optimizeVariances(modelSubjects, fixedEffectNames.length);
  const finalEval = evaluateREML(
    modelSubjects,
    fixedEffectNames.length,
    optimization.sigma2,
    optimization.tau2,
    { includeCovBeta: true },
  );

  if (!finalEval || !finalEval.covBeta) {
    throw new Error("LMM failed while computing final covariance estimates.");
  }

  const { sigma2, tau2, beta, covBeta } = finalEval;
  const fixedEffects = fixedEffectNames.map((name, index) => {
    const contrast = Array.from({ length: beta.length }, (_, col) =>
      col === index ? 1 : 0,
    );
    return buildContrastRow(name, contrast, beta, covBeta, alpha);
  });

  const timeEffect = fixedEffects.find((effect) => effect.name === "Time") || null;
  const groupSubjectCounts = new Map();
  modelSubjects.forEach((subject) => {
    const group = subject.group ?? UNKNOWN_GROUP;
    groupSubjectCounts.set(group, (groupSubjectCounts.get(group) || 0) + 1);
  });

  const covariateDefaults = {};
  covariateDefinitions.forEach((cov) => {
    if (cov.type === "numeric") {
      covariateDefaults[cov.name] = cov.meanValue ?? 0;
    } else {
      covariateDefaults[cov.name] = cov.referenceLevel;
    }
  });

  const predictions = buildPredictions({
    times,
    groupLevels,
    groupSubjectCounts,
    dummyLevels,
    includeInteraction,
    covariateColumns,
    covariateDefaults,
    beta,
    covBeta,
    alpha,
    timeEncoding,
    referenceMode,
  });

  const randomEffects = buildRandomEffects(modelSubjects, beta, tau2, sigma2);
  const icc = tau2 / (tau2 + sigma2);

  if (!optimization.converged) {
    warnings.push(
      "The mixed model did not converge. Try removing some covariates or disabling the interaction.",
    );
  }

  const interpretation = buildInterpretation({
    timeEffect,
    fixedEffects,
    hasGroupEffect: includeGroup,
    hasInteraction: includeInteraction,
  });

  return {
    method: "REML",
    model:
      "y ~ time + group + covariates + time:group + (1 | subject) [components included as configured]",
    formulaSupport:
      "Supports random intercept by subject, fixed time/group/covariates, and optional time×group interaction.",
    limitations:
      "No random slopes, no complex residual covariance structures, no free-form formulas, and no automatic model selection/imputation.",
    timeCoding: timeEncoding.mode,
    timeMode: timeEncoding.mode,
    includeGroupEffect: includeGroup,
    requestedGroupEffect: Boolean(includeGroupEffect),
    includeInteraction,
    requestedInteraction: Boolean(includeTimeGroupInteraction),
    referenceMode,
    referenceGroup: includeGroup ? resolvedReferenceGroup : null,
    baselineGroup: includeGroup ? resolvedReferenceGroup : null,
    groupLevels,
    selectedGroup:
      referenceMode === "all"
        ? UNKNOWN_GROUP
        : includeGroup
          ? resolvedReferenceGroup
          : UNKNOWN_GROUP,
    converged: optimization.converged,
    convergence: {
      iterations: optimization.iterations,
      finalStep: optimization.finalStep,
      objective: optimization.objective,
    },
    metadata: {
      subjectsUsed: modelSubjects.length,
      observationsUsed: nObservations,
      groupsCount: includeGroup ? groupLevels.length : 0,
      method: "REML",
      timeCoding: timeEncoding.mode,
      converged: optimization.converged,
      groupReference: includeGroup
        ? (referenceMode === "all" ? "All" : resolvedReferenceGroup)
        : "Not used",
      rowsBeforeFiltering,
      rowsAfterCompleteCase,
      rowsAfterSubjectFilter,
    },
    nSubjects: modelSubjects.length,
    nObservations,
    nGroups: includeGroup ? groupLevels.length : 0,
    filteredData: {
      rowsBeforeFiltering,
      rowsAfterCompleteCase,
      rowsAfterSubjectFilter,
      subjectsAfterFilter: modelSubjects.length,
    },
    fixedEffects,
    wald: {
      time: timeEffect,
    },
    variance: {
      randomIntercept: tau2,
      residual: sigma2,
      icc,
    },
    randomEffects,
    predictions,
    covariates: covariateDefinitions.map((cov) => ({
      name: cov.name,
      type: cov.type,
      nLevels: Array.isArray(cov.levels) ? cov.levels.length : null,
      reference: cov.referenceLevel,
      missingRate: cov.missingRate,
    })),
    warnings,
    warning: warnings.join(" "),
    interpretation,
  };
}

export function fitRandomInterceptLmm({
  rawRows = [],
  times = [],
  outcomeVar,
  idVar,
  timeVar,
  groupVar = null,
  includeGroupEffect = true,
  covariates = [],
  includeTimeGroupInteraction = false,
  timeCoding = "auto",
  referenceGroup = null,
  referenceMode = "group",
  alpha = 0.05,
  declaredVarTypes = null,
}) {
  if (!outcomeVar) throw new Error("Outcome variable must be defined.");
  if (!idVar) throw new Error("Subject ID variable must be defined.");
  if (!timeVar) throw new Error("Time variable must be defined.");
  const blocked = new Set([outcomeVar, idVar, timeVar, groupVar].filter(Boolean));
  const invalidCovariates = (covariates || []).filter((name) => blocked.has(name));
  if (invalidCovariates.length) {
    throw new Error(
      "Invalid covariate selection. Outcome, Subject ID, Time, and Group cannot be selected as covariates.",
    );
  }

  return fitRandomInterceptLmmInternal({
    rawRows,
    times,
    outcomeVar,
    idVar,
    timeVar,
    groupVar,
    includeGroupEffect,
    covariates,
    includeTimeGroupInteraction,
    timeCoding,
    referenceGroup,
    referenceMode,
    alpha,
    declaredVarTypes,
  });
}
