export function getYRange(
  participantData = [],
  meanData = [],
  overallMeanData = null,
  lmmPredictions = [],
  showMeans,
  showOverallMean,
  showStds,
  meanAsBoxplot,
  showObs,
  showCIs,
  showLmmFit,
  showLmmCI,
  hiddenGroupSet = new Set(),
) {
  const values = [];
  const isGroupVisible = (group) => !hiddenGroupSet.has(String(group));

  if (showObs && participantData) {
    participantData.forEach((participant) => {
      if (!isGroupVisible(participant?.group)) return;
      participant.values.forEach((value) => {
        const numericValue = Number(value.value);
        if (Number.isFinite(numericValue)) values.push(numericValue);
      });
    });
  }

  if (showMeans && meanData) {
    meanData.forEach((groupData) => {
      if (!isGroupVisible(groupData?.group)) return;
      groupData.values.forEach((value) => {
        const mean = Number(value.value.mean);
        if (Number.isFinite(mean)) values.push(mean);

        if (showStds) {
          const std = Number(value.value.std);
          if (Number.isFinite(std)) {
            values.push(mean + std);
            values.push(mean - std);
          }
        }

        if (meanAsBoxplot) {
          const std = Number(value.value.std);
          const lower = Number(value.value?.ci95?.lower);
          const upper = Number(value.value?.ci95?.upper);
          const whiskerLow = Number.isFinite(lower)
            ? lower
            : Number.isFinite(std)
              ? mean - std
              : Number.NaN;
          const whiskerHigh = Number.isFinite(upper)
            ? upper
            : Number.isFinite(std)
              ? mean + std
              : Number.NaN;
          if (Number.isFinite(whiskerLow)) values.push(whiskerLow);
          if (Number.isFinite(whiskerHigh)) values.push(whiskerHigh);
        }

        if (showCIs && value.value.ci95) {
          const lower = Number(value.value.ci95.lower);
          const upper = Number(value.value.ci95.upper);
          if (Number.isFinite(lower)) values.push(lower);
          if (Number.isFinite(upper)) values.push(upper);
        }
      });
    });
  }

  if (
    showOverallMean &&
    overallMeanData?.values &&
    isGroupVisible(overallMeanData?.group ?? "All")
  ) {
    overallMeanData.values.forEach((value) => {
      const mean = Number(value.value.mean);
      if (Number.isFinite(mean)) values.push(mean);

      if (meanAsBoxplot) {
        const std = Number(value.value.std);
        const lower = Number(value.value?.ci95?.lower);
        const upper = Number(value.value?.ci95?.upper);
        const whiskerLow = Number.isFinite(lower)
          ? lower
          : Number.isFinite(std)
            ? mean - std
            : Number.NaN;
        const whiskerHigh = Number.isFinite(upper)
          ? upper
          : Number.isFinite(std)
            ? mean + std
            : Number.NaN;
        if (Number.isFinite(whiskerLow)) values.push(whiskerLow);
        if (Number.isFinite(whiskerHigh)) values.push(whiskerHigh);
      }

      if (showCIs && value.value.ci95) {
        const lower = Number(value.value.ci95.lower);
        const upper = Number(value.value.ci95.upper);
        if (Number.isFinite(lower)) values.push(lower);
        if (Number.isFinite(upper)) values.push(upper);
      }
    });
  }

  if ((showLmmFit || showLmmCI) && Array.isArray(lmmPredictions)) {
    lmmPredictions.forEach((groupData) => {
      if (!isGroupVisible(groupData?.group)) return;
      (groupData.values || []).forEach((value) => {
        const fit = Number(value.fit);
        if (showLmmFit && Number.isFinite(fit)) values.push(fit);

        if (showLmmCI && value.ci95) {
          const lower = Number(value.ci95.lower);
          const upper = Number(value.ci95.upper);
          if (Number.isFinite(lower)) values.push(lower);
          if (Number.isFinite(upper)) values.push(upper);
        }
      });
    });
  }

  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.01 || 1;

  return [min - pad, max + pad];
}

export function resolveYDomain(autoDomain = [0, 1], config = {}) {
  const [safeAutoMin, safeAutoMax] = normalizeYDomain(autoDomain);
  if (config?.yAxisMode !== "manual") {
    return [safeAutoMin, safeAutoMax];
  }

  const rawMin = parseOptionalNumber(config?.yAxisMin);
  const rawMax = parseOptionalNumber(config?.yAxisMax);
  const hasManualMin = Number.isFinite(rawMin);
  const hasManualMax = Number.isFinite(rawMax);

  let min = hasManualMin ? rawMin : safeAutoMin;
  let max = hasManualMax ? rawMax : safeAutoMax;

  if (min > max) {
    if (hasManualMin && !hasManualMax) {
      max = min + getDomainPad(min);
    } else if (!hasManualMin && hasManualMax) {
      min = max - getDomainPad(max);
    } else {
      [min, max] = [max, min];
    }
  }

  if (min === max) {
    const pad = getDomainPad(min);
    if (hasManualMin && !hasManualMax) {
      max = min + pad;
    } else if (!hasManualMin && hasManualMax) {
      min = max - pad;
    } else {
      return [min - pad, max + pad];
    }
  }

  return [min, max];
}

export function normalizeYDomain(domain = [0, 1]) {
  const rawMin = parseOptionalNumber(domain?.[0]);
  const rawMax = parseOptionalNumber(domain?.[1]);
  let min = Number.isFinite(rawMin) ? rawMin : 0;
  let max = Number.isFinite(rawMax) ? rawMax : 1;

  if (min > max) {
    [min, max] = [max, min];
  }

  if (min === max) {
    const pad = getDomainPad(min);
    return [min - pad, max + pad];
  }

  return [min, max];
}

export function getDomainPad(value) {
  const magnitude = Math.abs(Number(value)) || 0;
  return magnitude * 0.01 || 1;
}

function parseOptionalNumber(value) {
  if (value == null || value === "") return Number.NaN;
  return Number(value);
}
