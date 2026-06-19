export function buildSubjectTimeMap(
  rows = [],
  { idVar, timeVar, valueVar } = {},
) {
  const timesById = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const subjectId = row?.[idVar];
    const timestamp = row?.[timeVar];
    if (subjectId == null || timestamp == null) return;

    if (!timesById.has(subjectId)) {
      timesById.set(subjectId, new Set());
    }

    const value = row?.[valueVar];
    if (value !== null && value !== undefined && !Number.isNaN(Number(value))) {
      timesById.get(subjectId).add(String(timestamp));
    }
  });

  return timesById;
}

export function classifySubjectsByCompleteness(
  rows = [],
  timeValues = [],
  { idVar, timeVar, valueVar } = {},
) {
  const normalizedTimes = (Array.isArray(timeValues) ? timeValues : []).map(
    (time) => String(time),
  );
  const timesById = buildSubjectTimeMap(rows, {
    idVar,
    timeVar,
    valueVar,
  });

  const completeIds = new Set();
  const incompleteIds = new Set();

  [...timesById.entries()].forEach(([subjectId, observedTimes]) => {
    const isComplete =
      normalizedTimes.length > 0 &&
      normalizedTimes.every((time) => observedTimes.has(time));
    if (isComplete) {
      completeIds.add(subjectId);
    } else {
      incompleteIds.add(subjectId);
    }
  });

  return {
    timesById,
    completeIds,
    incompleteIds,
  };
}

export function selectSubjectIdsByCompleteness(
  rows = [],
  timeValues = [],
  {
    idVar,
    timeVar,
    valueVar,
    showComplete = true,
    showIncomplete = false,
    incompleteRequiredTimes = [],
  } = {},
) {
  const includeComplete = Boolean(showComplete);
  const includeIncomplete = Boolean(showIncomplete);
  const normalizedRequiredTimes = Array.from(
    new Set(
      (Array.isArray(incompleteRequiredTimes) ? incompleteRequiredTimes : [])
        .filter((value) => value != null && value !== "")
        .map((value) => String(value)),
    ),
  );

  const { timesById, completeIds, incompleteIds } =
    classifySubjectsByCompleteness(rows, timeValues, {
      idVar,
      timeVar,
      valueVar,
    });

  const selectedIds = new Set();

  if (includeComplete) {
    completeIds.forEach((subjectId) => selectedIds.add(subjectId));
  }

  if (includeIncomplete) {
    incompleteIds.forEach((subjectId) => {
      if (!normalizedRequiredTimes.length) {
        selectedIds.add(subjectId);
        return;
      }

      if (
        normalizedRequiredTimes.some((time) =>
          timesById.get(subjectId)?.has(time),
        )
      ) {
        selectedIds.add(subjectId);
      }
    });
  }

  return {
    selectedIds,
    completeIds,
    incompleteIds,
    timesById,
  };
}
